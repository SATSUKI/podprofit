import { beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_RATE_LIMIT_CONFIG,
  __resetAdminRateLimitForTests,
  consumeAdmin,
} from "@/lib/api/admin-rate-limit";

describe("Admin rate limit (10 req / min / IP)", () => {
  beforeEach(() => __resetAdminRateLimitForTests());

  it("exposes the configured ceiling", () => {
    expect(ADMIN_RATE_LIMIT_CONFIG.maxRequestsPerWindow).toBe(10);
    expect(ADMIN_RATE_LIMIT_CONFIG.windowMs).toBe(60_000);
  });

  it("permits exactly 10 requests and blocks the 11th", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 1; i <= 10; i += 1) {
      const r = consumeAdmin("admin:1.2.3.4", t0 + i);
      expect(r.ok, `request ${i} should pass`).toBe(true);
      expect(r.remaining).toBe(10 - i);
    }
    const blocked = consumeAdmin("admin:1.2.3.4", t0 + 11);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("isolates buckets per IP", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 10; i += 1) consumeAdmin("admin:flooder", t0 + i);
    expect(consumeAdmin("admin:flooder", t0 + 10).ok).toBe(false);
    const innocent = consumeAdmin("admin:innocent", t0 + 10);
    expect(innocent.ok).toBe(true);
    expect(innocent.remaining).toBe(9);
  });

  it("recovers slots once the rolling 60s window slides", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 10; i += 1) consumeAdmin("admin:slow", t0 + i);
    expect(consumeAdmin("admin:slow", t0 + 10).ok).toBe(false);
    // Advance 61 seconds so all 10 hits have aged out.
    const r = consumeAdmin("admin:slow", t0 + 61_000);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(9);
  });

  it("returns retryAfterSeconds aligned to the oldest hit ageing out", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 10; i += 1) consumeAdmin("admin:wait", t0 + i);
    const blocked = consumeAdmin("admin:wait", t0 + 5_000);
    expect(blocked.ok).toBe(false);
    // Oldest hit at t0; it ages out at t0 + 60_000. At t0+5s, retry-after
    // is roughly 55s.
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(54);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(56);
  });
});
