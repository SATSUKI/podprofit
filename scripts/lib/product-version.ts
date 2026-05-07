/**
 * Centralized version + brand constants for shippable products.
 *
 * Bumping the version here regenerates filenames on next `pnpm build:products`.
 * Treat changes as a release event — note in CHANGELOG / launch checklist.
 */
export const PRODUCTS_VERSION = "1.0.0";

/** Brand color (PODProfit forest green). */
export const BRAND_COLOR_HEX = "#0F3D2E";
export const BRAND_COLOR_LIGHT_HEX = "#E8F0EC";
export const BRAND_TEXT_DARK = "#1C1917"; // stone-900
export const BRAND_TEXT_MUTED = "#57534E"; // stone-600

export const SITE_URL = "https://getpodprofit.com";
export const PRODUCT_NAME_EXCEL = "PODProfit Profit Calculator (Excel Template)";
export const PRODUCT_NAME_PDF = "PODProfit POD Margin Benchmark Report 2026";

export const PUBLISHER = "PODProfit / Satsuki Okazaki";
export const COPYRIGHT_YEAR = "2026";

export function excelFileName(): string {
  return `podprofit-excel-template-v${PRODUCTS_VERSION}.xlsx`;
}

export function pdfFileName(): string {
  return `podprofit-benchmark-report-v${PRODUCTS_VERSION}.pdf`;
}
