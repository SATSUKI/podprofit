import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe/server";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { createServerSupabase } from "@/lib/supabase/server";
import { SignupEventEmitter } from "@/components/signup-event-emitter";

/**
 * Post-checkout landing page (Stripe `success_url`).
 *
 * Why a dedicated page (vs. just bouncing to /account)?
 *
 *   1. Stripe review (PODP-30) test-card flow lands here — a generic
 *      /account dashboard reads as "did the purchase even succeed?".
 *      A definite "Welcome, your seat is reserved" message is the
 *      single cleanest signal to the reviewer.
 *   2. Founding-member UX: Lifetime buyers are paying $149 up-front for
 *      a product still in pre-launch — the welcome screen is where we
 *      acknowledge that and point to next steps (calculator, support
 *      email, billing portal for Pro).
 *   3. Anonymous Lifetime path: the checkout API allows Lifetime
 *      purchases without an account. After Stripe fires the webhook the
 *      user lands here without a Supabase session yet — we need to tell
 *      them to sign in with the email they used at checkout.
 *
 * The page is server-rendered and reads `session_id` from the query
 * string (Stripe substitutes `{CHECKOUT_SESSION_ID}` server-side). We
 * retrieve the Stripe Checkout Session to display the plan label;
 * RLS-protected order data still lives in /account proper.
 *
 * Failure modes are intentionally soft — if Stripe is unreachable or
 * the session is malformed we still render a generic success page
 * (the webhook is the source of truth for entitlement, not this URL).
 */
export const metadata: Metadata = {
  title: "Welcome to PODProfit",
  // No reason to index post-checkout pages — they're per-user dynamic
  // URLs and have nothing AIO sources should cite.
  robots: { index: false, follow: false },
};

interface WelcomePageProps {
  searchParams: Promise<{ session_id?: string }>;
}

type PlanLabel = "Lifetime" | "Pro · Monthly" | "Pro · Annual" | "PODProfit";

interface ResolvedSession {
  planLabel: PlanLabel;
  planId: "lifetime" | "pro_monthly" | "pro_yearly" | null;
  customerEmail: string | null;
}

