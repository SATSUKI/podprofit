/**
 * PODP-62 — Stripe email-keyed fallback check.
 *
 * Belt-and-braces guard against duplicate Lifetime purchases when the
 * DB-side `lifetime_seats.user_id` is NULL (anonymous Lifetime flow).
 *
 * The helper must:
 *   - Return `hasPriorPurchase: true` when ANY Stripe customer with the
 *     same email has a succeeded PaymentIntent tagged
 *     `metadata.plan_id === "lifetime"`.
 *   - Return false when the email is unknown, the customer has no PIs,
 *     or all PIs are non-Lifetime / non-succeeded.
 *   - Never throw — Stripe failures fall through to "no prior purchase"
 *     so the caller's primary precheck stays in control.
 */
import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { hasPriorLifetimePurchaseByEmail } from "@/lib/stripe/email-fallback-check";

type Customer = Pick<Stripe.Customer, "id" | "email">;
type PI = Pick<Stripe.PaymentIntent, "id" | "status" | "metadata">;

function makeStripeStub(
  customersByEmail: Record<string, Customer[]>,
  pisByCustomer: Record<string, PI[]>,
  failures: Partial<{ customers: boolean; pis: boolean }> = {},
) {
  return {
    customers: {
      list: async (params: Stripe.CustomerListParams) => {
        if (failures.customers) throw new Error("stripe customers.list down");
        return {
          data: (customersByEmail[params.email as string] ?? []) as Stripe.Customer[],
        } as Stripe.ApiList<Stripe.Customer>;
      },
    },
    paymentIntents: {
      list: async (params: Stripe.PaymentIntentListParams) => {
        if (failures.pis) throw new Error("stripe paymentIntents.list down");
        return {
          data: (pisByCustomer[params.customer as string] ?? []) as Stripe.PaymentIntent[],
        } as Stripe.ApiList<Stripe.PaymentIntent>;
      },
    },
    charges: {
      list: async () => ({ data: [] }) as unknown as Stripe.ApiList<Stripe.Charge>,
    },
  };
}

describe("hasPriorLifetimePurchaseByEmail", () => {
  it("returns true when a customer with the email has a succeeded Lifetime PI", async () => {
    const stripe = makeStripeStub(
      { "buyer@example.com": [{ id: "cus_1", email: "buyer@example.com" }] },
      {
        cus_1: [
          {
            id: "pi_lifetime",
            status: "succeeded",
            metadata: { plan_id: "lifetime" },
          },
        ],
      },
    );

    const r = await hasPriorLifetimePurchaseByEmail(stripe, {
      email: "buyer@example.com",
      lifetimePriceId: "price_lifetime",
    });

    expect(r.hasPriorPurchase).toBe(true);
    expect(r.paymentIntentId).toBe("pi_lifetime");
    expect(r.customerId).toBe("cus_1");
  });

  it("returns false when the customer's PIs are all non-Lifetime", async () => {
    const stripe = makeStripeStub(
      { "buyer@example.com": [{ id: "cus_1", email: "buyer@example.com" }] },
      {
        cus_1: [
          {
            id: "pi_pro",
            status: "succeeded",
            metadata: { plan_id: "pro_monthly" },
          },
        ],
      },
    );

    const r = await hasPriorLifetimePurchaseByEmail(stripe, {
      email: "buyer@example.com",
      lifetimePriceId: "price_lifetime",
    });

    expect(r.hasPriorPurchase).toBe(false);
  });

  it("returns false when the Lifetime PI didn't succeed", async () => {
    const stripe = makeStripeStub(
      { "buyer@example.com": [{ id: "cus_1", email: "buyer@example.com" }] },
      {
        cus_1: [
          {
            id: "pi_failed",
            status: "requires_payment_method",
            metadata: { plan_id: "lifetime" },
          },
        ],
      },
    );

    const r = await hasPriorLifetimePurchaseByEmail(stripe, {
      email: "buyer@example.com",
      lifetimePriceId: null,
    });

    expect(r.hasPriorPurchase).toBe(false);
  });

  it("returns false when no Stripe customer exists for the email", async () => {
    const stripe = makeStripeStub({}, {});

    const r = await hasPriorLifetimePurchaseByEmail(stripe, {
      email: "ghost@example.com",
      lifetimePriceId: "price_lifetime",
    });

    expect(r.hasPriorPurchase).toBe(false);
    expect(r.paymentIntentId).toBeNull();
    expect(r.customerId).toBeNull();
  });

  it("swallows Stripe failures (caller's primary precheck stays in charge)", async () => {
    const stripe = makeStripeStub({}, {}, { customers: true });

    const r = await hasPriorLifetimePurchaseByEmail(stripe, {
      email: "buyer@example.com",
      lifetimePriceId: "price_lifetime",
    });

    expect(r.hasPriorPurchase).toBe(false);
  });

  it("finds the Lifetime PI even when the user has multiple Stripe customers under the same email", async () => {
    // Stripe allows duplicate customers per email. The Lifetime purchase
    // can be on the second/third customer if the buyer paid through
    // Checkout once, then a billing-portal-created customer was added
    // later. We must scan all customers, not just the first.
    const stripe = makeStripeStub(
      {
        "buyer@example.com": [
          { id: "cus_pro", email: "buyer@example.com" },
          { id: "cus_lifetime", email: "buyer@example.com" },
        ],
      },
      {
        cus_pro: [
          {
            id: "pi_pro",
            status: "succeeded",
            metadata: { plan_id: "pro_monthly" },
          },
        ],
        cus_lifetime: [
          {
            id: "pi_life",
            status: "succeeded",
            metadata: { plan_id: "lifetime" },
          },
        ],
      },
    );

    const r = await hasPriorLifetimePurchaseByEmail(stripe, {
      email: "buyer@example.com",
      lifetimePriceId: null,
    });

    expect(r.hasPriorPurchase).toBe(true);
    expect(r.customerId).toBe("cus_lifetime");
    expect(r.paymentIntentId).toBe("pi_life");
  });

  it("returns false for empty/missing email (defensive)", async () => {
    const stripe = makeStripeStub({}, {});

    const r = await hasPriorLifetimePurchaseByEmail(stripe, {
      email: "",
      lifetimePriceId: null,
    });

    expect(r.hasPriorPurchase).toBe(false);
  });
});
