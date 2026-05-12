import { describe, expect, it } from "vitest";
import { loadKpiSnapshot, startOfUtcDay } from "@/lib/admin/kpis";
import { createSupabaseMock } from "./_supabase-mock";

/**
 * Unit tests for the admin dashboard KPI loader (PODP-53 v1).
 *
 * These tests pin the read shape — i.e. *which* tables/columns the
 * dashboard probes — because the contract is small enough to be worth
 * locking down (it's what the CEO sees on /admin home).
 */

const NOW = new Date("2026-06-10T15:00:00Z");

describe("startOfUtcDay", () => {
  it("strips the time-of-day to 00:00:00.000Z", () => {
    expect(startOfUtcDay(NOW).toISOString()).toBe("2026-06-10T00:00:00.000Z");
  });

  it("rounds down to UTC, not local time, so dashboards are clock-agnostic", () => {
    // 2026-01-01T23:30:00 UTC is still in 2026-01-01 UTC.
    const stamp = new Date("2026-01-01T23:30:00Z");
    expect(startOfUtcDay(stamp).toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});

describe("loadKpiSnapshot", () => {
  it("counts only claimed Lifetime seats, leaves total at the 100 cap", async () => {
    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [
          { seat_number: 1, status: "claimed" },
          { seat_number: 2, status: "claimed" },
          { seat_number: 3, status: "refunded" },
        ],
        webhook_events: [],
        inquiries: [],
        refund_audit_log: [],
      },
    });

    const snap = await loadKpiSnapshot(mock.client, NOW);

    expect(snap.lifetimeClaimed).toBe(2);
    expect(snap.lifetimeTotal).toBe(100);
  });

  it("counts only inquiries with status='new' (matches scripts/check-inquiries.ts)", async () => {
    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [],
        webhook_events: [],
        inquiries: [
          { id: "a", status: "new" },
          { id: "b", status: "new" },
          { id: "c", status: "replied" },
          { id: "d", status: "spam" },
        ],
        refund_audit_log: [],
      },
    });

    const snap = await loadKpiSnapshot(mock.client, NOW);
    expect(snap.inquiriesNew).toBe(2);
  });

  it("counts webhook events received since 00:00 UTC of `now`, ignoring older rows", async () => {
    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [],
        webhook_events: [
          { stripe_event_id: "evt_old", received_at: "2026-06-09T23:00:00Z" },
          { stripe_event_id: "evt_today_1", received_at: "2026-06-10T01:00:00Z" },
          { stripe_event_id: "evt_today_2", received_at: "2026-06-10T14:30:00Z" },
        ],
        inquiries: [],
        refund_audit_log: [],
      },
    });

    const snap = await loadKpiSnapshot(mock.client, NOW);
    expect(snap.webhookEventsToday).toBe(2);
  });

  it("counts refund_audit_log rows from the trailing 7 days", async () => {
    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [],
        webhook_events: [],
        inquiries: [],
        refund_audit_log: [
          // 2 days ago → in window
          { id: "r1", created_at: "2026-06-08T12:00:00Z" },
          // 6 days ago → in window
          { id: "r2", created_at: "2026-06-04T12:00:00Z" },
          // 8 days ago → out of window
          { id: "r3", created_at: "2026-06-02T12:00:00Z" },
        ],
      },
    });

    const snap = await loadKpiSnapshot(mock.client, NOW);
    expect(snap.refundsLast7d).toBe(2);
  });

  it("returns 0 (not null) when a table is empty, so the dashboard shows '0' rather than '—'", async () => {
    const mock = createSupabaseMock({
      seed: {
        lifetime_seats: [],
        webhook_events: [],
        inquiries: [],
        refund_audit_log: [],
      },
    });

    const snap = await loadKpiSnapshot(mock.client, NOW);
    expect(snap.lifetimeClaimed).toBe(0);
    expect(snap.webhookEventsToday).toBe(0);
    expect(snap.inquiriesNew).toBe(0);
    expect(snap.refundsLast7d).toBe(0);
  });
});
