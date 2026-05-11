/**
 * Per-IP, per-minute rate limiter for the /admin/* surface (PODP-29).
 *
 * Separate from `src/lib/api/rate-limit.ts` (Public API, 100 req / 24h) and
 * `src/lib/refund/rate-limit.ts` (refund beacon, 60 req / min): admin has a
 * narrow budget (10 req / min / IP) intended to slow credential-stuffing
 * attempts against the Basic-auth gate without blocking a legitimate
 * operator who may reload a few dashboard pages in quick succession.
 *
 * In-memory, per-instance (Edge cold-start resets the bucket). Acceptable
 * trade-off pre-launch: an attacker hitting many region replicas would
 * still face the Basic-auth check on every request, which is the actual
 * primary defence. The rate limiter just keeps the audit log readable.
 */

const WINDOW_MS = 60 * 1000; // 1 minute rolling window
const MAX_REQUESTS_PER_WINDOW = 10;

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

export interface AdminRateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  windowSeconds: number;
}

export function consumeAdmin(
  key: string,
  now: number = Date.now(),
): AdminRateLimitResult {
  const cutoff = now - WINDOW_MS;
  const existing = buckets.get(key);
  const hits = existing ? existing.hits.filter((t) => t > cutoff) : [];

  if (hits.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = hits[0]!;
    const retryMs = Math.max(0, oldest + WINDOW_MS - now);
    buckets.set(key, { hits });
    return {
      ok: false,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)),
      windowSeconds: WINDOW_MS / 1000,
    };
  }

  hits.push(now);
  buckets.set(key, { hits });
  return {
    ok: true,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: MAX_REQUESTS_PER_WINDOW - hits.length,
    retryAfterSeconds: 0,
    windowSeconds: WINDOW_MS / 1000,
  };
}

export function __resetAdminRateLimitForTests(): void {
  buckets.clear();
}

export const ADMIN_RATE_LIMIT_CONFIG = Object.freeze({
  windowMs: WINDOW_MS,
  maxRequestsPerWindow: MAX_REQUESTS_PER_WINDOW,
});
