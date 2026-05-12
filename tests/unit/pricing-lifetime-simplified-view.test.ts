/**
 * PODP-67 — Lifetime owners get a CTA-suppressed /pricing view.
 *
 * Revision (CEO feedback, 2026-05-12): the initial PODP-67 cut hid
 * three plan cards entirely — but Lifetime owners still need to read
 * the full plan grid when recommending PODProfit to other people. So
 * the cards stay visible; only the Buy CTAs disappear. Final layout
 * for Lifetime owners:
 *
 *   1. Hero header rewritten to "You're a Lifetime member."
 *      + permanent-access summary line.
 *   2. A "Manage account →" banner link routing to /account.
 *   3. The full four-card plan grid (Free / Pro Monthly / Pro Annual /
 *      Lifetime), with:
 *        - Free card keeps its "Try now" link (calculator is free for
 *          everyone, including Lifetime owners — not noise).
 *        - Pro Monthly / Pro Annual show "Included with Lifetime" as
 *          the availability line and have no Buy button.
 *        - Lifetime shows "You're a Lifetime member ✓" and has no Buy
 *          button.
 *   4. No "Notify me when Pro launches" email signup.
 *   5. No refund-policy footnote.
 *
 * Non-Lifetime visitors (anonymous, Free, Pro subscribers) must keep
 * the existing CTA paths — that path is covered by
 * `pricing-lifetime-owner-gate.test.ts` and we only sanity-check the
 * regression direction here.
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

describe("/pricing PODP-67 simplified Lifetime-owner view", () => {
  beforeEach(() => {
    ssrMock.mockReset();
    snapshotMock.mockReset();
    // Post-launch so Pro CTAs would render in their active state for a
    // non-Lifetime visitor — keeps the regression contrast meaningful.
    process.env.NEXT_PUBLIC_LAUNCH_DATE = "2000-01-01";
  });

  it("renders the full four-card grid + member-status banner with no Buy CTAs", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    // Hero rewritten for Lifetime owners. renderToStaticMarkup escapes
    // the JS-literal apostrophe in the h1 to `&#x27;`, while the
    // Lifetime card's availability line keeps the literal apostrophe.
    expect(html).toContain("You&#x27;re a Lifetime member.");
    // The one-line summary from the spec.
    expect(html).toContain(
      "You have permanent access to all current and future PODProfit products. No additional plans needed.",
    );
    // Manage account → /account banner link is present.
    expect(html).toContain("Manage account");
    expect(html).toContain('href="/account"');
    expect(html).toContain('data-testid="lifetime-manage-account"');

    // All four plan cards must still render so the Lifetime owner can
    // reference them when recommending PODProfit to other people.
    expect(html).toContain(">Free</h3>");
    expect(html).toContain(">Pro Monthly</h3>");
    expect(html).toContain(">Pro Annual</h3>");
    expect(html).toContain(">Lifetime</h3>");

    // Free card keeps its "Try now" link — the calculator is free for
    // everyone, including Lifetime owners.
    expect(html).toContain("Try now");

    // Pro Monthly / Pro Annual show "Included with Lifetime" in place
    // of a Buy button.
    expect(html).toContain("Included with Lifetime");

    // Lifetime card shows the member-status line as its availability.
    expect(html).toContain("You&#x27;re a Lifetime member ✓");

    // No checkout URLs for any paid plan (Lifetime owners cannot
    // re-buy and Pro Subscribe must stay suppressed).
    expect(html).not.toContain("/api/stripe/checkout?plan=");
    // No Pro-launch notify form.
    expect(html).not.toContain('id="notify-pro"');
    // No refund-policy footnote.
    expect(html).not.toContain("Lifetime within 14 days");
    // The PlanCard "No signup required" fallback must NOT leak onto
    // the Pro/Lifetime cards just because their CTAs are absent.
    expect(html).not.toContain("No signup required");
  });

  it("keeps the four-card layout for anonymous visitors (regression guard)", async () => {
    ssrMock.mockResolvedValue(anonymousSsr());
    snapshotMock.mockResolvedValue({
      stripeCustomerId: null,
      hasLifetime: false,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    // All four plan card headings present.
    expect(html).toContain(">Free</h3>");
    expect(html).toContain(">Pro Monthly</h3>");
    expect(html).toContain(">Pro Annual</h3>");
    expect(html).toContain(">Lifetime</h3>");

    // The Lifetime simplified-view artefacts must NOT appear here.
    expect(html).not.toContain(
      "You have permanent access to all current and future PODProfit products",
    );
  });

  it("keeps the four-card layout for an active Pro subscriber (no Lifetime entitlement)", async () => {
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

    expect(html).toContain(">Free</h3>");
    expect(html).toContain(">Pro Monthly</h3>");
    expect(html).toContain(">Pro Annual</h3>");
    expect(html).toContain(">Lifetime</h3>");
    expect(html).not.toContain(
      "You have permanent access to all current and future PODProfit products",
    );
  });
});
