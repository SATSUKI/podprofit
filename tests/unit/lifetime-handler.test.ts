import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
  handleLifetimeCheckoutCompleted,
  type RefundIssuer,
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

function buildStripeStub(): RefundIssuer & {
  refunds: { create: ReturnType<typeof vi.fn> };
} {
  return {
    refunds: {
      create: vi.fn(async () => ({ id: "re_test_1" }) as Stripe.Refund),
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
});
