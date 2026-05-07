-- Task 19 (refund verification log): server-side access log backing the
-- refund eligibility promises in:
--   - Refunds page (/legal/refunds): "Lifetime $149 — refundable within 7
--     days AND 0 calculator launches (verified by access logs)".
--   - Terms v0.2 §7.1 / §7.3: "Zero downloads — server-side log shows zero
--     downloads" for Excel Template + Benchmark Report.
--
-- Privacy invariant (Privacy Policy v0.1 §2.2 / §2.7):
--   - Calculator INPUTS are NEVER stored here. We record the *fact* of a
--     launch and a coarse event type only — no retail prices, no product
--     selections, no PII in `metadata`.
--   - `metadata` jsonb is intentionally restricted by the API layer to a
--     short ("max 64 chars per string") set of low-cardinality flags. The
--     CHECK below is a defense-in-depth size cap.
--
-- Refund eligibility query shape (see `src/lib/refund/check-eligibility.ts`):
--   select count(*) from usage_events
--   where user_id = $1
--     and event_type = 'calculator_launched'
--     and occurred_at > $purchase_at;
--
-- The (user_id, event_type, occurred_at desc) compound index serves the
-- "since-purchase counts" probe. We deliberately do NOT add a UNIQUE
-- (user_id, event_type, day) constraint here — client-side dedupe via
-- sessionStorage + server-side rate limit are sufficient for the refund
-- judgment ("zero launches?" only needs *exists / not exists*, not
-- "exactly one per day"). Allowing multiple rows per day also keeps the
-- door open for product-level analytics later (Task 19's Phase 1.5
-- expansion in engineering-impl-plan-w2-w5-v2.md).

create table if not exists public.usage_events (
  id uuid primary key default uuid_generate_v4 (),
  user_id uuid references auth.users (id) on delete cascade,
  event_type text not null check (
    event_type in ('calculator_launched', 'product_downloaded')
  ),
  -- 'excel-template-2026' / 'benchmark-report-2026' for downloads;
  -- null for calculator launches (which aren't tied to a paid product).
  product_slug text check (
    product_slug is null
    or (product_slug ~ '^[a-z0-9][a-z0-9-]{0,63}$')
  ),
  -- Low-cardinality flags only. PII is forbidden by API-layer validation;
  -- this CHECK is defense-in-depth on row size to keep storage bounded.
  metadata jsonb check (metadata is null or octet_length(metadata::text) <= 512),
  occurred_at timestamptz not null default now()
);

-- Refund-eligibility query: "any launches since purchase_at?".
create index if not exists idx_usage_events_user_event_time
  on public.usage_events (user_id, event_type, occurred_at desc);

-- Product-download eligibility: scoped by user + product.
create index if not exists idx_usage_events_user_product
  on public.usage_events (user_id, product_slug, occurred_at desc)
  where event_type = 'product_downloaded';

alter table public.usage_events enable row level security;

-- Owners can read their own usage events (e.g., future "your activity"
-- self-service page). Writes are server-only — there is intentionally no
-- INSERT policy for `authenticated`; the API route uses service_role.
create policy "users can read own usage events"
  on public.usage_events for select
  using (auth.uid() = user_id);
