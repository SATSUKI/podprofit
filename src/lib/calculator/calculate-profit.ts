import type {
  CalculationInput,
  CalculationResult,
  ProductVariant,
  FxRates,
} from "@/types/calculator";
import { MARKETPLACE_FEES } from "./marketplace-fees";

/**
 * Pure function: compute the net profit from a single sale.
 *
 * Design rationale:
 *  - All inputs / outputs are integers (cents) — never floating-point currency.
 *  - Conversion from USD (vendor cost) to display currency happens once, up front.
 *  - All fees are itemized in the result so the UI can show a transparent breakdown.
 *  - Per CEO slim-down decree, this runs **client-side** (no server round-trip)
 *    so the calculator is fast and works on any network.
 *
 * Throws if inputs are invalid (vendor mismatch, missing shipping for region, etc.).
 */
export function calculateProfit(
  input: CalculationInput,
  product: ProductVariant,
  fx: FxRates,
): CalculationResult {
  if (product.id !== input.productId) {
    throw new Error(
      `Product mismatch: input.productId=${input.productId} but product.id=${product.id}`,
    );
  }
  if (product.vendor !== input.vendor) {
    throw new Error(
      `Vendor mismatch: input.vendor=${input.vendor} but product.vendor=${product.vendor}`,
    );
  }

  const fees = MARKETPLACE_FEES[input.marketplace];
  const fxRate = fx.rates[input.displayCurrency];
  if (typeof fxRate !== "number" || fxRate <= 0) {
    throw new Error(`Invalid FX rate for ${input.displayCurrency}`);
  }

  // Convert USD-denominated vendor costs to display currency.
  const vendorBaseCostCents = usdCentsToDisplay(product.baseCostUsdCents, fxRate);
  const shippingUsd = product.shippingUsdCents[input.region];
  if (shippingUsd === undefined) {
    throw new Error(
      `No shipping cost defined for region=${input.region} on product=${product.id}`,
    );
  }
  const vendorShippingCents = usdCentsToDisplay(shippingUsd, fxRate);

  const marketplaceListingFeeCents = usdCentsToDisplay(fees.listingFeeUsdCents, fxRate);
  const marketplacePerTransactionFeeCents = usdCentsToDisplay(
    fees.perTransactionFeeUsdCents,
    fxRate,
  );

  // Percent-based fees apply to the retail price (in display currency).
  const marketplaceTransactionFeeCents = roundCents(
    input.retailPriceCents * fees.transactionFeeRate,
  );
  const paymentProcessingFeeCents = roundCents(
    input.retailPriceCents * fees.paymentProcessingRate,
  );
  const offsiteAdsFeeCents =
    input.includeOffsiteAds && fees.offsiteAdsRate
      ? roundCents(input.retailPriceCents * fees.offsiteAdsRate)
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
    input.retailPriceCents === 0
      ? 0
      : (netProfitCents / input.retailPriceCents) * 100;

  return {
    input,
    retailPriceCents: input.retailPriceCents,
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
    meta: {
      productSourceUrl: product.sourceUrl,
      productAsOfDate: product.asOfDate,
      fxAsOfDate: fx.asOfDate,
      calculatedAt: new Date().toISOString(),
    },
  };
}

function usdCentsToDisplay(usdCents: number, fxRate: number): number {
  return roundCents(usdCents * fxRate);
}

function roundCents(value: number): number {
  // Banker's rounding could be more "fair" but standard rounding matches
  // user expectations from spreadsheets.
  return Math.round(value);
}
