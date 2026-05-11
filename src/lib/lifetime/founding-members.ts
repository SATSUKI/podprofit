import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Founding members directory helpers (PODP-12).
 *
 * Schema lives in `supabase/migrations/20260515_000010_founding_members.sql`.
 * Public read RLS is restricted to rows where `display_x_handle = true`, so
 * the anon-key Supabase client used by the marketing site can call
 * `listPublicFoundingMembers` directly without leaking opted-out members.
 */

export interface FoundingMemberPublic {
  user_id: string;
  x_handle: string | null;
  joined_at: string;
}

export interface FoundingMemberSelf {
  user_id: string;
  display_x_handle: boolean;
  x_handle: string | null;
  joined_at: string;
}

/**
 * X handle validation: 1-15 chars, alphanumeric + underscore, no leading @.
 * Matches the X / Twitter handle spec. Returns the cleaned handle or null
 * if invalid.
 */
export function normalizeXHandle(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().replace(/^@+/, "");
  if (trimmed.length === 0 || trimmed.length > 15) return null;
  if (!/^[A-Za-z0-9_]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Seed a founding_members row for a Lifetime claimant. Idempotent —
 * `unique(user_id)` plus our upsert means a replay (Stripe retry) won't
 * blow up. Defaults `display_x_handle = false` so display is strictly
 * opt-in.
 */
export async function ensureFoundingMemberRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("founding_members")
    .upsert(
      {
        user_id: userId,
        display_x_handle: false,
        x_handle: null,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Public list — for `/about` Founding Supporters grid. Only opted-in rows
 * are returned thanks to the table's RLS policy. Capped at the 100-seat
 * total for safety even though we never expect more rows than that.
 */
export async function listPublicFoundingMembers(
  supabase?: SupabaseClient,
): Promise<FoundingMemberPublic[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  const client = supabase ?? createServerSupabase();
  const { data, error } = await client
    .from("founding_members")
    .select("user_id, x_handle, joined_at")
    .eq("display_x_handle", true)
    .order("joined_at", { ascending: true })
    .limit(100);
  if (error || !data) return [];
  return data as FoundingMemberPublic[];
}

/**
 * Self-read — for `/account` preferences UI. Returns null when the
 * authenticated user is not a founding member (i.e., didn't buy
 * Lifetime).
 */
export async function getOwnFoundingMember(
  supabase: SupabaseClient,
  userId: string,
): Promise<FoundingMemberSelf | null> {
  const { data, error } = await supabase
    .from("founding_members")
    .select("user_id, display_x_handle, x_handle, joined_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as FoundingMemberSelf;
}

/**
 * Update a founding member's preferences from `/account`. Enforces the
 * constraint that `display_x_handle = true` requires `x_handle` to be a
 * valid handle (matches the table-level CHECK). Returns the validation
 * error to render inline rather than surfacing a raw 23514 from Postgres.
 */
export async function updateOwnFoundingMember(
  supabase: SupabaseClient,
  userId: string,
  prefs: { display_x_handle: boolean; x_handle: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const cleaned = normalizeXHandle(prefs.x_handle);
  const wantsDisplay = Boolean(prefs.display_x_handle);

  if (wantsDisplay && !cleaned) {
    return {
      ok: false,
      error:
        "Add a valid X handle (1-15 letters, numbers, or underscores) before turning display on.",
    };
  }

  // Make sure a row exists first — a buyer who never claimed before opt-in
  // would not have one yet. `ensureFoundingMemberRow` is a no-op when the
  // row exists.
  await ensureFoundingMemberRow(supabase, userId);

  const { error } = await supabase
    .from("founding_members")
    .update({ display_x_handle: wantsDisplay, x_handle: cleaned })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
