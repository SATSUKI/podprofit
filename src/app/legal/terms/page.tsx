import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "PODProfit Terms of Service. Last updated 2026-05-03.",
};

export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p>
        <em>Last updated: 2026-05-03 · Version: 1.0 (template; lawyer review deferred until MRR &gt; $3K).</em>
      </p>

      <h2>1. Who we are</h2>
      <p>
        PODProfit (&quot;PODProfit&quot;, &quot;we&quot;, &quot;us&quot;) is a software-as-a-service product
        operated by Satsuki Okazaki, an individual sole proprietor based in Tokyo, Japan, contactable
        at <code>legal@getpodprofit.com</code>. The service is provided through{" "}
        <a href="https://getpodprofit.com">getpodprofit.com</a>.
      </p>

      <h2>2. Service definition</h2>
      <p>
        PODProfit is a calculator that helps Print-on-Demand sellers estimate net profit on listings,
        based on vendor list prices, marketplace fees, and currency conversion. It is an{" "}
        <strong>informational tool</strong>, not a financial, accounting, or tax advisory service.
      </p>

      <h2>3. Accounts &amp; eligibility</h2>
      <p>
        The free calculator can be used without an account. Pro and Lifetime plans require an account.
        You must be at least 13 years old. You may not register more than one account per person, and
        you may not provide false information.
      </p>

      <h2>4. License</h2>
      <p>
        We grant you a non-exclusive, non-transferable, revocable license to access and use the service
        in accordance with these Terms and your active plan.
      </p>
      <ul>
        <li><strong>Free</strong>: full calculator, share-able URLs, no account required.</li>
        <li><strong>Pro Monthly / Annual</strong>: saved calculations, exports, support.</li>
        <li><strong>Lifetime</strong>: limited to the first 100 customers; one-time payment grants permanent
          access to current and future Pro features.</li>
      </ul>

      <h2>5. Calculation accuracy disclaimer (important)</h2>
      <p>
        Calculations are based on <em>vendor list prices</em> from public catalogs and{" "}
        <em>standard marketplace fees</em>, captured on the &quot;as of&quot; date displayed in the UI.
        We do <strong>not</strong> reflect Printful Plus/Pro or Printify Premium subscription discounts,
        promotional pricing, regional VAT/GST nuances, or seller-specific fee tiers (e.g., Etsy Star
        Seller benefits).
      </p>
      <p>
        Calculations are estimates only. Always verify against your vendor and marketplace dashboards
        before listing or repricing. We disclaim liability for losses resulting from reliance on
        calculation outputs.
      </p>

      <h2>6. Third-party data</h2>
      <p>
        Vendor prices are sourced from Printful and Printify public catalogs. Source URLs and as-of dates
        are displayed in the UI. We do not redistribute vendor data outside the calculator UI / API.
      </p>

      <h2>7. Prohibited uses</h2>
      <ul>
        <li>Reverse-engineering or scraping the service beyond ordinary use</li>
        <li>Reselling access without our written permission</li>
        <li>Automating the service to harm vendor or marketplace systems</li>
        <li>Using the service for any unlawful purpose</li>
      </ul>

      <h2>8. Intellectual property</h2>
      <p>
        The PODProfit name, logo, codebase, and content are owned by us. The source code is published
        under the MIT License at <a href="https://github.com/SATSUKI/podprofit">github.com/SATSUKI/podprofit</a>.
        Your inputs (the data you enter into the calculator) remain yours; we do not claim ownership.
      </p>

      <h2>9. Cancellation &amp; termination</h2>
      <p>
        Monthly plans cancel at the end of the current billing cycle. Annual plans are non-cancellable
        for the year (refunds within 14 days; see <a href="/legal/refunds">Refund Policy</a>). Lifetime
        is non-cancellable; refunds within 14 days. We may suspend or terminate accounts that violate
        these Terms.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, our total liability for any claim arising out of these
        Terms or the service is limited to the amount you have paid us in the 12 months preceding the
        claim. We are not liable for indirect, incidental, special, consequential, or punitive damages.
      </p>

      <h2>11. Lifetime cap commitment</h2>
      <p>
        We commit to honor Lifetime access for the first 100 customers as a permanent license to the
        Pro feature set, including features added after purchase (Phase 2 and beyond). If a Lifetime
        customer is refunded, the seat may be reclaimed by the next purchaser.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of Japan. Disputes arising from these Terms shall be
        submitted to the exclusive jurisdiction of the Tokyo District Court.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be notified at least 30 days
        in advance via email (for accounts) and via the website footer. Continued use after the change
        constitutes acceptance.
      </p>

      <h2>14. Contact</h2>
      <p>
        Legal inquiries: <code>legal@getpodprofit.com</code><br />
        General contact: <code>hello@getpodprofit.com</code>
      </p>
    </article>
  );
}
