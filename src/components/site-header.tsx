import Link from "next/link";
import { createSsrSupabase } from "@/lib/supabase/ssr";

/**
 * SiteHeader — global navigation rendered in the root layout (PODP-63).
 *
 * Why a Server Component:
 *  CEO 2026-05-12 review surfaced a launch-blocker UX bug — the /login
 *  page existed but no Sign in link did, so a paying visitor literally
 *  could not find the door. The fix needs the auth session at request
 *  time so the right side of the nav switches between "Sign in" (anon)
 *  and "Account" (signed-in). That requires reading cookies, which a
 *  Client Component can't do safely.
 *
 *  We deliberately keep the visual surface tiny — one link on the right,
 *  no avatar/dropdown. The launch goal is "users can find their way to
 *  /login and /account". Anything richer is a post-launch follow-up.
 *
 *  When Supabase env vars aren't configured (`createSsrSupabase` returns
 *  null) we render the anonymous variant — the calculator works without
 *  auth, so the header still needs to render.
 */
export async function SiteHeader() {
  const supabase = await createSsrSupabase();
  let isSignedIn = false;
  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isSignedIn = Boolean(user);
    } catch {
      // getUser() can throw transiently (e.g. JWT expired mid-request).
      // Treat as anonymous so we still render a Sign in link rather than
      // a broken header.
      isSignedIn = false;
    }
  }

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
        <nav
          aria-label="Primary"
          className="flex items-center gap-5 text-sm text-stone-700 dark:text-stone-300"
        >
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
          {isSignedIn ? (
            <Link
              href="/account"
              data-testid="nav-account"
              className="rounded-md border border-stone-300 px-3 py-1 font-medium hover:border-brand-800 hover:text-brand-800 dark:border-stone-700 dark:hover:border-brand-300 dark:hover:text-brand-300"
            >
              Account
            </Link>
          ) : (
            <Link
              href="/login"
              data-testid="nav-signin"
              className="rounded-md border border-stone-300 px-3 py-1 font-medium hover:border-brand-800 hover:text-brand-800 dark:border-stone-700 dark:hover:border-brand-300 dark:hover:text-brand-300"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
