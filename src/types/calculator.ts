/**
 * PODProfit — calculator types
 *
 * All currency amounts are stored as integers in the smallest unit (cents for USD,
 * pence for GBP, sen for JPY). Display layer converts.
 */

export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY";

export type Vendor = "printful" | "printify";

export type Marketplace = "etsy" | "shopify" | "amazon-merch" | "printify-pop-up" | "manual";

export type Region = "US" | "EU" | "UK" | "CA" | "AU";

/** A POD product variant (e.g., "Bella+Canvas 3001 t-shirt, white, M, US"). */
export interface ProductVariant {
  id: string;
  vendor: Vendor;
  name: string;
  /** Vendor base cost in USD cents (Printful/Printify quote in USD) */
  baseCostUsdCents: number;
  /** Shipping per region in USD cents */
  shippingUsdCents: Partial<Record<Region, number>>;
  /** Document the source / as-of date for transparency. */
  sourceUrl: string;
  asOfDate: string; // YYYY-MM-DD
}

/** Marketplace fee model (Etsy charges differently from Shopify). */
export interface MarketplaceFees {
  marketplace: Marketplace;
  /** Per-listing fixed fee, USD cents (Etsy = $0.20, others = 0) */
  listingFeeUsdCents: number;
  /** Transaction fee as a fraction (Etsy = 0.065, Shopify = 0.029, Amazon Merch = 0.30) */
  transactionFeeRate: number;
  /** Per-transaction fixed fee, USD cents (Stripe-style $0.30 etc.) */
  perTransactionFeeUsdCents: number;
  /** Payment processing rate (Etsy 0.03, Shopify 0.029) */
  paymentProcessingRate: number;
  /** Offsite ads rate when applicable (Etsy mandatory 0.12 for some sellers) */
  offsiteAdsRate?: number;
}

export interface FxRates {
  /** As-of date, YYYY-MM-DD */
  asOfDate: string;
  /** USD to {currency} rate (1 USD = X currency) */
  rates: Record<Currency, number>;
}

export interface CalculationInput {
  productId: string;
  vendor: Vendor;
  marketplace: Marketplace;
  region: Region;
  /** What the seller wants to charge the customer, in display currency cents */
  retailPriceCents: number;
  /** Display / billing currency */
  displayCurrency: Currency;
  /** Optional: include offsite ads (Etsy) */
  includeOffsiteAds?: boolean;
}

export interface CalculationResult {
  /** Echo of input for traceability */
  input: CalculationInput;
  /** All amounts in display currency cents */
  retailPriceCents: number;
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
  /** Source / as-of date metadata for transparency */
  meta: {
    productSourceUrl: string;
    productAsOfDate: string;
    fxAsOfDate: string;
    calculatedAt: string;
  };
}
