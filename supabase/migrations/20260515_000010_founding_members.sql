-- PODP-12 founding members directory.
--
-- Lifetime buyers can opt in to display their X handle on the public
-- "founding members" page. Schema lands now (alongside the Stripe Test Mode
-- integration) so the Lifetime checkout success page can offer the opt-in
-- without a separate migration round-trip.

create table if not exists public.founding_members (
  id uuid primary key default uuid_generate_v4 (),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_x_handle boolean not null default false,
  x_handle text,
  joined_at timestamptz not null default now(),
  unique (user_id),
  check (display_x_handle = false or x_handle is not null)
);

create index if not exists idx_founding_members_joined_at
  on public.founding_members (joined_at desc);

alter table public.founding_members enable row level security;

-- The directory is publicly readable, but the row is only exposed when the
-- member has explicitly opted-in to display.
create policy "anyone can read opted-in founding members"
  on public.founding_members for select
  using (display_x_handle = true);

-- Members manage their own row (insert / update). Service role writes the
-- initial row from the lifetime claim webhook (RLS bypassed for service role).
create policy "members can read own row"
  on public.founding_members for select
  using (auth.uid() = user_id);

create policy "members can insert own row"
  on public.founding_members for insert
  with check (auth.uid() = user_id);

create policy "members can update own row"
  on public.founding_members for update
  using (auth.uid() = user_id);
