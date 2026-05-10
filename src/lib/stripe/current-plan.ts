import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanId } from "@/lib/stripe/products";

/**
 * Snapshot of a user's billing position used by the Checkout pre-check
 * (PODP-35: prevent duplicate subscriptions, route Pro→Pro to portal,
 * gate Lifetime by capacity, refuse buying Pro after Lifetime).
 *
 * Sources of truth:
 *   - `user_profiles.stripe_customer_id`  (1:1 with auth user)
 *   - `lifetime_seats.user_id`            (claimed = active)
 *   - `subscriptions`                     (mirrored from Stripe)
 *
 * Read paths use the **service-role** Supabase client so RLS doesn't surprise
 * us in webhook context. The session-bound (anon) variant is used only inside
 * Route Handlers that already have the user's id from `auth.getUser()`.
 */

export interface CurrentPlanSnapshot {
  /** Stripe customer id (may be null if user has never paid). */
  stripeCustomerId: string | null;
  /** True iff the user holds a `claimed` lifetime seat. */
  hasLifetime: boolean;
  /**
   * Most recent active Pro subscription, if any. Includes `incomplete` so
   * a user mid-Checkout can't double-spend by opening a second tab.
   */
  activeProSubscription: {
    id: string;
    planType: Extract<PlanId, "pro_monthly" | "pro_yearly">;
    status: string;
  } | null;
}

const PRO_ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "incomplete",
  "paused",
]);

export async function getCurrentPlanSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<CurrentPlanSnapshot> {
  const [profileRes, lifetimeRes, subsRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("lifetime_seats")
      .select("seat_number, status")
      .eq("user_id", userId)
      .eq("status", "claimed")
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("stripe_subscription_id, plan_type, status")
      .eq("user_id", userId),
  ]);

  const stripeCustomerId =
    (profileRes.data?.stripe_customer_id as string | null | undefined) ?? null;
  const hasLifetime = Boolean(lifetimeRes.data);

  const activeRow = (subsRes.data ?? [])
    .filter((row) => {
      const status = row.status as string | undefined;
      const planType = row.plan_type as string | undefined;
      return (
        (planType === "pro_monthly" || planType === "pro_yearly") &&
        typeof status === "string" &&
        PRO_ACTIVE_STATUSES.has(status)
      );
    })
    // Prefer most-recently created if Stripe ever leaves two rows behind.
    .sort((a, b) => {
      const aId = String(a.stripe_subscription_id ?? "");
      const bId = String(b.stripe_subscription_id ?? "");
      return bId.localeCompare(aId);
    })[0];

  const activeProSubscription = activeRow
    ? {
        id: String(activeRow.stripe_subscription_id),
        planType: activeRow.plan_type as "pro_monthly" | "pro_yearly",
        status: String(activeRow.status),
      }
    : null;

  return { stripeCustomerId, hasLifetime, activeProSubscription };
}

/**
 * Lifetime capacity check — uses the same view the Lifetime page reads.
 * Returns the number of seats remaining. 0 means sold out.
 */
export async function getLifetimeRemaining(
  supabase: SupabaseClient,
  capacity = 100,
): Promise<number> {
  const { count, error } = await supabase
    .from("lifetime_seats")
    .select("seat_number", { count: "exact", head: true })
    .eq("status", "claimed");
  if (error) {
    // Defensive: treat unknown DB state as "available" so the atomic
    // `fn_claim_lifetime_seat` RPC is still the final gate.
    return capacity;
  }
  const claimed = typeof count === "number" ? count : 0;
  return Math.max(0, capacity - claimed);
}
