import { describe, it, expect } from "vitest";
import { calculateProfit } from "@/lib/calculator/calculate-profit";
import { MARKETPLACE_FEES } from "@/lib/calculator/marketplace-fees";
import { ALL_PRODUCTS, loadFxRates } from "@/lib/calculator/load-products";
import type {
  CalculationInput,
  Currency,
  Marketplace,
  ProductVariant,
  Region,
} from "@/types/calculator";

/**
 * Parametric calculation tests — 240 cases.
 *
 * Coverage matrix:
 *   12 product variants (6 Printful + 6 Printify)
 *   x 5 marketplaces (etsy / shopify / amazon-merch / printify-pop-up / manual)
 *   x 4 currency-region pairs (USD/US, EUR/EU, GBP/UK, JPY/US)
 *   = 240 cases
 *
 * Why parametric (vs the original "72 Excel patterns" CEO half-day plan):
 *   - Zero CEO ops cost — runs in CI (GitHub Actions) on every PR.
 *   - Each case re-derives the expected value from the same itemized formula
 *     the implementation uses, so we catch *structural* logic bugs (e.g. fee
 *     applied to wrong base, FX applied twice, missing rounding) — NOT data
 *     freshness. Data freshness (vendor price drift) is a separate concern
 *     handled by an upcoming vendor-price-drift cron.
 *   - Hand-rolling 240 magic numbers is brittle: every fee table change would
 *     re-write the whole file. Re-deriving keeps tests aligned with the spec.
 *
 * What this test guarantees:
 *   1. No throw for any (product × marketplace × currency × region) combination
 *      in the documented support matrix.
 *   2. Itemized line items follow the published formula exactly (down to the cent).
 *   3. Total = sum of line items (no silent drops).
 *   4. Net = retail - total. Margin = net/retail * 100.
 *   5. FX conversion is applied once, to USD-denominated vendor + fixed fees only.
 *   6. Percentage fees (transaction%, processing%) apply to retail in display ccy.
 */

const FX = loadFxRates();

const MARKETPLACES: Marketplace[] = [
  "etsy",
  "shopify",
  "amazon-merch",
  "printify-pop-up",
  "manual",
];

/**
 * Currency-region pairs we exercise. We pair each currency with a "natural"
 * shipping region so the input is a realistic seller scenario:
 *   - USD seller ships to US
 *   - EUR seller ships to EU
 *   - GBP seller ships to UK
 *   - JPY seller ships to US (Japanese sellers commonly target US buyers via POD)
 *
 * Retail price is calibrated per-currency to a typical "3x markup" zone so the
 * resulting margins are realistic (not all-negative, not absurdly positive).
 */
interface CurrencyScenario {
  currency: Currency;
  region: Region;
  /** Retail price for typical apparel (~$25 zone), in display currency cents. */
  retailApparelCents: number;
  /** Retail price for typical accessory (~$18 zone). */
  retailAccessoryCents: number;
}

const CURRENCY_SCENARIOS: CurrencyScenario[] = [
  { currency: "USD", region: "US", retailApparelCents: 2999, retailAccessoryCents: 1999 },
  { currency: "EUR", region: "EU", retailApparelCents: 2799, retailAccessoryCents: 1899 },
  { currency: "GBP", region: "UK", retailApparelCents: 2499, retailAccessoryCents: 1599 },
  // JPY: 1 yen = 100 sen-equivalent in our integer model. ¥3,800 = 380000 cents.
  { currency: "JPY", region: "US", retailApparelCents: 380_000, retailAccessoryCents: 250_000 },
];

/** Heuristic: which products are "apparel" vs "accessory" for retail calibration. */
function isApparel(product: ProductVariant): boolean {
  return (
    product.id.includes("tee") ||
    product.id.includes("sweatshirt") ||
    product.id.includes("hoodie")
  );
}

/**
 * Re-derive the expected breakdown from the same formula calculate-profit.ts uses.
 * If this drifts from the implementation, that IS the test failure we want.
 */
