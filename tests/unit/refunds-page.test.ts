/**
 * /legal/refunds — public-facing summary of refund policy. v1.3
 * (2026-05-11) realigns with CEO-confirmed cooling-off policy:
 *
 *   - Lifetime: 14-day unconditional refund window (was 7 + 0 launches)
 *   - Pro Monthly / Pro Annual: no-proration; access continues to
 *     period end via Stripe Customer Portal cancellation
 *
 * The legally binding version is in Terms §7; this page must stay in
 * lock-step with that section. These tests guard the new policy text so
 * a future commit cannot silently drift back to the v1.2 wording.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import RefundsPage, { metadata } from "@/app/legal/refunds/page";

function renderToText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToText).join("");
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children;
    return renderToText(children);
  }
  return "";
}

describe("/legal/refunds v1.3 metadata", () => {
  it("surfaces the v1.3 14-day-Lifetime / no-proration summary in metadata.description", () => {
    expect(typeof metadata.description).toBe("string");
    expect(metadata.description).toContain("v1.3");
    expect(metadata.description).toContain("14-day");
    expect(metadata.description).toMatch(/pro-rated|not pro-rated/i);
  });
});

describe("/legal/refunds v1.3 content (2026-05-11 cooling-off update)", () => {
  const text = renderToText(RefundsPage());

  it("publishes the v1.3 / 2026-05-11 stamp (matches the rest of the legal set)", () => {
    expect(text).toContain("Last updated: 2026-05-11");
    expect(text).toContain("Version: 1.3");
  });

  it("[v1.3] Lifetime is refundable within 14 days, no questions asked, with NO launch-count gate", () => {
    // Lifetime section must say "14 days" and "no questions asked".
    expect(text).toMatch(/Lifetime[^]*14 days of purchase[^]*no questions asked/);
    // Regression guard: the old "7 days" Lifetime window must NOT
    // appear, and the "zero times" / "zero launches" gate must be gone
    // from the Lifetime context.
    expect(text).not.toMatch(/Lifetime[^]*Refundable within\s*\S*7 days/);
    expect(text).not.toMatch(/calculator has been launched\s*\S*zero times/);
  });

  it("[v1.3] Pro Monthly section spells out no-proration AND Stripe Customer Portal as the cancellation surface", () => {
    expect(text).toMatch(/Pro Monthly[^]*not pro-rate refunds for partial months/);
    expect(text).toMatch(/Pro Monthly[^]*Stripe Customer Portal/);
  });

  it("[v1.3] Pro Annual is non-pro-rated AND no longer has a 14-day no-questions-asked window", () => {
    // The previous v1.2 wording offered a 14-day no-questions-asked
    // refund for Pro Annual. v1.3 removes it; this test catches
    // accidental re-introduction.
    expect(text).toMatch(/Pro Annual[^]*not pro-rate refunds for partial years/);
    // The exact v1.2 phrase that must NOT appear in the Pro Annual
    // section is "Full refund within 14 days of purchase, no questions
    // asked". Lifetime now uses very similar wording, so we scope the
    // negative assertion to the Pro Annual block by looking for the
    // Pro Annual header and ensuring "Full refund within" does not
    // appear between Pro Annual and the next h2 ("Excel Template").
    const proAnnualBlock = text.match(
      /Pro Annual[\s\S]*?(?=Excel Template|EU \/ UK consumers)/,
    )?.[0];
    expect(proAnnualBlock).toBeDefined();
    expect(proAnnualBlock).not.toContain("Full refund within");
  });

  it("[v1.3] cites the UK/EU statutory basis for the 14-day Lifetime window", () => {
    // Stripe + EU-side counsel readers expect to see the regulations
    // named explicitly so the alignment with EU/UK consumer law is
    // visible without external research.
    expect(text).toMatch(/UK Consumer Contracts.*Regulations 2013/);
    expect(text).toContain("2011/83/EU");
  });

  it("[v1.3] EU/UK section confirms Lifetime no longer needs Art 16(m) consent collection", () => {
    // The Lifetime 14-day window is now offered worldwide
    // unconditionally — it satisfies the EU/UK right of withdrawal
    // directly, so no separate consent-collection step is needed at
    // checkout for Lifetime. (Art 16(m) consent is still collected
    // for the not-yet-on-sale Excel Template / Benchmark Report.)
    expect(text).toMatch(/Lifetime[^]*no separate.*consent-collection/i);
  });
});
