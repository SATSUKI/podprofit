/**
 * PODP-66 — magic-link session establishment + detailed error handling.
 *
 * CEO 2026-05-12 Android Chrome verification surfaced a launch-blocker:
 * clicking the magic link landed back on /login with no session. Root
 * cause was a mix of (a) the browser client defaulting to the legacy
 * implicit flow (hash fragment, server can't read) and (b) the callback
 * silently bouncing all error paths to /account so the user couldn't
 * tell the link had failed.
 *
 * These tests pin the post-fix contract via source-text inspection (the
 * route boots a real Supabase SSR client which needs env to instantiate,
 * so runtime exec isn't tractable in vitest). The contract:
 *
 *   1. Every failure branch redirects to `/login?error=<code>` with one
 *      of a closed set of codes — never a silent bounce to /account.
 *   2. Each failure branch logs to `console.error` so the Vercel stream
 *      is the single source of triage truth.
 *   3. `?next=` is validated as same-origin (open-redirect guard).
 *   4. Supabase-forwarded `?error=` (expired / consumed link) is
 *      surfaced via the same `/login?error=` channel.
 *   5. PKCE flow is enforced by the browser client (`createBrowserClient`
 *      from `@supabase/ssr`, not the bare `createClient`).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CALLBACK_PATH = path.resolve(
  __dirname,
  "../../src/app/auth/callback/route.ts",
);
const LOGIN_PAGE_PATH = path.resolve(
  __dirname,
  "../../src/app/login/page.tsx",
);
const BROWSER_CLIENT_PATH = path.resolve(
  __dirname,
  "../../src/lib/supabase/browser.ts",
);
const LOGIN_FORM_PATH = path.resolve(
  __dirname,
  "../../src/components/login-form.tsx",
);

const callbackSource = readFileSync(CALLBACK_PATH, "utf8");
const loginSource = readFileSync(LOGIN_PAGE_PATH, "utf8");
const browserSource = readFileSync(BROWSER_CLIENT_PATH, "utf8");
const loginFormSource = readFileSync(LOGIN_FORM_PATH, "utf8");

describe("/auth/callback — PODP-66 robustness", () => {
  it("redirects every failure branch to /login?error=, never a silent /account bounce", () => {
    // The helper must exist and be the single channel for failure paths.
    expect(callbackSource).toContain("buildLoginErrorRedirect");
    // The redirect target must be /login (not /account, not /).
    expect(callbackSource).toMatch(
      /new URL\(["']\/login["']\s*,\s*[a-zA-Z_.]+\)/,
    );
    // Each of the closed-set error codes must be wired in.
    for (const code of [
      "missing_code",
      "config_missing",
      "exchange_failed",
      "no_session",
      "unexpected",
    ]) {
      expect(callbackSource).toContain(`"${code}"`);
    }
  });

  it("logs detailed context to console.error on every failure branch", () => {
    // At minimum: missing code, supabase env missing, exchange thrown,
    // exchange returned error, no session, supabase forwarded error.
    const errorLogs = callbackSource.match(/console\.error\(/g) ?? [];
    expect(errorLogs.length).toBeGreaterThanOrEqual(6);
    // Logs must be tagged so they are greppable in Vercel.
    expect(callbackSource).toContain("[auth.callback]");
  });

  it("validates `?next=` is a same-origin path before honoring it", () => {
    expect(callbackSource).toContain("isSafeNextPath");
    // The validator must reject protocol-relative URLs (the classic
    // open-redirect vector for `next=//evil.com`).
    expect(callbackSource).toMatch(/startsWith\(["']\/\/["']\)/);
    // And require a leading slash (rejects `next=https://evil.com`).
    expect(callbackSource).toMatch(/startsWith\(["']\/["']\)/);
  });

  it("surfaces Supabase-forwarded `error` / `error_description` query params", () => {
    // Some failure modes (expired link, already-consumed code) come back
    // as `?error=...&error_description=...` on the callback URL. The
    // route must catch that before trying to exchange a missing code.
    expect(callbackSource).toMatch(/searchParams\.get\(["']error["']\)/);
    expect(callbackSource).toMatch(
      /searchParams\.get\(["']error_description["']\)/,
    );
  });

  it("treats a missing session on success path as a failure (not silent OK)", () => {
    // Even if `exchange.error` is null, an absent `exchange.data.session`
    // must redirect to /login?error=no_session — pre-fix this branch
    // fell through to /account with no cookie, looking identical to the
    // not-signed-in state.
    expect(callbackSource).toContain("no_session");
    expect(callbackSource).toMatch(/exchange\.data\.session/);
  });
});

describe("/login — PODP-66 error surfacing", () => {
  it("reads `error` from searchParams and shows a user-facing message", () => {
    expect(loginSource).toMatch(/searchParams/);
    expect(loginSource).toContain("ERROR_MESSAGES");
    // The page must wire a role=alert so screen readers announce it,
    // and a stable testid for e2e.
    expect(loginSource).toContain('role="alert"');
    expect(loginSource).toContain('data-testid="login-callback-error"');
  });

  it("ships a copy entry for each error code emitted by the callback", () => {
    for (const code of [
      "missing_code",
      "config_missing",
      "exchange_failed",
      "no_session",
      "unexpected",
    ]) {
      expect(loginSource).toContain(code);
    }
  });

  it("does not leak raw stack traces or supabase internals in the copy", () => {
    // Defensive: ensure we don't render `error.message` directly.
    expect(loginSource).not.toMatch(/\{error\.message\}/);
    expect(loginSource).not.toContain("AuthApiError");
  });
});

describe("browser supabase client — PODP-66 PKCE flow enforcement", () => {
  it("uses createBrowserClient from @supabase/ssr (NOT bare createClient)", () => {
    // The bare `createClient` defaults to the implicit flow and stores
    // the session in localStorage — invisible to the SSR cookie reader.
    // This was the proximate cause of the launch-blocker.
    expect(browserSource).toContain('from "@supabase/ssr"');
    expect(browserSource).toContain("createBrowserClient");
    // Negative assertion: the legacy import is gone.
    expect(browserSource).not.toMatch(
      /import\s*\{[^}]*createClient[^}]*\}\s*from\s*["']@supabase\/supabase-js["']/,
    );
  });
});

describe("LoginForm — PODP-66 ?next= round-trip", () => {
  it("encodes `next` into the magic-link callback URL", () => {
    // The form receives an optional `next` prop and must thread it
    // through `emailRedirectTo` so the callback can read it after the
    // round-trip. The check guards against accidental drift.
    expect(loginFormSource).toContain("next");
    expect(loginFormSource).toContain('searchParams.set("next"');
    expect(loginFormSource).toContain("emailRedirectTo");
  });

  it("rejects open-redirect-style `next` values before forwarding", () => {
    // The client must apply the same protocol-relative / non-slash
    // guard the server does, so a crafted Sign-in link can't smuggle
    // an external URL into `emailRedirectTo`.
    expect(loginFormSource).toMatch(/startsWith\(["']\/["']\)/);
    expect(loginFormSource).toMatch(/startsWith\(["']\/\/["']\)/);
  });
});
