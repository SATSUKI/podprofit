import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "PODProfit refund terms (v1.3) — Lifetime 14-day cooling-off (no questions asked), Pro Monthly / Pro Annual not pro-rated, access continues to period end.",
};

export default function RefundsPage() {
  return (
    <article>
      <h1>Refund Policy</h1>
      <p>
        <em>Last updated: 2026-05-11 · Version: 1.3</em>
      </p>

      <p>
        This page summarises our refund terms in plain language. The legally
        binding version lives in our{" "}
        <Link href="/legal/terms">Terms of Service</Link>, Section 7. If the two
        differ, the Terms of Service control. We treat refund requests in good
        faith and respond within <strong>3 business days</strong> (no later than
        7 business days during heavy launch periods).
      </p>

      <p>
        <em>
          v1.3 (2026-05-11) aligns the Lifetime cooling-off period with the
          UK/EU 14-day standard and clarifies that Pro subscriptions are not
          pro-rated on cancellation. The previous &quot;7 days + zero
          launches&quot; condition for Lifetime has been dropped — calendar age
          of the purchase is now the sole eligibility gate.
        </em>
      </p>

      <h2>Lifetime ($149)</h2>
      <p>
        Refundable within <strong>14 days of purchase</strong>, full refund,
        no questions asked. After 14 days, Lifetime is non-refundable. When a
        Lifetime seat is refunded, it returns to the public pool and becomes
        available for the next customer.
      </p>
      <p>
        <em>
          The 14-day window is unconditional within the window — you may use
          the calculator during the cooling-off period without losing the right
          to a refund. This aligns with the UK Consumer Contracts (Information,
          Cancellation and Additional Charges) Regulations 2013 and the EU
          Consumer Rights Directive 2011/83/EU; we extend the same window to
          all customers regardless of jurisdiction.
        </em>
      </p>

      <h2>Pro Monthly ($9 / month)</h2>
      <p>
        Pro Monthly is a recurring subscription.{" "}
        <strong>We do not pro-rate refunds for partial months.</strong>{" "}
        Cancelling from your{" "}
        <strong>Stripe Customer Portal</strong> (linked from your account page)
        stops future billing <strong>immediately</strong>; access to Pro
        features continues until the end of the current paid billing period.
        Refunds for partial months are issued only when the cancellation is the
        result of a billing error on our side.
      </p>

      <h2>Pro Annual ($79 / year)</h2>
      <p>
        Pro Annual is a recurring annual subscription.{" "}
        <strong>We do not pro-rate refunds for partial years.</strong>{" "}
        Cancelling from your <strong>Stripe Customer Portal</strong> stops the
        next renewal <strong>immediately</strong>; access to Pro features
        continues until the end of the current paid year. After cancellation,
        no refund of the unused portion of the current year is issued unless
        the cancellation is the result of a billing error on our side.
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
        For <strong>Lifetime ($149)</strong>, the 14-day Lifetime refund window
        described above is offered to all customers worldwide and is fully
        consistent with the UK/EU right of withdrawal — no separate
        consent-collection step is required, and EU/UK consumers receive the
        same unconditional 14-day window as everyone else.
      </p>
      <p>
        For <strong>Pro Monthly ($9)</strong> and <strong>Pro Annual ($79)</strong>,
        the right of withdrawal applies as follows: cancellation from the
        Customer Portal stops future billing immediately; access continues
        until the end of the paid period; we do not pro-rate the current
        period. Subscriptions are continuous-supply digital services, and once
        you have used the service in the current paid period, no pro-rated
        refund of that period is provided.
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
