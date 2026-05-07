import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordUsageEvent } from "@/lib/refund/record-usage-event";
import { rateLimit } from "@/lib/refund/rate-limit";

export const runtime = "nodejs";

/**
 * Calculator launch tracking — backs the Terms §7.1 / Refunds page promise:
 *   "Lifetime $149: refundable within 7 days AND 0 calculator launches
 *    (verified by access logs)."
 *
 * Behavior:
 *   - Requires an authenticated user (anonymous users have no purchase to
 *     refund, so we don't pollute the table with rows that can never
 *     gate eligibility).
 *   - Idempotency / dedupe per session is the *client's* responsibility
 *     (sessionStorage gate in the calculator component) — server allows
 *     multiple rows so legitimate "open in new tab" cases also count.
 *   - Soft 60/min per-IP rate limit to bound damage from a runaway loop.
 *
 * Privacy invariant: this handler MUST NOT accept calculator inputs
 * (retail prices, product selections, etc.). The body schema is
 * deliberately empty for that reason — see Privacy Policy v0.1 §2.2.
 */

// Empty body. We accept POST with no fields rather than GET so it isn't
// triggered by prefetchers / link previews.
const BodySchema = z.object({}).passthrough();

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to a constant so unit tests
  // don't all share the same bucket as real users.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`calc-launch:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(
            1,
            Math.ceil((limit.resetAt - Date.now()) / 1000),
          ).toString(),
        },
      },
    );
  }

  // Body is intentionally ignored beyond schema validation — we never
  // store calculator inputs (privacy invariant).
  try {
    BodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const ssrSupabase = await createSsrSupabase();
  if (!ssrSupabase) {
    // Supabase not provisioned yet — succeed silently so the calculator
    // page doesn't surface noise to users during the pre-launch window.
    return NextResponse.json({ ok: true, recorded: false, reason: "supabase_unconfigured" });
  }

  const { data: { user } } = await ssrSupabase.auth.getUser();
  if (!user) {
    // Anonymous users have nothing to refund; intentionally do not track.
    return NextResponse.json({ ok: true, recorded: false, reason: "anonymous" });
  }

  // service_role client for the actual write (RLS forbids client-side
  // inserts on usage_events).
  const adminSupabase = createServerSupabase();
  const result = await recordUsageEvent(adminSupabase, {
    userId: user.id,
    eventType: "calculator_launched",
    // No metadata — privacy invariant. The fact-of-launch is sufficient.
    metadata: null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recorded: true });
}
