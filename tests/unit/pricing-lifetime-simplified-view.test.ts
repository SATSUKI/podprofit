/**
 * PODP-67 — Lifetime owners get a simplified /pricing view.
 *
 * The CEO's verification (2026-05-12) flagged the four-card layout
 * ("Lifetime status ✓ + Free Try + Pro Monthly Included + Pro Annual
 * Included") as overly noisy for a user who already owns the top tier.
 * The new layout for Lifetime owners is:
 *
 *   1. Hero header rewritten to "You're a Lifetime member."
 *   2. A single member-status card with a one-line summary explaining
 *      they have permanent access to all current + future products.
 *   3. A "Manage account →" link routing to /account.
 *   4. No Pro / Free / Lifetime "Buy" cards.
 *   5. No "Notify me when Pro launches" email signup.
 *   6. No refund-policy footnote (irrelevant for a Lifetime member).
 *
 * Non-Lifetime visitors (anonymous, Free, Pro subscribers) must keep
 * the existing four-card grid — that path is covered by
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

  it("renders only the member-status card + summary line + Manage account link", async () => {
    ssrMock.mockResolvedValue(authedSsr("user_owns_lifetime"));
    snapshotMock.mockResolvedValue({
      stripeCustomerId: "cus_X",
      hasLifetime: true,
      activeProSubscription: null,
    });

    const html = renderToStaticMarkup(await PricingPage());

    // Hero rewritten for Lifetime owners. renderToStaticMarkup escapes
    // the JS-literal apostrophe in the h1 to `&#x27;`, while the JSX
    // entity `&rsquo;` in the member-status card renders as the literal
    // U+2019 right-single-quote (’). Both flavours are asserted below.
    expect(html).toContain("You&#x27;re a Lifetime member.");
    expect(html).toContain("You’re a Lifetime member ✓");
    // The one-line summary from the spec.
    expect(html).toContain(
      "You have permanent access to all current and future PODProfit products. No additional plans needed.",
    );
    // Manage account → /account link is present.
    expect(html).toContain("Manage account");
    expect(html).toContain('href="/account"');

    // The three other plan cards must not render.
    expect(html).not.toContain(">Free</h3>");
    expect(html).not.toContain(">Pro Monthly</h3>");
    expect(html).not.toContain(">Pro Annual</h3>");

    // No checkout URLs for any plan (Lifetime owners cannot re-buy).
    expect(html).not.toContain("/api/stripe/checkout?plan=");
    // No Pro-launch notify form.
    expect(html).not.toContain('id="notify-pro"');
    // No refund-policy footnote.
    expect(html).not.toContain("Lifetime within 14 days");
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
