-- PODP-60 (part 2/2): refund_audit_log — purpose-built audit trail for
-- refund operations (Stripe-mediated and otherwise).
--
-- Why a dedicated table instead of reusing `public.audit_log`?
-- See ADR 0004. Short version:
--   1. Legal retention: refund records carry a 7-year retention obligation
--      (consumer law / accounting) that does not apply to the generic
--      audit_log. Mixing them means we either over-retain audit_log or
--      under-retain refunds — both are bad.
--   2. Query shape: support / dispute lookups search by
--      stripe_payment_intent_id, by user_id, and by date range with high
--      frequency. The generic audit_log keeps that data inside `metadata
--      jsonb`, which is awkward to index and to query in PostgREST.
--   3. Operator forensics: refunds need first-class operator_id +
--      operator_email columns; the generic audit_log has no such notion.
--
-- Relation to existing tables:
--   - `lifetime_seats` rows already flip to status='refunded'; this table
--     does NOT replace that — it records the *event* (who, when, why,
--     how much) regardless of which product the refund concerns.
--   - `subscriptions` cancellations are tracked by Stripe webhook into the
--     subscriptions table; this table only logs *refund* operations.
--   - The cooling-off eligibility helpers in
--     `src/lib/refund/check-eligibility.ts` answer "is this refundable?";
--     this table records "what did we actually do?".

-- Reason codes are an open enum: we want to add categories without a
-- migration round-trip, but we also want to catch typos. The CHECK below
-- whitelists the reasons we currently know about; future migrations will
-- ALTER the constraint when a new reason category emerges.
--
-- Current categories (2026-05-14):
--   cooling_off_14_day   — Lifetime within the 14-day window (ADR 0003).
--   no_proration_override — Pro Monthly/Annual exceptional proration
--                           refund authorised by CEO (off-policy goodwill).
--   product_not_downloaded — Excel / Report refunded under the
--                            "zero downloads" rule.
--   goodwill              — Discretionary refund outside policy
--                            (small dollar amounts, support judgment).
--   bug_compensation      — Refund tied to a known incident / billing bug.
--   duplicate_charge      — Stripe / billing error, not customer-driven.
--   chargeback_pre_empt   — Customer threatened chargeback; refunded to
--                            avoid the dispute fee. Tracked separately
--                            from `goodwill` because the financial profile
--                            differs (no fee recovery on chargebacks).
--   other                 — Free-form; requires non-empty `notes`.

-- Status separates "we attempted" from "Stripe confirmed". Both are
-- recorded; partial failures (Stripe returned an error) still produce a
-- row so we have a tamper-evident audit trail of every attempt.

create table if not exists public.refund_audit_log (
  id uuid primary key default uuid_generate_v4 (),

  -- Who got the money back. Nullable because rare cases (test refunds,
  -- pre-auth voids) may not have a resolved user_id at logging time.
  user_id uuid references auth.users (id) on delete set null,

  -- Stripe correlation. payment_intent is canonical; refund_id is set
  -- only after Stripe accepts the refund request. Both indexed for
  -- support lookups.
  stripe_payment_intent_id text,
  stripe_refund_id text,

  -- Amount + currency. Stored in the smallest currency unit (cents for
  -- USD, pence for GBP) consistent with Stripe's convention. Positive
  -- integer; we don't model partial increments here.
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),

  -- Why we refunded. See header for the current category list.
  reason text not null check (
    reason in (
      'cooling_off_14_day',
      'no_proration_override',
      'product_not_downloaded',
      'goodwill',
      'bug_compensation',
      'duplicate_charge',
      'chargeback_pre_empt',
      'other'
    )
  ),

  -- Who triggered the refund. Nullable for system-driven flows (e.g.
  -- a future webhook-driven auto-refund). When set, `operator_email` is
  -- captured at write time so admin churn doesn't make the audit trail
  -- harder to read.
  operator_id uuid references auth.users (id) on delete set null,
  operator_email text,

  -- Outcome of the refund attempt.
  --   attempted  — request sent to Stripe but no confirmation yet
  --                (used only briefly; reconciled by webhook).
  --   succeeded  — Stripe returned success and a refund_id.
  --   failed     — Stripe returned an error; `notes` should explain.
  status text not null default 'attempted' check (
    status in ('attempted', 'succeeded', 'failed')
  ),

  -- Free-form notes (max 2KB). Required when `reason = 'other'`; that
  -- invariant is enforced by the row-level CHECK below.
  notes text check (notes is null or octet_length(notes) <= 2048),

  created_at timestamptz not null default now (),

  -- 'other' must come with notes — otherwise it's noise.
  check (reason <> 'other' or (notes is not null and length(trim(notes)) > 0)),

  -- 'succeeded' must carry a refund_id (otherwise we don't actually know
  -- it succeeded). 'failed' must NOT carry one. 'attempted' is allowed
  -- either way (race between request and webhook).
  check (
    (status = 'succeeded' and stripe_refund_id is not null)
    or (status = 'failed' and stripe_refund_id is null)
    or (status = 'attempted')
  )
);

-- Support / dispute lookups by user.
create index if not exists idx_refund_audit_user
  on public.refund_audit_log (user_id);

-- Stripe reconciliation: payment_intent is the join key against Stripe's
-- side. Partial index because some rows (rare) may not have a PI yet.
create index if not exists idx_refund_audit_stripe_pi
  on public.refund_audit_log (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Reverse-chronological browsing (admin UI, monthly close).
create index if not exists idx_refund_audit_created
  on public.refund_audit_log (created_at desc);

-- Reason-cohort analytics (e.g. "how many goodwill refunds last month?").
create index if not exists idx_refund_audit_reason_created
  on public.refund_audit_log (reason, created_at desc);

alter table public.refund_audit_log enable row level security;

-- Users can see their own refund history. There is intentionally no
-- INSERT or UPDATE policy for authenticated — writes are server-only
-- (admin action or webhook reconciliation) using service_role.
create policy "users can read own refund log"
  on public.refund_audit_log for select
  using (auth.uid() = user_id);
