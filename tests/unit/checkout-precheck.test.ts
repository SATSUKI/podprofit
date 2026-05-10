import { describe, expect, it } from "vitest";
import { evaluateCheckoutPrecheck } from "@/lib/stripe/checkout-precheck";
import type { CurrentPlanSnapshot } from "@/lib/stripe/current-plan";

function snapshot(over: Partial<CurrentPlanSnapshot> = {}): CurrentPlanSnapshot {
  return {
    stripeCustomerId: null,
    hasLifetime: false,
    activeProSubscription: null,
    ...over,
  };
}

describe("evaluateCheckoutPrecheck — Lifetime target", () => {
  it("denies when user already has Lifetime", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "lifetime",
      snapshot: snapshot({ hasLifetime: true }),
      lifetimeRemaining: 50,
    });
    expect(r.decision).toBe("deny");
    if (r.decision === "deny") {
      expect(r.reason).toBe("buying_lifetime_again");
      expect(r.message.toLowerCase()).toContain("already");
    }
  });

  it("denies when sold out", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "lifetime",
      snapshot: snapshot(),
      lifetimeRemaining: 0,
    });
    expect(r.decision).toBe("deny");
    if (r.decision === "deny") {
      expect(r.reason).toBe("lifetime_sold_out");
      expect(r.message.toLowerCase()).toContain("sold out");
    }
  });

  it("requires confirm when active Pro sub exists (so user understands the cancel + refund)", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "lifetime",
      snapshot: snapshot({
        activeProSubscription: {
          id: "sub_1",
          planType: "pro_monthly",
          status: "active",
        },
      }),
      lifetimeRemaining: 50,
    });
    expect(r.decision).toBe("confirm_required");
  });

  it("proceeds when active Pro sub exists and confirmed=true", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "lifetime",
      snapshot: snapshot({
        activeProSubscription: {
          id: "sub_1",
          planType: "pro_monthly",
          status: "active",
        },
      }),
      lifetimeRemaining: 50,
      confirmed: true,
    });
    expect(r.decision).toBe("proceed");
  });

  it("proceeds when no Pro sub and seats remain", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "lifetime",
      snapshot: snapshot(),
      lifetimeRemaining: 92,
    });
    expect(r.decision).toBe("proceed");
  });

  it("sold-out wins over Pro-confirm gate (no point asking the user to cancel for nothing)", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "lifetime",
      snapshot: snapshot({
        activeProSubscription: {
          id: "sub_1",
          planType: "pro_monthly",
          status: "active",
        },
      }),
      lifetimeRemaining: 0,
    });
    expect(r.decision).toBe("deny");
    if (r.decision === "deny") expect(r.reason).toBe("lifetime_sold_out");
  });

  it("already-Lifetime wins over sold-out (clearer message for re-purchase)", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "lifetime",
      snapshot: snapshot({ hasLifetime: true }),
      lifetimeRemaining: 0,
    });
    expect(r.decision).toBe("deny");
    if (r.decision === "deny") expect(r.reason).toBe("buying_lifetime_again");
  });
});

describe("evaluateCheckoutPrecheck — Pro target", () => {
  it("denies Pro when user already has Lifetime", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "pro_monthly",
      snapshot: snapshot({ hasLifetime: true }),
      lifetimeRemaining: 50,
    });
    expect(r.decision).toBe("deny");
    if (r.decision === "deny") {
      expect(r.reason).toBe("buying_pro_after_lifetime");
    }
  });

  it("redirects Pro→Pro to portal so the user changes plans inside Stripe (not via a 2nd sub)", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "pro_yearly",
      snapshot: snapshot({
        activeProSubscription: {
          id: "sub_1",
          planType: "pro_monthly",
          status: "active",
        },
      }),
      lifetimeRemaining: 50,
    });
    expect(r.decision).toBe("redirect_portal");
  });

  it("redirects Pro→Pro even when desired plan === current plan (same-plan duplicate-buy)", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "pro_monthly",
      snapshot: snapshot({
        activeProSubscription: {
          id: "sub_1",
          planType: "pro_monthly",
          status: "active",
        },
      }),
      lifetimeRemaining: 50,
    });
    expect(r.decision).toBe("redirect_portal");
  });

  it("proceeds for fresh Free user buying Pro", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "pro_monthly",
      snapshot: snapshot(),
      lifetimeRemaining: 50,
    });
    expect(r.decision).toBe("proceed");
  });

  it("treats `incomplete` Pro as active (prevents double-spend in a 2nd tab)", () => {
    const r = evaluateCheckoutPrecheck({
      desiredPlan: "pro_monthly",
      snapshot: snapshot({
        activeProSubscription: {
          id: "sub_1",
          planType: "pro_monthly",
          status: "incomplete",
        },
      }),
      lifetimeRemaining: 50,
    });
    expect(r.decision).toBe("redirect_portal");
  });
});
