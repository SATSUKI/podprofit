"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  decodeShareLink,
  encodeShareLink,
} from "@/lib/calculator/share-link";
import { cn } from "@/lib/utils/cn";
import {
  DAILY_LIMIT,
  increment as incrementDailyLimit,
  readState as readDailyLimitState,
  type DailyLimitState,
} from "@/lib/calculator/daily-limit";
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
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "auth_required" | "limit" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Refund-eligibility access log (Task 19 / Terms §7.1):
  //   The Refunds page promises "0 calculator launches verified by access
  //   logs" as a Lifetime refund precondition. We fire a single fact-of-
  //   launch beacon on the first successful calculation in this session.
  //   Anonymous users are skipped server-side (they have no purchase to
  //   gate). Calculator inputs are NEVER sent — the body is empty.
  const launchTrackedRef = useRef(false);

  // Free-tier daily limit (Task 5 / launch announcement v2: 50 calcs /
  // day per browser). Pro & Lifetime users bypass — we resolve the
  // tier on mount via /api/me/plan. While the tier is unknown we
  // *optimistically* treat the user as free (worst case: a paid user
  // briefly sees the remaining-calculations banner).
  const [tier, setTier] = useState<"unknown" | "free" | "pro" | "lifetime">(
    "unknown",
  );
  const [dailyState, setDailyState] = useState<DailyLimitState>({
    count: 0,
    blocked: false,
    remaining: DAILY_LIMIT,
  });
  // false when localStorage is unavailable (Safari private mode, locked
  // down browsers); we then skip the cap entirely (per task spec).
  // Tracked as state (not a ref) so render reads are React-pure.
  const [storageAvailable, setStorageAvailable] = useState<boolean>(false);
  // Guard against double-counting: this is the same trigger as the
  // refund-log beacon (first parseable result in this session), so we
  // pin the increment to the same one-shot ref.
  const dailyIncrementedRef = useRef(false);

  // Hydrate from share-link URL params (one-shot, on mount).
  // The set-state-in-effect lint rule fires on each setState call here because
  // we batch-apply multiple URL-derived defaults; the alternative
  // (useSyncExternalStore for URL state) is heavier than the benefit and the
  // URL never changes after mount on this page.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const decoded = decodeShareLink(window.location.search.replace(/^\?/, ""));
    if (decoded.productId && ALL_PRODUCTS.some((p) => p.id === decoded.productId)) {
      setProductId(decoded.productId);
    }
    if (decoded.marketplace) setMarketplace(decoded.marketplace);
    if (decoded.region) setRegion(decoded.region);
    if (decoded.currency) setCurrency(decoded.currency);
    if (decoded.retailDisplay) setRetailInput(decoded.retailDisplay);
    if (decoded.includeOffsiteAds !== undefined) setIncludeOffsiteAds(decoded.includeOffsiteAds);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Probe localStorage on mount + read today's count. If the probe
  // throws (Safari private mode, restrictive browser policies, quota
  // exceeded), the daily cap is silently skipped — exactly the
  // documented Edge-case behaviour for Task 5.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const probeKey = "pp_calc_storage_probe";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      setStorageAvailable(true);
      setDailyState(readDailyLimitState(window.localStorage));
    } catch (err) {
      // Don't surface — keep the calculator usable. Use console.warn so
      // it's visible to support without polluting error trackers.
      console.warn(
        "[calculator] localStorage unavailable; daily limit disabled",
        err,
      );
      setStorageAvailable(false);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Resolve the user's plan tier. Failure → fall back to "free" (the
  // safe default — paid users are minor in the early-launch window and
  // a transient API blip costs them at most one banner appearance).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/plan", { method: "GET", credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled) return;
        const t = body && typeof body === "object" ? (body as { tier?: string }).tier : null;
        if (t === "pro" || t === "lifetime") {
          setTier(t);
        } else {
          setTier("free");
        }
      })
      .catch(() => {
        if (!cancelled) setTier("free");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Paid tiers (Pro / Lifetime) bypass the daily cap entirely.
  const dailyLimitBypassed =
    tier === "pro" || tier === "lifetime" || !storageAvailable;

  // Fire the launch beacon once per session, the first time a valid result
  // is produced (i.e., the user has typed a parseable retail price). We
  // dedupe across page navigations within the same tab via sessionStorage
  // so reloading the page in the middle of a session doesn't pile rows
  // up. The fetch is fire-and-forget; failures are intentionally silent
  // (we don't want a tracking error to surface in the calculator UI).
  //
  // The same trigger increments the free-tier daily-limit counter (Task
  // 5). We deliberately use ONE shared trigger so the two counters stay
  // in lockstep — see `dailyIncrementedRef` for the dedupe guard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (launchTrackedRef.current) return;
    if (!result) return;

    const SENTINEL_KEY = "podprofit:calc-launch-tracked";
    try {
      if (window.sessionStorage.getItem(SENTINEL_KEY) === "1") {
        launchTrackedRef.current = true;
        return;
      }
      window.sessionStorage.setItem(SENTINEL_KEY, "1");
    } catch {
      // sessionStorage blocked (rare; e.g., Safari private mode pre-15) —
      // proceed but mark as tracked so we don't loop.
    }
    launchTrackedRef.current = true;

    void fetch("/api/track/calculator-launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Empty body — calculator inputs MUST NOT be sent (Privacy §2.2).
      body: "{}",
      keepalive: true,
    }).catch(() => {
      /* fire-and-forget */
    });
  }, [result]);

  // Increment the per-day local counter on the FIRST result of a
  // session. Bypassed for paid tiers and when localStorage is
  // unavailable (Edge-case: Safari private mode). This ref guards
  // against double-counting if `result` flickers (e.g., the user edits
  // retail to invalid then back to valid — second pass should not
  // double-charge them).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (dailyIncrementedRef.current) return;
    if (!result) return;
    if (dailyLimitBypassed) return;
    if (tier === "unknown") return; // wait for the plan to resolve once
    if (!storageAvailable) return;

    dailyIncrementedRef.current = true;
    try {
      const next = incrementDailyLimit(window.localStorage);
      setDailyState(next);
    } catch (err) {
      // Quota exceeded mid-session: stop trying to count, but keep the
      // calculator usable. The contract is fail-open (skip the cap).
      console.warn(
        "[calculator] localStorage write failed; daily limit disabled",
        err,
      );
      setStorageAvailable(false);
    }
  }, [result, tier, dailyLimitBypassed, storageAvailable]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        {result && !dailyLimitBypassed && dailyState.blocked ? (
          <DailyLimitBanner count={dailyState.count} />
        ) : result ? (
          <>
            <Result product={product} result={result} currency={currency} />
            <button
              type="button"
              onClick={() => {
                const params = encodeShareLink({
                  productId: product.id,
                  vendor: product.vendor as Vendor,
                  marketplace,
                  region,
                  currency,
                  retailDisplay: retailInput,
                  includeOffsiteAds,
                });
                const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                navigator.clipboard
                  .writeText(url)
                  .then(() => {
                    setCopyState("copied");
                    setTimeout(() => setCopyState("idle"), 2000);
                  })
                  .catch(() => {
                    /* clipboard blocked: ignore silently */
                  });
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
            >
              {copyState === "copied" ? "✓ Link copied" : "Copy share link"}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (saveState === "saving" || saveState === "saved") return;
                setSaveState("saving");
                setSaveError(null);
                try {
                  const res = await fetch("/api/calculations/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      input: {
                        productId: product.id,
                        vendor: product.vendor,
                        marketplace,
                        region,
                        retailPriceCents: result.retailPriceCents,
                        displayCurrency: currency,
                        includeOffsiteAds,
                      },
                      output: {
                        netProfitCents: result.netProfitCents,
                        marginPercent: result.marginPercent,
                        totalCostsCents: result.totalCostsCents,
                      },
                    }),
                  });
                  if (res.status === 401) {
                    setSaveState("auth_required");
                    return;
                  }
                  if (res.status === 402) {
                    setSaveState("limit");
                    return;
                  }
                  if (!res.ok) {
                    const body = (await res.json().catch(() => ({}))) as {
                      error?: string;
                    };
                    setSaveError(body.error ?? "Save failed");
                    setSaveState("error");
                    return;
                  }
                  setSaveState("saved");
                  setTimeout(() => setSaveState("idle"), 3000);
                } catch (err) {
                  setSaveError(err instanceof Error ? err.message : "Save failed");
                  setSaveState("error");
                }
              }}
              className="ml-2 mt-6 inline-flex items-center gap-2 rounded-lg border border-brand-800 px-4 py-2 text-sm font-medium text-brand-800 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-700 dark:border-brand-300 dark:text-brand-300 dark:hover:bg-brand-900/20"
            >
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "✓ Saved to your account"}
              {saveState === "auth_required" && (
                <a href="/login" className="underline">
                  Sign in to save
                </a>
              )}
              {saveState === "limit" && (
                <a href="/pricing" className="underline">
                  Upgrade to Pro to save more
                </a>
              )}
              {(saveState === "idle" || saveState === "error") && "Save calculation"}
            </button>
            {saveState === "error" && saveError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {saveError}
              </p>
            )}
          </>
        ) : null}
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

function DailyLimitBanner({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-start gap-3" role="status" aria-live="polite">
      <h2 className="text-lg font-semibold text-brand-800 dark:text-brand-200">
        Daily limit reached
      </h2>
      <p className="text-sm text-stone-700 dark:text-stone-300">
        You have used all {DAILY_LIMIT} free calculations available to your
        browser today (used: {count}). The counter resets at midnight in your
        local time zone.
      </p>
      <p className="text-sm text-stone-700 dark:text-stone-300">
        Sign up for free — no daily limit, save calculations to your account,
        and unlock the full history view.
      </p>
      <a
        href="/signup"
        className="inline-flex items-center gap-2 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
      >
        Sign up free → no daily limit
      </a>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        The Calculate button is disabled until tomorrow. The cap is per
        browser; signing up removes it on every device you sign in to.
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
