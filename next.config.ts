import type { NextConfig } from "next";

/**
 * Production security headers (Stripe re-approval audit, 2026-05-11).
 *
 * Applied via `headers()` instead of `middleware.ts` to keep the Edge cold-
 * start budget at zero — these headers are static, so Vercel serves them
 * directly from the CDN without invoking a function.
 *
 * Notes:
 *   - CSP: `script-src` allows Stripe.js (`https://js.stripe.com`) so the
 *     publishable-key loader works. `'unsafe-inline'` is required for the
 *     JSON-LD blocks we render via `dangerouslySetInnerHTML` in
 *     `src/components/json-ld.tsx` and several blog pages.
 *   - `frame-src` allows Stripe Checkout / Billing portals; everything else
 *     is first-party.
 *   - `img-src` includes data: (inline brand marks) and Gravatar (founder
 *     photo on /about).
 *   - `connect-src` includes Stripe (Checkout JS), Supabase (auth + DB), and
 *     PostHog / Cloudflare Web Analytics + Buttondown for analytics + email.
 *   - HSTS is 1y without preload — preload requires a DNS-level commitment
 *     we'll evaluate after launch.
 *   - Permissions-Policy turns off browser APIs we never use, shrinking the
 *     surface a malicious extension could pivot through.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self "https://js.stripe.com"), usb=()',
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "img-src 'self' data: https://www.gravatar.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://static.cloudflareinsights.com https://us-assets.i.posthog.com",
      "connect-src 'self' https://api.stripe.com https://*.supabase.co https://*.supabase.in https://us.i.posthog.com https://us-assets.i.posthog.com https://api.buttondown.email https://www.gravatar.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://billing.stripe.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
