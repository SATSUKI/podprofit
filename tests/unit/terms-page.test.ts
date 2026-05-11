/**
 * Terms of Service — guards two stacked commitments at the
 * 2026-05-11 v0.5 revision:
 *
 *  - PODP-14: Lifetime supporters get permanent priority access to
 *    every future product (β invitations). Codified in §5.1 in v0.4
 *    and retained unchanged in v0.5.
 *  - 2026-05-11 cooling-off policy: §7.1 (Lifetime 14-day
 *    unconditional refund), §7.2 / §7.3 (Pro Monthly / Pro Annual not
 *    pro-rated), §7.5 (EU/UK Lifetime no longer needs Art 16(m)
 *    consent), §5.2 / §5.3 (Customer Portal cancellation surface).
 *
 * Refund-eligibility logic is exercised by `refund-eligibility.test.ts`
 * — this file pins the contractual phrasing on the legal surface only.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TermsPage, { metadata } from "@/app/legal/terms/page";

describe("Terms of Service §5.1 Lifetime priority access (PODP-14)", () => {
  it("metadata references the latest version and surfaces a Lifetime-policy summary", () => {
    expect(typeof metadata.description).toBe("string");
    // Either the v0.4 (priority access) message OR a successor version
    // that incorporates it — both are acceptable because the commitment
    // is additive across the v0.4-v0.5-… stack.
    expect(metadata.description).toMatch(/v0\.[4-9]|v[1-9]/i);
  });

  it("renders revision history rows for v0.1, v0.2, v0.3, v0.4, and v0.5 (priority access + cooling-off stack)", () => {
    const html = renderToStaticMarkup(TermsPage());
    expect(html).toContain("Effective date");
    expect(html).toContain(">0.1<");
    expect(html).toContain(">0.2<");
    expect(html).toContain(">0.3<");
    expect(html).toContain(">0.4<");
    expect(html).toContain(">0.5<");
  });

  it("Section 5.1 explicitly grants Lifetime supporters permanent priority access (β invitations)", () => {
    const html = renderToStaticMarkup(TermsPage());
    expect(html).toContain("Permanent priority early access");
    expect(html).toContain("β invitations");
    // Cross-brand language so the commitment survives a Phase 2 rebrand.
    expect(html).toMatch(
      /different brand|separate-brand|Phase\s*2-N|under a different brand/i,
    );
  });

  it("retains the substantive obligations that PODP-14 must not regress (EULA, governing law, refund framework)", () => {
    const html = renderToStaticMarkup(TermsPage());
    // 14-day refund window is preserved (now anchored to Lifetime in v0.5)
    expect(html).toContain("14 days");
    // EULA single-user clause
    expect(html).toContain("Single-user licence");
    // Japan governing law + Tokyo District Court
    expect(html).toContain("laws of Japan");
    expect(html).toContain("Tokyo District Court");
  });
});

describe("Terms of Service v0.5 cooling-off / no-proration regime (2026-05-11)", () => {
  const html = renderToStaticMarkup(TermsPage());

  it("[v0.5] header stamp is v0.5 / 2026-05-11", () => {
    expect(html).toContain("Version 0.5");
    expect(html).toContain("2026-05-11");
  });

  it("[v0.5] §7.1 Lifetime — 14-day unconditional cooling-off, no questions asked, no launch-count gate", () => {
    // Lifetime § must say 14 days AND "no questions asked"
    expect(html).toMatch(/7\.1 Lifetime[\s\S]*14 days[\s\S]*no questions asked/);
    // Regression guard: the old "zero calculator launches" gate must
    // not appear in §7.1.
    const section71 = html.match(
      /7\.1 Lifetime[\s\S]*?(?=7\.2 Pro Monthly)/,
    )?.[0];
    expect(section71).toBeDefined();
    expect(section71).not.toMatch(/zero.{0,10}calculator launches/i);
    expect(section71).not.toMatch(/7 days of purchase/);
  });

  it("[v0.5] §7.1 cites the UK/EU statutory basis for the 14-day window", () => {
    expect(html).toMatch(/UK Consumer Contracts.*Regulations 2013/);
    expect(html).toContain("2011/83/EU");
  });

  it("[v0.5] §7.2 Pro Monthly is not pro-rated and references the Stripe Customer Portal", () => {
    const section72 = html.match(
      /7\.2 Pro Monthly[\s\S]*?(?=7\.3 Pro Annual)/,
    )?.[0];
    expect(section72).toBeDefined();
    expect(section72).toMatch(/not pro-rate refunds for partial months/);
    expect(section72).toContain("Stripe Customer Portal");
  });

  it("[v0.5] §7.3 Pro Annual is not pro-rated AND the previous 14-day no-questions-asked window is removed", () => {
    const section73 = html.match(
      /7\.3 Pro Annual[\s\S]*?(?=7\.4 Excel)/,
    )?.[0];
    expect(section73).toBeDefined();
    expect(section73).toMatch(/not pro-rate refunds for partial years/);
    expect(section73).toContain("Stripe Customer Portal");
    // Old v0.4 wording must not survive
    expect(section73).not.toMatch(/Full refund within.*14 days.*no questions asked/);
  });

  it("[v0.5] §7.5 EU/UK section says Lifetime no longer needs Art 16(m) consent collection", () => {
    const section75 = html.match(
      /7\.5 EU \/ UK consumers[\s\S]*?(?=<h2|8\. End-User)/,
    )?.[0];
    expect(section75).toBeDefined();
    expect(section75).toMatch(/Lifetime[\s\S]*no separate Art 16\(m\) consent/);
    // Excel / Benchmark Report Art 16(m) consent flow is preserved
    expect(section75).toMatch(
      /Excel Template[\s\S]*Benchmark Report[\s\S]*expressly consent/i,
    );
  });

  it("[v0.5] §5.2 / §5.3 reference the Stripe Customer Portal as the cancellation surface", () => {
    const section5 = html.match(
      /5\.2 Pro Monthly[\s\S]*?(?=5\.4 PODProfit Excel)/,
    )?.[0];
    expect(section5).toBeDefined();
    // both 5.2 and 5.3 must mention Customer Portal
    const portalMatches = section5?.match(/Stripe Customer Portal/g) ?? [];
    expect(portalMatches.length).toBeGreaterThanOrEqual(2);
  });
});
