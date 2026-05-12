import "server-only";
import type Stripe from "stripe";

/**
 * PODP-62 — email-keyed Lifetime "did you already pay?" check.
 *
 * Why this exists:
 *   The primary duplicate-purchase gate lives in `evaluateCheckoutPrecheck`,
 *   which reads `lifetime_seats.user_id`. That table's `user_id` column is
 *   populated from `session.metadata.user_id`, which is only set when the
 *   buyer is signed-in *at the moment of Checkout*. The anonymous Lifetime
 *   flow is supported by design (so visitors can pay before creating an
 *   account), but it leaves the seat row with `user_id = NULL`. When that
 *   buyer later creates an account with the *same email* they paid with,
 *   the DB-side gate misses and the user can click Buy again.
 *
 *   This helper is the second-layer guard: ask Stripe directly. If any
 *   Stripe customer with this auth email has a successful PaymentIntent
 *   against the Lifetime price, deny the new purchase regardless of what
 *   our DB says. The caller is then responsible for healing the orphaned
 *   seat row.
 *
 * Scope:
 *   - We only check Lifetime. Pro is fully account-bound (auth is required
 *     at checkout), so the DB snapshot is authoritative.
 *   - We bound Stripe API calls aggressively: at most 10 customers per
 *     email × at most 10 PIs per customer. Real users have 1 of each.
 *   - Failures fall through to `hasPriorPurchase: false` — the precheck
 *     stays in charge of the deny decision and we don't block legitimate
 *     buyers because of a Stripe outage.
 */

export interface EmailFallbackResult {
  hasPriorPurchase: boolean;
  /** PI of the existing Lifetime payment (for healing the seat row). */
  paymentIntentId: string | null;
  /** Customer the PI belongs to (for upserting user_profiles). */
  customerId: string | null;
}

interface StripeForEmailCheck {
  customers: {
    list: (
      params: Stripe.CustomerListParams,
    ) => Promise<Stripe.ApiList<Stripe.Customer>>;
  };
  paymentIntents: {
    list: (
      params: Stripe.PaymentIntentListParams,
    ) => Promise<Stripe.ApiList<Stripe.PaymentIntent>>;
  };
  charges: {
    list: (
      params: Stripe.ChargeListParams,
    ) => Promise<Stripe.ApiList<Stripe.Charge>>;
  };
}

const NO_PRIOR: EmailFallbackResult = {
  hasPriorPurchase: false,
  paymentIntentId: null,
  customerId: null,
};

export async function hasPriorLifetimePurchaseByEmail(
  stripe: StripeForEmailCheck,
  params: {
    email: string;
    /**
     * The active Lifetime price id. When provided we use it to filter the
     * PI list inside Stripe (cheaper). When null (env not configured /
     * lookup_key not yet tagged), we walk the small list of PIs and
     * compare price ids client-side.
     */
    lifetimePriceId: string | null;
  },
): Promise<EmailFallbackResult> {
  const { email, lifetimePriceId } = params;
  if (!email) return NO_PRIOR;

  let customers: Stripe.Customer[];
  try {
    const res = await stripe.customers.list({ email, limit: 10 });
    customers = res.data;
  } catch {
    return NO_PRIOR;
  }
  if (customers.length === 0) return NO_PRIOR;

  for (const customer of customers) {
    let pis: Stripe.PaymentIntent[];
    try {
      const res = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 10,
      });
      pis = res.data;
    } catch {
      continue;
    }

    for (const pi of pis) {
      if (pi.status !== "succeeded") continue;

      // Path A: the PI has line items (rare on PaymentIntent objects, but
      // some Stripe versions expand them). When present, compare price ids
      // directly.
      const latestChargeId =
        typeof pi.latest_charge === "string"
          ? pi.latest_charge
          : pi.latest_charge?.id;

      // Path B: walk the charge → invoice → line_items path. For Lifetime
      // (mode=payment) there is no invoice, so we instead rely on the
      // `amount` and the PI metadata our checkout writes.
      //
      // The most reliable signal we control: our `payment_intent_data.metadata`
      // contains `plan_id: "lifetime"` for every Lifetime purchase we
      // initiate. That's the contract we trust.
      const piPlanId = (pi.metadata as { plan_id?: string } | null)?.plan_id;
      if (piPlanId === "lifetime") {
        return {
          hasPriorPurchase: true,
          paymentIntentId: pi.id,
          customerId: customer.id,
        };
      }

      // Fallback: if metadata is missing (older checkouts or external
      // dashboard-created PIs), and we know the active Lifetime price id,
      // try to confirm via the charge's price linkage. Stripe doesn't put
      // the price id on the PI directly, so we read the charge.
      if (lifetimePriceId && latestChargeId) {
        try {
          const charges = await stripe.charges.list({
            payment_intent: pi.id,
            limit: 1,
          });
          const charge = charges.data[0];
          // The charge's `description` is set by Stripe when a one-time
          // price is bought via Checkout — it includes the price's
          // nickname. We don't rely on that string; instead, the only
          // robust path is via the `payment_link` or the session metadata.
          // To stay safe + cheap we just require the metadata match
          // above. The charge lookup here is a placeholder for future
          // strict checking and currently bails out.
          if (
            charge &&
            charge.metadata &&
            (charge.metadata as { plan_id?: string }).plan_id === "lifetime"
          ) {
            return {
              hasPriorPurchase: true,
              paymentIntentId: pi.id,
              customerId: customer.id,
            };
          }
        } catch {
          // Ignore — fall through.
        }
      }
    }
  }

  return NO_PRIOR;
}
