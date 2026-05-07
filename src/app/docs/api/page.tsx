import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public API — calculate POD profit programmatically",
  description:
    "Free public JSON API for POD profit calculation. No auth, CORS open, runs at the Edge. Use it from your store, your spreadsheet, or your own tooling.",
  alternates: { canonical: "https://getpodprofit.com/docs/api" },
};

export default function ApiDocsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      <article className="prose prose-stone max-w-none dark:prose-invert">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          PODProfit API · v1 · No authentication required
        </p>

        <h1>Public API</h1>

        <p>
          Calculate POD profit programmatically. Free, no auth, CORS open. Use
          it from your store, your sheet, your bot, or your own tool.
        </p>

        <h2>Endpoint</h2>
        <pre>
          <code>GET https://getpodprofit.com/api/v1/calculate</code>
        </pre>

        <h2>Discovery (call with no params)</h2>
        <pre>
          <code>{`curl "https://getpodprofit.com/api/v1/calculate"

# Returns:
# {
#   "version": "1.0",
#   "endpoints": { ... },
#   "products": [{ "id": "printful-bella-canvas-3001-tee-white-m", ... }],
#   "marketplaces": ["etsy", "shopify", "amazon-merch", "printify-pop-up", "manual"],
#   "regions": ["US", "EU", "UK", "CA", "AU"],
#   "currencies": ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]
# }`}</code>
        </pre>

        <h2>Calculate</h2>
        <pre>
          <code>{`curl "https://getpodprofit.com/api/v1/calculate?\\
product=printful-bella-canvas-3001-tee-white-m&\\
vendor=printful&\\
marketplace=etsy&\\
region=US&\\
currency=USD&\\
retail=24.00&\\
ads=false"

# Returns:
# {
#   "input": { ... echo of params ... },
#   "output": {
#     "retailPriceCents": 2400,
#     "vendorBaseCostCents": 1295,
#     "vendorShippingCents": 499,
#     "marketplaceListingFeeCents": 20,
#     "marketplaceTransactionFeeCents": 156,
#     "marketplacePerTransactionFeeCents": 25,
#     "paymentProcessingFeeCents": 72,
#     "offsiteAdsFeeCents": 0,
#     "totalCostsCents": 2067,
#     "netProfitCents": 333,
#     "marginPercent": 13.875,
#     "meta": {
#       "productSourceUrl": "https://www.printful.com/custom-products",
#       "productAsOfDate": "2026-04-28",
#       "fxAsOfDate": "2026-04-30",
#       "calculatedAt": "2026-05-..."
#     }
#   }
# }`}</code>
        </pre>

        <h2>Parameters</h2>
        <table>
          <thead>
            <tr>
              <th>Param</th>
              <th>Type</th>
              <th>Required</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>product</code>
              </td>
              <td>string</td>
              <td>yes</td>
              <td>Product ID. List from discovery call.</td>
            </tr>
            <tr>
              <td>
                <code>vendor</code>
              </td>
              <td>enum</td>
              <td>yes</td>
              <td>
                <code>printful</code> | <code>printify</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>marketplace</code>
              </td>
              <td>enum</td>
              <td>yes</td>
              <td>
                <code>etsy</code> | <code>shopify</code> | <code>amazon-merch</code> |{" "}
                <code>printify-pop-up</code> | <code>manual</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>region</code>
              </td>
              <td>enum</td>
              <td>yes</td>
              <td>
                <code>US</code> | <code>EU</code> | <code>UK</code> | <code>CA</code> |{" "}
                <code>AU</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>currency</code>
              </td>
              <td>enum</td>
              <td>yes</td>
              <td>
                <code>USD</code> | <code>EUR</code> | <code>GBP</code> | <code>CAD</code> |{" "}
                <code>AUD</code> | <code>JPY</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>retail</code>
              </td>
              <td>number</td>
              <td>yes</td>
              <td>Retail price in display currency. e.g. <code>24.00</code> or <code>3600</code> for JPY.</td>
            </tr>
            <tr>
              <td>
                <code>ads</code>
              </td>
              <td>boolean</td>
              <td>no</td>
              <td>Include Etsy offsite ads (12%). Default <code>false</code>.</td>
            </tr>
          </tbody>
        </table>

        <h2>Rate limits</h2>
        <p>
          None today (Cloudflare DDoS protection only). If you build a public
          tool that hammers this endpoint, please cache responses for at least
          1 hour — vendor prices update at most monthly.
        </p>

        <h2>Reliability &amp; data freshness</h2>
        <p>
          Pure-TS calculation logic, runs at the Vercel Edge. Vendor base
          costs and shipping are static YAML in the repo (manually verified
          monthly, machine-verified via GitHub Actions). FX rates are static
          mid-market snapshots (not live). For trading-grade precision, do
          your own conversion against your bank rate.
        </p>

        <h2>Source code</h2>
        <p>
          All calculation logic is open source under MIT:{" "}
          <a href="https://github.com/SATSUKI/podprofit/blob/main/src/lib/calculator/calculate-profit.ts">
            calculate-profit.ts
          </a>
          . Found a bug? Open an issue or DM{" "}
          <a href="mailto:hello@getpodprofit.com">Satsuki Okazaki</a>.
        </p>

        <h2>Contact</h2>
        <p>
          API questions: <code>hello@getpodprofit.com</code>. Want a feature in
          v2 (more vendors, custom marketplace fees, batch endpoint)? Reply on{" "}
          <a href="mailto:hello@getpodprofit.com">Satsuki Okazaki</a> with what
          you&apos;re building.
        </p>
      </article>
    </main>
  );
}
