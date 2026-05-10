import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createSsrSupabase } from "@/lib/supabase/ssr";

export const runtime = "nodejs";

/**
 * Stripe Customer Portal — lets Pro subscribers manage their subscription
 * (upgrade / downgrade / pause / cancel) and update payment methods. Also
 * used by the checkout pre-check to redirect Pro→Pro plan-change attempts.
 *
 * Auth required. Redirects to /login if anonymous and to /account if the
 * user has no Stripe customer id (e.g. Free user clicking the portal link
 * before any purchase).
 */
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const origin = getOrigin(req);

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not yet configured." },
      { status: 503 },
    );
  }

  const supabase = await createSsrSupabase();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login`, { status: 303 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent("/api/stripe/portal")}`,
      { status: 303 },
    );
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const stripeCustomerId = profile?.stripe_customer_id as string | null | undefined;
  if (!stripeCustomerId) {
    // No payment history yet — push them to /account (which renders a
    // friendly "you don't have a paid plan yet" state).
    return NextResponse.redirect(`${origin}/account?portal=unavailable`, {
      status: 303,
    });
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/account`,
  });

  return NextResponse.redirect(session.url, { status: 303 });
}

function getOrigin(req: NextRequest): string {
  return (
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://getpodprofit.com"
  );
}
