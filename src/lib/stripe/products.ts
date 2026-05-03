/**
 * Stripe product / price catalog (PODProfit).
 *
 * Per `pricing-ab-test-framework.md` (v1.1) the price_id naming is:
 *   price_v{n}_{plan}_{currency}_{amount}
 *
 * The Stripe dashboard must have these prices created with these exact lookup_keys
 * so the code can resolve them by lookup_key (not by hard-coded ID, which differs
 * between test/prod modes).
 *
 * Per CEO slim-down: actual Stripe account creation is deferred until
 * MRR > $0 / W6 (2026-06-04+). This file is the contract for when that lands.
 */

export type PlanId = "pro_monthly" | "pro_yearly" | "lifetime";

export interface PlanCatalogEntry {
  id: PlanId;
  /** Stripe price lookup_key — set this exact value in Stripe dashboard. */
  stripeLookupKey: string;
  /** Display name. */
  name: string;
  /** Display price (e.g. "$9 / mo", "$149 once"). */
  displayPrice: string;
  /** Marketing tagline shown on Pricing card. */
  tagline: string;
  /** Stripe Checkout mode. */
  mode: "subscription" | "payment";
  /** Display features bullet-list. */
  features: string[];
  /** Whether this plan is the headline / most-recommended. */
  highlighted?: boolean;
  /** For Lifetime: cap. */
  capacity?: number;
}

export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
  pro_monthly: {
    id: "pro_monthly",
    stripeLookupKey: "price_v1_monthly_usd_9",
    name: "Pro · Monthly",
    displayPrice: "$9 / mo",
    tagline: "Cancel anytime.",
    mode: "subscription",
    features: [
      "Everything in Free, forever",
      "Save unlimited calculations",
      "CSV export of calculation history",
      "Pause subscription up to 3 months (no charge)",
      "Email support",
    ],
  },
  pro_yearly: {
    id: "pro_yearly",
    stripeLookupKey: "price_v1_annual_usd_79",
    name: "Pro · Annual",
    displayPrice: "$79 / yr",
    tagline: "Save $29 vs monthly.",
    mode: "subscription",
    features: [
      "Everything in Pro Monthly",
      "Annual billing — 7 months for the price of 12",
      "Locked-in pricing for 12 months",
    ],
  },
  lifetime: {
    id: "lifetime",
    stripeLookupKey: "price_v1_lifetime_usd_149",
    name: "Lifetime",
    displayPrice: "$149 once",
    tagline: "Limited to first 100 customers.",
    mode: "payment",
    features: [
      "Everything in Pro, forever",
      "All future features included (Phase 2 AIO Suite + beyond)",
      "Founding member status — name credit + advisory board option",
      "One-time payment, no subscription",
    ],
    highlighted: true,
    capacity: 100,
  },
};