async function resolveSession(
  sessionId: string | undefined,
): Promise<ResolvedSession> {
  const fallback: ResolvedSession = {
    planLabel: "PODProfit",
    planId: null,
    customerEmail: null,
  };
  if (!sessionId) return fallback;
  if (!process.env.STRIPE_SECRET_KEY) return fallback;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const planId = (session.metadata?.plan_id ?? null) as
      | "lifetime"
      | "pro_monthly"
      | "pro_yearly"
      | null;
    const planLabel: PlanLabel =
      planId === "lifetime"
        ? "Lifetime"
        : planId === "pro_monthly"
          ? "Pro · Monthly"
          : planId === "pro_yearly"
            ? "Pro · Annual"
            : "PODProfit";
    return {
      planLabel,
      planId,
      customerEmail: session.customer_details?.email ?? null,
    };
  } catch {
    return fallback;
  }
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const { session_id: sessionId } = await searchParams;

  // No session_id means the user landed here directly (or copy-pasted
  // a stale URL). Treat it as a soft redirect to /account where they
  // can see their actual entitlement.
  if (!sessionId) {
    redirect("/account");
  }

  const { planLabel, planId, customerEmail } = await resolveSession(sessionId);

  // We only know if the buyer has a Supabase session by asking — Lifetime
  // anonymous purchases don't get one until they magic-link in.
  const supabase = await createSsrSupabase();
  const authedUser = supabase ? (await supabase.auth.getUser()).data.user : null;
  const isLifetime = planId === "lifetime";
  const isPro = planId === "pro_monthly" || planId === "pro_yearly";

  // ── PODP-62 backfill: heal anonymous→signed-in Lifetime purchases ──────
  // If a signed-in user lands on /account/welcome with a Lifetime
  // session_id whose webhook stored user_id=NULL (anonymous flow), patch
  // the seat row + user_profiles now. Idempotent: only updates rows where
  // user_id IS NULL, so we never overwrite another user's claim.
  if (isLifetime && authedUser && sessionId) {
    await backfillLifetimeSeatFromSession({
      sessionId,
      userId: authedUser.id,
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      {/* Re-emit signup_completed if the user clicked through after first
          magic-link sign-in. Idempotent (see SignupEventEmitter). */}
      <SignupEventEmitter enabled={Boolean(authedUser)} />

      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          Payment received
        </p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          {isLifetime
            ? "Welcome aboard, founding member."
            : "Welcome to PODProfit."}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-stone-700 dark:text-stone-300">
          {isLifetime
            ? "Your Lifetime seat is reserved. Every Pro feature, forever — no subscription to manage."
            : "Your subscription is active. The calculator, saved history, and exports are yours."}
        </p>
      </header>

      <section
        aria-label="Order summary"
        className="mt-10 rounded-2xl border border-brand-800/20 bg-brand-50 p-6 dark:border-brand-700/40 dark:bg-brand-900/30"
      >
        <h2 className="text-lg font-semibold">Plan</h2>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          <strong className="text-stone-900 dark:text-stone-100">
            {planLabel}
          </strong>
          {customerEmail ? (
            <>
              {" "}
              · receipt sent to{" "}
              <strong className="text-stone-900 dark:text-stone-100">
                {customerEmail}
              </strong>
            </>
          ) : null}
        </p>
        <p className="mt-3 text-xs text-stone-600 dark:text-stone-400">
          A Stripe receipt was emailed by Stripe (separate from any PODProfit
          email). If it doesn&apos;t arrive within 5 minutes, check spam or
          email{" "}
          <a
            href="mailto:hello@getpodprofit.com"
            className="underline hover:text-brand-700 dark:hover:text-brand-300"
          >
            hello@getpodprofit.com
          </a>
          .
        </p>
      </section>

      {/* Next-steps block: branches on whether the buyer is signed in. The
          common case for Pro is signed-in (we required auth at checkout);
          the common case for Lifetime is anonymous (we allow it). */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <NextStepCard
          title="Run a calculation"
          body="The full calculator is unlocked. Compare Printful vs Printify on the same product in any of 6 currencies."
          href="/"
          cta="Open calculator"
          ctaVariant="solid"
        />
        {authedUser ? (
          <NextStepCard
            title="Manage your account"
            body={
              isPro
                ? "Update your card, change billing cadence, or download invoices any time from your account dashboard."
                : "Your Lifetime seat number, saved calculations, and receipts are all in your account dashboard."
            }
            href="/account"
            cta="Open account"
            ctaVariant="outline"
          />
        ) : (
          <NextStepCard
            title="Sign in to access your seat"
            body={
              customerEmail
                ? `Use the same email you paid with (${customerEmail}). We'll email you a one-tap sign-in link.`
                : "Use the same email you paid with. We'll email you a one-tap sign-in link — no password needed."
            }
            href="/login"
            cta="Sign in"
            ctaVariant="outline"
          />
        )}
      </section>

      {isLifetime ? (
        <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-lg font-semibold">What founding membership means</h2>
          <ul className="mt-4 space-y-2 text-sm text-stone-700 dark:text-stone-300">
            <li className="flex gap-2">
              <span className="text-brand-700 dark:text-brand-300">✓</span>
              <span>
                <strong className="text-stone-900 dark:text-stone-100">
                  Every future Pro tool, included.
                </strong>{" "}
                The Excel Profit Template (releasing 2026-07-23) and the
                quarterly Benchmark Report PDF (first issue 2026-08-20) are
                free for you. Standalone they&apos;re $19 and $29.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-700 dark:text-brand-300">✓</span>
              <span>
                <strong className="text-stone-900 dark:text-stone-100">
                  Name credit on the founding-member page.
                </strong>{" "}
                Reply to your Stripe receipt with the name you&apos;d like
                shown (or opt out — your call).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-700 dark:text-brand-300">✓</span>
              <span>
                <strong className="text-stone-900 dark:text-stone-100">
                  Direct line to the founder.
                </strong>{" "}
                Email{" "}
                <a
                  href="mailto:hello@getpodprofit.com"
                  className="underline hover:text-brand-700 dark:hover:text-brand-300"
                >
                  hello@getpodprofit.com
                </a>{" "}
                — replies usually within a business day.
              </span>
            </li>
          </ul>
        </section>
      ) : null}

      <section className="mt-10 text-sm text-stone-600 dark:text-stone-400">
        <p>
          Questions? See the{" "}
          <Link href="/faq" className="underline">
            FAQ
          </Link>{" "}
          or read the{" "}
          <Link href="/legal/refunds" className="underline">
            refund policy
          </Link>
          . Need a hand? Email{" "}
          <a
            href="mailto:hello@getpodprofit.com"
            className="underline hover:text-brand-700 dark:hover:text-brand-300"
          >
            hello@getpodprofit.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}

/**
 * PODP-62: when a Lifetime buyer who paid anonymously lands here after
 * signing in (Stripe success_url → magic-link sign-in → back to this
 * page), link the orphaned seat row to their auth user.
 *
 * Idempotent and tolerant: the .is("user_id", null) guard prevents us
 * from clobbering another user's claim, and Stripe/Supabase failures
 * are swallowed (we still want the welcome page to render).
 */
async function backfillLifetimeSeatFromSession(params: {
  sessionId: string;
  userId: string;
}): Promise<void> {
  const { sessionId, userId } = params;
  try {
    if (!process.env.STRIPE_SECRET_KEY) return;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.plan_id !== "lifetime") return;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;
    if (!paymentIntentId) return;

    const admin = createServerSupabase();
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
    // Non-fatal: the seat is claimed in Stripe + Supabase regardless.
  }
}

function NextStepCard({
  title,
  body,
  href,
  cta,
  ctaVariant,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  ctaVariant: "solid" | "outline";
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-stone-700 dark:text-stone-300">
        {body}
      </p>
      <Link
        href={href}
        className={
          ctaVariant === "solid"
            ? "mt-4 inline-flex items-center justify-center rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
            : "mt-4 inline-flex items-center justify-center rounded-lg border border-brand-800 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-300 dark:hover:bg-brand-900/20"
        }
      >
        {cta}
      </Link>
    </div>
  );
}
