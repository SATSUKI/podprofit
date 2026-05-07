import { NextResponse } from "next/server";
import { createSsrSupabase } from "@/lib/supabase/ssr";

export const runtime = "nodejs";

/**
 * Resolve the signed-in user's plan tier.
 *
 *   GET /api/me/plan
 *
 * Returns the smallest possible JSON payload — just enough for the
 * calculator's free-tier daily-limit gate (Task 5 in
 * `engineering-impl-plan-w2-w5-v2.md`) to decide whether to bypass:
 *
 *   { tier: "free" | "pro" | "lifetime", authenticated: true|false }
 *
 * No PII (no email, no user_id, no Stripe ids) leaks here. The
 * subscriptions row is consulted server-side; only the derived tier flag
 * is returned, which is what the client gate actually needs.
 *
 * Failure modes:
 *   - Anonymous (no session) → { tier: "free", authenticated: false }, 200
 *   - Supabase not configured → { tier: "free", authenticated: false,
 *       reason: "supabase_not_configured" }, 200
 *     (Calculator falls back to client-only daily limit, which is the
 *     same as the free path. No 5xx — we don't want a transient infra
 *     outage to *unblock* free users from the daily cap.)
 */
export async function GET() {
  const supabase = await createSsrSupabase();
  if (!supabase) {
    return NextResponse.json(
      { tier: "free", authenticated: false, reason: "supabase_not_configured" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { tier: "free", authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_type, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  let tier: "free" | "pro" | "lifetime" = "free";
  if (sub?.plan_type === "lifetime") {
    tier = "lifetime";
  } else if (
    sub?.plan_type === "pro_monthly" ||
    sub?.plan_type === "pro_yearly"
  ) {
    tier = "pro";
  }

  return NextResponse.json(
    { tier, authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
