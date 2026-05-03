import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — Print-on-Demand profit research",
  description:
    "Honest research on POD profit margins, vendor comparisons, and pricing strategy. Updated as the industry shifts.",
};

interface Post {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readingMinutes: number;
}

const POSTS: Post[] = [
  {
    slug: "how-much-profit-do-pod-sellers-make",
    title:
      "How much profit do print-on-demand sellers actually make? (2026 benchmarks)",
    description:
      "POD seller net margins range from 8% (newcomers under $500/mo) to 31% (top 5%). The methodology, the data, and the chart most calculators won't show you.",
    publishedAt: "2026-05-26",
    readingMinutes: 8,
  },
  {
    slug: "printful-vs-printify-profit-calculator",
    title:
      "Printful vs Printify Profit Calculator: Multi-Currency Side-by-Side (2026)",
    description:
      "Same product, both vendors, four currencies. The only side-by-side POD profit comparison that itemizes Etsy / Shopify fees in USD, EUR, GBP, and JPY.",
    publishedAt: "2026-05-26",
    readingMinutes: 6,
  },
];

export default function BlogIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 md:py-16">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
          Research notes
        </p>
        <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          Honest POD margin research
        </h1>
        <p className="mt-3 max-w-2xl text-stone-700 dark:text-stone-300">
          Numbers, methodology, and source dates — never marketing claims. New
          posts are added as the underlying calculator data is verified.
        </p>
      </header>

      <ul className="space-y-6">
        {POSTS.map((p) => (
          <li
            key={p.slug}
            className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900"
          >
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {p.publishedAt} · {p.readingMinutes} min read
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              <Link
                href={`/blog/${p.slug}`}
                className="hover:text-brand-800 dark:hover:text-brand-300"
              >
                {p.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
              {p.description}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
