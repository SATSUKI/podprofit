import type {
  CalculationInput,
  Currency,
  Marketplace,
  Region,
  Vendor,
} from "@/types/calculator";

/**
 * Share-Link encoding: serialise the calculator inputs into compact URL params
 * so anyone who opens the link sees the exact same calculation reproduced —
 * no DB hit, no signup, no rate limit. The viral primitive of PODProfit.
 *
 * Param schema (intentionally short, future-additive):
 *   p   = productId
 *   v   = vendor                ("printful" | "printify")
 *   m   = marketplace            ("etsy" | "shopify" | ...)
 *   r   = region                 ("US" | ...)
 *   c   = currency               ("USD" | ...)
 *   pr  = retail price (decimal display, e.g. "24.00")
 *   ads = "1" if include offsite ads, omitted otherwise
 *
 * All keys are short and case-sensitive; future flags are additive (don't
 * break existing share links).
 */

export interface ShareableState {
  productId?: string;
  vendor?: Vendor;
  marketplace?: Marketplace;
  region?: Region;
  currency?: Currency;
  retailDisplay?: string; // user-typed string, e.g. "24.00"
  includeOffsiteAds?: boolean;
  /** For vendor-comparison links: the family ID instead of productId. */
  familyId?: string;
}

const VENDORS: Vendor[] = ["printful", "printify"];
const MARKETPLACES: Marketplace[] = [
  "etsy",
  "shopify",
  "amazon-merch",
  "printify-pop-up",
  "manual",
];
const REGIONS: Region[] = ["US", "EU", "UK", "CA", "AU"];
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

export function encodeShareLink(state: ShareableState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.productId) params.set("p", state.productId);
  if (state.familyId) params.set("f", state.familyId);
  if (state.vendor) params.set("v", state.vendor);
  if (state.marketplace) params.set("m", state.marketplace);
  if (state.region) params.set("r", state.region);
  if (state.currency) params.set("c", state.currency);
  if (state.retailDisplay) params.set("pr", state.retailDisplay);
  if (state.includeOffsiteAds) params.set("ads", "1");
  return params;
}

export function decodeShareLink(input: URLSearchParams | string): ShareableState {
  const params =
    typeof input === "string" ? new URLSearchParams(input) : input;

  const out: ShareableState = {};
  const p = params.get("p");
  if (p) out.productId = p;
  const f = params.get("f");
  if (f) out.familyId = f;
  const v = params.get("v");
  if (v && (VENDORS as string[]).includes(v)) out.vendor = v as Vendor;
  const m = params.get("m");
  if (m && (MARKETPLACES as string[]).includes(m)) out.marketplace = m as Marketplace;
  const r = params.get("r");
  if (r && (REGIONS as string[]).includes(r)) out.region = r as Region;
  const c = params.get("c");
  if (c && (CURRENCIES as string[]).includes(c)) out.currency = c as Currency;
  const pr = params.get("pr");
  if (pr && /^[\d.,\-]+$/.test(pr)) out.retailDisplay = pr;
  if (params.get("ads") === "1") out.includeOffsiteAds = true;
  return out;
}

export function shareLinkFromCalculation(
  input: CalculationInput,
  retailDisplay: string,
): URLSearchParams {
  return encodeShareLink({
    productId: input.productId,
    vendor: input.vendor,
    marketplace: input.marketplace,
    region: input.region,
    currency: input.displayCurrency,
    retailDisplay,
    includeOffsiteAds: input.includeOffsiteAds,
  });
}

export function buildShareUrl(
  baseUrl: string,
  pathname: string,
  state: ShareableState,
): string {
  const qs = encodeShareLink(state).toString();
  return `${baseUrl}${pathname}${qs ? `?${qs}` : ""}`;
}
