import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Handler for `checkout.session.completed` events tagged
 * `metadata.plan_id === "lifetime"`. Extracted from `route.ts` so the
 * branches are unit-testable without spinning up a fake `Request`.
 *
 * Branch table:
 *   ┌─────────────────────────────┬─────────────────────────────────────┐
 *   │ planId !== "lifetime"       │ no-op                                │
 *   │ payment_intent missing      │ throw                                │
 *   │ RPC error                   │ throw (caller releases for retry)    │
 *   │ RPC returns null            │ refund + audit_log("…_refunded_…")   │
 *   │ RPC returns seat_number     │ audit_log("lifetime_purchased")      │
 *   │   + active Pro sub exists   │ + cancel Pro with prorated refund    │
 *   └─────────────────────────────┴─────────────────────────────────────┘
 */

export interface StripeForLifetime {
  refunds: {
    create: (params: Stripe.RefundCreateParams) => Promise<Stripe.Refund>;
  };
  subscriptions: {
    cancel: (
      id: string,
      params?: Stripe.SubscriptionCancelParams,
    ) => Promise<Stripe.Subscription>;
  };
}

export interface LifetimeHandlerResult {
  outcome: "no_op" | "claimed" | "refunded_capacity";
  seatNumber: number | null;
  /** Stripe subscription id we cancelled because the user upgraded to Lifetime. */
  cancelledProSubscriptionId?: string;
}

export async function handleLifetimeCheckoutCompleted(
  stripe: StripeForLifetime,
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
    // Sold out — refund the Lifetime charge and audit it. We do NOT cancel
    // any Pro sub here because the user kept their Pro plan.
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

  // ── Lifetime claim succeeded ───────────────────────────────────────────
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

  // ── PODP-35: cancel any active Pro subscription with prorated refund ───
  let cancelledId: string | undefined;
  if (userId) {
    cancelledId = await cancelActiveProForUser(stripe, supabase, userId, {
      lifetimeSeat: seatNumber as number,
      paymentIntentId,
      checkoutSessionId: session.id,
    });
  }

  return {
    outcome: "claimed",
    seatNumber: seatNumber as number,
    ...(cancelledId ? { cancelledProSubscriptionId: cancelledId } : {}),
  };
}

/**
 * Cancel the user's active Pro subscription with prorated refund (PODP-35).
 *
 * Returns the cancelled subscription id, or undefined if there was none.
 * Failures here are non-fatal — the lifetime claim already succeeded; we
 * just log to audit_log and let CS reconcile manually if Stripe rejects
 * the cancel (rare: e.g. already cancelled in another tab).
 */
async function cancelActiveProForUser(
  stripe: StripeForLifetime,
  supabase: SupabaseClient,
  userId: string,
  context: {
    lifetimeSeat: number;
    paymentIntentId: string;
    checkoutSessionId: string;
  },
): Promise<string | undefined> {
  const { data: rows, error } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, plan_type, status")
    .eq("user_id", userId);

  if (error || !rows) return undefined;

  const activeRow = rows.find((row) => {
    const planType = row.plan_type as string | undefined;
    const status = row.status as string | undefined;
    return (
      (planType === "pro_monthly" || planType === "pro_yearly") &&
      (status === "active" ||
        status === "trialing" ||
        status === "past_due" ||
        status === "incomplete" ||
        status === "paused")
    );
  });

  if (!activeRow?.stripe_subscription_id) return undefined;

  const subId = String(activeRow.stripe_subscription_id);

  try {
    await stripe.subscriptions.cancel(subId, {
      prorate: true,
      invoice_now: true,
    });
  } catch (err) {
    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "pro_cancel_after_lifetime_failed",
      metadata: {
        subscription_id: subId,
        lifetime_seat: context.lifetimeSeat,
        error: (err as Error).message,
      },
    });
    return undefined;
  }

  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "pro_cancelled_after_lifetime",
    metadata: {
      subscription_id: subId,
      lifetime_seat: context.lifetimeSeat,
      payment_intent_id: context.paymentIntentId,
      stripe_session_id: context.checkoutSessionId,
      prorate: true,
      invoice_now: true,
    },
  });

  return subId;
}
