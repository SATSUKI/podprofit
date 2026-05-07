/**
 * Build script: PODProfit Excel Template.
 *
 * Output: dist/products/podprofit-excel-template-v<version>.xlsx
 * Library: exceljs (MIT)
 *
 * Sheets (must match maintained order — README references sheet names):
 *   1. README
 *   2. Inputs              (the cells the user actually edits)
 *   3. Vendor Catalog      (auto-built from data/printful and data/printify YAML)
 *   4. Marketplace Fees    (auto-built from src/lib/calculator/marketplace-fees.ts)
 *   5. FX Rates            (auto-built from data/fx-rates.yml)
 *   6. Calculator          (Excel-formula port of calculate-profit.ts)
 *   7. Break-even Tables   (retail price for 20% margin)
 *   8. EULA
 *
 * Design rules:
 *  - Calculator formulas mirror calculate-profit.ts EXACTLY (same rounding,
 *    same fee order, same FX-on-USD-cost flow). Numerical drift between the
 *    web calculator and the Excel template would erode buyer trust.
 *  - All currency math is done in DISPLAY currency (after FX). Excel doesn't
 *    have integer cents like the TS version — we work in dollars and round
 *    at the same checkpoints to keep parity.
 *  - We expose named cells for every input so users can build their own sheets
 *    referencing this one without having to re-discover layouts.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { MARKETPLACE_FEES } from "@/lib/calculator/marketplace-fees";
import type { Marketplace, Region } from "@/types/calculator";
import { loadCatalog, type LoadedCatalog } from "./lib/load-yaml-data";
import {
  BRAND_COLOR_HEX,
  COPYRIGHT_YEAR,
  PRODUCT_NAME_EXCEL,
  PRODUCTS_VERSION,
  PUBLISHER,
  SITE_URL,
  excelFileName,
} from "./lib/product-version";

const REPO_ROOT = resolve(__dirname, "..");
const DIST_DIR = resolve(REPO_ROOT, "dist", "products");

const ALL_REGIONS: Region[] = ["US", "EU", "UK", "CA", "AU"];
const ALL_MARKETPLACES: Marketplace[] = [
  "etsy",
  "shopify",
  "amazon-merch",
  "printify-pop-up",
  "manual",
];

const BRAND_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF" + BRAND_COLOR_HEX.replace("#", "") },
};

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: BRAND_FILL,
  alignment: { vertical: "middle", horizontal: "left" },
};

function setColumnWidths(ws: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

function styleHeaderRow(ws: ExcelJS.Worksheet, rowNumber: number): void {
  const row = ws.getRow(rowNumber);
  row.eachCell((cell) => {
    cell.style = { ...cell.style, ...HEADER_STYLE };
  });
  row.height = 22;
}

// ---------- Sheet builders ----------

function buildReadmeSheet(wb: ExcelJS.Workbook, catalog: LoadedCatalog): void {
  const ws = wb.addWorksheet("README");
  setColumnWidths(ws, [110]);

  const lines: Array<[string, Partial<ExcelJS.Style>?]> = [
    [PRODUCT_NAME_EXCEL, { font: { bold: true, size: 18, color: { argb: "FF" + BRAND_COLOR_HEX.replace("#", "") } } }],
    [`Version ${PRODUCTS_VERSION} · ${PUBLISHER} · ${SITE_URL}`, { font: { italic: true, color: { argb: "FF57534E" } } }],
    [""],
    ["What this is", { font: { bold: true, size: 13 } }],
    [
      "A vendor-neutral, multi-currency profit calculator for Print-on-Demand sellers. Same logic as the live calculator at " +
        SITE_URL +
        " — itemized fees, transparent FX, no black box.",
    ],
    [""],
    ["How to use it (60 seconds)", { font: { bold: true, size: 13 } }],
    ["  1. Open the 'Inputs' sheet."],
    ["  2. Pick a Product (from Vendor Catalog), Marketplace, Region, and Display Currency."],
    ["  3. Enter your Retail Price in display currency."],
    ["  4. Open the 'Calculator' sheet — every fee line itemizes automatically."],
    ["  5. Use 'Break-even Tables' to see the floor retail price for a 20% net margin."],
    [""],
    ["Sheet map", { font: { bold: true, size: 13 } }],
    ["  README           - this page"],
    ["  Inputs           - the cells you edit (highlighted yellow)"],
    ["  Vendor Catalog   - 12 products: Printful + Printify, US/EU/UK/CA/AU shipping"],
    ["  Marketplace Fees - Etsy, Shopify, Amazon Merch, Printify Pop-up, manual storefront"],
    ["  FX Rates         - USD/EUR/GBP/CAD/AUD/JPY (ECB mid-market)"],
    ["  Calculator       - itemized profit breakdown for the current Inputs"],
    ["  Break-even Tables - retail price needed for 20% net margin"],
    ["  EULA             - license terms (single-user, no resale, modification OK)"],
    [""],
    ["Data sources & dates", { font: { bold: true, size: 13 } }],
    [`  Printful catalog: ${catalog.printful.raw.sourceUrl}  (as of ${catalog.printful.raw.asOfDate})`],
    [`  Printify catalog: ${catalog.printify.raw.sourceUrl}  (as of ${catalog.printify.raw.asOfDate})`],
    [`  FX rates:         ${catalog.fx.sourceUrl}  (as of ${catalog.fx.asOfDate})`],
    [""],
    ["Disclaimer", { font: { bold: true, size: 13 } }],
    [
      "Vendor list prices do not reflect Printful Plus/Pro or Printify Premium subscription discounts. Marketplace fees are simplified to published 'list' rates as of the snapshot date. Always verify against your vendor dashboard before listing. Re-download the latest version from " +
        SITE_URL +
        "/products/excel for refreshed data.",
      { alignment: { wrapText: true, vertical: "top" } },
    ],
    [""],
    ["License (summary — full text on EULA sheet)", { font: { bold: true, size: 13 } }],
    [
      "Single-user license. You may modify the file for your own internal use. Resale or redistribution of the original or modified file is prohibited.",
      { alignment: { wrapText: true } },
    ],
    [""],
    [`(c) ${COPYRIGHT_YEAR} ${PUBLISHER}. All rights reserved.`, { font: { italic: true, color: { argb: "FF57534E" } } }],
  ];

  for (const [text, style] of lines) {
    const row = ws.addRow([text]);
    if (style) {
      row.getCell(1).style = { ...row.getCell(1).style, ...style };
    }
    if (text === "") row.height = 6;
  }

  // Wrap-text rows need height auto-flex; let Excel handle it for the disclaimer.
  ws.getColumn(1).alignment = { wrapText: true, vertical: "top" };
}

interface InputsLayout {
  productCell: string; // e.g., "B3"
  marketplaceCell: string;
  regionCell: string;
  currencyCell: string;
  retailPriceCell: string;
  includeOffsiteAdsCell: string;
}

function buildInputsSheet(wb: ExcelJS.Workbook, catalog: LoadedCatalog): InputsLayout {
  const ws = wb.addWorksheet("Inputs");
  setColumnWidths(ws, [28, 60]);

  ws.addRow(["Field", "Value"]);
  styleHeaderRow(ws, 1);

  // Defaults: Printify Bella+Canvas tee, Etsy, US, USD, $24, no offsite ads.
  const defaultProduct = "printify-bella-canvas-3001-tee-white-m";
  ws.addRow(["Product ID", defaultProduct]);
  ws.addRow(["Marketplace", "etsy"]);
  ws.addRow(["Region", "US"]);
  ws.addRow(["Display Currency", "USD"]);
  ws.addRow(["Retail Price (display currency)", 24]);
  ws.addRow(["Include Etsy Offsite Ads (12%)?", "no"]);

  // Highlight input cells in yellow.
  const inputFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF3B0" },
  };
  for (let r = 2; r <= 7; r++) {
    const cell = ws.getCell(`B${r}`);
    cell.fill = inputFill;
    cell.border = {
      top: { style: "thin", color: { argb: "FFD6D3D1" } },
      left: { style: "thin", color: { argb: "FFD6D3D1" } },
      right: { style: "thin", color: { argb: "FFD6D3D1" } },
      bottom: { style: "thin", color: { argb: "FFD6D3D1" } },
    };
  }
  ws.getCell("B6").numFmt = "#,##0.00";

  // Data validation lists keep buyers from typo-ing values.
  const productIds = catalog.allVariants.map((v) => v.id).join(",");
  ws.getCell("B2").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`"${productIds}"`],
  };
  ws.getCell("B3").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`"${ALL_MARKETPLACES.join(",")}"`],
  };
  ws.getCell("B4").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`"${ALL_REGIONS.join(",")}"`],
  };
  ws.getCell("B5").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`"USD,EUR,GBP,CAD,AUD,JPY"`],
  };
  ws.getCell("B7").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`"yes,no"`],
  };

  // Helper note row.
  ws.addRow([]);
  const note = ws.addRow([
    "Tip:",
    "Edit the highlighted cells. The Calculator sheet recomputes automatically.",
  ]);
  note.getCell(1).font = { italic: true, color: { argb: "FF57534E" } };
  note.getCell(2).font = { italic: true, color: { argb: "FF57534E" } };

  return {
    productCell: "Inputs!$B$2",
    marketplaceCell: "Inputs!$B$3",
    regionCell: "Inputs!$B$4",
    currencyCell: "Inputs!$B$5",
    retailPriceCell: "Inputs!$B$6",
    includeOffsiteAdsCell: "Inputs!$B$7",
  };
}

interface CatalogLayout {
  /** Range string for VLOOKUP (e.g., "'Vendor Catalog'!$A$2:$J$13") */
  range: string;
  /** Column index (1-based) of base cost USD */
  baseCostUsdColIdx: number;
  /** Column index (1-based) of US shipping */
  shippingStartColIdx: number;
  shippingColIdxByRegion: Record<Region, number>;
}

