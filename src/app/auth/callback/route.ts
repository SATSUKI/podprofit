import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSsrSupabase } from "@/lib/supabase/ssr";

export const runtime = "nodejs";

/**
 * OAuth / magic link callback.
 *
 * Supabase appends `?code=...` after the user clicks the magic link.
 * We exchange it for a session cookie and redirect to /account.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createSsrSupabase();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
