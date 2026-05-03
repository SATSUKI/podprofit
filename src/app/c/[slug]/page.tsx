import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { calculateProfit } from "@/lib/calculator/calculate-profit";
import {
  getProductById,
  loadFxRates,
} from "@/lib/calculator/load-products";
import { formatCurrency } from "@/lib/utils/format-currency";
import { createServerSupabase } from "@/lib/supabase/server";
import { encodeShareLink } from "@/lib/calculator/share-link";
import type {
  CalculationInput,
  CalculationResult,
} from "@/types/calculator";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface SavedCalculation {
  share_slug: string;
  input_json: CalculationInput;
  output_json: CalculationResult;
  view_count: number;
  created_at: string;
}

async function loadShare(slug: string): Promise<SavedCalculation | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("calculations")
      .select("share_slug, input_json, output_json, view_count, created_at")
      .eq("share_slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    // Fire-and-forget view counter increment.
    void supabase.rpc("fn_increment_share_view", { p_share_slug: slug });
    return data as SavedCalculation;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const share = await loadShare(slug);
  if (!share) {
    return {
      title: "Shared calculation",
      robots: { index: false, follow: false },
    };
  }
  const input = share.input_json;
  const output = share.output_json;
  const headline = formatCurrency(output.netProfitCents, input.displayCurrency);
  const ogParams = encodeShareLink({
    productId: input.productId,
    vendor: input.vendor,
    marketplace: input.marketplace,
    region: input.region,
    currency: input.displayCurrency,
    retailDisplay: (input.retailPriceCents / 100).toFixed(2),
    includeOffsiteAds: input.includeOffsiteAds,
  }).toString();
  const ogUrl = `/api/og?${ogParams}`;
  return {
    title: `${headline} net profit · PODProfit calculation`,
    description: `Real Print-on-Demand profit on ${input.marketplace.toUpperCase()} (${input.region}), calculated with vendor list prices and itemized fees. Open the calculator to run your own.`,
    openGraph: {
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogUrl],
    },
    robots: { index: true, follow: true },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { slug } = await params;
  const share = await loadShare(slug);
  if (!share) notFound();

  const product = getProductById(share.input_json.productId);
  // Recompute against current FX & price tables so the page always reflects
  // the latest costs, not the costs at save-time. This is intentional: if a
  // POD vendor lowers their price, the saved calculation should improve.
  const fx = loadFxRates();
  let recomputed: CalculationResult | null = null;
  if (product) {
    try {
      recomputed = calculateProfit(share.input_json, product, fx);
    } catch {
      recomputed = null;
    }
  }

  const result = recomputed ?? share.output_json;
  const input = share.input_json;
  const fmt = (cents: number) => formatCurrency(cents, input.displayCurrency);
  const isProfit = result.netProfitCents > 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
          Shared calculation
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {fmt(result.netProfitCents)} net profit
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {product?.name ?? "Unknown product"} · {input.marketplace.toUpperCase()} ·{" "}
          {input.region} · {input.displayCurrency} · {result.marginPercent.toFixed(1)}% margin
        </p>
      </header>

      <section className="rounded-2xl border border-brand-800/20 bg-brand-50 p-6 dark:border-brand-700/40 dark:bg-brand-900/30">
        <dl className="space-y-2 text-sm">
          <Row label="Retail price" value={fmt(result.retailPriceCents)} />
          <Row label="Vendor base cost" value={`− ${fmt(result.vendorBaseCostCents)}`} />
          <Row label="Vendor shipping" value={`− ${fmt(result.vendorShippingCents)}`} />
          {result.marketplaceListingFeeCents > 0 && (
            <Row
              label="Marketplace listing fee"
              value={`− ${fmt(result.marketplaceListingFeeCents)}`}
            />
          )}
          {result.marketplaceTransactionFeeCents > 0 && (
            <Row
              label="Marketplace transaction fee"
              value={`− ${fmt(result.marketplaceTransactionFeeCents)}`}
            />
          )}
          {result.marketplacePerTransactionFeeCents > 0 && (
            <Row
              label="Per-transaction fee"
              value={`− ${fmt(result.marketplacePerTransactionFeeCents)}`}
            />
          )}
          {result.paymentProcessingFeeCents > 0 && (
            <Row
              label="Payment processing"
              value={`− ${fmt(result.paymentProcessingFeeCents)}`}
            />
          )}
          {result.offsiteAdsFeeCents > 0 && (
            <Row label="Etsy offsite ads (12%)" value={`− ${fmt(result.offsiteAdsFeeCents)}`} />
          )}
          <hr className="my-2 border-brand-800/15" />
          <Row label="Total costs" value={fmt(result.totalCostsCents)} bold />
          <Row
            label="Net profit"
            value={fmt(result.netProfitCents)}
            bold
            positive={isProfit}
            negative={!isProfit}
          />
        </dl>

        {recomputed && (
          <p className="mt-6 text-xs text-stone-600 dark:text-stone-400">
            Recomputed against current vendor list prices and FX (
            {result.meta.fxAsOfDate}). Numbers may differ from when this was originally saved.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
        <p>
          {share.view_count.toLocaleString()} views · saved{" "}
          {new Date(share.created_at).toLocaleDateString()}.
        </p>
        <p className="mt-3">
          <Link
            href={`/?${encodeShareLink({
              productId: input.productId,
              vendor: input.vendor,
              marketplace: input.marketplace,
              region: input.region,
              currency: input.displayCurrency,
              retailDisplay: (input.retailPriceCents / 100).toFixed(2),
              includeOffsiteAds: input.includeOffsiteAds,
            }).toString()}`}
            className="font-medium text-brand-800 underline dark:text-brand-300"
          >
            Open in the calculator →
          </Link>{" "}
          and adjust any input.
        </p>
      </section>
    </main>
  );
}

function Row({
  label,
  value,
  bold,
  positive,
  negative,
}: {
  label: string;
  value: string;
  bold?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-stone-700 dark:text-stone-300">{label}</dt>
      <dd
        className={[
          "font-mono tabular-nums",
          bold ? "font-semibold" : "",
          positive ? "text-brand-800 dark:text-brand-300" : "",
          negative ? "text-red-600 dark:text-red-400" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
