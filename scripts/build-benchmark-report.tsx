/**
 * Build script: PODProfit POD Margin Benchmark Report 2026 (PDF).
 *
 * Output: dist/products/podprofit-benchmark-report-v<version>.pdf
 * Library: @react-pdf/renderer (MIT)
 *
 * The report is a long-form PDF derived from the cornerstone blog post
 * src/app/blog/pod-margin-benchmark-2026/page.tsx, augmented with the
 * 6×5 product/marketplace break-even matrices computed from the YAML data
 * (so the PDF stays in sync with the calculator on every regen).
 *
 * Why we don't parse the JSX directly: the blog uses JSX-with-Tailwind, which
 * doesn't translate to react-pdf primitives. Instead we author the content
 * here as data + react-pdf Components — this keeps formatting deterministic
 * and lets us drive section content from the same YAML the calculator uses.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { MARKETPLACE_FEES } from "@/lib/calculator/marketplace-fees";
import type { Marketplace } from "@/types/calculator";
import { loadCatalog, type LoadedCatalog } from "./lib/load-yaml-data";
import {
  BRAND_COLOR_HEX,
  COPYRIGHT_YEAR,
  PRODUCT_NAME_PDF,
  PRODUCTS_VERSION,
  PUBLISHER,
  SITE_URL,
  pdfFileName,
} from "./lib/product-version";

const REPO_ROOT = resolve(__dirname, "..");
const DIST_DIR = resolve(REPO_ROOT, "dist", "products");

// react-pdf falls back to Helvetica by default, which is acceptable for a v1
// shippable PDF. We deliberately do NOT register a custom font here to avoid
// network fetches at build time.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    color: "#1C1917",
    lineHeight: 1.45,
  },
  coverPage: {
    fontFamily: "Helvetica",
    paddingTop: 100,
    paddingBottom: 56,
    paddingHorizontal: 56,
    color: "#1C1917",
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR_HEX,
    marginBottom: 12,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#57534E",
    marginBottom: 40,
  },
  coverMetaBlock: {
    marginTop: 200,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: BRAND_COLOR_HEX,
  },
  coverMetaLine: {
    fontSize: 10,
    color: "#57534E",
    marginBottom: 4,
  },
  h1: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR_HEX,
    marginTop: 14,
    marginBottom: 10,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR_HEX,
    marginTop: 14,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: "justify",
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 10,
    fontFamily: "Helvetica-Bold",
  },
  bulletText: {
    flex: 1,
  },
  table: {
    marginTop: 6,
    marginBottom: 10,
    borderTopWidth: 1,
    borderColor: "#D6D3D1",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#E7E5E4",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#F5F4F2",
    borderBottomWidth: 1,
    borderColor: "#D6D3D1",
  },
  th: {
    padding: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  td: {
    padding: 6,
    fontSize: 10,
  },
  tdMono: {
    padding: 6,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  pageHeader: {
    position: "absolute",
    top: 24,
    left: 56,
    right: 56,
    fontSize: 9,
    color: "#A8A29E",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    fontSize: 9,
    color: "#A8A29E",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  toc: {
    marginTop: 8,
  },
  tocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tocTitle: {
    fontSize: 11,
  },
  callout: {
    backgroundColor: "#E8F0EC",
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLOR_HEX,
    padding: 10,
    marginVertical: 8,
  },
  meta: {
    fontSize: 9,
    color: "#78716C",
    fontStyle: "italic",
  },
});

// ---------- Helper components ----------

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.bulletItem} wrap={false}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

interface TableProps {
  headers: string[];
  rows: Array<Array<string | number>>;
  /** Column flex weights (default = even). */
  flex?: number[];
}

