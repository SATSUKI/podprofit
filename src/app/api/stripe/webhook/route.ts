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

export const runtime = "nodejs";

/**
 * Stripe webhook handler.
 *
 * Critical responsibilities (per `measurement-spec-v1.md` §1.2 / §4.3):
 *   - Signature verification (401 anything without a valid signature).
 *   - Idempotency via `webhook_events.stripe_event_id` UK — replays are
 *     no-ops.
 *   - Lifetime: atomic seat claim via `fn_claim_lifetime_seat` RPC + audit
 *     log row, all gated by the same idempotency claim.
 *   - Subscription: mirror Stripe state into `public.subscriptions`.
 *   - Failure semantics: any side-effect failure deletes the
 *     `webhook_events` row so Stripe's retry can succeed (avoids "stuck"
 *     unprocessed rows that would block retries forever).
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
        await handleLifetimeCheckoutCompleted(
          stripe,
          supabase,
          event.data.object as Stripe.Checkout.Session,
        );
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
  const planType = planEntry?.id ?? "free";

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!profile?.user_id) return;

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
  if (error) {
    throw new Error(`subscriptions upsert failed: ${error.message}`);
  }
}
