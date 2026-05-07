import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordSignupCompletedIfNew } from "@/lib/analytics/record-signup";

export const runtime = "nodejs";

/**
 * OAuth / magic-link callback.
 *
 * Supabase appends `?code=...` after the user clicks the magic link. We:
 *   1. Exchange the code for a session cookie (anon client + cookie store).
 *   2. Detect first-time sign-in by upserting `user_profiles` (service-role
 *      client, RLS-bypassed) — see `record-signup.ts`.
 *   3. When the row was created, append `?signup=1` to the redirect target so
 *      the landing page can patch attribution + emit the Cloudflare WA event.
 *
 * The signup event itself is the existence of the `user_profiles` row + the
 * `audit_log` entry written here. Attribution is patched in a second step
 * because Magic Link / OAuth strip the original `document.referrer`.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account";

  if (!code) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  const ssr = await createSsrSupabase();
  if (!ssr) {
    // Supabase env not configured — preserve existing pre-launch behaviour.
    return NextResponse.redirect(new URL(next, url.origin));
  }

  const { data: exchange, error: exchangeError } =
    await ssr.auth.exchangeCodeForSession(code);
  if (exchangeError || !exchange.session) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  let isNewSignup = false;
  try {
    const service = createServerSupabase();
    const result = await recordSignupCompletedIfNew(
      service,
      exchange.session.user.id,
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
