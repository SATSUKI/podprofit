import { describe, it, expect } from "vitest";
import { calculateProfit } from "@/lib/calculator/calculate-profit";
import type { ProductVariant, FxRates, CalculationInput } from "@/types/calculator";

const usdAt1 = (): FxRates => ({
  asOfDate: "2026-04-30",
  rates: { USD: 1, EUR: 0.93, GBP: 0.79, CAD: 1.37, AUD: 1.53, JPY: 153.0 },
});

const bellaCanvas3001 = (): ProductVariant => ({
  id: "printful-bella-canvas-3001-tee-white-m",
  vendor: "printful",
  name: "Bella+Canvas 3001 unisex t-shirt (white, M)",
  baseCostUsdCents: 1295,
  shippingUsdCents: { US: 499, EU: 699, UK: 699, CA: 599, AU: 999 },
  sourceUrl: "https://www.printful.com/custom-products/t-shirts",
  asOfDate: "2026-04-28",
});

describe("calculateProfit", () => {
  it("computes positive profit for a typical Etsy US listing in USD", () => {
    const product = bellaCanvas3001();
    const fx = usdAt1();
    const input: CalculationInput = {
      productId: product.id,
      vendor: "printful",
      marketplace: "etsy",
      region: "US",
      retailPriceCents: 2400, // $24.00
      displayCurrency: "USD",
      includeOffsiteAds: false,
    };
    const r = calculateProfit(input, product, fx);
    // Vendor: $12.95 + $4.99 ship = $17.94
    // Etsy: $0.20 + 6.5% × $24 = $1.56 + $0.25 + 3% × $24 = $0.72  → $2.73
    // Total: $20.67  → Net: $3.33  → Margin ~ 13.9%
    expect(r.vendorBaseCostCents).toBe(1295);
    expect(r.vendorShippingCents).toBe(499);
    expect(r.marketplaceListingFeeCents).toBe(20);
    expect(r.marketplaceTransactionFeeCents).toBe(156);
    expect(r.marketplacePerTransactionFeeCents).toBe(25);
    expect(r.paymentProcessingFeeCents).toBe(72);
    expect(r.offsiteAdsFeeCents).toBe(0);
    expect(r.totalCostsCents).toBe(1295 + 499 + 20 + 156 + 25 + 72);
    expect(r.netProfitCents).toBe(2400 - r.totalCostsCents);
    expect(r.marginPercent).toBeCloseTo((r.netProfitCents / 2400) * 100, 1);
  });

  it("includes offsite ads fee when requested", () => {
    const product = bellaCanvas3001();
    const fx = usdAt1();
    const input: CalculationInput = {
      productId: product.id,
      vendor: "printful",
      marketplace: "etsy",
      region: "US",
      retailPriceCents: 2400,
      displayCurrency: "USD",
      includeOffsiteAds: true,
    };
    const r = calculateProfit(input, product, fx);
    // Offsite ads = 12% × $24 = $2.88
    expect(r.offsiteAdsFeeCents).toBe(288);
    // Without ads: net = $3.33; with ads: net = $0.45 (margin ~ 1.9% — terrible)
    const baselineWithoutAds = 2400 - (1295 + 499 + 20 + 156 + 25 + 72);
    expect(r.netProfitCents).toBe(baselineWithoutAds - 288);
    expect(r.marginPercent).toBeLessThan(2); // razor-thin
  });

  it("converts to JPY correctly when display currency is JPY", () => {
    const product = bellaCanvas3001();
    const fx = usdAt1();
    const input: CalculationInput = {
      productId: product.id,
      vendor: "printful",
      marketplace: "shopify",
      region: "US",
      retailPriceCents: 360_000, // ¥3,600
      displayCurrency: "JPY",
      includeOffsiteAds: false,
    };
    const r = calculateProfit(input, product, fx);
    // Vendor base $12.95 × 153 = ¥1,981.35 → 1981 sen (rounded)
    expect(r.vendorBaseCostCents).toBe(Math.round(1295 * 153));
    expect(r.vendorShippingCents).toBe(Math.round(499 * 153));
    // Shopify: 2.9% × ¥3,600 = ¥104.4 → 104 sen
    expect(r.paymentProcessingFeeCents).toBe(Math.round(360_000 * 0.029));
    expect(r.marketplaceListingFeeCents).toBe(0);
  });

  it("throws on vendor mismatch", () => {
    const product = bellaCanvas3001();
    const fx = usdAt1();
    const input: CalculationInput = {
      productId: product.id,
      vendor: "printify", // wrong
      marketplace: "etsy",
      region: "US",
      retailPriceCents: 2400,
      displayCurrency: "USD",
    };
    expect(() => calculateProfit(input, product, fx)).toThrow(/Vendor mismatch/);
  });

  it("throws when shipping is undefined for the region", () => {
    const product = { ...bellaCanvas3001(), shippingUsdCents: { US: 499 } };
    const fx = usdAt1();
    const input: CalculationInput = {
      productId: product.id,
      vendor: "printful",
      marketplace: "etsy",
      region: "EU",
      retailPriceCents: 2400,
      displayCurrency: "USD",
    };
    expect(() => calculateProfit(input, product, fx)).toThrow(/No shipping cost/);
  });

  it("returns 0% margin when retail = 0", () => {
    const product = bellaCanvas3001();
    const fx = usdAt1();
    const input: CalculationInput = {
      productId: product.id,
      vendor: "printful",
      marketplace: "shopify",
      region: "US",
      retailPriceCents: 0,
      displayCurrency: "USD",
    };
    const r = calculateProfit(input, product, fx);
    expect(r.marginPercent).toBe(0);
    expect(r.netProfitCents).toBeLessThan(0); // costs > 0, retail = 0
  });
});