function buildVendorCatalogSheet(
  wb: ExcelJS.Workbook,
  catalog: LoadedCatalog,
): CatalogLayout {
  const ws = wb.addWorksheet("Vendor Catalog");
  const headers = [
    "Product ID",
    "Vendor",
    "Name",
    "Category",
    "Base Cost (USD)",
    ...ALL_REGIONS.map((r) => `Ship ${r} (USD)`),
    "As-of date",
  ];
  ws.addRow(headers);
  styleHeaderRow(ws, 1);
  setColumnWidths(ws, [42, 12, 50, 14, 14, 12, 12, 12, 12, 12, 14]);

  const rawById = new Map<string, { category?: string }>();
  [...catalog.printful.raw.products, ...catalog.printify.raw.products].forEach(
    (p) => rawById.set(p.id, { category: p.category }),
  );

  for (const v of catalog.allVariants) {
    const meta = rawById.get(v.id);
    const row = [
      v.id,
      v.vendor,
      v.name,
      meta?.category ?? "",
      v.baseCostUsdCents / 100,
      ...ALL_REGIONS.map((r) => {
        const c = v.shippingUsdCents[r];
        return c === undefined ? "" : c / 100;
      }),
      v.asOfDate,
    ];
    ws.addRow(row);
  }

  // Format currency columns (E through J).
  for (let c = 5; c <= 10; c++) {
    ws.getColumn(c).numFmt = '"$"#,##0.00';
  }

  const lastRow = ws.rowCount;
  const range = `'Vendor Catalog'!$A$2:$K$${lastRow}`;

  return {
    range,
    baseCostUsdColIdx: 5,
    shippingStartColIdx: 6,
    shippingColIdxByRegion: {
      US: 6,
      EU: 7,
      UK: 8,
      CA: 9,
      AU: 10,
    },
  };
}

