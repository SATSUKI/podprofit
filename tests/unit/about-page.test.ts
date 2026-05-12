import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage, { metadata } from "@/app/about/page";
import sitemap from "@/app/sitemap";
import { SiteFooter } from "@/components/site-footer";

/**
 * /about page is a Stripe risk-review launch-blocker (PODP-41).
 * These tests guard against regressions on:
 *   - canonical metadata (so SERP picks the right URL)
 *   - founder identity copy (so Stripe E-E-A-T review keeps passing)
 *   - JSON-LD Person/Organization graph
 *   - sitemap inclusion (so Google indexes the page)
 *   - footer link (so users discover the page from any LP).
 */
describe("/about page", () => {
  it("declares the canonical About URL and brand-aligned title", () => {
    expect(metadata.alternates?.canonical).toBe(
      "https://getpodprofit.com/about",
    );
    expect(metadata.title).toBe(
      "About PODProfit — Built by a POD seller for POD sellers",
    );
    // Description must mention the founder by name + key positioning so the
    // SERP snippet itself reinforces founder identity (Stripe review reads it).
    expect(typeof metadata.description).toBe("string");
    const desc = metadata.description as string;
    expect(desc).toContain("Satsuki Okazaki");
    expect(desc.toLowerCase()).toContain("vendor-neutral");
  });

  it("renders the founder name, role and bio so Stripe E-E-A-T review can verify identity", async () => {
    const html = renderToStaticMarkup(await AboutPage());
    expect(html).toContain("Satsuki Okazaki");
    expect(html).toContain("Founder");
    // Bio markers — guard the operating-philosophy paragraph that Stripe will read.
    expect(html).toContain("Solo-operated");
    expect(html).toContain("Built in public");
    // Address block — required for legal entity verification.
    expect(html).toContain("MIEUX");
    expect(html).toContain("150-0044");
    // Founder photo is required (Gravatar fallback OK while CEO photo pending).
    expect(html).toContain('alt="Satsuki Okazaki, Founder of PODProfit"');
  });

  it("emits a Person + Organization JSON-LD graph that links to the founder", async () => {
    const html = renderToStaticMarkup(await AboutPage());
    const ldMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(ldMatch, "JSON-LD <script> tag must be present").not.toBeNull();
    const ld = JSON.parse(ldMatch![1]);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(Array.isArray(ld["@graph"])).toBe(true);
    const person = ld["@graph"].find(
      (n: { "@type": string }) => n["@type"] === "Person",
    );
    const org = ld["@graph"].find(
      (n: { "@type": string }) => n["@type"] === "Organization",
    );
    expect(person?.name).toBe("Satsuki Okazaki");
    expect(person?.sameAs).toContain("https://x.com/o_satsuki");
    // GitHub URL must be in sameAs so search engines can build a knowledge panel.
    expect(
      person?.sameAs.some((u: string) => u.includes("github.com")),
    ).toBe(true);
    expect(org?.name).toBe("PODProfit");
    expect(org?.address?.addressCountry).toBe("JP");
    expect(org?.contactPoint?.email).toBe("hello@getpodprofit.com");
  });

  it("[PODP-33 follow-up] never surfaces the support phone on /about (channel-policy: email-only)", async () => {
    // Memory `feedback_contact_channel_policy` (2026-05-12) restricts
    // phone exposure to /legal/tokushoho (statutory disclosure only).
    // /about must funnel visitors to email + Web form because CEO is
    // JP-monolingual and the customer base is mostly English-speaking,
    // and Stripe-risk review reads the JSON-LD ContactPoint for the
    // canonical contact channel. Regression guard: no display number,
    // no tel: link, no phone-related ContactPoint fields anywhere on
    // the rendered page.
    const html = renderToStaticMarkup(await AboutPage());
    expect(html).not.toContain("050-6880-2598");
    expect(html).not.toContain("05068802598");
    expect(html).not.toContain("+815068802598");
    expect(html).not.toContain("tel:");
    const ldMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(ldMatch).not.toBeNull();
    const ld = JSON.parse(ldMatch![1]);
    const org = ld["@graph"].find(
      (n: { "@type": string }) => n["@type"] === "Organization",
    );
    // ContactPoint stays in the graph for E-E-A-T but only as an email
    // channel — phone-shaped properties must all be absent.
    expect(org?.contactPoint?.email).toBe("hello@getpodprofit.com");
    expect(org?.contactPoint?.telephone).toBeUndefined();
    expect(org?.contactPoint?.areaServed).toBeUndefined();
    expect(org?.contactPoint?.availableLanguage).toBeUndefined();
    expect(org?.contactPoint?.hoursAvailable).toBeUndefined();
  });

  it("is included in the sitemap so Google indexes /about", () => {
    const entries = sitemap();
    const about = entries.find(
      (e) => e.url === "https://getpodprofit.com/about",
    );
    expect(about, "/about must appear in the sitemap").toBeDefined();
    expect(about?.priority).toBe(0.7);
    expect(about?.changeFrequency).toBe("monthly");
  });

  it("is reachable from the site-wide footer (so every LP exposes founder identity)", () => {
    const html = renderToStaticMarkup(SiteFooter());
    expect(html).toMatch(/href="\/about"/);
    expect(html).toContain(">About<");
  });

  it("renders the Founding Supporters section + Lifetime priority-access principle (PODP-12 + PODP-14)", async () => {
    const html = renderToStaticMarkup(await AboutPage());
    // PODP-12: section heading + anchor
    expect(html).toContain("Our 100 Founding Supporters");
    expect(html).toContain('id="founding-supporters"');
    // PODP-14: principle wording + Terms link to §5.1 (so the legal source
    // of truth is one click away from the marketing copy).
    expect(html).toContain("permanent priority early access");
    expect(html).toContain("/legal/terms#section-5");
  });
});
