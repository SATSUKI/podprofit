import { describe, expect, it } from "vitest";
import { metadata, dynamic } from "@/app/pricing/page";

describe("/pricing page metadata", () => {
  it("declares the canonical Pricing URL (overrides root layout default)", () => {
    expect(metadata.alternates?.canonical).toBe(
      "https://getpodprofit.com/pricing",
    );
  });

  it("uses the launch-spec title + description so the SERP snippet matches the on-page copy", () => {
    expect(metadata.title).toBe(
      "Pricing — Free, Pro Monthly, Pro Annual, Lifetime",
    );
    expect(typeof metadata.description).toBe("string");
    expect(metadata.description).toContain("$9 USD/month");
    expect(metadata.description).toContain("$79 USD/year");
    expect(metadata.description).toContain("$149");
    expect(metadata.description).toContain("June 9, 2026");
  });

  it("declares OpenGraph metadata with canonical URL + descriptive title", () => {
    expect(metadata.openGraph?.url).toBe(
      "https://getpodprofit.com/pricing",
    );
    expect(metadata.openGraph?.title).toBe(
      "PODProfit Pricing — Free, Pro Monthly, Pro Annual, Lifetime",
    );
    // `type` is on the discriminated `OpenGraphWebsite` variant — Next's
    // typing narrows by author input, so cast through `unknown` to read
    // the field for the assertion.
    const og = metadata.openGraph as unknown as { type?: string };
    expect(og.type).toBe("website");
  });

  it("is force-dynamic so per-user entitlement gating (PODP-62) takes effect", () => {
    // /pricing now reads the auth cookie to branch CTAs; opting out of
    // static generation guarantees a Lifetime owner never sees a stale
    // Buy CTA from a build-time render.
    expect(dynamic).toBe("force-dynamic");
  });
});
