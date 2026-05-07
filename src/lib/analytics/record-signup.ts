import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side recorder for the `signup_completed` event.
 *
 * Per `measurement-spec-v1.md` §1.1 the canonical signal is the first
 * `user_profiles` row for an `auth.users.id`. This helper:
 *
 *   1. Looks up the existing profile (anti-replay — re-running the auth
 *      callback for an established user must NOT emit the event again).
 *   2. If the profile is missing, inserts it with `signup_method` = NULL and
 *      writes an `audit_log` row with `action='signup_completed'`.
 *
 * The attribution columns (`signup_method`, `signup_referrer_host`) are
 * left NULL here on purpose: the click-time context lives in the browser's
 * `sessionStorage` (see `signup-attribution.ts`) and is patched in via the
 * `/api/auth/signup-event` POST that fires from the post-callback page.
 *
 * This split keeps the callback redirect fast and avoids losing the signup
 * event when the browser stash is empty (private mode, manual URL paste).
 */

export interface RecordSignupResult {
  /** True when this call created the `user_profiles` row. */
  isNewSignup: boolean;
  /** The user_profiles.user_id we acted on (echoed for callers / tests). */
  userId: string;
}

export async function recordSignupCompletedIfNew(
  supabase: SupabaseClient,
  userId: string,
): Promise<RecordSignupResult> {
  // Step 1: detect new vs returning. The service-role key bypasses RLS so
  // .maybeSingle() reflects the true row count.
  const { data: existing, error: selectError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    // Don't swallow: the caller should decide whether to log + continue.
    throw new Error(`user_profiles lookup failed: ${selectError.message}`);
  }

  if (existing) {
    return { isNewSignup: false, userId };
  }

  // Step 2: insert the profile. signup_method / referrer are populated later
  // by `/api/auth/signup-event`; leaving them NULL is acceptable per spec
  // (NoGo only triggers when the profile row itself is absent).
  const { error: insertError } = await supabase
    .from("user_profiles")
    .insert({ user_id: userId });

  if (insertError) {
    // 23505 = unique_violation: another concurrent callback won the race.
    // Treat that as "already created", not a new signup.
    if (insertError.code === "23505") {
      return { isNewSignup: false, userId };
    }
    throw new Error(`user_profiles insert failed: ${insertError.message}`);
  }

  // Step 3: audit log. Best-effort — a failure here MUST NOT mask the
  // successful profile creation (the profile row itself is the source of
  // truth for the event per measurement-spec §1.1). Errors are surfaced to
  // the caller for logging only.
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "signup_completed",
    metadata: { source: "auth_callback" },
  });

  if (auditError) {
    // Re-throw so the caller can log; the profile insert already committed.
    // Tests assert on this path.
    throw new Error(`audit_log insert failed: ${auditError.message}`);
  }

  return { isNewSignup: true, userId };
}

export interface AttributionPatch {
  signup_method: "magic_link" | "google";
  signup_referrer_host: string | null;
}

/**
 * Patch the attribution columns onto an existing `user_profiles` row.
 *
 * Idempotency: only updates rows that still have NULL `signup_method` so
 * a replay of the `/api/auth/signup-event` endpoint can't overwrite an
 * earlier value (e.g. a re-login from a different referrer).
 */
export async function patchSignupAttribution(
  supabase: SupabaseClient,
  userId: string,
  patch: AttributionPatch,
): Promise<{ updated: boolean }> {
  // Defensive: enforce the 64-char cap one more time at the boundary.
  const referrerHost = patch.signup_referrer_host
    ? patch.signup_referrer_host.slice(0, 64)
    : null;

  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      signup_method: patch.signup_method,
      signup_referrer_host: referrerHost,
    })
    .eq("user_id", userId)
    .is("signup_method", null)
    .select("user_id");

  if (error) {
    throw new Error(`user_profiles attribution update failed: ${error.message}`);
  }

  return { updated: Array.isArray(data) && data.length > 0 };
}
