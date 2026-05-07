import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Lemon Squeezy webhook handler — STUB.
 *
 * Why a stub now (5/7) instead of the full handler?
 *
 *   - The Excel Template ($19) launches 2026-07-23.
 *   - The Benchmark Report launches 2026-08-20.
 *   - Neither product is for sale yet, so we have nothing to record. But
 *     the refund-promise text on `/legal/refunds` and Terms §7.3 already
 *     references "server-side log shows zero downloads" — meaning the
 *     download log mechanism (`usage_events`) must be in place *before*
 *     the products go live. The stub keeps the URL stable so the
 *     Lemon Squeezy webhook can be configured up-front, then "lit up"
 *     in a later deploy without changing endpoints.
 *
 * What the full handler will need to do (TODO before 2026-07-23):
 *
 *   1. Verify the `X-Signature` HMAC against `LEMON_SQUEEZY_SIGNING_SECRET`.
 *      (Reject anything without a valid signature with 401.)
 *   2. Idempotency by `meta.event_name + meta.custom_data.order_id` (or
 *      whatever Lemon Squeezy's event id field is — reuse the
 *      `webhook_events` table or add a parallel one).
 *   3. On `order_created`: nothing to record yet (the user has bought
 *      but not downloaded).
 *   4. On `download_event` / `dispatch_failed` / equivalent: insert a
 *      `usage_events` row with `event_type='product_downloaded'` and
 *      `product_slug = 'excel-template-2026' | 'benchmark-report-2026'`,
 *      keyed off the user's email → user_id mapping in `auth.users`.
 *   5. Return 200 on success; 500 on transient failure so Lemon Squeezy
 *      retries.
 *
 * For now, return 503 so any accidental hits during pre-launch are
 * loud rather than silent.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Lemon Squeezy webhook not yet enabled.",
      hint: "Stub endpoint reserved for the 2026-07-23 Excel Template launch. See `src/app/api/lemonsqueezy/webhook/route.ts` for the activation TODO.",
    },
    { status: 503 },
  );
}
