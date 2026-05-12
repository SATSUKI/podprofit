import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadKpiSnapshot } from "@/lib/admin/kpis";
import { AdminShell, KpiCard, AdminNavCard } from "./_ui";

/**
 * `/admin` — KPI dashboard + nav (PODP-53 v1 minimum).
 *
 * Auth: gated by `src/middleware.ts` (PODP-29 Basic auth). No additional
 * per-page check needed — middleware fails closed for all `/admin/*`.
 *
 * Why service_role here:
 *   - The dashboard reads cross-user aggregates (Lifetime seats taken,
 *     open inquiries, recent refunds, webhook pulse). RLS would either
 *     hide the rows from the admin or require a per-table policy
 *     exception. service_role is the simplest correct answer for a
 *     Basic-auth-gated CEO surface.
 *   - service_role is intentionally NOT exposed to client components;
 *     this is a Server Component, so the key stays on the server.
 *
 * SEO: `noindex,nofollow` — admin is private even though Basic auth
 * already gates it. Defense in depth against a misconfigured deploy.
 */

export const metadata: Metadata = {
  title: "Admin — PODProfit",
  robots: { index: false, follow: false },
};

// Admin pages are inherently dynamic (per-request data + auth header).
// Force dynamic so Next doesn't try to statically generate them.
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = createServerSupabase();
  const kpi = await loadKpiSnapshot(supabase);

  const lifetimeValue =
    kpi.lifetimeClaimed === null
      ? "—"
      : `${kpi.lifetimeClaimed} / ${kpi.lifetimeTotal}`;
  const inquiriesTone =
    (kpi.inquiriesNew ?? 0) > 0 ? "alert" : "neutral";
  const inquiriesValue =
    kpi.inquiriesNew === null ? "—" : kpi.inquiriesNew;
  const webhooksValue =
    kpi.webhookEventsToday === null ? "—" : kpi.webhookEventsToday;
  const refundsValue = kpi.refundsLast7d === null ? "—" : kpi.refundsLast7d;

  return (
    <AdminShell title="Dashboard">
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="Lifetime claimed"
          value={lifetimeValue}
          hint="Seats sold; cap 100. Refunds free the slot back."
        />
        <KpiCard
          label="Inquiries to triage"
          value={inquiriesValue}
          hint="status='new' in /contact form submissions"
          tone={inquiriesTone}
        />
        <KpiCard
          label="Webhook events today"
          value={webhooksValue}
          hint="Stripe deliveries since 00:00 UTC"
        />
        <KpiCard
          label="Refunds (7d)"
          value={refundsValue}
          hint="Rows in refund_audit_log (any status)"
        />
      </section>

      <section
        aria-label="Subsections"
        className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <AdminNavCard
          href="/admin/inquiries"
          title="Inquiries"
          description="Triage /contact submissions, update status, draft replies."
        />
        <AdminNavCard
          href="/admin/refunds"
          title="Refunds"
          description="Look up a charge by email or payment intent and refund within the cooling-off window."
        />
        <AdminNavCard
          href="/admin"
          title="More (post-launch)"
          description="Webhook log, founding members, user management, full audit log — coming soon."
        />
      </section>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        <p>
          <strong>v1 minimum.</strong> This dashboard ships the
          cooling-off-period must-haves (Inquiries + Refunds). Webhook
          log browsing, founding-member moderation, full user search,
          and audit-log viewing are post-launch.
        </p>
      </section>
    </AdminShell>
  );
}
