import type { MarketplaceFees, Marketplace } from "@/types/calculator";

/**
 * Marketplace fee tables (as of 2026-05).
 *
 * Sources:
 *  - Etsy: https://help.etsy.com/hc/en-us/articles/115014483627  (listing $0.20, transaction 6.5%, processing 3% + $0.25 US)
 *  - Shopify: 2.9% + $0.30 (Basic plan, online)
 *  - Amazon Merch: 30% royalty model (we treat as transaction fee)
 *  - Printify Pop-Up Store / Manual: no marketplace fees, only payment processing
 *
 * NOTE: Numbers are simplified. Per CEO slim-down rule, we publish "list price"
 * and rely on a `Fees as of <date>` disclaimer in the UI.
 */
export const MARKETPLACE_FEES: Record<Marketplace, MarketplaceFees> = {
  etsy: {
    marketplace: "etsy",
    listingFeeUsdCents: 20,
    transactionFeeRate: 0.065,
    perTransactionFeeUsdCents: 25,
    paymentProcessingRate: 0.03,
    offsiteAdsRate: 0.12,
  },
  shopify: {
    marketplace: "shopify",
    listingFeeUsdCents: 0,
    transactionFeeRate: 0,
    perTransactionFeeUsdCents: 30,
    paymentProcessingRate: 0.029,
  },
  "amazon-merch": {
    marketplace: "amazon-merch",
    listingFeeUsdCents: 0,
    transactionFeeRate: 0.30,
    perTransactionFeeUsdCents: 0,
    paymentProcessingRate: 0,
  },
  "printify-pop-up": {
    marketplace: "printify-pop-up",
    listingFeeUsdCents: 0,
    transactionFeeRate: 0,
    perTransactionFeeUsdCents: 30,
    paymentProcessingRate: 0.05,
  },
  manual: {
    marketplace: "manual",
    listingFeeUsdCents: 0,
    transactionFeeRate: 0,
    perTransactionFeeUsdCents: 30,
    paymentProcessingRate: 0.029,
  },
};
