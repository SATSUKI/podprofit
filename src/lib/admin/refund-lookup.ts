import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkLifetimeRefundEligibility,
  checkSubscriptionRefundEligibility,
  type EligibilityResult,
} from "@/lib/refund/check-eligibility";

/**
 * Admin refund lookup (PODP-53 v1 minimum).
 *
 * Resolves a free-form search input (email, user_id UUID, or Stripe
 * payment_intent id) into a candidate "refund target":
 *
 *   - the affected user (auth.users + user_profiles row),
 *   - any Lifetime seat the user currently holds,
 *   - the user's most recent active Pro subscription (if any),
 *   - the eligibility verdict for whichever path the operator chose.
 *
 * Returning a *list of candidates* rather than a single hit lets the
 * admin UI show "matched 2 records — pick which one" when the search
 * is ambiguous (e.g. an email with both a Lifetime + an old
 * subscription).
 *
 * Why not collapse this into the page Server Component?
 *   - Keeps the search behaviour unit-testable against the Supabase
 *     mock without spinning up React.
 *   - Future scope (CSV export, batch refunds, charge.id lookup) can
 *     extend this module without touching the page chrome.
 */

export type SearchKind = "email" | "user_id" | "payment_intent" | "unknown";

export function classifySearch(raw: string): {
  kind: SearchKind;
  value: string;
} {
  const value = raw.trim();
  if (!value) return { kind: "unknown", value };
  // Stripe payment_intent ids: `pi_...`.
  if (/^pi_[A-Za-z0-9]+$/.test(value)) return { kind: "payment_intent", value };
  // UUID v4-ish (don't enforce v4 strictly — Supabase emits v4 but tests
  // may use sentinel ids).
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return { kind: "user_id", value };
  }
  // Email: minimal RFC-ish shape; the Supabase row is the source of truth.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { kind: "email", value };
  return { kind: "unknown", value };
}

export interface LifetimeRefundCandidate {
  kind: "lifetime";
  seat_number: number;
  status: string;
  payment_intent_id: string | null;
  claimed_at: string;
  eligibility: EligibilityResult;
}

export interface SubscriptionRefundCandidate {
  kind: "subscription";
  plan_type: "pro_monthly" | "pro_yearly";
  status: string;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  eligibility: EligibilityResult;
}

export type RefundCandidate =
  | LifetimeRefundCandidate
  | SubscriptionRefundCandidate;

export interface RefundSearchResult {
  query: { raw: string; kind: SearchKind };
  user: {
    id: string;
    email: string | null;
    stripe_customer_id: string | null;
  } | null;
  candidates: RefundCandidate[];
  /** Surface-level error message when the search failed. */
  error: string | null;
}

/**
 * Resolve a user_id from a free-form search input.
 *
 * - `payment_intent`: walks `lifetime_seats.stripe_payment_intent_id`
 *   first (subscriptions don't carry a PI on the row, only an
 *   invoice/sub id; admin operators search by sub id less often).
 * - `email`: queries auth.users by email via Supabase's admin API.
 *   We use the admin endpoint because `user_profiles` does not carry
 *   email — that lives in `auth.users`.
 * - `user_id`: trusted as-is.
 */
async function resolveUserId(
  supabase: SupabaseClient,
  search: { kind: SearchKind; value: string },
): Promise<{
  userId: string | null;
  /** When we resolved via payment_intent, bubble back the seat we found so the caller can short-circuit. */
  seatFromPi: {
    seat_number: number;
    status: string;
    stripe_payment_intent_id: string | null;
    claimed_at: string;
    user_id: string | null;
  } | null;
  error: string | null;
}> {
  if (search.kind === "user_id") {
    return { userId: search.value, seatFromPi: null, error: null };
  }

  if (search.kind === "payment_intent") {
    const { data, error } = await supabase
      .from("lifetime_seats")
      .select("seat_number, status, stripe_payment_intent_id, claimed_at, user_id")
      .eq("stripe_payment_intent_id", search.value)
      .maybeSingle();
    if (error) {
      return { userId: null, seatFromPi: null, error: error.message };
    }
    if (!data) {
      return {
        userId: null,
        seatFromPi: null,
        error: "No Lifetime seat matched that payment_intent.",
      };
    }
    const seat = data as {
      seat_number: number;
      status: string;
      stripe_payment_intent_id: string | null;
      claimed_at: string;
      user_id: string | null;
    };
    return {
      userId: seat.user_id ?? null,
      seatFromPi: seat,
      error: null,
    };
  }

  if (search.kind === "email") {
    // Supabase admin API: list users filtered server-side by email.
    const { data, error } = await (supabase.auth as unknown as {
        admin: {
          listUsers: (opts?: {
            page?: number;
            perPage?: number;
          }) => Promise<{
            data: { users: Array<{ id: string; email: string | null }> };
            error: { message: string } | null;
          }>;
        };
      }).admin.listUsers({ page: 1, perPage: 200 });

    if (error) {
      return { userId: null, seatFromPi: null, error: error.message };
    }
    const wanted = search.value.toLowerCase();
    const match = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === wanted,
    );
    if (!match) {
      return {
        userId: null,
        seatFromPi: null,
        error: "No user with that email found.",
      };
    }
    return { userId: match.id, seatFromPi: null, error: null };
  }

  return {
    userId: null,
    seatFromPi: null,
    error:
      "Unrecognised search input. Use an email, user_id UUID, or Stripe pi_ id.",
  };
}

