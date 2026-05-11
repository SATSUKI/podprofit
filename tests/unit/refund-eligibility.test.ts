import { describe, expect, it } from "vitest";
import {
  checkLifetimeRefundEligibility,
  checkProductRefundEligibility,
  checkSubscriptionRefundEligibility,
  LIFETIME_REFUND_WINDOW_DAYS,
} from "@/lib/refund/check-eligibility";
import { createSupabaseMock } from "./_supabase-mock";

const USER_ID = "user_lifetime_42";
// Anchor the "now" reference so tests are deterministic regardless of CI clock.
const NOW = new Date("2026-06-15T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

describe("checkLifetimeRefundEligibility (cooling-off policy 2026-05-11: 14 days, no launch gate)", () => {
  it("is eligible at day 6 with zero launches", async () => {
    const mock = createSupabaseMock({
      seed: { usage_events: [] },
    });
    const purchaseAt = daysAgo(6);

    const result = await checkLifetimeRefundEligibility(
      mock.client,
      USER_ID,
      purchaseAt,
      { now: NOW },
    );

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("eligible");
  });

  it("is eligible at day 13 (just inside the 14-day window)", async () => {
    const mock = createSupabaseMock({ seed: { usage_events: [] } });
    const purchaseAt = daysAgo(13);

    const result = await checkLifetimeRefundEligibility(
      mock.client,
      USER_ID,
      purchaseAt,
      { now: NOW },
    );

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("eligible");
  });

  it("is NOT eligible at day 15 (outside the 14-day window)", async () => {
    const mock = createSupabaseMock({ seed: { usage_events: [] } });
    const purchaseAt = daysAgo(15);

    const result = await checkLifetimeRefundEligibility(
      mock.client,
      USER_ID,
      purchaseAt,
      { now: NOW },
    );

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("outside_window");
    expect(result.detail).toMatch(/15 day/);
    expect(result.detail).toMatch(/14 days/);
  });

  it("CORE policy-change case: eligible at day 10 even with many launches recorded since purchase", async () => {
    // This is the heart of the 2026-05-11 policy change. Under the old
    // rule (7-day window + zero launches), the user below would have
    // been disqualified by `calculator_launched`. Under the new rule
    // (14-day window only) they are eligible. We seed multiple launch
    // rows on purpose to make the regression-detection intent explicit.
    const purchaseAt = daysAgo(10);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          {
            id: "evt-1",
            user_id: USER_ID,
            event_type: "calculator_launched",
            occurred_at: daysAgo(9).toISOString(),
            product_slug: null,
            metadata: null,
          },
          {
            id: "evt-2",
            user_id: USER_ID,
            event_type: "calculator_launched",
            occurred_at: daysAgo(5).toISOString(),
            product_slug: null,
            metadata: null,
          },
          {
            id: "evt-3",
            user_id: USER_ID,
            event_type: "calculator_launched",
            occurred_at: daysAgo(2).toISOString(),
            product_slug: null,
            metadata: null,
          },
        ],
      },
    });

    const result = await checkLifetimeRefundEligibility(
      mock.client,
      USER_ID,
      purchaseAt,
      { now: NOW },
    );

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("eligible");
  });

  it("is eligible at day 5 even with launches recorded (launches are no longer disqualifying)", async () => {
    const purchaseAt = daysAgo(5);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          {
            id: "evt-1",
            user_id: USER_ID,
            event_type: "calculator_launched",
            occurred_at: daysAgo(4).toISOString(),
            product_slug: null,
            metadata: null,
          },
        ],
      },
    });

    const result = await checkLifetimeRefundEligibility(
      mock.client,
      USER_ID,
      purchaseAt,
      { now: NOW },
    );

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("eligible");
  });

  it("treats a future-dated purchaseAt as a lookup failure (defensive)", async () => {
    const mock = createSupabaseMock({ seed: { usage_events: [] } });
    const future = new Date(NOW.getTime() + 60_000);

    const result = await checkLifetimeRefundEligibility(
      mock.client,
      USER_ID,
      future,
      { now: NOW },
    );

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("lookup_failed");
  });

  it("constant LIFETIME_REFUND_WINDOW_DAYS reflects the 2026-05-11 cooling-off policy", () => {
    expect(LIFETIME_REFUND_WINDOW_DAYS).toBe(14);
  });
});