interface FeesLayout {
  range: string;
  cols: {
    listingFeeUsd: number;
    transactionFeeRate: number;
    perTransactionFeeUsd: number;
    paymentProcessingRate: number;
    offsiteAdsRate: number;
  };
}

function buildMarketplaceFeesSheet(wb: ExcelJS.Workbook): FeesLayout {
  const ws = wb.addWorksheet("Marketplace Fees");
  const headers = [
    "Marketplace",
    "Listing Fee (USD)",
    "Transaction Fee %",
    "Per-Transaction Fee (USD)",
    "Payment Processing %",
    "Offsite Ads %",
  ];
  ws.addRow(headers);
  styleHeaderRow(ws, 1);
  setColumnWidths(ws, [22, 18, 18, 24, 22, 16]);

  for (const m of ALL_MARKETPLACES) {
    const f = MARKETPLACE_FEES[m];
    ws.addRow([
      m,
      f.listingFeeUsdCents / 100,
      f.transactionFeeRate,
      f.perTransactionFeeUsdCents / 100,
      f.paymentProcessingRate,
      f.offsiteAdsRate ?? 0,
    ]);
  }
  // Currency / percent formats.
  ws.getColumn(2).numFmt = '"$"#,##0.00';
  ws.getColumn(3).numFmt = "0.00%";
  ws.getColumn(4).numFmt = '"$"#,##0.00';
  ws.getColumn(5).numFmt = "0.00%";
  ws.getColumn(6).numFmt = "0.00%";

  const lastRow = ws.rowCount;
  return {
    range: `'Marketplace Fees'!$A$2:$F$${lastRow}`,
    cols: {
      listingFeeUsd: 2,
      transactionFeeRate: 3,
      perTransactionFeeUsd: 4,
      paymentProcessingRate: 5,
      offsiteAdsRate: 6,
    },
  };
}

