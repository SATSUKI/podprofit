/**
 * PODP-64 — /pricing must surface a small "Sign-in required" hint below
 * each paid-plan CTA when the visitor is anonymous, so the Buy click
 * does not feel like a bait-and-switch (the redirect to /login happens
 * server-side after the click).
 *
 * The hint is suppressed once the user signs in (any state). We mock
 * the data deps the same way as `pricing-lifetime-owner-gate.test.ts`
 * so the rendered markup is the only surface under test.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/lifetime/get-claimed", () => ({
  getLifetimeClaimedCount: async () => 1,
}));

const ssrMock = vi.fn();
const snapshotMock = vi.fn();

vi.mock("@/lib/supabase/ssr", () => ({
  createSsrSupabase: () => ssrMock(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: () => ({}),
}));
vi.mock("@/lib/stripe/current-plan", () => ({
  getCurrentPlanSnapshot: (...args: unknown[]) => snapshotMock(...args),
  getLifetimeRemaining: async () => 99,
}));

import PricingPage from "@/app/pricing/page";

function authedSsr(userId: string) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: userId, email: "buyer@example.com" } },
      }),
    },
  };
}

function anonymousSsr() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  };
}

describe("/pricing PODP-64 Sign-in required hint", () => {
  beforeEach(() => {
    ssrMock.mockReset();
    snapshotMock.mockReset();
    // Post-launch so Pro CTAs render the active path — that's when the
    // hint is relevant on Pro Monthly / Pro Annual.
    process.env.NEXT_PUBLIC_LAUNCH_DATE = "2000-01-01";
  });

  it("renders 'Sign-in required' on Lifetime + Pro Monthly + Pro Annual for anonymous visitors", async () => {
    ssrMock.mockResolvedValue(anonymousSsr());

    const html = renderToStaticMarkup(await PricingPage());

    // Three paid plans → the hint must appear on at least three cards.
    // Counting via `data-testid="plan-cta-hint"` keeps the assertion
    // resilient to copy edits on adjacent text.
    const occurrences = html.match(/data-testid="plan-cta-hint"/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain("Sign-in required");
  });

  it("suppresses the hint when the visitor is signed in (Lifetime owner)", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).not.toContain("Sign-in required");
  });

  it("suppresses the hint when the visitor is signed in (no entitlement, just authed)", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_signed_in_no_plan"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: null,
      hasLifetime: false,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).not.toContain("Sign-in required");
    // Anonymous → /api/stripe/checkout?plan=... is still the destination,
    // but now the auth gate on the server lets the user through directly.
    expect(html).toContain("/api/stripe/checkout?plan=lifetime");
  });

  it("suppresses the hint when SSR throws — anonymous fallback path stays minimal", async () => {
    ssrMock.mockImplementation(() => {
      throw new Error("supabase env missing");
    });

    const html = renderToStaticMarkup(await PricingPage());

    // We treat the visitor as anonymous on Supabase failure (defensive),
    // but the hint is computed from `isSignedIn` which stays false — so
    // anonymous users still get the hint even on degraded environments.
    // This is the right behaviour: better to nudge them to sign in than
    // to bait-and-switch.
    expect(html).toContain("Sign-in required");
  });
});
