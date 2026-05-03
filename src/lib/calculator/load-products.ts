import type { ProductVariant, FxRates, Vendor } from "@/types/calculator";

/**
 * Product catalog & FX rates — embedded TS for client-side calculator.
 *
 * Source of truth: data/printful/products.yml, data/printify/products.yml,
 * data/fx-rates.yml. This file mirrors them. A `pnpm gen:data` script will
 * later regenerate this from YAML at build time (deferred per slim-down rule:
 * W1 needs working LP, YAML→TS pipeline is post-MVP polish).
 *
 * When you update YAML, update this file in the same PR.
 */

const PRINTFUL_AS_OF = "2026-04-28";
const PRINTFUL_SOURCE = "https://www.printful.com/custom-products";
const PRINTIFY_AS_OF = "2026-04-28";
const PRINTIFY_SOURCE = "https://printify.com/catalog/";

const PRINTFUL: ProductVariant[] = [
  {
    id: "printful-bella-canvas-3001-tee-white-m",
    vendor: "printful",
    name: "Bella+Canvas 3001 unisex t-shirt (white, M)",
    baseCostUsdCents: 1295,
    shippingUsdCents: { US: 499, EU: 699, UK: 699, CA: 599, AU: 999 },
    sourceUrl: PRINTFUL_SOURCE,
    asOfDate: PRINTFUL_AS_OF,
  },
  {
    id: "printful-gildan-18000-sweatshirt-black-l",
    vendor: "printful",
    name: "Gildan 18000 heavy blend sweatshirt (black, L)",
    baseCostUsdCents: 2295,
    shippingUsdCents: { US: 549, EU: 799, UK: 799, CA: 649, AU: 1099 },
    sourceUrl: PRINTFUL_SOURCE,
    asOfDate: PRINTFUL_AS_OF,
  },
  {
    id: "printful-mug-11oz-white",
    vendor: "printful",
    name: "11oz ceramic mug (white)",
    baseCostUsdCents: 795,
    shippingUsdCents: { US: 499, EU: 599, UK: 599, CA: 549, AU: 699 },
    sourceUrl: PRINTFUL_SOURCE,
    asOfDate: PRINTFUL_AS_OF,
  },
  {
    id: "printful-aop-hoodie-unisex-m",
    vendor: "printful",
    name: "All-Over-Print unisex hoodie (M)",
    baseCostUsdCents: 4495,
    shippingUsdCents: { US: 699, EU: 999, UK: 999, CA: 799, AU: 1299 },
    sourceUrl: PRINTFUL_SOURCE,
    asOfDate: PRINTFUL_AS_OF,
  },
  {
    id: "printful-tote-bag-natural",
    vendor: "printful",
    name: "Cotton tote bag (natural, 16x16)",
    baseCostUsdCents: 1195,
    shippingUsdCents: { US: 449, EU: 549, UK: 549, CA: 499, AU: 699 },
    sourceUrl: PRINTFUL_SOURCE,
    asOfDate: PRINTFUL_AS_OF,
  },
  {
    id: "printful-poster-matte-18x24",
    vendor: "printful",
    name: "Matte poster (18x24)",
    baseCostUsdCents: 1395,
    shippingUsdCents: { US: 549, EU: 749, UK: 749, CA: 649, AU: 949 },
    sourceUrl: PRINTFUL_SOURCE,
    asOfDate: PRINTFUL_AS_OF,
  },
];

const PRINTIFY: ProductVariant[] = [
  {
    id: "printify-bella-canvas-3001-tee-white-m",
    vendor: "printify",
    name: "Bella+Canvas 3001 unisex t-shirt (white, M)",
    baseCostUsdCents: 1095,
    shippingUsdCents: { US: 449, EU: 749, UK: 649, CA: 549, AU: 1049 },
    sourceUrl: PRINTIFY_SOURCE,
    asOfDate: PRINTIFY_AS_OF,
  },
  {
    id: "printify-gildan-18000-sweatshirt-black-l",
    vendor: "printify",
    name: "Gildan 18000 heavy blend sweatshirt (black, L)",
    baseCostUsdCents: 1995,
    shippingUsdCents: { US: 499, EU: 849, UK: 749, CA: 599, AU: 1149 },
    sourceUrl: PRINTIFY_SOURCE,
    asOfDate: PRINTIFY_AS_OF,
  },
  {
    id: "printify-mug-11oz-white",
    vendor: "printify",
    name: "11oz ceramic mug (white)",
    baseCostUsdCents: 595,
    shippingUsdCents: { US: 449, EU: 599, UK: 549, CA: 499, AU: 749 },
    sourceUrl: PRINTIFY_SOURCE,
    asOfDate: PRINTIFY_AS_OF,
  },
  {
    id: "printify-aop-hoodie-unisex-m",
    vendor: "printify",
    name: "All-Over-Print unisex hoodie (M)",
    baseCostUsdCents: 3895,
    shippingUsdCents: { US: 649, EU: 1049, UK: 949, CA: 749, AU: 1349 },
    sourceUrl: PRINTIFY_SOURCE,
    asOfDate: PRINTIFY_AS_OF,
  },
  {
    id: "printify-tote-bag-natural",
    vendor: "printify",
    name: "Cotton tote bag (natural, 16x16)",
    baseCostUsdCents: 995,
    shippingUsdCents: { US: 399, EU: 599, UK: 499, CA: 449, AU: 749 },
    sourceUrl: PRINTIFY_SOURCE,
    asOfDate: PRINTIFY_AS_OF,
  },
  {
    id: "printify-poster-matte-18x24",
    vendor: "printify",
    name: "Matte poster (18x24)",
    baseCostUsdCents: 1195,
    shippingUsdCents: { US: 499, EU: 799, UK: 699, CA: 599, AU: 999 },
    sourceUrl: PRINTIFY_SOURCE,
    asOfDate: PRINTIFY_AS_OF,
  },
];

const FX: FxRates = {
  asOfDate: "2026-04-30",
  rates: { USD: 1.0, EUR: 0.93, GBP: 0.79, CAD: 1.37, AUD: 1.53, JPY: 153.0 },
};

export const ALL_PRODUCTS: ReadonlyArray<ProductVariant> = [...PRINTFUL, ...PRINTIFY];

export function loadAllProducts(): ProductVariant[] {
  return [...ALL_PRODUCTS];
}

export function loadFxRates(): FxRates {
  return { ...FX, rates: { ...FX.rates } };
}

export function getProductById(id: string): ProductVariant | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id);
}

export function getProductsByVendor(vendor: Vendor): ProductVariant[] {
  return ALL_PRODUCTS.filter((p) => p.vendor === vendor);
}
