import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_CATALOG } from "@/lib/stripe/products";
import { getLifetimeClaimedCount } from "@/lib/lifetime/get-claimed";
import { EmailSignup } from "@/components/email-signup";
import { ProductOffersJsonLd, type ProductOffer } from "@/components/json-ld";
import { cn } from "@/lib/utils/cn";
import { isLaunched } from "@/lib/utils/launch-gate";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentPlanSnapshot } from "@/lib/stripe/current-plan";

const SITE_URL = "https://getpodprofit.com";
const PRO_AVAILABLE_DATE = "June 9, 2026";

export const metadata: Metadata = {
  title: "Pricing — Free, Pro Monthly, Pro Annual, Lifetime",
  description:
    "Free forever calculator. Pro Monthly $9 USD/month and Pro Annual $79 USD/year available June 9, 2026. Lifetime $149 (one-time) — limited to 100 seats, available now.",
  // Explicit canonical — root layout sets the homepage as the default
  // canonical, so without this `/pricing` would advertise itself as a
  // duplicate of `/`. Same reason we explicitly set canonical on every
  // other indexable page.
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/pricing`,
    title: "PODProfit Pricing — Free, Pro Monthly, Pro Annual, Lifetime",
    description:
      "Free forever calculator. Pro Monthly $9 USD/month and Pro Annual $79 USD/year available June 9, 2026. Lifetime $149 (one-time) — limited to 100 seats, available now.",
    siteName: "PODProfit",
    // NOTE: Next.js does NOT merge `openGraph.images` from a parent
    // layout when a child page defines its own `openGraph` block — the
    // child block overrides the parent entirely. So we must repeat the
    // /api/og image declaration on every page with its own openGraph.
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "PODProfit Pricing — Free, Pro Monthly, Pro Annual, Lifetime",
      },
    ],
  },
};

// PODP-62: /pricing now branches on the signed-in user's entitlement so
// a Lifetime owner cannot see a Buy CTA (which used to bypass the
// /api/stripe/checkout precheck if their seat row was data-orphaned).
// Reading `cookies()` via `createSsrSupabase` opts the route out of
// static caching automatically, so we don't need an explicit
// `revalidate`. Anonymous visitors still get the full plan grid; only
// the per-user CTA labels change.
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const claimed = await getLifetimeClaimedCount();
  const lifetime = PLAN_CATALOG.lifetime;
  const remaining = (lifetime.capacity ?? 100) - claimed;
  // PODP-39: Pro CTAs stay disabled until NEXT_PUBLIC_LAUNCH_DATE (default
  // 2026-06-09). Lifetime stays purchasable now so founding members can
  // claim seats during the pre-launch window.
  const proCtaActive = isLaunched();

  // ── PODP-62 / PODP-64: per-user entitlement gate ─────────────────────
  // If the visitor is signed in, look up their current plan snapshot via
  // service-role Supabase. We need three booleans: ownsLifetime, ownsPro,
  // and `isSignedIn` (PODP-64 — used to suppress the "(Sign-in required)"
  // hint when the user is already authenticated). Failures here are
  // non-fatal — we fall through to anonymous CTAs so the page still
  // renders.
  let ownsLifetime = false;
  let ownsPro = false;
  let isSignedIn = false;
  try {
    const ssr = await createSsrSupabase();
    const authedUser = ssr ? (await ssr.auth.getUser()).data.user : null;
    if (authedUser) {
      isSignedIn = true;
      const admin = createServerSupabase();
      const snapshot = await getCurrentPlanSnapshot(admin, authedUser.id);
      ownsLifetime = snapshot.hasLifetime;
      ownsPro = Boolean(snapshot.activeProSubscription);
    }
  } catch {
    // Swallow — treat as anonymous if env / Supabase is unavailable.
  }

  // Product+Offers schema. We expose the four user-visible plans in their
  // current marketplace state — Pro plans are PreOrder until 2026-06-09,
  // Lifetime is LimitedAvailability/SoldOut depending on the live counter.
  const offers: ProductOffer[] = [
    {
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    {
      name: "Pro Monthly",
      price: "9",
      priceCurrency: "USD",
      availability: "https://schema.org/PreOrder",
      priceValidUntil: "2026-06-09",
    },
    {
      name: "Pro Annual",
      price: "79",
      priceCurrency: "USD",
      availability: "https://schema.org/PreOrder",
      priceValidUntil: "2026-06-09",
    },
    {
      name: "Lifetime",
      price: "149",
      priceCurrency: "USD",
      availability:
        remaining > 0
          ? "https://schema.org/LimitedAvailability"
          : "https://schema.org/SoldOut",
      inventoryLevel: Math.max(remaining, 0),
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-12 md:py-20">
      <ProductOffersJsonLd
        productName="PODProfit"
        productDescription="Vendor-neutral, multi-currency Print-on-Demand profit calculator. Pro tier unlocks saved calculations, multi-store dashboards, CSV exports, and email support."
        productUrl={`${SITE_URL}/pricing`}
        offers={offers}
      />
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          Pricing
        </p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Honest pricing for an honest calculator.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-stone-700 dark:text-stone-300">
          The calculator is free forever — no signup, no rate limit. Pro Monthly,
          Pro Annual, and Lifetime unlock saved history, exports, and direct
          support for power users.
        </p>
      </header>

      <section
        aria-label="Plans"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <PlanCard
          name="Free"
          price="$0"
          priceUnit=""
          availability="Available now"
          tagline="Forever. No signup."
          features={[
            "Full calculator (all products, vendors, currencies)",
            "Vendor side-by-side comparison",
            "Share-able URLs with dynamic preview images",
            "No account, no rate limit",
          ]}
          ctaHref="/"
          ctaLabel="Try now"
          ctaVariant="outline"
        />
        <PlanCard
          name="Pro Monthly"
          price="$9 USD"
          priceUnit="/ month"
          availability={
            ownsLifetime
              ? "Included with Lifetime"
              : ownsPro
                ? "Active subscription"
                : proCtaActive
                  ? "Available now"
                  : `Available ${PRO_AVAILABLE_DATE}`
          }
          tagline="Cancel anytime."
          features={[
            "Everything in Free, forever",
            "Save unlimited calculations",
            "CSV export of calculation history",
            "Pause subscription up to 3 months",
            "Email support",
          ]}
          ctaHref={
            ownsLifetime
              ? "/account"
              : ownsPro
                ? "/api/stripe/portal"
                : proCtaActive
                  ? "/api/stripe/checkout?plan=pro_monthly"
                  : "/pricing#notify-pro"
          }
          ctaLabel={
            ownsLifetime
              ? "You have Lifetime"
              : ownsPro
                ? "Manage subscription"
                : proCtaActive
                  ? "Subscribe"
                  : "Notify me"
          }
          ctaDisabled={!ownsLifetime && !ownsPro && !proCtaActive}
          ctaVariant="outline"
          ctaHint={
            !isSignedIn && proCtaActive && !ownsLifetime && !ownsPro
              ? "Sign-in required"
              : undefined
          }
        />
        <PlanCard
          name="Pro Annual"
          price="$79 USD"
          priceUnit="/ year"
          availability={
            ownsLifetime
              ? "Included with Lifetime"
              : ownsPro
                ? "Active subscription"
                : proCtaActive
                  ? "Available now"
                  : `Available ${PRO_AVAILABLE_DATE}`
          }
          tagline="Save $29 vs monthly. Lock in 12 months."
          features={[
            "Everything in Pro Monthly",
            "Annual billing — pay yearly, save 27%",
            "Locked-in pricing for 12 months",
            "Email support",
          ]}
          ctaHref={
            ownsLifetime
              ? "/account"
              : ownsPro
                ? "/api/stripe/portal"
                : proCtaActive
                  ? "/api/stripe/checkout?plan=pro_yearly"
                  : "/pricing#notify-pro"
          }
          ctaLabel={
            ownsLifetime
              ? "You have Lifetime"
              : ownsPro
                ? "Manage subscription"
                : proCtaActive
                  ? "Subscribe"
                  : "Notify me"
          }
          ctaDisabled={!ownsLifetime && !ownsPro && !proCtaActive}
          ctaVariant="outline"
          ctaHint={
            !isSignedIn && proCtaActive && !ownsLifetime && !ownsPro
              ? "Sign-in required"
              : undefined
          }
        />
        <PlanCard
          name="Lifetime"
          price="$149 USD"
          priceUnit="one-time"
          availability={
            ownsLifetime
              ? "You're a Lifetime member"
              : remaining > 0
                ? `Available now — ${remaining} of ${lifetime.capacity} seats remaining`
                : "All seats claimed"
          }
          tagline={
            ownsLifetime
              ? "Thank you for being a founding member."
              : "Limited to first 100 customers."
          }
          features={[
            "Everything in Pro, forever",
            "All future features included (Phase 2 + beyond)",
            "Founding member status — name credit",
            "Permanent priority early access to every future product (β invites for Phase 2-N)",
            "One-time payment, no subscription",
          ]}
          // PODP-62: Lifetime owners must NEVER see a Buy CTA on the
          // Lifetime card. We route them to /account so they can see
          // their seat number; the Buy button is suppressed entirely.
          ctaHref={
            ownsLifetime
              ? "/account"
              : remaining > 0
                ? "/api/stripe/checkout?plan=lifetime"
                : undefined
          }
          ctaLabel={
            ownsLifetime
              ? "You're a Lifetime member ✓"
              : remaining > 0
                ? "Reserve seat"
                : "Sold out"
          }
          ctaDisabled={!ownsLifetime && remaining <= 0}
          ctaVariant="solid"
          highlighted
          ctaHint={
            !isSignedIn && !ownsLifetime && remaining > 0
              ? "Sign-in required"
              : undefined
          }
        />
      </section>

      <section
        id="notify-pro"
        aria-label="Notify me when Pro launches"
        className="scroll-mt-24"
      >
        <EmailSignup
          source="pricing_pro_notify"
          headline={`Get notified when Pro launches on ${PRO_AVAILABLE_DATE}`}
          subline="One email on launch day with the founding-member discount code. No spam, no other emails."
        />
      </section>

      <section className="text-sm text-stone-600 dark:text-stone-400">
        <p>
          All prices in USD. International tax (VAT / Sales Tax) is calculated
          and collected automatically at checkout via Stripe Tax. Refunds:
          Lifetime within 14 days; Pro subscriptions are not pro-rated but you
          keep access until the end of your billing period. See{" "}
          <Link href="/legal/refunds" className="underline">
            refund policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function PlanCard({
  name,
  price,
  priceUnit,
  availability,
  tagline,
  features,
  ctaHref,
  ctaLabel,
  ctaDisabled,
  ctaVariant = "outline",
  highlighted,
  ctaHint,
}: {
  name: string;
  price: string;
  priceUnit: string;
  availability: string;
  tagline: string;
  features: string[];
  ctaHref?: string;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  ctaVariant?: "solid" | "outline";
  highlighted?: boolean;
  /**
   * PODP-64: small hint below the CTA (e.g. "Sign-in required"). Rendered
   * only when defined; pricing/page.tsx passes it for paid-plan cards
   * when the visitor is anonymous so they know a /login round-trip is
   * coming when they click Buy.
   */
  ctaHint?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-6 shadow-sm",
        highlighted
          ? "border-brand-800 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30"
          : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
      )}
    >
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-3 text-3xl font-bold tabular-nums">
        {price}
        {priceUnit ? (
          <span className="ml-1 text-base font-medium text-stone-600 dark:text-stone-400">
            {priceUnit}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
        {availability}
      </p>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        {tagline}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-stone-700 dark:text-stone-300">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-brand-700 dark:text-brand-300">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {ctaHref && ctaLabel ? (
        ctaDisabled ? (
          // PODP-39: pre-launch disabled state. Visually inactive (no
          // hover, muted palette) but still a real <Link> when ctaHref
          // points to `#notify-pro` so keyboard / screen-reader users can
          // jump to the email-signup section.
          <Link
            href={ctaHref}
            aria-disabled="true"
            className="mt-6 inline-flex items-center justify-center rounded-lg border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
          >
            {ctaLabel}
          </Link>
        ) : (
          <Link
            href={ctaHref}
            className={cn(
              "mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition",
              ctaVariant === "solid"
                ? "bg-brand-800 text-white hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
                : "border border-brand-800 text-brand-800 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-300 dark:hover:bg-brand-900/20",
            )}
          >
            {ctaLabel}
          </Link>
        )
      ) : ctaLabel ? (
        <span className="mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-stone-300 px-4 py-2 text-sm font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-400">
          {ctaLabel}
        </span>
      ) : (
        <span className="mt-6 text-center text-xs text-stone-500 dark:text-stone-500">
          No signup required
        </span>
      )}
      {ctaHint ? (
        <p
          className="mt-2 text-center text-xs text-stone-500 dark:text-stone-400"
          data-testid="plan-cta-hint"
        >
          {ctaHint}
        </p>
      ) : null}
    </div>
  );
}
