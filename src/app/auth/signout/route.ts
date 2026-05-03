import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSsrSupabase } from "@/lib/supabase/ssr";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSsrSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", req.url));
}
