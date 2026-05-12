/**
 * PODP-62 — /pricing must NEVER render a Buy CTA for a user who already
 * owns Lifetime. The bug we are guarding against: a previous anonymous
 * Lifetime purchase left `lifetime_seats.user_id = NULL`, so the page
 * showed the regular "Reserve seat" CTA and a signed-in Lifetime member
 * could re-open Stripe Checkout from the pricing card. The fix gates the
 * card on the per-user `getCurrentPlanSnapshot` lookup.
 *
 * We mock both data deps (`getLifetimeClaimedCount` and the
 * snapshot/SSR plumbing) so the rendered markup is the only surface
 * under test — the same surface that ships to the browser.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/lifetime/get-claimed", () => ({
  getLifetimeClaimedCount: async () => 1,
}));

// We control auth + snapshot through these two mocks. Each test sets the
// return values to express "anonymous", "Lifetime owner", or
// "active Pro subscriber".
const ssrMock = vi.fn();
const snapshotMock = vi.fn();

vi.mock("@/lib/supabase/ssr", () => ({
  createSsrSupabase: () => ssrMock(),
}));
vi.mock("@/lib/supabase/server", () => ({
  // The real module reads env vars in a constructor — we only need a
  // stub object that the snapshot mock ignores.
  createServerSupabase: () => ({}),
}));
vi.mock("@/lib/stripe/current-plan", () => ({
  getCurrentPlanSnapshot: (...args: unknown[]) => snapshotMock(...args),
  // Re-export the helper that pricing doesn't use, just to keep the
  // module shape valid for other importers (defensive).
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

describe("/pricing PODP-62 per-user CTA gating", () => {
  beforeEach(() => {
    ssrMock.mockReset();
    snapshotMock.mockReset();
    // Disable the launch gate during these tests so Pro CTAs render the
    // active path — that's how a real signed-in Lifetime owner sees the
    // page after 2026-06-09 and the bug surfaces.
    process.env.NEXT_PUBLIC_LAUNCH_DATE = "2000-01-01";
  });

  it("hides the Lifetime Buy CTA when the signed-in user already owns Lifetime", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    // The Stripe Lifetime checkout URL must NOT be on the page.
    expect(html).not.toContain("/api/stripe/checkout?plan=lifetime");
    // The Hero copy + Lifetime card availability line confirm
    // membership instead (PODP-67). renderToStaticMarkup escapes the
    // JS-literal apostrophe to `&#x27;`.
    expect(html).toContain("You&#x27;re a Lifetime member.");
    expect(html).toContain("You&#x27;re a Lifetime member ✓");
  });

  it("renders the Lifetime Buy CTA for anonymous visitors (regression guard)", async () => {
    ssrMock.mockResolvedValue(anonymousSsr());
    // Snapshot must not be called for anonymous, but tolerate a stray call.
    snapshotMock.mockResolvedValue({
      stripeCustomerId: null,
      hasLifetime: false,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).toContain("/api/stripe/checkout?plan=lifetime");
    expect(html).toContain("Reserve seat");
  });

  it("routes Pro CTAs to the billing portal when the user holds an active Pro subscription", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_pro"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_Pro",
      hasLifetime: false,
      activeProSubscription: {
        id: "sub_1",
        planType: "pro_monthly",
        status: "active",
      },
    });

    const html = renderToStaticMarkup(await PricingPage());

    // Pro Subscribe (which would create a second sub) must be gone.
    expect(html).not.toContain("/api/stripe/checkout?plan=pro_monthly");
    expect(html).not.toContain("/api/stripe/checkout?plan=pro_yearly");
    // The portal link is offered for both Pro cards.
    expect(html).toContain("/api/stripe/portal");
    expect(html).toContain("Manage subscription");
    // Lifetime is still purchasable (Pro→Lifetime upgrade is allowed via
    // the confirm flow; the precheck handles the Stripe cancel-refund).
    expect(html).toContain("/api/stripe/checkout?plan=lifetime");
  });

  it("keeps all four plan cards visible but strips Buy CTAs when the user owns Lifetime (PODP-67 revision)", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    // PODP-67 (revision, 2026-05-12): Lifetime owners still need to see
    // the full plan grid so they can reference plans when recommending
    // PODProfit. So the cards stay visible — only the Buy CTAs are
    // suppressed, replaced by status lines on each card.
    expect(html).toContain(">Free</h3>");
    expect(html).toContain(">Pro Monthly</h3>");
    expect(html).toContain(">Pro Annual</h3>");
    expect(html).toContain(">Lifetime</h3>");

    // None of the paid-plan checkout URLs may appear.
    expect(html).not.toContain("/api/stripe/checkout?plan=pro_monthly");
    expect(html).not.toContain("/api/stripe/checkout?plan=pro_yearly");
    expect(html).not.toContain("/api/stripe/checkout?plan=lifetime");

    // PODP-67 revision 2 (2026-05-12, CEO feedback): the $0 "Try now"
    // CTA on the Free card is also suppressed for Lifetime owners.
    expect(html).not.toMatch(/>\s*Try now\s*</);

    // The Pro Monthly / Pro Annual availability line communicates that
    // Lifetime bundles them — this copy is now expected (not banned).
    expect(html).toContain("Included with Lifetime");
    // Lifetime card availability line confirms membership.
    expect(html).toContain("You&#x27;re a Lifetime member ✓");

    // The Pro-notify email signup is still suppressed for Lifetime
    // owners (no notify-pro anchor).
    expect(html).not.toContain('id="notify-pro"');

    // "Manage account →" banner link is present above the grid.
    expect(html).toContain("Manage account");
    expect(html).toContain('href="/account"');
    expect(html).toContain('data-testid="lifetime-manage-account"');
  });

  it("falls back to anonymous CTAs when SSR / snapshot throws (no per-user gating crash)", async () => {
    ssrMock.mockImplementation(() => {
      throw new Error("supabase env missing");
    });

    const html = renderToStaticMarkup(await PricingPage());

    // Still renders the page, with the standard CTAs intact.
    expect(html).toContain("/api/stripe/checkout?plan=lifetime");
    expect(html).toContain("Reserve seat");
  });
});
