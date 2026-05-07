import { describe, expect, it } from "vitest";
import {
  checkLifetimeRefundEligibility,
  checkProductRefundEligibility,
  LIFETIME_REFUND_WINDOW_DAYS,
} from "@/lib/refund/check-eligibility";
import { createSupabaseMock } from "./_supabase-mock";

const USER_ID = "user_lifetime_42";
// Anchor the "now" reference so tests are deterministic regardless of CI clock.
const NOW = new Date("2026-06-15T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

describe("checkLifetimeRefundEligibility", () => {
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

  it("is NOT eligible at day 8 (outside window) — even with zero launches", async () => {
    const mock = createSupabaseMock({ seed: { usage_events: [] } });
    const purchaseAt = daysAgo(8);

    const result = await checkLifetimeRefundEligibility(
      mock.client,
      USER_ID,
      purchaseAt,
      { now: NOW },
    );

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("outside_window");
    expect(result.detail).toMatch(/8 day/);
  });

  it("is NOT eligible at day 6 if any launch was recorded since purchase", async () => {
    const purchaseAt = daysAgo(6);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          {
            id: "evt-1",
            user_id: USER_ID,
            event_type: "calculator_launched",
            occurred_at: daysAgo(5).toISOString(),
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

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("calculator_launched");
  });

  it("ignores launches that happened BEFORE purchaseAt (free-tier exploration shouldn't disqualify)", async () => {
    const purchaseAt = daysAgo(3);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          // 10 days ago — clearly before purchase, must not count.
          {
            id: "evt-old",
            user_id: USER_ID,
            event_type: "calculator_launched",
            occurred_at: daysAgo(10).toISOString(),
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

  it("scopes the count to this user only — another user's launches don't disqualify", async () => {
    const purchaseAt = daysAgo(2);
    const mock = createSupabaseMock({
      seed: {
        usage_events: [
          {
            id: "evt-other",
            user_id: "user_someone_else",
            event_type: "calculator_launched",
            occurred_at: daysAgo(1).toISOString(),
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

  it("constant LIFETIME_REFUND_WINDOW_DAYS matches the Terms §7.1 promise", () => {
    expect(LIFETIME_REFUND_WINDOW_DAYS).toBe(7);
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
