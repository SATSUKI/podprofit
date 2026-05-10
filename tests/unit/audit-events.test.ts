import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  handleChargeRefunded,
  logInvoicePaid,
  logInvoicePaymentFailed,
  logPaymentIntentSucceeded,
} from "@/lib/stripe/audit-events";
import { createSupabaseMock } from "./_supabase-mock";

function invoice(over: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  return {
    id: "in_test_1",
    object: "invoice",
    customer: "cus_abc",
    amount_paid: 900,
    amount_due: 900,
    attempt_count: 1,
    next_payment_attempt: null,
    currency: "usd",
    hosted_invoice_url: "https://stripe.com/invoice/x",
    number: "PODP-0001",
    ...over,
  } as unknown as Stripe.Invoice;
}

function pi(over: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent {
  return {
    id: "pi_test_1",
    object: "payment_intent",
    customer: "cus_abc",
    amount: 14900,
    currency: "usd",
    metadata: { plan_id: "lifetime" },
    ...over,
  } as unknown as Stripe.PaymentIntent;
}

function charge(over: Partial<Stripe.Charge> = {}): Stripe.Charge {
  return {
    id: "ch_test_1",
    object: "charge",
    customer: "cus_abc",
    payment_intent: "pi_lifetime_1",
    amount: 14900,
    amount_refunded: 14900,
    currency: "usd",
    ...over,
  } as unknown as Stripe.Charge;
}

describe("logInvoicePaid", () => {
  it("writes audit row with user_id resolved from stripe_customer_id", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_abc" }],
        audit_log: [],
      },
    });

    await logInvoicePaid(mock.client, invoice());
    const rows = mock.inspect("audit_log");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ user_id: "u1", action: "invoice_paid" });
    expect((rows[0].metadata as { invoice_id: string }).invoice_id).toBe("in_test_1");
  });

  it("writes audit row with null user_id when customer is unknown", async () => {
    const mock = createSupabaseMock({
      seed: { user_profiles: [], audit_log: [] },
    });
    await logInvoicePaid(mock.client, invoice({ customer: "cus_unknown" }));
    expect(mock.inspect("audit_log")[0].user_id).toBeNull();
  });
});

describe("logInvoicePaymentFailed", () => {
  it("captures attempt count and next_payment_attempt", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_abc" }],
        audit_log: [],
      },
    });
    const next = Math.floor(Date.now() / 1000) + 86400;
    await logInvoicePaymentFailed(
      mock.client,
      invoice({ attempt_count: 2, next_payment_attempt: next }),
    );
    const meta = mock.inspect("audit_log")[0].metadata as {
      attempt_count: number;
      next_payment_attempt: string;
    };
    expect(meta.attempt_count).toBe(2);
    expect(meta.next_payment_attempt).toBe(new Date(next * 1000).toISOString());
  });
});

describe("logPaymentIntentSucceeded", () => {
  it("preserves plan_id from PI metadata for analytics joins", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_abc" }],
        audit_log: [],
      },
    });
    await logPaymentIntentSucceeded(mock.client, pi());
    const meta = mock.inspect("audit_log")[0].metadata as { plan_id: string };
    expect(meta.plan_id).toBe("lifetime");
  });
});

describe("handleChargeRefunded", () => {
  it("logs refund and re-opens the lifetime seat on full refund", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_abc" }],
        audit_log: [],
        lifetime_seats: [
          {
            seat_number: 17,
            user_id: "u1",
            status: "claimed",
            stripe_payment_intent_id: "pi_lifetime_1",
          },
        ],
      },
    });

    await handleChargeRefunded(mock.client, charge());

    const seats = mock.inspect("lifetime_seats");
    expect(seats[0].status).toBe("refunded");
    expect(seats[0].refunded_at).toBeTruthy();

    const audit = mock.inspect("audit_log");
    const actions = audit.map((r) => r.action);
    expect(actions).toContain("charge_refunded");
    expect(actions).toContain("lifetime_seat_refunded");
  });

  it("does not touch the seat on partial refund (Stripe sometimes refunds tax only)", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_abc" }],
        audit_log: [],
        lifetime_seats: [
          {
            seat_number: 17,
            user_id: "u1",
            status: "claimed",
            stripe_payment_intent_id: "pi_lifetime_1",
          },
        ],
      },
    });

    await handleChargeRefunded(
      mock.client,
      charge({ amount_refunded: 1000 }), // partial
    );

    expect(mock.inspect("lifetime_seats")[0].status).toBe("claimed");
    const actions = mock.inspect("audit_log").map((r) => r.action);
    expect(actions).toContain("charge_refunded");
    expect(actions).not.toContain("lifetime_seat_refunded");
  });

  it("logs but does not crash when no matching seat is found (e.g. Pro refund)", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_abc" }],
        audit_log: [],
        lifetime_seats: [],
      },
    });

    await handleChargeRefunded(mock.client, charge({ payment_intent: "pi_pro_1" }));
    expect(mock.inspect("audit_log").map((r) => r.action)).toEqual([
      "charge_refunded",
    ]);
  });
});
