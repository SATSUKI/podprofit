import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to PODProfit to save calculations and access your account.",
  robots: { index: false, follow: false }, // not for SEO
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Sign in to PODProfit</h1>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          We&apos;ll email you a one-time link. No password to remember.
        </p>
      </header>
      <LoginForm />
      <p className="text-xs text-stone-500 dark:text-stone-400">
        New here? The same form creates your account on first sign-in.
      </p>
    </main>
  );
}
