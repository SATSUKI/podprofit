import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Refund audit log — write-side helper for `public.refund_audit_log`.
 *
 * Backs the admin refund UI (PODP-53) and the cooling-off SOP. Every
 * refund attempt — successful, failed, or in-flight — must produce one
 * row via this helper so we have a tamper-evident trail for:
 *
 *   - support replies citing the refund ID and reason,
 *   - monthly close / accounting reconciliation,
 *   - the 7-year legal retention obligation (ADR 0004),
 *   - chargeback dispute responses ("we already refunded on $date,
 *     here is the Stripe refund_id"),
 *   - admin forensics (which operator approved what, when).
 *
 * Reads (e.g. "show me this user's refund history") use a Supabase
 * client directly — the RLS policy on the table is enough to gate
 * "users can read their own rows".
 *
 * Schema: see `supabase/migrations/20260514_000011_refund_audit_log.sql`.
 * The argument validation below mirrors the table's CHECK constraints so
 * we fail fast in TypeScript rather than at the DB round-trip.
 */

/**
 * Stable reason codes. Must match the CHECK constraint on
 * `refund_audit_log.reason`. Adding a new code requires a migration.
 */
export const REFUND_REASONS = [
  "cooling_off_14_day",
  "no_proration_override",
  "product_not_downloaded",
  "goodwill",
  "bug_compensation",
  "duplicate_charge",
  "chargeback_pre_empt",
  "other",
] as const;

export type RefundReason = (typeof REFUND_REASONS)[number];

/**
 * Lifecycle of a refund attempt.
 *   - `attempted`: request sent to Stripe but we haven't yet confirmed
 *     success. Used briefly; webhook reconciliation flips it to
 *     `succeeded` / `failed`.
 *   - `succeeded`: Stripe returned success and we have a refund_id.
 *   - `failed`: Stripe returned an error. `notes` should explain.
 */
export const REFUND_STATUSES = ["attempted", "succeeded", "failed"] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

export interface RefundAuditEntry {
  /** End-user being refunded. Nullable for edge cases (test refunds). */
  user_id: string | null;
  /** Stripe payment_intent the refund applies to. Canonical correlation key. */
  stripe_payment_intent_id: string | null;
  /** Stripe refund_id once accepted. Required when status='succeeded'. */
  stripe_refund_id: string | null;
  /** Refund amount in the smallest currency unit (e.g. cents). > 0. */
  amount_cents: number;
  /** ISO 4217 lowercase (e.g. 'usd', 'gbp'). */
  currency: string;
  /** Why we refunded. */
  reason: RefundReason;
  /** Admin user who triggered. Null for system / webhook-driven refunds. */
  operator_id: string | null;
  /** Snapshot of operator email at write time — admin churn-resistant. */
  operator_email: string | null;
  /** Outcome of the attempt. */
  status: RefundStatus;
  /** Free-form notes (<= 2048 bytes). Required when reason='other'. */
  notes: string | null;
}

/** Result shape. Mirrors the table row plus a generated id / timestamp. */
export interface RefundAuditRow extends RefundAuditEntry {
  id: string;
  created_at: string;
}

export type LogRefundResult =
  | { ok: true; row: RefundAuditRow }
  | { ok: false; error: string };

/**
 * Pre-flight argument validation. Mirrors the SQL CHECK constraints so
 * misuse surfaces with a readable message before the DB round-trip.
 *
 * Returns an error string on the first violation found, or `null` if
 * the entry is well-formed.
 */
export function validateRefundEntry(entry: RefundAuditEntry): string | null {
  if (!Number.isInteger(entry.amount_cents) || entry.amount_cents <= 0) {
    return "amount_cents must be a positive integer (smallest currency unit).";
  }

  if (!/^[a-z]{3}$/.test(entry.currency)) {
    return "currency must be a 3-letter lowercase ISO 4217 code (e.g. 'usd').";
  }

  if (!REFUND_REASONS.includes(entry.reason)) {
    return `reason must be one of: ${REFUND_REASONS.join(", ")}.`;
  }

  if (!REFUND_STATUSES.includes(entry.status)) {
    return `status must be one of: ${REFUND_STATUSES.join(", ")}.`;
  }

  if (entry.reason === "other") {
    if (entry.notes === null || entry.notes.trim().length === 0) {
      return "notes is required when reason='other'.";
    }
  }

  if (entry.notes !== null && Buffer.byteLength(entry.notes, "utf8") > 2048) {
    return "notes exceeds 2048-byte limit.";
  }

  if (entry.status === "succeeded" && !entry.stripe_refund_id) {
    return "stripe_refund_id is required when status='succeeded'.";
  }

  if (entry.status === "failed" && entry.stripe_refund_id) {
    return "stripe_refund_id must be null when status='failed'.";
  }

  // operator_id and operator_email travel together: it is fine for both
  // to be null (system-driven refund), but if we know one we should know
  // the other for forensic readability.
  if (
    (entry.operator_id !== null && entry.operator_email === null) ||
    (entry.operator_id === null && entry.operator_email !== null)
  ) {
    return "operator_id and operator_email must both be set or both be null.";
  }

  return null;
}

/**
 * Append one row to `refund_audit_log`. Caller is responsible for
 * supplying a Supabase client with write permission (service_role from
 * server context — admin API route or webhook handler).
 *
 * Returns a tagged result rather than throwing so the admin UI can show
 * the error inline without an exception boundary.
 *
 * Note: this helper does NOT call Stripe. The expected flow is:
 *   1. Admin clicks "refund" in the UI.
 *   2. Server calls `logRefundAttempt({ status: 'attempted', ... })`.
 *   3. Server calls Stripe `refunds.create(...)`.
 *   4. Server calls `logRefundAttempt({ status: 'succeeded'|'failed', ... })`
 *      with the resulting refund_id.
 *
 * The two-row pattern is intentional: if step 3 hangs or the process
 * dies, we still have the `attempted` row to reconcile against Stripe.
 */
export async function logRefundAttempt(
  supabase: SupabaseClient,
  entry: RefundAuditEntry,
): Promise<LogRefundResult> {
  const validationError = validateRefundEntry(entry);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  // We deliberately do NOT chain `.select().single()` here. The admin UI
  // surfaces the row from a follow-up read against the same table (gated
  // by RLS) — keeping the write path single-op simplifies retry semantics
  // and avoids the read-after-write quorum surprises that bit us on the
  // founding_members claim flow.
  const { error } = await supabase.from("refund_audit_log").insert(entry);

  if (error) {
    return { ok: false, error: error.message };
  }

  // The caller can re-read with the (user_id, created_at desc) index if
  // they need the materialised row; we return the entry as-supplied so
  // the UI can echo it back without an extra round-trip.
  return {
    ok: true,
    row: {
      ...entry,
      // id / created_at are server-assigned; surface placeholders so the
      // type stays honest. Callers that need the real values must re-read.
      id: "",
      created_at: "",
    },
  };
}