function expectedBreakdown(
  input: CalculationInput,
  product: ProductVariant,
): {
  vendorBaseCostCents: number;
  vendorShippingCents: number;
  marketplaceListingFeeCents: number;
  marketplaceTransactionFeeCents: number;
  marketplacePerTransactionFeeCents: number;
  paymentProcessingFeeCents: number;
  offsiteAdsFeeCents: number;
  totalCostsCents: number;
  netProfitCents: number;
  marginPercent: number;
} {
  const fees = MARKETPLACE_FEES[input.marketplace];
  const fxRate = FX.rates[input.displayCurrency];
  const shippingUsd = product.shippingUsdCents[input.region]!;

  const round = (n: number) => Math.round(n);

  const vendorBaseCostCents = round(product.baseCostUsdCents * fxRate);
  const vendorShippingCents = round(shippingUsd * fxRate);
  const marketplaceListingFeeCents = round(fees.listingFeeUsdCents * fxRate);
  const marketplacePerTransactionFeeCents = round(
    fees.perTransactionFeeUsdCents * fxRate,
  );
  const marketplaceTransactionFeeCents = round(
    input.retailPriceCents * fees.transactionFeeRate,
  );
  const paymentProcessingFeeCents = round(
    input.retailPriceCents * fees.paymentProcessingRate,
  );
  const offsiteAdsFeeCents =
    input.includeOffsiteAds && fees.offsiteAdsRate
      ? round(input.retailPriceCents * fees.offsiteAdsRate)
      : 0;

  const totalCostsCents =
    vendorBaseCostCents +
    vendorShippingCents +
    marketplaceListingFeeCents +
    marketplaceTransactionFeeCents +
    marketplacePerTransactionFeeCents +
    paymentProcessingFeeCents +
    offsiteAdsFeeCents;

  const netProfitCents = input.retailPriceCents - totalCostsCents;
  const marginPercent =
    input.retailPriceCents === 0 ? 0 : (netProfitCents / input.retailPriceCents) * 100;

  return {
    vendorBaseCostCents,
    vendorShippingCents,
    marketplaceListingFeeCents,
    marketplaceTransactionFeeCents,
    marketplacePerTransactionFeeCents,
    paymentProcessingFeeCents,
    offsiteAdsFeeCents,
    totalCostsCents,
    netProfitCents,
    marginPercent,
  };
}

interface Case {
  product: ProductVariant;
  marketplace: Marketplace;
  scenario: CurrencyScenario;
  retailPriceCents: number;
  caseName: string;
}

function buildCases(): Case[] {
  const cases: Case[] = [];
  for (const product of ALL_PRODUCTS) {
    for (const marketplace of MARKETPLACES) {
      for (const scenario of CURRENCY_SCENARIOS) {
        // Skip combos with no shipping defined for the region (defensive — current
        // catalog defines all 5 regions for every product, but be future-proof).
        if (product.shippingUsdCents[scenario.region] === undefined) continue;
        const retailPriceCents = isApparel(product)
          ? scenario.retailApparelCents
          : scenario.retailAccessoryCents;
        cases.push({
          product,
          marketplace,
          scenario,
          retailPriceCents,
          caseName: `${product.id} × ${marketplace} × ${scenario.currency}/${scenario.region} @ retail=${retailPriceCents}`,
        });
      }
    }
  }
  return cases;
}

const CASES = buildCases();

