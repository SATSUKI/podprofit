/**
 * PODP-67 (revision, 2026-05-12) — Lifetime owner sees all four plan
 * cards (so they can reference plan details when recommending PODProfit
 * to others), with Buy CTAs suppressed and replaced by status lines.
 *
 * This test focuses on the per-card surface: the existing
 * `pricing-lifetime-owner-gate.test.ts` already covers the
 * checkout-URL absence and the member banner, so here we drill into
 * "card is visible AND its features list is intact AND it has no
 * button/link looking like a Buy CTA".
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

describe("/pricing PODP-67 revision — Lifetime owner card visibility", () => {
  beforeEach(() => {
    ssrMock.mockReset();
    snapshotMock.mockReset();
    // Post-launch so Pro CTAs would render in their active state for a
    // non-Lifetime visitor — keeps the regression contrast meaningful.
    process.env.NEXT_PUBLIC_LAUNCH_DATE = "2000-01-01";
  });

  it("keeps the Free card visible but suppresses the $0 Try now CTA for Lifetime owners (revision 2, 2026-05-12)", async () => {
    // PODP-67 revision 2 (CEO feedback 2026-05-12): the Free card stays
    // on the grid so a Lifetime owner can reference the calculator copy
    // when recommending PODProfit, but the "Try now" button itself is
    // noise — they already have access to everything. So we expect:
    //   - Free heading + tagline + feature list survive
    //   - "Try now" button is GONE
    //   - href="/" Try-now link is GONE
    //   - availability line on Free reads "Included with Lifetime" too
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    // Free card heading + tagline + feature list survive.
    expect(html).toContain(">Free</h3>");
    expect(html).toContain("Forever. No signup.");
    expect(html).toContain("Full calculator (all products, vendors, currencies)");

    // Try now button + href to "/" are GONE for Lifetime owners.
    expect(html).not.toMatch(/>\s*Try now\s*</);
    expect(html).not.toMatch(/href="\/"[^>]*>\s*Try now/);

    // Availability line now matches the Pro cards.
    // "Included with Lifetime" appears at least 3 times — Free + Pro
    // Monthly + Pro Annual.
    const includedMatches = html.match(/Included with Lifetime/g) ?? [];
    expect(includedMatches.length).toBeGreaterThanOrEqual(3);
  });

  it("still renders the Free Try now CTA for anonymous visitors (regression guard)", async () => {
    // Anonymous visitors keep the existing Try now → / link on the Free
    // card — only Lifetime owners lose it.
    ssrMock.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
    });

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).toContain(">Free</h3>");
    expect(html).toContain("Try now");
    expect(html).toMatch(/href="\/"[^>]*>\s*Try now/);
  });

  it("renders the Pro Monthly / Pro Annual feature lists unchanged + status line, no Subscribe / Notify / Manage subscription buttons", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    // Pro Monthly + Pro Annual headings present.
    expect(html).toContain(">Pro Monthly</h3>");
    expect(html).toContain(">Pro Annual</h3>");

    // Their feature copy survives — the user references these when
    // explaining what the plans bundle.
    expect(html).toContain("Save unlimited calculations");
    expect(html).toContain("CSV export of calculation history");
    expect(html).toContain("Annual billing — pay yearly, save 27%");

    // Status copy on each Pro card.
    // "Included with Lifetime" appears on the availability line of
    // both Pro Monthly and Pro Annual.
    const includedMatches = html.match(/Included with Lifetime/g) ?? [];
    expect(includedMatches.length).toBeGreaterThanOrEqual(2);

    // No paid CTAs that would normally show on a Pro card.
    expect(html).not.toContain("Subscribe</");
    expect(html).not.toContain("Notify me</");
    expect(html).not.toContain("Manage subscription</");
    expect(html).not.toContain("/api/stripe/portal");
  });

  it("renders the Lifetime card with feature list + status line, no Reserve seat / Sold out / Buy", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).toContain(">Lifetime</h3>");
    // Lifetime feature copy survives.
    expect(html).toContain("Founding member status — name credit");
    expect(html).toContain("One-time payment, no subscription");

    // Status line replaces the Buy CTA on the Lifetime card.
    expect(html).toContain("You&#x27;re a Lifetime member ✓");

    // No legacy CTAs.
    expect(html).not.toContain("Reserve seat");
    expect(html).not.toContain("Sold out");
    expect(html).not.toContain("/api/stripe/checkout?plan=lifetime");
  });

  it("emits no 'Sign-in required' hint for a signed-in Lifetime owner (cross-feature guard)", async () => {
    // Belt-and-suspenders: PODP-64's hint is keyed off `!isSignedIn`,
    // but a future refactor could accidentally re-enable it. This test
    // fails fast if that ever regresses for a Lifetime owner.
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).not.toContain("Sign-in required");
    expect(html).not.toContain('data-testid="plan-cta-hint"');
  });
});
