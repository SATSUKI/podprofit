import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_CATALOG } from "@/lib/stripe/products";
import { getLifetimeClaimedCount } from "@/lib/lifetime/get-claimed";
import { EmailSignup } from "@/components/email-signup";
import { ProductOffersJsonLd } from "@/components/json-ld";
import { cn } from "@/lib/utils/cn";

const SITE_URL = "https://getpodprofit.com";
const FOUNDING_RESERVED = 8;

export const metadata: Metadata = {
  title: "PODProfit Lifetime — $149 for 100 builders",
  description:
    "Lifetime access to PODProfit. 100 seats, $149 one-time. Includes future Pro tools (Excel Template + Quarterly Benchmark Report).",
  alternates: {
    canonical: `${SITE_URL}/lifetime`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/lifetime`,
    title: "PODProfit Lifetime — $149 for 100 builders",
    description:
      "100 seats, $149 one-time. Calculator + every future Pro tool, forever.",
    // Re-declare the OG image — Next does not inherit `openGraph.images`
    // from a parent layout when a child page defines its own openGraph
    // block. See pricing/page.tsx for the same pattern.
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "PODProfit Lifetime — $149 for 100 builders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PODProfit Lifetime — $149 for 100 builders",
    description:
      "100 seats, $149 one-time. Calculator + every future Pro tool, forever.",
    images: ["/api/og"],
  },
};

// Revalidate the live seat counter every 60 seconds.
export const revalidate = 60;

export default async function LifetimePage() {
  const lifetime = PLAN_CATALOG.lifetime;
  const capacity = lifetime.capacity ?? 100;
  // `getLifetimeClaimedCount` already swallows DB errors and returns 0 — so a
  // fallback of "100 seats remaining" is the natural display when Supabase is
  // unavailable. Clamp to the cap defensively in case the view ever overshoots.
  const claimed = Math.min(Math.max(await getLifetimeClaimedCount(), 0), capacity);
  const remaining = capacity - claimed;
  const soldOut = remaining <= 0;
  const progressPct = Math.round((claimed / capacity) * 100);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-12 md:py-20">
      {/* Product+Offers JSON-LD — focused on the single Lifetime SKU.
          AIO citation rate benefits from a page-specific schema that
          mirrors the visible offer rather than re-emitting the four-plan
          comparison from /pricing. inventoryLevel is the live remaining
          counter so AI overviews can quote scarcity accurately. */}
      <ProductOffersJsonLd
        productName="PODProfit Lifetime"
        productDescription="One-time $149 USD payment for lifetime access to PODProfit — calculator, every future Pro tool (Excel Profit Template, Quarterly Benchmark Report PDF), and founding-member status. Limited to 100 seats."
        productUrl={`${SITE_URL}/lifetime`}
        offers={[
          {
            name: "Lifetime",
            price: "149",
            priceCurrency: "USD",
            availability: soldOut
              ? "https://schema.org/SoldOut"
              : "https://schema.org/LimitedAvailability",
            inventoryLevel: Math.max(remaining, 0),
          },
        ]}
      />
      {/* Hero */}
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          Lifetime
        </p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Lifetime PODProfit — 100 seats, claimed by builders worldwide.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-stone-700 dark:text-stone-300">
          One $149 payment. The calculator, every future Pro tool, forever. When 100
          seats are taken, this offer closes permanently and only $9/month Pro remains.
        </p>
      </header>

      {/* Live counter */}
      <section
        aria-labelledby="counter-heading"
        className="rounded-2xl border border-brand-800/20 bg-brand-50 p-6 text-center dark:border-brand-700/40 dark:bg-brand-900/30 md:p-10"
      >
        <h2 id="counter-heading" className="sr-only">
          Live seat counter
        </h2>
        <p
          className="text-5xl font-bold tabular-nums text-brand-800 md:text-6xl dark:text-brand-200"
          aria-live="polite"
        >
          {claimed} / {capacity}
        </p>
        <p className="mt-2 text-sm font-medium text-brand-800 dark:text-brand-200">
          seats claimed
        </p>
        <div
          className="mx-auto mt-6 h-3 w-full max-w-md overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
          role="progressbar"
          aria-valuenow={claimed}
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-label={`${claimed} of ${capacity} Lifetime seats claimed`}
        >
          <div
            className="h-full rounded-full bg-brand-700 transition-all dark:bg-brand-400"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-4 text-xs text-stone-600 dark:text-stone-400">
          {soldOut
            ? "All seats claimed."
            : `${remaining} of ${capacity} seats remaining.`}{" "}
          Of {capacity} total seats, {FOUNDING_RESERVED} are reserved for founding β
          testers (April–May 2026 cohort). The remaining{" "}
          {capacity - FOUNDING_RESERVED} are publicly available.
        </p>
      </section>

      {/* Price + CTA */}
      <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <p className="text-4xl font-bold tabular-nums">{lifetime.displayPrice}</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          One-time payment. No subscription. No renewal.
        </p>
        <div className="mt-6">
          {soldOut ? (
            <span className="inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-stone-300 px-6 py-3 text-sm font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-400">
              All seats claimed
            </span>
          ) : (
            <Link
              href="/api/stripe/checkout?plan=lifetime"
              className={cn(
                "inline-flex items-center justify-center rounded-lg bg-brand-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition",
                "hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200",
              )}
            >
              Claim your seat
            </Link>
          )}
        </div>
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-500">
          Processed by Stripe. Refundable within 7 days if you haven&apos;t launched
          the calculator from your account — see{" "}
          <Link href="/legal/refunds" className="underline">
            refund policy
          </Link>
          .
        </p>
      </section>

      {/* Sold-out waitlist */}
      {soldOut && (
        <section aria-labelledby="waitlist-heading">
          <h2 id="waitlist-heading" className="sr-only">
            Lifetime waitlist
          </h2>
          <EmailSignup
            source="lifetime_waitlist"
            headline="Get notified if a seat reopens"
            subline="Refunded Lifetime seats return to the public pool. Drop your email and we'll email the moment one opens up. No other emails."
          />
        </section>
      )}

      {/* What's included */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-xl font-semibold">What&apos;s included</h2>
        <ul className="mt-4 grid gap-3 text-sm text-stone-700 md:grid-cols-2 dark:text-stone-300">
          <li className="flex gap-2">
            <span className="text-brand-700 dark:text-brand-300">✓</span>
            <span>
              <strong className="text-stone-900 dark:text-stone-100">
                Calculator (full Pro tier)
              </strong>{" "}
              — saved presets, batch SKU comparison, CSV export, multi-currency,
              priority email support.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-700 dark:text-brand-300">✓</span>
            <span>
              <strong className="text-stone-900 dark:text-stone-100">
                Excel Profit Template
              </strong>{" "}
              — releasing 2026-07-23. Free for Lifetime, $19 standalone.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-700 dark:text-brand-300">✓</span>
            <span>
              <strong className="text-stone-900 dark:text-stone-100">
                Quarterly Benchmark Report PDF
              </strong>{" "}
              — first issue 2026-08-20, then every quarter. Free for Lifetime, $29
              standalone.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-700 dark:text-brand-300">✓</span>
            <span>
              <strong className="text-stone-900 dark:text-stone-100">
                Every future Pro tool, forever
              </strong>{" "}
              — for the lifetime of the PODProfit product. See{" "}
              <Link href="/faq#q7" className="underline">
                FAQ Q7
              </Link>{" "}
              for the full scope.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-700 dark:text-brand-300">✓</span>
            <span>
              <strong className="text-stone-900 dark:text-stone-100">
                No daily limits
              </strong>{" "}
              — unlimited web calculator and API usage.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-700 dark:text-brand-300">✓</span>
            <span>
              <strong className="text-stone-900 dark:text-stone-100">
                Founding member status
              </strong>{" "}
              — name credit and advisory board option.
            </span>
          </li>
        </ul>
      </section>

      {/* Why 100 seats */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-xl font-semibold">Why 100 seats?</h2>
        <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
          Two reasons. First, rewarding the earliest believers with a small, capped
          cohort. Second, protecting the unit economics of the recurring Pro plan
          that funds ongoing development. Once 100 seats are sold, Lifetime closes
          permanently and only Pro at $9/month remains. The counter on this page
          updates in real time on each successful Stripe purchase.
        </p>
        <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
          Of the 100 total, {FOUNDING_RESERVED} were allocated at $0 to specific
          founding β testers who participated in the pre-launch build phase
          (April–May 2026). The founding cohort is closed; all{" "}
          {FOUNDING_RESERVED} are accounted for. The publicly purchasable count is{" "}
          {capacity - FOUNDING_RESERVED} at launch.
        </p>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          See{" "}
          <Link href="/faq#q8" className="underline">
            FAQ Q8
          </Link>{" "}
          for seat-cap mechanics and{" "}
          <Link href="/faq#q9" className="underline">
            Q9
          </Link>{" "}
          on the founding cohort.
        </p>
      </section>

      {/* Footnotes */}
      <section className="text-sm text-stone-600 dark:text-stone-400">
        <p>
          Compare with monthly Pro on the{" "}
          <Link href="/pricing" className="underline">
            pricing page
          </Link>
          . Full FAQ:{" "}
          <Link href="/faq" className="underline">
            getpodprofit.com/faq
          </Link>
          . Questions? Email{" "}
          <a href="mailto:hello@getpodprofit.com" className="underline">
            hello@getpodprofit.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
