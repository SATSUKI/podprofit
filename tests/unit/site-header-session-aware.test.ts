/**
 * PODP-63 — SiteHeader must expose session-aware navigation so users can
 * actually find /login. CEO 2026-05-12: "そもそもこれどこからログインするんですか"
 *
 * The header is the single global nav on every page; if it doesn't show
 * Sign in for anonymous visitors and Account for signed-in users, the
 * /login and /account routes are URL-direct-only — launch-blocker.
 *
 * We mock `createSsrSupabase` so the render is purely a function of
 * "auth state", which is what we actually need to test. Each test re-
 * imports the module under `vi.resetModules()` because the header is
 * imported as a value, not via lazy import.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const ssrMock = vi.fn();

vi.mock("@/lib/supabase/ssr", () => ({
  createSsrSupabase: () => ssrMock(),
}));

import { SiteHeader } from "@/components/site-header";

function authedSsr(email = "user@example.com") {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: "u_1", email } },
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

describe("SiteHeader session-aware nav (PODP-63)", () => {
  beforeEach(() => {
    ssrMock.mockReset();
  });

  it("renders a Sign in link pointing to /login for anonymous visitors", async () => {
    ssrMock.mockResolvedValue(anonymousSsr());

    const html = renderToStaticMarkup(await SiteHeader());

    expect(html).toContain('href="/login"');
    expect(html).toContain(">Sign in<");
    // Must NOT advertise an Account page they can't reach.
    expect(html).not.toContain('href="/account"');
  });

  it("renders an Account link pointing to /account for signed-in users", async () => {
    ssrMock.mockResolvedValue(authedSsr());

    const html = renderToStaticMarkup(await SiteHeader());

    expect(html).toContain('href="/account"');
    expect(html).toContain(">Account<");
    // The signed-in variant must NOT also show Sign in — that's
    // confusing and a regression we have actively shipped before.
    expect(html).not.toContain(">Sign in<");
  });

  it("falls back to anonymous nav when Supabase env is not configured", async () => {
    // createSsrSupabase returns null when env vars are missing — the
    // calculator still works, so the header must still render.
    ssrMock.mockResolvedValue(null);

    const html = renderToStaticMarkup(await SiteHeader());

    expect(html).toContain('href="/login"');
    expect(html).toContain(">Sign in<");
  });

  it("falls back to anonymous nav when auth.getUser() throws (expired JWT, etc.)", async () => {
    ssrMock.mockResolvedValue({
      auth: {
        getUser: async () => {
          throw new Error("JWT expired");
        },
      },
    });

    const html = renderToStaticMarkup(await SiteHeader());

    expect(html).toContain('href="/login"');
    expect(html).toContain(">Sign in<");
    expect(html).not.toContain(">Account<");
  });

  it("preserves the existing Calculator / Pricing / Blog left-side nav (no regression)", async () => {
    ssrMock.mockResolvedValue(anonymousSsr());

    const html = renderToStaticMarkup(await SiteHeader());

    expect(html).toContain('href="/"');
    expect(html).toContain(">Calculator<");
    expect(html).toContain('href="/pricing"');
    expect(html).toContain(">Pricing<");
    expect(html).toContain(
      'href="/blog/how-much-profit-do-pod-sellers-make"',
    );
  });

  it("marks the Sign in / Account link with stable test ids for E2E coverage", async () => {
    // Stable hooks for the post-launch Playwright check that the door is
    // always findable (PODP-63 launch criteria).
    ssrMock.mockResolvedValue(anonymousSsr());
    const anon = renderToStaticMarkup(await SiteHeader());
    expect(anon).toContain('data-testid="nav-signin"');

    ssrMock.mockResolvedValue(authedSsr());
    const authed = renderToStaticMarkup(await SiteHeader());
    expect(authed).toContain('data-testid="nav-account"');
  });
});
