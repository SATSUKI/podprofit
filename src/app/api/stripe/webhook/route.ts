import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { PLAN_CATALOG } from "@/lib/stripe/products";

export const runtime = "nodejs";

/**
 * Stripe Webhook handler.
 *
 * Critical responsibilities (per `supabase-er-rls-design.md` ADR):
 *  - Signature verification (refuse anything without a valid Stripe signature)
 *  - Idempotency (event.id stored as PK; replays are no-ops)
 *  - Lifetime seat atomic claim via `fn_claim_lifetime_seat` RPC
 *  - Mirror subscription state into `public.subscriptions` for fast read access
 *
 * Per CEO slim-down: the `webhook_events` idempotency table is a future migration
 * (keeps the W3 surface minimal). For now, idempotency is best-effort via the
 * unique constraint on `lifetime_seats.stripe_payment_intent_id`.
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json(
      {
        error: "Stripe webhook signature or secret missing.",
        hint: "Set STRIPE_WEBHOOK_SECRET when Stripe is configured (W6).",
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const planId = session.metadata?.plan_id;
      if (planId === "lifetime") {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        if (paymentIntentId) {
          // Atomic seat claim. RPC returns the seat_number or null when sold out.
          const { data: seatNumber, error } = await supabase.rpc(
            "fn_claim_lifetime_seat",
            {
              p_user_id: null, // anon Lifetime purchases — link to user later
              p_payment_intent_id: paymentIntentId,
            },
          );
          if (error) {
            console.error("[stripe.webhook] seat claim failed", error);
          } else if (seatNumber === null) {
            // Sold out — issue immediate refund to maintain the cap promise.
            await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: "duplicate",
              metadata: { reason: "lifetime_capacity_exceeded" },
            });
          }
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const priceId = sub.items.data[0]?.price.id;
      const lookupKey = sub.items.data[0]?.price.lookup_key ?? "";
      const planEntry =
        Object.values(PLAN_CATALOG).find((p) => p.stripeLookupKey === lookupKey) ??
        null;
      const planType = planEntry?.id ?? "free";

      // Mirror to subscriptions table. The user_id linkage requires us to look
      // up the user by stripe_customer_id (set during sign-up flow).
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (profile?.user_id) {
        // Stripe v22 moved period boundaries onto the SubscriptionItem.
        const item = sub.items.data[0];
        const periodStart = item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null;
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null;
        await supabase.from("subscriptions").upsert(
          {
            user_id: profile.user_id,
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
      }
      break;
    }

    default:
      // No-op for events we don't handle yet.
      break;
  }

  return NextResponse.json({ received: true });
}
