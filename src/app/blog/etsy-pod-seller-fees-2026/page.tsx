import type { Metadata } from "next";
import Link from "next/link";

const URL = "https://getpodprofit.com/blog/etsy-pod-seller-fees-2026";
const PUBLISHED = "2026-06-09";

export const metadata: Metadata = {
  title: "Etsy POD Seller Fees Explained: Every Fee, Every Percentage (2026)",
  description:
    "Listing fee, transaction fee, payment processing, offsite ads — every Etsy fee a POD seller pays in 2026, with worked examples in USD, EUR, GBP, and JPY.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    publishedTime: `${PUBLISHED}T00:00:00Z`,
    authors: ["Satsuki Okazaki"],
    title: "Etsy POD Seller Fees Explained (2026)",
  },
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Etsy POD Seller Fees Explained: Every Fee, Every Percentage (2026)",
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

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSONLD) }}
      />
      <article className="prose prose-stone max-w-none dark:prose-invert">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Published {PUBLISHED} · 5 min read · By{" "}
          <a href="https://x.com/lastarna">Satsuki Okazaki</a>
        </p>

        <h1>Etsy POD seller fees explained: every fee, every percentage (2026)</h1>

        <p>
          Etsy publishes its fees clearly, but they&apos;re scattered across
          eight Help Center pages. This is the complete picture in one
          place — every line that comes off your $24 t-shirt before you see a
          dollar.
        </p>

        <h2>The four fees Etsy charges every POD seller</h2>

        <table>
          <thead>
            <tr>
              <th>Fee</th>
              <th>Amount</th>
              <th>When charged</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Listing fee</td>
              <td>$0.20 per listing</td>
              <td>When you publish or auto-renew (every 4 months)</td>
            </tr>
            <tr>
              <td>Transaction fee</td>
              <td>6.5% of the item price + shipping you charge</td>
              <td>On every sale</td>
            </tr>
            <tr>
              <td>Payment processing</td>
              <td>3% + $0.25 (US); varies by country</td>
              <td>On every sale</td>
            </tr>
            <tr>
              <td>Offsite ads (mandatory above $10K/year)</td>
              <td>12% of the sale</td>
              <td>Only on sales attributed to Etsy&apos;s offsite ads</td>
            </tr>
          </tbody>
        </table>

        <p>
          Plus optional: Etsy Ads (you set the budget, separate from offsite),
          Pattern subscription, Etsy Plus subscription. None of those are
          unavoidable like the four above.
        </p>

        <h2>Worked example: $24 Bella+Canvas tee, US buyer, no offsite ads</h2>

        <pre>
          <code>{`Retail price                    $24.00
- Vendor base (Printful 3001)   $12.95
- Vendor shipping (US)          $4.99
- Etsy listing fee              $0.20
- Etsy transaction fee (6.5%)   $1.56
- Etsy payment processing       $0.25 + 3% × $24 = $0.97
- Etsy offsite ads              $0.00 (toggle off)
                                ─────
Net profit                      $3.33  (13.9% margin)`}</code>
        </pre>

        <p>That&apos;s the calculation in one form. Now the gotchas.</p>

        <h2>The four traps every newcomer falls into</h2>

        <h3>1. Forgetting the transaction fee applies to shipping you charge</h3>
        <p>
          If you charge $5 shipping on a $24 item, Etsy&apos;s 6.5% transaction
          fee is calculated on $29, not $24 — that&apos;s an extra $0.33 you
          didn&apos;t budget for.
        </p>

        <h3>2. Triggering offsite ads at the worst time</h3>
        <p>
          Once your trailing 12-month sales hit $10K, offsite ads become
          mandatory at 12% on every sale Etsy attributes to its ad network.
          On a $24 item with already razor-thin margins, that&apos;s usually
          enough to push you into a loss. Either reprice everything or close
          the listings that drive offsite traffic.
        </p>

        <h3>3. Foreign exchange you didn&apos;t notice</h3>
        <p>
          When a UK buyer pays £19 for your $24 listing, Etsy converts at a
          rate that&apos;s typically 2-4% worse than mid-market — silently
          eating margin. PODProfit&apos;s multi-currency view shows this
          explicitly.
        </p>

        <h3>4. Listing renewal fees</h3>
        <p>
          Etsy charges $0.20 every 4 months per listing whether or not it
          sold. With 200 listings, that&apos;s $40 every 4 months ($120/year)
          before you sell anything. Cull dead listings.
        </p>

        <h2>How to calculate it for your specific listing</h2>
        <p>
          <Link href="/">Open the calculator</Link>, set marketplace =
          &quot;Etsy&quot;, and the four fees above are itemized in the
          breakdown. Toggle the &quot;Include Etsy offsite ads (12%)&quot;
          checkbox to see the worst-case scenario before you list.
        </p>

        <hr />

        <p className="text-sm text-stone-500 dark:text-stone-400">
          Read next:{" "}
          <Link href="/blog/how-to-price-print-on-demand-products">
            How to price print-on-demand products (2026 strategy guide)
          </Link>
        </p>
      </article>
    </main>
  );
}
