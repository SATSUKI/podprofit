"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils/cn";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting" || state === "ok") return;
    setState("submitting");
    setErrorMsg(null);
    try {
      const supabase = getBrowserSupabase();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setErrorMsg(error.message);
        setState("error");
        return;
      }
      setState("ok");
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Sign-in is not configured yet. Please come back after launch (W6).",
      );
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <div className="rounded-xl border border-brand-800/20 bg-brand-50 p-5 text-sm dark:border-brand-700/40 dark:bg-brand-900/30">
        <p className="font-medium text-brand-800 dark:text-brand-200">
          ✓ Check your inbox.
        </p>
        <p className="mt-1 text-stone-700 dark:text-stone-300">
          We sent a one-time link to <strong>{email}</strong>. Click it to sign in.
          The link expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 dark:border-stone-700 dark:bg-stone-900"
        />
      </label>
      <button
        type="submit"
        disabled={state === "submitting"}
        className={cn(
          "rounded-md bg-brand-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 dark:bg-brand-300 dark:text-brand-900",
          state === "submitting" ? "opacity-60" : "hover:bg-brand-700 dark:hover:bg-brand-200",
        )}
      >
        {state === "submitting" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {state === "error" && errorMsg && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
      )}
    </form>
  );
}
