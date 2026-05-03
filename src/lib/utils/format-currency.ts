import type { Currency } from "@/types/calculator";

const CURRENCY_DECIMALS: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0, // JPY has no minor unit in conventional display
};

export function formatCurrency(
  amountInMinorUnits: number,
  currency: Currency,
  locale: string = "en-US",
): string {
  const decimals = CURRENCY_DECIMALS[currency];
  const value = amountInMinorUnits / Math.pow(10, decimals);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function parseDisplayAmount(input: string, currency: Currency): number {
  // Strip currency symbols & commas, then convert to cents.
  const cleaned = input.replace(/[^0-9.\-]/g, "");
  const value = parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  const decimals = CURRENCY_DECIMALS[currency];
  return Math.round(value * Math.pow(10, decimals));
}
