import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { PLAN_CATALOG, type PlanId } from "@/lib/stripe/products";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  getCurrentPlanSnapshot,
  getLifetimeRemaining,
} from "@/lib/stripe/current-plan";
import { evaluateCheckoutPrecheck } from "@/lib/stripe/checkout-precheck";
import { hasPriorLifetimePurchaseByEmail } from "@/lib/stripe/email-fallback-check";
import { buildLoginRedirect } from "@/lib/stripe/checkout-login-redirect";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout Session for the chosen plan.
 *
 * Routes (both supported, GET keeps `<a href>` working without JS):
 *   GET  /api/stripe/checkout?plan=lifetime
 *   POST /api/stripe/checkout?plan=lifetime    ← preferred for forms
 *
 * Pre-Stripe gates:
 *   - Auth required for ALL plans (PODP-64). Anonymous purchase is forbidden
 *     so we always have a `metadata.user_id` to link the resulting Stripe
 *     customer / seat / subscription back to a Supabase user at webhook
 *     time. The previous "anonymous Lifetime allowed" carve-out (5a1bbb6)
 *     produced orphaned `lifetime_seats.user_id = NULL` rows that the
 *     /pricing UI gate (PODP-62) could not see, which the CEO ruled
 *     unacceptable on UX grounds ("charging without an account doesn't
 *     happen on real products"). Anonymous requests get a 303 to
 *     `/login?next=<self>`; the magic-link callback honours `?next=` and
 *     hands the user back to this endpoint after sign-in.
 *   - Lifetime + Pro conflict → deny / redirect / confirm (see
 *     `evaluateCheckoutPrecheck`).
 *
 * Stripe price resolution prefers `lookup_key` (test/prod-mode independent).
 * Falls back to `STRIPE_PRICE_ID_*` env vars when the dashboard hasn't been
 * tagged with lookup_keys yet — useful in pure Test Mode bring-up.
 */
export async function GET(req: NextRequest) {
  return handleCheckout(req);
}

export async function POST(req: NextRequest) {
  return handleCheckout(req);
}

async function handleCheckout(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan") as PlanId | null;
  const confirmed = searchParams.get("confirmed") === "true";

  if (!plan || !(plan in PLAN_CATALOG)) {
    return NextResponse.json(
      { error: "Unknown plan. Use ?plan=pro_monthly | pro_yearly | lifetime" },
      { status: 400 },
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        error: "Stripe is not yet configured.",
        hint: "Set STRIPE_SECRET_KEY (Test or Live) before invoking this endpoint.",
      },
      { status: 503 },
    );
  }

  const planEntry = PLAN_CATALOG[plan];
  const stripe = getStripe();

  // ── Auth required for ALL plans (PODP-64) ──────────────────────────────
  // Anonymous purchase is rejected outright. The magic-link callback
  // (`/auth/callback`) honours `?next=` and returns the user to this
  // endpoint after sign-in. This eliminates the anonymous Lifetime class
  // entirely — every checkout session is guaranteed to carry
  // `metadata.user_id`, which the webhook uses to link
  // `lifetime_seats` / `subscriptions` rows back to a Supabase user
  // without any email-fallback heuristics.
  const sessionSupabase = await createSsrSupabase();
  const authedUser = sessionSupabase
    ? (await sessionSupabase.auth.getUser()).data.user
    : null;

  if (!authedUser) {
    const origin = getOrigin(req);
    return NextResponse.redirect(
      buildLoginRedirect(origin, plan, confirmed),
      { status: 303 },
    );
  }

  // ── PODP-35 pre-check ──────────────────────────────────────────────────
  const supabaseAdmin = createServerSupabase();
  const [snapshot, lifetimeRemaining] = await Promise.all([
    getCurrentPlanSnapshot(supabaseAdmin, authedUser.id),
    planEntry.id === "lifetime"
      ? getLifetimeRemaining(supabaseAdmin)
      : Promise.resolve(Number.POSITIVE_INFINITY),
  ]);
  const preCustomerId: string | null = snapshot.stripeCustomerId;

  const decision = evaluateCheckoutPrecheck({
    desiredPlan: plan,
    snapshot,
    lifetimeRemaining,
    confirmed,
  });

  if (decision.decision === "deny") {
    return NextResponse.json(
      { error: decision.message, reason: decision.reason },
      { status: 400 },
    );
  }
  if (decision.decision === "redirect_portal") {
    const origin = getOrigin(req);
    return NextResponse.redirect(`${origin}/api/stripe/portal`, {
      status: 303,
    });
  }
  if (decision.decision === "confirm_required") {
    return NextResponse.json(
      {
        error: decision.message,
        reason: "confirm_required",
        retry_url: `${getOrigin(req)}/api/stripe/checkout?plan=${plan}&confirmed=true`,
      },
      { status: 409 },
    );
  }

  // ── PODP-62 defense-in-depth: email-based Stripe fallback ──────────────
  // PODP-64 makes anonymous Lifetime impossible going forward, but legacy
  // orphaned `lifetime_seats.user_id = NULL` rows can still exist from
  // pre-fix purchases. Before we hand off to Stripe for ANOTHER Lifetime
  // purchase, ask Stripe directly: does any customer with this email
  // already have a successful Lifetime payment? If so, deny + heal the
  // orphaned seat row so subsequent precheck calls block at the DB layer.
  if (plan === "lifetime" && authedUser.email) {
    const stripeForCheck = getStripe();
    const lifetimePriceId = await resolvePriceId(
      stripeForCheck,
      "lifetime",
      PLAN_CATALOG.lifetime.stripeLookupKey,
    );
    const prior = await hasPriorLifetimePurchaseByEmail(stripeForCheck, {
      email: authedUser.email,
      lifetimePriceId,
    });
    if (prior.hasPriorPurchase) {
      // Best-effort heal: link the orphaned seat row to this auth user
      // so the next request hits the cheap DB check instead of Stripe.
      await healOrphanedLifetimeSeat({
        paymentIntentId: prior.paymentIntentId,
        userId: authedUser.id,
        customerId: prior.customerId,
      });
      return NextResponse.json(
        {
          error: "You already have Lifetime access.",
          reason: "buying_lifetime_again",
        },
        { status: 400 },
      );
    }
  }

  // ── Resolve the Stripe price (lookup_key preferred, env fallback) ──────
  const priceId = await resolvePriceId(stripe, planEntry.id, planEntry.stripeLookupKey);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `No active Stripe price for plan="${planEntry.id}".`,
        hint: `Tag the price with lookup_key="${planEntry.stripeLookupKey}" or set STRIPE_PRICE_ID_${envSuffix(planEntry.id)} in env.`,
      },
      { status: 500 },
    );
  }

  const origin = getOrigin(req);
  const successUrl = `${origin}/account/welcome?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/pricing?canceled=1`;

  const session = await stripe.checkout.sessions.create({
    mode: planEntry.mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
    // EU/UK Consumer Rights Directive Article 16(m) waiver — required to
    // hold the line on "no refund after access granted" for EU/UK
    // Lifetime customers. Without an explicit waiver collected at
    // checkout, those customers retain a 14-day right of withdrawal even
    // after we've granted seat access (high-cost rollback path on a $149
    // SKU). Stripe surfaces this as a "must check the box" UI on the
    // checkout page when consent_collection.terms_of_service is set.
    //
    // Custom message text is the literal waiver language reviewed by
    // Legal — kept inline so it can be diffed without grepping a
    // separate copy module.
    consent_collection: {
      terms_of_service: "required",
    },
    custom_text: {
      terms_of_service_acceptance: {
        message:
          "I agree to immediate access and acknowledge that I waive my 14-day EU/UK right of withdrawal once access is granted.",
      },
    },
    metadata: {
      plan_id: planEntry.id,
      user_id: authedUser.id,
    },
    // Bind to existing Stripe customer when we have one (preserves payment
    // methods + tax id). Otherwise pre-fill the email so Stripe finds /
    // creates the customer record tied to the signed-in user. PODP-64
    // guarantees `authedUser` is non-null here, so we never reach a path
    // without an email or user_id to anchor the customer to.
    ...(preCustomerId
      ? { customer: preCustomerId }
      : { customer_email: authedUser.email ?? undefined }),
    // For one-shot Lifetime purchases (payment mode) without a pre-existing
    // customer we still need Stripe to materialise one so the webhook can
    // upsert `user_profiles.stripe_customer_id`. Subscriptions auto-create.
    customer_creation:
      !preCustomerId && planEntry.mode === "payment" ? "always" : undefined,
    // Carry user_id onto subscription/PI objects too, so webhooks for
    // `customer.subscription.*` and `payment_intent.*` can find the user
    // even when `checkout.session.completed` arrives later.
    ...(planEntry.mode === "subscription"
      ? {
          subscription_data: {
            metadata: { plan_id: planEntry.id, user_id: authedUser.id },
          },
        }
      : {
          payment_intent_data: {
            metadata: { plan_id: planEntry.id, user_id: authedUser.id },
          },
        }),
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a Checkout URL." },
      { status: 500 },
    );
  }
  return NextResponse.redirect(session.url, { status: 303 });
}

