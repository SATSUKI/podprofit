import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_CATALOG } from "@/lib/stripe/products";
import { getLifetimeClaimedCount } from "@/lib/lifetime/get-claimed";
import { EmailSignup } from "@/components/email-signup";
import { cn } from "@/lib/utils/cn";

const PRO_AVAILABLE_DATE = "June 9, 2026";

export const metadata: Metadata = {
  title: "Pricing — Free, Pro Monthly, Pro Annual, Lifetime",
  description:
    "Free forever calculator. Pro Monthly $9 USD/month and Pro Annual $79 USD/year available June 9, 2026. Lifetime $149 (one-time) — limited to 100 seats, available now.",
  openGraph: {
    title: "PODProfit Pricing — Free, Pro Monthly, Pro Annual, Lifetime",
    description:
      "Free forever calculator. Pro Monthly $9 USD/month and Pro Annual $79 USD/year available June 9, 2026. Lifetime $149 (one-time) — limited to 100 seats, available now.",
  },
};

// Revalidate the Lifetime counter every 60 seconds.
export const revalidate = 60;

export default async function PricingPage() {
  const claimed = await getLifetimeClaimedCount();
  const lifetime = PLAN_CATALOG.lifetime;
  const remaining = (lifetime.capacity ?? 100) - claimed;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-12 md:py-20">
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
          availability={`Available from ${PRO_AVAILABLE_DATE}`}
          tagline="Cancel anytime."
          features={[
            "Everything in Free, forever",
            "Save unlimited calculations",
            "CSV export of calculation history",
            "Pause subscription up to 3 months",
            "Email support",
          ]}
          ctaHref="#notify-pro"
          ctaLabel="Notify me when available"
          ctaVariant="outline"
        />
        <PlanCard
          name="Pro Annual"
          price="$79 USD"
          priceUnit="/ year"
          availability={`Available from ${PRO_AVAILABLE_DATE}`}
          tagline="Save $29 vs monthly. Lock in 12 months."
          features={[
            "Everything in Pro Monthly",
            "Annual billing — pay yearly, save 27%",
            "Locked-in pricing for 12 months",
            "Email support",
          ]}
          ctaHref="#notify-pro"
          ctaLabel="Notify me when available"
          ctaVariant="outline"
        />
        <PlanCard
          name="Lifetime"
          price="$149 USD"
          priceUnit="one-time"
          availability={
            remaining > 0
              ? `Available now — ${remaining} of ${lifetime.capacity} seats remaining`
              : "All seats claimed"
          }
          tagline="Limited to first 100 customers."
          features={[
            "Everything in Pro, forever",
            "All future features included (Phase 2 + beyond)",
            "Founding member status — name credit",
            "One-time payment, no subscription",
          ]}
          ctaHref={remaining > 0 ? "/lifetime" : undefined}
          ctaLabel={remaining > 0 ? "Reserve seat" : "Sold out"}
          ctaDisabled={remaining <= 0}
          ctaVariant="solid"
          highlighted
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
          and collected automatically at checkout via Stripe Tax. Refunds
          available within 14 days (Pro Annual / Lifetime). See{" "}
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
          <span className="mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-stone-300 px-4 py-2 text-sm font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-400">
            {ctaLabel}
          </span>
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
    </div>
  );
}
