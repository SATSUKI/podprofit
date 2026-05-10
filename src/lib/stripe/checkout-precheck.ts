import "server-only";
import type { PlanId } from "@/lib/stripe/products";
import type { CurrentPlanSnapshot } from "@/lib/stripe/current-plan";

/**
 * PODP-35 — duplicate-subscription / lifetime-conflict gate.
 *
 * Pure function so it is unit-testable without spinning up Supabase or Stripe.
 * Given the user's current plan snapshot and the desired plan, return one of:
 *
 *   { decision: "proceed" }
 *     → caller may hand off to Stripe Checkout.
 *
 *   { decision: "redirect_portal" }
 *     → user already has a Pro sub and is trying to buy a different Pro plan.
 *       Caller should 303-redirect to /api/stripe/portal so the user can
 *       upgrade/downgrade without double-billing.
 *
 *   { decision: "deny", reason, message }
 *     → return a 4xx with the message. Reasons are stable strings for
 *       analytics + tests.
 *
 *   { decision: "confirm_required" }
 *     → user holds a Pro sub and is buying Lifetime. The webhook will cancel
 *       the Pro sub with prorated refund on `checkout.session.completed`. UI
 *       can show a "you'll lose your remaining Pro period; we'll refund the
 *       unused portion" confirm step. Pass `?confirmed=true` to bypass.
 */

export type PrecheckDecision =
  | { decision: "proceed" }
  | { decision: "redirect_portal" }
  | { decision: "deny"; reason: PrecheckDenyReason; message: string }
  | { decision: "confirm_required"; message: string };

export type PrecheckDenyReason =
  | "lifetime_already_owned"
  | "lifetime_sold_out"
  | "buying_pro_after_lifetime"
  | "buying_lifetime_again";

export interface PrecheckInput {
  desiredPlan: PlanId;
  snapshot: CurrentPlanSnapshot;
  /** Number of Lifetime seats remaining (0 = sold out). */
  lifetimeRemaining: number;
  /** When true, skip the Pro→Lifetime confirm gate. */
  confirmed?: boolean;
}

export function evaluateCheckoutPrecheck(
  input: PrecheckInput,
): PrecheckDecision {
  const { desiredPlan, snapshot, lifetimeRemaining, confirmed } = input;

  // ── Lifetime target ────────────────────────────────────────────────────
  if (desiredPlan === "lifetime") {
    if (snapshot.hasLifetime) {
      return {
        decision: "deny",
        reason: "buying_lifetime_again",
        message: "You already have Lifetime access.",
      };
    }
    if (lifetimeRemaining <= 0) {
      return {
        decision: "deny",
        reason: "lifetime_sold_out",
        message: "All Lifetime seats are sold out.",
      };
    }
    if (snapshot.activeProSubscription && !confirmed) {
      return {
        decision: "confirm_required",
        message:
          "Buying Lifetime will cancel your active Pro subscription with a prorated refund of the unused period. Append ?confirmed=true (or use the confirm UI) to proceed.",
      };
    }
    return { decision: "proceed" };
  }

  // ── Pro target (monthly or yearly) ─────────────────────────────────────
  if (snapshot.hasLifetime) {
    return {
      decision: "deny",
      reason: "buying_pro_after_lifetime",
      message: "You already have Lifetime access — Pro plans aren't needed.",
    };
  }

  if (snapshot.activeProSubscription) {
    // Same plan, different plan — both should go to the portal so the user
    // can change without creating a second Stripe subscription.
    return { decision: "redirect_portal" };
  }

  return { decision: "proceed" };
}
