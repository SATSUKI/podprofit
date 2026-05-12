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

describe("/contact alternative-channel aside (PODP-33 follow-up)", () => {
  it("offers email as the only alternative channel and does not surface the support phone", () => {
    // Channel-policy update 2026-05-12 (memory
    // `feedback_contact_channel_policy`): the support phone is only
    // exposed on /legal/tokushoho where statutory disclosure mandates
    // it. /contact is the highest-intent support surface and must
    // route everything to email + the Web form — no tel: link, no
    // display number anywhere on the page.
    const html = renderToStaticMarkup(ContactPage());
    expect(html).toContain("hello@getpodprofit.com");
    expect(html).toContain("mailto:hello@getpodprofit.com");
    expect(html).not.toContain("050-6880-2598");
    expect(html).not.toContain("05068802598");
    expect(html).not.toContain("tel:");
    // The aside must still acknowledge that email + the form land in
    // the same inbox so users don't feel they have to pick the "right"
    // channel — keeps the 3-business-day SLA copy honest.
    expect(html).toContain("3 business days");
  });
});