interface FxLayout {
  range: string;
  rateCol: number;
}

function buildFxSheet(wb: ExcelJS.Workbook, catalog: LoadedCatalog): FxLayout {
  const ws = wb.addWorksheet("FX Rates");
  ws.addRow(["Currency", "Rate (1 USD = X)"]);
  styleHeaderRow(ws, 1);
  setColumnWidths(ws, [16, 22]);

  const rates = catalog.fx.rates;
  (Object.keys(rates) as Array<keyof typeof rates>).forEach((c) => {
    ws.addRow([c, rates[c]]);
  });
  ws.getColumn(2).numFmt = "0.0000";

  ws.addRow([]);
  const sourceRow = ws.addRow(["Source", catalog.fx.sourceUrl]);
  sourceRow.getCell(1).font = { italic: true };
  sourceRow.getCell(2).font = { italic: true };
  const asOfRow = ws.addRow(["As of", catalog.fx.asOfDate]);
  asOfRow.getCell(1).font = { italic: true };
  asOfRow.getCell(2).font = { italic: true };

  // The rates are in rows 2..7 (USD/EUR/GBP/CAD/AUD/JPY).
  return {
    range: `'FX Rates'!$A$2:$B$7`,
    rateCol: 2,
  };
}

function buildCalculatorSheet(
  wb: ExcelJS.Workbook,
  inputs: InputsLayout,
  cat: CatalogLayout,
  fees: FeesLayout,
  fx: FxLayout,
): void {
  const ws = wb.addWorksheet("Calculator");
  setColumnWidths(ws, [44, 22, 60]);

  ws.addRow(["Field", "Value", "Notes"]);
  styleHeaderRow(ws, 1);

  // Helper to add a labeled formula row and return the cell address of column B.
  function addFormulaRow(label: string, formula: string, notes: string, numFmt = '"$"#,##0.00'): string {
    const row = ws.addRow([label, { formula }, notes]);
    const cell = row.getCell(2);
    cell.numFmt = numFmt;
    cell.font = { ...cell.font };
    return `B${row.number}`;
  }

  // ---- Resolve FX rate (1 USD = X display currency) ----
  // VLOOKUP(currency, fx.range, 2, FALSE)
  const fxFormula = `VLOOKUP(${inputs.currencyCell},${fx.range},${fx.rateCol},FALSE)`;
  const fxCell = addFormulaRow(
    "FX rate (1 USD = X display currency)",
    fxFormula,
    "From FX Rates sheet",
    "0.0000",
  );

  // ---- Vendor base cost (USD) and ship (USD) — VLOOKUP from Vendor Catalog ----
  const baseUsdFormula = `VLOOKUP(${inputs.productCell},${cat.range},${cat.baseCostUsdColIdx},FALSE)`;
  const baseUsdCell = addFormulaRow(
    "Vendor base cost (USD)",
    baseUsdFormula,
    "Direct from vendor list price (no subscription discount)",
  );

  // Ship USD picks the right column with INDEX/MATCH on Region.
  // Region positions: US=1,EU=2,UK=3,CA=4,AU=5; column offset from base = +1..+5.
  // Build a CHOOSE() based on inputs.region matching to column index.
  const shipColIndex = ALL_REGIONS.map((r) => cat.shippingColIdxByRegion[r]);
  const shipUsdFormula = `VLOOKUP(${inputs.productCell},${cat.range},CHOOSE(MATCH(${inputs.regionCell},{"${ALL_REGIONS.join('";"')}"},0),${shipColIndex.join(",")}),FALSE)`;
  const shipUsdCell = addFormulaRow(
    "Vendor shipping (USD)",
    shipUsdFormula,
    `Region-aware lookup (${ALL_REGIONS.join("/")})`,
  );

  // ---- Marketplace fee lookups ----
  const f = fees.cols;
  const listingFeeUsdCell = addFormulaRow(
    "Marketplace listing fee (USD)",
    `VLOOKUP(${inputs.marketplaceCell},${fees.range},${f.listingFeeUsd},FALSE)`,
    "Etsy = $0.20, others = $0",
  );
  const txFeeRateCell = addFormulaRow(
    "Marketplace transaction fee %",
    `VLOOKUP(${inputs.marketplaceCell},${fees.range},${f.transactionFeeRate},FALSE)`,
    "Etsy 6.5%, Amazon Merch 30%, Shopify 0%",
    "0.00%",
  );
  const perTxFeeUsdCell = addFormulaRow(
    "Per-transaction fee (USD)",
    `VLOOKUP(${inputs.marketplaceCell},${fees.range},${f.perTransactionFeeUsd},FALSE)`,
    "Stripe-style $0.25-$0.30",
  );
  const paymentRateCell = addFormulaRow(
    "Payment processing %",
    `VLOOKUP(${inputs.marketplaceCell},${fees.range},${f.paymentProcessingRate},FALSE)`,
    "Etsy 3%, Shopify 2.9%, Pop-up 5%",
    "0.00%",
  );
  const offsiteAdsRateCell = addFormulaRow(
    "Offsite ads % (Etsy only, optional)",
    `VLOOKUP(${inputs.marketplaceCell},${fees.range},${f.offsiteAdsRate},FALSE)`,
    "Etsy 12% if mandatory; toggled by Inputs!B7",
    "0.00%",
  );

  ws.addRow([]);

  // ---- Computed line items in DISPLAY currency ----
  // calculate-profit.ts converts USD costs to display currency by multiplying
  // by fx rate, then ROUND to integer cents. We emulate the same rounding
  // pattern by using ROUND(value*fxrate, 2) (round to 2 decimals = cents in
  // display currency).
  const vendorBaseCostCell = addFormulaRow(
    "Vendor base cost (display currency)",
    `ROUND(${baseUsdCell}*${fxCell},2)`,
    "USD cost converted to display currency",
  );
  const vendorShipCell = addFormulaRow(
    "Vendor shipping (display currency)",
    `ROUND(${shipUsdCell}*${fxCell},2)`,
    "USD shipping converted to display currency",
  );
  const listingFeeDispCell = addFormulaRow(
    "Marketplace listing fee (display)",
    `ROUND(${listingFeeUsdCell}*${fxCell},2)`,
    "Per-listing fixed fee, converted",
  );
  const perTxFeeDispCell = addFormulaRow(
    "Per-transaction fee (display)",
    `ROUND(${perTxFeeUsdCell}*${fxCell},2)`,
    "Stripe-style fixed fee, converted",
  );

  // % fees applied to retail (already in display currency).
  const txFeeDispCell = addFormulaRow(
    "Marketplace transaction fee (display)",
    `ROUND(${inputs.retailPriceCell}*${txFeeRateCell},2)`,
    "% × retail (display currency)",
  );
  const paymentFeeDispCell = addFormulaRow(
    "Payment processing fee (display)",
    `ROUND(${inputs.retailPriceCell}*${paymentRateCell},2)`,
    "% × retail (display currency)",
  );
  const offsiteAdsDispCell = addFormulaRow(
    "Offsite ads fee (display)",
    `IF(${inputs.includeOffsiteAdsCell}="yes",ROUND(${inputs.retailPriceCell}*${offsiteAdsRateCell},2),0)`,
    "Active only when Inputs!B7 = yes",
  );

  ws.addRow([]);

  // ---- Totals ----
  const totalCostsCell = addFormulaRow(
    "Total costs (display currency)",
    `${vendorBaseCostCell}+${vendorShipCell}+${listingFeeDispCell}+${txFeeDispCell}+${perTxFeeDispCell}+${paymentFeeDispCell}+${offsiteAdsDispCell}`,
    "Sum of all itemized costs above",
  );
  const netProfitCell = addFormulaRow(
    "Net profit (display currency)",
    `${inputs.retailPriceCell}-${totalCostsCell}`,
    "Retail price minus total costs",
  );
  addFormulaRow(
    "Net margin %",
    `IF(${inputs.retailPriceCell}=0,0,${netProfitCell}/${inputs.retailPriceCell})`,
    "Net profit / retail price",
    "0.0%",
  );

  // Bold the totals rows for readability.
  for (const ref of [totalCostsCell, netProfitCell]) {
    ws.getCell(ref).font = { bold: true };
  }

  // Footer / source note.
  ws.addRow([]);
  const footRow = ws.addRow([
    "Logic parity:",
    "",
    "This sheet implements the same calculation as src/lib/calculator/calculate-profit.ts in the open repo.",
  ]);
  footRow.getCell(1).font = { italic: true, color: { argb: "FF57534E" } };
  footRow.getCell(3).font = { italic: true, color: { argb: "FF57534E" } };
}

