/**
 * OG image variant config — extracted from `route.tsx` so it can be unit-tested
 * without importing `next/og` (which is edge-runtime-only and explodes in the
 * vitest node environment).
 *
 * The route reads `VARIANT_CONFIG` directly to render each poster; tests
 * import the same map to guarantee every page-specific variant URL the
 * metadata layer points at actually has a config entry (and matching copy).
 */

export type Variant =
  | "default"
  | "pricing"
  | "lifetime"
  | "about"
  | "cornerstone-multicurrency";

export const VARIANT_KEYS: ReadonlySet<Variant> = new Set([
  "default",
  "pricing",
  "lifetime",
  "about",
  "cornerstone-multicurrency",
]);

/** Returns the parsed variant or `"default"` for any unknown/null input. */
export function parseVariant(raw: string | null | undefined): Variant {
  if (raw && (VARIANT_KEYS as Set<string>).has(raw)) {
    return raw as Variant;
  }
  return "default";
}

// Brand palette — kept inline as constants instead of pulling Tailwind theme
// because Satori only understands inline CSS (no className resolution).
export const BRAND_700 = "#0F3D2E";
export const BRAND_50 = "#ECF6F0";
export const BRAND_ACCENT = "#A3CFB5";
export const GOLD = "#F5C26B"; // Lifetime scarcity emphasis

export type VariantConfig = {
  eyebrow: string;
  headline: string;
  headlineSize: number;
  sub: string;
  footerLeft: string;
  accentColor: string;
};

/**
 * Per-variant copy table. Keeping this as data (not JSX) so the renderer
 * stays one switch-free function and copy changes don't require touching
 * layout code. `accentColor` lets Lifetime stand out without forking the
 * whole template.
 */
export const VARIANT_CONFIG: Record<Variant, VariantConfig> = {
  default: {
    eyebrow: "PODPROFIT · BUILDING IN PUBLIC",
    headline: "Real Print-on-Demand profit",
    headlineSize: 96,
    sub: "Vendor-neutral. Multi-currency. Share-able.",
    footerLeft: "Printful + Printify · 6 currencies · every fee itemized",
    accentColor: BRAND_ACCENT,
  },
  pricing: {
    eyebrow: "PODPROFIT · PRICING",
    headline: "Free, Pro, Lifetime",
    headlineSize: 104,
    sub: "$9/mo · $79/yr · $149 one-time (100 seats)",
    footerLeft: "Honest pricing. No upsell tricks. No data resale.",
    accentColor: BRAND_ACCENT,
  },
  lifetime: {
    eyebrow: "PODPROFIT · LIFETIME · 100 SEATS",
    headline: "$149, once. Forever.",
    headlineSize: 104,
    sub: "Calculator + every future Pro tool. No renewals.",
    footerLeft: "Lifetime founders get every Pro tool we ship · 100 seats only",
    accentColor: GOLD,
  },
  about: {
    eyebrow: "PODPROFIT · ABOUT",
    headline: "Built in public",
    headlineSize: 104,
    sub: "by Satsuki Okazaki — POD seller + 20-year engineer",
    footerLeft: "Solo-operated. Vendor-neutral. Email replies in 24h.",
    accentColor: BRAND_ACCENT,
  },
  "cornerstone-multicurrency": {
    eyebrow: "PODPROFIT · CORNERSTONE GUIDE · 2026",
    headline: "Printful vs Printify",
    headlineSize: 88,
    sub: "Real profit across USD · EUR · GBP · CAD · AUD · JPY",
    footerLeft: "Bella+Canvas 3001 · subs, ads, FX margin — every fee named",
    accentColor: BRAND_ACCENT,
  },
};
