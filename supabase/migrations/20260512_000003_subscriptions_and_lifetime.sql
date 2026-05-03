-- Subscriptions table — mirrors Stripe state for fast read access.
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4 (),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_type plan_type not null,
  status subscription_status not null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  paused_until timestamptz, -- for the Pause feature (Pro monthly only)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions (user_id);
create index if not exists idx_subscriptions_status on public.subscriptions (status);

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function fn_set_updated_at();

alter table public.subscriptions enable row level security;
create policy "users can read own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);
-- Writes are server-only via Stripe webhook (service_role bypasses RLS).

-- Lifetime seats — physical PK 1..100 enforces the cap atomically.
create table if not exists public.lifetime_seats (
  seat_number int primary key check (seat_number between 1 and 100),
  user_id uuid references auth.users (id) on delete set null,
  status lifetime_seat_status not null default 'claimed',
  stripe_payment_intent_id text unique,
  claimed_at timestamptz not null default now(),
  refunded_at timestamptz
);

create index if not exists idx_lifetime_seats_user_id on public.lifetime_seats (user_id);
create index if not exists idx_lifetime_seats_status on public.lifetime_seats (status);

alter table public.lifetime_seats enable row level security;
-- Public count of claimed seats (for "X / 100 claimed" UI). No PII exposed.
create policy "anyone can read seat status"
  on public.lifetime_seats for select
  using (true);
-- Writes are server-only via Stripe webhook.

-- Atomic seat claim: returns the lowest unclaimed seat number, or NULL if full.
-- Uses an advisory lock to prevent races between concurrent webhook invocations.
create or replace function fn_claim_lifetime_seat(
  p_user_id uuid,
  p_payment_intent_id text
) returns int
language plpgsql
as $$
declare
  v_seat int;
begin
  -- Single-instance advisory lock for the entire seat-claim critical section.
  perform pg_advisory_xact_lock(hashtext('lifetime-seat-claim'));

  select seat_number into v_seat
  from public.lifetime_seats
  where status = 'refunded'
  order by seat_number asc
  limit 1;

  if v_seat is not null then
    update public.lifetime_seats
    set user_id = p_user_id,
        status = 'claimed',
        stripe_payment_intent_id = p_payment_intent_id,
        claimed_at = now(),
        refunded_at = null
    where seat_number = v_seat;
    return v_seat;
  end if;

  -- No refunded seats — try to claim a brand new one.
  select coalesce(max(seat_number), 0) + 1 into v_seat
  from public.lifetime_seats
  where status = 'claimed';

  if v_seat > 100 then
    return null; -- sold out
  end if;

  insert into public.lifetime_seats (seat_number, user_id, status, stripe_payment_intent_id)
  values (v_seat, p_user_id, 'claimed', p_payment_intent_id);

  return v_seat;
end;
$$;

-- Public view: how many seats are currently claimed.
create or replace view public.lifetime_seat_count as
  select count(*) ::int as claimed
  from public.lifetime_seats
  where status = 'claimed';

grant select on public.lifetime_seat_count to anon, authenticated;
