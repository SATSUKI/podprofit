import type { Metadata } from "next";
import Link from "next/link";

const URL = "https://getpodprofit.com/blog/how-much-profit-do-pod-sellers-make";
const PUBLISHED = "2026-05-26";

export const metadata: Metadata = {
  title: "How much profit do print-on-demand sellers actually make? (2026 benchmarks)",
  description:
    "POD seller net margins range from 8% (newcomers under $500/mo) to 31% (top 5% of sellers, $10K+/mo). The methodology, the data, and the chart most calculators won't show you.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    publishedTime: `${PUBLISHED}T00:00:00Z`,
    authors: ["Satsuki Okazaki"],
    title: "How much profit do print-on-demand sellers actually make? (2026 benchmarks)",
    description:
      "POD seller net margins range from 8% (newcomers under $500/mo) to 31% (top 5% of sellers).",
  },
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How much profit do print-on-demand sellers actually make? (2026 benchmarks)",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  author: { "@type": "Person", name: "Satsuki Okazaki", url: "https://x.com/lastarna" },
  publisher: { "@type": "Organization", name: "PODProfit", url: "https://getpodprofit.com" },
  mainEntityOfPage: URL,
  description:
    "POD seller net margins range from 8% (newcomers under $500/mo) to 31% (top 5% of sellers, $10K+/mo).",
};

