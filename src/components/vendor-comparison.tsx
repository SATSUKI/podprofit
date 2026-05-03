"use client";

import { useMemo, useState } from "react";
import { calculateProfit } from "@/lib/calculator/calculate-profit";
import { loadFxRates } from "@/lib/calculator/load-products";
import {
  getProductFamilies,
  type ProductFamily,
} from "@/lib/calculator/product-families";
import {
  formatCurrency,
  parseDisplayAmount,
} from "@/lib/utils/format-currency";
import { cn } from "@/lib/utils/cn";
import type {
  CalculationResult,
  Currency,
  Marketplace,
  Region,
} from "@/types/calculator";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
const MARKETPLACES: { value: Marketplace; label: string }[] = [
  { value: "etsy", label: "Etsy" },
  { value: "shopify", label: "Shopify" },
  { value: "amazon-merch", label: "Amazon Merch" },
  { value: "manual", label: "Manual / direct" },
];
const REGIONS: { value: Region; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "EU", label: "Europe" },
  { value: "UK", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
];

const FX = loadFxRates();
const FAMILIES = getProductFamilies();

export function VendorComparison() {
  const [familyId, setFamilyId] = useState<string>(FAMILIES[0].familyId);
  const [marketplace, setMarketplace] = useState<Marketplace>("etsy");
  const [region, setRegion] = useState<Region>("US");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [retailInput, setRetailInput] = useState<string>("24.00");
  const [includeOffsiteAds, setIncludeOffsiteAds] = useState<boolean>(false);

  const family = useMemo<ProductFamily>(
    () => FAMILIES.find((f) => f.familyId === familyId)!,
    [familyId],
  );

  const printfulResult = useMemo(
    () => safeCalc(family, "printful", marketplace, region, currency, retailInput, includeOffsiteAds),
    [family, marketplace, region, currency, retailInput, includeOffsiteAds],
  );
  const printifyResult = useMemo(
    () => safeCalc(family, "printify", marketplace, region, currency, retailInput, includeOffsiteAds),
    [family, marketplace, region, currency, retailInput, includeOffsiteAds],
  );

  // Determine winner for highlight (only when both succeeded).
  const winner = pickWinner(printfulResult, printifyResult);

  return (
    <div className="space-y-6">
      {/* Shared controls */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-semibold text-brand-800 dark:text-brand-200">
          Compare Printful vs Printify
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Same product, same retail price — see who pays you more, after fees.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Product">
            <select
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className={inputCls}
            >
              {FAMILIES.map((f) => (
                <option key={f.familyId} value={f.familyId}>
                  {f.name}
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
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 md:pt-7">
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

      {/* Side-by-side results */}
      <div className="grid gap-4 md:grid-cols-2">
        <VendorCard
          vendor="Printful"
          result={printfulResult}
          currency={currency}
          isWinner={winner === "printful"}
        />
        <VendorCard
          vendor="Printify"
          result={printifyResult}
          currency={currency}
          isWinner={winner === "printify"}
        />
      </div>

      {/* Diff strip */}
      {printfulResult && printifyResult && (
        <div className="rounded-xl border border-brand-800/20 bg-brand-50 p-4 text-sm dark:border-brand-700/40 dark:bg-brand-900/30">
          <p className="text-brand-800 dark:text-brand-200">
            <strong>{winner === "printful" ? "Printful" : "Printify"} wins this round</strong> by{" "}
            <strong>
              {formatCurrency(
                Math.abs(
                  printfulResult.netProfitCents - printifyResult.netProfitCents,
                ),
                currency,
              )}
            </strong>{" "}
            net profit per sale on this exact configuration. Vendors trade rank by product, so always
            re-check when you list something new.
          </p>
        </div>
      )}
    </div>
  );
}

function safeCalc(
  family: ProductFamily,
  vendor: "printful" | "printify",
  marketplace: Marketplace,
  region: Region,
  currency: Currency,
  retailInput: string,
  includeOffsiteAds: boolean,
): CalculationResult | null {
  const product = family.variants[vendor];
  if (!product) return null;
  try {
    return calculateProfit(
      {
        productId: product.id,
        vendor,
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
}

function pickWinner(
  a: CalculationResult | null,
  b: CalculationResult | null,
): "printful" | "printify" | null {
  if (!a || !b) return null;
  if (a.netProfitCents === b.netProfitCents) return null;
  return a.netProfitCents > b.netProfitCents ? "printful" : "printify";
}

function VendorCard({
  vendor,
  result,
  currency,
  isWinner,
}: {
  vendor: string;
  result: CalculationResult | null;
  currency: Currency;
  isWinner: boolean;
}) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-base font-semibold">{vendor}</h3>
        <p className="mt-2">This product isn&apos;t configured for {vendor} yet.</p>
      </div>
    );
  }
  const fmt = (cents: number) => formatCurrency(cents, currency);
  const isProfit = result.netProfitCents > 0;
  return (
    <div
      className={cn(
        "rounded-2xl border p-6 shadow-sm transition",
        isWinner
          ? "border-brand-800 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30"
          : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{vendor}</h3>
        {isWinner && (
          <span className="rounded-full bg-brand-800 px-2 py-0.5 text-xs font-medium text-white dark:bg-brand-300 dark:text-brand-900">
            More profit
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-3xl font-bold tabular-nums",
            isProfit ? "text-brand-800 dark:text-brand-300" : "text-red-600 dark:text-red-400",
          )}
        >
          {fmt(result.netProfitCents)}
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {result.marginPercent.toFixed(1)}%
        </span>
      </div>
      <dl className="mt-4 space-y-1 text-xs">
        <Row label="Base cost" value={fmt(result.vendorBaseCostCents)} />
        <Row label="Shipping" value={fmt(result.vendorShippingCents)} />
        {result.marketplaceTransactionFeeCents > 0 && (
          <Row label="Marketplace fee" value={fmt(result.marketplaceTransactionFeeCents)} />
        )}
        {result.paymentProcessingFeeCents > 0 && (
          <Row label="Payment processing" value={fmt(result.paymentProcessingFeeCents)} />
        )}
        {result.offsiteAdsFeeCents > 0 && (
          <Row label="Offsite ads" value={fmt(result.offsiteAdsFeeCents)} />
        )}
      </dl>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-stone-600 dark:text-stone-400">
      <dt>{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";
