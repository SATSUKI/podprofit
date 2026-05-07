import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white/40 dark:border-stone-800 dark:bg-stone-950/40">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-stone-600 sm:flex-row sm:items-center dark:text-stone-400">
        <div>
          <p>
            Built in public by{" "}
            <a href="mailto:hello@getpodprofit.com" className="underline">
              Satsuki Okazaki
            </a>
            {" · "}
            <a href="https://github.com/SATSUKI/podprofit" className="underline">
              source on GitHub
            </a>
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-500">
            Calculations are estimates. Always verify before listing.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/faq" className="hover:text-brand-800 dark:hover:text-brand-300">
            FAQ
          </Link>
          <Link href="/legal/terms" className="hover:text-brand-800 dark:hover:text-brand-300">
            Terms
          </Link>
          <Link href="/legal/privacy" className="hover:text-brand-800 dark:hover:text-brand-300">
            Privacy
          </Link>
          <Link href="/legal/refunds" className="hover:text-brand-800 dark:hover:text-brand-300">
            Refunds
          </Link>
          <Link href="/legal/tokushoho" className="hover:text-brand-800 dark:hover:text-brand-300">
            特商法
          </Link>
          <Link href="/contact" className="hover:text-brand-800 dark:hover:text-brand-300">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
