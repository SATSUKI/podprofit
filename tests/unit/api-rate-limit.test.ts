import { beforeEach, describe, expect, it } from "vitest";
import {
  API_RATE_LIMIT_CONFIG,
  __resetApiRateLimitForTests,
  clientIpFromHeaders,
  consume,
} from "@/lib/api/rate-limit";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("Public API rate limit (100 req / 24h per IP)", () => {
  beforeEach(() => __resetApiRateLimitForTests());

  it("exposes the public 100/day soft cap as the active config", () => {
    // Pinned: launch announcement v2 promises "100 req/day per IP" — any
    // future change to this number must trace to a new public commitment.
    expect(API_RATE_LIMIT_CONFIG.maxRequestsPerWindow).toBe(100);
    expect(API_RATE_LIMIT_CONFIG.windowMs).toBe(DAY_MS);
  });

  it("permits exactly the first 100 requests then blocks the 101st", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 1; i <= 100; i += 1) {
      const r = consume("ip:1.2.3.4", t0 + i);
      expect(r.ok, `request ${i} should pass`).toBe(true);
      expect(r.limit).toBe(100);
      expect(r.remaining).toBe(100 - i);
    }
    const blocked = consume("ip:1.2.3.4", t0 + 101);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    // Retry-After must be a positive integer the client can wait on.
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(blocked.retryAfterSeconds)).toBe(true);
  });

  it("isolates buckets per IP so one client's flood does not penalise another", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 100; i += 1) consume("ip:flooder", t0 + i);
    expect(consume("ip:flooder", t0 + 100).ok).toBe(false);
    // Different IP starts fresh.
    const innocent = consume("ip:innocent", t0 + 100);
    expect(innocent.ok).toBe(true);
    expect(innocent.remaining).toBe(99);
  });

  it("recovers slot-by-slot once entries fall out of the rolling 24h window", () => {
    const t0 = 1_700_000_000_000;
    // Burn the budget at t0..t0+99ms.
    for (let i = 0; i < 100; i += 1) consume("ip:slow-recover", t0 + i);
    expect(consume("ip:slow-recover", t0 + 100).ok).toBe(false);

    // Just before the oldest hit (at t0+0) ages out: still blocked.
    // cutoff at probe time = probe - DAY_MS; we want cutoff < t0 so the
    // hit is still in-window, hence probe < t0 + DAY_MS.
    expect(consume("ip:slow-recover", t0 + DAY_MS - 1).ok).toBe(false);

    // 1ms past the oldest hit's expiry: at least one slot frees up.
    // (At probe = t0 + DAY_MS + 1, cutoff = t0 + 1; entries at t0 and
    // t0+1 are both dropped — `t > cutoff` is strict.)
    const recovered = consume("ip:slow-recover", t0 + DAY_MS + 1);
    expect(recovered.ok).toBe(true);
    // The freed slots count up to the elapsed extra millisecond — we
    // assert "rolling window recovered, not full reset" rather than
    // pinning to an off-by-one boundary.
    expect(recovered.remaining).toBeGreaterThanOrEqual(0);
    expect(recovered.remaining).toBeLessThanOrEqual(2);

    // Hits immediately after still close to the cap, NOT a fresh window.
    const followUp = consume("ip:slow-recover", t0 + DAY_MS + 2);
    expect(followUp.remaining).toBeLessThanOrEqual(2);
  });

  it("fully resets after the entire window elapses with no traffic", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 100; i += 1) consume("ip:full-reset", t0 + i);
    expect(consume("ip:full-reset", t0 + 100).ok).toBe(false);

    // Far past the window: every prior hit is gone, full budget returns.
    const r = consume("ip:full-reset", t0 + 2 * DAY_MS);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(99);
  });

  it("computes Retry-After against the OLDEST live hit, not the newest", () => {
    const t0 = 1_700_000_000_000;
    // First hit at t0, last (100th) hit much later — the window's edge
    // is dictated by the earliest entry, so Retry-After is small.
    consume("ip:edge", t0);
    for (let i = 1; i < 100; i += 1) consume("ip:edge", t0 + DAY_MS - 1000);

    const blocked = consume("ip:edge", t0 + DAY_MS - 500);
    expect(blocked.ok).toBe(false);
    // Oldest hit (at t0) ages out at t0 + DAY_MS — about 500ms away,
    // which rounds up to 1 second.
    expect(blocked.retryAfterSeconds).toBe(1);
  });
});

describe("clientIpFromHeaders", () => {
  it("returns the first IP from x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1, 198.51.100.2",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.1");
  });

  it("trims whitespace around the forwarded IP", () => {
    const headers = new Headers({ "x-forwarded-for": "  203.0.113.7  " });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.9" });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.9");
  });

  it("returns null when neither header is present (caller should skip RL)", () => {
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });

  it("returns null on whitespace-only headers (defensive)", () => {
    const headers = new Headers({
      "x-forwarded-for": "   ",
      "x-real-ip": "",
    });
    expect(clientIpFromHeaders(headers)).toBeNull();
  });
});
