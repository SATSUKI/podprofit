import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin dashboard KPI fetchers (PODP-53 v1 minimum).
 *
 * These are server-only helpers that return totals for the `/admin` home
 * page. They run in parallel from the Server Component and each one
 * degrades to `null` on error so a single broken probe (e.g. table
 * missing in a fresh staging DB) doesn't 500 the whole dashboard.
 *
 * Why split out into `src/lib/admin/kpis.ts` instead of inlining the
 * queries in the page component:
 *   - Easier to unit-test the read shapes with `_supabase-mock` without
 *     pulling in next/headers (cookies()) or other server-component-only
 *     surfaces.
 *   - The dashboard contract (which numbers we surface) is stable
 *     enough to be worth a typed helper that the future admin v2 can
 *     extend without touching the page.
 */

export interface KpiSnapshot {
  /** Lifetime seats already taken. `null` on lookup failure. */
  lifetimeClaimed: number | null;
  /** Total Lifetime seats available (cap is hard-coded at 100). */
  lifetimeTotal: number;
  /**
   * Stripe webhook deliveries received since 00:00 UTC of `nowUtc`.
   * Used as a rough "is the integration still receiving events?" pulse.
   */
  webhookEventsToday: number | null;
  /**
   * Inquiries in `status='new'` — the COO triage backlog. Should match
   * `scripts/check-inquiries.ts` output.
   */
  inquiriesNew: number | null;
  /**
   * Stripe refunds we logged in the last 7 days (any status). Mostly for
   * "is refund volume spiking?" awareness during launch.
   */
  refundsLast7d: number | null;
}

/**
 * Hard cap. Lifetime is "1-100"; see migration
 * `20260512_000003_subscriptions_and_lifetime.sql`. If/when we ever
 * change the cap, change it both here and in the migration.
 */
export const LIFETIME_SEAT_TOTAL = 100;

/**
 * Compute the YYYY-MM-DDT00:00:00.000Z boundary for "today" in UTC.
 * Exported for test seam.
 */
export function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Run all KPI probes in parallel.
 *
 * Each probe swallows its own error and returns null — we want a partial
 * dashboard rather than no dashboard. The CEO can re-check Supabase
 * directly if a card is empty.
 */
export async function loadKpiSnapshot(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<KpiSnapshot> {
  const todayUtc = startOfUtcDay(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [lifetime, webhooks, inquiries, refunds] = await Promise.all([
    supabase
      .from("lifetime_seats")
      .select("seat_number", { count: "exact", head: true })
      .eq("status", "claimed"),
    supabase
      .from("webhook_events")
      .select("stripe_event_id", { count: "exact", head: true })
      .gte("received_at", todayUtc.toISOString()),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("refund_audit_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  return {
    lifetimeClaimed: lifetime.error ? null : lifetime.count ?? 0,
    lifetimeTotal: LIFETIME_SEAT_TOTAL,
    webhookEventsToday: webhooks.error ? null : webhooks.count ?? 0,
    inquiriesNew: inquiries.error ? null : inquiries.count ?? 0,
    refundsLast7d: refunds.error ? null : refunds.count ?? 0,
  };
}
