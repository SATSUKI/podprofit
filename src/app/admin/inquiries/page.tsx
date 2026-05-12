import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  INQUIRY_STATUSES,
  isInquiryStatus,
  listInquiries,
  getInquiryById,
  normaliseLimit,
  type InquiryRow,
  type InquiryStatus,
} from "@/lib/admin/inquiries";
import { AdminShell, Banner } from "../_ui";

/**
 * `/admin/inquiries` — list + inline detail (PODP-53 v1 minimum).
 *
 * Routing pattern: instead of `/admin/inquiries/[id]` we use a `?id=`
 * query param so the detail panel renders right next to the list with a
 * single round-trip. List + detail in one component beats a nested
 * route here because the dataset is small (< few hundred rows at
 * launch) and the UX is closer to an inbox.
 *
 * Status updates POST to `/api/admin/inquiries/[id]` which then
 * redirects back here with a `?saved=` flash query. Middleware guards
 * both surfaces.
 */

export const metadata: Metadata = {
  title: "Inquiries — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    id?: string;
    limit?: string;
    saved?: string;
    error?: string;
  }>;
}

export default async function AdminInquiriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter: InquiryStatus | "all" =
    params.status === "all"
      ? "all"
      : isInquiryStatus(params.status)
      ? params.status
      : "new";
  const limit = normaliseLimit(params.limit);

  const supabase = createServerSupabase();
  const { rows, error } = await listInquiries(supabase, {
    status: statusFilter,
    limit,
  });

  const detail = params.id ? await getInquiryById(supabase, params.id) : null;

  // Next.js auto-decodes searchParams; the route handler also passes
  // values to URLSearchParams.set which encodes once — so `params.error`
  // is already plain text here.
  const flash = params.saved
    ? { tone: "success" as const, text: "Saved." }
    : params.error
    ? { tone: "error" as const, text: params.error }
    : null;

  return (
    <AdminShell title="Inquiries" backHref="/admin">
      {flash ? <Banner tone={flash.tone}>{flash.text}</Banner> : null}
      {error ? <Banner tone="error">Load failed: {error}</Banner> : null}

      <nav
        aria-label="Status filter"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm"
      >
        <span className="text-stone-500 dark:text-stone-400">Filter:</span>
        {(["all", ...INQUIRY_STATUSES] as const).map((s) => {
          const active = statusFilter === s;
          return (
            <Link
              key={s}
              href={
                s === "new"
                  ? "/admin/inquiries"
                  : `/admin/inquiries?status=${s}`
              }
              className={
                active
                  ? "rounded-md bg-brand-800 px-2 py-1 text-white dark:bg-brand-300 dark:text-brand-900"
                  : "rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }
            >
              {s}
            </Link>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <InquiryList rows={rows} activeId={detail?.id ?? null} />
        <InquiryDetail row={detail} />
      </div>
    </AdminShell>
  );
}

function InquiryList({
  rows,
  activeId,
}: {
  rows: InquiryRow[];
  activeId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
        No inquiries match the current filter.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
      {rows.map((row) => {
        const active = row.id === activeId;
        return (
          <li
            key={row.id}
            className={
              active
                ? "bg-brand-50 dark:bg-brand-900/20"
                : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
            }
          >
            <Link
              href={`/admin/inquiries?status=all&id=${row.id}`}
              className="block px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  {row.email}
                </span>
                <StatusBadge status={row.status} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="rounded bg-stone-100 px-1.5 py-0.5 dark:bg-stone-800">
                  {row.category}
                </span>
                <span>{new Date(row.created_at).toLocaleString()}</span>
              </div>
              {row.subject ? (
                <p className="mt-1 truncate text-sm text-stone-700 dark:text-stone-300">
                  {row.subject}
                </p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function InquiryDetail({ row }: { row: InquiryRow | null }) {
  if (!row) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-500">
        Pick an inquiry from the list to see the full message and reply.
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {row.subject ?? "(no subject)"}
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            <span className="font-medium">{row.email}</span>
            {row.name ? <span> · {row.name}</span> : null}
            <span> · {row.category}</span>
          </p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-500">
            id: <code className="font-mono">{row.id}</code>
          </p>
        </div>
        <StatusBadge status={row.status} />
      </header>

      <section className="mb-6 rounded-md bg-stone-50 p-4 text-sm whitespace-pre-wrap text-stone-800 dark:bg-stone-800/50 dark:text-stone-200">
        {row.message}
      </section>

      {row.user_id ? (
        <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
          Submitted by authenticated user:{" "}
          <code className="font-mono">{row.user_id}</code>
        </p>
      ) : (
        <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
          Anonymous submission.{" "}
          {row.ip_address ? (
            <>
              IP: <code className="font-mono">{row.ip_address}</code>
            </>
          ) : null}
        </p>
      )}

      <form
        action={`/api/admin/inquiries/${row.id}`}
        method="post"
        className="space-y-4"
      >
        <label className="block text-sm">
          <span className="font-medium text-stone-900 dark:text-stone-100">
            Status
          </span>
          <select
            name="status"
            defaultValue={row.status}
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-800"
          >
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-stone-900 dark:text-stone-100">
            Reply notes (internal — also sets <code>replied_at</code> when
            &quot;Mark replied&quot; is checked)
          </span>
          <textarea
            name="reply_message"
            rows={6}
            defaultValue={row.reply_message ?? ""}
            maxLength={10000}
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 font-mono text-xs dark:border-stone-700 dark:bg-stone-800"
            placeholder="Paste the reply you sent, or notes for future you."
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="mark_replied"
            value="1"
            defaultChecked={Boolean(row.replied_at)}
            className="h-4 w-4 rounded border-stone-300"
          />
          <span>
            Mark replied (sets <code>replied_at</code>; uncheck to clear)
          </span>
        </label>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-900 dark:hover:bg-brand-200"
          >
            Save
          </button>
          <Link
            href="/admin/inquiries?status=all"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
          >
            Back to list
          </Link>
        </div>
      </form>

      {row.replied_at ? (
        <p className="mt-4 text-xs text-emerald-700 dark:text-emerald-400">
          Replied at {new Date(row.replied_at).toLocaleString()}
        </p>
      ) : null}
    </article>
  );
}

const STATUS_BADGE_CLASS: Record<InquiryStatus, string> = {
  new: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  in_progress:
    "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
  replied:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  archived: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200",
  spam: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

function StatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE_CLASS[status]}`}
    >
      {status}
    </span>
  );
}
