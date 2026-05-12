import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ContactPage, { metadata } from "@/app/contact/page";

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

describe("/contact alternative-channel aside (PODP-33)", () => {
  it("renders the 050 phone number and a tel: link alongside the form", () => {
    // CEO acquired the My050 number on 2026-05-12. The Contact page is
    // the highest-intent landing surface for support traffic, so the
    // number is exposed as an alternative channel without de-emphasising
    // the email-first SLA. Keep the display + tel: + hours assertions
    // in lockstep with src/lib/contact.ts.
    const html = renderToStaticMarkup(ContactPage());
    expect(html).toContain("050-6880-2598");
    expect(html).toContain('href="tel:05068802598"');
    expect(html).toContain("Weekdays 10:00-18:00 JST");
    // The aside must still steer users toward email as the SLA-tracked
    // channel — phone is best-effort because My050 is an IP service.
    expect(html.toLowerCase()).toContain("email is the recommended channel");
  });
});