function buildBreakEvenSheet(wb: ExcelJS.Workbook, catalog: LoadedCatalog): void {
  const ws = wb.addWorksheet("Break-even Tables");
  setColumnWidths(ws, [42, 18, 18, 18, 18, 18]);
  ws.addRow([
    `Break-even retail price for 20% net margin (USD, US ship, no offsite ads)`,
  ]);
  ws.getRow(1).getCell(1).font = { bold: true, size: 13 };
  ws.addRow([]);
  ws.addRow([
    "Product",
    "Printful Etsy",
    "Printful Shopify",
    "Printify Etsy",
    "Printify Shopify",
    "Printify Pop-up",
  ]);
  styleHeaderRow(ws, 3);

  // Build a deterministic 20% break-even calculation per (vendor, marketplace).
  // For % fees (transaction + payment + optional offsite-off): retail = (vendorCost + listingFee + perTxFee) / (1 - margin - txRate - paymentRate)
  // We treat margin = 0.20.
  const targetMargin = 0.2;
  const productPairs = new Map<string, { printful?: number; printify?: number }>();
  for (const v of catalog.allVariants) {
    const usShip = v.shippingUsdCents.US ?? 0;
    const landed = (v.baseCostUsdCents + usShip) / 100;
    // Use the shared product name without vendor prefix for grouping.
    const key = v.name;
    const slot = productPairs.get(key) ?? {};
    if (v.vendor === "printful") slot.printful = landed;
    else slot.printify = landed;
    productPairs.set(key, slot);
  }

  function breakEvenRetail(landedUsd: number, marketplace: Marketplace): number {
    const f = MARKETPLACE_FEES[marketplace];
    const fixed =
      landedUsd +
      f.listingFeeUsdCents / 100 +
      f.perTransactionFeeUsdCents / 100;
    const variableRate = f.transactionFeeRate + f.paymentProcessingRate;
    const denom = 1 - targetMargin - variableRate;
    if (denom <= 0) return Number.NaN; // unsolvable (fees + margin > 100%)
    return Math.ceil((fixed / denom) * 100) / 100; // ceil to nearest cent
  }

  const fmt = (n: number | undefined) =>
    typeof n === "number" && Number.isFinite(n) ? n : "n/a";

  for (const [name, pair] of productPairs) {
    ws.addRow([
      name,
      pair.printful !== undefined ? fmt(breakEvenRetail(pair.printful, "etsy")) : "",
      pair.printful !== undefined ? fmt(breakEvenRetail(pair.printful, "shopify")) : "",
      pair.printify !== undefined ? fmt(breakEvenRetail(pair.printify, "etsy")) : "",
      pair.printify !== undefined ? fmt(breakEvenRetail(pair.printify, "shopify")) : "",
      pair.printify !== undefined
        ? fmt(breakEvenRetail(pair.printify, "printify-pop-up"))
        : "",
    ]);
  }
  for (let c = 2; c <= 6; c++) {
    ws.getColumn(c).numFmt = '"$"#,##0.00';
  }

  ws.addRow([]);
  const note = ws.addRow([
    "Note:",
    "Numbers are floors. Above this retail price, you clear ≥20% net. Below, you subsidise the marketplace. US shipping; offsite ads OFF.",
  ]);
  note.getCell(1).font = { italic: true, color: { argb: "FF57534E" } };
  note.getCell(2).font = { italic: true, color: { argb: "FF57534E" } };
  ws.mergeCells(`B${note.number}:F${note.number}`);
}

