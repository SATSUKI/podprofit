/**
 * In-memory IP-based rate limiter for the public Public API
 * (`/api/v1/calculate`).
 *
 * Why a *new* module instead of reusing `src/lib/refund/rate-limit.ts`?
 *   - That module is tagged `single-use`: 60 req / minute, sized for the
 *     refund-eligibility tracking endpoint. The Public API contract (per
 *     launch announcement v2 / FAQ Q22) is a different envelope: 100
 *     requests per IP per ROLLING 24h window. Reusing the same Map would
 *     conflate two unrelated quotas and either over-restrict the refund
 *     beacon or under-restrict the API.
 *
 * Why not Vercel KV / Upstash here?
 *   - Per CEO "no premature investment" principle, paid infra is avoided
 *     until traffic justifies it. The launch announcement explicitly
 *     framed this as a *soft* 100 req/day cap (CEO note in Task 4 of
 *     `engineering-impl-plan-w2-w5-v2.md`). In-memory is acceptable;
 *     Lambda cold-start resets bias *toward* the user (more headroom),
 *     which is the friendly failure mode.
 *   - Promotion path (post-MRR): swap this module's storage for a Vercel
 *     KV / Upstash backed implementation. The exported `consume` API is
 *     deliberately storage-agnostic so the call sites don't change.
 *
 * NOT THREAD-SAFE FOR DISTRIBUTED USE. Each Lambda / Edge instance keeps
 * its own counters; a determined client hitting many region replicas
 * could exceed the soft cap. That's a known trade-off documented in the
 * impl plan.
 */

// `server-only` deliberately omitted: this module is consumed by route
// handlers running at the Edge runtime (`/api/v1/calculate/route.ts`),
// where the `server-only` guard is satisfied implicitly. Importing it
// here would force a Node-only build for a function that's pure JS.

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24h rolling window
const MAX_REQUESTS_PER_WINDOW = 100;

type Bucket = {
  /**
   * Sliding-window approximation: list of request timestamps within the
   * active window. We trim on each call. For a 100-req/24h budget the
   * memory cost per IP is ~1.6 KB worst case (100 × 8-byte numbers + map
   * overhead), trivially small for our launch traffic ceiling.
   */
  hits: number[];
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  /** True if the request is permitted (under the cap). */
  ok: boolean;
  /** Configured ceiling, returned for response-header convenience. */
  limit: number;
  /** Requests left in the current window AFTER this call (>= 0). */
  remaining: number;
  /**
   * Seconds until at least one slot frees up. Always >= 1 when `ok` is
   * false; meaningless when `ok` is true (returns 0).
   */
  retryAfterSeconds: number;
  /** Window length, fixed at 24h. Useful for body / headers. */
  windowSeconds: number;
};

/**
 * Consume one request slot for `key`. Returns the post-call state.
 *
 * The `now` arg is for tests (clock injection). Production callers should
 * omit it.
 */
export function consume(
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  const cutoff = now - WINDOW_MS;

  const existing = buckets.get(key);
  // Trim expired hits in-place; allocate lazily.
  let hits: number[];
  if (existing) {
    hits = existing.hits.filter((t) => t > cutoff);
  } else {
    hits = [];
  }

  if (hits.length >= MAX_REQUESTS_PER_WINDOW) {
    // Compute Retry-After: the moment when the *oldest* hit ages out.
    const oldest = hits[0]!;
    const retryMs = Math.max(0, oldest + WINDOW_MS - now);
    // Persist the trimmed list so we don't re-trim next call.
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

/**
 * Resolve the client's IP from forwarded headers. Returns `null` when no
 * upstream proxy populated either header (e.g., direct local dev) — the
 * caller should treat `null` as "skip rate limiting + log a warning",
 * since attributing requests to a shared "unknown" bucket would
 * cross-penalise unrelated users.
 *
 * TODO(authenticated bypass): once the Public API supports API keys for
 * Pro / Lifetime users, prefer the authenticated subject id over IP
 * before falling back to this helper.
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) {
    const trimmed = real.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/** Test-only: wipe state between cases. Do NOT call from production code. */
export function __resetApiRateLimitForTests(): void {
  buckets.clear();
}

/** Exported for unit tests / observability. Do not mutate. */
export const API_RATE_LIMIT_CONFIG = Object.freeze({
  windowMs: WINDOW_MS,
  maxRequestsPerWindow: MAX_REQUESTS_PER_WINDOW,
});
