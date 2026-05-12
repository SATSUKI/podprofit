import { describe, it, expect } from "vitest";
import {
  parseVariant,
  VARIANT_CONFIG,
  VARIANT_KEYS,
  type Variant,
} from "@/app/api/og/variants";

/**
 * PODP-59 — page-specific og:image variants.
 *
 * The route itself can't be exercised inside vitest (it `import`s `next/og`,
 * which is edge-runtime-only). Instead we test the pure dispatch + copy
 * data, then guard the *connection* between page metadata and the variant
 * map elsewhere (see og-image-metadata.test.ts).
 *
 * What we're protecting against:
 *  - A new page metadata referencing `?variant=foo` that has no map entry
 *    (which would silently fall back to `default` in production).
 *  - Copy regressions on Lifetime scarcity / Cornerstone currency list —
 *    these double as Twitter/LinkedIn shared snippet headlines.
 */
describe("OG variants — dispatch", () => {
  it("returns 'default' for null/undefined/empty input", () => {
    expect(parseVariant(null)).toBe("default");
    expect(parseVariant(undefined)).toBe("default");
    expect(parseVariant("")).toBe("default");
  });

  it("returns 'default' for unknown variant names (no 404 surface)", () => {
    // We deliberately swallow bad input so a stale crawler / botched share
    // URL still renders a brand poster instead of erroring out — the SNS
    // preview never goes blank.
    expect(parseVariant("bogus")).toBe("default");
    expect(parseVariant("PRICING")).toBe("default"); // case-sensitive on purpose
  });

  it.each<Variant>([
    "default",
    "pricing",
    "lifetime",
    "about",
    "cornerstone-multicurrency",
  ])("accepts the documented variant %s", (variant) => {
    expect(parseVariant(variant)).toBe(variant);
    expect(VARIANT_KEYS.has(variant)).toBe(true);
  });
});

describe("OG variants — copy contract", () => {
  it("ships exactly the five documented variants", () => {
    // PODP-59 ticket scope. If the team adds a new variant, this assertion
    // is meant to fail and force a docs/test update at the same time.
    expect(Array.from(VARIANT_KEYS).sort()).toEqual(
      [
        "about",
        "cornerstone-multicurrency",
        "default",
        "lifetime",
        "pricing",
      ].sort(),
    );
    expect(Object.keys(VARIANT_CONFIG).sort()).toEqual(
      Array.from(VARIANT_KEYS).sort(),
    );
  });

  it("every variant has non-empty eyebrow / headline / sub / footerLeft", () => {
    // Empty strings render as blank gaps inside @vercel/og and look broken
    // in shared previews. Cheap structural guard.
    for (const v of VARIANT_KEYS) {
      const cfg = VARIANT_CONFIG[v];
      expect(cfg.eyebrow.length, `${v}.eyebrow`).toBeGreaterThan(0);
      expect(cfg.headline.length, `${v}.headline`).toBeGreaterThan(0);
      expect(cfg.sub.length, `${v}.sub`).toBeGreaterThan(0);
      expect(cfg.footerLeft.length, `${v}.footerLeft`).toBeGreaterThan(0);
      expect(cfg.accentColor, `${v}.accentColor`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // headlineSize budget — picked so the longest line wraps cleanly at
      // 1040px max-width. Anything outside this band risks layout drift.
      expect(cfg.headlineSize, `${v}.headlineSize`).toBeGreaterThanOrEqual(72);
      expect(cfg.headlineSize, `${v}.headlineSize`).toBeLessThanOrEqual(120);
    }
  });

  it("Lifetime variant uses gold accent and the 100-seats scarcity hook", () => {
    // SNS preview psychology: Lifetime is the only paid SKU live today, so
    // we differentiate it visually (gold strip + "100 seats" in eyebrow).
    const cfg = VARIANT_CONFIG.lifetime;
    expect(cfg.accentColor).toBe("#F5C26B");
    expect(cfg.eyebrow).toContain("100 SEATS");
    expect(cfg.headline).toContain("$149");
  });

  it("Pricing variant headlines the three SKU tiers", () => {
    const cfg = VARIANT_CONFIG.pricing;
    expect(cfg.headline.toLowerCase()).toContain("free");
    expect(cfg.headline.toLowerCase()).toContain("pro");
    expect(cfg.headline.toLowerCase()).toContain("lifetime");
    // Sub-headline must back the price points the SERP description promises.
    expect(cfg.sub).toContain("$9");
    expect(cfg.sub).toContain("$79");
    expect(cfg.sub).toContain("$149");
  });

  it("About variant names the founder so social previews carry identity", () => {
    const cfg = VARIANT_CONFIG.about;
    expect(cfg.sub).toContain("Satsuki Okazaki");
  });

  it("Cornerstone variant lists all six currencies", () => {
    // The cornerstone's whole hook is six-currency profit comparison —
    // if we drop a currency here we undersell the article on share.
    const cfg = VARIANT_CONFIG["cornerstone-multicurrency"];
    for (const code of ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]) {
      expect(cfg.sub).toContain(code);
    }
  });
});