const Table = ({ headers, rows, flex }: TableProps) => {
  const flexes = flex ?? headers.map(() => 1);
  return (
    <View style={styles.table} wrap={false}>
      <View style={styles.tableHead}>
        {headers.map((h, i) => (
          <Text key={i} style={[styles.th, { flex: flexes[i] }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.tableRow}>
          {row.map((cell, ci) => (
            <Text
              key={ci}
              style={[ci === 0 ? styles.td : styles.tdMono, { flex: flexes[ci] }]}
            >
              {typeof cell === "number" && Number.isFinite(cell)
                ? cell.toFixed(2)
                : String(cell)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

const PageChrome = ({ pageLabel }: { pageLabel: string }) => (
  <>
    <View fixed style={styles.pageHeader}>
      <Text>PODProfit · POD Margin Benchmark 2026</Text>
      <Text>{pageLabel}</Text>
    </View>
    <View fixed style={styles.pageFooter}>
      <Text>{SITE_URL}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `v${PRODUCTS_VERSION} · Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  </>
);

// ---------- Computed content ----------

interface BreakEvenRow {
  productName: string;
  printfulEtsy: number | string;
  printfulShopify: number | string;
  printifyEtsy: number | string;
  printifyShopify: number | string;
  printifyPopup: number | string;
}

function breakEvenRetail(landedUsd: number, marketplace: Marketplace): number | string {
  const f = MARKETPLACE_FEES[marketplace];
  const fixed =
    landedUsd + f.listingFeeUsdCents / 100 + f.perTransactionFeeUsdCents / 100;
  const variableRate = f.transactionFeeRate + f.paymentProcessingRate;
  const denom = 1 - 0.2 - variableRate;
  if (denom <= 0) return "n/a";
  return Math.ceil((fixed / denom) * 100) / 100;
}

function buildBreakEvenRows(catalog: LoadedCatalog): BreakEvenRow[] {
  const byName = new Map<string, { printful?: number; printify?: number }>();
  for (const v of catalog.allVariants) {
    const usShip = v.shippingUsdCents.US ?? 0;
    const landed = (v.baseCostUsdCents + usShip) / 100;
    const slot = byName.get(v.name) ?? {};
    if (v.vendor === "printful") slot.printful = landed;
    else slot.printify = landed;
    byName.set(v.name, slot);
  }
  return Array.from(byName.entries()).map(([name, pair]) => ({
    productName: name,
    printfulEtsy: pair.printful !== undefined ? breakEvenRetail(pair.printful, "etsy") : "",
    printfulShopify:
      pair.printful !== undefined ? breakEvenRetail(pair.printful, "shopify") : "",
    printifyEtsy:
      pair.printify !== undefined ? breakEvenRetail(pair.printify, "etsy") : "",
    printifyShopify:
      pair.printify !== undefined ? breakEvenRetail(pair.printify, "shopify") : "",
    printifyPopup:
      pair.printify !== undefined ? breakEvenRetail(pair.printify, "printify-pop-up") : "",
  }));
}

function buildLandedCostRows(catalog: LoadedCatalog) {
  const byName = new Map<string, { printful?: number; printify?: number }>();
  for (const v of catalog.allVariants) {
    const usShip = v.shippingUsdCents.US ?? 0;
    const landed = (v.baseCostUsdCents + usShip) / 100;
    const slot = byName.get(v.name) ?? {};
    if (v.vendor === "printful") slot.printful = landed;
    else slot.printify = landed;
    byName.set(v.name, slot);
  }
  return Array.from(byName.entries()).map(([name, pair]) => {
    const advantage =
      pair.printful !== undefined && pair.printify !== undefined
        ? -(pair.printful - pair.printify)
        : "";
    return [
      name,
      pair.printful !== undefined ? `$${pair.printful.toFixed(2)}` : "—",
      pair.printify !== undefined ? `$${pair.printify.toFixed(2)}` : "—",
      typeof advantage === "number"
        ? `-$${Math.abs(advantage).toFixed(2)}`
        : "—",
    ];
  });
}

// ---------- Pages ----------

interface ReportData {
  catalog: LoadedCatalog;
}

const CoverPage = ({ data }: { data: ReportData }) => (
  <Page size="A4" style={styles.coverPage}>
    <Text style={styles.coverTitle}>POD Margin Benchmark 2026</Text>
    <Text style={styles.coverSubtitle}>
      The real net margins across 6 products, 2 vendors, 5 marketplaces, and 6
      currencies.
    </Text>
    <View style={styles.callout}>
      <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
        Why this report exists
      </Text>
      <Text>
        Every print-on-demand vendor publishes a margin table. Every
        marketplace publishes a fee schedule. Almost no one publishes the
        combination — which is the only number a seller can actually bank.
        This is that table, computed from the same dataset that powers the
        live PODProfit calculator.
      </Text>
    </View>
    <View style={styles.coverMetaBlock}>
      <Text style={styles.coverMetaLine}>Publisher: {PUBLISHER}</Text>
      <Text style={styles.coverMetaLine}>Site: {SITE_URL}</Text>
      <Text style={styles.coverMetaLine}>Version: {PRODUCTS_VERSION}</Text>
      <Text style={styles.coverMetaLine}>
        Vendor data as of {data.catalog.printful.raw.asOfDate} / {data.catalog.printify.raw.asOfDate}
      </Text>
      <Text style={styles.coverMetaLine}>
        FX as of {data.catalog.fx.asOfDate} ({data.catalog.fx.sourceUrl})
      </Text>
      <Text style={styles.coverMetaLine}>
        (c) {COPYRIGHT_YEAR} {PUBLISHER}. Single-user license.
      </Text>
    </View>
  </Page>
);

const TocEntry = ({ n, title }: { n: string; title: string }) => (
  <View style={styles.tocRow}>
    <Text style={styles.tocTitle}>
      {n}. {title}
    </Text>
  </View>
);

const TocPage = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="Contents" />
    <Text style={styles.h1}>Contents</Text>
    <View style={styles.toc}>
      <TocEntry n="1" title='Why the "official" tables undersell reality' />
      <TocEntry n="2" title="Methodology" />
      <TocEntry n="3" title="Vendor head-to-head: Printful vs Printify" />
      <TocEntry n="4" title="Marketplace head-to-head" />
      <TocEntry n="5" title="Currency impact: same tee, six currencies" />
      <TocEntry n="6" title="Break-even retail price for 20% net margin" />
      <TocEntry n="7" title="Hidden costs the matrices don't show" />
      <TocEntry n="8" title="The scaling threshold: when POD stops paying" />
      <TocEntry n="9" title="Provider variance & geographic routing" />
      <TocEntry n="10" title="Subscription discounts (Printful Plus / Printify Premium)" />
      <TocEntry n="11" title="Etsy offsite ads sensitivity" />
      <TocEntry n="12" title="Multi-currency rounding conventions" />
      <TocEntry n="13" title="POD-to-bulk transition: when to graduate a hero design" />
      <TocEntry n="14" title="Conclusion: the 4× margin spread" />
      <TocEntry n="15" title="Sources & transparency" />
      <TocEntry n="16" title="License & terms" />
    </View>
  </Page>
);

const Section1 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="1. Why official tables undersell reality" />
    <Text style={styles.h1}>1. Why the "official" tables undersell reality</Text>
    <Text style={styles.paragraph}>
      Printful's sample margin chart shows a Bella+Canvas 3001 t-shirt earning
      a 35% margin at a $24 retail price. Printify's Profit Navigator shows
      roughly 40% on the same product. Both numbers are honest — and both are
      useless for a seller, because they assume:
    </Text>
    <Bullet>
      You charge the buyer for shipping. Most Etsy sellers offer free shipping
      to qualify for Etsy's search boost, which silently shifts $4-9 of
      shipping cost into the seller's COGS.
    </Bullet>
    <Bullet>
      Your marketplace takes 0%. It doesn't — Etsy alone takes 6.5% transaction
      + 3% + $0.25 payment + sometimes 12% offsite ads.
    </Bullet>
    <Bullet>
      You sell in the same currency you cost in. A UK or EU buyer will cost
      you another 1-4% via Etsy's in-house FX spread.
    </Bullet>
    <Text style={styles.paragraph}>
      Stack those reality checks and the same $24 tee that "earns 35%" on a
      vendor chart actually returns 13-25% depending on marketplace, vendor,
      and currency. The matrices in this report show the full spread, computed
      from the same dataset as the live PODProfit calculator.
    </Text>
  </Page>
);

const Section2 = ({ data }: { data: ReportData }) => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="2. Methodology" />
    <Text style={styles.h1}>2. Methodology</Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Vendor base costs and shipping: </Text>
      Printful and Printify public catalog list prices, snapshot{" "}
      {data.catalog.printful.raw.asOfDate}. Six products span apparel,
      drinkware, accessories, and wall art: Bella+Canvas 3001 t-shirt, Gildan
      18000 sweatshirt, 11oz ceramic mug, all-over-print unisex hoodie, cotton
      tote bag, and matte 18×24 poster. Subscription discounts (Printful
      Plus/Pro, Printify Premium) are not applied — those are addressed in
      Section 10.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Marketplace fees: </Text>
      Etsy fee schedule (Help Center, 2026), Shopify Basic plan + Shopify
      Payments rate, Amazon Merch on Demand royalty table, Printify Pop-up fee
      structure, and a self-hosted "manual" storefront priced at Stripe
      Standard (2.9% + $0.30). Etsy offsite ads (12%) are toggleable.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>FX rates: </Text>
      ECB mid-market on {data.catalog.fx.asOfDate}. Marketplace FX spreads
      (Etsy ~2.5%, Shopify Payments ~1.5%) are applied where buyers transact
      in a foreign currency, mirroring how real settlements land.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>What is excluded: </Text>
      design amortization, returns, sample orders, paid acquisition (CPA), and
      time. This is a fee-stack benchmark — not a full P&amp;L. Section 7
      walks through the costs that sit outside the per-unit math but routinely
      flip a green margin red.
    </Text>
  </Page>
);

const Section3 = ({ data }: { data: ReportData }) => {
  const rows = buildLandedCostRows(data.catalog);
  return (
    <Page size="A4" style={styles.page}>
      <PageChrome pageLabel="3. Vendor head-to-head" />
      <Text style={styles.h1}>3. Vendor head-to-head: Printful vs Printify</Text>
      <Text style={styles.paragraph}>
        Across all six benchmark products, Printify is between $1.00 and $6.00
        cheaper per unit on base cost, with shipping that is generally
        comparable in the US and slightly higher in the EU and UK.
      </Text>
      <Table
        headers={["Product", "Printful (base + US ship)", "Printify (base + US ship)", "Printify advantage"]}
        rows={rows}
        flex={[3, 2, 2, 1.6]}
      />
      <Text style={styles.paragraph}>
        The structural call: Printify wins for sellers who can absorb provider
        variance with a return policy, and Printful wins for sellers who treat
        post-sale issues as the single most expensive line item — the cost of
        one quality-related refund erases six tees of unit-economics advantage.
      </Text>
      <Text style={styles.paragraph}>
        Geographic coverage is the second axis. Printful operates fulfilment
        centres in the US, Latvia, Spain, the UK, Mexico, Canada, Japan, and
        Australia. Printify routes via a third-party network — broader on
        paper, less consistent in practice. For sellers with &gt;30% revenue
        outside the US, the provider-routing question is the single most
        important variable in the comparison (see Section 9 for the deep dive).
      </Text>
    </Page>
  );
};

const Section4 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="4. Marketplace head-to-head" />
    <Text style={styles.h1}>4. Marketplace head-to-head</Text>
    <Text style={styles.paragraph}>
      Same Bella+Canvas 3001 tee, US buyer, $24 retail, Printify base ($15.44
      landed). The fee column shows what the marketplace takes before the
      seller sees a dollar.
    </Text>
    <Table
      headers={["Marketplace", "Total fees", "Net profit", "Net margin"]}
      rows={[
        ["Etsy (offsite ads off)", "$2.73", "$5.83", "24.3%"],
        ["Etsy (offsite ads on, 12%)", "$5.61", "$2.95", "12.3%"],
        ["Shopify (Basic + Payments)", "$1.00", "$7.56", "31.5%"],
        ["Amazon Merch (royalty)", "n/a", "~$3.20", "13-15%"],
        ["Printify Pop-up", "$0.72", "$7.84", "32.7%"],
        ["Manual (Stripe direct)", "$1.00", "$7.56", "31.5%"],
      ]}
      flex={[2.5, 1.2, 1.2, 1.2]}
    />
    <Text style={styles.paragraph}>
      The single biggest line on this table is Etsy offsite ads — 12% on gross
      revenue, mandatory once trailing 12-month sales cross $10K. Sellers
      cross that threshold and watch margin compress overnight. Shopify and
      the manual storefront tie at 31.5% net margin, but Shopify carries a
      $39/month subscription not included in per-unit math.
    </Text>
    <Text style={styles.paragraph}>
      Amazon Merch on Demand operates on a royalty rather than a fee
      structure: Amazon owns fulfillment and checkout, paying the designer a
      fixed royalty per unit (~$3.20 for a $24 tee at standard tier).
      Comparable to Etsy with offsite-ads-on, with zero upfront cost — the
      trade is design control and brand ownership.
    </Text>
    <Text style={styles.paragraph}>
      The Printify Pop-up Store deserves a closer look because most sellers
      overlook it. Pop-up is a free Printify-hosted micro-store that strips
      the marketplace layer entirely. The catch is traffic — a Pop-up store
      has none built in, so the channel only works once the seller has an
      external audience (Reddit community, newsletter, TikTok). For sellers
      in that position, Pop-up is structurally the highest-margin marketplace
      on the table by 1-2 percentage points.
    </Text>
  </Page>
);

const Section5 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="5. Currency impact" />
    <Text style={styles.h1}>5. Currency impact: same tee, six currencies</Text>
    <Text style={styles.paragraph}>
      Same product (Printify Bella+Canvas 3001), same vendor cost ($15.44),
      same Etsy fee structure, same retail intent (≈ $24 equivalent). What
      changes is the currency the buyer pays in.
    </Text>
    <Table
      headers={["Buyer currency", "Local retail", "USD-equiv received", "Net margin (Etsy)"]}
      rows={[
        ["USD (US)", "$24.00", "$24.00", "24.3%"],
        ["EUR (DE/FR/ES)", "EUR 22.00", "$23.06", "21.6%"],
        ["GBP (UK)", "GBP 19.00", "$23.45", "22.6%"],
        ["CAD (Canada)", "C$32.00", "$22.78", "19.7%"],
        ["AUD (Australia)", "A$36.00", "$22.95", "20.4%"],
        ["JPY (Japan)", "JPY 3,672", "$23.40", "22.6%"],
      ]}
      flex={[2, 1.5, 1.5, 1.5]}
    />
    <Text style={styles.paragraph}>
      The Canadian and Australian rows are the silent margin-killers. Sellers
      price using a round-number USD-to-local conversion (often done once at
      listing creation and never refreshed), then quietly lose 4-5% margin to
      the combination of FX drift, marketplace spread, and rounding-down
      customer expectations. The fix is to re-price quarterly against live FX.
    </Text>
    <Text style={styles.paragraph}>
      A subtler dynamic shows up in the JPY row. Japanese buyers consistently
      round to the nearest hundred yen, and the JPY 3,672 figure in the matrix
      is what the math says — but a real Japanese listing would price at JPY
      3,800 or JPY 4,000, lifting effective USD revenue by 3-9% and pushing
      margin back into the mid-twenties. Local rounding conventions are
      covered in detail in Section 12.
    </Text>
  </Page>
);

const Section6 = ({ data }: { data: ReportData }) => {
  const rows = buildBreakEvenRows(data.catalog).map((r) => [
    r.productName,
    typeof r.printfulEtsy === "number" ? `$${r.printfulEtsy.toFixed(2)}` : String(r.printfulEtsy),
    typeof r.printfulShopify === "number" ? `$${r.printfulShopify.toFixed(2)}` : String(r.printfulShopify),
    typeof r.printifyEtsy === "number" ? `$${r.printifyEtsy.toFixed(2)}` : String(r.printifyEtsy),
    typeof r.printifyShopify === "number" ? `$${r.printifyShopify.toFixed(2)}` : String(r.printifyShopify),
    typeof r.printifyPopup === "number" ? `$${r.printifyPopup.toFixed(2)}` : String(r.printifyPopup),
  ]);
  return (
    <Page size="A4" style={styles.page}>
      <PageChrome pageLabel="6. Break-even retail price" />
      <Text style={styles.h1}>6. Break-even retail price for 20% net margin</Text>
      <Text style={styles.paragraph}>
        The retail price (in USD, US shipping, no offsite ads) that a seller
        must charge to clear a 20% net margin after all fees. This is the
        floor — anything lower and you are subsidising the marketplace.
      </Text>
      <Table
        headers={["Product", "Printful Etsy", "Printful Shopify", "Printify Etsy", "Printify Shopify", "Printify Pop-up"]}
        rows={rows}
        flex={[3, 1.4, 1.4, 1.4, 1.4, 1.4]}
      />
      <Text style={styles.meta}>
        Computed deterministically from the YAML data + marketplace-fees table
        embedded in this PDF (see Section 15 for sources).
      </Text>
    </Page>
  );
};

const Section7 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="7. Hidden costs" />
    <Text style={styles.h1}>7. Hidden costs the matrices don't show</Text>
    <Text style={styles.paragraph}>
      Three cost layers sit outside per-unit fee math but routinely turn a
      green margin red:
    </Text>
    <Bullet>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Etsy offsite ads (12%): </Text>
      mandatory above $10K trailing-12-month sales. Reduces a 24% net to 12%
      on every Etsy-attributed sale.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Listing renewals ($0.20 every 4 months on Etsy): </Text>
      invisible per-listing, but a 300-listing store pays $180/year just to
      keep listings live regardless of sales.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Sample orders and design rounds: </Text>
      amortized across sales of a design. A successful design absorbs them; a
      flop never recoups them. Rule of thumb: budget 10-15% of gross revenue
      for samples, replacements, and unsuccessful designs in year one.
    </Bullet>
    <Text style={styles.paragraph}>
      Layer those over the matrix and a 20-25% net margin is more honestly a
      12-18% take-home margin in year one.
    </Text>
  </Page>
);

const Section8 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="8. The scaling threshold" />
    <Text style={styles.h1}>8. The scaling threshold: when POD stops paying</Text>
    <Text style={styles.paragraph}>
      POD is structured for low risk per unit, not low cost per unit. The
      economic crossover — where bulk printing or in-house fulfillment becomes
      cheaper than POD — typically lands at 50-100 orders per month per
      design.
    </Text>
    <Bullet>
      Below 50 orders/design/month: POD wins decisively. Bulk printing's
      setup, screen, and inventory cost wipes out its per-unit price advantage.
    </Bullet>
    <Bullet>
      50-100 orders/design/month: contested zone. A local screen-printer
      running 100-piece minimums on a Bella+Canvas 3001 lands at ~$7-8 per
      unit landed, vs Printify's $15.44. The arithmetic flips, but you absorb
      inventory risk, cash-flow burden, and shipping logistics.
    </Bullet>
    <Bullet>
      Above 100 orders/design/month: bulk wins on unit economics, and the
      operational overhead is justified. This is the "graduate from POD"
      signal that successful Etsy and Shopify shops eventually hit on hero
      designs while keeping POD for the long tail.
    </Bullet>
    <Text style={styles.paragraph}>
      The honest framing: POD is a discovery channel, not a permanent
      fulfilment model. Use it to find the 5% of designs that pull their
      weight, then graduate those to bulk while POD continues to monetise the
      long tail at zero inventory risk.
    </Text>
  </Page>
);

const Section9 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="9. Provider variance" />
    <Text style={styles.h1}>9. Provider variance &amp; geographic routing</Text>
    <Text style={styles.paragraph}>
      Printify routes the same SKU to multiple printers depending on stock,
      capacity, and buyer geography. The implication for margin: the
      "$15.44 landed" we use throughout this report is the typical
      Printify-recommended provider price. Real listings can land $1-3
      higher if the routing falls to a fallback provider.
    </Text>
    <Text style={styles.paragraph}>
      The mitigation is provider-pinning — Printify lets you lock a SKU to a
      specific provider, trading availability for predictability. For a
      hero-design SKU, pinning is almost always the right call.
    </Text>
    <Text style={styles.paragraph}>
      Printful avoids this category of variance entirely by owning its
      facilities, but pays for it with a structurally higher base cost. The
      practical tradeoff: variance risk vs. unit-economics floor. For sellers
      with &gt;200 orders/month per SKU, variance risk dominates and Printful
      often wins on total economics despite the higher unit cost.
    </Text>
  </Page>
);

const Section10 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="10. Subscription discounts" />
    <Text style={styles.h1}>10. Subscription discounts (Printful Plus / Printify Premium)</Text>
    <Text style={styles.paragraph}>
      Printful Plus ($9/month) and Printful Pro ($49/month) reduce base costs
      by ~7% and ~15% respectively. Printify Premium ($14.99/month) reduces
      Printify base costs by ~20%.
    </Text>
    <Text style={styles.paragraph}>
      Break-even math: at $7/unit base-cost savings on a Bella+Canvas tee,
      Printify Premium pays back at roughly 8 sales/month. Below that volume,
      pay-per-order is structurally cheaper. Above it, Premium is a no-brainer.
    </Text>
    <Text style={styles.paragraph}>
      The subtle trap is fixed-cost commitment in low-traffic months. A
      seasonal store with 30 sales in November and 3 in February pays $14.99
      to save ~$1 in February. Re-evaluate the subscription monthly against
      trailing-30-day sales — most stores set it once and never review.
    </Text>
  </Page>
);

const Section11 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="11. Etsy offsite ads sensitivity" />
    <Text style={styles.h1}>11. Etsy offsite ads sensitivity</Text>
    <Text style={styles.paragraph}>
      Etsy offsite ads are a 12% fee on gross revenue applied to any sale
      attributed to an external ad placement. For sellers below $10K
      trailing-12-month sales, the program is opt-in. Above $10K, it's
      mandatory and cannot be disabled.
    </Text>
    <Text style={styles.paragraph}>
      The sensitivity at the threshold is brutal: a seller doing $9,800 in
      year-one and $11,000 in year-two doesn't see a 12% revenue increase —
      they see roughly 0% take-home growth, because the extra $1,200 of
      revenue triggers offsite-ads on the entire next-year run.
    </Text>
    <View style={styles.callout}>
      <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
        Tactical implication
      </Text>
      <Text>
        Sellers approaching the $10K threshold should either drive a year-one
        push past $15K (so the offsite-ads year-two impact is amortized
        across higher volume), or deliberately stay below $10K and route
        excess demand through a Shopify or manual storefront to avoid the
        threshold trigger.
      </Text>
    </View>
  </Page>
);

const Section12 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="12. Multi-currency rounding" />
    <Text style={styles.h1}>12. Multi-currency rounding conventions</Text>
    <Text style={styles.paragraph}>
      Each market has a default rounding convention that either gives back
      margin or steals it depending on which side of the round-number the
      seller lands on:
    </Text>
    <Bullet>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>EUR markets: </Text>
      .99 endings (e.g., EUR 22.99). Buyers expect this; pricing at EUR 23.00
      feels "expensive" without any revenue benefit.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>GBP (UK): </Text>
      .95 or .99 endings; whole-pound pricing reads as premium. Round up
      from the pure-FX number when possible.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>JPY (Japan): </Text>
      whole hundreds. JPY 3,672 should price at JPY 3,800 — Japanese buyers
      do not perceive JPY 3,672 as more expensive than JPY 3,500, but JPY
      3,800 vs JPY 3,500 reads as a clear tier difference.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>CAD &amp; AUD: </Text>
      whole-dollar. C$31.99 reads as "cheap"; C$32 reads as "normal"; C$35
      reads as "premium". Pick the tier deliberately.
    </Bullet>
    <Text style={styles.paragraph}>
      Across the six currencies, intentional rounding adds 2-7% to effective
      revenue with no visible impact on conversion — a hidden lever most
      multi-currency sellers leave on the floor.
    </Text>
  </Page>
);

const Section13 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="13. POD-to-bulk transition" />
    <Text style={styles.h1}>13. POD-to-bulk transition: when to graduate a hero design</Text>
    <Text style={styles.paragraph}>
      A "hero design" is any single design that crosses ~75 sales/month and
      stays there for 3+ consecutive months. The transition decision tree:
    </Text>
    <Bullet>
      Confirm sustained demand: 3 consecutive months &gt;75 sales/month. Single
      monthly spikes (gift seasons, viral moments) do not qualify.
    </Bullet>
    <Bullet>
      Quote bulk pricing for 3-6 months of inventory at current run-rate.
      Local screen-printers and overseas options both viable; obtain 3+ quotes.
    </Bullet>
    <Bullet>
      Account for cash-flow burden: bulk requires upfront capital. Compare
      cost-of-capital to the unit-cost savings; if savings &lt; 12% APR-equivalent,
      stay POD.
    </Bullet>
    <Bullet>
      Account for inventory risk: returns, sizing variance, color drift on
      reprints. POD's variance is per-order; bulk's variance is per-batch and
      ten times more expensive when it goes wrong.
    </Bullet>
    <Bullet>
      Hybrid model: keep POD enabled for size/color tails (3XL, less common
      colors) while running bulk for the high-velocity SKUs.
    </Bullet>
  </Page>
);

const Section14 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="14. Conclusion" />
    <Text style={styles.h1}>14. Conclusion: the 4× margin spread</Text>
    <Text style={styles.paragraph}>
      The single most useful insight from this benchmark: the spread between
      best-case (Printify on Shopify, USD, ≈31% net) and worst-case (Printful
      on Etsy with offsite ads, CAD buyer, ≈8% net) on the identical physical
      product is roughly 4× margin.
    </Text>
    <Text style={styles.paragraph}>
      The vendor matters. The marketplace matters more. The currency matters
      more than most sellers realise. And the offsite-ads toggle silently
      determines whether the whole stack pays at all.
    </Text>
    <Text style={styles.paragraph}>
      You can run any cell of this matrix for your own listing in about ten
      seconds at {SITE_URL}. Every fee is itemized; switching marketplaces or
      currencies updates the whole stack live.
    </Text>
    <View style={styles.callout}>
      <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
        How to act on this report
      </Text>
      <Text>
        1. Pick your three highest-volume SKUs. {"\n"}
        2. Run them through the calculator at every marketplace × currency
        you actively sell into. {"\n"}
        3. Where margin is below 20%, raise the price (Section 12) or
        re-route demand (Section 11). {"\n"}
        4. Where SKU volume crosses 75/month sustained, evaluate bulk
        (Section 13).
      </Text>
    </View>
  </Page>
);

const Section15 = ({ data }: { data: ReportData }) => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="15. Sources" />
    <Text style={styles.h1}>15. Sources &amp; transparency</Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Vendor data: </Text>
      Printful and Printify public catalog list prices, snapshot{" "}
      {data.catalog.printful.raw.asOfDate}. Source files live under
      data/printful/products.yml and data/printify/products.yml in the open
      PODProfit repository; a monthly cron opens a pull request when prices
      drift.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Marketplace fees: </Text>
      Etsy Help Center fee schedules (2026 published rates), Shopify Basic +
      Shopify Payments documentation, Amazon Merch on Demand royalty schedule,
      Printify Pop-up help center.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>FX rates: </Text>
      ECB mid-market {data.catalog.fx.asOfDate} ({data.catalog.fx.sourceUrl}).
      Marketplace spreads (~2.5% Etsy, ~1.5% Shopify Payments) layered on top
      of mid-market for cross-border simulations.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Excluded: </Text>
      design amortization, returns, sample orders, paid acquisition (CPA),
      seller time. These are partially modelled in Section 7 and 13.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Confidence: </Text>
      High on vendor and marketplace per-unit fees (public schedules,
      deterministic). Medium on FX-spread assumptions (representative, not
      transaction-precise). Medium on Amazon Merch royalty (tier-dependent
      and variable by category). Low on the 50-100 orders/month POD-to-bulk
      threshold (sourced from screen-printer quotes and r/PrintOnDemand
      graduates, n ≈ 40).
    </Text>
    <Text style={styles.meta}>
      Counter-data, corrections, or a vendor we should add? Reply on
      hello@getpodprofit.com. We update this report when
      prices or fees change — the version on the cover page reflects the
      most recent revision.
    </Text>
  </Page>
);

const Section16 = () => (
  <Page size="A4" style={styles.page}>
    <PageChrome pageLabel="16. License" />
    <Text style={styles.h1}>16. License &amp; terms</Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>License grant: </Text>
      {PUBLISHER} grants you a non-exclusive, non-transferable, single-user
      license to read and reference this report for your own internal
      business purposes.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Permitted: </Text>
      Read, store on devices you personally own, quote short excerpts (up to
      300 words) with attribution to {SITE_URL} in editorial / educational
      contexts.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Prohibited: </Text>
      Resale, sublicense, or redistribution of this PDF (in whole, in part,
      or in derivative form). Removing or altering copyright or attribution
      notices. Use of the content to create a competing benchmark report
      offered to third parties.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Refunds: </Text>
      Governed by the storefront where this report was purchased.
      See {SITE_URL}/refund.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Disclaimer: </Text>
      Provided "AS IS" without warranty. Numbers reflect public data as of
      the snapshot dates noted. Always verify against authoritative vendor
      and marketplace sources before making business decisions.
    </Text>
    <Text style={styles.paragraph}>
      <Text style={{ fontFamily: "Helvetica-Bold" }}>Limitation of liability: </Text>
      To the maximum extent permitted by law, {PUBLISHER}'s liability for any
      claim arising from use of this report shall not exceed the price paid
      for the report.
    </Text>
    <View style={[styles.callout, { marginTop: 24 }]}>
      <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
        Thank you for buying the report
      </Text>
      <Text>
        If you found it useful, the most valuable thing you can do is leave
        a counter-data note on hello@getpodprofit.com.
        Every correction makes the next edition sharper.
      </Text>
    </View>
    <Text style={[styles.meta, { marginTop: 32 }]}>
      (c) {COPYRIGHT_YEAR} {PUBLISHER}. All rights reserved. Version{" "}
      {PRODUCTS_VERSION}.
    </Text>
  </Page>
);

const ReportDocument = ({ data }: { data: ReportData }) => (
  <Document
    title={PRODUCT_NAME_PDF}
    author={PUBLISHER}
    subject="POD net margin benchmarks across vendors, marketplaces, currencies"
    keywords="print on demand, profit margin, etsy fees, printful, printify"
  >
    <CoverPage data={data} />
    <TocPage />
    <Section1 />
    <Section2 data={data} />
    <Section3 data={data} />
    <Section4 />
    <Section5 />
    <Section6 data={data} />
    <Section7 />
    <Section8 />
    <Section9 />
    <Section10 />
    <Section11 />
    <Section12 />
    <Section13 />
    <Section14 />
    <Section15 data={data} />
    <Section16 />
  </Document>
);

// ---------- Orchestrator ----------

export async function buildBenchmarkReport(): Promise<{ path: string; pageCount: number; bytes: number }> {
  const catalog = loadCatalog();
  const data: ReportData = { catalog };

  await mkdir(DIST_DIR, { recursive: true });
  const path = resolve(DIST_DIR, pdfFileName());

  // toBuffer() returns a stream-like PDFDocument; toBlob() materializes the
  // bytes so we can both count them and run a cheap page-count heuristic.
  const blob = await pdf(<ReportDocument data={data} />).toBlob();
  const buf = Buffer.from(await blob.arrayBuffer());
  await writeFile(path, buf);

  // Page count heuristic: PDF stream contains one "/Type /Page" object per
  // page (followed by a non-letter so we don't catch /Pages or /PageLayout).
  // Sufficient for a build-time sanity check; the unit test asserts a bound.
  const text = buf.toString("latin1");
  const pageMatches = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  const pageCount = pageMatches ? pageMatches.length : 0;

  return { path, pageCount, bytes: buf.length };
}

if (require.main === module) {
  buildBenchmarkReport()
    .then((r) => {
      console.log(`[pdf] wrote ${r.path} (${r.pageCount} pages, ${r.bytes} bytes)`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
