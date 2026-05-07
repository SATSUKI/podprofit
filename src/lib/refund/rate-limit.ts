import "server-only";

/**
 * Tiny in-memory rate limiter for the calculator-launch tracking endpoint.
 *
 * Why not Vercel KV / Upstash here?
 *   - Per CEO "no premature investment" principle, paid infra is avoided
 *     until traffic justifies it. Calculator-launch tracking is a low-
 *     stakes write — at worst, an aggressive client floods their *own*
 *     refund eligibility (more rows = farther from "zero launches"),
 *     which is the opposite of an attack vector.
 *   - The hard rate-limit story for the public `/api/v1/calculate`
 *     endpoint (Task 21 in engineering-impl-plan-w2-w5-v2.md) ships
 *     separately with KV-backed counters.
 *
 * This module gives us a 60 req/min per-IP soft cap that survives a hot
 * Lambda but resets on cold start — fine for the refund-log use case,
 * inadequate for anything where eviction matters. Do not reuse this for
 * the public API.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, now: number = Date.now()): {
  ok: boolean;
  remaining: number;
  resetAt: number;
} {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, fresh);
    return { ok: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: fresh.resetAt };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: MAX_REQUESTS_PER_WINDOW - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Test-only helper to reset state between cases. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
