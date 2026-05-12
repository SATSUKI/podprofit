import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyBasicAuth } from "@/lib/api/admin-auth";
import { consumeAdmin } from "@/lib/api/admin-rate-limit";

/**
 * Edge middleware — currently only guards `/admin/*` (PODP-29).
 *
 * Why Edge instead of a per-route guard?
 *   - We want every /admin/* request — including not-yet-built routes — to
 *     fail closed by default. A per-page guard would require us to
 *     remember to add it on each new admin page.
 *   - Static security headers stay in `next.config.ts` (zero cold-start
 *     cost); we only pay for Edge invocation on `/admin/*` matches, which
 *     should be near-zero traffic.
 *
 * Order of operations:
 *   1. Per-IP rate limit (10 req/min) — runs before the auth check so a
 *      credential-stuffing flood gets 429s instead of being throttled by
 *      bcrypt-style work. Our auth check is constant-time string compare,
 *      so the cost is cheap, but the audit-log noise from a flood is what
 *      we're trying to avoid.
 *   2. Basic auth — env vars `ADMIN_USER` / `ADMIN_PASS`. Missing either
 *      is a 503 (not_configured) so a misconfigured deploy fails closed.
 *   3. On success: forward via NextResponse.next().
 */
export function middleware(req: NextRequest) {
  const ip = clientIp(req);

  const limit = consumeAdmin(`admin:${ip}`);
  if (!limit.ok) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limit.retryAfterSeconds),
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const result = verifyBasicAuth(
    req.headers.get("authorization"),
    process.env.ADMIN_USER,
    process.env.ADMIN_PASS,
  );

  if (result.kind === "not_configured") {
    return new NextResponse(
      JSON.stringify({
        error: "Admin surface not configured",
        hint: "ADMIN_USER and ADMIN_PASS must be set.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (result.kind !== "ok") {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="PODProfit admin", charset="UTF-8"',
      },
    });
  }

  return NextResponse.next();
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export const config = {
  // PODP-53: also gate `/api/admin/*` so the admin-only mutation routes
  // (status updates, refund actions) fail closed without ADMIN_USER /
  // ADMIN_PASS. We must list the matchers explicitly — Next's matcher
  // syntax does not support a single pattern that captures both.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