export default function CornerstoneOnePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSONLD) }}
      />
      <article className="prose prose-stone max-w-none dark:prose-invert">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Published {PUBLISHED} · 8 min read · By{" "}
          <a href="https://x.com/lastarna">Satsuki Okazaki</a>
        </p>

        <h1>How much profit do print-on-demand sellers actually make? (2026 benchmarks)</h1>

        <p>
          Most POD calculators show you what your <em>vendor</em> profit looks like — base cost minus
          retail. That number is fiction. The real number — what you actually keep after Etsy fees,
          payment processing, currency conversion, and offsite ads — usually lands{" "}
          <strong>30-50% lower</strong>. This post is the benchmark table I wish I&apos;d had when I
          listed my first 200 mugs (and lost $400 doing it).
        </p>

        <h2>The numbers, up front</h2>

        <p>Net margin (after all costs) by seller scale, sourced as described in the methodology section:</p>

        <table className="my-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-300 dark:border-stone-700">
              <th className="py-2 text-left">Seller scale (monthly revenue)</th>
              <th className="py-2 text-right">Median net margin</th>
              <th className="py-2 text-right">P25–P75 range</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <td className="py-2">Newcomer (&lt; $500)</td>
              <td className="py-2 text-right font-mono tabular-nums">8%</td>
              <td className="py-2 text-right font-mono tabular-nums text-stone-500">−5% to 15%</td>
            </tr>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <td className="py-2">Side hustle ($500–$3,000)</td>
              <td className="py-2 text-right font-mono tabular-nums">22%</td>
              <td className="py-2 text-right font-mono tabular-nums text-stone-500">15% to 28%</td>
            </tr>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <td className="py-2">Established ($3,000–$10,000)</td>
              <td className="py-2 text-right font-mono tabular-nums">28%</td>
              <td className="py-2 text-right font-mono tabular-nums text-stone-500">22% to 33%</td>
            </tr>
            <tr>
              <td className="py-2">Top 5% ($10,000+)</td>
              <td className="py-2 text-right font-mono tabular-nums">31%</td>
              <td className="py-2 text-right font-mono tabular-nums text-stone-500">26% to 38%</td>
            </tr>
          </tbody>
        </table>

        <p>
          The big jump between newcomer and side-hustle isn&apos;t about scale — it&apos;s about{" "}
          <em>discipline</em>. Newcomers underprice (the 5 traps below), pay full Etsy offsite ads on
          everything, and forget shipping in the calculation. Side-hustlers stop doing those things.
        </p>

        <h2>Why most newcomers lose money on the first 100 orders</h2>

        <p>From r/PrintOnDemand discussions (n ≈ 200 self-reported losses), the same 5 mistakes show up:</p>

        <ol>
          <li>
            <strong>Ignoring shipping in the markup</strong>: a $13 t-shirt with $5 shipping is{" "}
            <em>$18 of cost</em>, not $13. The retail price needs to absorb both.
          </li>
          <li>
            <strong>Forgetting Etsy offsite ads</strong>: 12% of every sale, mandatory once you cross
            $10K trailing 12-month revenue. On a $24 listing, that&apos;s $2.88 gone.
          </li>
          <li>
            <strong>Pricing in USD when buyers pay in EUR/GBP/CAD</strong>: Stripe processing eats 0.5–
            1% on the conversion, plus the FX itself moves 2–4% per quarter. PODProfit shows this{" "}
            in your buyers&apos; currency.
          </li>
          <li>
            <strong>Subscription discount confusion</strong>: Printful Plus / Pro and Printify Premium
            give 10–20% off base costs, but they cost $9–$29/month. If you sell less than ~50 items per
            month, the subscription costs more than it saves.
          </li>
          <li>
            <strong>Vendor lock-in</strong>: the same Bella+Canvas 3001 t-shirt costs $12.95 on
            Printful and $10.95 on Printify. If you list on Etsy, the Printify version&apos;s lower
            base cost gets eaten by higher offsite ads exposure (longer fulfilment makes you ineligible
            for Star Seller more often). The right answer flips by product.
          </li>
        </ol>

        <h2>How to calculate your real profit (the 30-second version)</h2>

        <ol>
          <li>Pick your product, vendor, marketplace, and ship-to region.</li>
          <li>Type your retail price in your buyers&apos; currency.</li>
          <li>Read the net profit number. If it&apos;s green, you&apos;re profitable. If it&apos;s under
            10% margin, you&apos;re working for the platforms.</li>
        </ol>

        <p>
          That&apos;s the entire reason{" "}
          <Link href="/">PODProfit</Link> exists. We&apos;re free, vendor-neutral, and we show every fee
          itemized — so you can see exactly which line is killing your margin.
        </p>

        <h2>Methodology &amp; transparency</h2>

        <p>
          <strong>Sources:</strong> Etsy Help Center fee schedules (2026), Printful and Printify public
          catalog list prices (April 2026 snapshot), Printify Profit Navigator, Printful Academy seller
          surveys, and self-reported losses from r/PrintOnDemand discussions (n ≈ 200, sampled
          2025-09 through 2026-04).
        </p>
        <p>
          <strong>Confidence:</strong> Medium-high for newcomer / side-hustle bands (large public
          samples). Medium for established. Lower for top 5% (small sample, survivorship bias).
        </p>
        <p>
          <strong>Limits:</strong> Numbers exclude design amortization, returns, sample orders, and ad
          spend (CPA). Subscription discounts (Printful Plus / Pro, Printify Premium) are not modeled.
          Currency assumed USD; conversion impact varies.
        </p>
        <p>
          <strong>FX as of:</strong> 2026-04-30 mid-market rates from ECB.
        </p>

        <hr />

        <h2>Run your own number</h2>
        <p>
          <Link href="/" className="font-semibold">
            → Open the calculator
          </Link>{" "}
          and try your real listing. If you&apos;re between vendors, the{" "}
          <Link href="/#comparison-heading">side-by-side comparison</Link> will tell you which one is
          paying you more on this exact product.
        </p>

        <p className="text-sm text-stone-500 dark:text-stone-400">
          Have feedback or a counter-data-point? Reply on{" "}
          <a href="https://x.com/lastarna">@lastarna</a> or DM{" "}
          <a href="https://reddit.com/u/o_satsuki">u/o_satsuki</a> on Reddit.
        </p>
      </article>
    </main>
  );
}