function buildEulaSheet(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet("EULA");
  setColumnWidths(ws, [110]);

  const lines: string[] = [
    "PODProfit Excel Template — End-User License Agreement (EULA)",
    "",
    `Version ${PRODUCTS_VERSION}    Effective ${COPYRIGHT_YEAR}-01-01`,
    "",
    "1. License grant",
    `   ${PUBLISHER} ("Licensor") grants you ("Licensee") a non-exclusive, non-transferable, single-user license to use this Excel template (the "Template") for your own internal business purposes.`,
    "",
    "2. Permitted use",
    "   You may:",
    "    a. Open, view, and use the Template on any number of devices you personally own or operate.",
    "    b. Modify the Template (formulas, layout, sheets) for your own internal use.",
    "    c. Reference data and formulas from the Template in your own private files.",
    "",
    "3. Prohibited use",
    "   You may NOT:",
    "    a. Resell, sublicense, or redistribute the Template, modified or unmodified, in whole or in part, in any form (including bundling with other digital products, posting to file-sharing services, or sharing with non-licensees).",
    "    b. Remove or alter copyright or attribution notices.",
    "    c. Use the Template to create a competing calculator product offered to third parties.",
    "",
    "4. Refunds",
    "   Refund policy is governed by the storefront where the Template was purchased. See " + SITE_URL + "/refund.",
    "",
    "5. Disclaimer of warranty",
    "   The Template is provided 'AS IS' without warranty of any kind. Licensor makes no representation that vendor pricing, marketplace fees, or FX rates are current at the time of use. Always verify against authoritative sources before relying on the calculation for business decisions.",
    "",
    "6. Limitation of liability",
    "   To the maximum extent permitted by law, Licensor's liability for any claim arising from use of the Template shall not exceed the price paid for the Template.",
    "",
    "7. Updates",
    "   Updated versions may be released. Licensee may download new versions from " + SITE_URL + "/products/excel using the original purchase license.",
    "",
    "8. Governing law",
    "   This EULA is governed by the laws of the jurisdiction in which Licensor operates.",
    "",
    `(c) ${COPYRIGHT_YEAR} ${PUBLISHER}. All rights reserved.`,
  ];

  for (const line of lines) {
    const row = ws.addRow([line]);
    if (line.endsWith("EULA)")) {
      row.getCell(1).font = { bold: true, size: 16, color: { argb: "FF" + BRAND_COLOR_HEX.replace("#", "") } };
    } else if (/^\d+\./.test(line)) {
      row.getCell(1).font = { bold: true };
    }
  }
  ws.getColumn(1).alignment = { wrapText: true, vertical: "top" };
}

