import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Pure-ish handler for `checkout.session.completed` events tagged
 * `metadata.plan_id === "lifetime"`. Extracted from `route.ts` so the
 * three branches (sold-out → refund, success → audit, missing-PI → throw)
 * are unit-testable without spinning up a fake `Request`.
 *
 * Branch table:
 *   ┌─────────────────────────────┬─────────────────────────────────────┐
 *   │ planId !== "lifetime"       │ no-op                                │
 *   │ payment_intent missing      │ throw                                │
 *   │ RPC error                   │ throw (caller releases for retry)    │
 *   │ RPC returns null            │ refund + audit_log("…_refunded_…")   │
 *   │ RPC returns seat_number     │ audit_log("lifetime_purchased")      │
 *   └─────────────────────────────┴─────────────────────────────────────┘
 */

export interface RefundIssuer {
  refunds: {
    create: (
      params: Stripe.RefundCreateParams,
    ) => Promise<Stripe.Refund>;
  };
}

export interface LifetimeHandlerResult {
  outcome: "no_op" | "claimed" | "refunded_capacity";
  seatNumber: number | null;
}

export async function handleLifetimeCheckoutCompleted(
  stripe: RefundIssuer,
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<LifetimeHandlerResult> {
  const planId = session.metadata?.plan_id;
  if (planId !== "lifetime") {
    return { outcome: "no_op", seatNumber: null };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) {
    throw new Error("checkout.session.completed: missing payment_intent");
  }

  const userId = session.metadata?.user_id ?? null;

  const { data: seatNumber, error: seatError } = await supabase.rpc(
    "fn_claim_lifetime_seat",
    {
      p_user_id: userId,
      p_payment_intent_id: paymentIntentId,
    },
  );

  if (seatError) {
    throw new Error(`fn_claim_lifetime_seat failed: ${seatError.message}`);
  }

  if (seatNumber === null || seatNumber === undefined) {
    // Sold out.
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "duplicate",
      metadata: { reason: "lifetime_capacity_exceeded" },
    });
    const { error: auditError } = await supabase.from("audit_log").insert({
      user_id: userId,
      action: "lifetime_purchase_refunded_capacity",
      metadata: {
        payment_intent_id: paymentIntentId,
        stripe_session_id: session.id,
      },
    });
    if (auditError) {
      throw new Error(`audit_log insert failed: ${auditError.message}`);
    }
    return { outcome: "refunded_capacity", seatNumber: null };
  }

  const amountTotalCents = session.amount_total ?? null;
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "lifetime_purchased",
    metadata: {
      seat_number: seatNumber,
      payment_intent_id: paymentIntentId,
      stripe_session_id: session.id,
      amount_total_cents: amountTotalCents,
      currency: session.currency,
    },
  });
  if (auditError) {
    throw new Error(`audit_log insert failed: ${auditError.message}`);
  }

  return { outcome: "claimed", seatNumber: seatNumber as number };
}
