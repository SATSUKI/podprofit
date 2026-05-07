-- Task 2 (lifetime_purchased): idempotency table for Stripe webhook replay defense.
--
-- Per `measurement-spec-v1.md` §4.3, every Stripe webhook delivery must be
-- de-duplicated by `stripe_event_id`. Stripe retries up to 3 days, and the
-- network can also redeliver, so the same `event.id` may arrive multiple
-- times. This table is the single source of truth for "have we already
-- processed this event?".
--
-- Pattern (in `src/app/api/stripe/webhook/route.ts`):
--   1. Verify signature.
--   2. INSERT INTO webhook_events (stripe_event_id, event_type, ...).
--      - On UK violation → return 200 immediately (already handled).
--   3. Run side effects (seat claim, subscription mirror, audit log).
--   4. UPDATE webhook_events SET processed_at = now(), error = null.
--      - On exception → leave processed_at NULL + record error, so a retry
--        from Stripe deletes the row (see DELETE policy below) and reprocesses.
--
-- This shape keeps the "received but not yet processed" window observable —
-- a row with `received_at` set and `processed_at` NULL means the handler
-- crashed mid-flight.

create table if not exists public.webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  payload_summary jsonb -- minimal redacted snapshot (no full PII)
);

create index if not exists idx_webhook_events_received_at
  on public.webhook_events (received_at desc);

create index if not exists idx_webhook_events_unprocessed
  on public.webhook_events (received_at)
  where processed_at is null;

alter table public.webhook_events enable row level security;
-- Service role only (writes from Stripe webhook handler). No anon / authenticated reads.

-- Allow the handler to delete a row and retry on transient failure.
-- (Stripe will retry on non-2xx; deletion lets that retry succeed.)
-- No policy needed — service_role bypasses RLS.
