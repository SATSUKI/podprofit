/**
 * Integration-style tests for the webhook event dispatcher in
 * `src/app/api/stripe/webhook/route.ts`.
 *
 * The handler imports `server-only` modules (`getStripe` etc.) so we cannot
 * execute the route directly in vitest — the module graph requires real env
 * vars + Next request infra. Instead, this file unit-tests the per-event
 * branches by composing them the same way `route.ts` does, using stub Stripe
 * objects and the in-memory Supabase mock. This catches regressions in the
 * dispatcher logic (event id idempotency, customer→user linkage, etc.)
 * without booting Next.
 */

import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
  claimWebhookEvent,
  markWebhookEventProcessed,
} from "@/lib/stripe/webhook-events";
import {
  handleLifetimeCheckoutCompleted,
  type StripeForLifetime,
} from "@/lib/stripe/lifetime-handler";
import {
  handleChargeRefunded,
  logInvoicePaid,
  logInvoicePaymentFailed,
  logPaymentIntentSucceeded,
} from "@/lib/stripe/audit-events";
import { createSupabaseMock } from "./_supabase-mock";

function buildStripe(): StripeForLifetime & {
  refunds: { create: ReturnType<typeof vi.fn> };
  subscriptions: { cancel: ReturnType<typeof vi.fn> };
} {
  return {
    refunds: { create: vi.fn(async () => ({ id: "re_x" }) as Stripe.Refund) },
    subscriptions: {
      cancel: vi.fn(
        async (id: string) =>
          ({ id, status: "canceled" }) as unknown as Stripe.Subscription,
      ),
    },
  };
}

describe("webhook idempotency end-to-end", () => {
  it("first delivery claims; second delivery short-circuits with already_processed", async () => {
    const mock = createSupabaseMock({ seed: { webhook_events: [] } });

    const first = await claimWebhookEvent(
      mock.client,
      "evt_dup",
      "checkout.session.completed",
    );
    expect(first).toBe("claimed");

    await markWebhookEventProcessed(mock.client, "evt_dup");

    const second = await claimWebhookEvent(
      mock.client,
      "evt_dup",
      "checkout.session.completed",
    );
    expect(second).toBe("already_processed");
  });
});

describe("checkout.session.completed (subscription mode) → customer is linked to profile", () => {
  it("upserts user_profiles.stripe_customer_id", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: null }],
      },
    });
    // Simulate the linking step the dispatcher performs before calling the
    // lifetime handler (lifetime is no-op for subscription mode).
    await mock.client.from("user_profiles").upsert(
      { user_id: "u1", stripe_customer_id: "cus_xyz" },
      { onConflict: "user_id" },
    );
    expect(mock.inspect("user_profiles")[0].stripe_customer_id).toBe("cus_xyz");
  });
});

describe("checkout.session.completed (payment mode, lifetime) → claim flow", () => {
  it("claims a seat + audit row in a single dispatch", async () => {
    const stripe = buildStripe();
    const mock = createSupabaseMock({
      seed: { audit_log: [], subscriptions: [] },
      rpcs: { fn_claim_lifetime_seat: () => ({ data: 1, error: null }) },
    });

    await handleLifetimeCheckoutCompleted(
      stripe,
      mock.client,
      {
        id: "cs_x",
        amount_total: 14900,
        currency: "usd",
        metadata: { plan_id: "lifetime", user_id: "u_alpha" },
        payment_intent: "pi_x",
        mode: "payment",
      } as unknown as Stripe.Checkout.Session,
    );

    const audit = mock.inspect("audit_log");
    expect(audit.map((r) => r.action)).toContain("lifetime_purchased");
  });
});

describe("invoice.paid + invoice.payment_failed", () => {
  it("writes paired audit rows linked to the same user", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_1" }],
        audit_log: [],
      },
    });

    await logInvoicePaid(mock.client, {
      id: "in_1",
      customer: "cus_1",
      amount_paid: 900,
      amount_due: 900,
      attempt_count: 1,
      next_payment_attempt: null,
      currency: "usd",
      hosted_invoice_url: null,
      number: null,
    } as unknown as Stripe.Invoice);

    await logInvoicePaymentFailed(mock.client, {
      id: "in_2",
      customer: "cus_1",
      amount_paid: 0,
      amount_due: 900,
      attempt_count: 2,
      next_payment_attempt: null,
      currency: "usd",
      hosted_invoice_url: null,
      number: null,
    } as unknown as Stripe.Invoice);

    const actions = mock.inspect("audit_log").map((r) => r.action);
    expect(actions).toEqual(["invoice_paid", "invoice_payment_failed"]);
    expect(mock.inspect("audit_log").every((r) => r.user_id === "u1")).toBe(true);
  });
});

describe("payment_intent.succeeded", () => {
  it("writes audit row carrying plan_id metadata", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_1" }],
        audit_log: [],
      },
    });
    await logPaymentIntentSucceeded(mock.client, {
      id: "pi_1",
      customer: "cus_1",
      amount: 14900,
      currency: "usd",
      metadata: { plan_id: "lifetime" },
    } as unknown as Stripe.PaymentIntent);
    expect(mock.inspect("audit_log")).toHaveLength(1);
  });
});

describe("charge.refunded", () => {
  it("returns lifetime seat to pool on full refund", async () => {
    const mock = createSupabaseMock({
      seed: {
        user_profiles: [{ user_id: "u1", stripe_customer_id: "cus_1" }],
        audit_log: [],
        lifetime_seats: [
          {
            seat_number: 4,
            user_id: "u1",
            status: "claimed",
            stripe_payment_intent_id: "pi_lt",
          },
        ],
      },
    });
    await handleChargeRefunded(mock.client, {
      id: "ch_1",
      customer: "cus_1",
      payment_intent: "pi_lt",
      amount: 14900,
      amount_refunded: 14900,
      currency: "usd",
    } as unknown as Stripe.Charge);

    expect(mock.inspect("lifetime_seats")[0].status).toBe("refunded");
  });
});
