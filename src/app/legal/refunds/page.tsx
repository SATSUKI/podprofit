import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "PODProfit refund terms — clear, fair, and standard for the SaaS industry.",
};

export default function RefundsPage() {
  return (
    <article>
      <h1>Refund Policy</h1>
      <p>
        <em>Last updated: 2026-05-03 · Version: 1.0</em>
      </p>

      <h2>Pro Monthly</h2>
      <p>
        We do not offer prorated refunds for the current month. You can cancel anytime; your access
        continues until the end of your current billing period, after which no further charges occur.
      </p>

      <h2>Pro Annual</h2>
      <p>
        Full refund within <strong>14 days of purchase</strong>, no questions asked. After 14 days, the
        annual plan is non-refundable but remains active until the year is up.
      </p>

      <h2>Lifetime</h2>
      <p>
        Full refund within <strong>14 days of purchase</strong>, no questions asked. After 14 days,
        Lifetime is non-refundable. When a Lifetime seat is refunded, it returns to the public pool and
        becomes available for the next customer.
      </p>

      <h2>Exceptional cases</h2>
      <p>
        Beyond the standard 14-day window, we may issue a full or partial refund at our discretion in
        cases such as:
      </p>
      <ul>
        <li>The service was unavailable due to our fault for an extended period</li>
        <li>Calculation errors caused by us led to a documented loss</li>
        <li>Duplicate accidental charges</li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Email <code>billing@getpodprofit.com</code> with the email address associated with your purchase
        and a brief reason (optional but appreciated for product feedback). We aim to process refunds
        within <strong>5 business days</strong>.
      </p>

      <h2>Chargebacks</h2>
      <p>
        If you initiate a chargeback before contacting us, we may suspend your account pending
        resolution. Please email us first — we&apos;d rather refund you cleanly than fight a dispute.
      </p>
    </article>
  );
}
