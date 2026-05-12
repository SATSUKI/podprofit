import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to PODProfit to save calculations and access your account.",
  robots: { index: false, follow: false }, // not for SEO
};

/**
 * PODP-66 — user-facing error copy for `?error=` codes emitted by
 * `/auth/callback`. Keep messages short, neutral, and actionable; do NOT
 * leak Supabase internals or stack traces. The codes themselves are
 * defined in `src/app/auth/callback/route.ts`.
 */
const ERROR_MESSAGES: Record<string, string> = {
  missing_code:
    "That sign-in link was incomplete. Please request a fresh one below.",
  config_missing:
    "Sign-in is temporarily unavailable. Please try again in a few minutes.",
  exchange_failed:
    "That sign-in link has expired or was already used. Please request a fresh one below.",
  no_session:
    "We couldn't finish signing you in. Please request a fresh link below.",
  unexpected:
    "Something went wrong while signing you in. Please request a fresh link below.",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  const errorMessage =
    error && typeof error === "string" ? ERROR_MESSAGES[error] : undefined;
  // We surface the raw code in a data attribute so support + e2e tests can
  // pin which branch fired without parsing the human copy. The code itself
  // is one of a closed set, so it is safe to render.
  const errorCode = errorMessage && typeof error === "string" ? error : undefined;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Sign in to PODProfit</h1>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          We&apos;ll email you a one-time link. No password to remember.
        </p>
      </header>
      {errorMessage ? (
        <div
          role="alert"
          data-testid="login-callback-error"
          data-error-code={errorCode}
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200"
        >
          {errorMessage}
        </div>
      ) : null}
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="text-xs text-stone-500 dark:text-stone-400">
        New here? The same form creates your account on first sign-in.
      </p>
    </main>
  );
}
