import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { PLAN_CATALOG } from "@/lib/stripe/products";
import {
  claimWebhookEvent,
  markWebhookEventProcessed,
  releaseWebhookEventForRetry,
} from "@/lib/stripe/webhook-events";
import { handleLifetimeCheckoutCompleted } from "@/lib/stripe/lifetime-handler";
import {
  handleChargeRefunded,
  logInvoicePaid,
  logInvoicePaymentFailed,
  logPaymentIntentSucceeded,
} from "@/lib/stripe/audit-events";

export const runtime = "nodejs";

/**
 * Stripe webhook handler.
 *
 * Critical responsibilities (per `measurement-spec-v1.md` §1.2 / §4.3):
 *   - Signature verification (401 anything without a valid signature).
 *   - Idempotency via `webhook_events.stripe_event_id` UK — replays are
 *     no-ops.
 *   - Lifetime: atomic seat claim via `fn_claim_lifetime_seat` RPC + audit
 *     log row + auto-cancel of any active Pro sub (PODP-35), all gated by
 *     the same idempotency claim.
 *   - Subscription: mirror Stripe state into `public.subscriptions` and
 *     persist the `stripe_customer_id` onto the user_profile.
 *   - Invoice + PaymentIntent + Charge events: write audit_log rows and (for
 *     refunded Lifetime charges) re-open the seat.
 *   - Failure semantics: any side-effect failure deletes the
 *     `webhook_events` row so Stripe's retry can succeed.
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json(
      {
        error: "Stripe webhook signature or secret missing.",
        hint: "Set STRIPE_WEBHOOK_SECRET when Stripe is configured.",
      },
      { status: 503 },
    );
  }

  const body = await req.text(); // raw body for signature verification
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid signature", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const supabase = createServerSupabase();

  // Idempotency claim — short-circuit on replays before any side effects.
  const claim = await claimWebhookEvent(supabase, event.id, event.type, {
    livemode: event.livemode,
    api_version: event.api_version ?? null,
  });
  if (claim === "already_processed") {
    return NextResponse.json({ received: true, replay: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Subscription mode: link the Stripe customer back to the user_profile
        // so /api/stripe/portal can find them.
        if (session.mode === "subscription") {
          await linkCustomerToProfile(supabase, session);
        }
        await handleLifetimeCheckoutCompleted(stripe, supabase, session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscriptionMirror(
          supabase,
          event.data.object as Stripe.Subscription,
        );
        break;
      }

      case "invoice.paid": {
        await logInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;
      }

      case "invoice.payment_failed": {
        await logInvoicePaymentFailed(
          supabase,
          event.data.object as Stripe.Invoice,
        );
        break;
      }

      case "payment_intent.succeeded": {
        await logPaymentIntentSucceeded(
          supabase,
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      }

      case "charge.refunded": {
        await handleChargeRefunded(
          supabase,
          event.data.object as Stripe.Charge,
        );
        break;
      }

      default:
        // No-op for events we don't handle yet — still considered "processed"
        // so Stripe stops retrying.
        break;
    }

    await markWebhookEventProcessed(supabase, event.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe.webhook] handler failed", err);
    await releaseWebhookEventForRetry(supabase, event.id, err);
    return NextResponse.json(
      { error: "Handler failed", detail: (err as Error).message },
      { status: 500 },
    );
  }
}

async function linkCustomerToProfile(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.user_id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!userId || !customerId) return;

  await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
      },
      { onConflict: "user_id" },
    );
}

async function handleSubscriptionMirror(
  supabase: SupabaseClient,
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price.id;
  const lookupKey = sub.items.data[0]?.price.lookup_key ?? "";
  const planEntry =
    Object.values(PLAN_CATALOG).find((p) => p.stripeLookupKey === lookupKey) ??
    null;
  // Default to pro_monthly when status indicates an active subscription but
  // we couldn't resolve the plan from lookup_key (e.g. price was created
  // without a lookup_key in Test Mode bring-up). On `deleted`, force `free`.
  const planType =
    sub.status === "canceled" || sub.status === "incomplete_expired"
      ? "free"
      : (planEntry?.id ?? "pro_monthly");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  // No profile yet — try to resolve via subscription metadata (set during
  // Checkout) and link the customer in passing.
  let userId = (profile?.user_id as string | null | undefined) ?? null;
  if (!userId) {
    const metaUserId = sub.metadata?.user_id;
    if (metaUserId) {
      await supabase
        .from("user_profiles")
        .upsert(
          { user_id: metaUserId, stripe_customer_id: customerId },
          { onConflict: "user_id" },
        );
      userId = metaUserId;
    }
  }
  if (!userId) return;

  // Stripe v22 moved period boundaries onto the SubscriptionItem.
  const item = sub.items.data[0];
  const periodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_type: planType,
      status: sub.status,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) {
    throw new Error(`subscriptions upsert failed: ${error.message}`);
  }
}
