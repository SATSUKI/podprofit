import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrSupabase } from "@/lib/supabase/ssr";
import { SignupEventEmitter } from "@/components/signup-event-emitter";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

interface AccountPageProps {
  searchParams: Promise<{ signup?: string; portal?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { signup, portal } = await searchParams;
  const isFirstSignup = signup === "1";
  const portalUnavailable = portal === "unavailable";
  const supabase = await createSsrSupabase();
  if (!supabase) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
          Authentication isn&apos;t configured yet (Supabase env vars missing).
        </p>
      </main>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Run plan, lifetime, and saved-calc reads in parallel — RLS guards them.
  const [
    { data: subscriptions },
    { data: lifetimeSeat },
    { data: calculations },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_type, status, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id),
    supabase
      .from("lifetime_seats")
      .select("seat_number, status, claimed_at")
      .eq("user_id", user.id)
      .eq("status", "claimed")
      .maybeSingle(),
    supabase
      .from("calculations")
      .select("id, share_slug, input_json, output_json, created_at, view_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const activePro = (subscriptions ?? []).find(
    (s) =>
      (s.plan_type === "pro_monthly" || s.plan_type === "pro_yearly") &&
      ["active", "trialing", "past_due", "paused", "incomplete"].includes(
        String(s.status),
      ),
  );
  const isLifetime = Boolean(lifetimeSeat);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <SignupEventEmitter enabled={isFirstSignup} />
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your account</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Signed in as <strong>{user.email}</strong>
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Plan + billing portal */}
      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-semibold">Plan</h2>
        {isLifetime ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800 dark:bg-brand-900 dark:text-brand-200">
              Lifetime member · seat #{lifetimeSeat?.seat_number}
            </span>
            <span className="text-sm text-stone-700 dark:text-stone-300">
              Every Pro feature, forever. No subscription to manage.
            </span>
          </div>
        ) : activePro ? (
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-stone-700 dark:text-stone-300">
              <strong className="text-stone-900 dark:text-stone-100">
                {activePro.plan_type === "pro_monthly"
                  ? "Pro · Monthly"
                  : "Pro · Annual"}
              </strong>
              <span className="ml-2 text-xs uppercase tracking-wide text-stone-500">
                {activePro.status}
              </span>
              {activePro.current_period_end ? (
                <span className="ml-2 text-stone-500">
                  Renews{" "}
                  {new Date(
                    String(activePro.current_period_end),
                  ).toLocaleDateString()}
                  {activePro.cancel_at_period_end ? " (will cancel)" : ""}
                </span>
              ) : null}
            </div>
            <form action="/api/stripe/portal" method="post">
              <button
                type="submit"
                className="rounded-md border border-brand-800 bg-white px-4 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-50 dark:border-brand-300 dark:bg-stone-900 dark:text-brand-300 dark:hover:bg-brand-900/20"
              >
                Manage subscription
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Free plan. Upgrade for unlimited saved calculations and CSV
              exports.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
            >
              See plans
            </Link>
          </div>
        )}
        {portalUnavailable ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            You don&apos;t have a paid subscription yet, so the billing portal
            isn&apos;t available.
          </p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Saved calculations</h2>
        {!calculations || calculations.length === 0 ? (
          <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
            No saved calculations yet. Run one from the{" "}
            <Link href="/" className="underline">
              calculator
            </Link>{" "}
            and click <em>Save</em>.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
            {calculations.map((c) => {
              const out = (c.output_json as { netProfitCents?: number; marginPercent?: number }) ?? {};
              return (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {typeof out.netProfitCents === "number"
                        ? `Net ${(out.netProfitCents / 100).toFixed(2)} · ${(out.marginPercent ?? 0).toFixed(1)}% margin`
                        : "Calculation"}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {new Date(c.created_at).toLocaleString()} · {c.view_count} views
                    </p>
                  </div>
                  <Link
                    href={`/c/${c.share_slug}`}
                    className="text-sm text-brand-800 hover:underline dark:text-brand-300"
                  >
                    Open →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
