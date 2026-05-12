import { describe, expect, it } from "vitest";
import {
  classifySearch,
  findRefundCandidates,
} from "@/lib/admin/refund-lookup";
import { createSupabaseMock } from "./_supabase-mock";

const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("classifySearch", () => {
  it("recognises Stripe payment_intent ids by the pi_ prefix", () => {
    expect(classifySearch("pi_3PqAbcDEF").kind).toBe("payment_intent");
  });

  it("recognises uuid-shaped strings as a user_id", () => {
    expect(classifySearch(USER_ID).kind).toBe("user_id");
  });

  it("recognises emails", () => {
    expect(classifySearch("alice@example.com").kind).toBe("email");
  });

  it("returns kind='unknown' for everything else (admin UI surfaces a hint)", () => {
    expect(classifySearch("hello world").kind).toBe("unknown");
    expect(classifySearch("").kind).toBe("unknown");
  });

  it("trims surrounding whitespace before classifying", () => {
    expect(classifySearch("  pi_xyz  ").kind).toBe("payment_intent");
    expect(classifySearch("  pi_xyz  ").value).toBe("pi_xyz");
  });
});

describe("findRefundCandidates (Lifetime by payment_intent)", () => {
  it("returns the Lifetime candidate with the eligibility verdict when within the cooling-off window", async () => {
    // Anchor `now` so the eligibility helper produces a stable result.
    const now = new Date("2026-06-10T12:00:00Z");
    const claimedAt = new Date(
      now.getTime() - 3 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [
          {
            seat_number: 7,
            user_id: USER_ID,
            status: "claimed",
            stripe_payment_intent_id: "pi_3PqAbcLife",
            claimed_at: claimedAt,
          },
        ],
        user_profiles: [
          { user_id: USER_ID, stripe_customer_id: "cus_abc" },
        ],
        subscriptions: [],
      },
    });

    const result = await findRefundCandidates(mock.client, "pi_3PqAbcLife", {
      now,
    });

    expect(result.query.kind).toBe("payment_intent");
    expect(result.candidates).toHaveLength(1);
    const c = result.candidates[0];
    expect(c.kind).toBe("lifetime");
    if (c.kind === "lifetime") {
      expect(c.seat_number).toBe(7);
      expect(c.eligibility.eligible).toBe(true);
      expect(c.eligibility.reason).toBe("eligible");
    }
  });

  it("flags 'not eligible' once the 14-day window has closed", async () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const claimedAt = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [
          {
            seat_number: 8,
            user_id: USER_ID,
            status: "claimed",
            stripe_payment_intent_id: "pi_old",
            claimed_at: claimedAt,
          },
        ],
        user_profiles: [],
        subscriptions: [],
      },
    });

    const result = await findRefundCandidates(mock.client, "pi_old", { now });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.eligibility.eligible).toBe(false);
    expect(result.candidates[0]?.eligibility.reason).toBe("outside_window");
  });

  it("returns an empty list and a friendly error when the payment_intent has no matching seat", async () => {
    const mock = createSupabaseMock({
      seed: { lifetime_seats: [], user_profiles: [], subscriptions: [] },
    });
    const result = await findRefundCandidates(mock.client, "pi_ghost");
    expect(result.candidates).toEqual([]);
    expect(result.error).toMatch(/no lifetime seat/i);
  });
});

describe("findRefundCandidates (user_id path)", () => {
  it("returns Lifetime + subscription candidates side-by-side", async () => {
    const now = new Date("2026-06-10T12:00:00Z");
    const claimedAt = new Date(
      now.getTime() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [
          {
            seat_number: 12,
            user_id: USER_ID,
            status: "claimed",
            stripe_payment_intent_id: "pi_lifetime_12",
            claimed_at: claimedAt,
          },
        ],
        user_profiles: [
          { user_id: USER_ID, stripe_customer_id: "cus_xyz" },
        ],
        subscriptions: [
          {
            user_id: USER_ID,
            plan_type: "pro_monthly",
            status: "active",
            stripe_subscription_id: "sub_1",
            current_period_end: "2026-07-01T00:00:00Z",
          },
        ],
      },
    });

    const result = await findRefundCandidates(mock.client, USER_ID, { now });
    expect(result.candidates).toHaveLength(2);
    const kinds = result.candidates.map((c) => c.kind);
    expect(kinds).toContain("lifetime");
    expect(kinds).toContain("subscription");

    const sub = result.candidates.find((c) => c.kind === "subscription");
    expect(sub?.eligibility.eligible).toBe(false);
    expect(sub?.eligibility.reason).toBe("no_proration");
  });

  it("does not surface candidates for users with neither a seat nor a subscription", async () => {
    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [],
        user_profiles: [{ user_id: USER_ID, stripe_customer_id: null }],
        subscriptions: [],
      },
    });
    const result = await findRefundCandidates(mock.client, USER_ID);
    expect(result.candidates).toEqual([]);
    expect(result.error).toMatch(/no refundable charge/i);
  });
});

describe("findRefundCandidates (unrecognised input)", () => {
  it("returns a helpful hint when the input is not an email/uuid/pi_", async () => {
    const mock = createSupabaseMock({ seed: {} });
    const result = await findRefundCandidates(mock.client, "just-some-string");
    expect(result.query.kind).toBe("unknown");
    expect(result.error).toMatch(/email.*user_id.*pi_/i);
  });
});
