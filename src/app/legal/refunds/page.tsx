import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "PODProfit refund terms — clear, fair, and aligned with our Terms of Service.",
};

export default function RefundsPage() {
  return (
    <article>
      <h1>Refund Policy</h1>
      <p>
        <em>Last updated: 2026-05-11 · Version: 1.2</em>
      </p>

      <p>
        This page summarises our refund terms in plain language. The legally
        binding version lives in our{" "}
        <Link href="/legal/terms">Terms of Service</Link>, Section 7. If the two
        differ, the Terms of Service control. We treat refund requests in good
        faith and respond within <strong>3 business days</strong> (no later than
        7 business days during heavy launch periods).
      </p>

      <h2>Lifetime ($149)</h2>
      <p>
        Refundable within <strong>7 days of purchase</strong>, on the combined
        conditions that:
      </p>
      <ul>
        <li>
          The calculator has been launched <strong>zero times</strong> from your
          account (we verify with our server-side access logs), and
        </li>
        <li>You provide the order receipt.</li>
      </ul>
      <p>
        After either condition fails, Lifetime is non-refundable. When a Lifetime
        seat is refunded, it returns to the public pool and becomes available
        for the next customer.
      </p>

      <h2>Pro Monthly ($9 / month)</h2>
      <p>
        Cancelling stops future billing; we do not pro-rate the current period.
        We do not provide refunds for partial months unless the cancellation is
        the result of a billing error on our side.
      </p>

      <h2>Pro Annual ($79 / year)</h2>
      <p>
        Full refund within <strong>14 days of purchase</strong>, no questions
        asked. After 14 days, the annual plan is non-refundable but remains
        active until the year is up.
      </p>

      <h2>Excel Template ($19) and Benchmark Report ($29)</h2>
      <p>
        These two digital downloads are <strong>not yet on sale</strong>{" "}
        (planned launches 2026-07-23 and 2026-08-20 respectively). The
        refund posture below is the policy that will apply once the
        products are available; the payment processor and seller-of-record
        arrangement (if any) for each product will be confirmed in a Terms
        revision published before each launch.
      </p>
      <p>
        Once on sale, digital downloads are, in general,{" "}
        <strong>non-refundable</strong> once the download link has been
        delivered. Narrow exceptions:
      </p>
      <ul>
        <li>
          <strong>Duplicate charge</strong> — refunded automatically within{" "}
          <strong>1 business day</strong> of detection.
        </li>
        <li>
          <strong>Zero downloads</strong> — if the download link has been
          delivered and you can demonstrate it was never used (server-side log
          shows zero downloads), we will consider a refund within 14 days of
          purchase at our discretion.
        </li>
        <li>
          <strong>Material defect</strong> — if the file is corrupted or
          substantially fails to match the published description, we will repair
          or refund.
        </li>
      </ul>

      <h2>EU / UK consumers — 14-day right of withdrawal</h2>
      <p>
        Under the EU Consumer Rights Directive (2011/83/EU, Art. 16(m)) and
        equivalent UK regulations, EU and UK consumers normally have a 14-day
        right of withdrawal for digital purchases. By completing checkout for
        any digital download (Excel Template, Benchmark Report) and obtaining
        immediate access to the file,{" "}
        <strong>
          you expressly consent to begin performance immediately and acknowledge
          that you lose the 14-day right of withdrawal once download is enabled.
        </strong>{" "}
        The narrow refund exceptions above still apply. (Note: the Excel
        Template and Benchmark Report are not yet on sale; the
        consent-collection flow at checkout will be described in a Terms
        revision published before each launch.)
      </p>
      <p>
        For Lifetime ($149), Pro Monthly ($9), and Pro Annual ($79), the right
        of withdrawal applies under the conditions described in their
        respective sections above.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <code>hello@getpodprofit.com</code> with the email address
        associated with your purchase and a brief reason (optional but
        appreciated for product feedback). Lifetime, Pro Monthly, and Pro
        Annual purchases are processed via Stripe.
      </p>

      <h2>Chargebacks</h2>
      <p>
        If you initiate a chargeback before contacting us, we may suspend your
        account pending resolution. Please email us first — we&apos;d rather
        refund you cleanly than fight a dispute.
      </p>

      <h2>Trademarks</h2>
      <p>
        PODProfit is not affiliated with, endorsed by, or sponsored by Etsy,
        Shopify, Printful, Printify, or Stripe. All third-party names and
        logos are property of their respective owners.
      </p>
    </article>
  );
}
