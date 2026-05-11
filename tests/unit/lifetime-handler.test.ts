import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
  handleLifetimeCheckoutCompleted,
  type StripeForLifetime,
} from "@/lib/stripe/lifetime-handler";
import { createSupabaseMock } from "./_supabase-mock";

function buildSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    amount_total: 14900,
    currency: "usd",
    customer: null,
    metadata: { plan_id: "lifetime" },
    payment_intent: "pi_test_abc",
    mode: "payment",
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

function buildStripeStub(): StripeForLifetime & {
  refunds: { create: ReturnType<typeof vi.fn> };
  subscriptions: { cancel: ReturnType<typeof vi.fn> };
} {
  return {
    refunds: {
      create: vi.fn(async () => ({ id: "re_test_1" }) as Stripe.Refund),
    },
    subscriptions: {
      cancel: vi.fn(
        async (id: string) =>
          ({ id, status: "canceled" }) as unknown as Stripe.Subscription,
      ),
    },
  };
}

describe("handleLifetimeCheckoutCompleted", () => {
  it("no-ops for non-lifetime plans", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [], lifetime_seats: [] },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: null, error: null }),
      },
    });

    const result = await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ metadata: { plan_id: "pro_monthly" } }),
    );

    expect(result.outcome).toBe("no_op");
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(mock.inspect("audit_log")).toHaveLength(0);
  });

  it("claims a seat and writes an audit_log row on success", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [] },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: 17, error: null }),
      },
    });

    const result = await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ metadata: { plan_id: "lifetime", user_id: "user_42" } }),
    );

    expect(result).toEqual({ outcome: "claimed", seatNumber: 17 });
    expect(stripe.refunds.create).not.toHaveBeenCalled();

    const auditRows = mock.inspect("audit_log");
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({
      user_id: "user_42",
      action: "lifetime_purchased",
    });
    expect((auditRows[0].metadata as { seat_number: number }).seat_number).toBe(17);
  });

  it("refunds and audits when seats are sold out", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [] },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: null, error: null }),
      },
    });

    const result = await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession(),
    );

    expect(result.outcome).toBe("refunded_capacity");
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: "pi_test_abc",
        reason: "duplicate",
      }),
    );
    expect(mock.inspect("audit_log")[0]).toMatchObject({
      action: "lifetime_purchase_refunded_capacity",
    });
  });

  it("throws when payment_intent is missing", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [] },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: 1, error: null }),
      },
    });

    await expect(
      handleLifetimeCheckoutCompleted(
        stripe,
        mock.client,
        buildSession({ payment_intent: null }),
      ),
    ).rejects.toThrow(/missing payment_intent/);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("propagates RPC errors so the caller can release for retry", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [] },
      rpcs: {
        fn_claim_lifetime_seat: () => ({
          data: null,
          error: { message: "deadlock detected" },
        }),
      },
    });

    await expect(
      handleLifetimeCheckoutCompleted(stripe, mock.client, buildSession()),
    ).rejects.toThrow(/fn_claim_lifetime_seat failed: deadlock detected/);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("accepts a string-form payment_intent", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [] },
      rpcs: {
        fn_claim_lifetime_seat: (params) => {
          // assert the RPC sees the same id we passed in
          expect(params.p_payment_intent_id).toBe("pi_string_form");
          return { data: 5, error: null };
        },
      },
    });

    const result = await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ payment_intent: "pi_string_form" }),
    );
    expect(result.seatNumber).toBe(5);
  });

  it("links to user_id from session metadata when present", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [] },
      rpcs: {
        fn_claim_lifetime_seat: (params) => {
          expect(params.p_user_id).toBe("user_99");
          return { data: 42, error: null };
        },
      },
    });

    await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({
        metadata: { plan_id: "lifetime", user_id: "user_99" },
      }),
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // PODP-35: Lifetime purchase cancels any active Pro subscription with
  // prorated refund. Tests guard the auto-cancel path so a future refactor
  // can't regress duplicate billing.
  // ────────────────────────────────────────────────────────────────────────

  it("cancels active Pro subscription with prorate+invoice_now after Lifetime claim", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: {
        audit_log: [],
        subscriptions: [
          {
            user_id: "u_pro",
            stripe_subscription_id: "sub_pro_active",
            plan_type: "pro_monthly",
            status: "active",
          },
        ],
      },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: 7, error: null }),
      },
    });

    const result = await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ metadata: { plan_id: "lifetime", user_id: "u_pro" } }),
    );

    expect(result).toMatchObject({
      outcome: "claimed",
      seatNumber: 7,
      cancelledProSubscriptionId: "sub_pro_active",
    });

    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith(
      "sub_pro_active",
      expect.objectContaining({ prorate: true, invoice_now: true }),
    );

    const actions = mock.inspect("audit_log").map((r) => r.action);
    expect(actions).toContain("lifetime_purchased");
    expect(actions).toContain("pro_cancelled_after_lifetime");
  });

  it("does not call subscriptions.cancel when no active Pro sub exists", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [], subscriptions: [] },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: 12, error: null }),
      },
    });

    const result = await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ metadata: { plan_id: "lifetime", user_id: "u_fresh" } }),
    );

    expect(result.outcome).toBe("claimed");
    expect(result.cancelledProSubscriptionId).toBeUndefined();
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
    const actions = mock.inspect("audit_log").map((r) => r.action);
    expect(actions).not.toContain("pro_cancelled_after_lifetime");
  });

  it("audits but does not throw when subscriptions.cancel fails (already-canceled / network)", async () => {
    const stripe = buildStripeStub();
    stripe.subscriptions.cancel.mockRejectedValueOnce(
      new Error("subscription already canceled"),
    );
    const mock = createSupabaseMock({
      seed: {
        audit_log: [],
        subscriptions: [
          {
            user_id: "u_pro",
            stripe_subscription_id: "sub_pro_zombie",
            plan_type: "pro_monthly",
            status: "active",
          },
        ],
      },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: 9, error: null }),
      },
    });

    const result = await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ metadata: { plan_id: "lifetime", user_id: "u_pro" } }),
    );

    expect(result.outcome).toBe("claimed");
    expect(result.cancelledProSubscriptionId).toBeUndefined();
    const actions = mock.inspect("audit_log").map((r) => r.action);
    expect(actions).toContain("lifetime_purchased");
    expect(actions).toContain("pro_cancel_after_lifetime_failed");
  });

  it("does not auto-cancel when the Pro sub is already canceled / past lifecycle", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: {
        audit_log: [],
        subscriptions: [
          {
            user_id: "u_pro",
            stripe_subscription_id: "sub_pro_old",
            plan_type: "pro_monthly",
            status: "canceled",
          },
        ],
      },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: 1, error: null }),
      },
    });

    const result = await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ metadata: { plan_id: "lifetime", user_id: "u_pro" } }),
    );

    expect(result.outcome).toBe("claimed");
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────────────────────────
  // PODP-12: founding_members row seeding on successful Lifetime claim.
  // ────────────────────────────────────────────────────────────────────────

  it("seeds a founding_members row (opt-out by default) on successful Lifetime claim", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [], founding_members: [], subscriptions: [] },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: 42, error: null }),
      },
    });

    await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ metadata: { plan_id: "lifetime", user_id: "u_fm" } }),
    );

    const members = mock.inspect("founding_members");
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      user_id: "u_fm",
      display_x_handle: false,
      x_handle: null,
    });
  });

  it("does not seed a founding_members row when session has no user_id (anonymous Lifetime claim)", async () => {
    const stripe = buildStripeStub();
    const mock = createSupabaseMock({
      seed: { audit_log: [], founding_members: [] },
      rpcs: {
        fn_claim_lifetime_seat: () => ({ data: 1, error: null }),
      },
    });

    await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      buildSession({ metadata: { plan_id: "lifetime" } }),
    );

    expect(mock.inspect("founding_members")).toHaveLength(0);
  });
});
