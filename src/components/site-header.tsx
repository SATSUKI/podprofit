import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-stone-800 dark:bg-stone-950/80 dark:supports-[backdrop-filter]:bg-stone-950/60">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-800 font-mono text-sm text-white dark:bg-brand-300 dark:text-brand-900"
          >
            P$
          </span>
          <span>PODProfit</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-stone-700 dark:text-stone-300">
          <Link href="/" className="hover:text-brand-800 dark:hover:text-brand-300">
            Calculator
          </Link>
          <Link href="/pricing" className="hover:text-brand-800 dark:hover:text-brand-300">
            Pricing
          </Link>
          <Link
            href="/blog/how-much-profit-do-pod-sellers-make"
            className="hidden sm:inline hover:text-brand-800 dark:hover:text-brand-300"
          >
            Blog
          </Link>
        </nav>
      </div>
    </header>
  );
}
