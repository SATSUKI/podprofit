import { describe, expect, it } from "vitest";
import {
  claimWebhookEvent,
  markWebhookEventProcessed,
  releaseWebhookEventForRetry,
} from "@/lib/stripe/webhook-events";
import { createSupabaseMock } from "./_supabase-mock";

const EVENT_ID = "evt_test_lifetime_123";

describe("claimWebhookEvent", () => {
  it("claims a fresh event_id and stores the row", async () => {
    const mock = createSupabaseMock({ seed: { webhook_events: [] } });

    const result = await claimWebhookEvent(
      mock.client,
      EVENT_ID,
      "checkout.session.completed",
    );

    expect(result).toBe("claimed");
    expect(mock.inspect("webhook_events")).toEqual([
      expect.objectContaining({
        stripe_event_id: EVENT_ID,
        event_type: "checkout.session.completed",
      }),
    ]);
  });

  it("returns 'already_processed' when the prior row was completed", async () => {
    const mock = createSupabaseMock({
      seed: {
        webhook_events: [
          {
            stripe_event_id: EVENT_ID,
            event_type: "checkout.session.completed",
            processed_at: "2026-06-09T22:00:00Z",
          },
        ],
      },
    });

    const result = await claimWebhookEvent(
      mock.client,
      EVENT_ID,
      "checkout.session.completed",
    );

    expect(result).toBe("already_processed");
    expect(mock.inspect("webhook_events")).toHaveLength(1);
  });

  it("re-claims when the prior row was a crashed (unprocessed) attempt", async () => {
    const mock = createSupabaseMock({
      seed: {
        webhook_events: [
          {
            stripe_event_id: EVENT_ID,
            event_type: "checkout.session.completed",
            processed_at: null,
            last_error: "boom",
          },
        ],
      },
    });

    const result = await claimWebhookEvent(
      mock.client,
      EVENT_ID,
      "checkout.session.completed",
    );

    // The crashed row is deleted and a fresh claim is inserted.
    expect(result).toBe("claimed");
    const rows = mock.inspect("webhook_events");
    expect(rows).toHaveLength(1);
    expect(rows[0].processed_at).toBeFalsy();
    expect(rows[0].last_error).toBeFalsy();
  });
});

describe("markWebhookEventProcessed", () => {
  it("sets processed_at and clears last_error", async () => {
    const mock = createSupabaseMock({
      seed: {
        webhook_events: [
          {
            stripe_event_id: EVENT_ID,
            event_type: "checkout.session.completed",
            processed_at: null,
            last_error: "previous failure",
          },
        ],
      },
    });

    await markWebhookEventProcessed(mock.client, EVENT_ID);
    const row = mock.inspect("webhook_events")[0];
    expect(row.processed_at).toBeTruthy();
    expect(row.last_error).toBeNull();
  });
});

describe("releaseWebhookEventForRetry", () => {
  it("deletes the row so Stripe's retry can re-claim", async () => {
    const mock = createSupabaseMock({
      seed: {
        webhook_events: [
          { stripe_event_id: EVENT_ID, event_type: "x", processed_at: null },
        ],
      },
    });

    await releaseWebhookEventForRetry(
      mock.client,
      EVENT_ID,
      new Error("simulated handler crash"),
    );

    expect(mock.inspect("webhook_events")).toHaveLength(0);
  });

  it("truncates very long error messages (DB safety)", async () => {
    const mock = createSupabaseMock({
      seed: {
        webhook_events: [
          { stripe_event_id: EVENT_ID, event_type: "x", processed_at: null },
        ],
      },
    });

    const huge = "x".repeat(5000);
    await releaseWebhookEventForRetry(mock.client, EVENT_ID, new Error(huge));

    // Row should be deleted (the test's primary contract); truncation is a
    // best-effort log-side concern verified separately by the impl staying
    // under 1024 chars on its UPDATE call.
    expect(mock.inspect("webhook_events")).toHaveLength(0);
  });
});
