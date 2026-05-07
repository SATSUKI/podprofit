/**
 * Lightweight spam classification for the public Contact form.
 *
 * Design (per Task 22 brief):
 *   - Stage 1 (this file): heuristic-only. Honeypot + URL count + keyword
 *     blocklist + duplicate-burst dedupe. No external services.
 *   - Stage 2 (post-launch): swap to a learned model once we have enough
 *     labeled inquiries.
 *
 * The exported predicates are intentionally pure — the API route composes
 * them so unit tests can pin behaviour without mocking the route handler.
 */

/** Lower-bound number of URL-looking tokens that marks a message as spam. */
export const SPAM_URL_THRESHOLD = 3;

/**
 * Word/phrase blocklist. All matches are case-insensitive, whole-token,
 * and substring-anchored (e.g., "click here" must appear contiguously).
 *
 * NOT a comprehensive list — it's a deliberately small starter set that
 * catches the most common SEO/affiliate spam Substack/contact forms see.
 * Expand as we observe attacks; do NOT add ambiguous terms (e.g., "free")
 * that legitimate refund requests might use.
 */
export const SPAM_KEYWORDS: readonly string[] = [
  "make money fast",
  "click here",
  "buy followers",
  "seo backlinks",
  "guest post opportunity",
  "crypto investment",
  "viagra",
  "casino",
  "loan offer",
  "weight loss pill",
];

/** Window inside which two submissions from the same email count as a duplicate burst. */
export const DUPLICATE_BURST_WINDOW_MS = 10_000;

/**
 * Count URL-looking tokens in `message`. Counts both bare hostnames
 * (example.com) and full URLs (https://example.com/path). The detector
 * deliberately over-counts (e.g., "a.b.c" reads as one URL) — false
 * positives are routed to spam status rather than dropped, so a legitimate
 * sender gets a 200 either way and the COO can recover from triage.
 */
export function countUrls(message: string): number {
  // Match either:
  //   - http(s)://... up to a whitespace boundary
  //   - bare hostname with a TLD (foo.com, foo.co.uk)
  const urlRe = /(https?:\/\/\S+)|((?:[a-z0-9-]+\.)+[a-z]{2,})/gi;
  const matches = message.match(urlRe);
  return matches ? matches.length : 0;
}

/** Returns true if the message contains a blocked keyword/phrase. */
export function containsSpamKeyword(message: string): boolean {
  const lower = message.toLowerCase();
  return SPAM_KEYWORDS.some((kw) => lower.includes(kw));
}

export type SpamReason = "honeypot" | "url_flood" | "keyword" | "duplicate_burst";

export type SpamClassification =
  | { spam: false }
  | { spam: true; reason: SpamReason };

/**
 * Classify a candidate inquiry. Order matters: honeypot is the cheapest,
 * keyword the most CPU. Duplicate-burst detection is checked separately
 * by the caller (it requires DB lookup).
 */
export function classifyInquiry(input: {
  message: string;
  honeypotValue: string | null | undefined;
}): SpamClassification {
  if (input.honeypotValue && input.honeypotValue.trim().length > 0) {
    return { spam: true, reason: "honeypot" };
  }
  if (countUrls(input.message) >= SPAM_URL_THRESHOLD) {
    return { spam: true, reason: "url_flood" };
  }
  if (containsSpamKeyword(input.message)) {
    return { spam: true, reason: "keyword" };
  }
  return { spam: false };
}

/**
 * Returns true if the candidate inquiry should be treated as a duplicate
 * burst (same email submitted within `windowMs`). The caller passes in
 * the most-recent prior inquiry's `created_at` for that email.
 *
 * `now`/`priorCreatedAt` are millisecond epoch values (NOT Date objects)
 * so this stays pure and trivially mockable.
 */
export function isDuplicateBurst(
  priorCreatedAtMs: number | null,
  nowMs: number,
  windowMs: number = DUPLICATE_BURST_WINDOW_MS,
): boolean {
  if (priorCreatedAtMs == null) return false;
  return nowMs - priorCreatedAtMs < windowMs;
}
