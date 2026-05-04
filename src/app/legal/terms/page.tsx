import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "v0.1 baseline of the PODProfit Terms of Service, published for the launch of getpodprofit.com on 2026-06-09.",
  alternates: {
    canonical: "/legal/terms",
  },
};

export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p>
        <em>Last updated: 2026-06-09 · Version 0.1</em>
      </p>

      <p>
        <strong>Effective date</strong>: 2026-06-09
        <br />
        <strong>Version</strong>: 0.1 (initial pre-launch publication)
        <br />
        <strong>Operator</strong>: Satsuki Okazaki (sole proprietor), Tokyo, Japan
        <br />
        <strong>Contact</strong>: hello@getpodprofit.com
      </p>

      <blockquote>
        <p>
          <strong>About this version</strong>: This is the v0.1 baseline published for the launch of
          getpodprofit.com on 2026-06-09. It will be revised to v1.0 before the Excel Template
          launch on 2026-07-23 to incorporate external counsel review and to expand the EULA and
          refund language for Lemon Squeezy products. Material changes will be communicated by
          email at least 30 days in advance.
        </p>
      </blockquote>

      <hr />

      <h2 id="section-1">1. Who we are</h2>
      <p>
        PODProfit (&quot;PODProfit&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a
        software service operated by Satsuki Okazaki, an individual sole proprietor based in Tokyo,
        Japan. The service is provided through <strong>getpodprofit.com</strong>.
      </p>
      <p>
        You can reach us at <strong>hello@getpodprofit.com</strong> for any matter, including legal
        notices, support requests, refund requests, DMCA notices, and complaints.
      </p>

      <hr />

      <h2 id="section-2">2. Acceptance and scope</h2>
      <p>
        By accessing or using getpodprofit.com or any product or content covered by these Terms, you
        agree to be bound by these Terms. If you do not agree, do not use the service.
      </p>
      <p>These Terms cover:</p>
      <ul>
        <li>
          The website <strong>getpodprofit.com</strong>, including the free profit calculator, blog,
          and public API
        </li>
        <li>
          The <strong>Lifetime plan</strong> ($149 one-time, sold via Stripe on getpodprofit.com)
        </li>
        <li>
          The <strong>Pro Monthly plan</strong> ($9/month, sold via Stripe on getpodprofit.com)
        </li>
        <li>
          The <strong>PODProfit Excel Template</strong> (sold via Lemon Squeezy as Merchant of
          Record; planned launch 2026-07-23)
        </li>
        <li>
          The <strong>PODProfit Benchmark Report (PDF)</strong> (sold via Lemon Squeezy as Merchant
          of Record; planned launch 2026-08-20)
        </li>
      </ul>
      <p>
        Each product may have an additional EULA-style section below; in case of conflict between
        general Terms and a product-specific section, the product-specific section governs for that
        product.
      </p>

      <hr />

      <h2 id="section-3">3. Eligibility and accounts</h2>
      <p>
        You must be <strong>at least 13 years old</strong> to use the service. If you are under the
        age of majority in your jurisdiction, you confirm that a parent or legal guardian has
        reviewed these Terms on your behalf.
      </p>
      <p>
        The free calculator can be used without an account. Pro and Lifetime plans require an
        account, which you create using a magic link or Google OAuth.{" "}
        <strong>One person may hold one account.</strong> You agree not to share account
        credentials, not to create accounts using false information, and not to register multiple
        accounts to circumvent the Lifetime seat cap.
      </p>
      <p>
        You are responsible for keeping your sign-in method secure. Notify us promptly at
        hello@getpodprofit.com if you suspect unauthorised access.
      </p>

      <hr />

      <h2 id="section-4">4. The service: estimation tool, not professional advice</h2>
      <p>
        PODProfit is a calculator that helps Print-on-Demand sellers estimate net profit on
        listings, based on vendor list prices, marketplace fees, and currency conversion.
      </p>
      <p>
        <strong>PODProfit is an informational and estimation tool only.</strong> It is{" "}
        <strong>not</strong> tax advice, accounting advice, legal advice, financial advice, or
        investment advice. We do not compute VAT, sales tax, customs duties, or any tax liability.
        Vendor prices, marketplace fees, payment-processing fees, and FX rates change frequently;
        you remain solely responsible for confirming current figures with the relevant vendor,
        marketplace, and your professional advisers before making any pricing or business decision.
      </p>
      <p>
        To the maximum extent permitted by law, you assume all responsibility for decisions made on
        the basis of calculation outputs.
      </p>

      <hr />

      <h2 id="section-5">5. Plans, licences, and what&apos;s included</h2>

      <h3>5.1 Lifetime ($149, Stripe)</h3>
      <p>A one-time payment grants the named account holder permanent access to:</p>
      <ul>
        <li>
          The <strong>PODProfit calculator</strong> on getpodprofit.com (current and successor
          versions of the free + Pro feature set)
        </li>
        <li>
          The <strong>PODProfit Excel Template</strong> (when it launches via Lemon Squeezy)
        </li>
        <li>
          The <strong>PODProfit Benchmark Report PDF</strong> (when it launches via Lemon Squeezy)
        </li>
        <li>
          Future <strong>PODProfit Pro tools</strong> released under the PODProfit brand during the
          lifetime of the service
        </li>
      </ul>
      <p>
        <strong>Not included</strong> in the Lifetime plan:
      </p>
      <ul>
        <li>
          Separate brand products operated by the same founder (for example, the AIOAxis suite) and
          any future Phase 2 products published under a different brand
        </li>
        <li>
          Third-party paid integrations (vendor APIs, external services) that require separate fees
        </li>
        <li>
          Custom development, consulting, or one-on-one support beyond standard support
        </li>
      </ul>
      <p>
        The Lifetime plan is <strong>personal and non-transferable</strong> (one user per licence,
        no resale, no team accounts under a single licence). The total Lifetime supply is{" "}
        <strong>hard-capped at 100 seats</strong>, of which <strong>8 are reserved for founding
        beta testers</strong> at no charge. Once 100 seats are sold, Lifetime closes permanently and
        we do not re-open it; the seat-availability counter on the pricing page is enforced
        server-side at the time of purchase.
      </p>

      <h3>5.2 Pro Monthly ($9/month, Stripe)</h3>
      <p>
        A recurring subscription that grants access to Pro features (saved calculations, exports,
        priority support) for the named account holder for the period paid for. Cancel at any time
        from the account page; access continues until the end of the current paid period.
      </p>

      <h3>5.3 PODProfit Excel Template (Lemon Squeezy as MoR — planned 2026-07-23)</h3>
      <p>
        A downloadable Excel/Google Sheets workbook. Sold via{" "}
        <strong>Lemon Squeezy as Merchant of Record</strong>, which collects and remits applicable
        VAT, GST, and sales tax on our behalf and acts as the seller of record on the invoice.
      </p>

      <h3>5.4 PODProfit Benchmark Report PDF (Lemon Squeezy as MoR — planned 2026-08-20)</h3>
      <p>A downloadable PDF report. Same MoR arrangement as 5.3.</p>

      <h3>5.5 Free calculator and blog</h3>
      <p>
        Free to use without an account. Subject to fair-use limits to prevent abuse of our
        infrastructure.
      </p>

      <hr />

      <h2 id="section-6">6. Payment, billing, and taxes</h2>

      <h3>6.1 Stripe (Lifetime, Pro)</h3>
      <p>
        Lifetime and Pro charges are processed by <strong>Stripe</strong>. We never see or store
        full card details. Prices on getpodprofit.com are stated in <strong>USD</strong>; your card
        issuer may apply currency conversion and foreign-transaction fees outside our control.
        Stripe processing fees are absorbed by us and are not added to the displayed price.
      </p>

      <h3>6.2 Lemon Squeezy (Excel, Report)</h3>
      <p>
        Excel Template and Benchmark Report purchases are processed by{" "}
        <strong>Lemon Squeezy as Merchant of Record</strong>, which means Lemon Squeezy is the
        seller of record on your receipt and is responsible for VAT/GST/sales-tax collection and
        remittance in your jurisdiction. The customer-facing tax line on your invoice will be
        calculated by Lemon Squeezy at checkout.
      </p>

      <h3>6.3 Failed payments</h3>
      <p>
        If a Pro Monthly renewal fails, we will retry per Stripe&apos;s standard schedule. If
        recovery fails, the account will be downgraded to free until payment is restored.
      </p>

      <hr />

      <h2 id="section-7">7. Refund policy</h2>
      <p>
        Our default position is that <strong>all sales are final</strong>, with the narrow
        exceptions below. We treat refund requests in good faith and respond within{" "}
        <strong>3 business days</strong> (no later than 7 business days during heavy launch
        periods).
      </p>

      <h3>7.1 Lifetime ($149)</h3>
      <p>
        Refundable within <strong>7 days</strong> of purchase, on the combined conditions that:
      </p>
      <ul>
        <li>
          The calculator has been launched <strong>zero times</strong> from the account (server-side
          log check), and
        </li>
        <li>The order receipt is provided.</li>
      </ul>
      <p>After either condition fails, Lifetime is non-refundable.</p>

      <h3>7.2 Pro Monthly ($9/month)</h3>
      <p>
        Cancelling stops future billing; we do not pro-rate the current period. We do not provide
        refunds for partial months unless the cancellation is the result of a billing error on our
        side.
      </p>

      <h3>7.3 Excel Template / Benchmark Report (Lemon Squeezy)</h3>
      <p>
        Digital downloads are, in general, <strong>non-refundable</strong> once the download link
        has been delivered. Narrow exceptions:
      </p>
      <ul>
        <li>
          <strong>Duplicate charge</strong> — refunded automatically within{" "}
          <strong>1 business day</strong> of detection.
        </li>
        <li>
          <strong>Zero downloads</strong> — if the download link has been delivered and you can
          demonstrate it was never used (server-side log shows zero downloads), we will consider a
          refund within 14 days of purchase at our discretion.
        </li>
        <li>
          <strong>Material defect</strong> — if the file is corrupted or substantially fails to
          match the published description, we will repair or refund.
        </li>
      </ul>

      <h3>7.4 EU / UK consumers — 14-day right of withdrawal</h3>
      <p>
        Under the EU Consumer Rights Directive (2011/83/EU, Art. 16(m)) and equivalent UK
        regulations, EU and UK consumers normally have a <strong>14-day right of withdrawal</strong>{" "}
        for digital purchases. By completing checkout for any digital download (Excel Template,
        Benchmark Report) and obtaining immediate access to the file,{" "}
        <strong>
          you expressly consent to begin performance immediately and acknowledge that you lose the
          14-day right of withdrawal once download is enabled.
        </strong>{" "}
        Lemon Squeezy collects this consent on our behalf at checkout. The narrow refund exceptions
        in Section 7.3 still apply.
      </p>
      <p>
        For Lifetime ($149) and Pro Monthly ($9), the right of withdrawal applies under the
        conditions described in Section 7.1 / 7.2.
      </p>

      <hr />

      <h2 id="section-8">8. End-User Licence Agreement (Excel Template, Benchmark Report)</h2>
      <p>
        The following EULA terms apply to the Excel Template and Benchmark Report PDF in addition to
        the rest of these Terms.
      </p>
      <ol>
        <li>
          <strong>Single-user licence.</strong> The licence is granted to the individual purchaser.
          Use within an organisation requires one licence per individual user.
        </li>
        <li>
          <strong>No resale, redistribution, or sub-licensing.</strong> You may not resell,
          sub-licence, mirror, post on a file-sharing service, distribute through a marketplace, or
          otherwise redistribute the file in original or modified form.
        </li>
        <li>
          <strong>Personal modification permitted.</strong> You may modify the file for your own
          internal use (for example, adapting cell formulas to your store).{" "}
          <strong>Commercial distribution of derivative works is prohibited.</strong>
        </li>
        <li>
          <strong>Copyright preserved.</strong> All copyright, branding, and credits embedded in
          the file must be preserved when the file is used, even if internal-only.
        </li>
        <li>
          <strong>No warranty of fitness.</strong> The file is provided &quot;as is&quot; for
          estimation purposes (see Section 4 and Section 11).
        </li>
      </ol>
      <p>
        Breach of this EULA terminates the licence immediately and may give rise to civil claims
        under copyright law.
      </p>

      <hr />

      <h2 id="section-9">9. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Reverse-engineer, decompile, or scrape the service beyond ordinary use of the public UI /
          API
        </li>
        <li>
          Resell, white-label, or relabel the service or its outputs as your own product without our
          written permission
        </li>
        <li>
          Automate the service in a way that places undue load on our infrastructure or that
          violates the terms of vendor or marketplace systems
        </li>
        <li>
          Use the service for any unlawful purpose, to facilitate fraud, or to infringe third-party
          rights
        </li>
        <li>Attempt to bypass the Lifetime 100-seat cap (e.g., by creating multiple accounts)</li>
      </ul>
      <p>
        We may suspend or terminate accounts that violate these rules. We will give reasonable
        notice where practicable, except where immediate action is necessary to protect the service,
        third parties, or to comply with law.
      </p>

      <hr />

      <h2 id="section-10">10. AI-assisted customer support</h2>
      <p>
        We use Anthropic&apos;s Claude API to assist with drafting customer-support responses (see
        our Privacy Policy, Section 5.1). Each AI-assisted draft is reviewed and edited by a human
        (the founder) before sending. AI-generated text inside the calculator (such as result
        summaries or pricing suggestions) is <strong>advisory only</strong> and should not be
        treated as professional pricing, financial, tax, or legal advice. You remain solely
        responsible for your pricing and business decisions.
      </p>
      <p>
        AI systems can produce inaccuracies. If you spot an error in a support reply or in any
        AI-generated text within the product, please tell us at hello@getpodprofit.com.
      </p>

      <hr />

      <h2 id="section-11">11. Disclaimers and limitation of liability</h2>
      <p>
        The service is provided <strong>&quot;as is&quot; and &quot;as available&quot;</strong>{" "}
        without warranties of any kind, express or implied, including without limitation implied
        warranties of merchantability, fitness for a particular purpose, accuracy, and
        non-infringement. We do not warrant that the service will be uninterrupted, error-free, or
        that calculation outputs will match any specific marketplace&apos;s actual figures at any
        given moment.
      </p>
      <p>To the maximum extent permitted by applicable law:</p>
      <ul>
        <li>
          We are not liable for indirect, incidental, special, consequential, exemplary, or punitive
          damages, including lost profits, lost revenue, lost data, or lost business opportunities.
        </li>
        <li>
          Our aggregate liability for any claim arising out of or relating to these Terms or the
          service is limited to the greater of (a) the amount you paid us in the 12 months preceding
          the claim, or (b) USD 100.
        </li>
      </ul>
      <p>
        Some jurisdictions do not allow certain limitations of liability; in those jurisdictions,
        our liability is limited to the maximum extent permitted by law. Nothing in these Terms
        limits liability that cannot be limited by law (for example, liability for fraud or for
        death or personal injury caused by negligence).
      </p>

      <hr />

      <h2 id="section-12">12. Intellectual property</h2>
      <p>
        The PODProfit name, logo, marketing copy, and proprietary content are owned by Satsuki
        Okazaki. The application source code is published under the <strong>MIT License</strong> at
        github.com/SATSUKI/podprofit; use of the source code is governed by that licence and not by
        these Terms.
      </p>
      <p>
        The data you enter into the calculator (the &quot;Inputs&quot;) and the calculations you
        save remain yours. We do not claim ownership and we do not use Inputs to train AI models.
      </p>

      <hr />

      <h2 id="section-13">13. Third-party trademarks and non-affiliation</h2>
      <p>
        Etsy, Shopify, Printful, Printify, Stripe, Lemon Squeezy, Buttondown, Vercel, Supabase,
        Cloudflare, Anthropic, Excel, Google Sheets, and any other third-party names referenced in
        the service are trademarks of their respective owners. PODProfit is an independent tool and
        is <strong>not affiliated with, endorsed by, or sponsored by</strong> any of these
        companies. We model their publicly published fee structures and rate cards under nominative
        fair use, solely to identify the platforms our calculator supports.
      </p>

      <hr />

      <h2 id="section-14">14. DMCA / copyright notices</h2>
      <p>
        If you believe content on getpodprofit.com infringes your copyright, please send a
        DMCA-compliant notice to <strong>hello@getpodprofit.com</strong> with the subject line
        &quot;DMCA Notice&quot;, including:
      </p>
      <ol>
        <li>Your physical or electronic signature;</li>
        <li>Identification of the copyrighted work claimed to have been infringed;</li>
        <li>The URL or other location of the allegedly infringing material;</li>
        <li>Your contact information (address, phone, email);</li>
        <li>
          A statement that you have a good-faith belief that the use is not authorised by the
          copyright owner, its agent, or the law;
        </li>
        <li>
          A statement, under penalty of perjury, that the information in the notice is accurate and
          that you are authorised to act on behalf of the owner.
        </li>
      </ol>
      <p>
        We will investigate and respond consistent with the DMCA and equivalent regimes.
        Counter-notices may be sent to the same address.
      </p>

      <hr />

      <h2 id="section-15">15. Privacy</h2>
      <p>
        Our processing of personal data is described in our{" "}
        <strong>
          <Link href="/legal/privacy">Privacy Policy</Link>
        </strong>
        , which is incorporated into these Terms by reference.
      </p>

      <hr />

      <h2 id="section-16">16. Indemnity</h2>
      <p>
        You agree to defend and indemnify us against any third-party claim arising out of (a) your
        use of the service in breach of these Terms, (b) your infringement of any third-party right,
        or (c) your violation of any applicable law. This obligation does not extend to claims
        caused by our own breach or our gross negligence.
      </p>

      <hr />

      <h2 id="section-17">17. Force majeure</h2>
      <p>
        We are not liable for failure or delay in performance caused by events beyond our reasonable
        control, including outages of upstream providers (Vercel, Cloudflare, Supabase, Stripe,
        Lemon Squeezy, Anthropic), network interruptions, natural disasters, government action, or
        labour disputes. We will use reasonable efforts to restore service.
      </p>

      <hr />

      <h2 id="section-18">18. Governing law and jurisdiction</h2>
      <p>
        These Terms are governed by the <strong>laws of Japan</strong>, without regard to its
        conflict-of-laws principles. Any dispute arising out of or relating to these Terms or the
        service shall be submitted to the{" "}
        <strong>exclusive jurisdiction of the Tokyo District Court</strong> as the court of first
        instance, except that consumers may, where applicable mandatory law so provides, bring
        proceedings in the courts of their country of residence.
      </p>

      <hr />

      <h2 id="section-19">19. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. <strong>Material changes</strong> (changes that
        meaningfully affect your rights or obligations, including changes to refund policy, fees, or
        licence scope) will be notified to active accounts by email{" "}
        <strong>at least 30 days</strong> in advance and posted on this page. Non-material changes
        (typo fixes, clarifications, sub-processor updates that do not change scope) may be applied
        without notice. Continued use of the service after a change becomes effective constitutes
        acceptance of the updated Terms.
      </p>

      <hr />

      <h2 id="section-20">20. Miscellaneous</h2>
      <ul>
        <li>
          <strong>Entire agreement.</strong> These Terms, together with the Privacy Policy and any
          product-specific EULA section, constitute the entire agreement between you and PODProfit
          regarding the service and supersede any prior agreements on the same subject.
        </li>
        <li>
          <strong>Severability.</strong> If any provision is held unenforceable, the remaining
          provisions remain in effect.
        </li>
        <li>
          <strong>No waiver.</strong> Our failure to enforce a provision is not a waiver of our
          right to enforce it later.
        </li>
        <li>
          <strong>Assignment.</strong> You may not assign these Terms without our prior written
          consent. We may assign these Terms in connection with a corporate reorganisation, merger,
          or sale of the business.
        </li>
        <li>
          <strong>Notices to us.</strong> Legal notices must be sent in writing to
          hello@getpodprofit.com with the subject line &quot;Legal Notice&quot;.
        </li>
        <li>
          <strong>Notices to you.</strong> We may send notices to the email address on your
          account.
        </li>
        <li>
          <strong>Independent contractors.</strong> Nothing in these Terms creates a partnership,
          joint venture, agency, employment, or franchise relationship.
        </li>
      </ul>

      <hr />

      <h2 id="section-21">21. Contact</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Support, refund requests, DMCA, legal notices, all other inquiries
              </td>
              <td>
                <strong>hello@getpodprofit.com</strong>
              </td>
            </tr>
            <tr>
              <td>Postal address</td>
              <td>
                Satsuki Okazaki, Tokyo, Japan (specific address provided on individual written
                request)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr />

      <h2 id="section-22">22. Revision history</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>Version</th>
              <th>Date</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0.1</td>
              <td>2026-06-09</td>
              <td>
                Initial pre-launch publication. Adds Lemon Squeezy MoR clarification, EU/UK 14-day
                right-of-withdrawal waiver language, AI-assisted CS disclosure, Lifetime scope
                clarification (includes future PODProfit Pro tools, excludes separate-brand
                products), 100-seat cap with 8 reserved seats, governing law (Japan / Tokyo District
                Court). To be reviewed against external counsel feedback before v1.0 (target:
                2026-07-23).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}
