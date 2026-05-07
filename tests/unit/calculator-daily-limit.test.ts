import { describe, expect, it } from "vitest";
import {
  DAILY_LIMIT,
  dayKey,
  increment,
  readState,
  type StorageLike,
} from "@/lib/calculator/daily-limit";

function makeFakeStorage(initial: Record<string, string> = {}): StorageLike & {
  inspect: () => Record<string, string>;
} {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    inspect: () => Object.fromEntries(store.entries()),
  };
}

describe("calculator daily limit (50 calcs / day per browser)", () => {
  it("starts unblocked with full remaining when no record exists", () => {
    const s = makeFakeStorage();
    const state = readState(s, new Date("2026-06-09T08:00:00"));
    expect(state.count).toBe(0);
    expect(state.blocked).toBe(false);
    expect(state.remaining).toBe(DAILY_LIMIT);
  });

  it("permits the first 50 increments and blocks on the 51st", () => {
    const s = makeFakeStorage();
    const day = new Date("2026-06-09T08:00:00");
    let last = readState(s, day);
    for (let i = 1; i <= DAILY_LIMIT; i += 1) {
      last = increment(s, day);
      if (i < DAILY_LIMIT) {
        expect(last.blocked).toBe(false);
        expect(last.count).toBe(i);
      }
    }
    // The 50th call already pushed count to 50, so blocked=true,
    // remaining=0. (Subscription users bypass; free users must NOT
    // see another result without signing up.)
    expect(last.count).toBe(DAILY_LIMIT);
    expect(last.blocked).toBe(true);
    expect(last.remaining).toBe(0);

    // The 51st call: still blocked, count=51 (we DO record it so future
    // observability has the truth, but the gate stays closed).
    const overflow = increment(s, day);
    expect(overflow.count).toBe(DAILY_LIMIT + 1);
    expect(overflow.blocked).toBe(true);
    expect(overflow.remaining).toBe(0);
  });

  it("uses a per-day key so the count resets at local midnight", () => {
    const s = makeFakeStorage();
    const today = new Date("2026-06-09T23:59:30");
    for (let i = 0; i < DAILY_LIMIT; i += 1) increment(s, today);
    expect(readState(s, today).blocked).toBe(true);

    // Just past local midnight on the next calendar day.
    const tomorrow = new Date("2026-06-10T00:00:01");
    const next = readState(s, tomorrow);
    expect(next.count).toBe(0);
    expect(next.blocked).toBe(false);
    expect(next.remaining).toBe(DAILY_LIMIT);
  });

  it("dayKey is locale-independent (YYYY-MM-DD, zero-padded)", () => {
    expect(dayKey(new Date("2026-01-02T08:00:00"))).toBe("pp_calc_count_2026-01-02");
    expect(dayKey(new Date("2026-12-31T23:00:00"))).toBe("pp_calc_count_2026-12-31");
  });

  it("ignores corrupted storage values (NaN / negative / huge) and treats day as fresh", () => {
    const day = new Date("2026-06-09T08:00:00");
    const k = dayKey(day);

    for (const bad of ["abc", "-5", "999999999"]) {
      const s = makeFakeStorage({ [k]: bad });
      const state = readState(s, day);
      expect(state.count).toBe(0);
      expect(state.blocked).toBe(false);
      expect(state.remaining).toBe(DAILY_LIMIT);
    }
  });

  it("persists the post-increment count under the day key", () => {
    const s = makeFakeStorage();
    const day = new Date("2026-06-09T08:00:00");
    increment(s, day);
    increment(s, day);
    increment(s, day);
    expect(s.inspect()).toEqual({ "pp_calc_count_2026-06-09": "3" });
  });

  it("keeps separate counters for separate days (no cross-day leakage)", () => {
    const s = makeFakeStorage();
    increment(s, new Date("2026-06-09T08:00:00"));
    increment(s, new Date("2026-06-09T08:00:00"));
    increment(s, new Date("2026-06-10T08:00:00"));
    const day1 = readState(s, new Date("2026-06-09T08:00:00"));
    const day2 = readState(s, new Date("2026-06-10T08:00:00"));
    expect(day1.count).toBe(2);
    expect(day2.count).toBe(1);
  });
});

describe("calculator daily limit — storage-unavailable contract", () => {
  // The component layer (calculator.tsx) is responsible for catching
  // localStorage probe failures and skipping the limit entirely. We
  // pin that contract here at the type level: a `StorageLike` whose
  // `setItem` throws is *not* something this module ever swallows —
  // the caller must guard upstream. This test simply documents the
  // expected propagation.
  it("propagates setItem errors so the caller can fall back to no-limit mode", () => {
    const explosive: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => increment(explosive, new Date("2026-06-09T08:00:00"))).toThrow(
      "QuotaExceededError",
    );
  });
});
