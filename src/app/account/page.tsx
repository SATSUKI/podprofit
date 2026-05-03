import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrSupabase } from "@/lib/supabase/ssr";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createSsrSupabase();
  if (!supabase) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
          Authentication isn&apos;t configured yet (Supabase env vars missing).
          Per project plan, this lands during W6 (2026-06-04+).
        </p>
      </main>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Load the user's saved calculations (RLS ensures owner-only read).
  const { data: calculations } = await supabase
    .from("calculations")
    .select("id, share_slug, input_json, output_json, created_at, view_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
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