describe("checkSubscriptionRefundEligibility (Pro Monthly / Pro Annual — no proration)", () => {
  it("returns no_proration for Pro Monthly", () => {
    const result = checkSubscriptionRefundEligibility("pro_monthly");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("no_proration");
    expect(result.detail).toMatch(/Pro Monthly/);
  });

  it("returns no_proration for Pro Annual (pro_yearly)", () => {
    const result = checkSubscriptionRefundEligibility("pro_yearly");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("no_proration");
    expect(result.detail).toMatch(/Pro Annual/);
  });

  it("is a pure policy function — does not depend on any database lookup", () => {
    // No supabase client passed; if this ever starts touching the DB
    // the signature change will break this test.
    const r1 = checkSubscriptionRefundEligibility("pro_monthly");
    const r2 = checkSubscriptionRefundEligibility("pro_monthly");
    expect(r1).toEqual(r2);
  });
});

describe("checkProductRefundEligibility", () => {
  const PRODUCT = "excel-template-2026";

  it("is eligible when zero downloads of the product since purchase", async () => {
    const mock = createSupabaseMock({ seed: { usage_events: [] } });
    const purchaseAt = daysAgo(3);

    const result = await checkProductRefundEligibility(
      mock.client,
      USER_ID,
      PRODUCT,
      purchaseAt,
    );

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("eligible");
  });

  it("is NOT eligible after even one download of the product", async () => {
    const purchaseAt = daysAgo(2);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          {
            id: "dl-1",
            user_id: USER_ID,
            event_type: "product_downloaded",
            product_slug: PRODUCT,
            occurred_at: daysAgo(1).toISOString(),
            metadata: null,
          },
        ],
      },
    });

    const result = await checkProductRefundEligibility(
      mock.client,
      USER_ID,
      PRODUCT,
      purchaseAt,
    );

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("product_downloaded");
  });

  it("a download of a DIFFERENT product does not disqualify this product's refund", async () => {
    const purchaseAt = daysAgo(2);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          {
            id: "dl-other",
            user_id: USER_ID,
            event_type: "product_downloaded",
            product_slug: "benchmark-report-2026",
            occurred_at: daysAgo(1).toISOString(),
            metadata: null,
          },
        ],
      },
    });

    const result = await checkProductRefundEligibility(
      mock.client,
      USER_ID,
      PRODUCT,
      purchaseAt,
    );

    expect(result.eligible).toBe(true);
  });

  it("ignores downloads from before purchase (refunds gate post-purchase activity only)", async () => {
    const purchaseAt = daysAgo(1);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          {
            id: "dl-pre",
            user_id: USER_ID,
            event_type: "product_downloaded",
            product_slug: PRODUCT,
            occurred_at: daysAgo(5).toISOString(),
            metadata: null,
          },
        ],
      },
    });

    const result = await checkProductRefundEligibility(
      mock.client,
      USER_ID,
      PRODUCT,
      purchaseAt,
    );

    expect(result.eligible).toBe(true);
  });

  it("a calculator_launched row does NOT disqualify a product refund", async () => {
    // Sanity: product refund is gated by product_downloaded only.
    const purchaseAt = daysAgo(2);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          {
            id: "calc",
            user_id: USER_ID,
            event_type: "calculator_launched",
            product_slug: null,
            occurred_at: daysAgo(1).toISOString(),
            metadata: null,
          },
        ],
      },
    });

    const result = await checkProductRefundEligibility(
      mock.client,
      USER_ID,
      PRODUCT,
      purchaseAt,
    );

    expect(result.eligible).toBe(true);
  });
});
