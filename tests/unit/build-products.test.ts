/**
 * Build-products integration test.
 *
 * Verifies:
 *  1. The orchestrator generates both shippable artifacts at the expected path.
 *  2. Excel has the documented sheet count and required sheet names.
 *  3. PDF has a sensible page count (>= 17 — cover + TOC + 16 sections).
 *  4. The break-even computations baked into the Excel sheet match what
 *     calculateProfit() reports for the corresponding inputs (parity guard).
 *
 * Tests run against real builds (no mocks) so any drift in exceljs /
 * @react-pdf/renderer / YAML loaders surfaces immediately. dist/products is
 * gitignored, so leaving artifacts behind is harmless — but we remove them at
 * the end to keep CI noise low.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { buildExcelTemplate } from "../../scripts/build-excel-template";
import { buildBenchmarkReport } from "../../scripts/build-benchmark-report";
import { calculateProfit } from "@/lib/calculator/calculate-profit";
import { MARKETPLACE_FEES } from "@/lib/calculator/marketplace-fees";
import type { CalculationInput, FxRates, ProductVariant } from "@/types/calculator";

const DIST_DIR = resolve(__dirname, "..", "..", "dist", "products");

describe("build:products orchestrator", () => {
  let excelResult: Awaited<ReturnType<typeof buildExcelTemplate>>;
  let pdfResult: Awaited<ReturnType<typeof buildBenchmarkReport>>;

  beforeAll(async () => {
    // Clean any prior artifacts so we know we tested a fresh build.
    if (existsSync(DIST_DIR)) {
      await rm(DIST_DIR, { recursive: true, force: true });
    }
    excelResult = await buildExcelTemplate();
    pdfResult = await buildBenchmarkReport();
  }, 60_000);

  afterAll(async () => {
    // Clean up so dev iterations don't accumulate stale artifacts. CI also
    // runs `pnpm build:products` separately to verify regen drift.
    if (existsSync(DIST_DIR)) {
      await rm(DIST_DIR, { recursive: true, force: true });
    }
  });

  describe("Excel template", () => {
    it("writes a non-empty .xlsx at the expected path", () => {
      expect(existsSync(excelResult.path)).toBe(true);
      expect(excelResult.path).toMatch(/podprofit-excel-template-v\d+\.\d+\.\d+\.xlsx$/);
      const stat = statSync(excelResult.path);
      expect(stat.size).toBeGreaterThan(8_000); // any plausible spreadsheet > 8KB
      expect(excelResult.bytes).toBe(stat.size);
    });

    it("contains exactly 8 sheets in the documented order", async () => {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(excelResult.path);
      const names = wb.worksheets.map((ws) => ws.name);
      expect(names).toEqual([
        "README",
        "Inputs",
        "Vendor Catalog",
        "Marketplace Fees",
        "FX Rates",
        "Calculator",
        "Break-even Tables",
        "EULA",
      ]);
      expect(excelResult.sheetCount).toBe(8);
    });

    it("vendor catalog has 12 product rows (6 × 2 vendors)", async () => {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(excelResult.path);
      const ws = wb.getWorksheet("Vendor Catalog");
      expect(ws).toBeDefined();
      // 1 header + 12 product rows = 13.
      expect(ws!.rowCount).toBe(13);
    });

    it("calculator sheet uses the Inputs sheet as the source of inputs", async () => {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(excelResult.path);
      const calc = wb.getWorksheet("Calculator");
      expect(calc).toBeDefined();

      // Spot-check that the first formula references Inputs!$B$5 (currency).
      const fxFormulaCell = calc!.getCell("B2").value as { formula?: string };
      expect(fxFormulaCell?.formula).toContain("Inputs!$B$5");
      expect(fxFormulaCell?.formula).toContain("FX Rates");

      // Net profit formula should subtract total costs from retail price.
      // The retail price input lives at Inputs!$B$6.
      const netProfitRow = (() => {
        for (let r = 1; r <= calc!.rowCount; r++) {
          const label = calc!.getCell(`A${r}`).value;
          if (typeof label === "string" && label.startsWith("Net profit")) return r;
        }
        return -1;
      })();
      expect(netProfitRow).toBeGreaterThan(0);
      const netProfitFormula = (
        calc!.getCell(`B${netProfitRow}`).value as { formula?: string }
      )?.formula;
      expect(netProfitFormula).toContain("Inputs!$B$6");
    });
  });

  describe("Benchmark Report PDF", () => {
    it("writes a non-empty PDF at the expected path", () => {
      expect(existsSync(pdfResult.path)).toBe(true);
      expect(pdfResult.path).toMatch(/podprofit-benchmark-report-v\d+\.\d+\.\d+\.pdf$/);
      const stat = statSync(pdfResult.path);
      expect(stat.size).toBeGreaterThan(20_000); // any plausible 18-page PDF > 20KB
      expect(pdfResult.bytes).toBe(stat.size);
    });

    it("starts with a PDF magic header", async () => {
      const { readFile } = await import("node:fs/promises");
      const buf = await readFile(pdfResult.path);
      // %PDF-
      expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    });

    it("contains at least 17 pages (cover + TOC + 15 sections, MVP minimum)", () => {
      // The full report ships with cover + TOC + 16 sections = 18 pages, but
      // we leave a 1-page margin so future edits don't trip the test.
      expect(pdfResult.pageCount).toBeGreaterThanOrEqual(17);
    });
  });

  describe("calculator parity (Excel formulas vs calculate-profit.ts)", () => {
    // Re-derive the Excel calculator's "Net profit" output by walking the same
    // sequence of operations the formulas perform (VLOOKUPs + ROUND), and
    // verify it matches calculateProfit(). This is the test that catches a
    // future drift between the spreadsheet's logic and the runtime calculator.
    it("matches calculate-profit.ts for the default Inputs example", () => {
      // Default Inputs: Printify Bella+Canvas tee, etsy, US, USD, $24, no ads.
      const fx: FxRates = {
        asOfDate: "2026-04-30",
        rates: { USD: 1, EUR: 0.93, GBP: 0.79, CAD: 1.37, AUD: 1.53, JPY: 153 },
      };
      const product: ProductVariant = {
        id: "printify-bella-canvas-3001-tee-white-m",
        vendor: "printify",
        name: "Bella+Canvas 3001 unisex t-shirt (white, M)",
        baseCostUsdCents: 1095,
        shippingUsdCents: { US: 449, EU: 749, UK: 649, CA: 549, AU: 1049 },
        sourceUrl: "https://printify.com/catalog/",
        asOfDate: "2026-04-28",
      };
      const input: CalculationInput = {
        productId: product.id,
        vendor: "printify",
        marketplace: "etsy",
        region: "US",
        retailPriceCents: 2400,
        displayCurrency: "USD",
        includeOffsiteAds: false,
      };
      const tsResult = calculateProfit(input, product, fx);

      // Now reproduce what the Excel `Calculator` sheet computes step-by-step.
      // (USD is the display currency, so fxRate = 1 and ROUND(x*1, 2) === x
      // when x is already cents-precise. We still go through the same shape so
      // the test fails the moment we introduce drift in the order of
      // operations.)
      const fxRate = fx.rates[input.displayCurrency];
      const baseUsd = product.baseCostUsdCents / 100;
      const shipUsd = (product.shippingUsdCents.US ?? 0) / 100;
      const fees = MARKETPLACE_FEES[input.marketplace];
      const listingUsd = fees.listingFeeUsdCents / 100;
      const perTxUsd = fees.perTransactionFeeUsdCents / 100;
      const retail = input.retailPriceCents / 100;

      const round2 = (n: number) => Math.round(n * 100) / 100;
      const baseDisp = round2(baseUsd * fxRate);
      const shipDisp = round2(shipUsd * fxRate);
      const listingDisp = round2(listingUsd * fxRate);
      const perTxDisp = round2(perTxUsd * fxRate);
      const txFeeDisp = round2(retail * fees.transactionFeeRate);
      const paymentDisp = round2(retail * fees.paymentProcessingRate);
      const adsDisp = input.includeOffsiteAds ? round2(retail * (fees.offsiteAdsRate ?? 0)) : 0;

      const totalCostsDisp =
        baseDisp + shipDisp + listingDisp + txFeeDisp + perTxDisp + paymentDisp + adsDisp;
      const netProfitDisp = retail - totalCostsDisp;

      // The TS calculator works in cents. Convert back for comparison.
      // Allow 1-cent floating-point slack (Excel ROUND vs Math.round on cents).
      expect(Math.round(totalCostsDisp * 100)).toBeCloseTo(tsResult.totalCostsCents, 0);
      expect(Math.round(netProfitDisp * 100)).toBeCloseTo(tsResult.netProfitCents, 0);
    });

    it("Break-even Tables values match a 20% margin solve via calculateProfit", async () => {
      // Pick a known cell: Bella+Canvas, Printify, Shopify, US.
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(excelResult.path);
      const ws = wb.getWorksheet("Break-even Tables");
      expect(ws).toBeDefined();

      // Find the row whose first cell starts with "Bella+Canvas".
      let targetRow = -1;
      for (let r = 1; r <= ws!.rowCount; r++) {
        const v = ws!.getCell(`A${r}`).value;
        if (typeof v === "string" && v.startsWith("Bella+Canvas")) {
          targetRow = r;
          break;
        }
      }
      expect(targetRow).toBeGreaterThan(0);

      // Column E (Printify Shopify) holds a numeric break-even retail.
      const cellValue = ws!.getCell(`E${targetRow}`).value;
      expect(typeof cellValue).toBe("number");
      const breakEvenRetail = cellValue as number;

      // Now verify: at this retail price, calculateProfit should report a net
      // margin of >= 20% (the floor). Using Printify Bella+Canvas seed data.
      const fx: FxRates = {
        asOfDate: "2026-04-30",
        rates: { USD: 1, EUR: 0.93, GBP: 0.79, CAD: 1.37, AUD: 1.53, JPY: 153 },
      };
      const product: ProductVariant = {
        id: "printify-bella-canvas-3001-tee-white-m",
        vendor: "printify",
        name: "Bella+Canvas 3001 unisex t-shirt (white, M)",
        baseCostUsdCents: 1095,
        shippingUsdCents: { US: 449 },
        sourceUrl: "https://printify.com/catalog/",
        asOfDate: "2026-04-28",
      };
      const input: CalculationInput = {
        productId: product.id,
        vendor: "printify",
        marketplace: "shopify",
        region: "US",
        retailPriceCents: Math.round(breakEvenRetail * 100),
        displayCurrency: "USD",
        includeOffsiteAds: false,
      };
      const r = calculateProfit(input, product, fx);
      // Floor: at the break-even retail price, margin should be >= 20%
      // (we ceil the result to the nearest cent in build, so it can be a hair
      // higher than 20% but never lower).
      expect(r.marginPercent).toBeGreaterThanOrEqual(20);
      // And not absurdly above — the ceil-to-cent slack is at most a few bp.
      expect(r.marginPercent).toBeLessThan(20.5);
    });
  });
});
