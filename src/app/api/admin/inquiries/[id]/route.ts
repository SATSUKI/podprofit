import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  isInquiryStatus,
  updateInquiry,
  type InquiryStatus,
} from "@/lib/admin/inquiries";

export const runtime = "nodejs";

/**
 * POST /api/admin/inquiries/[id] — update status / reply / replied_at.
 *
 * Auth: middleware Basic auth gates `/admin/*` AND `/api/admin/*` via
 * the matcher at the bottom of `src/middleware.ts` once we extend it.
 * (Currently the matcher is `/admin/:path*`. We extend the matcher in
 * the same commit so this route also fails closed without ADMIN_USER /
 * ADMIN_PASS.)
 *
 * Form fields:
 *   - status: one of inquiry_status enum
 *   - reply_message: text (<=10k chars)
 *   - mark_replied: "1" or absent — present means set replied_at=now()
 *
 * Always 303-redirects back to the inquiries list with a flash query so
 * the page can show a banner. We never return JSON here; the form
 * submission is the only consumer.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = createServerSupabase();
  const form = await req.formData();

  const statusRaw = form.get("status");
  const replyRaw = form.get("reply_message");
  const markReplied = form.get("mark_replied") === "1";

  // Coerce the form's string|null|File field to InquiryStatus | undefined.
  // updateInquiry re-validates server-side; this is just the shape gate.
  const status: InquiryStatus | undefined = isInquiryStatus(statusRaw)
    ? statusRaw
    : undefined;
  const reply_message =
    typeof replyRaw === "string"
      ? replyRaw.trim().length === 0
        ? null
        : replyRaw
      : undefined;

  const result = await updateInquiry(supabase, id, {
    status,
    reply_message,
    markReplied,
  });

  // `URLSearchParams.set` URL-encodes for us — passing pre-encoded values
  // here would double-encode and surface garbled banners on the page.
  const url = new URL("/admin/inquiries", req.url);
  url.searchParams.set("status", "all");
  url.searchParams.set("id", id);
  if (result.ok) {
    url.searchParams.set("saved", "1");
  } else {
    url.searchParams.set("error", result.error ?? "update_failed");
  }
  return NextResponse.redirect(url, 303);
}
