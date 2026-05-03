import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFamilyById,
  getProductFamilies,
} from "@/lib/calculator/product-families";
import { Calculator } from "@/components/calculator";
import { encodeShareLink } from "@/lib/calculator/share-link";

interface PageProps {
  params: Promise<{ family: string }>;
}

const SITE_URL = "https://getpodprofit.com";

// Pre-render every product family at build time → fast first paint + AIO friendly.
export async function generateStaticParams() {
  return getProductFamilies().map((f) => ({ family: f.familyId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { family } = await params;
  const fam = getFamilyById(family);
  if (!fam) return { title: "Calculator", robots: { index: false } };
  return {
    title: `${fam.name} — Profit calculator (Printful + Printify)`,
    description: `Calculate real profit on ${fam.name} across Printful and Printify, in 6 currencies. Every fee itemized, every price dated. Free, no signup.`,
    alternates: { canonical: `${SITE_URL}/calculator/${fam.familyId}` },
    openGraph: {
      title: `${fam.name} — Profit calculator`,
      description: `Vendor-neutral profit calculator for ${fam.name}.`,
    },
  };
}

export default async function ProductFamilyCalculatorPage({ params }: PageProps) {
  const { family } = await params;
  const fam = getFamilyById(family);
  if (!fam) notFound();

  // Pick a sensible default vendor for the deep-link calculator preset.
  const defaultVendor = fam.variants.printful ? "printful" : "printify";
  const defaultProduct = fam.variants[defaultVendor]!;
  const presetParams = encodeShareLink({
    productId: defaultProduct.id,
    vendor: defaultVendor,
    marketplace: "etsy",
    region: "US",
    currency: "USD",
    retailDisplay: "24.00",
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12 md:py-16">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          {Object.keys(fam.variants).length} vendors · 5 marketplaces · 6 currencies
        </p>
        <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          {fam.name} profit calculator
        </h1>
        <p className="mt-3 max-w-2xl text-stone-700 dark:text-stone-300">
          Free, vendor-neutral profit calculator for{" "}
          <strong>{fam.name}</strong>. Choose your vendor, marketplace, region,
          and retail price — see your real net profit after every fee. No signup
          required.
        </p>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Available on:{" "}
          {Object.entries(fam.variants).map(([vendor, p], i, arr) => (
            <span key={vendor}>
              <strong className="capitalize">{vendor}</strong> (base ${(p.baseCostUsdCents / 100).toFixed(2)} +
              ${(p.shippingUsdCents.US! / 100).toFixed(2)} US ship)
              {i < arr.length - 1 ? "  ·  " : ""}
            </span>
          ))}
        </p>
      </header>

      {/* Deep-link presets so search-engine traffic lands on a pre-configured calc */}
      <section className="rounded-2xl border border-brand-800/20 bg-brand-50 p-6 dark:border-brand-700/40 dark:bg-brand-900/30">
        <h2 className="text-lg font-semibold text-brand-800 dark:text-brand-200">
          Quick presets
        </h2>
        <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
          Jump straight to the most common configurations. Adjust anything once
          loaded.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["etsy", "shopify"] as const).map((m) =>
            (["US", "EU", "UK"] as const).map((r) => {
              const params = encodeShareLink({
                productId: defaultProduct.id,
                vendor: defaultVendor,
                marketplace: m,
                region: r,
                currency: r === "EU" ? "EUR" : r === "UK" ? "GBP" : "USD",
                retailDisplay: "24.00",
              });
              return (
                <Link
                  key={`${m}-${r}`}
                  href={`/?${params.toString()}`}
                  className="rounded-full border border-brand-800/30 bg-white px-3 py-1 text-xs font-medium text-brand-800 hover:bg-brand-50 dark:border-brand-300/40 dark:bg-stone-900 dark:text-brand-300 dark:hover:bg-brand-900/30"
                >
                  {m} · {r}
                </Link>
              );
            }),
          )}
        </div>
      </section>

      {/* Embedded calculator (auto-applies the family default) */}
      <section aria-labelledby="calc-heading">
        <h2 id="calc-heading" className="sr-only">
          Calculator
        </h2>
        <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
          Calculator pre-loaded with <strong>{fam.name}</strong> on{" "}
          <strong>Etsy US, $24 USD retail</strong>. Switch vendor / marketplace
          / currency in the form below.
        </p>
        <Calculator />
        {/* Hidden link that share-link decoder can pick up if user lands cold */}
        <Link href={`/?${presetParams.toString()}`} className="sr-only">
          Apply {fam.name} preset
        </Link>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
        <h2 className="text-lg font-semibold">More calculators</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {getProductFamilies()
            .filter((f) => f.familyId !== fam.familyId)
            .map((f) => (
              <li key={f.familyId}>
                <Link
                  href={`/calculator/${f.familyId}`}
                  className="text-brand-800 hover:underline dark:text-brand-300"
                >
                  → {f.name}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
