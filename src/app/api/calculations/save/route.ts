import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSsrSupabase } from "@/lib/supabase/ssr";

export const runtime = "nodejs";

const SaveSchema = z.object({
  input: z.object({
    productId: z.string(),
    vendor: z.enum(["printful", "printify"]),
    marketplace: z.enum(["etsy", "shopify", "amazon-merch", "printify-pop-up", "manual"]),
    region: z.enum(["US", "EU", "UK", "CA", "AU"]),
    retailPriceCents: z.number().int().nonnegative(),
    displayCurrency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]),
    includeOffsiteAds: z.boolean().optional(),
  }),
  output: z.object({
    netProfitCents: z.number().int(),
    marginPercent: z.number(),
    totalCostsCents: z.number().int(),
  }).passthrough(),
});

/**
 * Save a calculation for the signed-in user.
 *
 * Free users: saves are gated to 5 lifetime saves (Pro removes the cap).
 * Per CEO slim-down: the cap is enforced in app code (a future migration adds
 * a DB-level CHECK).
 */
export async function POST(req: NextRequest) {
  const supabase = await createSsrSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Save requires Supabase to be configured." },
      { status: 503 },
    );
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let payload: z.infer<typeof SaveSchema>;
  try {
    payload = SaveSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payload", detail: (err as Error).message },
      { status: 400 },
    );
  }

  // Free-tier gate: max 5 saves.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_type, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  const isPro = sub?.plan_type === "pro_monthly" ||
    sub?.plan_type === "pro_yearly" ||
    sub?.plan_type === "lifetime";
  if (!isPro) {
    const { count } = await supabase
      .from("calculations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        {
          error: "Free plan save limit reached (5 calculations).",
          hint: "Upgrade to Pro for unlimited saves.",
          upgradeUrl: "/pricing",
        },
        { status: 402 },
      );
    }
  }

  const { data, error } = await supabase
    .from("calculations")
    .insert({
      user_id: user.id,
      input_json: payload.input,
      output_json: payload.output,
    })
    .select("id, share_slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, share_slug: data.share_slug });
}
