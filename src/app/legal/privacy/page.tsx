import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "v0.1 baseline of the PODProfit Privacy Policy, published in time for the public launch of getpodprofit.com on 2026-06-09.",
  alternates: {
    canonical: "/legal/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: 2026-06-09 · Version 0.1</em>
      </p>

      <p>
        <strong>Effective date</strong>: 2026-06-09
        <br />
        <strong>Version</strong>: 0.1 (initial pre-launch publication)
        <br />
        <strong>Operator</strong>: Satsuki Okazaki (sole proprietor), 8F MIEUX Shibuya Building,
        5-3 Maruyama-cho, Shibuya-ku, Tokyo 150-0044, Japan
        <br />
        <strong>Contact</strong>: hello@getpodprofit.com
      </p>

      <blockquote>
        <p>
          <strong>About this version</strong>: This is the v0.1 baseline published in time for the
          public launch of getpodprofit.com on 2026-06-09. It will be updated to v1.0 before the
          Excel Template launch on 2026-07-23 to incorporate any feedback from external counsel and
          to expand AI-related disclosures. We will notify existing accounts by email of material
          changes.
        </p>
      </blockquote>

      <hr />

      <h2 id="section-1">1. Who we are</h2>
      <p>
        PODProfit is operated by Satsuki Okazaki, an individual sole proprietor based in Tokyo,
        Japan. We provide an estimation calculator and related content for sellers who use
        Print-on-Demand (POD) marketplaces and fulfilment services.
      </p>
      <p>
        For all privacy questions, requests, and complaints, please email{" "}
        <strong>hello@getpodprofit.com</strong>. We will acknowledge receipt within 3 business days
        and respond substantively within 30 days.
      </p>
      <p>This Privacy Policy applies to:</p>
      <ul>
        <li>
          The website <strong>getpodprofit.com</strong> (calculator, blog, public API, marketing
          pages)
        </li>
        <li>Paid plans purchased through our checkout (Stripe)</li>
        <li>
          Digital products sold via Lemon Squeezy as Merchant of Record (Excel Template, Benchmark
          Report PDF — scheduled launch 2026-07-23 and 2026-08-20 respectively)
        </li>
        <li>Email subscriptions delivered via Buttondown</li>
      </ul>

      <hr />

      <h2 id="section-2">2. Information we collect</h2>
      <p>
        We follow a &quot;collect the minimum needed&quot; principle. The categories below are
        exhaustive — we do not maintain hidden data stores.
      </p>

      <h3>2.1 Account information</h3>
      <p>When you create a Pro or Lifetime account:</p>
      <ul>
        <li>Email address</li>
        <li>
          Hashed password (we never see your plaintext password — Supabase Auth uses bcrypt)
        </li>
        <li>Magic link / Google OAuth identifier (depending on sign-in method you choose)</li>
        <li>Timestamp of account creation and last login</li>
      </ul>

      <h3>2.2 Calculator inputs (privacy by design)</h3>
      <p>
        The numbers you type into the calculator (vendor cost, marketplace fees, retail price, etc.)
        are <strong>not stored on our servers</strong> by default. They live only in your browser
        and are discarded when you close the tab.
      </p>
      <p>
        If you actively choose to save a calculation (Pro feature) or to generate a share link, the
        relevant input set is stored against your account or as a short hashed identifier in our
        database. You can delete saved calculations and revoke share links at any time.
      </p>

      <h3>2.3 Share-link metadata</h3>
      <p>
        When you generate a share link, we store only the short hash and the calculation payload
        necessary to render the shared view. We do not associate share links with the recipient.
      </p>

      <h3>2.4 Payment information</h3>
      <p>We do not see or store full card details.</p>
      <ul>
        <li>
          <strong>Stripe</strong> processes payments for getpodprofit.com plans (Lifetime $149, Pro
          $9/month). We receive the metadata Stripe shares with us: card brand, last 4 digits,
          billing country, Stripe customer ID, and amount/currency.
        </li>
        <li>
          <strong>Lemon Squeezy</strong> acts as Merchant of Record (MoR) for our digital downloads
          (Excel Template, Benchmark Report). For those purchases the customer-facing data
          controller is Lemon Squeezy; we receive only the order confirmation, email, and a redacted
          billing summary necessary to grant access and provide support.
        </li>
      </ul>

      <h3>2.5 Email subscribers (lead magnet, newsletter)</h3>
      <p>
        When you opt in to a lead magnet or our newsletter, <strong>Buttondown</strong> stores your
        email address and engagement metadata (open/click events). You can unsubscribe at any time
        using the link in every email.
      </p>

      <h3>2.6 Web analytics</h3>
      <p>
        We use <strong>Cloudflare Web Analytics</strong>, which is cookieless and does not
        fingerprint visitors. Aggregate traffic data (page views, referrer, country) is collected
        without individual identification. We do not use Google Analytics, Meta Pixel, or any
        third-party advertising tracker.
      </p>

      <h3>2.7 Server logs and security telemetry</h3>
      <p>
        Standard HTTP request logs (IP address, user-agent, path, response status, timestamp) are
        retained for <strong>14 days</strong> for debugging and abuse prevention, then deleted.
      </p>

      <h3>2.8 Customer-support correspondence</h3>
      <p>
        When you email us, we retain the message thread (sender, subject, body, attachments) for as
        long as needed to handle the issue and to maintain a service-quality history (typically up
        to 24 months).
      </p>

      <hr />

      <h2 id="section-3">3. What we do NOT collect</h2>
      <p>To remove ambiguity:</p>
      <ul>
        <li>No tracking cookies, advertising cookies, or third-party trackers</li>
        <li>No advertising IDs (IDFA, AAID, etc.)</li>
        <li>
          No marketplace credentials (we never ask for your Etsy/Shopify/Printful/Printify login)
        </li>
        <li>No live access to your sales data, orders, payouts, or bank accounts</li>
        <li>No precise geolocation</li>
        <li>No biometric data</li>
        <li>
          No special-category data (race, religion, health, political opinions, etc.)
        </li>
      </ul>

      <hr />

      <h2 id="section-4">4. Why we collect each item (legal bases)</h2>
      <p>For users in the EU/UK we rely on the following legal bases under GDPR Art. 6:</p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Data</th>
              <th>Legal basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Authentication, account management</td>
              <td>Account info</td>
              <td>Contract (Art. 6(1)(b))</td>
            </tr>
            <tr>
              <td>Provision of save/share features</td>
              <td>Calculator inputs (opt-in)</td>
              <td>Contract</td>
            </tr>
            <tr>
              <td>Payment processing, fraud prevention</td>
              <td>Stripe / Lemon Squeezy metadata</td>
              <td>Contract + legal obligation (tax law)</td>
            </tr>
            <tr>
              <td>Newsletter and lead magnet delivery</td>
              <td>Email + engagement</td>
              <td>Consent (Art. 6(1)(a))</td>
            </tr>
            <tr>
              <td>Aggregate analytics</td>
              <td>Cloudflare Web Analytics data</td>
              <td>Legitimate interest (Art. 6(1)(f)) — minimal, no individual ID</td>
            </tr>
            <tr>
              <td>Security, fraud, abuse prevention</td>
              <td>Server logs</td>
              <td>Legitimate interest</td>
            </tr>
            <tr>
              <td>Customer support</td>
              <td>Email correspondence</td>
              <td>Contract / legitimate interest</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        For users in California we rely on the corresponding &quot;business purposes&quot; under the
        CCPA/CPRA. For users in Japan we comply with the Act on the Protection of Personal
        Information (APPI), including Article 28 on cross-border transfers.
      </p>

      <hr />

      <h2 id="section-5">5. Sub-processors</h2>
      <p>
        The following third parties process personal data on our behalf. All have contractual
        data-processing terms (DPA / SCC) in place.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>Sub-processor</th>
              <th>Location</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel Inc.</td>
              <td>United States</td>
              <td>Application hosting</td>
            </tr>
            <tr>
              <td>Cloudflare, Inc.</td>
              <td>United States</td>
              <td>DNS, CDN, Workers, cookieless web analytics</td>
            </tr>
            <tr>
              <td>Supabase Inc.</td>
              <td>United States</td>
              <td>Database, authentication</td>
            </tr>
            <tr>
              <td>Stripe, Inc.</td>
              <td>United States</td>
              <td>Payment processing for getpodprofit.com plans</td>
            </tr>
            <tr>
              <td>Lemon Squeezy, LLC</td>
              <td>United States</td>
              <td>Merchant of Record for digital products (Excel, Report)</td>
            </tr>
            <tr>
              <td>Buttondown, LLC</td>
              <td>United States</td>
              <td>Email newsletter delivery</td>
            </tr>
            <tr>
              <td>Anthropic, PBC</td>
              <td>United States</td>
              <td>
                AI-assisted drafting of customer-support replies (planned to go live approximately
                2026-06-23, pending post-launch evaluation of demand and quality criteria)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        We update this list when we add or replace a sub-processor. Material changes are announced
        on this page and, where required, by email to active accounts.
      </p>

      <h3>5.1 AI-assisted customer support (Anthropic)</h3>
      <p>
        We use Anthropic&apos;s Claude API to assist with drafting customer-support responses. When
        you contact us, the contents of your inquiry (including your email body and any quoted
        attachments you provide as text) may be transmitted to Anthropic for processing as our data
        sub-processor. Anthropic acts under our instructions and{" "}
        <strong>does not train its models on the data we send through the API</strong>, per
        Anthropic&apos;s Commercial Terms of Service.
      </p>
      <p>
        A human (the founder) reviews and edits every AI-assisted draft before it is sent. AI is
        never used to make automated decisions that produce legal effects on you.
      </p>
      <p>
        <strong>Please do not include sensitive personal data</strong> such as government
        identification numbers, payment card numbers, account passwords, or health information in
        support emails. If you must share such information, contact us first and we will arrange a
        secure channel.
      </p>

      <hr />

      <h2 id="section-6">6. International data transfers</h2>
      <p>
        Our sub-processors are predominantly located in the United States. For personal data
        originating in the EU/UK, transfers are made under the European Commission&apos;s{" "}
        <strong>Standard Contractual Clauses (SCCs)</strong> (GDPR Art. 46(2)(c)), supplemented by
        the additional safeguards each sub-processor publishes (encryption in transit and at rest,
        access logging, sub-processor restrictions). For data originating in Japan, transfers comply
        with <strong>APPI Article 28</strong> (consent-based and equivalent-standards-based
        transfers).
      </p>
      <p>
        You may request a copy of the SCCs that apply to your data by emailing
        hello@getpodprofit.com.
      </p>

      <hr />

      <h2 id="section-7">7. Your rights</h2>

      <h3>7.1 EU/UK residents (GDPR / UK GDPR)</h3>
      <p>You have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> — obtain a copy of the personal data we hold about you (Art. 15)
        </li>
        <li>
          <strong>Rectification</strong> — correct inaccurate or incomplete data (Art. 16)
        </li>
        <li>
          <strong>Erasure (&quot;right to be forgotten&quot;)</strong> — request deletion of your
          account and data (Art. 17). We complete erasure within <strong>30 days</strong> of a
          verified request.
        </li>
        <li>
          <strong>Restriction</strong> — limit how we process your data in certain circumstances
          (Art. 18)
        </li>
        <li>
          <strong>Portability</strong> — receive your data in a structured, machine-readable format
          (Art. 20)
        </li>
        <li>
          <strong>Object</strong> — object to processing based on legitimate interest (Art. 21)
        </li>
        <li>
          <strong>Withdraw consent</strong> — for any processing based on consent, at any time
        </li>
        <li>
          <strong>Complaint</strong> — lodge a complaint with your national data-protection
          authority (the list is published by the European Commission). UK residents may complain to
          the ICO.
        </li>
      </ul>
      <p>
        To exercise any right, email <strong>hello@getpodprofit.com</strong> with the subject line
        &quot;Privacy Request&quot;. We will verify your identity (typically by confirming control
        of the account email) and respond within 30 days.
      </p>

      <h3>7.2 California residents (CCPA / CPRA)</h3>
      <p>
        You have the right to know, the right to delete, the right to correct, the right to limit
        use of sensitive personal information, and the right to opt out of the sale or sharing of
        personal information.
      </p>
      <p>
        <strong>We do not sell or share your personal information</strong> within the meaning of the
        CCPA/CPRA. We do not engage in cross-context behavioural advertising. The &quot;Do Not Sell
        or Share My Personal Information&quot; requirement therefore does not apply, but the
        disclosure is provided for transparency.
      </p>
      <p>
        To exercise California rights, email <strong>hello@getpodprofit.com</strong> with the
        subject line &quot;CCPA Request&quot;. We do not discriminate against users who exercise
        their rights.
      </p>

      <h3>7.3 Japan residents (APPI)</h3>
      <p>
        You may request disclosure, correction, deletion, or suspension of use of your personal
        information at any time by emailing <strong>hello@getpodprofit.com</strong>. We manage
        sub-processors as 委託先 (entrusted parties) and supervise their compliance with APPI
        obligations.
      </p>

      <hr />

      <h2 id="section-8">8. Cookies and similar technologies</h2>
      <p>
        We use only <strong>strictly necessary cookies</strong> for session management on logged-in
        pages. We do not use:
      </p>
      <ul>
        <li>Analytics cookies (our analytics provider is cookieless)</li>
        <li>Advertising cookies</li>
        <li>Third-party trackers</li>
        <li>Cross-site tracking pixels</li>
      </ul>
      <p>
        Because we do not deploy non-essential cookies, no consent banner is required under the GDPR
        ePrivacy Directive (2002/58/EC) or APPI. If we ever introduce non-essential cookies, we will
        request opt-in consent first.
      </p>

      <hr />

      <h2 id="section-9">9. Data retention</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>Data</th>
              <th>Retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account (email, plan, login metadata)</td>
              <td>
                Until you delete your account; then up to 30 days for backup recovery, after which
                it is permanently erased
              </td>
            </tr>
            <tr>
              <td>Saved calculations, share links</td>
              <td>Until you delete them, or until account deletion</td>
            </tr>
            <tr>
              <td>Stripe / Lemon Squeezy payment records</td>
              <td>7 years (Japanese tax-law requirement)</td>
            </tr>
            <tr>
              <td>Email subscribers</td>
              <td>Until you unsubscribe</td>
            </tr>
            <tr>
              <td>Server logs</td>
              <td>14 days</td>
            </tr>
            <tr>
              <td>Customer-support correspondence</td>
              <td>Up to 24 months from last activity, then deleted</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Verified erasure requests are honoured within <strong>30 days</strong>. Some records
        (notably payment records under Japanese tax law) may be retained beyond an erasure request
        only to the extent strictly required by law.
      </p>

      <hr />

      <h2 id="section-10">10. Security</h2>
      <ul>
        <li>All traffic is HTTPS-only (TLS 1.2+).</li>
        <li>
          Passwords are hashed with bcrypt (via Supabase Auth) — we never see plaintext passwords.
        </li>
        <li>Database access is restricted by Row-Level Security and least-privilege keys.</li>
        <li>
          Payment card data is fully isolated at Stripe / Lemon Squeezy (PCI-DSS Level 1
          environments).
        </li>
        <li>
          Production access keys are rotated on a documented schedule and stored in a secrets
          manager.
        </li>
      </ul>
      <p>
        No security model is infallible. If we become aware of a personal-data breach, we will
        notify affected users <strong>without undue delay and within 72 hours</strong> to the extent
        required by GDPR Art. 33 / 34 and APPI breach-notification rules.
      </p>

      <hr />

      <h2 id="section-11">11. Children</h2>
      <p>
        The service is <strong>not directed to children under 13</strong>, and we do not knowingly
        collect personal data from anyone under 13. If you believe a child has provided personal
        data to us, please email hello@getpodprofit.com and we will promptly delete it. This
        commitment is consistent with the United States Children&apos;s Online Privacy Protection
        Act (COPPA).
      </p>

      <hr />

      <h2 id="section-12">12. Automated decision-making and AI</h2>
      <p>
        We do not use automated decision-making (including profiling) that produces legal or
        similarly significant effects on you within the meaning of GDPR Art. 22.
      </p>
      <p>
        AI assistance in our customer-support workflow (Section 5.1) is advisory only and is
        reviewed by a human before any reply is sent. AI-generated text inside the calculator (such
        as result summaries or pricing suggestions) is informational and does not affect billing,
        account status, or access.
      </p>

      <hr />

      <h2 id="section-13">13. Third-party trademarks</h2>
      <p>
        Etsy, Shopify, Printful, Printify, Stripe, Lemon Squeezy, Buttondown, Vercel, Supabase,
        Cloudflare, and Anthropic are trademarks of their respective owners. PODProfit is an
        independent tool and is{" "}
        <strong>not affiliated with, endorsed by, or sponsored by</strong> any of these companies.
        We reference them solely under nominative fair use to identify the platforms our calculator
        supports and the providers we rely on.
      </p>

      <hr />

      <h2 id="section-14">14. Contact and complaints</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>Subject</th>
              <th>How to reach us</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                All privacy requests, GDPR / CCPA / APPI rights, breach notifications
              </td>
              <td>
                <strong>hello@getpodprofit.com</strong> (subject line: &quot;Privacy Request&quot; /
                &quot;CCPA Request&quot;)
              </td>
            </tr>
            <tr>
              <td>Postal address</td>
              <td>
                Satsuki Okazaki, 8F MIEUX Shibuya Building, 5-3 Maruyama-cho, Shibuya-ku, Tokyo
                150-0044, Japan
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        EU residents may also lodge a complaint with their national data-protection authority. UK
        residents may contact the Information Commissioner&apos;s Office (ICO). Japanese residents
        may contact the Personal Information Protection Commission (PPC).
      </p>

      <hr />

      <h2 id="section-15">15. Changes to this Policy</h2>
      <p>
        Material changes will be announced on this page with a new effective date and, for changes
        that affect existing users&apos; rights, by email to active accounts at least{" "}
        <strong>30 days</strong> in advance. Non-material changes (clarifications, typo fixes) may
        be applied without notice. The current version is always available at
        https://getpodprofit.com/legal/privacy.
      </p>

      <hr />

      <h2 id="section-16">16. Revision history</h2>

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
                Initial pre-launch publication. Adds AI sub-processor disclosure (Anthropic), Lemon
                Squeezy MoR clarification, GDPR / CCPA / APPI explicit sections, sub-processor
                table. To be reviewed against external counsel feedback before v1.0 (target:
                2026-07-23).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}
