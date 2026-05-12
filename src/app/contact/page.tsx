import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";
import { SUPPORT_EMAIL } from "@/lib/contact";

const SITE_URL = "https://getpodprofit.com";

export const metadata: Metadata = {
  title: "Contact — PODProfit",
  description:
    "Send PODProfit a question, bug report, refund request, or feature idea. We respond within 3 business days.",
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/contact`,
    title: "Contact — PODProfit",
    description:
      "Bug, refund, feature idea, or pricing question — drop a note and we'll reply within 3 business days.",
    // Re-declare image — Next does not inherit images from a parent
    // layout's openGraph when a child page sets its own block.
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Contact — PODProfit",
      },
    ],
  },
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Contact PODProfit
      </h1>
      <p className="mt-3 text-stone-700 dark:text-stone-300">
        Bug report, refund request, feature idea, or pricing question — send a note
        below and we&apos;ll reply within <strong>3 business days</strong>. For
        time-sensitive refund cases please mention your order email so we can find
        the receipt quickly.
      </p>

      <aside
        aria-label="Alternative contact channels"
        className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300"
      >
        <p>
          Prefer email? You can also reach us at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="underline hover:text-brand-800 dark:hover:text-brand-300"
          >
            {SUPPORT_EMAIL}
          </a>
          . The form above and this address arrive in the same inbox, so use
          whichever is easier — we answer both within 3 business days.
        </p>
      </aside>

      <ContactForm />

      <p className="mt-6 text-xs text-stone-500 dark:text-stone-500">
        Your message and email are stored in our private database to help us
        reply and to keep a service-quality history. See our{" "}
        <Link
          href="/legal/privacy"
          className="underline hover:text-brand-800 dark:hover:text-brand-300"
        >
          Privacy Policy
        </Link>{" "}
        for retention details (Section 2.8 / 2.9).
      </p>
    </main>
  );
}
