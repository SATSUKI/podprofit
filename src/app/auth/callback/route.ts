import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordSignupCompletedIfNew } from "@/lib/analytics/record-signup";

export const runtime = "nodejs";

/**
 * OAuth / magic-link callback.
 *
 * Supabase appends `?code=...` after the user clicks the magic link (PKCE
 * flow — see `lib/supabase/browser.ts` for why we force PKCE). We:
 *   1. Exchange the code for a session cookie (anon client + cookie store).
 *   2. Detect first-time sign-in by upserting `user_profiles` (service-role
 *      client, RLS-bypassed) — see `record-signup.ts`.
 *   3. When the row was created, append `?signup=1` to the redirect target so
 *      the landing page can patch attribution + emit the Cloudflare WA event.
 *
 * The signup event itself is the existence of the `user_profiles` row + the
 * `audit_log` entry written here. Attribution is patched in a second step
 * because Magic Link / OAuth strip the original `document.referrer`.
 *
 * PODP-66 hardening (2026-05-12 launch-blocker — CEO Android Chrome verify
 * showed magic-link click landing back on /login with no session):
 *   - All failure branches now redirect to `/login?error=...` with a stable,
 *     safe error code instead of silently bouncing to `/account`. The old
 *     "fall through to next" behaviour was the proximate cause of the bug
 *     looking like "the magic link didn't do anything".
 *   - Every failure logs to console.error with structured context so the
 *     Vercel log stream is the single source of truth for triage.
 *   - The `?next=` value is validated to be a same-origin path so a crafted
 *     magic-link URL can't open-redirect a victim. Falls back to `/account`.
 */

/** Stable error codes surfaced to /login?error=... — keep narrow for UX. */
type AuthCallbackErrorCode =
  | "missing_code"
  | "config_missing"
  | "exchange_failed"
  | "no_session"
  | "unexpected";

/** Returns true when `path` is safe to redirect into (same-origin, no scheme). */
function isSafeNextPath(path: string): boolean {
  // Reject empty, protocol-relative (`//evil.com`) and absolute URLs.
  if (!path || !path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  // Reject paths that try to escape via backslashes (Chrome treats `/\evil`
  // as protocol-relative in some redirect parsers).
  if (path.startsWith("/\\")) return false;
  return true;
}

function buildLoginErrorRedirect(
  origin: string,
  code: AuthCallbackErrorCode,
  next: string | null,
): URL {
  const target = new URL("/login", origin);
  target.searchParams.set("error", code);
  if (next && isSafeNextPath(next)) {
    target.searchParams.set("next", next);
  }
  return target;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next");
  const next = rawNext && isSafeNextPath(rawNext) ? rawNext : "/account";

  // 0. Supabase may also forward `error` / `error_description` directly when
  // the magic link is expired or already consumed. Surface that to the user
  // instead of swallowing it.
  const supabaseError = url.searchParams.get("error");
  if (supabaseError) {
    const description = url.searchParams.get("error_description");
    console.error("[auth.callback] supabase returned error in query", {
      error: supabaseError,
      description,
    });
    return NextResponse.redirect(
      buildLoginErrorRedirect(url.origin, "exchange_failed", rawNext),
    );
  }

  if (!code) {
    // No code at all usually means the user opened /auth/callback directly
    // or the email client rewrote the link. Land them on /login with a
    // helpful marker rather than the homepage so the next step is obvious.
    console.error("[auth.callback] missing ?code on callback", {
      search: url.search,
    });
    return NextResponse.redirect(
      buildLoginErrorRedirect(url.origin, "missing_code", rawNext),
    );
  }

  const ssr = await createSsrSupabase();
  if (!ssr) {
    // Supabase env not configured. Pre-launch builds shipped before the
    // project was provisioned could hit this; treat as a config error
    // instead of pretending success.
    console.error("[auth.callback] supabase env not configured");
    return NextResponse.redirect(
      buildLoginErrorRedirect(url.origin, "config_missing", rawNext),
    );
  }

  let exchange;
  try {
    exchange = await ssr.auth.exchangeCodeForSession(code);
  } catch (err) {
    console.error("[auth.callback] exchangeCodeForSession threw", err);
    return NextResponse.redirect(
      buildLoginErrorRedirect(url.origin, "unexpected", rawNext),
    );
  }

  if (exchange.error) {
    console.error("[auth.callback] exchangeCodeForSession returned error", {
      message: exchange.error.message,
      status: exchange.error.status,
      name: exchange.error.name,
    });
    return NextResponse.redirect(
      buildLoginErrorRedirect(url.origin, "exchange_failed", rawNext),
    );
  }

  if (!exchange.data.session) {
    console.error("[auth.callback] exchangeCodeForSession returned no session");
    return NextResponse.redirect(
      buildLoginErrorRedirect(url.origin, "no_session", rawNext),
    );
  }

  let isNewSignup = false;
  try {
    const service = createServerSupabase();
    const result = await recordSignupCompletedIfNew(
      service,
      exchange.data.session.user.id,
    );
    isNewSignup = result.isNewSignup;
  } catch (err) {
    // Don't block the user on a measurement failure. The session is already
    // established, so logging is enough — operational alerting (Sentry) will
    // pick this up via console.error.
    console.error("[auth.callback] signup recorder failed", err);
  }

  const redirectUrl = new URL(next, url.origin);
  if (isNewSignup) {
    // Marker the post-callback page reads to fire the attribution POST + the
    // Cloudflare WA event. URL parameter (vs. cookie) keeps this stateless.
    redirectUrl.searchParams.set("signup", "1");
  }
  return NextResponse.redirect(redirectUrl);
}
