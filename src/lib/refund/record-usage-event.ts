import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only writer for `public.usage_events`.
 *
 * RLS forbids client-side inserts; only the service_role client may write
 * here. This wraps the insert so the privacy invariants (no PII in
 * metadata, bounded value sizes) live in one place rather than at every
 * call site.
 */

export type UsageEventType = "calculator_launched" | "product_downloaded";

const PRODUCT_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_METADATA_VALUE_CHARS = 64;

export interface RecordUsageEventInput {
  userId: string;
  eventType: UsageEventType;
  productSlug?: string | null;
  /**
   * Low-cardinality flags only. Each string value is capped at 64 chars
   * by `sanitizeMetadata`; nested objects are dropped (we don't need
   * structured payloads for refund judgment).
   */
  metadata?: Record<string, string | number | boolean> | null;
}

/**
 * Strip anything that doesn't fit the "low-cardinality flags only" shape.
 * This is the privacy guard: emails, retail prices, share tokens etc. are
 * either too long (>64 chars), nested, or otherwise non-primitive — all
 * of which get dropped here.
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean> | null {
  if (!metadata) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (k.length === 0 || k.length > 64) continue;
    if (typeof v === "string") {
      if (v.length === 0 || v.length > MAX_METADATA_VALUE_CHARS) continue;
      out[k] = v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
    } else if (typeof v === "boolean") {
      out[k] = v;
    }
    // anything else (object, array, null, undefined, function) → dropped
  }
  return Object.keys(out).length === 0 ? null : out;
}

export async function recordUsageEvent(
  supabase: SupabaseClient,
  input: RecordUsageEventInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (
    input.productSlug != null &&
    !PRODUCT_SLUG_RE.test(input.productSlug)
  ) {
    return { ok: false, error: "invalid_product_slug" };
  }

  const { error } = await supabase.from("usage_events").insert({
    user_id: input.userId,
    event_type: input.eventType,
    product_slug: input.productSlug ?? null,
    metadata: sanitizeMetadata(input.metadata ?? null),
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
