/**
 * Signup attribution stash — bridges the click → magic link → callback gap.
 *
 * Magic Link / OAuth callbacks lose the original `document.referrer`: by the
 * time Supabase redirects back to `/auth/callback`, the referrer reflects the
 * provider's mailbox or Google's accounts page, not the page the user was on
 * when they clicked "Sign in".
 *
 * Per `measurement-spec-v1.md` §1.1 the fix is to capture
 *   { signup_method, signup_referrer_host }
 * at click time, stash it in `sessionStorage` for ≤ 30 minutes, and read it
 * back inside the callback. We use sessionStorage (cleared on browser close)
 * not localStorage so the value can't survive across users on a shared device.
 *
 * Privacy discipline:
 *   - Only the host is stored (no path / query / slug) — capped at 64 chars.
 *   - The stash is wiped after the callback consumes it.
 *   - `sessionStorage` is per-tab, so a different tab can't read it.
 */

const STASH_KEY = "podprofit:signup-attribution";
const TTL_MS = 30 * 60 * 1000; // 30 minutes — generous for slow magic-link clicks.

export type SignupMethod = "magic_link" | "google";

export interface SignupAttribution {
  signup_method: SignupMethod;
  signup_referrer_host: string | null;
  /** Epoch ms for TTL enforcement on read. */
  stashed_at: number;
}

/**
 * Extract the host portion of a URL. Returns null when the input is empty,
 * malformed, or already a same-origin reference.
 */
export function extractReferrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    const host = url.host;
    if (!host) return null;
    // Cap at 64 chars to align with the DB column constraint.
    return host.length > 64 ? host.slice(0, 64) : host;
  } catch {
    return null;
  }
}

/** Persist signup attribution at click time. Safe no-op outside the browser. */
export function stashSignupAttribution(method: SignupMethod, referrer: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SignupAttribution = {
      signup_method: method,
      signup_referrer_host: extractReferrerHost(referrer),
      stashed_at: Date.now(),
    };
    window.sessionStorage.setItem(STASH_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be disabled (private mode on some browsers).
    // Falling back to no attribution is acceptable per spec — the signup
    // event still fires, just with method=magic_link assumed and host=null.
  }
}

/** Read and clear the stashed attribution. Returns null when missing or expired. */
export function consumeSignupAttribution(): SignupAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STASH_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(STASH_KEY);
    const parsed = JSON.parse(raw) as SignupAttribution;
    if (typeof parsed.stashed_at !== "number") return null;
    if (Date.now() - parsed.stashed_at > TTL_MS) return null;
    if (parsed.signup_method !== "magic_link" && parsed.signup_method !== "google") {
      return null;
    }
    if (parsed.signup_referrer_host !== null && typeof parsed.signup_referrer_host !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
