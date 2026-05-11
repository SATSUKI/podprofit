/**
 * PODP-39: Pro CTAs on /pricing must render disabled until
 * `NEXT_PUBLIC_LAUNCH_DATE` (default 2026-06-09). This test renders the
 * page component and asserts the rendered markup, which is the surface
 * that ships to the browser.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mock the data dependencies so the page component runs without a real
// Supabase / network call. We only care about the CTA branching here.
vi.mock("@/lib/lifetime/get-claimed", () => ({
  getLifetimeClaimedCount: async () => 0,
}));

import PricingPage from "@/app/pricing/page";
import { isLaunched } from "@/lib/utils/launch-gate";

describe("/pricing Pro CTA launch gate (PODP-39)", () => {
  it("renders Pro Monthly + Pro Annual as disabled (aria-disabled, no Subscribe link) before launch", async () => {
    const prev = process.env.NEXT_PUBLIC_LAUNCH_DATE;
    process.env.NEXT_PUBLIC_LAUNCH_DATE = "2099-01-01";
    expect(isLaunched()).toBe(false);

    const html = renderToStaticMarkup(await PricingPage());

    // Both Pro CTAs render as Notify-me links pointing at #notify-pro.
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("/pricing#notify-pro");
    expect(html).toContain("Notify me");
    // The Subscribe href must NOT be on the disabled cards. We can't
    // ensure no Subscribe text anywhere, but we assert that the Stripe
    // checkout URLs for Pro plans are not emitted while gated.
    expect(html).not.toContain("/api/stripe/checkout?plan=pro_monthly");
    expect(html).not.toContain("/api/stripe/checkout?plan=pro_yearly");

    // PODP-14: the Lifetime card carries the new permanent-priority bullet.
    expect(html).toContain("Permanent priority early access");

    // Lifetime CTA remains active (the launch gate is Pro-only).
    expect(html).toContain("/api/stripe/checkout?plan=lifetime");

    if (prev !== undefined) {
      process.env.NEXT_PUBLIC_LAUNCH_DATE = prev;
    } else {
      delete process.env.NEXT_PUBLIC_LAUNCH_DATE;
    }
  });

  it("renders Pro Monthly + Pro Annual as active Subscribe CTAs after the launch date", async () => {
    const prev = process.env.NEXT_PUBLIC_LAUNCH_DATE;
    process.env.NEXT_PUBLIC_LAUNCH_DATE = "2000-01-01";
    expect(isLaunched()).toBe(true);

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).toContain("/api/stripe/checkout?plan=pro_monthly");
    expect(html).toContain("/api/stripe/checkout?plan=pro_yearly");
    expect(html).toContain("Subscribe");
    // Disabled label must not appear once launched.
    expect(html).not.toContain('aria-disabled="true"');

    if (prev !== undefined) {
      process.env.NEXT_PUBLIC_LAUNCH_DATE = prev;
    } else {
      delete process.env.NEXT_PUBLIC_LAUNCH_DATE;
    }
  });
});
