# Digital products: publishing SOP

This SOP covers how to publish the **Excel Template** and the
**Benchmark Report PDF** to Lemon Squeezy. Run end-to-end on launch day from
the maintainer's machine.

## When to follow this SOP

- 2026-07-23: Excel Template launch ($19).
- 2026-08-20: Benchmark Report PDF launch ($29).
- Any time YAML data is refreshed (monthly cron PR merge) and the live store
  copy should be re-uploaded.
- Any version bump in `scripts/lib/product-version.ts`.

## Pre-flight (24h before launch)

1. Confirm YAML data is fresh (`git log -- data/`).
2. Open `scripts/lib/product-version.ts`. Bump `PRODUCTS_VERSION` if this is
   a new release. Commit the bump on a new branch + PR + merge.
3. Confirm CI is green on `main` (lint / tsc / test / build / build:products
   all green).

## Generation

```bash
git checkout main
git pull
pnpm install                   # in case deps drifted
pnpm build:products
ls -la dist/products/
```

Expected output:

```
podprofit-excel-template-v<X.Y.Z>.xlsx   ~17-20 KB
podprofit-benchmark-report-v<X.Y.Z>.pdf  ~45-60 KB
```

If the file size is wildly different from the prior launch, open and
manually inspect before uploading.

## Spot-check

### Excel
- Open `dist/products/podprofit-excel-template-v<X.Y.Z>.xlsx`.
- README sheet — version line shows correct version + URL.
- Inputs sheet — try changing Marketplace from "etsy" to "shopify". Open
  Calculator sheet; numbers should recompute.
- Vendor Catalog sheet — should show 12 rows (6 products × 2 vendors).
- Marketplace Fees, FX Rates — values match the YAML / fee table.
- EULA sheet — version + year correct.

### PDF
- Open `dist/products/podprofit-benchmark-report-v<X.Y.Z>.pdf`.
- Cover page — version, URL, FX as-of date all correct.
- Section 6 (Break-even table) — values match the live calculator.
- Footer on every page — `<URL> · v<X.Y.Z> · Page N / 18`.
- Final page (Section 16) — license + copyright year correct.

## Upload to Lemon Squeezy

(First-launch product setup is documented separately in the Lemon Squeezy
dashboard runbook — this section assumes the product already exists.)

1. Log into Lemon Squeezy → Store → Products.
2. Open the product (Excel Template or Benchmark Report PDF).
3. Variants → upload the new file.
4. Update the variant's filename so customers see `…v<X.Y.Z>.xlsx` /
   `…v<X.Y.Z>.pdf` in their download email.
5. Save.

## Notification (post-upload)

- Send a release note to existing customers if this is a refresh release.
  Buttondown or Lemon Squeezy → "Email customers". Subject: "Refreshed POD
  pricing data — re-download your file (free, your license still applies)".
  Include version, what changed (e.g., FX rates / vendor pricing date), and
  the direct re-download link from their original purchase email.

## Tag

```bash
git tag products-v<X.Y.Z>
git push origin products-v<X.Y.Z>
```

Tagging the commit makes it trivial to regenerate the exact published bytes
later if a customer reports a bug in a specific version.

## Rollback

If a published file has a serious bug:

1. Revert to the previous version's tag locally: `git checkout products-v<prev>`.
2. `pnpm build:products` to regenerate the prior bytes.
3. Re-upload to Lemon Squeezy.
4. Post-mortem: open an ADR documenting the regression and the test that
   should have caught it.

## Out of scope here

- Lemon Squeezy product setup (one-time per product).
- Stripe / tax configuration.
- Marketing copy on the product landing pages — owned by Marketing.
- Refund handling — see `src/app/legal/refunds`.
