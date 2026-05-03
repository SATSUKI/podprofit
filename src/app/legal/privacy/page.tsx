import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "PODProfit Privacy Policy. We collect the minimum needed to provide the service.",
};

export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: 2026-05-03 · Version: 1.0</em>
      </p>

      <p>
        PODProfit is built on a &quot;collect the minimum&quot; principle. This page explains what we
        collect, why, and how we share it.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account info</strong> (Pro/Lifetime only): email address, optional display name,
          country / preferred currency.
        </li>
        <li>
          <strong>Calculation inputs</strong>: only when you choose to save or share a calculation
          (Pro feature for saving; share-link is opt-in by clicking the share button).
        </li>
        <li>
          <strong>Payment info</strong>: handled by <strong>Stripe</strong>. We never see or store
          your card details. We only see the metadata Stripe shares (last 4 digits, brand, billing
          country, Stripe customer ID).
        </li>
        <li>
          <strong>Web analytics</strong>: anonymous, cookieless analytics via Cloudflare Web Analytics
          and PostHog (no individual identification).
        </li>
        <li>
          <strong>Email subscribers</strong> (Lead Magnet sign-ups): email address only, processed by
          Buttondown.
        </li>
        <li>
          <strong>Server logs</strong>: standard request logs (IP, user-agent, path) retained 14 days
          for security and debugging.
        </li>
      </ul>

      <h2>2. What we DO NOT collect</h2>
      <ul>
        <li>Tracking cookies (no marketing cookies, no third-party trackers)</li>
        <li>Advertising IDs</li>
        <li>Your vendor or marketplace credentials (we never ask)</li>
        <li>Your bank or sales data from Etsy/Shopify/Printful/Printify</li>
      </ul>

      <h2>3. Why we collect each item</h2>
      <ul>
        <li><strong>Account info</strong>: to authenticate you and bill correctly</li>
        <li><strong>Calculations</strong>: to provide the save / share features you opted into</li>
        <li><strong>Payment info</strong>: to process payments and prevent fraud (legal obligation)</li>
        <li><strong>Analytics</strong>: to improve the product (no individual identification)</li>
        <li><strong>Email subscribers</strong>: to send you content you opted in to</li>
      </ul>

      <h2>4. Sub-processors</h2>
      <p>The third-party services that process data on our behalf:</p>
      <ul>
        <li><strong>Vercel</strong> (US): hosting</li>
        <li><strong>Supabase</strong> (US): database and authentication</li>
        <li><strong>Stripe</strong> (US): payment processing</li>
        <li><strong>Cloudflare</strong> (Global): DNS, CDN, web analytics, email routing</li>
        <li><strong>Buttondown</strong> (US): email newsletter (opt-in only)</li>
        <li><strong>PostHog Cloud</strong> (US): product analytics</li>
      </ul>

      <h2>5. International transfers</h2>
      <p>
        Most sub-processors are US-based. For EU data subjects, we rely on Standard Contractual Clauses
        (SCCs) and the relevant Data Privacy Framework adequacy decisions where applicable. For
        Japanese data subjects, transfers comply with APPI Article 28.
      </p>

      <h2>6. Your rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access</strong>: request a copy of your data (GDPR Art. 15, CCPA, APPI)</li>
        <li><strong>Delete</strong>: request deletion of your account and data</li>
        <li><strong>Export</strong>: receive your data in a portable format</li>
        <li><strong>Object</strong>: opt out of analytics or marketing</li>
      </ul>
      <p>
        Email <code>privacy@getpodprofit.com</code> for any of the above. We respond within 30 days.
      </p>

      <h2>7. Data retention</h2>
      <ul>
        <li>Account: until you delete it, plus 90 days for backup recovery</li>
        <li>Calculations: until you delete them</li>
        <li>Payment records: 7 years (legal requirement under Japanese tax law)</li>
        <li>Server logs: 14 days</li>
        <li>Email subscribers: until you unsubscribe</li>
      </ul>

      <h2>8. Cookies</h2>
      <p>
        We use only <strong>essential cookies</strong> (session management for logged-in users). We do
        not use tracking, advertising, or third-party cookies. Because we have no non-essential cookies,
        no consent banner is required under GDPR / e-Privacy / APPI.
      </p>

      <h2>9. Security</h2>
      <p>
        All traffic is HTTPS-only. Passwords are hashed (bcrypt via Supabase). Database access is
        restricted by Row-Level Security. Payment data is fully isolated at Stripe (PCI-DSS Level 1).
      </p>

      <h2>10. Children</h2>
      <p>
        The service is not directed at children under 13. We do not knowingly collect data from anyone
        under 13.
      </p>

      <h2>11. Breach notification</h2>
      <p>
        In the event of a data breach involving personal information, we will notify affected users
        within 72 hours of becoming aware, in line with GDPR Art. 33 and APPI requirements.
      </p>

      <h2>12. Contact</h2>
      <p>
        Privacy inquiries: <code>privacy@getpodprofit.com</code>
      </p>
    </article>
  );
}
