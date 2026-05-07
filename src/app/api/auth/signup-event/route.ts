import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { createServerSupabase } from "@/lib/supabase/server";
import { patchSignupAttribution } from "@/lib/analytics/record-signup";

export const runtime = "nodejs";

/**
 * Patches `signup_method` + `signup_referrer_host` onto the caller's
 * `user_profiles` row.
 *
 * Why a separate endpoint vs. doing this in `/auth/callback`?
 *   - Magic Link / OAuth strip the original `document.referrer`.
 *   - The click-time context is stashed in `sessionStorage` and only the
 *     browser knows it.
 *   - The callback is a redirect (303-ish), so we can't piggy-back JSON.
 *
 * Idempotency / replay defense:
 *   - The DB update only fires when `signup_method IS NULL`, so a second
 *     call from a returning user has no effect (see `record-signup.ts`).
 *   - Auth: the caller must have a valid Supabase session cookie. We use
 *     the SSR client (anon + cookies) to resolve the user, then the
 *     service-role client to perform the privileged update.
 *
 * This endpoint never returns the user_id — only `{ ok, updated }` so a
 * stray log on the network layer can't leak identifiers.
 */

const PayloadSchema = z.object({
  signup_method: z.enum(["magic_link", "google"]),
  // Host only — strict validation rejects paths, queries, fragments.
  signup_referrer_host: z
    .string()
    .max(64)
    .regex(/^[A-Za-z0-9.\-:]+$/, "host-only string expected")
    .nullable()
    .optional(),
});

export async function POST(req: NextRequest) {
  let payload: z.infer<typeof PayloadSchema>;
  try {
    payload = PayloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payload", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const ssr = await createSsrSupabase();
  if (!ssr) {
    // Supabase not configured — don't leak that, just silently 204.
    return new NextResponse(null, { status: 204 });
  }

  const {
    data: { user },
    error: userError,
  } = await ssr.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let updated = false;
  try {
    const service = createServerSupabase();
    const result = await patchSignupAttribution(service, user.id, {
      signup_method: payload.signup_method,
      signup_referrer_host: payload.signup_referrer_host ?? null,
    });
    updated = result.updated;
  } catch (err) {
    console.error("[api.signup-event] attribution patch failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated });
}
