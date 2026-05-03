import { describe, it, expect } from "vitest";
import {
  decodeShareLink,
  encodeShareLink,
  buildShareUrl,
  shareLinkFromCalculation,
} from "@/lib/calculator/share-link";

describe("share-link", () => {
  it("round-trips a fully-specified state", () => {
    const state = {
      productId: "printful-bella-canvas-3001-tee-white-m",
      vendor: "printful" as const,
      marketplace: "etsy" as const,
      region: "US" as const,
      currency: "USD" as const,
      retailDisplay: "24.00",
      includeOffsiteAds: true,
    };
    const encoded = encodeShareLink(state);
    const decoded = decodeShareLink(encoded);
    expect(decoded).toEqual(state);
  });

  it("omits empty fields from the URL", () => {
    const encoded = encodeShareLink({ currency: "JPY" });
    const str = encoded.toString();
    expect(str).toBe("c=JPY");
  });

  it("omits ads when false (URL stays short)", () => {
    const encoded = encodeShareLink({
      currency: "USD",
      includeOffsiteAds: false,
    });
    expect(encoded.toString()).toBe("c=USD");
  });

  it("rejects invalid enum values silently", () => {
    const decoded = decodeShareLink("v=hax&m=bogus&c=ZZZ");
    expect(decoded.vendor).toBeUndefined();
    expect(decoded.marketplace).toBeUndefined();
    expect(decoded.currency).toBeUndefined();
  });

  it("preserves family ID for vendor-comparison links", () => {
    const decoded = decodeShareLink("f=bella-canvas-3001-tee-white-m&c=EUR");
    expect(decoded.familyId).toBe("bella-canvas-3001-tee-white-m");
    expect(decoded.currency).toBe("EUR");
  });

  it("generates a clean shareable URL", () => {
    const url = buildShareUrl("https://getpodprofit.com", "/c", {
      familyId: "mug-11oz-white",
      currency: "GBP",
      marketplace: "shopify",
    });
    expect(url).toContain("https://getpodprofit.com/c?");
    expect(url).toContain("f=mug-11oz-white");
    expect(url).toContain("c=GBP");
    expect(url).toContain("m=shopify");
  });

  it("builds share params from a CalculationInput", () => {
    const params = shareLinkFromCalculation(
      {
        productId: "printify-mug-11oz-white",
        vendor: "printify",
        marketplace: "shopify",
        region: "EU",
        retailPriceCents: 1500,
        displayCurrency: "EUR",
        includeOffsiteAds: false,
      },
      "15.00",
    );
    expect(params.get("p")).toBe("printify-mug-11oz-white");
    expect(params.get("v")).toBe("printify");
    expect(params.get("c")).toBe("EUR");
    expect(params.get("pr")).toBe("15.00");
    expect(params.get("ads")).toBeNull();
  });
});
