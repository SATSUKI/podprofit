import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Idempotency layer for Stripe webhook handling.
 *
 * `webhook_events` (migration 20260512_000007) is the source of truth for
 * "have we already processed this Stripe event id?". Stripe retries up to
 * 3 days, and the network can also redeliver, so reentrancy guarantees
 * matter — every handler must `claim` an event before doing side effects
 * and `markProcessed` after, with `releaseForRetry` covering crashes.
 *
 * Pattern (in `route.ts`):
 *   const claim = await claimWebhookEvent(supabase, event.id, event.type);
 *   if (claim === "already_processed") return 200;
 *   try {
 *     // …side effects (seat claim, subscription mirror, audit log)…
 *     await markWebhookEventProcessed(supabase, event.id);
 *   } catch (err) {
 *     await releaseWebhookEventForRetry(supabase, event.id, err);
 *     throw err; // surface as 500 so Stripe retries
 *   }
 */

export type ClaimResult = "claimed" | "already_processed";

interface PayloadSummary {
  // Minimal redacted snapshot — never the full Stripe object (would leak PII).
  [key: string]: string | number | boolean | null;
}

/**
 * Try to insert a row for `eventId`. Returns "already_processed" when the
 * unique constraint fires (i.e., this is a replay).
 */
export async function claimWebhookEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  payloadSummary?: PayloadSummary,
): Promise<ClaimResult> {
  const { error } = await supabase.from("webhook_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    payload_summary: payloadSummary ?? null,
  });

  if (!error) return "claimed";

  // 23505 = unique_violation — we've seen this event before.
  if (error.code === "23505") {
    // Defensive: only treat as "already_processed" if the prior row actually
    // finished processing. A stuck row (processed_at IS NULL) means the
    // previous attempt crashed; we let the caller retry by deleting it.
    const { data: prior } = await supabase
      .from("webhook_events")
      .select("processed_at")
      .eq("stripe_event_id", eventId)
      .maybeSingle();
    if (prior?.processed_at) {
      return "already_processed";
    }
    // Crashed prior attempt — delete and re-claim so this delivery retries.
    await supabase.from("webhook_events").delete().eq("stripe_event_id", eventId);
    const { error: retryError } = await supabase.from("webhook_events").insert({
      stripe_event_id: eventId,
      event_type: eventType,
      payload_summary: payloadSummary ?? null,
    });
    if (retryError) {
      throw new Error(
        `webhook_events claim retry failed: ${retryError.message}`,
      );
    }
    return "claimed";
  }

  throw new Error(`webhook_events claim failed: ${error.message}`);
}

export async function markWebhookEventProcessed(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString(), last_error: null })
    .eq("stripe_event_id", eventId);
  if (error) {
    throw new Error(`webhook_events markProcessed failed: ${error.message}`);
  }
}

export async function releaseWebhookEventForRetry(
  supabase: SupabaseClient,
  eventId: string,
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  // Best-effort logging — never throw from inside a catch.
  await supabase
    .from("webhook_events")
    .update({ last_error: message.slice(0, 1024) })
    .eq("stripe_event_id", eventId);
  // Delete so the next Stripe retry can re-claim cleanly. We intentionally
  // do NOT preserve the failed row: that would block retries forever.
  await supabase.from("webhook_events").delete().eq("stripe_event_id", eventId);
}
