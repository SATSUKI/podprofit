import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  findRefundCandidates,
  type RefundCandidate,
} from "@/lib/admin/refund-lookup";
import { REFUND_REASONS } from "@/lib/refund/audit-log";
import { LIFETIME_REFUND_PRICE_USD_CENTS } from "@/lib/refund/pricing";
import { AdminShell, Banner } from "../_ui";

/**
 * `/admin/refunds` — search + refund (PODP-53 v1 minimum).
 *
 * Single-page flow: GET with `?q=` runs `findRefundCandidates`; each
 * candidate renders a "Refund" form that POSTs to
 * `/api/admin/refunds/issue` which:
 *   1. logs an `attempted` row in refund_audit_log,
 *   2. calls Stripe `refunds.create`,
 *   3. updates the row to `succeeded` / `failed`.
 *
 * The Lifetime seat is freed by the existing `charge.refunded` webhook
 * handler — we do not double-write the seat status from this page.
 *
 * Currency: all known Lifetime / Pro prices are in USD at launch.
 * The form lets the operator override the amount and pick a reason from
 * the canonical enum.
 */

export const metadata: Metadata = {
  title: "Refunds — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    issued?: string;
    error?: string;
  }>;
}

export default async function AdminRefundsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const supabase = createServerSupabase();
  const result = query
    ? await findRefundCandidates(supabase, query)
    : null;

  const flash = params.issued
    ? {
        tone: "success" as const,
        text: `Refund issued (refund_id ${params.issued}).`,
      }
    : params.error
    ? { tone: "error" as const, text: params.error }
    : null;

  return (
    <AdminShell title="Refunds" backHref="/admin">
      {flash ? <Banner tone={flash.tone}>{flash.text}</Banner> : null}

      <form
        action="/admin/refunds"
        method="get"
        className="mb-8 flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-900 dark:text-stone-100">
            Search (email, user_id, or pi_…)
          </span>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="alice@example.com  ·  pi_3PqA…  ·  64f2…"
            className="w-96 rounded-md border border-stone-300 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-800"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
        >
          Look up
        </button>
      </form>

      {result ? (
        <section className="space-y-6">
          <header className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm dark:border-stone-800 dark:bg-stone-900/50">
            <p>
              <span className="text-stone-500 dark:text-stone-400">
                Resolved kind:
              </span>{" "}
              <code className="font-mono">{result.query.kind}</code>
            </p>
            {result.user ? (
              <p className="mt-1">
                <span className="text-stone-500 dark:text-stone-400">
                  User:
                </span>{" "}
                <code className="font-mono">{result.user.id}</code>
                {result.user.email ? <> · {result.user.email}</> : null}
                {result.user.stripe_customer_id ? (
                  <>
                    {" "}
                    ·{" "}
                    <code className="font-mono text-xs text-stone-500">
                      {result.user.stripe_customer_id}
                    </code>
                  </>
                ) : null}
              </p>
            ) : null}
            {result.error ? (
              <p className="mt-2 text-amber-700 dark:text-amber-400">
                {result.error}
              </p>
            ) : null}
          </header>

          {result.candidates.map((c) => (
            <CandidateCard
              key={candidateKey(c)}
              candidate={c}
              userId={result.user?.id ?? null}
              userEmail={result.user?.email ?? null}
            />
          ))}
        </section>
      ) : (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Enter a search above to look up refundable charges.
        </p>
      )}
    </AdminShell>
  );
}

function candidateKey(c: RefundCandidate): string {
  return c.kind === "lifetime"
    ? `lifetime-${c.seat_number}`
    : `sub-${c.stripe_subscription_id ?? c.plan_type}`;
}

function CandidateCard({
  candidate,
  userId,
  userEmail,
}: {
  candidate: RefundCandidate;
  userId: string | null;
  userEmail: string | null;
}) {
  const isLifetime = candidate.kind === "lifetime";
  const eligible = candidate.eligibility.eligible;
  const headerTone = eligible
    ? "border-emerald-300 dark:border-emerald-700"
    : "border-amber-300 dark:border-amber-700";

  // Suggested defaults: Lifetime refund = $149 (cents), reason cooling-off.
  const defaultAmountCents = isLifetime ? LIFETIME_REFUND_PRICE_USD_CENTS : 0;
  const defaultReason: (typeof REFUND_REASONS)[number] = isLifetime
    ? "cooling_off_14_day"
    : "no_proration_override";

  return (
    <article
      className={`rounded-2xl border-2 bg-white p-5 dark:bg-stone-900 ${headerTone}`}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {isLifetime
            ? `Lifetime · seat #${candidate.seat_number}`
            : candidate.plan_type === "pro_monthly"
            ? "Pro · Monthly"
            : "Pro · Annual"}
        </h2>
        <span
          className={
            eligible
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
          }
        >
          {eligible ? "eligible" : "not eligible"} · {candidate.eligibility.reason}
        </span>
      </header>

      <p className="mb-3 text-sm text-stone-700 dark:text-stone-300">
        {candidate.eligibility.detail}
      </p>

      <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
        {isLifetime ? (
          <>
            <dt>payment_intent</dt>
            <dd className="font-mono">{candidate.payment_intent_id ?? "—"}</dd>
            <dt>claimed_at</dt>
            <dd>{new Date(candidate.claimed_at).toLocaleString()}</dd>
          </>
        ) : (
          <>
            <dt>subscription</dt>
            <dd className="font-mono">
              {candidate.stripe_subscription_id ?? "—"}
            </dd>
            <dt>status</dt>
            <dd>{candidate.status}</dd>
            <dt>current_period_end</dt>
            <dd>
              {candidate.current_period_end
                ? new Date(candidate.current_period_end).toLocaleString()
                : "—"}
            </dd>
          </>
        )}
      </dl>

      {isLifetime ? (
        <form
          action="/api/admin/refunds/issue"
          method="post"
          className="space-y-3 border-t border-stone-200 pt-4 dark:border-stone-800"
        >
          <input type="hidden" name="kind" value="lifetime" />
          <input
            type="hidden"
            name="seat_number"
            value={candidate.seat_number}
          />
          <input
            type="hidden"
            name="payment_intent_id"
            value={candidate.payment_intent_id ?? ""}
          />
          <input type="hidden" name="user_id" value={userId ?? ""} />
          <input type="hidden" name="user_email" value={userEmail ?? ""} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium">Amount (cents)</span>
              <input
                type="number"
                name="amount_cents"
                defaultValue={defaultAmountCents}
                min={1}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-800"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Reason</span>
              <select
                name="reason"
                defaultValue={defaultReason}
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-800"
              >
                {REFUND_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Notes (required when reason=other)</span>
            <textarea
              name="notes"
              rows={2}
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 font-mono text-xs dark:border-stone-700 dark:bg-stone-800"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className={
                eligible
                  ? "rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
                  : "rounded-md bg-amber-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 dark:bg-amber-300 dark:text-amber-900 dark:hover:bg-amber-200"
              }
            >
              {eligible ? "Refund" : "Refund (override)"}
            </button>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Issues Stripe refund + logs to refund_audit_log. Seat is
              re-pooled by the charge.refunded webhook.
            </span>
          </div>
        </form>
      ) : (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Subscriptions are not prorated automatically. To issue a
          goodwill refund on a specific invoice, refund directly in the
          Stripe dashboard — that path is intentionally out-of-scope for
          v1 (we do not store invoice ids server-side).
        </p>
      )}
    </article>
  );
}
