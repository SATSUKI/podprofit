"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type FormState = "idle" | "submitting" | "ok" | "error";

const MAX_MESSAGE_CHARS = 5000;

const CATEGORIES: { value: string; label: string }[] = [
  { value: "bug", label: "Bug report" },
  { value: "refund", label: "Refund request" },
  { value: "feature_request", label: "Feature request" },
  { value: "pricing", label: "Pricing question" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setCategory("general");
    setSubject("");
    setMessage("");
    setWebsite("");
    setErrorMsg(null);
    setState("idle");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          category,
          subject: subject.trim() || undefined,
          message: message.trim(),
          website,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        if (res.status === 429) {
          setErrorMsg(
            "You've sent several inquiries recently. Please try again in an hour.",
          );
        } else if (res.status === 400) {
          setErrorMsg(
            body.detail ?? "Please check the form fields and try again.",
          );
        } else {
          setErrorMsg("Something went wrong on our side. Please try again.");
        }
        setState("error");
        return;
      }
      setState("ok");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <div className="mt-8 rounded-2xl border border-brand-800/20 bg-brand-50 p-6 dark:border-brand-700/40 dark:bg-brand-900/30">
        <p className="text-base font-semibold text-brand-800 dark:text-brand-200">
          Thank you — we&apos;ll respond within 3 business days.
        </p>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          A copy of your message is stored against the email you provided. If you
          spot something else you wanted to add, you can send another below.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md bg-brand-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <div>
        <label
          htmlFor="contact-name"
          className="block text-sm font-medium text-stone-800 dark:text-stone-200"
        >
          Name <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <input
          id="contact-name"
          type="text"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 dark:border-stone-700 dark:bg-stone-900"
          placeholder="What should we call you?"
        />
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-stone-800 dark:text-stone-200"
        >
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 dark:border-stone-700 dark:bg-stone-900"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="contact-category"
          className="block text-sm font-medium text-stone-800 dark:text-stone-200"
        >
          Category
        </label>
        <select
          id="contact-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 dark:border-stone-700 dark:bg-stone-900"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="contact-subject"
          className="block text-sm font-medium text-stone-800 dark:text-stone-200"
        >
          Subject <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <input
          id="contact-subject"
          type="text"
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 dark:border-stone-700 dark:bg-stone-900"
          placeholder="Etsy fee calculation looks off when ads are on"
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-stone-800 dark:text-stone-200"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={8}
          maxLength={MAX_MESSAGE_CHARS}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 dark:border-stone-700 dark:bg-stone-900"
          placeholder="What happened, what did you expect, and how can we reach you for follow-up?"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
          <span>10 characters minimum.</span>
          <span aria-live="polite">
            {message.length} / {MAX_MESSAGE_CHARS}
          </span>
        </div>
      </div>

      {/* Honeypot. Hidden from sighted users + screen readers. Bots that fill
          every input will set this and be silently classified as spam. */}
      <div aria-hidden="true" className="sr-only" style={{ display: "none" }}>
        <label htmlFor="contact-website">
          Website (leave blank)
          <input
            id="contact-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {state === "error" && errorMsg && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className={cn(
          "rounded-md bg-brand-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 dark:bg-brand-300 dark:text-brand-900",
          state === "submitting"
            ? "opacity-60"
            : "hover:bg-brand-700 dark:hover:bg-brand-200",
        )}
      >
        {state === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
