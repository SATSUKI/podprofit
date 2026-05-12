import { describe, it, expect } from "vitest";
import { metadata as pricingMetadata } from "@/app/pricing/page";
import { metadata as lifetimeMetadata } from "@/app/lifetime/page";
import { metadata as aboutMetadata } from "@/app/about/page";
import { metadata as cornerstoneMetadata } from "@/app/blog/printful-vs-printify-profit-calculator-multi-currency/page";
import { rootMetadata } from "@/app/_metadata";
import { VARIANT_KEYS, type Variant } from "@/app/api/og/variants";

/**
 * PODP-59 — wiring guard.
 *
 * Confirms every page that overrides its own openGraph block points at a
 * variant URL that the /api/og route actually knows how to render. The
 * variant copy itself is tested in og-variants.test.ts; here we only check
 * the metadata layer ↔ route layer connection so an editor renaming a
 * variant doesn't silently break a page's SNS preview.
 */

/**
 * Pulls the first `openGraph.images[].url` (or the twitter images[]) and
 * extracts the `variant=` query param. Tolerates absolute and relative URLs.
 */
function extractVariant(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // Use a base so the URL constructor accepts relative paths like "/api/og?…"
  const parsed = new URL(url, "https://example.com");
  return parsed.searchParams.get("variant") ?? undefined;
}

function firstOgImageUrl(meta: { openGraph?: unknown }): string | undefined {
  const og = meta.openGraph as
    | { images?: Array<{ url?: string } | string> | string }
    | undefined;
  const images = og?.images;
  if (!images) return undefined;
  if (typeof images === "string") return images;
  const first = images[0];
  if (!first) return undefined;
  return typeof first === "string" ? first : first.url;
}

function firstTwitterImage(meta: { twitter?: unknown }): string | undefined {
  const tw = meta.twitter as
    | { images?: string | string[] | Array<{ url: string }> }
    | undefined;
  const images = tw?.images;
  if (!images) return undefined;
  if (typeof images === "string") return images;
  const first = images[0];
  if (!first) return undefined;
  return typeof first === "string" ? first : first.url;
}

describe("OG image metadata — variant wiring", () => {
  it("root layout default points at the `default` variant", () => {
    const url = firstOgImageUrl(rootMetadata);
    expect(url).toBe("/api/og?variant=default");
    expect(VARIANT_KEYS.has(extractVariant(url) as Variant)).toBe(true);
  });

  const cases: Array<{
    name: string;
    meta: { openGraph?: unknown; twitter?: unknown };
    expected: Variant;
  }> = [
    { name: "pricing", meta: pricingMetadata, expected: "pricing" },
    { name: "lifetime", meta: lifetimeMetadata, expected: "lifetime" },
    { name: "about", meta: aboutMetadata, expected: "about" },
    {
      name: "cornerstone-multicurrency",
      meta: cornerstoneMetadata,
      expected: "cornerstone-multicurrency",
    },
  ];

  it.each(cases)(
    "/$name page openGraph.images[0] points at variant=$expected",
    ({ meta, expected }) => {
      const url = firstOgImageUrl(meta);
      expect(url, "openGraph.images[0].url must be defined").toBeDefined();
      expect(extractVariant(url)).toBe(expected);
      expect(VARIANT_KEYS.has(expected)).toBe(true);
    },
  );

  it.each(cases)(
    "/$name page twitter.images[0] points at variant=$expected (so Twitter preview matches OG)",
    ({ meta, expected }) => {
      const url = firstTwitterImage(meta);
      expect(url, "twitter.images[0] must be defined").toBeDefined();
      expect(extractVariant(url)).toBe(expected);
    },
  );

  it("Cornerstone uses an absolute URL (article-type OG benefits from canonical host)", () => {
    // Article-type previews are crawled by HN, Reddit, LinkedIn — those
    // scrapers historically have less-forgiving relative-URL resolution
    // than Twitter does. Cornerstone is also the highest-traffic share
    // target, so we pin it explicitly to the canonical host.
    const url = firstOgImageUrl(cornerstoneMetadata);
    expect(url?.startsWith("https://getpodprofit.com/")).toBe(true);
  });
});
