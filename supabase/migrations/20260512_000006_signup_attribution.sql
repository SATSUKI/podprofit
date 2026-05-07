-- Task 1 (signup_completed): attach signup attribution columns to user_profiles.
--
-- Per `measurement-spec-v1.md` §1.1, the `signup_completed` event is sourced
-- from the existing `user_profiles` row (created at first auth callback).
-- We add two columns to make that row a self-contained event record:
--
--   - `signup_method`        — magic_link / google (extensible enum)
--   - `signup_referrer_host` — host portion only (no path / query / slug)
--
-- PII discipline (Privacy v0.1 §2.4): the host is capped at 64 chars and
-- only the host segment is captured at sign-up button click time. The auth
-- callback URL itself is never stored.
--
-- Idempotency: this migration is safe to re-apply (IF NOT EXISTS).

do $$ begin
  create type signup_method as enum ('magic_link', 'google');
exception when duplicate_object then null; end $$;

alter table public.user_profiles
  add column if not exists signup_method signup_method,
  add column if not exists signup_referrer_host text
    check (signup_referrer_host is null or char_length(signup_referrer_host) <= 64);

-- Index supports KPI dashboard queries (signup_method × created_at).
create index if not exists idx_user_profiles_signup_method
  on public.user_profiles (signup_method);

create index if not exists idx_user_profiles_signup_referrer_host
  on public.user_profiles (signup_referrer_host)
  where signup_referrer_host is not null;
