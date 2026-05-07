/**
 * In-memory IP-based rate limiter for the public Contact form
 * (`/api/contact`).
 *
 * Why a separate module from `src/lib/api/rate-limit.ts`:
 *   - Different envelope: the public Calculator API allows 100 req / 24h
 *     (read-heavy, soft cap for AIO crawlers / dev tooling). The Contact
 *     form is write-heavy and the legitimate ceiling is much smaller — 5
 *     inquiries / hour / IP captures even an unusually chatty refund case
 *     while making spam burst attacks costly.
 *   - Sharing the Map would conflate the two budgets and either let spam
 *     through (if we relaxed) or starve API users (if we tightened).
 *
 * Promotion path (post-MRR): swap the in-memory Map for Vercel KV /
 * Upstash. The exported `consume` API is storage-agnostic so call sites
 * don't change.
 *
 * NOT THREAD-SAFE FOR DISTRIBUTED USE: each Lambda / Edge instance keeps
 * its own counters. A determined attacker hitting many region replicas
 * could exceed the soft cap. Acceptable trade-off given the Contact
 * volume we expect at launch (single-digit inquiries / day).
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_INQUIRIES_PER_WINDOW = 5;

type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

export type ContactRateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  windowSeconds: number;
};

/** Consume one slot for `key` and return the post-call state. */
export function consumeContact(
  key: string,
  now: number = Date.now(),
): ContactRateLimitResult {
  const cutoff = now - WINDOW_MS;

  const existing = buckets.get(key);
  let hits: number[];
  if (existing) {
    hits = existing.hits.filter((t) => t > cutoff);
  } else {
    hits = [];
  }

  if (hits.length >= MAX_INQUIRIES_PER_WINDOW) {
    const oldest = hits[0]!;
    const retryMs = Math.max(0, oldest + WINDOW_MS - now);
    buckets.set(key, { hits });
    return {
      ok: false,
      limit: MAX_INQUIRIES_PER_WINDOW,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)),
      windowSeconds: WINDOW_MS / 1000,
    };
  }

  hits.push(now);
  buckets.set(key, { hits });
  return {
    ok: true,
    limit: MAX_INQUIRIES_PER_WINDOW,
    remaining: MAX_INQUIRIES_PER_WINDOW - hits.length,
    retryAfterSeconds: 0,
    windowSeconds: WINDOW_MS / 1000,
  };
}

/** Test-only: wipe state between cases. */
export function __resetContactRateLimitForTests(): void {
  buckets.clear();
}

/** Exposed for tests / observability. Do not mutate. */
export const CONTACT_RATE_LIMIT_CONFIG = Object.freeze({
  windowMs: WINDOW_MS,
  maxInquiriesPerWindow: MAX_INQUIRIES_PER_WINDOW,
});
