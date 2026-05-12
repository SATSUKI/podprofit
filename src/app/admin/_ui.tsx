import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Shared admin layout primitives (PODP-53 v1 minimum).
 *
 * Why a tiny in-route component module instead of `src/components/admin/`?
 *   - The admin surface is single-operator (CEO) and post-launch we expect
 *     it to grow in its own direction (filters, charts, batch tools) that
 *     don't share much with the public site.
 *   - Keeping the building blocks colocated under `src/app/admin/_ui.tsx`
 *     makes "delete the whole admin surface" a single `rm -rf` operation
 *     if we ever rip-and-replace.
 *   - The `_` prefix opts the file out of Next.js routing (no `/admin/_ui`
 *     URL is generated), so this stays a private helper module.
 *
 * Visual language: reuse the existing `/account` palette (stone-50 / brand)
 * so the admin surface "feels like PODProfit" without the design polish
 * burden of bespoke chrome. Mobile is best-effort — admin is a desktop
 * CEO tool, not a customer-facing surface.
 */

export function AdminShell({
  title,
  children,
  backHref,
}: {
  title: string;
  children: ReactNode;
  /** When set, render a "← back to /admin" anchor next to the title. */
  backHref?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            admin
          </span>
        </div>
        {backHref ? (
          <Link
            href={backHref}
            className="text-sm text-brand-800 hover:underline dark:text-brand-300"
          >
            ← back
          </Link>
        ) : null}
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  /**
   * `alert` flips the value to amber when non-zero is "needs attention"
   * (e.g. open inquiries, pending refunds). `neutral` is the default
   * read-only stat colour.
   */
  tone?: "neutral" | "alert" | "good";
}) {
  const toneClass = {
    neutral: "text-stone-900 dark:text-stone-100",
    alert: "text-amber-700 dark:text-amber-400",
    good: "text-emerald-700 dark:text-emerald-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-bold tabular-nums", toneClass)}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AdminNavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-700 dark:hover:bg-brand-900/10"
    >
      <span className="text-lg font-semibold text-stone-900 group-hover:text-brand-800 dark:text-stone-100 dark:group-hover:text-brand-300">
        {title} →
      </span>
      <span className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        {description}
      </span>
    </Link>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "info" | "success" | "error";
  children: ReactNode;
}) {
  const toneClass = {
    info: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
    success:
      "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
    error:
      "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("mb-6 rounded-md px-3 py-2 text-sm", toneClass)}
    >
      {children}
    </div>
  );
}
