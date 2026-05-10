import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lightweight audit-log writers for Stripe billing events that don't have
 * their own dedicated handler (`invoice.paid`, `invoice.payment_failed`,
 * `payment_intent.succeeded`, `charge.refunded`).
 *
 * Each writer:
 *   - Resolves `user_id` from `user_profiles.stripe_customer_id` when possible
 *     so the audit row is queryable per-user.
 *   - Inserts into `audit_log` with a stable `action` string + redacted
 *     metadata (no card numbers, no full Stripe payloads).
 *   - For `charge.refunded` on a Lifetime payment, downgrades the user by
 *     marking the `lifetime_seats` row as `refunded` so the seat returns
 *     to the public pool (the atomic claim RPC will re-issue it).
 */

async function userIdFromCustomer(
  supabase: SupabaseClient,
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.user_id as string | null | undefined) ?? null;
}

function customerOf(obj: {
  customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined;
}): string | null {
  const c = obj.customer;
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

export async function logInvoicePaid(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = customerOf(invoice);
  const userId = await userIdFromCustomer(supabase, customerId);
  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "invoice_paid",
    metadata: {
      invoice_id: invoice.id,
      customer_id: customerId,
      amount_paid_cents: invoice.amount_paid,
      currency: invoice.currency,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      number: invoice.number ?? null,
    },
  });
}

export async function logInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = customerOf(invoice);
  const userId = await userIdFromCustomer(supabase, customerId);
  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "invoice_payment_failed",
    metadata: {
      invoice_id: invoice.id,
      customer_id: customerId,
      amount_due_cents: invoice.amount_due,
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    },
  });
  // TODO(launch+): trigger transactional "card failed" email via Buttondown.
  // Stripe's built-in dunning emails handle this for now.
}

export async function logPaymentIntentSucceeded(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const customerId = customerOf(paymentIntent);
  const userId = await userIdFromCustomer(supabase, customerId);
  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "payment_intent_succeeded",
    metadata: {
      payment_intent_id: paymentIntent.id,
      customer_id: customerId,
      amount_cents: paymentIntent.amount,
      currency: paymentIntent.currency,
      // Carry the plan_id from PI metadata when present (Lifetime sets this
      // from checkout-session creation) — useful for analytics joins.
      plan_id: paymentIntent.metadata?.plan_id ?? null,
    },
  });
}

/**
 * `charge.refunded` — record the refund and, when it covers a Lifetime
 * payment, mark the seat as refunded so the atomic claim RPC reuses it.
 */
export async function handleChargeRefunded(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
): Promise<void> {
  const customerId = customerOf(charge);
  const userId = await userIdFromCustomer(supabase, customerId);

  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "charge_refunded",
    metadata: {
      charge_id: charge.id,
      payment_intent_id:
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : (charge.payment_intent?.id ?? null),
      customer_id: customerId,
      amount_refunded_cents: charge.amount_refunded,
      currency: charge.currency,
    },
  });

  // Lifetime downgrade: if this charge corresponds to a claimed seat, mark
  // it refunded so it returns to the public pool.
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);

  if (!paymentIntentId) return;

  // Only treat as a Lifetime refund when the full amount is refunded.
  if (charge.amount_refunded < charge.amount) return;

  const { data: seat } = await supabase
    .from("lifetime_seats")
    .select("seat_number, user_id, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!seat || seat.status !== "claimed") return;

  await supabase
    .from("lifetime_seats")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("seat_number", seat.seat_number);

  await supabase.from("audit_log").insert({
    user_id: (seat.user_id as string | null) ?? userId,
    action: "lifetime_seat_refunded",
    metadata: {
      seat_number: seat.seat_number,
      payment_intent_id: paymentIntentId,
      charge_id: charge.id,
    },
  });
}
