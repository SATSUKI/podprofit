import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/**
 * Production security headers (Stripe re-approval audit, 2026-05-11).
 *
 * Locks the CSP / HSTS / Permissions-Policy posture in place. If any of the
 * external services we rely on (Stripe / Supabase / PostHog / Cloudflare /
 * Buttondown) are removed or replaced, this test forces the engineer to
 * deliberately update both the config and the spec — a CSP regression on a
 * launch checkout flow is exactly the failure mode this guards against.
 */
describe("next.config security headers", () => {
  it("exports an async headers() function", () => {
    expect(typeof nextConfig.headers).toBe("function");
  });

  it("applies the policy to every route", async () => {
    const config = await nextConfig.headers!();
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
    const all = config[0]!;
    expect(all.source).toBe("/:path*");
  });

  it("declares the OWASP-recommended top-level headers", async () => {
    const config = await nextConfig.headers!();
    const headers = new Map(
      config[0]!.headers.map((h) => [h.key.toLowerCase(), h.value]),
    );
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("strict-transport-security")).toContain(
      "max-age=31536000",
    );
    expect(headers.get("strict-transport-security")).toContain(
      "includeSubDomains",
    );
    expect(headers.has("permissions-policy")).toBe(true);
    expect(headers.has("content-security-policy")).toBe(true);
  });

  it("CSP allowlists Stripe + Supabase + analytics + email partners", async () => {
    const config = await nextConfig.headers!();
    const csp = config[0]!.headers.find(
      (h) => h.key.toLowerCase() === "content-security-policy",
    )!.value;

    // Stripe checkout, billing portal, JS SDK.
    expect(csp).toContain("https://js.stripe.com");
    expect(csp).toContain("https://api.stripe.com");
    expect(csp).toContain("https://checkout.stripe.com");
    expect(csp).toContain("https://billing.stripe.com");
    expect(csp).toContain("https://hooks.stripe.com");

    // Supabase auth + DB (wildcard for any project domain).
    expect(csp).toMatch(/\*\.supabase\.co/);

    // Analytics pipeline.
    expect(csp).toContain("posthog.com");
    expect(csp).toContain("cloudflareinsights.com");

    // Email signup.
    expect(csp).toContain("api.buttondown.email");

    // Founder photo fallback.
    expect(csp).toContain("https://www.gravatar.com");

    // Hardening directives that should never regress.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("permissions-policy disables sensors / camera / microphone", async () => {
    const config = await nextConfig.headers!();
    const pp = config[0]!.headers.find(
      (h) => h.key.toLowerCase() === "permissions-policy",
    )!.value;
    for (const feature of [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "usb=()",
    ]) {
      expect(pp).toContain(feature);
    }
    // payment must be allow-listed for Stripe (otherwise Apple Pay / Google
    // Pay buttons stop working in checkout).
    expect(pp).toMatch(/payment=\(self "https:\/\/js\.stripe\.com"\)/);
  });
});
