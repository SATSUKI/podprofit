import { describe, it, expect } from "vitest";
import { metadata } from "@/app/faq/page";

describe("/faq page metadata", () => {
  it("declares the canonical FAQ URL", () => {
    expect(metadata.alternates?.canonical).toBe(
      "https://getpodprofit.com/faq",
    );
  });

  it("uses the spec title and description", () => {
    expect(metadata.title).toBe("FAQ — PODProfit");
    expect(typeof metadata.description).toBe("string");
    expect(metadata.description).toContain("calculator");
    expect(metadata.description).toContain("Lifetime");
  });
});
