import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import {
  logRefundAttempt,
  REFUND_REASONS,
  type RefundReason,
} from "@/lib/refund/audit-log";
import {
  LIFETIME_REFUND_CURRENCY,
} from "@/lib/refund/pricing";

export const runtime = "nodejs";

/**
 * POST /api/admin/refunds/issue — issue a Stripe refund + audit log.
 *
 * Auth: middleware Basic auth gates `/api/admin/*` (PODP-53).
 *
 * Flow (intentionally two writes against `refund_audit_log`):
 *   1. Validate form input. Bail on bad shape before touching Stripe.
 *   2. INSERT `attempted` row so we have a tamper-evident "we tried" log
 *      even if step 3 hangs.
 *   3. POST Stripe refund. On success: INSERT `succeeded` row with
 *      the refund_id. On failure: INSERT `failed` row with notes.
 *   4. 303-redirect to /admin/refunds with a flash query.
 *
 * We intentionally don't update the lifetime_seats status here — the
 * existing `charge.refunded` webhook handler (src/lib/stripe/audit-events.ts)
 * does that idempotently. Doing it twice from two paths invites races.
 *
 * Form fields:
 *   - kind: "lifetime" (subscription path is v2 / Stripe dashboard for now)
 *   - payment_intent_id: pi_… (canonical Stripe correlation id)
 *   - user_id: uuid (optional; logged for audit)
 *   - user_email: text (optional; not currently used)
 *   - amount_cents: positive integer
 *   - reason: refund_reason enum
 *   - notes: text (required when reason='other')
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();

  const kind = form.get("kind");
  const piRaw = form.get("payment_intent_id");
  const userIdRaw = form.get("user_id");
  const userEmailRaw = form.get("user_email");
  const amountRaw = form.get("amount_cents");
  const reasonRaw = form.get("reason");
  const notesRaw = form.get("notes");

  if (kind !== "lifetime") {
    return redirect(req, {
      error: "Only lifetime refunds are supported in v1.",
    });
  }

  const payment_intent_id =
    typeof piRaw === "string" && piRaw.length > 0 ? piRaw : null;
  if (!payment_intent_id) {
    return redirect(req, { error: "Missing payment_intent_id." });
  }
  if (!/^pi_[A-Za-z0-9]+$/.test(payment_intent_id)) {
    return redirect(req, {
      error: "payment_intent_id does not look like a Stripe pi_ id.",
    });
  }

  const amount_cents =
    typeof amountRaw === "string" ? Number.parseInt(amountRaw, 10) : NaN;
  if (!Number.isInteger(amount_cents) || amount_cents <= 0) {
    return redirect(req, { error: "amount_cents must be a positive integer." });
  }

  if (
    typeof reasonRaw !== "string" ||
    !(REFUND_REASONS as readonly string[]).includes(reasonRaw)
  ) {
    return redirect(req, { error: "Invalid refund reason." });
  }
  const reason = reasonRaw as RefundReason;

  const notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0
      ? notesRaw.trim()
      : null;
  if (reason === "other" && !notes) {
    return redirect(req, {
      error: "notes is required when reason='other'.",
    });
  }

  const user_id =
    typeof userIdRaw === "string" && userIdRaw.length > 0 ? userIdRaw : null;
  const user_email =
    typeof userEmailRaw === "string" && userEmailRaw.length > 0
      ? userEmailRaw
      : null;

  const supabase = createServerSupabase();

  // Step 2: log the attempt before hitting Stripe.
  const attempted = await logRefundAttempt(supabase, {
    user_id,
    stripe_payment_intent_id: payment_intent_id,
    stripe_refund_id: null,
    amount_cents,
    currency: LIFETIME_REFUND_CURRENCY,
    reason,
    operator_id: null,
    operator_email: null,
    status: "attempted",
    notes:
      notes ??
      `Admin UI refund · kind=lifetime · for user_email=${user_email ?? "unknown"}`,
  });
  if (!attempted.ok) {
    return redirect(req, {
      error: `Audit log write failed: ${attempted.error}`,
    });
  }

  // Step 3: Stripe refund.
  let refundId: string | null = null;
  let stripeError: string | null = null;
  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      amount: amount_cents,
      // Map our internal reason to Stripe's narrow reason enum where
      // it makes sense; everything else becomes "requested_by_customer".
      reason:
        reason === "duplicate_charge"
          ? "duplicate"
          : "requested_by_customer",
      metadata: {
        podprofit_reason: reason,
        podprofit_operator: "admin_ui_v1",
        podprofit_user_id: user_id ?? "",
      },
    });
    refundId = refund.id;
  } catch (err) {
    stripeError =
      err instanceof Error ? err.message : "Unknown Stripe error.";
  }

  // Step 4: log the outcome.
  if (refundId) {
    await logRefundAttempt(supabase, {
      user_id,
      stripe_payment_intent_id: payment_intent_id,
      stripe_refund_id: refundId,
      amount_cents,
      currency: LIFETIME_REFUND_CURRENCY,
      reason,
      operator_id: null,
      operator_email: null,
      status: "succeeded",
      notes,
    });
    return redirect(req, { issued: refundId });
  }

  await logRefundAttempt(supabase, {
    user_id,
    stripe_payment_intent_id: payment_intent_id,
    stripe_refund_id: null,
    amount_cents,
    currency: LIFETIME_REFUND_CURRENCY,
    reason,
    operator_id: null,
    operator_email: null,
    status: "failed",
    notes: stripeError ?? "Stripe refund failed without a message.",
  });
  return redirect(req, {
    error: `Stripe refund failed: ${stripeError ?? "unknown"}`,
  });
}

function redirect(
  req: NextRequest,
  flash: { issued?: string; error?: string },
): NextResponse {
  const url = new URL("/admin/refunds", req.url);
  if (flash.issued) url.searchParams.set("issued", flash.issued);
  if (flash.error) url.searchParams.set("error", flash.error);
  return NextResponse.redirect(url, 303);
}