function getOrigin(req: NextRequest): string {
  return (
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://getpodprofit.com"
  );
}

function envSuffix(planId: PlanId): string {
  if (planId === "pro_monthly") return "MONTHLY";
  if (planId === "pro_yearly") return "ANNUAL";
  return "LIFETIME";
}

/**
 * PODP-62: heal an orphaned `lifetime_seats` row whose `user_id` is NULL
 * because the buyer was anonymous at checkout time. Idempotent — runs
 * inside the email-fallback branch above, only when Stripe confirmed the
 * email owns a prior Lifetime PI. Safe to no-op on errors; the deny
 * response has already been chosen by the caller.
 */
async function healOrphanedLifetimeSeat(params: {
  paymentIntentId: string | null;
  userId: string;
  customerId: string | null;
}): Promise<void> {
  const { paymentIntentId, userId, customerId } = params;
  if (!paymentIntentId) return;
  try {
    const admin = createServerSupabase();
    // Only patch the seat if it's currently orphaned — never overwrite a
    // row that already points at a (different) user. The PostgREST filter
    // `user_id=is.null` guarantees this.
    await admin
      .from("lifetime_seats")
      .update({ user_id: userId })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .is("user_id", null);
    if (customerId) {
      await admin
        .from("user_profiles")
        .upsert(
          { user_id: userId, stripe_customer_id: customerId },
          { onConflict: "user_id" },
        );
    }
  } catch {
    // Healing is best-effort; the deny response is the contract.
  }
}

async function resolvePriceId(
  stripe: Stripe,
  planId: PlanId,
  lookupKey: string,
): Promise<string | null> {
  // 1) Prefer lookup_key.
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    if (prices.data[0]) return prices.data[0].id;
  } catch {
    // fall through to env fallback
  }
  // 2) Env-var fallback (pure Test Mode bring-up).
  const envId =
    planId === "pro_monthly"
      ? process.env.STRIPE_PRICE_ID_MONTHLY
      : planId === "pro_yearly"
        ? process.env.STRIPE_PRICE_ID_ANNUAL
        : process.env.STRIPE_PRICE_ID_LIFETIME;
  return envId && envId.startsWith("price_") ? envId : null;
}
