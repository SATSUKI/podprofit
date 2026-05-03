-- Calculations — stores share-able calculation results (anyone can create, owner can manage).
create table if not exists public.calculations (
  id uuid primary key default uuid_generate_v4 (),
  user_id uuid references auth.users (id) on delete set null,
  share_slug text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  input_json jsonb not null,
  output_json jsonb not null,
  view_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_calculations_user_id on public.calculations (user_id);
create index if not exists idx_calculations_share_slug on public.calculations (share_slug);
create index if not exists idx_calculations_created_at on public.calculations (created_at desc);

alter table public.calculations enable row level security;

-- Anyone (including anon) can read by share_slug.
create policy "anyone can read by share slug"
  on public.calculations for select
  using (true);

-- Authenticated users can create their own calculations.
create policy "authenticated users can insert own"
  on public.calculations for insert
  with check (auth.uid() = user_id or user_id is null);

-- Owner can delete (e.g., privacy concern).
create policy "owner can delete"
  on public.calculations for delete
  using (auth.uid() = user_id);

-- Atomic view-count increment (callable by anon).
create or replace function fn_increment_share_view(p_share_slug text)
returns void
language plpgsql
security definer
as $$
begin
  update public.calculations
  set view_count = view_count + 1
  where share_slug = p_share_slug;
end;
$$;
grant execute on function fn_increment_share_view(text) to anon, authenticated;
