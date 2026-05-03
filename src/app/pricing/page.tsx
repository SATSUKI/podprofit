import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_CATALOG } from "@/lib/stripe/products";
import { getLifetimeClaimedCount } from "@/lib/lifetime/get-claimed";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Pricing — Free, Pro, Lifetime",
  description:
    "Free forever calculator. Pro plans for power users. Lifetime access for the first 100 founding customers.",
  openGraph: {
    title: "PODProfit Pricing — Free, Pro, Lifetime",
    description:
      "Free forever calculator. Pro plans for power users. Lifetime access for the first 100 founding customers.",
  },
};

// Revalidate the Lifetime counter every 60 seconds.
export const revalidate = 60;

export default async function PricingPage() {
  const claimed = await getLifetimeClaimedCount();
  const lifetime = PLAN_CATALOG.lifetime;
  const remaining = (lifetime.capacity ?? 100) - claimed;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12 md:py-20">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          Pricing
        </p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Honest pricing for an honest calculator.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-stone-700 dark:text-stone-300">
          The calculator is free forever — no signup, no rate limit. Pro and Lifetime
          unlock saved history, exports, and direct support for power users.
        </p>
      </header>

      <section
        aria-label="Plans"
        className="grid gap-4 md:grid-cols-3"
      >
        <PlanCard
          name="Free"
          price="$0"
          tagline="Forever. No signup."
          features={[
            "Full calculator (all products, vendors, currencies)",
            "Vendor side-by-side comparison",
            "Share-able URLs with dynamic preview images",
            "No account, no rate limit",
          ]}
        />
        <PlanCard
          name={PLAN_CATALOG.pro_monthly.name}
          price={PLAN_CATALOG.pro_monthly.displayPrice}
          tagline={PLAN_CATALOG.pro_monthly.tagline}
          features={PLAN_CATALOG.pro_monthly.features}
          ctaHref={`/api/stripe/checkout?plan=pro_monthly`}
          ctaLabel="Start Pro Monthly"
        />
        <PlanCard
          name={PLAN_CATALOG.lifetime.name}
          price={PLAN_CATALOG.lifetime.displayPrice}
          tagline={`${remaining} of ${lifetime.capacity} seats remaining.`}
          features={PLAN_CATALOG.lifetime.features}
          ctaHref={`/api/stripe/checkout?plan=lifetime`}
          ctaLabel={remaining > 0 ? "Claim Lifetime" : "Sold out"}
          ctaDisabled={remaining <= 0}
          highlighted
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-semibold">Pro Annual: $79/yr</h2>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          Same as Pro Monthly, billed yearly. Save $29 vs monthly. Lock in your price for 12 months.
        </p>
        <Link
          href="/api/stripe/checkout?plan=pro_yearly"
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-brand-800 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-300 dark:hover:bg-brand-900/20"
        >
          Switch to annual billing
        </Link>
      </section>

      <section className="text-sm text-stone-600 dark:text-stone-400">
        <p>
          All plans support automatic tax calculation. Refunds available within 14 days
          (annual / Lifetime). See <Link href="/legal/refunds" className="underline">refund policy</Link>.
        </p>
      </section>
    </main>
  );
}

function PlanCard({
  name,
  price,
  tagline,
  features,
  ctaHref,
  ctaLabel,
  ctaDisabled,
  highlighted,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  ctaHref?: string;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  highlighted?: boolean;
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
      <p className="mt-3 text-3xl font-bold tabular-nums">{price}</p>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{tagline}</p>
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
          <span className="mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-stone-300 px-4 py-2 text-sm font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-400">
            {ctaLabel}
          </span>
        ) : (
          <Link
            href={ctaHref}
            className={cn(
              "mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition",
              highlighted
                ? "bg-brand-800 text-white hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
                : "border border-brand-800 text-brand-800 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-300 dark:hover:bg-brand-900/20",
            )}
          >
            {ctaLabel}
          </Link>
        )
      ) : (
        <span className="mt-6 text-center text-xs text-stone-500 dark:text-stone-500">
          No signup required
        </span>
      )}
    </div>
  );
}
