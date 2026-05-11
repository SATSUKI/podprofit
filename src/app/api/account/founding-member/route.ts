import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { updateOwnFoundingMember } from "@/lib/lifetime/founding-members";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

/**
 * /api/account/founding-member (PODP-12).
 *
 * Authenticated members POST a form here from `/account` to toggle
 * display + edit their X handle. Returns to /account with a flash query
 * string so the page can show a confirmation banner. RLS on
 * `founding_members` enforces ownership; the route just shapes the
 * inputs.
 *
 * Form fields:
 *   - display_x_handle: "on" / absent
 *   - x_handle: plain string (no `@`, validated server-side)
 */
export async function POST(req: NextRequest) {
  const supabase = await createSsrSupabase();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/login?error=auth_unconfigured", req.url),
      303,
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const wantsDisplay = form.get("display_x_handle") === "on";
  const handleRaw = form.get("x_handle");
  const handle = typeof handleRaw === "string" ? handleRaw : null;

  const { ok, error } = await updateOwnFoundingMember(supabase, user.id, {
    display_x_handle: wantsDisplay,
    x_handle: handle,
  });

  if (!ok) {
    const url = new URL("/account", req.url);
    url.searchParams.set("founding_error", error ?? "update_failed");
    return NextResponse.redirect(url, 303);
  }

  // Revalidate the public /about page so the grid picks up the change on
  // the next render. /account itself is uncached (auth-gated) so no
  // explicit revalidation is needed there.
  revalidatePath("/about");

  const url = new URL("/account", req.url);
  url.searchParams.set("founding_saved", "1");
  return NextResponse.redirect(url, 303);
}
