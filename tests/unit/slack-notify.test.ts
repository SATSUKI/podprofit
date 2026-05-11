import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetSlackNotifyForTests,
  notifyLifetimeLowSeats,
  notifyPaymentFailed,
  notifyWebhookFailed,
} from "@/lib/observability/slack-notify";

describe("slack-notify (QA monitoring G)", () => {
  beforeEach(() => {
    __resetSlackNotifyForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SLACK_WEBHOOK_URL;
  });

  it("is a no-op when SLACK_WEBHOOK_URL is unset (does not throw, does not fetch)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await notifyWebhookFailed({
      eventId: "evt_1",
      eventType: "checkout.session.completed",
      error: new Error("boom"),
    });
    await notifyWebhookFailed({
      eventId: "evt_2",
      eventType: "checkout.session.completed",
      error: new Error("boom"),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    // warn-once: two calls should produce one warn line, not two.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toMatch(/SLACK_WEBHOOK_URL/);
  });

  it("POSTs a Slack-shaped payload to SLACK_WEBHOOK_URL on webhook failure", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test/AAA";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    await notifyWebhookFailed({
      eventId: "evt_abc",
      eventType: "charge.refunded",
      error: new Error("supabase deadlock"),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hooks.slack.com/test/AAA");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );

    const body = JSON.parse(init.body as string);
    expect(body.text).toContain("charge.refunded");
    expect(body.text).toContain("evt_abc");
    // Body must surface the error summary in a block.
    const blockText = body.blocks?.[0]?.text?.text ?? "";
    expect(blockText).toContain("supabase deadlock");
  });

  it("strips long error messages to a Slack-safe length and removes secrets-shaped tokens", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test/BBB";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const longMessage = "secret payload ".repeat(200);
    await notifyWebhookFailed({
      eventId: "evt_long",
      eventType: "invoice.payment_failed",
      error: new Error(longMessage),
    });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
    );
    const blockText = body.blocks[0].text.text;
    // 400-char cap inside the helper.
    expect(blockText.length).toBeLessThan(800);
  });

  it("notifyPaymentFailed formats a credit-card alert with the failure reason", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test/CCC";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    await notifyPaymentFailed({
      eventId: "evt_pf",
      eventType: "invoice.payment_failed",
      reason: "card_declined",
    });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body.text).toContain("invoice.payment_failed");
    expect(body.text).toContain("evt_pf");
    expect(body.blocks[0].text.text).toContain("card_declined");
    // PII check: no email or PI id leaks through helper input shape.
    expect(body.blocks[0].text.text).not.toMatch(/@.+\..+/);
  });

  it("notifyLifetimeLowSeats includes the remaining-seats count", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test/DDD";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    await notifyLifetimeLowSeats({ seatsRemaining: 5, capacity: 100 });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body.text).toContain("*5*");
    expect(body.text).toContain("100");
  });

  it("swallows fetch failures (e.g., Slack outage) without throwing — webhook flow continues", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test/EEE";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("ECONNRESET"),
    );

    await expect(
      notifyWebhookFailed({
        eventId: "evt_x",
        eventType: "charge.refunded",
        error: new Error("downstream"),
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("logs a warn when Slack returns non-2xx but still resolves", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test/FFF";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("invalid_payload", { status: 400 }),
    );

    await expect(
      notifyPaymentFailed({
        eventId: "evt_400",
        eventType: "invoice.payment_failed",
        reason: "x",
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/non-2xx from Slack webhook \(400\)/),
    );
  });
});
