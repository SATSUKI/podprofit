"use client";

import { useMemo, useState } from "react";
import {
  calculateProfit,
} from "@/lib/calculator/calculate-profit";
import {
  ALL_PRODUCTS,
  loadFxRates,
} from "@/lib/calculator/load-products";
import {
  formatCurrency,
  parseDisplayAmount,
} from "@/lib/utils/format-currency";
import { cn } from "@/lib/utils/cn";
import type {
  Currency,
  Marketplace,
  Region,
  Vendor,
} from "@/types/calculator";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
const MARKETPLACES: { value: Marketplace; label: string }[] = [
  { value: "etsy", label: "Etsy" },
  { value: "shopify", label: "Shopify" },
  { value: "amazon-merch", label: "Amazon Merch" },
  { value: "printify-pop-up", label: "Printify Pop-Up" },
  { value: "manual", label: "Manual / direct" },
];
const REGIONS: { value: Region; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "EU", label: "Europe (EU)" },
  { value: "UK", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
];

const FX = loadFxRates();

export function Calculator() {
  const [productId, setProductId] = useState<string>(ALL_PRODUCTS[0].id);
  const [marketplace, setMarketplace] = useState<Marketplace>("etsy");
  const [region, setRegion] = useState<Region>("US");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [retailInput, setRetailInput] = useState<string>("24.00");
  const [includeOffsiteAds, setIncludeOffsiteAds] = useState<boolean>(false);

  const product = useMemo(
    () => ALL_PRODUCTS.find((p) => p.id === productId)!,
    [productId],
  );

  const result = useMemo(() => {
    try {
      return calculateProfit(
        {
          productId: product.id,
          vendor: product.vendor as Vendor,
          marketplace,
          region,
          retailPriceCents: parseDisplayAmount(retailInput, currency),
          displayCurrency: currency,
          includeOffsiteAds,
        },
        product,
        FX,
      );
    } catch {
      return null;
    }
  }, [product, marketplace, region, retailInput, currency, includeOffsiteAds]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Inputs */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-semibold text-brand-800 dark:text-brand-200">
          Your listing
        </h2>
        <div className="mt-4 grid gap-4">
          <Field label="Product">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className={inputCls}
            >
              {ALL_PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.vendor}] {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Marketplace">
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value as Marketplace)}
              className={inputCls}
            >
              {MARKETPLACES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ship to">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className={inputCls}
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Currency">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className={inputCls}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={`Retail price (${currency})`}>
            <input
              type="text"
              inputMode="decimal"
              value={retailInput}
              onChange={(e) => setRetailInput(e.target.value)}
              className={cn(inputCls, "font-mono")}
              placeholder="24.00"
            />
          </Field>

          {marketplace === "etsy" && (
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={includeOffsiteAds}
                onChange={(e) => setIncludeOffsiteAds(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-600"
              />
              Include Etsy offsite ads (12%)
            </label>
          )}
        </div>
      </div>

      {/* Result */}
      <div className="rounded-2xl border border-brand-800/20 bg-brand-50 p-6 shadow-sm dark:border-brand-700/40 dark:bg-brand-900/30">
        {result ? <Result product={product} result={result} currency={currency} /> : null}
      </div>
    </div>
  );
}

function Result({
  product,
  result,
  currency,
}: {
  product: { sourceUrl: string; asOfDate: string };
  result: ReturnType<typeof calculateProfit>;
  currency: Currency;
}) {
  const fmt = (cents: number) => formatCurrency(cents, currency);
  const isProfit = result.netProfitCents > 0;
  return (
    <div>
      <h2 className="text-lg font-semibold text-brand-800 dark:text-brand-200">
        Your real profit
      </h2>

      <div className="mt-4 flex items-baseline gap-3">
        <span
          className={cn(
            "font-mono text-4xl font-bold tabular-nums",
            isProfit ? "text-brand-700 dark:text-brand-300" : "text-red-600 dark:text-red-400",
          )}
        >
          {fmt(result.netProfitCents)}
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            isProfit ? "text-brand-700/70 dark:text-brand-300/70" : "text-red-600/70 dark:text-red-400/70",
          )}
        >
          {result.marginPercent.toFixed(1)}% margin
        </span>
      </div>

      <dl className="mt-6 space-y-2 text-sm">
        <Row label="Retail price" value={fmt(result.retailPriceCents)} positive />
        <Row label="Vendor base cost" value={`− ${fmt(result.vendorBaseCostCents)}`} />
        <Row label="Vendor shipping" value={`− ${fmt(result.vendorShippingCents)}`} />
        {result.marketplaceListingFeeCents > 0 && (
          <Row label="Marketplace listing fee" value={`− ${fmt(result.marketplaceListingFeeCents)}`} />
        )}
        {result.marketplaceTransactionFeeCents > 0 && (
          <Row label="Marketplace transaction fee" value={`− ${fmt(result.marketplaceTransactionFeeCents)}`} />
        )}
        {result.marketplacePerTransactionFeeCents > 0 && (
          <Row label="Per-transaction fee" value={`− ${fmt(result.marketplacePerTransactionFeeCents)}`} />
        )}
        {result.paymentProcessingFeeCents > 0 && (
          <Row label="Payment processing" value={`− ${fmt(result.paymentProcessingFeeCents)}`} />
        )}
        {result.offsiteAdsFeeCents > 0 && (
          <Row label="Etsy offsite ads (12%)" value={`− ${fmt(result.offsiteAdsFeeCents)}`} />
        )}
        <hr className="my-2 border-brand-800/15" />
        <Row label="Total costs" value={fmt(result.totalCostsCents)} bold />
        <Row label="Net profit" value={fmt(result.netProfitCents)} bold positive={isProfit} negative={!isProfit} />
      </dl>

      <p className="mt-6 text-xs text-stone-600 dark:text-stone-400">
        Vendor list price{" "}
        <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          source
        </a>{" "}
        as of {product.asOfDate}. FX as of {result.meta.fxAsOfDate}. Subscription discounts (Printful Plus / Pro,
        Printify Premium) not reflected — verify against your dashboard before listing.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
    </label>
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
        className={cn(
          "font-mono tabular-nums",
          bold && "font-semibold",
          positive && "text-brand-800 dark:text-brand-300",
          negative && "text-red-600 dark:text-red-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";
