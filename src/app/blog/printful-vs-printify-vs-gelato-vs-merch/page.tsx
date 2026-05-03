import type { Metadata } from "next";
import Link from "next/link";

const URL =
  "https://getpodprofit.com/blog/printful-vs-printify-vs-gelato-vs-merch";
const PUBLISHED = "2026-06-02";

export const metadata: Metadata = {
  title:
    "Printful vs Printify vs Gelato vs Merch by Amazon: 2026 Profit Comparison",
  description:
    "Four POD vendors, same product, same retail price. The first head-to-head that includes Gelato (best for EU sellers) and Merch by Amazon (royalty model, no upfront cost).",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    publishedTime: `${PUBLISHED}T00:00:00Z`,
    authors: ["Satsuki Okazaki"],
    title:
      "Printful vs Printify vs Gelato vs Merch by Amazon: 2026 Profit Comparison",
    description:
      "Four POD vendors, same product, same retail price — head-to-head with Gelato and Merch by Amazon included.",
  },
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Printful vs Printify vs Gelato vs Merch by Amazon: 2026 Profit Comparison",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  author: {
    "@type": "Person",
    name: "Satsuki Okazaki",
    url: "https://x.com/lastarna",
  },
  publisher: {
    "@type": "Organization",
    name: "PODProfit",
    url: "https://getpodprofit.com",
  },
  mainEntityOfPage: URL,
};

