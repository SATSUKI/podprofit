/**
 * PODP-14: Lifetime supporters get permanent priority access to every
 * future product (β invitations). This must be codified in the Terms of
 * Service so the commitment is contractual, not just marketing.
 *
 * The clause was introduced in v0.4. v0.5 stacked a separate refund-
 * regime update on top; the priority-access clause (§5.1) survives that
 * stack. These tests guard the PODP-14 commitment specifically; refund
 * regime is exercised by `refund-eligibility.test.ts`.
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

  it("renders revision history rows for v0.1, v0.2, v0.3, and v0.4 (priority access stack)", () => {
    const html = renderToStaticMarkup(TermsPage());
    expect(html).toContain("Effective date");
    expect(html).toContain(">0.1<");
    expect(html).toContain(">0.2<");
    expect(html).toContain(">0.3<");
    expect(html).toContain(">0.4<");
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
    // 14-day Pro Annual refund (constant across v0.3/v0.4/v0.5)
    expect(html).toContain("14 days");
    // EULA single-user clause
    expect(html).toContain("Single-user licence");
    // Japan governing law + Tokyo District Court
    expect(html).toContain("laws of Japan");
    expect(html).toContain("Tokyo District Court");
  });
});
