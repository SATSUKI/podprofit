# ADR 0001: Build pipeline for shippable digital products (Excel template + Benchmark Report PDF)

Status: Accepted
Date: 2026-05-08
Deciders: Engineering (PODProfit)

## Context

Phase 1 of PODProfit ships two paid digital products on top of the free
calculator:

- **2026-07-23 launch**: Excel Template ($19, sold via Lemon Squeezy).
- **2026-08-20 launch**: POD Margin Benchmark Report PDF ($29, sold via Lemon
  Squeezy).

Both products derive from data that already exists as the source of truth for
the live calculator:

- `data/printful/products.yml`, `data/printify/products.yml` — vendor catalogs
- `data/fx-rates.yml` — currency rates
- `src/lib/calculator/marketplace-fees.ts` — marketplace fee table
- `src/lib/calculator/calculate-profit.ts` — the canonical profit calculation

We need a way to (re)generate the shippable artifacts on demand without
hand-authoring Excel files or laying out a 18-page PDF in InDesign every
time the underlying data changes.

## Decision

Build the shippable artifacts from code, in the same repo, sharing the same
YAML / TS sources as the live calculator.

- `scripts/build-excel-template.ts` — emits `.xlsx` via **exceljs** (MIT).
- `scripts/build-benchmark-report.tsx` — emits `.pdf` via
  **@react-pdf/renderer** (MIT).
- `scripts/build-products.ts` — orchestrator, exposed as `pnpm build:products`.
- Outputs go to `dist/products/` (gitignored). They are NOT committed; the
  publishing step is a deliberate manual upload to Lemon Squeezy.

Excel `Calculator` sheet implements the same logic as `calculate-profit.ts`
in Excel formulas (VLOOKUP across Vendor Catalog / Marketplace Fees / FX
Rates sheets, ROUND at the same checkpoints). A unit test verifies parity by
walking the formula chain in TS and comparing to `calculateProfit()`.

PDF content is authored as react-pdf components in `build-benchmark-report.tsx`,
not parsed from the JSX blog post. Reasoning: the blog uses Tailwind which
doesn't translate to react-pdf primitives, and authoring as components lets
us drive tables (break-even matrices, vendor cost comparisons) directly from
the YAML.

## Alternatives considered

1. **Hand-author Excel file once and commit it**. Rejected: every YAML
   refresh (monthly cron) would silently desync the spreadsheet from the
   calculator, eroding buyer trust.
2. **Use Google Sheets API to generate the spreadsheet**. Rejected: requires
   credentials and a network call, brittle in CI, exceljs ships fully
   offline.
3. **Use puppeteer to print the blog post to PDF**. Rejected: the blog is a
   marketing page (lead magnet copy + CTAs); the report needs different
   content — break-even matrices, expanded sections, license, no email
   signup. Different artifact, not a print-to-PDF job.
4. **Generate PDF via LaTeX**. Rejected: heavyweight, separate toolchain,
   harder to drive from the same YAML / TS data layer.

## Consequences

Positive

- Single source of truth: when YAML changes, regenerating the products
  picks up the new numbers automatically.
- The calculator and the Excel template never drift in logic — the parity
  test in `tests/unit/build-products.test.ts` is a regression guard.
- `pnpm build:products` can run in CI as a build-pipeline smoke test.

Negative

- Two new dev dependencies (exceljs ~600KB, @react-pdf/renderer ~1.5MB).
  Both are devDependencies only; no runtime / browser bundle impact.
- PDF visual polish is constrained by react-pdf primitives. Acceptable for
  v1; revisit for v1.1 if buyer feedback requests tighter typography.
- `dist/products/` is gitignored, so anyone wanting to publish must regen
  locally. Documented in `docs/launch/products-publishing.md` so the
  operator workflow is unambiguous.

## Operator workflow at launch

1. `git pull origin main` — confirm latest YAML.
2. `pnpm install` — refresh dev deps if changed.
3. `pnpm build:products` — regen Excel + PDF.
4. Spot-check `dist/products/` (open Excel, scroll PDF).
5. Upload to Lemon Squeezy (manual one-time per launch).
6. On launch day, send pre-purchase email subscribers their copy.
7. Tag the version (`git tag products-v1.0.0`) for traceability.

## References

- exceljs: https://github.com/exceljs/exceljs (MIT)
- @react-pdf/renderer: https://react-pdf.org (MIT)
- Phase 1 PODProfit decisions: `coo/strategic-initiatives/phase1-pod-profit-calculator/coo-kickoff-decisions.md`
