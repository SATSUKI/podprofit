import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { PLAN_CATALOG, type PlanId } from "@/lib/stripe/products";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout Session for the chosen plan.
 *
 * Request: GET /api/stripe/checkout?plan=lifetime
 * Returns: 303 redirect to Stripe Checkout, or JSON error with helpful message.
 *
 * Notes:
 *  - Stripe price IDs are resolved by `lookup_key` so the code is
 *    test/prod-mode independent. The dashboard must have prices with the
 *    matching lookup_keys (see `lib/stripe/products.ts`).
 *  - Per CEO slim-down: env vars are not required at build time. If they're
 *    missing at request time, we return a clear 503 explaining the deferral.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan") as PlanId | null;

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
        hint: "Per project plan, Stripe production keys are set up in W6 (2026-06-04+). The checkout endpoint is built and ready — only env vars are missing.",
      },
      { status: 503 },
    );
  }

  const planEntry = PLAN_CATALOG[plan];
  const stripe = getStripe();

  // Resolve Stripe price by lookup_key (decouples test/prod IDs).
  const prices = await stripe.prices.list({
    lookup_keys: [planEntry.stripeLookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    return NextResponse.json(
      {
        error: `No active Stripe price with lookup_key="${planEntry.stripeLookupKey}".`,
        hint: "Create the price in the Stripe dashboard with this exact lookup_key.",
      },
      { status: 500 },
    );
  }

  const origin = req.headers.get("origin") ?? "https://getpodprofit.com";

  const session = await stripe.checkout.sessions.create({
    mode: planEntry.mode,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${origin}/account/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?canceled=1`,
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
    metadata: { plan_id: planEntry.id },
    // For one-time Lifetime payments, capture customer email even without account
    customer_creation: planEntry.mode === "payment" ? "always" : undefined,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a Checkout URL." },
      { status: 500 },
    );
  }
  return NextResponse.redirect(session.url, { status: 303 });
}
