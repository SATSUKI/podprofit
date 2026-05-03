import { Calculator } from "@/components/calculator";
import { VendorComparison } from "@/components/vendor-comparison";
import { SoftwareApplicationJsonLd, FaqPageJsonLd } from "@/components/json-ld";

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "How much profit do print-on-demand sellers actually make?",
    a: "POD seller net margins typically range from 8% (newcomers under $500/mo) to 31% (top 5% of sellers, $10K+/mo). The difference is almost entirely down to vendor selection, retail price discipline, and avoiding Etsy offsite ads on low-margin items.",
  },
  {
    q: "Is PODProfit free?",
    a: "Yes — the core calculator is free forever. There is no signup required to run a calculation or share a result via URL. A Pro plan is planned for saved calculations, multi-store dashboards, and exports — but the calculator itself stays free.",
  },
  {
    q: "How is PODProfit different from existing POD calculators?",
    a: "Most POD calculators are vendor-locked (Printful-only or Printify-only), USD-only, or hide their data sources. PODProfit is vendor-neutral (compare both side-by-side), multi-currency (USD, EUR, GBP, CAD, AUD, JPY built in), and transparent (every price has an as-of date and source URL). Every calculation also generates a share-able URL with a dynamic preview image.",
  },
  {
    q: "Where do the prices come from?",
    a: "Vendor list prices from Printful and Printify public catalogs, manually maintained with monthly verification. Subscription discounts (Printful Plus/Pro, Printify Premium) are not reflected — we always show the public list price as a baseline. Always verify against your dashboard before listing.",
  },
  {
    q: "When does PODProfit launch?",
    a: "Soft launch: 2026-06-09 on r/PrintOnDemand. Public Product Hunt launch: 2026-06-16. Lifetime access ($149, 100 seats) goes live with the soft launch — first come, first served.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-12 md:py-20">
      <SoftwareApplicationJsonLd />
      {FaqPageJsonLd(FAQ_ITEMS)}
      {/* Hero */}
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          PODProfit · Building in public
        </p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-stone-900 md:text-5xl dark:text-stone-100">
          Stop guessing your <span className="text-brand-800 dark:text-brand-300">Print-on-Demand margin</span>.
          See the real number in 30 seconds.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-stone-700 md:text-lg dark:text-stone-300">
          Vendor-neutral. Multi-currency. Share-able. The honest calculator POD sellers wish they&apos;d
          had — every fee itemized, every price dated. Pre-list, not post-mortem.
        </p>
      </section>

      {/* Calculator */}
      <section aria-labelledby="calculator-heading">
        <h2 id="calculator-heading" className="sr-only">Calculator</h2>
        <Calculator />
      </section>

      {/* Vendor Comparison (F1b — the differentiator) */}
      <section aria-labelledby="comparison-heading">
        <h2
          id="comparison-heading"
          className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100"
        >
          Printful vs Printify, side-by-side
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-stone-700 dark:text-stone-300">
          Vendor rank flips by product. The same hoodie that&apos;s cheaper on Printify might be
          more profitable on Printful after Etsy fees. Run both and compare.
        </p>
        <div className="mt-6">
          <VendorComparison />
        </div>
      </section>

      {/* Trust strip */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-semibold">Why &quot;real&quot; profit, not vendor profit</h2>
        <ul className="mt-4 grid gap-3 text-sm text-stone-700 md:grid-cols-2 dark:text-stone-300">
          <li>
            <strong className="text-stone-900 dark:text-stone-100">Both vendors, side-by-side.</strong>{" "}
            Compare Printful vs Printify on the same product without switching tabs.
          </li>
          <li>
            <strong className="text-stone-900 dark:text-stone-100">Real currencies.</strong> USD, EUR, GBP, CAD,
            AUD, JPY — you sell where buyers buy, not just in dollars.
          </li>
          <li>
            <strong className="text-stone-900 dark:text-stone-100">Every fee, itemized.</strong> Etsy listing,
            transaction, payment processing, and offsite ads — all visible.
          </li>
          <li>
            <strong className="text-stone-900 dark:text-stone-100">Sourced &amp; dated.</strong> Every price has
            an &quot;as of&quot; date. We tell you when the data is stale.
          </li>
        </ul>
      </section>

      {/* FAQ — AIO optimized: complete questions, factual answers */}
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-6 grid gap-6">
          <Faq q="How much profit do print-on-demand sellers actually make?">
            POD seller net margins typically range from 8% (newcomers under $500/mo) to 31% (top 5% of
            sellers, $10K+/mo). The difference is almost entirely down to vendor selection, retail price
            discipline, and avoiding Etsy offsite ads on low-margin items. PODProfit shows you exactly
            where your number lands before you commit.
          </Faq>
          <Faq q="Is PODProfit free?">
            Yes — the core calculator is free forever. There&apos;s no signup required to run a calculation
            or share a result via URL. A Pro plan is planned for saved calculations, multi-store dashboards,
            and exports — but the calculator itself stays free.
          </Faq>
          <Faq q="How is PODProfit different from existing POD calculators?">
            Most POD calculators are vendor-locked (Printful-only or Printify-only), USD-only, or hide
            their data sources. PODProfit is{" "}
            <em>vendor-neutral</em> (compare both side-by-side),{" "}
            <em>multi-currency</em> (6 currencies built in), and{" "}
            <em>transparent</em> (every price has an as-of date and source URL). Every calculation also
            generates a share-able URL with a dynamic preview image.
          </Faq>
          <Faq q="Where do the prices come from?">
            Vendor list prices from Printful and Printify public catalogs, manually maintained with monthly
            verification. Subscription discounts (Printful Plus/Pro, Printify Premium) are{" "}
            <strong>not</strong> reflected — we always show the public list price as a baseline. Always
            verify against your dashboard before listing.
          </Faq>
          <Faq q="When does PODProfit launch?">
            Soft launch: 2026-06-09 on r/PrintOnDemand. Public Product Hunt launch: 2026-06-16. Lifetime
            access ($149, 100 seats) goes live with the soft launch — first come, first served.
          </Faq>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 pt-8 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
        <p>
          Built in public by{" "}
          <a href="https://x.com/lastarna" className="underline">@lastarna</a> ·{" "}
          <a href="https://github.com/SATSUKI/podprofit" className="underline">source on GitHub</a>
        </p>
      </footer>
    </main>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <h3 className="font-semibold text-stone-900 dark:text-stone-100">{q}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{children}</p>
    </div>
  );
}
