import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin-side reads/writes for `public.inquiries` (PODP-53 v1).
 *
 * The public-facing write path is in `src/lib/contact/handler.ts`; this
 * module is the *admin* counterpart — list, fetch one, mutate
 * status/reply. service_role bypasses RLS so we see anonymous /contact
 * submissions too.
 *
 * Schema reference: `supabase/migrations/20260514_000009_inquiries.sql`.
 */

export const INQUIRY_STATUSES = [
  "new",
  "in_progress",
  "replied",
  "archived",
  "spam",
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_CATEGORIES = [
  "bug",
  "refund",
  "feature_request",
  "pricing",
  "general",
  "other",
] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export interface InquiryRow {
  id: string;
  name: string | null;
  email: string;
  category: InquiryCategory;
  subject: string | null;
  message: string;
  status: InquiryStatus;
  user_id: string | null;
  reply_message: string | null;
  replied_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const INQUIRIES_LIST_DEFAULT_LIMIT = 50;
export const INQUIRIES_LIST_MAX_LIMIT = 200;

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return (
    typeof value === "string" &&
    (INQUIRY_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Normalise the limit query param. Public callers pass strings via URL;
 * we clamp + default here so the route handler stays simple.
 */
export function normaliseLimit(raw: unknown): number {
  if (typeof raw !== "string") return INQUIRIES_LIST_DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0) return INQUIRIES_LIST_DEFAULT_LIMIT;
  return Math.min(n, INQUIRIES_LIST_MAX_LIMIT);
}

export async function listInquiries(
  supabase: SupabaseClient,
  options: { status?: InquiryStatus | "all"; limit?: number } = {},
): Promise<{ rows: InquiryRow[]; error: string | null }> {
  const limit = options.limit ?? INQUIRIES_LIST_DEFAULT_LIMIT;
  const status = options.status ?? "new";

  let query = supabase
    .from("inquiries")
    .select(
      "id, name, email, category, subject, message, status, user_id, reply_message, replied_at, ip_address, user_agent, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as InquiryRow[], error: null };
}

export async function getInquiryById(
  supabase: SupabaseClient,
  id: string,
): Promise<InquiryRow | null> {
  const { data } = await supabase
    .from("inquiries")
    .select(
      "id, name, email, category, subject, message, status, user_id, reply_message, replied_at, ip_address, user_agent, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as InquiryRow | null) ?? null;
}

export interface InquiryUpdateInput {
  status?: InquiryStatus;
  reply_message?: string | null;
  /**
   * When `true`, set `replied_at = now()` (and clear it when set to
   * `false`). Lets the UI "Mark replied" without forcing the caller to
   * also pass a status string.
   */
  markReplied?: boolean;
}

/**
 * Single-row update. Returns `{ ok, error, row }` so the admin UI can
 * surface the error inline.
 *
 * Note on shape: `reply_message: null` clears the column. `undefined`
 * leaves it untouched — that's why the patch builder below differentiates.
 */
export async function updateInquiry(
  supabase: SupabaseClient,
  id: string,
  input: InquiryUpdateInput,
  now: Date = new Date(),
): Promise<{
  ok: boolean;
  error: string | null;
  row: InquiryRow | null;
}> {
  if (input.status !== undefined && !isInquiryStatus(input.status)) {
    return { ok: false, error: "Invalid status.", row: null };
  }
  if (
    input.reply_message !== undefined &&
    input.reply_message !== null &&
    input.reply_message.length > 10000
  ) {
    return {
      ok: false,
      error: "Reply exceeds 10,000 character limit.",
      row: null,
    };
  }

  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.reply_message !== undefined)
    patch.reply_message = input.reply_message;
  if (input.markReplied === true) patch.replied_at = now.toISOString();
  else if (input.markReplied === false) patch.replied_at = null;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No fields to update.", row: null };
  }

  const { data, error } = await supabase
    .from("inquiries")
    .update(patch)
    .eq("id", id)
    .select(
      "id, name, email, category, subject, message, status, user_id, reply_message, replied_at, ip_address, user_agent, created_at",
    )
    .maybeSingle();

  if (error) return { ok: false, error: error.message, row: null };
  return { ok: true, error: null, row: (data as InquiryRow | null) ?? null };
}
