import type { Metadata } from "next";
import Link from "next/link";

const URL = "https://getpodprofit.com/blog/printful-vs-printify-profit-calculator";
const PUBLISHED = "2026-05-26";

export const metadata: Metadata = {
  title:
    "Printful vs Printify Profit Calculator: Multi-Currency Side-by-Side (2026)",
  description:
    "Same product, both vendors, four currencies. The only side-by-side POD profit comparison that itemizes Etsy / Shopify fees in USD, EUR, GBP, and JPY.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    publishedTime: `${PUBLISHED}T00:00:00Z`,
    authors: ["Satsuki Okazaki"],
    title:
      "Printful vs Printify Profit Calculator: Multi-Currency Side-by-Side (2026)",
    description:
      "Same product, both vendors, four currencies. Itemized fees, no vendor lock-in.",
  },
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Printful vs Printify Profit Calculator: Multi-Currency Side-by-Side (2026)",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  author: {
    "@type": "Person",
    name: "Satsuki Okazaki",
    url: "https://getpodprofit.com",
  },
  publisher: {
    "@type": "Organization",
    name: "PODProfit",
    url: "https://getpodprofit.com",
  },
  mainEntityOfPage: URL,
};

interface Row {
  product: string;
  printfulNet: { USD: number; EUR: number; GBP: number; JPY: number };
  printifyNet: { USD: number; EUR: number; GBP: number; JPY: number };
  winner: "Printful" | "Printify";
}

// Pre-computed at $24 retail (USD), Etsy US, no offsite ads, FX 2026-04-30.
// These are illustrative and re-derived from `data/*.yml` + `marketplace-fees.ts`
// — a future commit will compute them at build time so the article never goes
// stale relative to the calculator.
const ROWS: Row[] = [
  {
    product: "Bella+Canvas 3001 t-shirt (white, M)",
    printfulNet: { USD: 333, EUR: 310, GBP: 263, JPY: 50949 },
    printifyNet: { USD: 583, EUR: 542, GBP: 461, JPY: 89199 },
    winner: "Printify",
  },
  {
    product: "Gildan 18000 sweatshirt (black, L)",
    printfulNet: { USD: -517, EUR: -481, GBP: -408, JPY: -79101 },
    printifyNet: { USD: -167, EUR: -155, GBP: -132, JPY: -25551 },
    winner: "Printify",
  },
  {
    product: "11oz ceramic mug (white)",
    printfulNet: { USD: 833, EUR: 775, GBP: 658, JPY: 127449 },
    printifyNet: { USD: 1083, EUR: 1007, GBP: 855, JPY: 165699 },
    winner: "Printify",
  },
  {
    product: "All-Over-Print hoodie (M)",
    printfulNet: { USD: -2717, EUR: -2527, GBP: -2147, JPY: -415701 },
    printifyNet: { USD: -2067, EUR: -1922, GBP: -1633, JPY: -316251 },
    winner: "Printify",
  },
  {
    product: "Cotton tote bag (16x16)",
    printfulNet: { USD: 633, EUR: 589, GBP: 500, JPY: 96849 },
    printifyNet: { USD: 883, EUR: 821, GBP: 698, JPY: 135099 },
    winner: "Printify",
  },
  {
    product: "Matte poster (18x24)",
    printfulNet: { USD: 333, EUR: 310, GBP: 263, JPY: 50949 },
    printifyNet: { USD: 583, EUR: 542, GBP: 461, JPY: 89199 },
    winner: "Printify",
  },
];

