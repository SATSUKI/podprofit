import type { PlanId } from "@/lib/stripe/products";

/**
 * Build the absolute redirect URL used when an anonymous request hits
 * `/api/stripe/checkout`. The `?next=` round-trip is honoured by
 * `src/app/auth/callback/route.ts`, which redirects back to this endpoint
 * after the magic-link exchange. `confirmed=true` is preserved so a
 * Pro→Lifetime upgrade flow stays through-routed after sign-in.
 *
 * Extracted into a tiny helper module (instead of living next to the
 * route handler) because Next.js route files reject arbitrary named
 * exports — only HTTP-method exports and the route-segment config keys
 * are allowed. Pure string-building so unit tests don't need any Next or
 * Supabase plumbing.
 *
 * @param origin     Absolute origin without trailing slash (e.g. `https://getpodprofit.com`).
 * @param plan       Plan id from `PLAN_CATALOG` — emitted verbatim in `?plan=`.
 * @param confirmed  Mirrors the `?confirmed=true` query flag from the
 *                   original request so the user-confirm Pro→Lifetime
 *                   upgrade flow does not lose state across sign-in.
 */
export function buildLoginRedirect(
  origin: string,
  plan: PlanId,
  confirmed: boolean,
): string {
  const target = confirmed
    ? `/api/stripe/checkout?plan=${plan}&confirmed=true`
    : `/api/stripe/checkout?plan=${plan}`;
  return `${origin}/login?next=${encodeURIComponent(target)}`;
}
