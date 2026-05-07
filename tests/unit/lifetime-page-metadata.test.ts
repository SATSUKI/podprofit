import { describe, it, expect } from "vitest";
import { metadata, revalidate } from "@/app/lifetime/page";

describe("/lifetime page metadata", () => {
  it("declares the canonical Lifetime URL for SEO", () => {
    expect(metadata.alternates?.canonical).toBe(
      "https://getpodprofit.com/lifetime",
    );
  });

  it("uses the launch-spec title and description (so refunds page promise + announcement copy stay backed)", () => {
    expect(metadata.title).toBe("PODProfit Lifetime — $149 for 100 builders");
    expect(typeof metadata.description).toBe("string");
    // Description must mention the cap so the SERP snippet is honest about scarcity.
    expect(metadata.description).toContain("100 seats");
    expect(metadata.description).toContain("$149");
  });

  it("revalidates the live counter at most every 60 seconds", () => {
    // ISR knob: bigger than 60 risks stale counter; smaller is wasteful.
    expect(revalidate).toBe(60);
  });
});
