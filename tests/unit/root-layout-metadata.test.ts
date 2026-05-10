import { describe, expect, it } from "vitest";
// Import from the metadata-only module, not `layout.tsx` — the latter
// pulls in `next/font/google` which is incompatible with the vitest
// runtime (no `next` server). The metadata is the same object Next
// reads from `src/app/layout.tsx` via the file-convention re-export.
import { rootMetadata as metadata } from "@/app/_metadata";

/**
 * Root layout metadata is the floor for every page that doesn't override —
 * canonical, og:image, twitter:image. Pages with their own metadata may
 * override; pages without one inherit these.
 *
 * Why these checks (and not "render the html and snapshot it"):
 *   - Next emits the metadata via React Server Components and merges it
 *     with per-page metadata at render time. The structured field shape
 *     is the authoritative contract for downstream tooling
 *     (Stripe-review crawler, Twitter validator, OG.dev preview).
 *   - Asserting field shape here decouples us from Next's emitted HTML
 *     format, which has changed across minor versions.
 */
describe("root layout metadata (defaults inherited by all pages)", () => {
  it("declares the homepage as the default canonical URL", () => {
    expect(metadata.alternates?.canonical).toBe("https://getpodprofit.com");
  });

  it("provides a default OG image (the dynamic /api/og endpoint)", () => {
    const images = metadata.openGraph?.images;
    expect(Array.isArray(images)).toBe(true);
    expect(images).toBeDefined();
    const first = (images as Array<{ url: string; width?: number; height?: number; alt?: string }>)[0];
    expect(first?.url).toBe("/api/og");
    // 1200x630 is what /api/og's ImageResponse emits — keeping the
    // declared dimensions in sync prevents Twitter / LinkedIn cropping.
    expect(first?.width).toBe(1200);
    expect(first?.height).toBe(630);
  });

  it("declares a Twitter card image so the SNS share preview matches OG", () => {
    // Next types `metadata.twitter` as a discriminated union by `card`
    // type — narrowing through `unknown` keeps the assertion focused on
    // shape rather than fighting the union.
    const tw = metadata.twitter as unknown as {
      card?: string;
      images?: string | string[] | Array<{ url: string }>;
    };
    expect(tw?.card).toBe("summary_large_image");
    // Next normalizes string-array input to the same shape — assert by
    // stringifying so the test passes whether the raw value is a string
    // or a single-element array.
    expect(JSON.stringify(tw?.images ?? [])).toContain("/api/og");
  });

  it("uses the launch title + description (defines the SERP first impression)", () => {
    // metadata.title here is the `default` form ({ default, template }).
    const titleValue = (metadata.title as { default: string; template: string }).default;
    expect(titleValue).toBe(
      "PODProfit — Real Print-on-Demand profit calculator",
    );
    expect(typeof metadata.description).toBe("string");
    expect(metadata.description).toContain("Print-on-Demand");
  });
});
