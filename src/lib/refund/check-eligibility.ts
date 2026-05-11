import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanId } from "@/lib/stripe/products";

/**
 * Refund eligibility helpers — back the promises on `/legal/refunds` and in
 * the Terms / Tokushoho disclosure with server-side facts.
 *
 * These are *internal admin* helpers. We do not expose them to end-users
 * (no "click to verify your refund" UI yet) — the goal at launch is that
 * when a Stripe refund request lands in support, we can answer the
 * eligibility question deterministically from policy + the database.
 *
 * The three product-level promises (CEO-confirmed cooling-off policy,
 * 2026-05-11 — aligned with UK/EU 14-day cooling-off practice):
 *
 * 1. **Lifetime ($149)** — refundable within **14 days** of purchase.
 *    The previous "AND zero calculator launches" condition was DROPPED
 *    on 2026-05-11. Calendar age of the purchase is now the *sole*
 *    eligibility gate. Rationale: UK/EU consumer law treats the 14-day
 *    cooling-off as unconditional for digital services where the EU
 *    Art 16(m) consent flow was not invoked, and operationally we
 *    cannot defensibly deny a refund because the user *tried* the
 *    thing they paid for. (See ADR 0003.)
 *
 * 2. **Pro Monthly / Pro Annual** — **no prorated refunds.** This is a
 *    hard policy, not a database judgment: when a subscriber cancels
 *    mid-cycle they keep access until the period end and we do not
 *    refund the unused portion. The helper below returns
 *    `{ eligible: false, reason: "no_proration" }` unconditionally so
 *    callers can branch on a uniform shape.
 *
 *    日本語 policy(Tokushoho / Terms と同一):
 *      Pro Monthly / Pro Annual はサブスクリプション期間途中の解約に
 *      おいても日割り計算による返金は行いません。解約後も次回更新日
 *      までサービスを利用できます。
 *
 * 3. **Excel Template / Benchmark Report** — refundable iff the
 *    download log shows zero downloads of that specific product since
 *    purchase. The 14-day discretionary window is an operational cap
 *    enforced by support, not by this helper — we only answer the
 *    factual "did they download it?" question.
 *
 * `checkProductRefundEligibility` still probes `usage_events` for
 * `product_downloaded` rows. The `calculator_launched` event type is
 * NO LONGER consulted by `checkLifetimeRefundEligibility` as of
 * 2026-05-11 (see ADR 0003); the column itself is retained because the
 * dedupe / analytics use cases noted in the migration header still
 * apply.
 */

// Lifetime refund window from purchase. CEO-confirmed 2026-05-11 (raised
// from 7 → 14 days to align with UK/EU 14-day cooling-off).
export const LIFETIME_REFUND_WINDOW_DAYS = 14;
const LIFETIME_REFUND_WINDOW_MS = LIFETIME_REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export type EligibilityResult = {
  eligible: boolean;
  /**
   * Stable machine-readable reason code. Kept short so it's safe to
   * include in audit_log rows or admin-tool clipboard text.
   *
   *  - `eligible`          — all conditions satisfied.
   *  - `outside_window`    — Lifetime: purchase older than 14 days.
   *  - `no_proration`      — Pro Monthly / Pro Annual: subscriptions are
   *                          never auto-refunded (hard policy).
   *  - `product_downloaded` — Excel / Report: download already recorded.
   *  - `lookup_failed`     — DB error or defensive guard (e.g. future
   *                          purchase date).
   */
  reason:
    | "eligible"
    | "outside_window"
    | "no_proration"
    | "product_downloaded"
    | "lookup_failed";
  /** Human-readable explanation; safe to surface in admin UI. */
  detail: string;
};

/**
 * Lifetime refund eligibility.
 *
 * Single condition (per CEO-confirmed policy 2026-05-11):
 *   `now - purchaseAt < 14 days`
 *
 * The previous "zero calculator launches" condition was dropped, so this
 * helper no longer reads `usage_events`. `purchaseAt` is sourced from
 * Stripe (the lifetime checkout session timestamp); the caller must pass
 * it in — we don't re-derive it here so this helper is decoupled from
 * the Stripe schema.
 *
 * `supabase` is kept in the signature for forward compatibility (a
 * future revision may consult an audit row), but is currently unused.
 */
export async function checkLifetimeRefundEligibility(
  _supabase: SupabaseClient,
  _userId: string,
  purchaseAt: Date,
  options: { now?: Date } = {},
): Promise<EligibilityResult> {
  const now = options.now ?? new Date();
  const elapsed = now.getTime() - purchaseAt.getTime();

  if (elapsed < 0) {
    // Defensive: future-dated purchaseAt indicates a clock-skew or
    // bad input. Refuse to answer rather than silently returning
    // eligible.
    return {
      eligible: false,
      reason: "lookup_failed",
      detail: "purchaseAt is in the future; cannot compute eligibility.",
    };
  }

  if (elapsed >= LIFETIME_REFUND_WINDOW_MS) {
    const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));
    return {
      eligible: false,
      reason: "outside_window",
      detail: `Purchase is ${days} day(s) old; Lifetime refund window is ${LIFETIME_REFUND_WINDOW_DAYS} days.`,
    };
  }

  return {
    eligible: true,
    reason: "eligible",
    detail: `Within ${LIFETIME_REFUND_WINDOW_DAYS}-day window (launches are no longer disqualifying as of 2026-05-11).`,
  };
}

/**
 * Subscription (Pro Monthly / Pro Annual) refund eligibility.
 *
 * Returns `{ eligible: false, reason: "no_proration" }` unconditionally.
 * Per CEO-confirmed policy (no change vs. prior, formalised here on
 * 2026-05-11): we do not prorate subscription refunds. Subscribers who
 * cancel mid-cycle retain access until the current period ends.
 *
 * 日本語 policy:
 *   Pro Monthly / Pro Annual の解約時に日割り返金は行いません。解約後
 *   も次回更新日まで利用可能です。
 *
 * The plan-id argument exists so future variations (e.g. an annual-only
 * goodwill exception) can be added without changing the signature.
 */
export function checkSubscriptionRefundEligibility(
  planId: Extract<PlanId, "pro_monthly" | "pro_yearly">,
): EligibilityResult {
  const human = planId === "pro_monthly" ? "Pro Monthly" : "Pro Annual";
  return {
    eligible: false,
    reason: "no_proration",
    detail: `${human}: subscriptions are not prorated. Access continues until period end; no refund of the unused portion.`,
  };
}

/**
 * Excel Template / Benchmark Report refund eligibility.
 *
 * Single condition: zero `product_downloaded` events for this product
 * slug since `purchaseAt`. The 14-day discretionary window is an
 * operational cap enforced by support, not by this helper — we only
 * answer the factual "did they download it?" question.
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
