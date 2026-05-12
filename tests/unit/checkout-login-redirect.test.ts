/**
 * PODP-64 — `/api/stripe/checkout` requires sign-in for ALL plans.
 *
 * `buildLoginRedirect` is the helper the route handler calls when it
 * receives an anonymous request. Tests below pin its contract so a
 * regression that silently strips `?next=` (and re-opens the anonymous
 * Lifetime hole) fails loudly.
 *
 * The helper is pure string-building — no Next / Supabase mocks needed.
 */
import { describe, expect, it } from "vitest";
import { buildLoginRedirect } from "@/lib/stripe/checkout-login-redirect";

const ORIGIN = "https://getpodprofit.com";

describe("buildLoginRedirect (PODP-64)", () => {
  it("redirects anonymous Lifetime to /login with the round-trip target", () => {
    const url = buildLoginRedirect(ORIGIN, "lifetime", false);

    expect(url).toBe(
      "https://getpodprofit.com/login?next=" +
        encodeURIComponent("/api/stripe/checkout?plan=lifetime"),
    );
    // Sanity: the encoded target is round-trip decodable to the literal
    // route, so the auth callback can plug it straight into NextResponse.redirect.
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/login");
    expect(parsed.searchParams.get("next")).toBe(
      "/api/stripe/checkout?plan=lifetime",
    );
  });

  it("redirects anonymous Pro Monthly to /login with the round-trip target", () => {
    const url = buildLoginRedirect(ORIGIN, "pro_monthly", false);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("next")).toBe(
      "/api/stripe/checkout?plan=pro_monthly",
    );
  });

  it("redirects anonymous Pro Yearly to /login with the round-trip target", () => {
    const url = buildLoginRedirect(ORIGIN, "pro_yearly", false);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("next")).toBe(
      "/api/stripe/checkout?plan=pro_yearly",
    );
  });

  it("preserves `?confirmed=true` so the Pro→Lifetime upgrade flow survives sign-in", () => {
    const url = buildLoginRedirect(ORIGIN, "lifetime", true);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("next")).toBe(
      "/api/stripe/checkout?plan=lifetime&confirmed=true",
    );
  });

  it("omits `confirmed=true` from the next target when the request did not carry it", () => {
    const url = buildLoginRedirect(ORIGIN, "lifetime", false);
    expect(url).not.toContain("confirmed");
  });

  it("respects an arbitrary origin (Vercel preview deploys / localhost)", () => {
    const previewOrigin = "https://podprofit-git-preview.vercel.app";
    const url = buildLoginRedirect(previewOrigin, "pro_monthly", false);
    expect(url.startsWith(`${previewOrigin}/login?`)).toBe(true);
  });

  it("encodes `?` in the next target so it survives URL parsing", () => {
    // The literal `?` in the next value must be percent-encoded; otherwise
    // /login would see two separate query params (`next=/api/...` and
    // `plan=lifetime`) and route us back to /account by default.
    const url = buildLoginRedirect(ORIGIN, "lifetime", false);
    expect(url).toContain("%3F");
  });
});
