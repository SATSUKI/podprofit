/**
 * /faq Q14 ("What is your refund policy?") — must stay in lock-step
 * with Terms §7 and the /legal/refunds page. v1.3 of the legal set
 * (2026-05-11) updates this question to reflect:
 *
 *   - Lifetime: 14-day unconditional cooling-off (was 7 + 0 launches)
 *   - Pro Monthly / Pro Annual: no-proration via Customer Portal
 *
 * Q14 surfaces in two places: the rendered FAQ section AND the
 * FAQPage JSON-LD schema. Google + Stripe review both read JSON-LD
 * automatically, so the `plain` field (which feeds JSON-LD) must
 * carry the same commitments as the rich answer.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import FaqPage from "@/app/faq/page";

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

describe("/faq Q14 refund question (post-2026-05-11 cooling-off update)", () => {
  const text = renderToText(FaqPage());

  it("[Q14] surfaces the 14-day Lifetime cooling-off in the rendered answer", () => {
    expect(text).toMatch(
      /Lifetime[\s\S]*full refund within 14 days of purchase/i,
    );
    expect(text).toMatch(/no questions asked/i);
  });

  it("[Q14] does NOT advertise the old 7-day + 0-launches Lifetime gate", () => {
    // The phrase "7 days of purchase AND with 0 calculator launches"
    // was the v1.2 wording on /legal/refunds and the matching v1.2
    // Q14 answer. Make sure it cannot regress.
    expect(text).not.toMatch(/7 days of purchase AND with 0 calculator launches/);
    expect(text).not.toMatch(/with 0 calculator launches/);
  });

  it("[Q14] states that Pro Monthly and Pro Annual are not pro-rated", () => {
    expect(text).toMatch(/Pro Monthly[\s\S]*Pro Annual[\s\S]*not pro-rated/i);
  });

  it("[Q14] mentions the Stripe Customer Portal as the cancel surface", () => {
    expect(text).toMatch(/Stripe Customer Portal/);
  });

  it("[Q14] EU/UK guidance reflects that Lifetime no longer requires Art 16(m) consent collection", () => {
    expect(text).toMatch(
      /Lifetime[\s\S]*same unconditional 14-day window[\s\S]*no separate Art 16\(m\)/i,
    );
  });
});