describe("calculateProfit — parametric matrix (240 cases)", () => {
  it("generates the expected number of cases (sanity check on the matrix)", () => {
    // 12 products × 5 marketplaces × 4 currency scenarios = 240
    expect(CASES.length).toBe(240);
  });

  describe.each(CASES)(
    "$caseName",
    ({ product, marketplace, scenario, retailPriceCents }) => {
      const input: CalculationInput = {
        productId: product.id,
        vendor: product.vendor,
        marketplace,
        region: scenario.region,
        retailPriceCents,
        displayCurrency: scenario.currency,
        includeOffsiteAds: false,
      };

      const expected = expectedBreakdown(input, product);
      const r = calculateProfit(input, product, FX);

      it("vendor base cost matches USD→display conversion", () => {
        expect(r.vendorBaseCostCents).toBe(expected.vendorBaseCostCents);
      });

      it("vendor shipping matches USD→display conversion for the region", () => {
        expect(r.vendorShippingCents).toBe(expected.vendorShippingCents);
      });

      it("marketplace fixed fees (listing + per-transaction) match USD→display conversion", () => {
        expect(r.marketplaceListingFeeCents).toBe(expected.marketplaceListingFeeCents);
        expect(r.marketplacePerTransactionFeeCents).toBe(
          expected.marketplacePerTransactionFeeCents,
        );
      });

      it("percentage fees (transaction% + payment%) apply to retail in display currency", () => {
        expect(r.marketplaceTransactionFeeCents).toBe(
          expected.marketplaceTransactionFeeCents,
        );
        expect(r.paymentProcessingFeeCents).toBe(expected.paymentProcessingFeeCents);
      });

      it("offsite ads = 0 when not requested", () => {
        expect(r.offsiteAdsFeeCents).toBe(0);
      });

      it("total = sum of all line items (no silent drops)", () => {
        expect(r.totalCostsCents).toBe(expected.totalCostsCents);
      });

      it("net = retail - total, margin = net/retail*100", () => {
        expect(r.netProfitCents).toBe(expected.netProfitCents);
        expect(r.marginPercent).toBeCloseTo(expected.marginPercent, 6);
      });
    },
  );
});

/**
 * Offsite-ads variant — Etsy only (it's the only marketplace with an
 * offsiteAdsRate). 12 products × 4 currency scenarios = 48 extra cases.
 *
 * Validates the conditional fee path: includeOffsiteAds=true on Etsy must add
 * 12% of retail; on marketplaces with no offsiteAdsRate it must remain 0.
 */
describe("calculateProfit — offsite ads variant (Etsy only, 48 cases)", () => {
  const ETSY_CASES: Case[] = CASES.filter((c) => c.marketplace === "etsy");

  it("generates the expected number of Etsy cases", () => {
    expect(ETSY_CASES.length).toBe(48);
  });

  describe.each(ETSY_CASES)(
    "[ads] $caseName",
    ({ product, marketplace, scenario, retailPriceCents }) => {
      const input: CalculationInput = {
        productId: product.id,
        vendor: product.vendor,
        marketplace,
        region: scenario.region,
        retailPriceCents,
        displayCurrency: scenario.currency,
        includeOffsiteAds: true,
      };

      const expected = expectedBreakdown(input, product);
      const r = calculateProfit(input, product, FX);

      it("offsite ads = 12% of retail (Etsy default rate)", () => {
        expect(r.offsiteAdsFeeCents).toBe(Math.round(retailPriceCents * 0.12));
        expect(r.offsiteAdsFeeCents).toBe(expected.offsiteAdsFeeCents);
      });

      it("net profit decreases by exactly the ads fee vs the no-ads case", () => {
        const noAds = calculateProfit(
          { ...input, includeOffsiteAds: false },
          product,
          FX,
        );
        expect(noAds.netProfitCents - r.netProfitCents).toBe(r.offsiteAdsFeeCents);
      });

      it("total includes offsite ads", () => {
        expect(r.totalCostsCents).toBe(expected.totalCostsCents);
      });
    },
  );
});

/**
 * Non-Etsy marketplaces ignore includeOffsiteAds even when set true (no
 * offsiteAdsRate defined). Quick guard against accidentally charging ads
 * on Shopify/manual etc.
 */
describe("calculateProfit — non-Etsy marketplaces never charge offsite ads", () => {
  const NON_ETSY_CASES = CASES.filter((c) => c.marketplace !== "etsy");

  it.each(NON_ETSY_CASES)(
    "$caseName: offsite ads = 0 even with includeOffsiteAds=true",
    ({ product, marketplace, scenario, retailPriceCents }) => {
      const input: CalculationInput = {
        productId: product.id,
        vendor: product.vendor,
        marketplace,
        region: scenario.region,
        retailPriceCents,
        displayCurrency: scenario.currency,
        includeOffsiteAds: true,
      };
      const r = calculateProfit(input, product, FX);
      expect(r.offsiteAdsFeeCents).toBe(0);
    },
  );
});