/**
 * Best-effort email lookup for a resolved user_id. service_role can read
 * `auth.users` via the supabase-js admin namespace; we swallow errors so
 * a missing email doesn't break the refund flow.
 */
async function fetchAuthEmail(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await (supabase.auth as unknown as {
      admin: {
        getUserById: (
          id: string,
        ) => Promise<{
          data: { user: { email: string | null } | null };
          error: { message: string } | null;
        }>;
      };
    }).admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Look up refund candidates for the given search input.
 *
 * `now` is exposed for testability — the Lifetime eligibility helper
 * uses it to compute the 14-day window.
 */
export async function findRefundCandidates(
  supabase: SupabaseClient,
  rawQuery: string,
  options: { now?: Date } = {},
): Promise<RefundSearchResult> {
  const now = options.now ?? new Date();
  const search = classifySearch(rawQuery);

  if (search.kind === "unknown") {
    return {
      query: { raw: rawQuery, kind: "unknown" },
      user: null,
      candidates: [],
      error:
        "Enter an email, user_id UUID, or Stripe pi_ id to look up a refund.",
    };
  }

  const resolved = await resolveUserId(supabase, search);
  if (resolved.error && !resolved.userId) {
    return {
      query: { raw: rawQuery, kind: search.kind },
      user: null,
      candidates: [],
      error: resolved.error,
    };
  }

  const userId = resolved.userId;

  // All four downstream lookups (profile, auth.users email, lifetime
  // seat, subscriptions) are independent — fan them out in parallel so
  // the admin search round-trip is one DB latency, not four.
  const [profileResult, emailResult, seatLookupResult, subsResult] =
    await Promise.all([
      userId
        ? supabase
            .from("user_profiles")
            .select("user_id, stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      userId ? fetchAuthEmail(supabase, userId) : Promise.resolve(null),
      // If the search was by payment_intent we already resolved the
      // seat row in resolveUserId; otherwise look it up by user_id.
      resolved.seatFromPi || !userId
        ? Promise.resolve(null)
        : supabase
            .from("lifetime_seats")
            .select("seat_number, status, stripe_payment_intent_id, claimed_at")
            .eq("user_id", userId)
            .eq("status", "claimed")
            .maybeSingle(),
      userId
        ? supabase
            .from("subscriptions")
            .select(
              "plan_type, status, stripe_subscription_id, current_period_end",
            )
            .eq("user_id", userId)
            .order("current_period_end", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] }),
    ]);

  const profile: {
    id: string;
    email: string | null;
    stripe_customer_id: string | null;
  } | null = userId
    ? {
        id: userId,
        email: emailResult,
        stripe_customer_id:
          (profileResult.data?.stripe_customer_id as
            | string
            | null
            | undefined) ?? null,
      }
    : null;

  const candidates: RefundCandidate[] = [];

  // Lifetime path. Either we got the seat directly via the
  // payment_intent search, or it came back from the parallel lookup.
  const seatRow = resolved.seatFromPi
    ? {
        seat_number: resolved.seatFromPi.seat_number,
        status: resolved.seatFromPi.status,
        stripe_payment_intent_id:
          resolved.seatFromPi.stripe_payment_intent_id,
        claimed_at: resolved.seatFromPi.claimed_at,
      }
    : (seatLookupResult && "data" in seatLookupResult
        ? (seatLookupResult.data as {
            seat_number: number;
            status: string;
            stripe_payment_intent_id: string | null;
            claimed_at: string;
          } | null)
        : null);

  if (seatRow && seatRow.status === "claimed") {
    const elig = await checkLifetimeRefundEligibility(
      supabase,
      userId ?? "",
      new Date(seatRow.claimed_at),
      { now },
    );
    candidates.push({
      kind: "lifetime",
      seat_number: seatRow.seat_number,
      status: seatRow.status,
      payment_intent_id: seatRow.stripe_payment_intent_id,
      claimed_at: seatRow.claimed_at,
      eligibility: elig,
    });
  }

  // Subscription path — uses the rows fetched in parallel above.
  const subs =
    subsResult && "data" in subsResult
      ? ((subsResult.data ?? []) as Array<{
          plan_type: string;
          status: string;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
        }>)
      : [];
  for (const sub of subs) {
    if (sub.plan_type !== "pro_monthly" && sub.plan_type !== "pro_yearly") {
      continue;
    }
    candidates.push({
      kind: "subscription",
      plan_type: sub.plan_type,
      status: sub.status,
      stripe_subscription_id: sub.stripe_subscription_id,
      current_period_end: sub.current_period_end,
      eligibility: checkSubscriptionRefundEligibility(sub.plan_type),
    });
  }

  return {
    query: { raw: rawQuery, kind: search.kind },
    user: profile,
    candidates,
    error:
      candidates.length === 0
        ? "No refundable charge found for this query."
        : null,
  };
}
