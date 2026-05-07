import { describe, expect, it } from "vitest";
import { metadata } from "@/app/contact/page";

describe("/contact page metadata", () => {
  it("declares the canonical Contact URL for SEO", () => {
    expect(metadata.alternates?.canonical).toBe(
      "https://getpodprofit.com/contact",
    );
  });

  it("uses a brand-aligned title", () => {
    expect(metadata.title).toBe("Contact — PODProfit");
  });

  it("describes the form's purpose so the SERP snippet sets the right expectation", () => {
    expect(typeof metadata.description).toBe("string");
    const desc = metadata.description as string;
    // The 3-business-day SLA is also baked into the on-page copy and the
    // post-submit confirmation — keep them in sync if any of these change.
    expect(desc).toContain("3 business days");
    expect(desc.toLowerCase()).toContain("refund");
  });

  it("declares OpenGraph metadata with the canonical URL", () => {
    expect(metadata.openGraph?.url).toBe("https://getpodprofit.com/contact");
    expect(metadata.openGraph?.title).toBe("Contact — PODProfit");
  });
});
