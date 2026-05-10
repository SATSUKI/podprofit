import { describe, expect, it } from "vitest";
import {
  getCurrentPlanSnapshot,
  getLifetimeRemaining,
} from "@/lib/stripe/current-plan";
import { createSupabaseMock } from "./_supabase-mock";

describe("getCurrentPlanSnapshot", () => {
  it("returns null/false defaults for a fresh user", async () => {
    const mock = createSupabaseMock({
      seed: { user_profiles: [], lifetime_seats: [], subscriptions: [] },
    });
    const snap = await getCurrentPlanSnapshot(mock.client, "u_new");
    expect(snap).toEqual({
      stripeCustomerId: null,
      hasLifetime: false,
      activeProSubscription: null,
    });
  });

  it("surfaces Lifetime ownership", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_1" }],
        lifetime_seats: [
          { seat_number: 3, user_id: "u1", status: "claimed" },
        ],
        subscriptions: [],
      },
    });
    const snap = await getCurrentPlanSnapshot(mock.client, "u1");
    expect(snap.hasLifetime).toBe(true);
    expect(snap.stripeCustomerId).toBe("cus_1");
  });

  it("ignores refunded lifetime seats (the seat is back in the pool)", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [],
        lifetime_seats: [
          { seat_number: 3, user_id: "u1", status: "refunded" },
        ],
        subscriptions: [],
      },
    });
    const snap = await getCurrentPlanSnapshot(mock.client, "u1");
    expect(snap.hasLifetime).toBe(false);
  });

  it("picks an active Pro subscription and exposes its id + plan_type", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [],
        lifetime_seats: [],
        subscriptions: [
          {
            user_id: "u1",
            stripe_subscription_id: "sub_a",
            plan_type: "pro_monthly",
            status: "active",
          },
        ],
      },
    });
    const snap = await getCurrentPlanSnapshot(mock.client, "u1");
    expect(snap.activeProSubscription).toEqual({
      id: "sub_a",
      planType: "pro_monthly",
      status: "active",
    });
  });

  it("ignores canceled / incomplete_expired subscriptions", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [],
        lifetime_seats: [],
        subscriptions: [
          {
            user_id: "u1",
            stripe_subscription_id: "sub_old",
            plan_type: "pro_monthly",
            status: "canceled",
          },
          {
            user_id: "u1",
            stripe_subscription_id: "sub_dead",
            plan_type: "pro_monthly",
            status: "incomplete_expired",
          },
        ],
      },
    });
    const snap = await getCurrentPlanSnapshot(mock.client, "u1");
    expect(snap.activeProSubscription).toBeNull();
  });

  it("counts `incomplete` and `paused` and `past_due` as active to gate double-spend", async () => {
    for (const status of ["incomplete", "paused", "past_due", "trialing"]) {
      const mock = createSupabaseMock({
        seed: {
          user_profiles: [],
          lifetime_seats: [],
          subscriptions: [
            {
              user_id: "u1",
              stripe_subscription_id: `sub_${status}`,
              plan_type: "pro_monthly",
              status,
            },
          ],
        },
      });
      const snap = await getCurrentPlanSnapshot(mock.client, "u1");
      expect(snap.activeProSubscription, status).not.toBeNull();
    }
  });
});

describe("getLifetimeRemaining", () => {
  it("returns the cap minus claimed count", async () => {
    const claimed = Array.from({ length: 8 }, (_, i) => ({
      seat_number: i + 1,
      user_id: `u${i}`,
      status: "claimed",
    }));
    const refunded = [{ seat_number: 9, user_id: null, status: "refunded" }];
    const mock = createSupabaseMock({
      seed: { lifetime_seats: [...claimed, ...refunded] },
    });
    const remaining = await getLifetimeRemaining(mock.client, 100);
    // Only `claimed` rows count against the cap.
    expect(remaining).toBe(92);
  });

  it("never reports negative remaining (defensive clamp)", async () => {
    const claimed = Array.from({ length: 105 }, (_, i) => ({
      seat_number: i + 1,
      user_id: `u${i}`,
      status: "claimed",
    }));
    const mock = createSupabaseMock({
      seed: { lifetime_seats: claimed },
    });
    const remaining = await getLifetimeRemaining(mock.client, 100);
    expect(remaining).toBe(0);
  });
});
