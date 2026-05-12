import type { Metadata } from "next";
import Link from "next/link";
import crypto from "node:crypto";
import { AboutPersonOrgJsonLd } from "@/components/json-ld";
import { listPublicFoundingMembers } from "@/lib/lifetime/founding-members";

const SITE_URL = "https://getpodprofit.com";
const FOUNDER_EMAIL = "okalasworld@gmail.com";
// Footer keeps the canonical GitHub URL — duplicating here on purpose so the
// JSON-LD `sameAs` doesn't have to import a React component to read a string.
const GITHUB_URL = "https://github.com/SATSUKI/podprofit";
// X (Twitter) is intentionally omitted from this page and JSON-LD `sameAs`.
// Per memory `user_founder_identity` + `feedback_no_continuous_sns` (2026-05-12):
//   - The active X handle is @lastarna (a Japanese-language personal account),
//     mismatched with PODProfit's English-speaking POD-seller audience.
//   - The previously-listed `@o_satsuki` Reddit handle is permanently banned
//     (Reddit 2026-05-04) and is not a Twitter/X handle either — that line
//     was a stale carry-over from an earlier draft and surfaced an account
//     that does not exist on X.
//   - SNS continuous operation is dropped from the launch strategy; HN/IH are
//     the only launch channels, so exposing any X handle on /about would add
//     a dead link to a Stripe-risk-review surface for zero discoverability win.

/**
 * Gravatar URL for the founder photo.
 *
 * Stripe risk review (2026-05-10) flagged the missing /about page as a
 * launch-blocker for founder identity verification. To unblock fast we use
 * Gravatar with `d=identicon` so even an account-less email returns a stable
 * 200 PNG. CEO will swap in a real photo later via NEXT_PUBLIC_FOUNDER_PHOTO_URL
 * — the env var path takes precedence so no code change is required.
 */
