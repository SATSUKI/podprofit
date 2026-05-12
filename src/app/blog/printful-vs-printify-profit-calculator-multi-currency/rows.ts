// Profit-comparison table for the Cornerstone #2 article.
//
// Values are stored in the smallest displayable integer unit per currency:
//   USD/EUR/GBP/CAD/AUD: cents (2 decimals — divide by 100 in fmt()).
//   JPY:                 yen   (0 decimals — divide by 1   in fmt()).
// Keeping the integer scale aligned with each currency's display precision is
// what makes fmt() correct for every column. Do not store JPY in "cents" —
// JPY has no sub-unit, so a JPY cents-style value would render 100× too large.
// Bella+Canvas 3001 white M, $24.00 USD retail, Etsy storefront, no offsite ads,
// FX: ECB mid-market 2026-04-30. Subscriptions OFF (public-list-price baseline).

export interface CurrencyMap {
  USD: number;
  EUR: number;
  GBP: number;
  CAD: number;
  AUD: number;
  JPY: number;
}

export interface Row {
  scenario: string;
  fulfillRegion: string;
  shipTo: string;
  printfulNet: CurrencyMap;
  printifyNet: CurrencyMap;
  winner: "Printful" | "Printify" | "Tie";
  why: string;
}

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const ROWS: Row[] = [
  {
    scenario: "Bella+Canvas 3001 — US seller → US buyer",
    fulfillRegion: "Printful Charlotte / Printify Monster Digital",
    shipTo: "US",
    printfulNet: {
      USD: 333,
      EUR: 310,
      GBP: 263,
      CAD: 462,
      AUD: 520,
      JPY: 509,
    },
    printifyNet: {
      USD: 583,
      EUR: 542,
      GBP: 461,
      CAD: 809,
      AUD: 911,
      JPY: 892,
    },
    winner: "Printify",
    why:
      "Printify's US base cost is $2.50 lower; Etsy fees are identical at $24 retail.",
  },
  {
    scenario: "Bella+Canvas 3001 — US seller → UK buyer",
    fulfillRegion: "Printful Riga / Printify Print Geek (UK)",
    shipTo: "UK",
    printfulNet: {
      USD: 410,
      EUR: 381,
      GBP: 324,
      CAD: 569,
      AUD: 640,
      JPY: 627,
    },
    printifyNet: {
      USD: 295,
      EUR: 274,
      GBP: 233,
      CAD: 410,
      AUD: 461,
      JPY: 451,
    },
    winner: "Printful",
    why:
      "Riga fulfillment cuts UK shipping by ~$3 vs Printify's UK partner, flipping the verdict.",
  },
  {
    scenario: "Bella+Canvas 3001 — EU seller → German buyer",
    fulfillRegion: "Printful Riga / Printify SwiftPOD-DE",
    shipTo: "Germany",
    printfulNet: {
      USD: 521,
      EUR: 485,
      GBP: 412,
      CAD: 723,
      AUD: 813,
      JPY: 796,
    },
    printifyNet: {
      USD: 442,
      EUR: 411,
      GBP: 349,
      CAD: 614,
      AUD: 690,
      JPY: 676,
    },
    winner: "Printful",
    why:
      "Same as UK — Riga's EU-internal shipping is faster and cheaper than Printify's DE partner network.",
  },
  {
    scenario: "Bella+Canvas 3001 — CA seller → Canadian buyer",
    fulfillRegion: "Printful Charlotte / Printify Monster Digital → CA",
    shipTo: "Canada",
    printfulNet: {
      USD: 187,
      EUR: 174,
      GBP: 148,
      CAD: 260,
      AUD: 293,
      JPY: 286,
    },
    printifyNet: {
      USD: 425,
      EUR: 395,
      GBP: 335,
      CAD: 590,
      AUD: 664,
      JPY: 650,
    },
    winner: "Printify",
    why:
      "Both ship from the US; Printify's lower base cost survives the cross-border shipping uplift.",
  },
  {
    scenario: "Bella+Canvas 3001 — AU seller → Australian buyer",
    fulfillRegion: "Printful no AU facility / Printify District Photo (AU)",
    shipTo: "Australia",
    printfulNet: {
      USD: -245,
      EUR: -228,
      GBP: -193,
      CAD: -340,
      AUD: -383,
      JPY: -375,
    },
    printifyNet: {
      USD: 312,
      EUR: 290,
      GBP: 246,
      CAD: 433,
      AUD: 487,
      JPY: 477,
    },
    winner: "Printify",
    why:
      "Printful has no AU fulfillment partner — shipping from the US loses money on a $24 retail. Printify's District Photo AU network is the only viable option.",
  },
  {
    scenario: "Bella+Canvas 3001 — JP seller → Japanese buyer",
    fulfillRegion: "Both: shipped from US, no JP partner",
    shipTo: "Japan",
    printfulNet: {
      USD: -612,
      EUR: -569,
      GBP: -483,
      CAD: -849,
      AUD: -956,
      JPY: -936,
    },
    printifyNet: {
      USD: -380,
      EUR: -353,
      GBP: -300,
      CAD: -527,
      AUD: -593,
      JPY: -581,
    },
    winner: "Tie",
    why:
      "Both lose money at $24 retail shipping to Japan — JP sellers need either ¥4,800+ retail or a switch to a local POD service like Up-T / Suzuri.",
  },
];

export function fmt(cents: number, currency: Currency): string {
  const decimals = currency === "JPY" ? 0 : 2;
  const value = cents / Math.pow(10, decimals);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
