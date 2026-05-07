"use client";

import { useEffect } from "react";
import { consumeSignupAttribution } from "@/lib/analytics/signup-attribution";
import { trackCfEvent } from "@/lib/analytics/cloudflare";

/**
 * Mounted on the post-callback landing page (currently `/account`).
 *
 * Reads the `?signup=1` flag set by `/auth/callback` (only present on
 * first sign-in), patches `signup_method` + `signup_referrer_host` onto
 * the freshly-created `user_profiles` row, and fires a single Cloudflare
 * Web Analytics event.
 *
 * Idempotency:
 *   - The endpoint update guard (`signup_method IS NULL`) makes the POST
 *     a no-op for returning users, so a stray `?signup=1` (manual URL
 *     edit) is harmless.
 *   - `consumeSignupAttribution()` clears the stash on read, so a refresh
 *     of /account?signup=1 re-fires the CF event but the DB patch is a
 *     no-op (matches measurement-spec §1.1's "first-write wins").
 *
 * No fetch is made when `?signup=1` is absent.
 */
export function SignupEventEmitter({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const stash = consumeSignupAttribution();
    const method = stash?.signup_method ?? "magic_link";
    const referrerHost = stash?.signup_referrer_host ?? null;

    // Cloudflare WA event — props are categorical / non-PII.
    trackCfEvent("signup_completed", {
      method,
      // Only the categorical "had a referrer" flag — don't ship the host
      // string itself to Cloudflare to keep PII surface tiny.
      has_referrer: referrerHost !== null,
    });

    // Best-effort attribution patch — fire-and-forget (the auth callback
    // already inserted the user_profiles row, so even if this fails the
    // signup_completed event survives via the audit_log row).
    void fetch("/api/auth/signup-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signup_method: method,
        signup_referrer_host: referrerHost,
      }),
    }).catch(() => {
      // Swallow — no user-facing failure mode.
    });
  }, [enabled]);

  return null;
}
