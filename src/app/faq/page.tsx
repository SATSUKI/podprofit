import type { Metadata } from "next";
import Link from "next/link";
import { FaqPageJsonLd } from "@/components/json-ld";

const SITE_URL = "https://getpodprofit.com";

export const metadata: Metadata = {
  title: "FAQ — PODProfit",
  description:
    "Common questions about PODProfit's calculator, Lifetime license, refunds, and AI usage.",
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/faq`,
    title: "FAQ — PODProfit",
    description:
      "26 answers on the calculator, Lifetime license, refunds, privacy, and AI usage.",
    // Re-declare image — Next does not inherit images from a parent
    // layout's openGraph when a child page sets its own block.
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "FAQ — PODProfit",
      },
    ],
  },
};

interface FaqEntry {
  /** anchor id like "q1", "q14" */
  id: string;
  /** question text (used both for display and JSON-LD) */
  q: string;
  /** plain-text answer for JSON-LD `acceptedAnswer.text` */
  plain: string;
  /** rich JSX answer rendered to the page */
  rich: React.ReactNode;
}

interface FaqCategory {
  /** stable id used for the section's `id` attribute (e.g. "calculator-usage") */
  id: string;
  title: string;
  blurb?: string;
  entries: FaqEntry[];
}

const CATEGORIES: FaqCategory[] = [
  {
    id: "calculator-usage",
    title: "Calculator usage",
    entries: [
      {
        id: "q1",
        q: "What does the PODProfit calculator actually compute?",
        plain:
          "PODProfit takes your selling price, supplier base cost (Printful / Printify), shipping, marketplace and payment fees, optional ad spend, and currency, then returns your estimated net profit per order and per SKU. SKU = Stock Keeping Unit, the unique ID for each product variant (size + color). We surface margin %, breakeven units, and the minimum price needed to hit a target margin. You can compare multiple variants side by side, so you instantly see which mug, tee, or poster combination is paying you and which one is losing money once fees and ad costs are added back.",
        rich: (
          <p>
            PODProfit takes your selling price, supplier base cost (Printful /
            Printify), shipping, marketplace and payment fees, optional ad spend,
            and currency, then returns your estimated net profit per order and per
            SKU. SKU = Stock Keeping Unit, the unique ID for each product variant
            (size + color). We surface margin %, breakeven units, and the minimum
            price needed to hit a target margin. You can compare multiple variants
            side by side, so you instantly see which mug, tee, or poster
            combination is paying you and which one is losing money once fees and
            ad costs are added back.
          </p>
        ),
      },
      {
        id: "q2",
        q: "Which marketplaces, suppliers, and currencies are supported?",
        plain:
          "On the marketplace side we model Etsy and Shopify fee structures (transaction, payment processing, listing, offsite ads, plan tiers). On the supplier side we cover Printful and Printify base costs and shipping zones. The calculator runs in USD, EUR, GBP, CAD, AUD, and JPY, with regularly refreshed FX rates so you can price in your home currency while selling in your customer's. Amazon Merch, Redbubble, Gelato, and SPOD are on our roadmap based on demand. If you need a marketplace or supplier we don't yet cover, email hello@getpodprofit.com — coverage is one of our most-requested roadmap items and we prioritize by demand.",
        rich: (
          <p>
            On the marketplace side we model Etsy and Shopify fee structures
            (transaction, payment processing, listing, offsite ads, plan tiers).
            On the supplier side we cover Printful and Printify base costs and
            shipping zones. The calculator runs in USD, EUR, GBP, CAD, AUD, and
            JPY, with regularly refreshed FX rates so you can price in your home
            currency while selling in your customer&apos;s. Amazon Merch,
            Redbubble, Gelato, and SPOD are on our roadmap based on demand. If you
            need a marketplace or supplier we don&apos;t yet cover, email{" "}
            <a href="mailto:hello@getpodprofit.com" className="underline">
              hello@getpodprofit.com
            </a>{" "}
            — coverage is one of our most-requested roadmap items and we
            prioritize by demand.
          </p>
        ),
      },
      {
        id: "q3",
        q: "How accurate are the results, and what should I double-check?",
        plain:
          "The calculator is as accurate as the inputs you give it. Marketplace fees, payment processor rates, and supplier base costs are manually verified at launch and re-checked monthly (automated change detection rolls out post-launch). There are scenarios we cannot see from the outside: store-specific Etsy Plus or Shopify plan discounts, Printful / Printify membership discounts, regional VAT or sales tax, customs duties, and promotional fee waivers. We do not compute VAT, sales tax, or customs liability — these vary by jurisdiction and seller status, and you should always confirm them with a qualified tax professional. Treat the output as a tight estimate, not a bookkeeping figure.",
        rich: (
          <p>
            The calculator is as accurate as the inputs you give it. Marketplace
            fees, payment processor rates, and supplier base costs are{" "}
            <strong>manually verified at launch and re-checked monthly</strong>{" "}
            (automated change detection rolls out post-launch). There are
            scenarios we cannot see from the outside: store-specific Etsy Plus or
            Shopify plan discounts, Printful / Printify membership discounts,
            regional VAT or sales tax, customs duties, and promotional fee
            waivers.{" "}
            <strong>
              We do not compute VAT, sales tax, or customs liability — these vary
              by jurisdiction and seller status, and you should always confirm
              them with a qualified tax professional.
            </strong>{" "}
            Treat the output as a tight estimate, not a bookkeeping figure.
          </p>
        ),
      },
      {
        id: "q4",
        q: "How confident should I be in the results, and how often is fee data updated?",
        plain:
          "Fee tables are manually verified at launch (2026-06-09) and re-checked monthly against published Etsy / Shopify / Printful / Printify rate cards. Confidence is highest for base fees and supplier costs (deterministic, public), medium for FX (refreshed regularly but not tick-by-tick), and lower for advertising costs (you supply the input). The underlying calculation math is fully deterministic — no AI in the calculation path. If you spot a wrong number, please report it (see Q12) and we will confirm and patch on a best-effort basis within 1 business day (JST, Mon–Fri).",
        rich: (
          <p>
            Fee tables are{" "}
            <strong>
              manually verified at launch (2026-06-09) and re-checked monthly
            </strong>{" "}
            against published Etsy / Shopify / Printful / Printify rate cards.
            Confidence is highest for base fees and supplier costs (deterministic,
            public), medium for FX (refreshed regularly but not tick-by-tick), and
            lower for advertising costs (you supply the input). The underlying
            calculation math is fully deterministic — no AI in the calculation
            path. If you spot a wrong number, please report it (see{" "}
            <Link href="#q12" className="underline">
              Q12
            </Link>
            ) and we will confirm and patch on a best-effort basis within 1
            business day (JST, Mon–Fri).
          </p>
        ),
      },
      {
        id: "q5",
        q: "Are there any usage limits on the free tier?",
        plain:
          "Yes — the free tier has two separate daily limits depending on how you use the calculator: Web calculator: 50 calculations/day per browser (counted per browser session; clearing storage resets the count). Public API (POST /api/v1/calculate): 100 requests/day per IP (no API key required). These two limits are independent: web UI usage does not consume API quota, and vice versa. Sign up for higher limits — Pro ($9/month) and Lifetime ($149) accounts have no daily limit on either path. If you hit the free limit and need more headroom for a one-off batch (e.g. importing 200 SKUs), email hello@getpodprofit.com and we'll usually grant a temporary increase.",
        rich: (
          <>
            <p>
              Yes — the free tier has two separate daily limits depending on how
              you use the calculator:
            </p>
            <ul>
              <li>
                <strong>Web calculator</strong>: 50 calculations/day per browser
                (counted per browser session; clearing storage resets the count).
              </li>
              <li>
                <strong>Public API</strong> (
                <code>POST /api/v1/calculate</code>): 100 requests/day per IP (no
                API key required).
              </li>
            </ul>
            <p>
              These two limits are independent: web UI usage does not consume API
              quota, and vice versa.{" "}
              <strong>
                Sign up for higher limits — Pro ($9/month) and Lifetime ($149)
                accounts have no daily limit on either path.
              </strong>{" "}
              If you hit the free limit and need more headroom for a one-off batch
              (e.g. importing 200 SKUs), email{" "}
              <a href="mailto:hello@getpodprofit.com" className="underline">
                hello@getpodprofit.com
              </a>{" "}
              and we&apos;ll usually grant a temporary increase.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "lifetime-license",
    title: "Lifetime license",
    entries: [
      {
        id: "q6",
        q: "What exactly do I get with the Lifetime license?",
        plain:
          "Lifetime is a one-time payment of $149 USD (processed by Stripe, our payment processor for the core product) that unlocks every current Pro feature with no recurring billing. It is capped at 100 seats — once those are sold, the offer closes permanently and only the monthly Pro plan ($9/month, also via Stripe) remains. Lifetime includes saved presets, batch SKU comparison, CSV export, multi-currency, priority email support, and every future Pro Tool we ship for the lifetime of this product. The Excel Template (releasing 2026-07-23) and the Quarterly Benchmark Report PDF (releasing 2026-08-20) are included at no extra cost.",
        rich: (
          <p>
            Lifetime is a one-time payment of <strong>$149 USD</strong> (processed
            by <strong>Stripe</strong>, our payment processor for the core
            product) that unlocks every current Pro feature with no recurring
            billing. It is capped at 100 seats — once those are sold, the offer
            closes permanently and only the monthly Pro plan ($9/month, also via
            Stripe) remains. Lifetime includes saved presets, batch SKU
            comparison, CSV export, multi-currency, priority email support, and
            every future Pro Tool we ship for the lifetime of this product. The
            Excel Template (releasing 2026-07-23) and the Quarterly Benchmark
            Report PDF (releasing 2026-08-20) are included at no extra cost.
          </p>
        ),
      },
      {
        id: "q7",
        q: "What does \"Future Pro Tools included forever\" actually cover, and what doesn't it cover?",
        plain:
          "\"Forever\" means the lifetime of the PODProfit product as currently branded. It covers any new tool, template, report, or feature we add to the PODProfit Pro tier. Confirmed examples: Excel Profit Template (7/23) and Quarterly POD Benchmark Report PDF (8/20). It does not cover: (a) entirely separate products we may launch under different brand names (e.g. Phase 2 products such as AIOAxis are outside this license), (b) third-party paid integrations that carry their own license, and (c) services subject to a sunset notice (we commit to a minimum 30-day notice and the MIT-licensed source remains available for self-hosting). Subject to our Terms of Service.",
        rich: (
          <p>
            &quot;Forever&quot; means the lifetime of the <strong>PODProfit</strong>{" "}
            product as currently branded. It covers any new tool, template,
            report, or feature we add to the <strong>PODProfit Pro tier</strong>.
            Confirmed examples: Excel Profit Template (7/23) and Quarterly POD
            Benchmark Report PDF (8/20). It <strong>does not</strong> cover: (a)
            entirely separate products we may launch under different brand names
            (e.g. Phase 2 products such as AIOAxis are outside this license), (b)
            third-party paid integrations that carry their own license, and (c)
            services subject to a sunset notice (we commit to a minimum 30-day
            notice and the MIT-licensed source remains available for
            self-hosting). Subject to our{" "}
            <Link href="/legal/terms" className="underline">
              Terms of Service
            </Link>
            .
          </p>
        ),
      },
      {
        id: "q8",
        q: "Why is Lifetime limited to 100 seats, and how do I check seats remaining?",
        plain:
          "Two reasons: rewarding earliest believers with a small, capped cohort, and protecting the unit economics of the recurring Pro plan that funds ongoing development. Once 100 seats are sold, Lifetime closes permanently and only Pro at $9/month remains. Live seat availability is shown in real time on the pricing page at https://getpodprofit.com/lifetime — the counter decrements on each successful Stripe purchase and the checkout closes automatically at seat 100. If the page shows seats remaining, the offer is open; if it shows \"closed\", Lifetime is fully sold.",
        rich: (
          <p>
            Two reasons: rewarding earliest believers with a small, capped cohort,
            and protecting the unit economics of the recurring Pro plan that funds
            ongoing development. Once 100 seats are sold, Lifetime closes
            permanently and only Pro at $9/month remains.{" "}
            <strong>Live seat availability</strong> is shown in real time on the
            pricing page at{" "}
            <Link href="/lifetime" className="underline">
              getpodprofit.com/lifetime
            </Link>{" "}
            — the counter decrements on each successful Stripe purchase and the
            checkout closes automatically at seat 100. If the page shows seats
            remaining, the offer is open; if it shows &quot;closed&quot;,
            Lifetime is fully sold.
          </p>
        ),
      },
      {
        id: "q9",
        q: "Can I become a founding beta tester for $0?",
        plain:
          "No — the founding cohort is closed. 8 founding seats were allocated at $0 to specific testers who participated in the pre-launch build phase (April–May 2026). All 8 are reserved and accounted for; we are not accepting new founding-cohort applications. The equivalent forever-included path is now Lifetime at $149, with 92 publicly available seats at launch (100 total minus 8 founding). If you want to be considered for future closed beta cohorts on Phase 2 products, email hello@getpodprofit.com and we will keep your address on file (no commitment).",
        rich: (
          <p>
            <strong>No — the founding cohort is closed.</strong> 8 founding seats
            were allocated at $0 to specific testers who participated in the
            pre-launch build phase (April–May 2026). All 8 are reserved and
            accounted for; we are not accepting new founding-cohort applications.
            The equivalent forever-included path is now Lifetime at $149, with 92
            publicly available seats at launch (100 total minus 8 founding). If
            you want to be considered for future closed beta cohorts on Phase 2
            products, email{" "}
            <a href="mailto:hello@getpodprofit.com" className="underline">
              hello@getpodprofit.com
            </a>{" "}
            and we will keep your address on file (no commitment).
          </p>
        ),
      },
    ],
  },
  {
    id: "excel-template",
    title: "Excel Template (coming 2026-07-23)",
    entries: [
      {
        id: "q10",
        q: "What is the Excel Profit Template, when can I get it, and how is it sold?",
        plain:
          "The Excel Profit Template is a structured workbook that mirrors the PODProfit calculator's logic offline: per-SKU profit sheets, batch comparison tabs, breakeven and target-margin calculators, pre-built drop-downs for supported marketplaces and suppliers. It is for sellers who want a permanent, editable record of pricing decisions outside the web app. Planned release: 2026-07-23. Standalone price: $19 USD. The Excel Template is not yet on sale; the payment processor and tax-collection arrangement will be specified in our Terms of Service before launch. Lifetime license holders receive it free, automatically — a download link arrives by email on release day.",
        rich: (
          <p>
            The Excel Profit Template is a structured workbook that mirrors the
            PODProfit calculator&apos;s logic offline: per-SKU profit sheets,
            batch comparison tabs, breakeven and target-margin calculators,
            pre-built drop-downs for supported marketplaces and suppliers. It is
            for sellers who want a permanent, editable record of pricing decisions
            outside the web app. <strong>Planned release: 2026-07-23. Standalone
            price: $19 USD.</strong> The Excel Template is not yet on sale; the
            payment processor and tax-collection arrangement will be specified in
            our{" "}
            <Link href="/legal/terms" className="underline">
              Terms of Service
            </Link>{" "}
            before launch. Lifetime license holders receive it free,
            automatically — a download link arrives by email on release day.
          </p>
        ),
      },
      {
        id: "q11",
        q: "Does the Excel Template work in Google Sheets or Apple Numbers?",
        plain:
          "The template is built and tested in Microsoft Excel (2019 and later, plus Excel for Microsoft 365). It uses standard formulas and avoids macros, so it imports cleanly into Google Sheets in most cases — some conditional formatting and drop-downs may render slightly differently, but calculations are preserved. Apple Numbers compatibility is best-effort only: most formulas work, but layout fidelity is not guaranteed. If your team is fully on Sheets, email hello@getpodprofit.com — a Google Sheets-native version is on the table if there's enough demand from Lifetime and Pro users.",
        rich: (
          <p>
            The template is built and tested in Microsoft Excel (2019 and later,
            plus Excel for Microsoft 365). It uses standard formulas and avoids
            macros, so it imports cleanly into Google Sheets in most cases — some
            conditional formatting and drop-downs may render slightly differently,
            but calculations are preserved.{" "}
            <strong>Apple Numbers compatibility is best-effort only</strong>: most
            formulas work, but layout fidelity is not guaranteed. If your team is
            fully on Sheets, email{" "}
            <a href="mailto:hello@getpodprofit.com" className="underline">
              hello@getpodprofit.com
            </a>{" "}
            — a Google Sheets-native version is on the table if there&apos;s
            enough demand from Lifetime and Pro users.
          </p>
        ),
      },
    ],
  },
  {
    id: "report-pdf",
    title: "Report PDF (coming 2026-08-20)",
    entries: [
      {
        id: "q12",
        q: "What is included in the Quarterly POD Benchmark Report, and where do I report data corrections?",
        plain:
          "The Benchmark Report is a quarterly PDF aggregating anonymized pricing, margin, and category trends across the POD market — drawn from public marketplace data, supplier rate cards, and (with explicit consent) opted-in user inputs. Each issue covers top categories (apparel, mugs, posters, accessories), median selling prices and margins by marketplace, supplier cost movement, and ad-cost benchmarks. Planned first issue: 2026-08-20. Standalone price: $29 USD per issue. The Benchmark Report is not yet on sale; the payment processor and tax-collection arrangement will be specified in our Terms of Service before launch. Lifetime holders receive every future issue free. To report a wrong number in the report or fee tables: (a) hello@getpodprofit.com for fastest response, or (b) GitHub Issues for public tracking — best effort to confirm and patch within 1 business day (JST, Mon–Fri).",
        rich: (
          <p>
            The Benchmark Report is a quarterly PDF aggregating anonymized
            pricing, margin, and category trends across the POD market — drawn
            from public marketplace data, supplier rate cards, and (with explicit
            consent) opted-in user inputs. Each issue covers top categories
            (apparel, mugs, posters, accessories), median selling prices and
            margins by marketplace, supplier cost movement, and ad-cost
            benchmarks. <strong>Planned first issue: 2026-08-20. Standalone
            price: $29 USD per issue.</strong> The Benchmark Report is not yet on
            sale; the payment processor and tax-collection arrangement will be
            specified in our{" "}
            <Link href="/legal/terms" className="underline">
              Terms of Service
            </Link>{" "}
            before launch. Lifetime holders receive every future issue free.{" "}
            <strong>To report a wrong number</strong> in the report or fee tables:
            (a){" "}
            <a href="mailto:hello@getpodprofit.com" className="underline">
              hello@getpodprofit.com
            </a>{" "}
            for fastest response, or (b) GitHub Issues for public tracking — best
            effort to confirm and patch within 1 business day (JST, Mon–Fri).
          </p>
        ),
      },
      {
        id: "q13",
        q: "How is the report data sourced, and is my data used?",
        plain:
          "The report is built primarily from public marketplace listings, published supplier rate cards, and aggregated industry data. We do not use your individual calculator inputs in the report by default — calculator inputs are not stored (see Q18). If you opt in via a separate consent form, we may include your figures in fully anonymized, aggregated form (e.g. \"median margin across opted-in mug sellers\"), never tied to your account, store, or email. Opt-in is genuinely optional and can be withdrawn anytime by emailing hello@getpodprofit.com. We will never publish data that could identify an individual seller or store.",
        rich: (
          <p>
            The report is built primarily from public marketplace listings,
            published supplier rate cards, and aggregated industry data. We do{" "}
            <strong>not</strong> use your individual calculator inputs in the
            report by default — calculator inputs are not stored (see{" "}
            <Link href="#q18" className="underline">
              Q18
            </Link>
            ). If you opt in via a separate consent form, we may include your
            figures in fully anonymized, aggregated form (e.g. &quot;median margin
            across opted-in mug sellers&quot;), never tied to your account, store,
            or email. Opt-in is genuinely optional and can be withdrawn anytime by
            emailing{" "}
            <a href="mailto:hello@getpodprofit.com" className="underline">
              hello@getpodprofit.com
            </a>
            . We will never publish data that could identify an individual seller
            or store.
          </p>
        ),
      },
    ],
  },
  {
    id: "refund-payment",
    title: "Refund / Payment",
    entries: [
      {
        id: "q14",
        q: "What is your refund policy?",
        plain:
          "Updated 2026-05-11. Lifetime ($149): full refund within 14 days of purchase, no questions asked. The 14-day cooling-off window is unconditional — using the calculator during this period does not waive your refund right. After 14 days, Lifetime is non-refundable. The window aligns with the UK Consumer Contracts Regulations 2013 and the EU Consumer Rights Directive 2011/83/EU 14-day cooling-off standard, and we extend it to all customers worldwide. (Terms §7.1.) Pro Monthly ($9/month) and Pro Annual ($79/year): subscriptions are not pro-rated. Cancel anytime from the Stripe Customer Portal (linked from your account page); cancellation stops future billing immediately, and access to Pro features continues until the end of the current paid period (month or year, respectively). The unused portion of the current period is not refunded. (Terms §7.2, §7.3.) Duplicate charges: always refundable, separate from the above. We refund duplicate charges automatically within 1 business day of detection. Excel Template ($19) / Benchmark Report ($29): not yet on sale (planned 2026-07-23 and 2026-08-20). Refund terms and payment processor will be specified in a future revision of our Terms of Service before each launch. (Terms §7.4.) Refund requests for Lifetime should be sent to hello@getpodprofit.com within 14 days of purchase. We respond typically within 3 business days, no later than 7. Approved refunds go back to the original payment method (Stripe). EU/UK customers: Lifetime customers receive the same unconditional 14-day window as everyone else, so no separate Art 16(m) consent flow is collected for Lifetime at checkout. For Pro subscriptions, where mandatory consumer-protection law in your jurisdiction grants a non-waivable right exceeding §7.2 / §7.3, that mandatory minimum applies. For the Excel Template and Benchmark Report (not yet on sale), the Art 16(m) consent flow will be described before each launch.",
        rich: (
          <>
            <p>
              <em>Updated 2026-05-11.</em> Our cooling-off / refund regime, by
              product:
            </p>
            <ul>
              <li>
                <strong>Lifetime</strong> ($149):{" "}
                <strong>full refund within 14 days of purchase, no questions
                asked.</strong>{" "}
                The 14-day window is unconditional — using the calculator
                during this period does <em>not</em> waive your refund right.
                After 14 days, Lifetime is non-refundable. The window aligns
                with the UK Consumer Contracts Regulations 2013 and the EU
                Consumer Rights Directive 2011/83/EU, and we extend it to all
                customers worldwide. (See Terms{" "}
                <Link href="/legal/terms#section-7" className="underline">
                  §7.1
                </Link>
                .)
              </li>
              <li>
                <strong>Pro Monthly</strong> ($9/month) and{" "}
                <strong>Pro Annual</strong> ($79/year):{" "}
                <strong>subscriptions are not pro-rated.</strong> Cancel anytime
                from the <strong>Stripe Customer Portal</strong> (linked from
                your account page); cancellation stops future billing{" "}
                <strong>immediately</strong>, and access to Pro features
                continues until the end of the current paid period (month or
                year, respectively). The unused portion of the current period
                is not refunded. (See Terms{" "}
                <Link href="/legal/terms#section-7" className="underline">
                  §7.2 / §7.3
                </Link>
                .)
              </li>
              <li>
                <strong>Duplicate charges</strong>: always refundable, separate
                from the above. We refund duplicate charges automatically
                within 1 business day of detection.
              </li>
              <li>
                <strong>Excel Template</strong> ($19) /{" "}
                <strong>Benchmark Report</strong> ($29):{" "}
                <strong>not yet on sale</strong> (planned 2026-07-23 and
                2026-08-20). Refund terms and payment processor will be
                specified in a future revision of our Terms of Service before
                each launch. (See Terms{" "}
                <Link href="/legal/terms#section-7" className="underline">
                  §7.4
                </Link>
                .)
              </li>
            </ul>
            <p>
              Refund requests for Lifetime should be sent to{" "}
              <a href="mailto:hello@getpodprofit.com" className="underline">
                hello@getpodprofit.com
              </a>{" "}
              within 14 days of purchase with your order ID. We respond{" "}
              <strong>
                typically within 3 business days, no later than 7
              </strong>
              . Approved refunds are processed back to the original payment
              method (Stripe).
            </p>
            <p>
              <strong>EU/UK customers</strong>: Lifetime customers receive the
              same unconditional 14-day window as everyone else, so no separate
              Art 16(m) consent step is collected for Lifetime at checkout. For
              Pro Monthly / Pro Annual, where mandatory consumer-protection law
              in your jurisdiction grants a non-waivable right that exceeds
              §7.2 / §7.3, that mandatory minimum applies for you. For the
              Excel Template and Benchmark Report (not yet on sale), the Art
              16(m) consent flow will be described before each launch. Full
              policy:{" "}
              <Link href="/legal/refunds" className="underline">
                /legal/refunds
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        id: "q15",
        q: "Which payment methods do you accept, and who handles billing?",
        plain:
          "At launch, the only product on sale is the calculator (Lifetime $149 and Pro $9/month), and both are processed by Stripe. Your card statement will show a charge from Stripe / PODProfit. Stripe accepts major credit/debit cards, Apple Pay, Google Pay, and other regional methods. The Excel Template ($19, planned 2026-07-23) and Quarterly Report PDF ($29, planned 2026-08-20) are not yet on sale. The payment processor, seller-of-record, and tax-collection arrangement for those products will be specified in a future revision of our Terms of Service before each launch. You can manage Pro subscription, update payment method, download invoices, and cancel at any time via the customer portal links in your purchase confirmation emails. Lifetime is a one-time charge with no recurring billing.",
        rich: (
          <>
            <p>
              At launch, the only product on sale is the calculator
              (Lifetime $149 and Pro $9/month), and both are processed by{" "}
              <strong>Stripe</strong>. Your card statement will show a charge
              from Stripe / PODProfit. Stripe accepts major credit/debit cards,
              Apple Pay, Google Pay, and other regional methods.
            </p>
            <p>
              The <strong>Excel Template ($19, planned 2026-07-23)</strong> and{" "}
              <strong>Quarterly Report PDF ($29, planned 2026-08-20)</strong>{" "}
              are <strong>not yet on sale</strong>. The payment processor,
              seller-of-record, and tax-collection arrangement for those
              products will be specified in a future revision of our{" "}
              <Link href="/legal/terms" className="underline">
                Terms of Service
              </Link>{" "}
              before each launch.
            </p>
            <p>
              You can manage Pro subscription, update payment method, download
              invoices, and cancel at any time via the customer portal links in
              your purchase confirmation emails. Lifetime is a one-time charge
              with no recurring billing.
            </p>
          </>
        ),
      },
      {
        id: "q16",
        q: "What currency are charges in, and will my bank add fees?",
        plain:
          "All prices are listed in USD. Stripe will charge your card in USD, and your issuing bank will convert to your local currency at its prevailing FX rate. Foreign-currency conversion fees and cross-border transaction fees are charged by your bank, not by us — typical ranges are 1–3% depending on your card issuer. If you have a USD-denominated card or a no-FX-fee card, you can avoid these. We are unable to refund bank-side FX or cross-border fees.",
        rich: (
          <p>
            All prices are listed in <strong>USD</strong>. Stripe will charge
            your card in USD, and your issuing bank will convert to your local
            currency at its prevailing FX rate.{" "}
            <strong>
              Foreign-currency conversion fees and cross-border transaction fees
              are charged by your bank, not by us
            </strong>{" "}
            — typical ranges are 1–3% depending on your card issuer. If you have a
            USD-denominated card or a no-FX-fee card, you can avoid these. We are
            unable to refund bank-side FX or cross-border fees.
          </p>
        ),
      },
      {
        id: "q17",
        q: "I was charged but never received my license key or download — what do I do?",
        plain:
          "First, check your spam and promotions folder for an email from Stripe or hello@getpodprofit.com — delivery is usually within minutes but can take up to an hour during release-day spikes. If it still hasn't arrived, email hello@getpodprofit.com with the email you used at checkout and the order ID (in your card statement and Stripe receipt). We will verify the order and resend your license key, typically within 1 business day. Please do not file a chargeback before contacting us — almost every \"missing email\" case is resolved within hours.",
        rich: (
          <p>
            First, check your spam and promotions folder for an email from Stripe
            or hello@getpodprofit.com — delivery is usually within minutes but
            can take up to an hour during release-day spikes. If it still
            hasn&apos;t arrived, email{" "}
            <a href="mailto:hello@getpodprofit.com" className="underline">
              hello@getpodprofit.com
            </a>{" "}
            with the email you used at checkout and the order ID (in your card
            statement and Stripe receipt). We will verify the order and resend
            your license key,{" "}
            <strong>typically within 1 business day</strong>. Please do not file a
            chargeback before contacting us — almost every &quot;missing
            email&quot; case is resolved within hours.
          </p>
        ),
      },
    ],
  },
  {
    id: "privacy-data",
    title: "Privacy / Data",
    entries: [
      {
        id: "q18",
        q: "Do you store the numbers I enter into the calculator?",
        plain:
          "No personal pricing data is persisted. The web calculator runs entirely in your browser; calculations never leave your device unless you save a share link. The public API at /api/v1/calculate processes inputs server-side (Edge runtime) but does not store them — inputs exist only for the duration of the calculation and are not written to any database tied to your account. Standard server access logs (timestamp, IP, request path) are retained for 14 days for security and rate-limit purposes per our Privacy Policy, and contain no calculator input values. Saved presets and share links (Pro and Lifetime) are the one exception: those are stored deliberately because you asked us to save them, and you can delete them anytime from your account settings. We designed it this way because your pricing data is competitively sensitive: the less of it we hold, the less risk to you.",
        rich: (
          <p>
            No personal pricing data is persisted.{" "}
            <strong>
              The web calculator runs entirely in your browser; calculations never
              leave your device unless you save a share link.
            </strong>{" "}
            The public API at <code>/api/v1/calculate</code> processes inputs
            server-side (Edge runtime) but <strong>does not store them</strong> —
            inputs exist only for the duration of the calculation and are not
            written to any database tied to your account.{" "}
            <strong>
              Standard server access logs (timestamp, IP, request path) are
              retained for 14 days for security and rate-limit purposes per our
              Privacy Policy, and contain no calculator input values.
            </strong>{" "}
            Saved presets and share links (Pro and Lifetime) are the one
            exception: those are stored deliberately because you asked us to save
            them, and you can delete them anytime from your account settings. We
            designed it this way because your pricing data is competitively
            sensitive: the less of it we hold, the less risk to you.
          </p>
        ),
      },
      {
        id: "q19",
        q: "Are you GDPR compliant, and how do I request data deletion?",
        plain:
          "Yes. We follow GDPR principles for all users regardless of region: data minimization, purpose limitation, the right to access, and the right to be forgotten. To request a copy of your account data or full deletion, email hello@getpodprofit.com from the address tied to your account with the subject line \"GDPR Data Request\" or \"Deletion Request\". We confirm receipt within 3 business days and complete the request within 30 days (extendable by up to 2 additional months for complex requests, as permitted under GDPR Article 12, with notice to you). Lifetime license deletion is irreversible — once removed we cannot restore your seat, and the seat does not reissue toward the 100-seat cap. California residents have additional rights under the CCPA/CPRA (right to know, right to delete, right to opt out of sale of personal information — note: we do not sell personal information). Use the same email above with subject line \"CCPA Request\".",
        rich: (
          <>
            <p>
              Yes. We follow GDPR principles for all users regardless of region:
              data minimization, purpose limitation, the right to access, and the
              right to be forgotten. To request a copy of your account data or
              full deletion, email{" "}
              <strong>
                <a href="mailto:hello@getpodprofit.com" className="underline">
                  hello@getpodprofit.com
                </a>
              </strong>{" "}
              from the address tied to your account with the subject line
              &quot;GDPR Data Request&quot; or &quot;Deletion Request&quot;. We
              confirm receipt within 3 business days and{" "}
              <strong>complete the request within 30 days</strong> (extendable by
              up to 2 additional months for complex requests, as permitted under
              GDPR Article 12, with notice to you). Lifetime license deletion is
              irreversible — once removed we cannot restore your seat, and the
              seat does not reissue toward the 100-seat cap.
            </p>
            <p>
              <strong>California residents</strong> have additional rights under
              the CCPA/CPRA (right to know, right to delete, right to opt out of
              sale of personal information — note:{" "}
              <strong>we do not sell personal information</strong>). Use the same
              email above with subject line &quot;CCPA Request&quot;.
            </p>
          </>
        ),
      },
      {
        id: "q20",
        q: "Does PODProfit use AI, and how does it affect my support experience?",
        plain:
          "We disclose AI use in two places — inside the product, and in customer support — and the rollout timing differs. Inside the calculator: the underlying math is fully deterministic, with no AI in the calculation path. AI is used only to summarize results and suggest pricing improvements as advisory text. AI-generated suggestions are advisory only and should not be treated as professional pricing advice. You remain solely responsible for your pricing decisions. In customer support: AI-assisted CS will be available from approximately 2026-06-23, pending evaluation of demand and quality criteria post-launch. Until then, all support is responded to manually by Satsuki (the founder). Once enabled, AI assists with drafting replies and a real person reads, edits, and approves every message before sending — we will not run a fully automated support bot. Your message contents are processed only to answer you and are not used to train external AI models.",
        rich: (
          <>
            <p>
              We disclose AI use in two places — inside the product, and in
              customer support — and the rollout timing differs:
            </p>
            <ul>
              <li>
                <strong>Inside the calculator</strong>: the underlying math is{" "}
                <strong>fully deterministic, with no AI in the calculation
                path</strong>. AI is used only to summarize results and suggest
                pricing improvements as advisory text.{" "}
                <strong>
                  AI-generated suggestions are advisory only and should not be
                  treated as professional pricing advice. You remain solely
                  responsible for your pricing decisions.
                </strong>
              </li>
              <li>
                <strong>In customer support</strong>:{" "}
                <strong>
                  AI-assisted CS will be available from approximately 2026-06-23,
                  pending evaluation of demand and quality criteria post-launch.
                  Until then, all support is responded to manually by Satsuki (the
                  founder).
                </strong>{" "}
                Once enabled, AI assists with drafting replies and a real person
                reads, edits, and approves every message before sending — we will
                not run a fully automated support bot.
              </li>
              <li>
                Your message contents are processed only to answer you and are{" "}
                <strong>not used to train external AI models</strong>.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "q21",
        q: "Where can I read your full Privacy Policy and Terms?",
        plain:
          "Both documents are linked in the footer of getpodprofit.com and available at fixed URLs. Privacy Policy: https://getpodprofit.com/legal/privacy. Terms of Service: https://getpodprofit.com/legal/terms. Published 2026-06-09 alongside launch, covering: (1) AI use in product features and support (with the staged rollout described in Q20), (2) Stripe as the payment processor for the calculator (Lifetime/Pro), and (3) GDPR/CCPA-aligned language. A substantive update is planned before the Excel Template launch on 2026-07-23 to add the payment-processor and tax-collection terms for the Excel Template and Benchmark Report, and to expand AI usage and EU/UK-specific language. Existing users will be notified by email of any material changes with a clear summary of what changed and when it takes effect. For specific privacy or terms questions, email hello@getpodprofit.com.",
        rich: (
          <>
            <p>
              Both documents are linked in the footer of getpodprofit.com and
              available at fixed URLs:
            </p>
            <ul>
              <li>
                <strong>Privacy Policy</strong>:{" "}
                <Link href="/legal/privacy" className="underline">
                  /legal/privacy
                </Link>
              </li>
              <li>
                <strong>Terms of Service</strong>:{" "}
                <Link href="/legal/terms" className="underline">
                  /legal/terms
                </Link>
              </li>
            </ul>
            <p>
              <strong>Published 2026-06-09 alongside launch</strong>,
              covering: (1) AI use in product features and support (with the
              staged rollout described in{" "}
              <Link href="#q20" className="underline">
                Q20
              </Link>
              ), (2) Stripe as the payment processor for the calculator
              (Lifetime/Pro), and (3) GDPR/CCPA-aligned language. A substantive
              update is planned before the Excel Template launch on 2026-07-23
              to add the payment-processor and tax-collection terms for the
              Excel Template and Benchmark Report, and to expand AI usage and
              EU/UK-specific language. Existing users will be notified by email
              of any material changes with a clear summary of what changed and
              when it takes effect. For specific privacy or terms questions,
              email{" "}
              <a href="mailto:hello@getpodprofit.com" className="underline">
                hello@getpodprofit.com
              </a>
              .
            </p>
          </>
        ),
      },
      {
        id: "q22",
        q: "Is the website available in languages other than English, and on mobile?",
        plain:
          "Languages: at launch, the UI is English only. Japanese localization is under consideration for v1.3 or later based on demand from Lifetime and Pro users — email hello@getpodprofit.com if you need it. Other languages will follow user demand. Mobile: the calculator is a responsive web app and works in modern mobile browsers (iOS Safari, Android Chrome) for one-handed quick calculations. The full batch-comparison and CSV export experience is optimized for desktop / tablet width, and the Excel Template is desktop only by nature. There is no native iOS or Android app planned for Phase 1.",
        rich: (
          <p>
            <strong>Languages</strong>: at launch, the UI is{" "}
            <strong>English only</strong>. Japanese localization is under
            consideration for v1.3 or later based on demand from Lifetime and Pro
            users — email{" "}
            <a href="mailto:hello@getpodprofit.com" className="underline">
              hello@getpodprofit.com
            </a>{" "}
            if you need it. Other languages will follow user demand.{" "}
            <strong>Mobile</strong>: the calculator is a responsive web app and
            works in modern mobile browsers (iOS Safari, Android Chrome) for
            one-handed quick calculations. The full batch-comparison and CSV
            export experience is optimized for desktop / tablet width, and the
            Excel Template is desktop only by nature. There is no native iOS or
            Android app planned for Phase 1.
          </p>
        ),
      },
    ],
  },
  {
    id: "beta-community",
    title: "Beta & Community",
    entries: [
      {
        id: "q23",
        q: "How do I report a bug or request a feature?",
        plain:
          "Two channels: (a) email hello@getpodprofit.com for the fastest response (target first reply: under 1 business day, JST), or (b) GitHub Issues at our public repository for issues you'd like tracked transparently. For wrong fee numbers, attach a screenshot or link to the source rate-card page. Bug reports are triaged by severity (data correctness > calculation correctness > UX > cosmetic). Feature requests are welcome but prioritized by demand across Lifetime and Pro users. We commit to acknowledging every report; we cannot commit to implementing every request.",
        rich: (
          <p>
            Two channels: (a){" "}
            <strong>
              email{" "}
              <a href="mailto:hello@getpodprofit.com" className="underline">
                hello@getpodprofit.com
              </a>
            </strong>{" "}
            for the fastest response (target first reply: under 1 business day,
            JST), or (b) <strong>GitHub Issues</strong> at our public repository
            for issues you&apos;d like tracked transparently. For wrong fee
            numbers, attach a screenshot or link to the source rate-card page. Bug
            reports are triaged by severity (data correctness {">"} calculation
            correctness {">"} UX {">"} cosmetic). Feature requests are welcome but
            prioritized by demand across Lifetime and Pro users. We commit to
            acknowledging every report; we cannot commit to implementing every
            request.
          </p>
        ),
      },
      {
        id: "q24",
        q: "Can I self-host PODProfit, and is the source available?",
        plain:
          "Yes — the calculator source is MIT-licensed and available on GitHub. You can deploy your own instance on Vercel, your own infrastructure, or any Node.js host. The hosted service at getpodprofit.com is the canonical source for fee tables (manually verified and refreshed monthly) — self-hosters maintain their own fee data. We do not provide support for self-hosted instances; community contributions are welcome via pull request. Lifetime and Pro features (saved presets, priority support, included templates and reports) apply only to the hosted service.",
        rich: (
          <p>
            Yes — the calculator source is <strong>MIT-licensed</strong> and
            available on GitHub. You can deploy your own instance on Vercel, your
            own infrastructure, or any Node.js host. The hosted service at{" "}
            <code>getpodprofit.com</code> is the canonical source for fee tables
            (manually verified and refreshed monthly) — self-hosters maintain
            their own fee data. We do <strong>not</strong> provide support for
            self-hosted instances; community contributions are welcome via pull
            request. Lifetime and Pro features (saved presets, priority support,
            included templates and reports) apply only to the hosted service.
          </p>
        ),
      },
    ],
  },
  {
    id: "trademark-legal",
    title: "Trademarks & Legal",
    entries: [
      {
        id: "q25",
        q: "Are you affiliated with Etsy, Shopify, Printful, Printify, or Stripe?",
        plain:
          "No. Etsy, Shopify, Printful, Printify, and Stripe are trademarks of their respective owners. PODProfit is an independent tool and is not affiliated with, endorsed by, or sponsored by any of these companies. We model their publicly published fee structures and rate cards under nominative fair use, solely to identify the platforms our calculator supports and the payment processor we use. If you have an issue with one of these companies' services, please contact them directly — we cannot intervene on their behalf.",
        rich: (
          <p>
            <strong>No.</strong> Etsy, Shopify, Printful, Printify, and Stripe
            are trademarks of their respective owners. PODProfit is an{" "}
            <strong>independent tool</strong> and is{" "}
            <strong>not affiliated with, endorsed by, or sponsored by</strong>{" "}
            any of these companies. We model their publicly published fee
            structures and rate cards under nominative fair use, solely to
            identify the platforms our calculator supports and the payment
            processor we use. If you have an issue with one of these
            companies&apos; services, please contact them directly — we cannot
            intervene on their behalf.
          </p>
        ),
      },
      {
        id: "q26",
        q: "I have a tax / accounting / legal question about my POD business — can you help?",
        plain:
          "The information in this FAQ and in the calculator is general information only. We are not a tax advisor, accountant, attorney, or licensed financial advisor in any jurisdiction. We cannot answer questions about your specific tax obligations, business structure (sole proprietor / LLC / corporation), VAT / sales tax registration thresholds, customs liability, income recognition, deductions, or international tax treaties. Please consult a qualified specialist licensed in your jurisdiction (CPA, tax attorney, customs broker, or equivalent) for any decision that affects your tax filings, regulatory compliance, or legal standing.",
        rich: (
          <p>
            The information in this FAQ and in the calculator is{" "}
            <strong>general information only</strong>. We are <strong>not</strong>{" "}
            a tax advisor, accountant, attorney, or licensed financial advisor in
            any jurisdiction. We cannot answer questions about your specific tax
            obligations, business structure (sole proprietor / LLC / corporation),
            VAT / sales tax registration thresholds, customs liability, income
            recognition, deductions, or international tax treaties. Please consult
            a <strong>qualified specialist</strong> licensed in your jurisdiction
            (CPA, tax attorney, customs broker, or equivalent) for any decision
            that affects your tax filings, regulatory compliance, or legal
            standing.
          </p>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  const allEntries = CATEGORIES.flatMap((c) => c.entries);
  const jsonLdItems = allEntries.map((e) => ({ q: e.q, a: e.plain }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12 md:py-16">
      {FaqPageJsonLd(jsonLdItems)}

      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          Help
        </p>
        <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-3 max-w-2xl text-stone-700 dark:text-stone-300">
          Twenty-six answers covering the calculator, Lifetime license, refunds,
          privacy, and AI usage. Use Cmd+F (Ctrl+F on Windows) to search the page.
          Each question has a direct link — share <code>#q1</code> through{" "}
          <code>#q26</code>.
        </p>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Last updated: 2026-05-11. Audience: Etsy / Shopify sellers using
          Printful / Printify (English-speaking markets). Contact:{" "}
          <a href="mailto:hello@getpodprofit.com" className="underline">
            hello@getpodprofit.com
          </a>
          .
        </p>
      </header>

      <aside
        aria-label="Table of contents"
        className="rounded-2xl border border-stone-200 bg-white p-5 text-sm dark:border-stone-800 dark:bg-stone-900"
      >
        <h2 className="text-base font-semibold">Categories</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-stone-700 dark:text-stone-300">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link
                href={`#${c.id}`}
                className="hover:text-brand-800 dark:hover:text-brand-300"
              >
                {c.title}{" "}
                <span className="text-stone-500 dark:text-stone-500">
                  ({c.entries.length})
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </aside>

      <div
        role="note"
        className="rounded-2xl border border-stone-200 bg-stone-100 p-4 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
      >
        <strong>Disclaimer</strong>: PODProfit provides estimation tools only. We
        are <strong>not</strong> a tax, legal, accounting, or financial advisor.
        All tax-related content in this FAQ is general information only — always
        consult a qualified specialist (CPA, tax attorney, or licensed advisor)
        for decisions specific to your jurisdiction, business structure, and
        circumstances.
      </div>

      {CATEGORIES.map((category) => (
        <section
          key={category.id}
          id={category.id}
          aria-labelledby={`${category.id}-heading`}
          className="scroll-mt-20"
        >
          <h2
            id={`${category.id}-heading`}
            className="text-2xl font-bold tracking-tight"
          >
            {category.title}
          </h2>
          <div className="mt-4 space-y-3">
            {category.entries.map((entry) => (
              <details
                key={entry.id}
                id={entry.id}
                open
                className="group scroll-mt-20 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-3 text-base font-semibold text-stone-900 marker:hidden dark:text-stone-100 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="mr-2 text-brand-700 dark:text-brand-300">
                      {entry.id.toUpperCase()}.
                    </span>
                    {entry.q}
                  </span>
                  <Link
                    href={`#${entry.id}`}
                    aria-label={`Direct link to ${entry.id.toUpperCase()}`}
                    className="shrink-0 text-xs font-normal text-stone-500 hover:text-brand-800 dark:text-stone-400 dark:hover:text-brand-300"
                  >
                    #
                  </Link>
                </summary>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {entry.rich}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <section
        aria-labelledby="still-need-help"
        className="rounded-2xl border border-brand-800/20 bg-brand-50 p-6 dark:border-brand-700/40 dark:bg-brand-900/30"
      >
        <h2 id="still-need-help" className="text-xl font-semibold">
          Still need help?
        </h2>
        <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
          Email{" "}
          <strong>
            <a href="mailto:hello@getpodprofit.com" className="underline">
              hello@getpodprofit.com
            </a>
          </strong>
          .{" "}
          <strong>
            At launch (2026-06-09 through approximately 2026-06-22), every reply
            is written manually by Satsuki (the founder).
          </strong>{" "}
          From approximately <strong>2026-06-23</strong>, pending post-launch
          evaluation, replies may use AI-assisted drafts that a human reads,
          edits, and approves before sending — never a fully automated bot.
          Target first-response time: under 1 business day (JST, Mon–Fri).
        </p>
      </section>

      <section className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
        <p>
          <strong>Trademarks &amp; Affiliation.</strong> Etsy, Shopify, Printful,
          Printify, and Stripe are trademarks of their respective owners.
          PODProfit is an independent tool and is{" "}
          <strong>not affiliated with, endorsed by, or sponsored by</strong> any
          of these companies. We model their publicly published fee structures
          and rate cards under nominative fair use, solely to identify the
          platforms our calculator supports and the payment processor we use.
        </p>
        <p className="mt-3">
          <strong>Final Disclaimer.</strong> PODProfit provides estimation tools
          only. All output is an estimate, not a bookkeeping or accounting
          figure. We are <strong>not</strong> a tax, legal, accounting, or
          financial advisor, and nothing in this FAQ, the calculator, the Excel
          Template, or the Quarterly Report constitutes professional advice.
          Always consult a qualified specialist licensed in your jurisdiction
          for tax, customs, accounting, and legal decisions specific to your
          business. AI-generated suggestions in the product are advisory only —
          you remain solely responsible for your pricing and business decisions.
          Express commitments in this FAQ (response times, monthly fee
          re-checks, 30-day GDPR turnaround, sunset notice period) reflect our
          intended best-effort operations and do not constitute a contractual
          SLA unless restated in our{" "}
          <Link href="/legal/terms" className="underline">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
