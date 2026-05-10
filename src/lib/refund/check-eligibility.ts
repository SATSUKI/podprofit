import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Refund eligibility helpers — back the promises on `/legal/refunds` and in
 * Terms v0.2 §7 with server-side facts from `public.usage_events`.
 *
 * These are *internal admin* helpers. We do not expose them to end-users
 * (no "click to verify your refund" UI yet) — the goal at launch is that
 * when a Stripe refund request lands in support, we can answer the
 * eligibility question deterministically from the database.
 *
 * The two product-level promises:
 *
 * 1. **Lifetime ($149)** — Terms §7.1: refundable within 7 days AND with
 *    zero calculator launches from the account.
 * 2. **Excel Template / Benchmark Report** — Terms §7.3 (per ADR 0002 the
 *    payment processor for these products is deferred to a future Terms
 *    revision before the 2026-07-23 Excel launch): refundable if and
 *    only if the download log shows zero downloads of that specific
 *    product.
 *
 * Both probe `usage_events` filtered by `occurred_at > purchase_at` so a
 * launch / download that happened *before* the purchase (e.g., the user
 * tried the free calculator before upgrading) doesn't disqualify them.
 */

// Lifetime refund window from purchase. Sourced from Terms v0.2 §7.1.
export const LIFETIME_REFUND_WINDOW_DAYS = 7;
const LIFETIME_REFUND_WINDOW_MS = LIFETIME_REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export type EligibilityResult = {
  eligible: boolean;
  /**
   * Stable machine-readable reason code. Kept short so it's safe to
   * include in audit_log rows or admin-tool clipboard text.
   */
  reason:
    | "eligible"
    | "outside_window"
    | "calculator_launched"
    | "product_downloaded"
    | "lookup_failed";
  /** Human-readable explanation; safe to surface in admin UI. */
  detail: string;
};

/**
 * Lifetime refund eligibility (Terms §7.1).
 *
 * Both conditions must hold:
 *   (a) `now - purchaseAt < 7 days`
 *   (b) zero `calculator_launched` events for this user since `purchaseAt`
 *
 * `purchaseAt` is sourced from Stripe (the lifetime checkout session
 * timestamp); the caller must pass it in — we don't re-derive it here so
 * this helper is decoupled from the Stripe schema.
 */
export async function checkLifetimeRefundEligibility(
  supabase: SupabaseClient,
  userId: string,
  purchaseAt: Date,
  options: { now?: Date } = {},
): Promise<EligibilityResult> {
  const now = options.now ?? new Date();
  const elapsed = now.getTime() - purchaseAt.getTime();

  if (elapsed >= LIFETIME_REFUND_WINDOW_MS) {
    const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));
    return {
      eligible: false,
      reason: "outside_window",
      detail: `Purchase is ${days} day(s) old; Lifetime refund window is ${LIFETIME_REFUND_WINDOW_DAYS} days.`,
    };
  }

  if (elapsed < 0) {
    // Defensive: future-dated purchaseAt would otherwise count zero
    // launches and falsely return eligible. Treat as lookup failure.
    return {
      eligible: false,
      reason: "lookup_failed",
      detail: "purchaseAt is in the future; cannot compute eligibility.",
    };
  }

  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "calculator_launched")
    .gt("occurred_at", purchaseAt.toISOString());

  if (error) {
    return {
      eligible: false,
      reason: "lookup_failed",
      detail: `usage_events lookup failed: ${error.message}`,
    };
  }

  const launchCount = count ?? 0;
  if (launchCount > 0) {
    return {
      eligible: false,
      reason: "calculator_launched",
      detail: `${launchCount} calculator launch(es) recorded since purchase; Lifetime refund requires zero.`,
    };
  }

  return {
    eligible: true,
    reason: "eligible",
    detail: `Within ${LIFETIME_REFUND_WINDOW_DAYS}-day window and zero calculator launches recorded.`,
  };
}

/**
 * Excel Template / Benchmark Report refund eligibility (Terms §7.3).
 *
 * Single condition: zero `product_downloaded` events for this product slug
 * since `purchaseAt`. The 14-day discretionary window is an operational
 * cap enforced by support, not by this helper — we only answer the
 * factual "did they download it?" question.
 */
export async function checkProductRefundEligibility(
  supabase: SupabaseClient,
  userId: string,
  productSlug: string,
  purchaseAt: Date,
): Promise<EligibilityResult> {
  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "product_downloaded")
    .eq("product_slug", productSlug)
    .gt("occurred_at", purchaseAt.toISOString());

  if (error) {
    return {
      eligible: false,
      reason: "lookup_failed",
      detail: `usage_events lookup failed: ${error.message}`,
    };
  }

  const downloads = count ?? 0;
  if (downloads > 0) {
    return {
      eligible: false,
      reason: "product_downloaded",
      detail: `${downloads} download(s) of ${productSlug} recorded since purchase.`,
    };
  }

  return {
    eligible: true,
    reason: "eligible",
    detail: `Zero downloads of ${productSlug} recorded since purchase.`,
  };
}