// ---------- Orchestrator ----------

export async function buildExcelTemplate(): Promise<{ path: string; sheetCount: number; bytes: number }> {
  const catalog = loadCatalog();

  const wb = new ExcelJS.Workbook();
  wb.creator = PUBLISHER;
  wb.lastModifiedBy = PUBLISHER;
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = PRODUCT_NAME_EXCEL;
  wb.subject = "POD profit calculation, vendor-neutral, multi-currency";
  wb.company = "PODProfit";

  buildReadmeSheet(wb, catalog);
  const inputs = buildInputsSheet(wb, catalog);
  const cat = buildVendorCatalogSheet(wb, catalog);
  const fees = buildMarketplaceFeesSheet(wb);
  const fx = buildFxSheet(wb, catalog);
  buildCalculatorSheet(wb, inputs, cat, fees, fx);
  buildBreakEvenSheet(wb, catalog);
  buildEulaSheet(wb);

  await mkdir(DIST_DIR, { recursive: true });
  const path = resolve(DIST_DIR, excelFileName());
  const buf = await wb.xlsx.writeBuffer();
  await writeFile(path, Buffer.from(buf));

  return {
    path,
    sheetCount: wb.worksheets.length,
    bytes: buf.byteLength,
  };
}

// Allow `tsx scripts/build-excel-template.ts` direct invocation.
if (require.main === module) {
  buildExcelTemplate()
    .then((r) => {
      console.log(`[excel] wrote ${r.path} (${r.sheetCount} sheets, ${r.bytes} bytes)`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
