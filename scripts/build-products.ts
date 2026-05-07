/**
 * Build orchestrator: regenerate all shippable digital products.
 *
 * Outputs to dist/products/ (gitignored). Run with:
 *   pnpm build:products
 *
 * The convention is "build then upload": this script does NOT publish to
 * Lemon Squeezy or any storefront. Manual publishing flow is documented in
 * docs/launch/products-publishing.md (or the launch checklist for that
 * release).
 */
import { buildExcelTemplate } from "./build-excel-template";
import { buildBenchmarkReport } from "./build-benchmark-report";

interface BuildSummary {
  path: string;
  bytes: number;
  detail: string;
}

async function main(): Promise<void> {
  const summaries: BuildSummary[] = [];

  console.log("[build:products] starting");

  const excel = await buildExcelTemplate();
  summaries.push({
    path: excel.path,
    bytes: excel.bytes,
    detail: `${excel.sheetCount} sheets`,
  });

  const pdf = await buildBenchmarkReport();
  summaries.push({
    path: pdf.path,
    bytes: pdf.bytes,
    detail: `${pdf.pageCount} pages`,
  });

  console.log("[build:products] complete");
  for (const s of summaries) {
    console.log(`  - ${s.path}  (${(s.bytes / 1024).toFixed(1)} KB, ${s.detail})`);
  }
}

main().catch((err) => {
  console.error("[build:products] FAILED");
  console.error(err);
  process.exit(1);
});