export default function CornerstoneThreePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSONLD) }}
      />
      <article className="prose prose-stone max-w-none dark:prose-invert">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Published {PUBLISHED} · 7 min read · By{" "}
          <a href="https://x.com/lastarna">Satsuki Okazaki</a>
        </p>

        <h1>
          Printful vs Printify vs Gelato vs Merch by Amazon: 2026 Profit
          Comparison
        </h1>

        <p>
          Printful and Printify dominate the POD conversation, but two other
          vendors quietly serve completely different niches:{" "}
          <strong>Gelato</strong> (the EU specialist, fastest fulfillment in
          Germany / France / Italy) and <strong>Merch by Amazon</strong> (no
          upfront cost, royalty-only model — completely different math). This
          piece puts all four against the same product to expose where each
          one wins.
        </p>

        <h2>The four-vendor matrix at a glance</h2>

        <div className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 dark:border-stone-700">
                <th className="py-2 text-left">Vendor</th>
                <th className="py-2 text-right">Cost model</th>
                <th className="py-2 text-right">Best for</th>
                <th className="py-2 text-right">Worst for</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <td className="py-2 font-semibold">Printful</td>
                <td className="py-2 text-right">Pay vendor cost upfront</td>
                <td className="py-2 text-right">Apparel, premium materials, US/EU sellers</td>
                <td className="py-2 text-right">Tight margins on basic tees</td>
              </tr>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <td className="py-2 font-semibold">Printify</td>
                <td className="py-2 text-right">Pay vendor cost upfront</td>
                <td className="py-2 text-right">Variety, lowest base costs, US sellers</td>
                <td className="py-2 text-right">Provider variance / longer fulfillment</td>
              </tr>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <td className="py-2 font-semibold">Gelato</td>
                <td className="py-2 text-right">Pay vendor cost upfront</td>
                <td className="py-2 text-right">EU buyers, fast EU fulfillment, sustainability</td>
                <td className="py-2 text-right">Higher US shipping cost</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Merch by Amazon</td>
                <td className="py-2 text-right">Royalty (no upfront cost)</td>
                <td className="py-2 text-right">Amazon-native sellers, zero capital risk</td>
                <td className="py-2 text-right">Amazon takes ~70% — thin per-unit yield</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>The math, on a $24 t-shirt</h2>

        <p>
          Same product (Bella+Canvas 3001 white M, or equivalent), same retail
          ($24 USD), same buyer location (US), no offsite ads:
        </p>

        <div className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 dark:border-stone-700">
                <th className="py-2 text-left">Vendor / channel</th>
                <th className="py-2 text-right">Vendor cost + ship</th>
                <th className="py-2 text-right">Channel fees</th>
                <th className="py-2 text-right">Net profit</th>
                <th className="py-2 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs tabular-nums">
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <td className="py-2 font-sans">Printful + Etsy US</td>
                <td className="py-2 text-right">$17.94</td>
                <td className="py-2 text-right">$2.73</td>
                <td className="py-2 text-right text-stone-700 dark:text-stone-300">$3.33</td>
                <td className="py-2 text-right">13.9%</td>
              </tr>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <td className="py-2 font-sans">Printify + Etsy US</td>
                <td className="py-2 text-right">$15.44</td>
                <td className="py-2 text-right">$2.73</td>
                <td className="py-2 text-right text-brand-700 dark:text-brand-300">$5.83</td>
                <td className="py-2 text-right">24.3%</td>
              </tr>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <td className="py-2 font-sans">Gelato + Etsy US</td>
                <td className="py-2 text-right">$18.24</td>
                <td className="py-2 text-right">$2.73</td>
                <td className="py-2 text-right text-stone-700 dark:text-stone-300">$3.03</td>
                <td className="py-2 text-right">12.6%</td>
              </tr>
              <tr>
                <td className="py-2 font-sans">Merch by Amazon (royalty)</td>
                <td className="py-2 text-right">—</td>
                <td className="py-2 text-right">~70% to Amazon</td>
                <td className="py-2 text-right text-stone-700 dark:text-stone-300">$5.40</td>
                <td className="py-2 text-right">22.5%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Two surprises in this matrix:
        </p>

        <ol>
          <li>
            <strong>Merch by Amazon&apos;s royalty model gets you to ~$5 net</strong>{" "}
            on a $24 t-shirt with <em>zero upfront cost and zero shipping
            handling on your part</em>. The trade is total dependency on Amazon
            search and zero brand control.
          </li>
          <li>
            <strong>Gelato is the only one where US fulfillment hurts.</strong>{" "}
            The exact same vendor flips to a clear winner when shipping to
            Berlin or Paris — Printful and Printify route from US warehouses
            and pay the international shipping penalty.
          </li>
        </ol>

        <h2>When each vendor wins</h2>

        <h3>Printful wins when</h3>
        <ul>
          <li>You need premium materials (Bella+Canvas, AS Colour, Stanley/Stella)</li>
          <li>Brand consistency matters (single facility per region)</li>
          <li>You have Printful Pro subscription and ship 30+ orders/month</li>
        </ul>

        <h3>Printify wins when</h3>
        <ul>
          <li>Retail price is below $25 — base costs eat you alive otherwise</li>
          <li>You&apos;re US-based and ship mostly US</li>
          <li>Variety matters more than consistency (1000+ products)</li>
        </ul>

        <h3>Gelato wins when</h3>
        <ul>
          <li>50%+ of your buyers are in the EU</li>
          <li>You&apos;re positioning on sustainability (Gelato is carbon-neutral)</li>
          <li>You sell wall art / posters (Gelato&apos;s strongest category)</li>
        </ul>

        <h3>Merch by Amazon wins when</h3>
        <ul>
          <li>You don&apos;t want to handle ANY operations — design, upload, done</li>
          <li>You can rank on Amazon&apos;s internal search</li>
          <li>You&apos;re testing designs before committing capital elsewhere</li>
        </ul>

        <h2>Methodology</h2>

        <p>
          Printful, Printify, Gelato base costs from public catalogs as of
          2026-04-28. Etsy fee schedule from Etsy Help Center, 2026 edition.
          Merch by Amazon royalty range from Amazon&apos;s public &quot;Royalty
          Calculator&quot; documentation; the ~$5.40 figure assumes a $24 list
          price and Tier 1 royalty on a Standard product. Subscription
          discounts (Printful Plus / Pro, Printify Premium, Gelato+) are not
          modeled. Currency: USD throughout.
        </p>

        <h2>Run your own combination</h2>

        <p>
          PODProfit covers Printful and Printify today; Gelato and Merch by
          Amazon are on the roadmap. Until then, you can use the same{" "}
          <Link href="/">side-by-side comparison</Link> for the two we do
          support, and use this article as a sanity check for the other two.
        </p>

        <hr />

        <p className="text-sm text-stone-500 dark:text-stone-400">
          Read next:{" "}
          <Link href="/blog/printful-vs-printify-profit-calculator">
            Printful vs Printify Profit Calculator: Multi-Currency Side-by-Side (2026)
          </Link>
        </p>
      </article>
    </main>
  );
}