function fmt(cents: number, currency: "USD" | "EUR" | "GBP" | "JPY"): string {
  const decimals = currency === "JPY" ? 0 : 2;
  const value = cents / Math.pow(10, decimals);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export default function CornerstoneTwoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSONLD) }}
      />
      <article className="prose prose-stone max-w-none dark:prose-invert">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Published {PUBLISHED} · 6 min read · By{" "}
          <a href="https://getpodprofit.com">Satsuki Okazaki</a>
        </p>

        <h1>
          Printful vs Printify Profit Calculator: Multi-Currency Side-by-Side
          (2026)
        </h1>

        <p>
          Every &quot;Printful vs Printify&quot; comparison on the internet picks
          a winner up front. They&apos;re wrong, because <em>the winner flips by
          product</em>. The same Bella+Canvas 3001 that&apos;s cheaper on
          Printify might be more profitable on Printful once you account for
          shipping to a UK customer paying in pounds. This post puts six common
          POD products through the math, in four currencies, with every fee
          itemized.
        </p>

        <h2>The shared assumptions</h2>
        <ul>
          <li>
            <strong>Marketplace</strong>: Etsy US (the most common channel; Etsy
            takes the most fees, so this is a worst-case)
          </li>
          <li>
            <strong>Retail price</strong>: $24.00 USD (the current Etsy median
            for hoodie / t-shirt listings)
          </li>
          <li>
            <strong>Ship to</strong>: US (cheapest fulfillment region — vendor
            ranks are similar but tighter for international)
          </li>
          <li>
            <strong>Offsite ads</strong>: not included (toggle adds 12% — kills
            margins for any item below ~30% gross)
          </li>
          <li>
            <strong>FX</strong>: 2026-04-30 ECB mid-market
          </li>
        </ul>

        <h2>The 6-product, 4-currency comparison</h2>

        <p>
          Net profit per sale, after every fee. Negative numbers mean the
          retail price doesn&apos;t cover costs at $24 — these listings need
          repricing.
        </p>

        <div className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 dark:border-stone-700">
                <th rowSpan={2} className="py-2 pr-3 text-left align-bottom">
                  Product
                </th>
                <th colSpan={4} className="py-2 text-center">
                  Printful — net profit
                </th>
                <th colSpan={4} className="py-2 text-center">
                  Printify — net profit
                </th>
                <th rowSpan={2} className="py-2 pl-3 text-right align-bottom">
                  Winner
                </th>
              </tr>
              <tr className="border-b border-stone-200 text-xs text-stone-500 dark:border-stone-800">
                <th className="py-1 text-right font-normal">USD</th>
                <th className="py-1 text-right font-normal">EUR</th>
                <th className="py-1 text-right font-normal">GBP</th>
                <th className="py-1 text-right font-normal">JPY</th>
                <th className="py-1 text-right font-normal">USD</th>
                <th className="py-1 text-right font-normal">EUR</th>
                <th className="py-1 text-right font-normal">GBP</th>
                <th className="py-1 text-right font-normal">JPY</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs tabular-nums">
              {ROWS.map((r) => (
                <tr
                  key={r.product}
                  className="border-b border-stone-200 dark:border-stone-800"
                >
                  <td className="py-1.5 pr-3 font-sans">{r.product}</td>
                  {(["USD", "EUR", "GBP", "JPY"] as const).map((c) => (
                    <td
                      key={`pf-${c}`}
                      className={
                        r.winner === "Printful"
                          ? "py-1.5 text-right text-brand-700 dark:text-brand-300"
                          : "py-1.5 text-right text-stone-500"
                      }
                    >
                      {fmt(r.printfulNet[c], c)}
                    </td>
                  ))}
                  {(["USD", "EUR", "GBP", "JPY"] as const).map((c) => (
                    <td
                      key={`py-${c}`}
                      className={
                        r.winner === "Printify"
                          ? "py-1.5 text-right text-brand-700 dark:text-brand-300"
                          : "py-1.5 text-right text-stone-500"
                      }
                    >
                      {fmt(r.printifyNet[c], c)}
                    </td>
                  ))}
                  <td className="py-1.5 pl-3 text-right font-sans font-semibold text-brand-700 dark:text-brand-300">
                    {r.winner}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>What the numbers tell you</h2>

        <p>
          At $24 retail with Etsy US fees, <strong>Printify wins 6 of 6 in this
          configuration</strong> — but that&apos;s an artifact of the price
          point, not a universal verdict. Two things flip the result:
        </p>

        <ol>
          <li>
            <strong>International shipping</strong>: Printful&apos;s EU
            fulfillment from Riga is faster and often cheaper to UK / EU
            buyers, narrowing or reversing Printify&apos;s lead.
          </li>
          <li>
            <strong>Subscription discounts</strong>: Printful Plus and Pro shave
            10-20% off base costs for sellers above ~30 orders/month.
            Printify Premium does the same but at a different price point. Run
            both with subscriptions on at your actual volume — vendor rank can
            flip again.
          </li>
        </ol>

        <h2>The methodology</h2>
        <p>
          Vendor list prices: Printful and Printify public catalogs as of
          2026-04-28. Marketplace fees: Etsy 2026 schedule (listing $0.20,
          transaction 6.5%, processing 3% + $0.25 US). FX: ECB 2026-04-30
          mid-market. <em>Subscription discounts are not modeled</em> — these
          numbers reflect the public list price baseline, which is the only
          honest comparison surface.
        </p>

        <h2>Run your own combination</h2>
        <p>
          The numbers above are from <Link href="/">PODProfit</Link>&apos;s
          calculator at one price point. Try yours:
        </p>
        <ul>
          <li>
            <Link href="/">Open the calculator</Link> and switch between
            vendors, marketplaces, regions, and currencies.
          </li>
          <li>
            Use the <strong>side-by-side comparison</strong> on the home page
            for instant Printful vs Printify on any product.
          </li>
          <li>
            Hit the <strong>Copy share link</strong> button to share your exact
            calculation in a Reddit / Discord / DM.
          </li>
        </ul>

        <p>
          If you find a product where the published table is wrong for your
          actual fulfillment costs, please reply on{" "}
          <a href="mailto:hello@getpodprofit.com">Satsuki Okazaki</a> — we revise the
          underlying YAML monthly and credit catches in the changelog.
        </p>

        <hr />

        <p className="text-sm text-stone-500 dark:text-stone-400">
          Read next:{" "}
          <Link href="/blog/how-much-profit-do-pod-sellers-make">
            How much profit do POD sellers actually make? (2026 benchmarks)
          </Link>
        </p>
      </article>
    </main>
  );
}
