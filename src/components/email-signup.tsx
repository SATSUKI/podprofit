"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function EmailSignup({
  source = "lead_magnet",
  headline = "Get the POD Margin Cheat Sheet",
  subline = "20 products, 6 currencies, every fee. Sent once, no spam.",
}: {
  source?: string;
  headline?: string;
  subline?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting" || state === "ok") return;
    setState("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(body.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState("ok");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="rounded-2xl border border-brand-800/20 bg-brand-50 p-6 dark:border-brand-700/40 dark:bg-brand-900/30">
      <h3 className="text-lg font-semibold text-brand-800 dark:text-brand-200">
        {headline}
      </h3>
      <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
        {subline}
      </p>
      {state === "ok" ? (
        <p className="mt-4 text-sm font-medium text-brand-800 dark:text-brand-300">
          ✓ Got it — check your inbox in the next few minutes.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {state === "submitting" ? "Sending…" : "Send it to me"}
          </button>
        </form>
      )}
      {state === "error" && errorMsg && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
