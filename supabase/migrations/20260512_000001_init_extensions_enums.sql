-- PODProfit — initial migration: extensions, enums, common trigger functions.
-- Per supabase-er-rls-design.md ADR. All subsequent migrations depend on this.

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type plan_type as enum ('free', 'pro_monthly', 'pro_yearly', 'lifetime');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lifetime_seat_status as enum ('claimed', 'refunded');
exception when duplicate_object then null; end $$;

-- Common updated_at trigger
create or replace function fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
