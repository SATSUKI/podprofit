import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Get the public-facing Lifetime seats claimed count.
 *
 * Reads from the `lifetime_seat_count` view (anon-readable, no PII).
 * Falls back gracefully when Supabase env isn't configured yet (returns 0).
 */
export async function getLifetimeClaimedCount(): Promise<number> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return 0; // Pre-Stripe-launch: no seats have been claimed yet.
  }
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("lifetime_seat_count")
      .select("claimed")
      .single();
    if (error || !data) return 0;
    return Number(data.claimed) || 0;
  } catch {
    return 0;
  }
}
