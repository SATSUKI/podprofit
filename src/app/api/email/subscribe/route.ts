import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SubscribeSchema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(64).optional(),
});

/**
 * Email signup endpoint.
 *
 * Strategy (per CEO slim-down):
 *   1. Validate input.
 *   2. Try Buttondown if BUTTONDOWN_API_KEY is set (free up to 100 subs).
 *   3. Always also write to Supabase email_subscribers (single source of truth
 *      we own — protects against Buttondown account loss / migration).
 *   4. Idempotent: same email twice = 200, not duplicated.
 */
export async function POST(req: NextRequest) {
  let payload: { email: string; source?: string };
  try {
    payload = SubscribeSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid email", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const buttondownKey = process.env.BUTTONDOWN_API_KEY;
  let buttondownSubscriberId: string | null = null;

  if (buttondownKey) {
    try {
      const res = await fetch("https://api.buttondown.email/v1/subscribers", {
        method: "POST",
        headers: {
          Authorization: `Token ${buttondownKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: payload.email,
          notes: payload.source ?? "podprofit",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        buttondownSubscriberId = data.id ?? null;
      }
      // Buttondown returns 400 for already-subscribed; treat as success.
    } catch {
      /* swallow — we'll still write to Supabase */
    }
  }

  // Mirror to Supabase if configured.
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const supabase = createServerSupabase();
      await supabase
        .from("email_subscribers")
        .upsert(
          {
            email: payload.email,
            source: payload.source ?? "lead_magnet",
            buttondown_subscriber_id: buttondownSubscriberId,
          },
          { onConflict: "email" },
        );
    } catch {
      /* if Supabase is down at signup time, we still want a 200 — the user's
         intent is captured by Buttondown (or just lost gracefully). */
    }
  }

  return NextResponse.json({ ok: true });
}
