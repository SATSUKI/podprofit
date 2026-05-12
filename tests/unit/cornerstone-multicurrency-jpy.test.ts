import { describe, expect, it } from "vitest";
import {
  CURRENCIES,
  ROWS,
  fmt,
  type Currency,
} from "@/app/blog/printful-vs-printify-profit-calculator-multi-currency/rows";

// Regression suite for PODP-68 (QA PODP-57 critical bug):
// JPY values in Cornerstone #2 were stored in the same scale as other
// currencies (cents-style), which combined with fmt()'s JPY = decimals 0 path
// produced display values 100× too large (e.g. "¥50,949" instead of "¥509").
// These tests pin the corrected scale and the FX cross-check so it can never
// silently regress.

const fxJpyPer = {
  // ECB mid-market on 2026-04-30 (source of truth: article header comment).
  USD: 152,
  EUR: 162,
  GBP: 189,
  CAD: 111,
  AUD: 98,
} as const;

describe("Cornerstone multi-currency: fmt()", () => {
  it("JPY uses 0 decimals (yen has no sub-unit) and divides by 1", () => {
    // 509 yen -> "¥509", NOT "¥51" and NOT "¥50,900".
    expect(fmt(509, "JPY")).toBe("¥509");
    expect(fmt(-936, "JPY")).toBe("-¥936");
    expect(fmt(0, "JPY")).toBe("¥0");
  });

  it("USD/EUR/GBP/CAD/AUD use 2 decimals (cents -> major unit divides by 100)", () => {
    expect(fmt(333, "USD")).toBe("$3.33");
    expect(fmt(310, "EUR")).toBe("€3.10");
    expect(fmt(263, "GBP")).toBe("£2.63");
    expect(fmt(462, "CAD")).toBe("CA$4.62");
    expect(fmt(520, "AUD")).toBe("A$5.20");
  });
});

describe("Cornerstone multi-currency: ROWS JPY scale", () => {
  it("every JPY net cell is within plausible ¥-major range (|value| < 5,000)", () => {
    // If JPY were still stored in cents-style, the US->US printifyNet would be
    // 89,199 — well outside this band — and this test would fail loudly.
    for (const row of ROWS) {
      for (const side of ["printfulNet", "printifyNet"] as const) {
        const yen = row[side].JPY;
        expect(
          Math.abs(yen),
          `${row.scenario} / ${side} JPY=${yen} looks like cents, not yen`,
        ).toBeLessThan(5000);
      }
    }
  });

  it("JPY values stay sign-consistent with USD across every row and side", () => {
    // If a JPY cell were re-introduced at the wrong scale (e.g. positive when
    // USD is negative), the article's narrative would contradict itself.
    for (const row of ROWS) {
      for (const side of ["printfulNet", "printifyNet"] as const) {
        const usd = row[side].USD;
        const jpy = row[side].JPY;
        expect(
          Math.sign(jpy),
          `${row.scenario} / ${side}: USD=${usd} JPY=${jpy} sign mismatch`,
        ).toBe(Math.sign(usd));
      }
    }
  });
});

describe("Cornerstone multi-currency: FX cross-currency consistency", () => {
  it("JPY value approximates USD * JPY/USD rate within ±15% tolerance", () => {
    // Loose tolerance because each currency column has independent rounding
    // (integer cents / integer yen) and Etsy fees are recomputed per-currency,
    // not pure FX-converted. ±15% catches a 100× drift without false positives.
    for (const row of ROWS) {
      for (const side of ["printfulNet", "printifyNet"] as const) {
        const usdMajor = row[side].USD / 100;
        const jpyMajor = row[side].JPY;
        const expected = usdMajor * fxJpyPer.USD;
        if (expected === 0) continue;
        const ratio = jpyMajor / expected;
        expect(
          ratio,
          `${row.scenario}/${side}: USD=${usdMajor} -> expect ~¥${Math.round(
            expected,
          )}, got ¥${jpyMajor} (ratio ${ratio.toFixed(2)})`,
        ).toBeGreaterThan(0.85);
        expect(ratio).toBeLessThan(1.15);
      }
    }
  });

  it("every non-JPY pair (EUR/GBP/CAD/AUD) stays FX-consistent with JPY (±15%)", () => {
    // Belt-and-suspenders: also pin the other currency columns so a future
    // editor cannot silently shift only one column.
    const otherCurrencies: ReadonlyArray<Exclude<Currency, "JPY">> = [
      "USD",
      "EUR",
      "GBP",
      "CAD",
      "AUD",
    ];
    for (const row of ROWS) {
      for (const side of ["printfulNet", "printifyNet"] as const) {
        const jpyMajor = row[side].JPY;
        if (jpyMajor === 0) continue;
        for (const c of otherCurrencies) {
          const otherMajor = row[side][c] / 100;
          const expectedJpy = otherMajor * fxJpyPer[c as keyof typeof fxJpyPer];
          if (!expectedJpy) continue;
          const ratio = jpyMajor / expectedJpy;
          expect(
            ratio,
            `${row.scenario}/${side}/${c}: ${otherMajor} ${c} -> ~¥${Math.round(
              expectedJpy,
            )}, got ¥${jpyMajor}`,
          ).toBeGreaterThan(0.85);
          expect(ratio).toBeLessThan(1.15);
        }
      }
    }
  });
});

describe("Cornerstone multi-currency: ROWS structural integrity", () => {
  it("contains all 6 currencies on every side of every row, all integers", () => {
    expect(ROWS.length).toBeGreaterThan(0);
    for (const row of ROWS) {
      for (const side of ["printfulNet", "printifyNet"] as const) {
        for (const c of CURRENCIES) {
          const v = row[side][c];
          expect(typeof v).toBe("number");
          expect(Number.isInteger(v)).toBe(true);
        }
      }
    }
  });
});
