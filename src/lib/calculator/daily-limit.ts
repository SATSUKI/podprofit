/**
 * Browser-local "50 calculations per day" gate for the free-tier
 * calculator (Task 5 in `engineering-impl-plan-w2-w5-v2.md`).
 *
 * Why localStorage and not server state?
 *   - Public Calculator is unauthenticated; we have no stable user id.
 *   - The launch announcement v2 explicitly framed the cap as "per
 *     browser" (FAQ Q22). That phrasing matches the localStorage
 *     accuracy class — incognito or a different browser legitimately
 *     resets the counter, which is fair-use friction (not a hard
 *     security boundary).
 *
 * Pure functions only — the React component owns the actual storage
 * read/write so that this module stays trivial to unit-test.
 */

export const DAILY_LIMIT = 50;
const KEY_PREFIX = "pp_calc_count_";

/**
 * Returns the storage key for a given calendar day. We use the local
 * date (YYYY-MM-DD) — per task spec, "the user's perspective" is what
 * matters, not UTC.
 */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${KEY_PREFIX}${y}-${m}-${d}`;
}

/**
 * A minimal Storage shape — fits both real `window.localStorage` and the
 * fake-storage doubles used in tests. We avoid the DOM `Storage` type
 * because it carries `length` and `key()` we don't use.
 */
export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type DailyLimitState = {
  /** Calculations used today (>= 0). 0 when no record exists. */
  count: number;
  /** Whether the user has hit or exceeded the cap. */
  blocked: boolean;
  /** Calculations remaining today. May be 0 (when blocked). */
  remaining: number;
};

export function readState(
  storage: StorageLike,
  now: Date = new Date(),
): DailyLimitState {
  const raw = storage.getItem(dayKey(now));
  const parsed = raw == null ? 0 : Number.parseInt(raw, 10);
  // Defend against tampered / corrupted values: NaN, negatives, or
  // absurdly large numbers all collapse to 0 (fresh day) so a user can't
  // permanently brick their calculator by pasting junk into devtools.
  const count =
    Number.isFinite(parsed) && parsed >= 0 && parsed < 1_000_000 ? parsed : 0;
  const blocked = count >= DAILY_LIMIT;
  const remaining = blocked ? 0 : DAILY_LIMIT - count;
  return { count, blocked, remaining };
}

/**
 * Increments today's counter by 1 and returns the post-increment state.
 *
 * The caller is responsible for *not* incrementing past the limit if it
 * matters to them — this function will happily roll past 50 (we still
 * return `blocked: true` and `remaining: 0`). The post-block calls cost
 * a single localStorage write, which is acceptable for the worst case.
 */
export function increment(
  storage: StorageLike,
  now: Date = new Date(),
): DailyLimitState {
  const before = readState(storage, now);
  const next = before.count + 1;
  storage.setItem(dayKey(now), String(next));
  const blocked = next >= DAILY_LIMIT;
  const remaining = blocked ? 0 : DAILY_LIMIT - next;
  return { count: next, blocked, remaining };
}
