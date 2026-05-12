/**
 * PODP-65 — SiteHeader must not visually break at mobile width.
 *
 * CEO 2026-05-12 reported the right-side `Sign in` pill wrapping as
 * "Sign" / "in" on Android Chrome at ~375px. PODP-63 introduced the
 * pill but did not constrain its text from wrapping; combined with
 * `gap-5` + a full "PODProfit" wordmark + `px-6` the row ran out of
 * horizontal space and the browser broke the pill mid-word.
 *
 * These tests pin the structural invariants that prevent the wrap so
 * a future refactor of the header (e.g. adding a hamburger menu) can
 * still be reviewed against "does the Sign in pill stay on one line
 * at mobile width". We assert on classes/structure rather than pixel
 * layout because the unit test environment has no real layout — the
 * pixel-level check is performed by the Playwright run that ships
 * alongside the launch checklist.
 *
 * Invariants pinned here:
 *   1. `whitespace-nowrap` is present on every nav link AND on the
 *      Sign in / Account pill — this is the actual bug fix.
 *   2. The "PODProfit" wordmark is hidden below `sm` so the left side
 *      reclaims width; the P$ glyph still renders so the brand mark
 *      is visible.
 *   3. The pill keeps a `min-h-[44px]` tap target (WCAG 2.5.5).
 *   4. The container gap shrinks at mobile (`gap-3`) and expands at
 *      `sm` and up (`sm:gap-5`).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const ssrMock = vi.fn();

vi.mock("@/lib/supabase/ssr", () => ({
  createSsrSupabase: () => ssrMock(),
}));

import { SiteHeader } from "@/components/site-header";

function anonymousSsr() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  };
}

function authedSsr() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: "u_1", email: "user@example.com" } },
      }),
    },
  };
}

describe("SiteHeader mobile fit (PODP-65)", () => {
  beforeEach(() => {
    ssrMock.mockReset();
  });

  it("applies whitespace-nowrap to the Sign in pill so it cannot wrap mid-word", async () => {
    // The exact bug: at ~375px the pill was breaking into "Sign" / "in"
    // two-line. `whitespace-nowrap` is the load-bearing fix and removing
    // it would re-introduce the launch-blocker, so we pin it.
    ssrMock.mockResolvedValue(anonymousSsr());

    const html = renderToStaticMarkup(await SiteHeader());

    // Find the Sign in anchor and assert its class set contains the
    // wrap guard. We don't pin the full class string because the rest
    // is decorative.
    const match = html.match(
      /<a[^>]*data-testid="nav-signin"[^>]*class="([^"]*)"/,
    );
    expect(match, "nav-signin anchor must be present").not.toBeNull();
    expect(match![1]).toContain("whitespace-nowrap");
  });

  it("applies whitespace-nowrap to the Account pill so it cannot wrap mid-word", async () => {
    // Same invariant on the signed-in variant — "Account" is one word
    // today so wrap is unlikely, but the test guards against a future
    // rename like "My account" re-introducing the bug.
    ssrMock.mockResolvedValue(authedSsr());

    const html = renderToStaticMarkup(await SiteHeader());

    const match = html.match(
      /<a[^>]*data-testid="nav-account"[^>]*class="([^"]*)"/,
    );
    expect(match, "nav-account anchor must be present").not.toBeNull();
    expect(match![1]).toContain("whitespace-nowrap");
  });

  it("guarantees a 44px tap target on the auth pill (WCAG 2.5.5)", async () => {
    // We squeezed horizontal padding to fit mobile, so the vertical
    // target must come from min-h. Both variants must satisfy it.
    ssrMock.mockResolvedValue(anonymousSsr());
    const anonHtml = renderToStaticMarkup(await SiteHeader());
    const anonMatch = anonHtml.match(
      /<a[^>]*data-testid="nav-signin"[^>]*class="([^"]*)"/,
    );
    expect(anonMatch![1]).toContain("min-h-[44px]");

    ssrMock.mockResolvedValue(authedSsr());
    const authedHtml = renderToStaticMarkup(await SiteHeader());
    const authedMatch = authedHtml.match(
      /<a[^>]*data-testid="nav-account"[^>]*class="([^"]*)"/,
    );
    expect(authedMatch![1]).toContain("min-h-[44px]");
  });

  it("hides the PODProfit wordmark below `sm` while keeping the P$ glyph visible", async () => {
    // Reclaiming the wordmark width on small screens is what lets the
    // right side fit without a hamburger; if a future refactor removes
    // the responsive utility, the row will overflow at 320–375px and
    // we want the test to flag that before deploy.
    ssrMock.mockResolvedValue(anonymousSsr());

    const html = renderToStaticMarkup(await SiteHeader());

    // The wordmark span must carry `hidden sm:inline`.
    expect(html).toMatch(
      /<span class="hidden sm:inline">PODProfit<\/span>/,
    );
    // The P$ glyph must NOT be hidden — it's the only brand mark left
    // at mobile width. (react-dom serializes `aria-hidden` as ="true".)
    const glyphMatch = html.match(
      /<span aria-hidden="true" class="([^"]*)">\s*P\$\s*<\/span>/,
    );
    expect(glyphMatch, "P$ glyph must be present").not.toBeNull();
    expect(glyphMatch![1]).not.toContain("hidden");
  });

  it("uses a smaller nav gap at mobile and expands at `sm` and up", async () => {
    // gap-5 alone overflows at 375px. We need gap-3 base + sm:gap-5 so
    // desktop spacing is unchanged. Pin both halves so a refactor can't
    // silently drop the responsive variant.
    ssrMock.mockResolvedValue(anonymousSsr());

    const html = renderToStaticMarkup(await SiteHeader());

    const navMatch = html.match(/<nav[^>]*class="([^"]*)"/);
    expect(navMatch, "nav element must be present").not.toBeNull();
    expect(navMatch![1]).toContain("gap-3");
    expect(navMatch![1]).toContain("sm:gap-5");
  });

  it("applies whitespace-nowrap to Calculator and Pricing so they cannot wrap either", async () => {
    // Sign in was the visible failure CEO caught, but the same row also
    // contains "Calculator" and "Pricing"; pinning nowrap on all of them
    // prevents the next aspect-ratio regression from cropping up.
    //
    // react-dom serializes attributes class-before-href, so we match the
    // anchor by its trailing text rather than guessing attribute order.
    ssrMock.mockResolvedValue(anonymousSsr());

    const html = renderToStaticMarkup(await SiteHeader());

    const calcMatch = html.match(
      /<a class="([^"]*)" href="\/">Calculator<\/a>/,
    );
    expect(calcMatch, "Calculator link must be present").not.toBeNull();
    expect(calcMatch![1]).toContain("whitespace-nowrap");

    const priceMatch = html.match(
      /<a class="([^"]*)" href="\/pricing">Pricing<\/a>/,
    );
    expect(priceMatch, "Pricing link must be present").not.toBeNull();
    expect(priceMatch![1]).toContain("whitespace-nowrap");
  });
});
