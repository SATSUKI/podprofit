/**
 * PODP-64 source-level regression guard for the
 * `/api/stripe/checkout` route handler.
 *
 * Why source-text and not runtime?
 *
 *   - The route handler imports `server-only` modules (`getStripe`,
 *     service-role Supabase, NextRequest) that need real env to wire up
 *     under vitest. Mocking that surface is high-effort and gives us
 *     almost nothing: the failure mode we care about is "someone
 *     re-introduces a `planEntry.mode === 'subscription'` gate" — a
 *     textual regression on a tiny, well-known site.
 *   - The pure helper `buildLoginRedirect` already has runtime tests in
 *     `checkout-login-redirect.test.ts`.
 *   - Combined with the e2e curl checks documented in the COO report,
 *     this gives us defense-in-depth without booting Next under vitest.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROUTE_PATH = path.resolve(
  __dirname,
  "../../src/app/api/stripe/checkout/route.ts",
);
const source = readFileSync(ROUTE_PATH, "utf8");

describe("/api/stripe/checkout — PODP-64 sign-in required for ALL plans", () => {
  it("does NOT carve out a subscription-only auth gate (anonymous Lifetime regression guard)", () => {
    // The pre-PODP-64 code shipped:
    //   if (planEntry.mode === "subscription" && !authedUser) { ... }
    // which let anonymous Lifetime through. The fix removes the mode
    // discriminator entirely. If this assertion fails, someone has
    // re-introduced the anonymous-Lifetime carve-out — read PODP-64
    // before "fixing" the test.
    expect(source).not.toMatch(
      /planEntry\.mode\s*===\s*["']subscription["']\s*&&\s*!authedUser/,
    );
  });

  it("redirects anonymous requests to /login via buildLoginRedirect", () => {
    // The route must funnel anonymous requests through the helper that
    // builds `/login?next=...`. Asserting on the function name (not the
    // raw template literal) keeps this test stable across copy edits.
    expect(source).toContain("buildLoginRedirect");
    expect(source).toMatch(/if\s*\(!authedUser\)/);
  });

  it("always sets `metadata.user_id` on the Stripe Checkout session (no anonymous fall-through)", () => {
    // PODP-64 makes `authedUser` non-null past the auth gate, so the
    // metadata key must be unconditionally set. The pre-fix code used
    // `...(authedUser ? { user_id: authedUser.id } : {})` which silently
    // skipped the linkage for anonymous Lifetime — exactly the bug we
    // are eliminating.
    expect(source).toMatch(/user_id:\s*authedUser\.id/);
    expect(source).not.toMatch(
      /\.\.\.\(\s*authedUser\s*\?\s*\{\s*user_id:/,
    );
  });

  it("imports the buildLoginRedirect helper from its own module (route files cannot export non-HTTP symbols)", () => {
    // Next.js route handlers can only export HTTP methods + route-segment
    // config. Keeping the redirect builder in a separate `@/lib/...`
    // module avoids tripping the build-time validator.
    expect(source).toContain(
      'from "@/lib/stripe/checkout-login-redirect"',
    );
  });

  it("retains the PODP-62 email-fallback heal path for legacy orphaned seats", () => {
    // PODP-64 eliminates new orphans, but legacy seats from anonymous
    // Lifetime purchases pre-fix still exist. Keep the defense-in-depth
    // Stripe-side check so a re-purchase attempt by the original buyer
    // (after they finally sign in) is blocked + the orphan is healed.
    expect(source).toContain("hasPriorLifetimePurchaseByEmail");
    expect(source).toContain("healOrphanedLifetimeSeat");
  });
});
