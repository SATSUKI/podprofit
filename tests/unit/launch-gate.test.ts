import { describe, expect, it } from "vitest";
import { isLaunched, getLaunchDateIso } from "@/lib/utils/launch-gate";

describe("isLaunched (PODP-39 Pro CTA gate)", () => {
  it("returns false before the launch date with default 2026-06-09", () => {
    const before = new Date("2026-06-08T23:59:59Z");
    expect(isLaunched(before)).toBe(false);
  });

  it("returns true at and after the launch date", () => {
    const exactly = new Date("2026-06-09T00:00:00Z");
    const after = new Date("2026-06-10T00:00:00Z");
    expect(isLaunched(exactly)).toBe(true);
    expect(isLaunched(after)).toBe(true);
  });

  it("honours an explicit override (for tests / per-env staging)", () => {
    const now = new Date("2026-05-11T00:00:00Z");
    expect(isLaunched(now, "2026-06-09")).toBe(false);
    expect(isLaunched(now, "2026-05-01")).toBe(true);
  });

  it("fail-closes on a malformed launch date (treats as not launched)", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    expect(isLaunched(now, "not-a-date")).toBe(false);
  });

  it("getLaunchDateIso returns the override / env / default in priority", () => {
    expect(getLaunchDateIso("2027-01-01")).toBe("2027-01-01");
    // Default fall-back when no override and no env set
    const prev = process.env.NEXT_PUBLIC_LAUNCH_DATE;
    delete process.env.NEXT_PUBLIC_LAUNCH_DATE;
    expect(getLaunchDateIso()).toBe("2026-06-09");
    if (prev !== undefined) process.env.NEXT_PUBLIC_LAUNCH_DATE = prev;
  });
});