function gravatarUrl(email: string, size = 320): string {
  const hash = crypto
    .createHash("md5")
    .update(email.trim().toLowerCase())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

const FOUNDER_PHOTO_URL =
  process.env.NEXT_PUBLIC_FOUNDER_PHOTO_URL ?? gravatarUrl(FOUNDER_EMAIL, 320);

export const metadata: Metadata = {
  title: "About PODProfit — Built by a POD seller for POD sellers",
  description:
    "PODProfit is built by Satsuki Okazaki, a software engineer with 20+ years experience and Print-on-Demand seller. Solo-operated, vendor-neutral, fully transparent pricing data.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    type: "profile",
    url: `${SITE_URL}/about`,
    title: "About PODProfit — Built by a POD seller for POD sellers",
    description:
      "Solo-operated, vendor-neutral profit calculator for Print-on-Demand sellers. Meet the founder, read the operating principles, and see who replies when you email support.",
    siteName: "PODProfit",
    // Re-declare image — Next.js does not inherit images from a parent
    // layout's openGraph when a child page sets its own block.
    images: [
      {
        url: "/api/og?variant=about",
        width: 1200,
        height: 630,
        alt: "About PODProfit — Built by a POD seller for POD sellers",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "About PODProfit — Built by a POD seller",
    description:
      "Solo-operated and built in public by Satsuki Okazaki. 20+ years engineering, vendor-neutral pricing, fast personal support.",
    images: ["/api/og?variant=about"],
  },
};

// Revalidate the founding-supporters grid every 5 minutes so a new opt-in
// shows up without forcing a full redeploy. Member count grows slowly
// (capped at 100), so the cache cost is negligible.
export const revalidate = 300;

export default async function AboutPage() {
  const foundingMembers = await listPublicFoundingMembers();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      <AboutPersonOrgJsonLd githubUrl={GITHUB_URL} />

      {/* Hero */}
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          About
        </p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-stone-900 md:text-5xl dark:text-stone-100">
          About PODProfit
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-stone-700 md:text-lg dark:text-stone-300">
          Built by a POD seller, for POD sellers — solo-operated, fully
          transparent.
        </p>
      </section>

      {/* Founder card */}
      <section
        aria-labelledby="founder-heading"
        className="mt-12 rounded-2xl border border-stone-200 bg-white/60 p-6 md:p-8 dark:border-stone-800 dark:bg-stone-900/40"
      >
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/*
            Plain <img> on purpose: avoids next.config remotePatterns + image
            optimization just to render a single 80px avatar from gravatar.com.
            Keep `loading="lazy"` and a fixed size so CLS stays at zero.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FOUNDER_PHOTO_URL}
            alt="Satsuki Okazaki, Founder of PODProfit"
            width={80}
            height={80}
            loading="lazy"
            className="h-20 w-20 rounded-full border border-stone-200 bg-stone-100 object-cover dark:border-stone-700 dark:bg-stone-800"
          />
          <div>
            <h2
              id="founder-heading"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
            >
              Satsuki Okazaki
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Founder &amp; Solo developer
            </p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a
                href={GITHUB_URL}
                rel="me noopener"
                target="_blank"
                className="underline hover:text-brand-800 dark:hover:text-brand-300"
              >
                GitHub
              </a>
              <a
                href="mailto:hello@getpodprofit.com"
                className="underline hover:text-brand-800 dark:hover:text-brand-300"
              >
                hello@getpodprofit.com
              </a>
            </p>
          </div>
        </div>

        <div className="prose prose-stone mt-6 max-w-none dark:prose-invert">
          <p>
            I&apos;m a software engineer with 20+ years building products on the
            React / Next.js + Node.js stack. I run PODProfit alone — design,
            code, pricing data, and support are all handled by me from Tokyo.
          </p>
          <p>
            I built PODProfit because I wanted a profit calculator that
            wouldn&apos;t lie to me about what I&apos;d actually take home after
            Etsy fees, Printful upcharges, EU VAT, and currency swings.
            Existing tools either skipped costs or only worked for one vendor.
            PODProfit is the one I wanted to use myself.
          </p>
          <p>
            Solo-operated means fast support: every email comes to me directly.
            Built in public means the price changelog is the source of truth —
            when Printful raises rates, you see it the same day I do.
          </p>
        </div>
      </section>

      {/* Why */}
      <section
        aria-labelledby="why-heading"
        className="mt-12"
      >
        <h2
          id="why-heading"
          className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          Why I built PODProfit
        </h2>
        <p className="mt-4 text-stone-700 dark:text-stone-300">
          The other POD calculators I tried fell into two camps. Vendor
          calculators (Printful&apos;s, Printify&apos;s) only knew their own
          catalog — they happily compared a $14.95 Bella+Canvas tee to nothing.
          Generic calculators forgot real fees: Etsy offsite ads, payment
          processing, EU VAT on B2C sales, JPY-to-USD spread on payout. So I
          built the calculator I wished existed: itemize every fee, support six
          currencies, and let you share a URL of your math so customers (and
          accountants) can see the same numbers you did.
        </p>
      </section>

      {/* Principles */}
      <section
        aria-labelledby="principles-heading"
        className="mt-12 rounded-2xl border border-stone-200 bg-white/60 p-6 md:p-8 dark:border-stone-800 dark:bg-stone-900/40"
      >
        <h2
          id="principles-heading"
          className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          Our principles
        </h2>
        <ul className="mt-4 space-y-3 text-stone-700 dark:text-stone-300">
          <li>
            <strong className="text-stone-900 dark:text-stone-100">
              Vendor-neutral pricing data
            </strong>{" "}
            — no kickbacks from Printful or Printify. Affiliates would bias the
            comparison; we don&apos;t take them.
          </li>
          <li>
            <strong className="text-stone-900 dark:text-stone-100">
              Public price changelog
            </strong>{" "}
            — every data update is timestamped and public, so you can audit
            what changed and when.
          </li>
          <li>
            <strong className="text-stone-900 dark:text-stone-100">
              Built in public, no investor pressure
            </strong>{" "}
            — no incentive to inflate metrics, hide downtime, or oversell
            features that don&apos;t exist.
          </li>
          <li>
            <strong className="text-stone-900 dark:text-stone-100">
              Solo-operated, fast support
            </strong>{" "}
            — replies usually within 24 hours. Email reaches the founder, not a
            tier-1 queue.
          </li>
          <li>
            <strong className="text-stone-900 dark:text-stone-100">
              Lifetime supporters get permanent priority early access
            </strong>{" "}
            — every product I ship under any brand will offer Lifetime
            members the first β invitations, ahead of the waitlist, for as
            long as the supporter holds their seat. Codified in our{" "}
            <Link
              href="/legal/terms#section-5"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              Terms of Service §5.1
            </Link>
            .
          </li>
        </ul>
      </section>

      {/* Founding Supporters (PODP-12) */}
      <FoundingSupportersSection members={foundingMembers} />

      {/* Address & Contact */}
      <section
        aria-labelledby="address-heading"
        className="mt-12"
      >
        <h2
          id="address-heading"
          className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          Address &amp; Contact
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="font-medium text-stone-900 dark:text-stone-100">
            Operator
          </dt>
          <dd className="text-stone-700 dark:text-stone-300">
            Satsuki Okazaki (sole proprietor)
          </dd>

          <dt className="font-medium text-stone-900 dark:text-stone-100">
            Trading as
          </dt>
          <dd className="text-stone-700 dark:text-stone-300">PODProfit</dd>

          <dt className="font-medium text-stone-900 dark:text-stone-100">
            Address
          </dt>
          <dd className="text-stone-700 dark:text-stone-300">
            〒150-0044 東京都渋谷区円山町5番3号 MIEUX渋谷ビル8階
            <br />
            <span className="text-stone-500 dark:text-stone-400">
              (8F MIEUX Shibuya Building, 5-3 Maruyama-cho, Shibuya-ku, Tokyo
              150-0044, Japan)
            </span>
          </dd>

          <dt className="font-medium text-stone-900 dark:text-stone-100">
            Contact
          </dt>
          <dd className="text-stone-700 dark:text-stone-300">
            <a
              href="mailto:hello@getpodprofit.com"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              hello@getpodprofit.com
            </a>
            {/*
              Phone intentionally NOT shown here. Per memory
              `feedback_contact_channel_policy` (2026-05-12), the My050
              number is only surfaced on /legal/tokushoho where statutory
              disclosure mandates it (JP 特定商取引法 第11条 + UK CCR Reg
              13(1)(b) + EU CRD Art 6(1)(c)). Every other consumer
              surface funnels traffic to email + Web form because CEO
              is JP-monolingual and the customer base is mostly
              English-speaking.
            */}
          </dd>

          <dt className="font-medium text-stone-900 dark:text-stone-100">
            JP legal notice
          </dt>
          <dd className="text-stone-700 dark:text-stone-300">
            <Link
              href="/legal/tokushoho"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              Specified Commercial Transactions Act (特定商取引法)
            </Link>
          </dd>
        </dl>
      </section>

      {/* Other links */}
      <section
        aria-labelledby="other-heading"
        className="mt-12 mb-4"
      >
        <h2
          id="other-heading"
          className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          Other links
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-y-2 text-sm text-stone-700 sm:grid-cols-2 dark:text-stone-300">
          <li>
            <a
              href={GITHUB_URL}
              rel="me noopener"
              target="_blank"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              Source code (GitHub)
            </a>
          </li>
          <li>
            <Link
              href="/legal/tokushoho"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              Specified Commercial Transactions Act
            </Link>
          </li>
          <li>
            <Link
              href="/legal/terms"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              Terms of Service
            </Link>
          </li>
          <li>
            <Link
              href="/legal/privacy"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link
              href="/legal/refunds"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              Refund Policy
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className="underline hover:text-brand-800 dark:hover:text-brand-300"
            >
              Contact form
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}

/**
 * Public Founding Supporters grid (PODP-12).
 *
 * Only opted-in Lifetime members are returned by the loader (RLS gates
 * the table to `display_x_handle = true` for the anon role). When the
 * list is empty we still render the heading + "Be one of the first"
 * pre-launch copy so the section keeps its anchor and the page layout
 * stays stable.
 */
function FoundingSupportersSection({
  members,
}: {
  members: Array<{ user_id: string; x_handle: string | null; joined_at: string }>;
}) {
  return (
    <section
      aria-labelledby="founding-heading"
      id="founding-supporters"
      className="mt-12 scroll-mt-24"
    >
      <h2
        id="founding-heading"
        className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
      >
        Our 100 Founding Supporters
      </h2>
      <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
        Lifetime supporters who chose to be credited publicly. Listed in the
        order they joined. The Lifetime tier is hard-capped at 100 seats and
        carries permanent priority access to every future PODProfit-brand
        product, as written in our{" "}
        <Link
          href="/legal/terms#section-5"
          className="underline hover:text-brand-800 dark:hover:text-brand-300"
        >
          Terms of Service
        </Link>
        .
      </p>
      {members.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white/50 p-6 text-center text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-400">
          Be one of the first.{" "}
          <Link href="/pricing" className="underline">
            Reserve a Lifetime seat
          </Link>{" "}
          and opt in to be credited here from your account page.
        </p>
      ) : (
        <ul
          aria-label="Founding supporters"
          className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 md:grid-cols-4"
        >
          {members.map((m) => (
            <li
              key={m.user_id}
              className="truncate rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
            >
              {m.x_handle ? (
                <a
                  href={`https://x.com/${m.x_handle}`}
                  rel="noopener nofollow"
                  target="_blank"
                  className="text-brand-800 hover:underline dark:text-brand-300"
                >
                  @{m.x_handle}
                </a>
              ) : (
                <span className="text-stone-600 dark:text-stone-400">
                  Founding supporter
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
