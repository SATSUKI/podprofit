-- User profile (1:1 with auth.users).
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text default 'en',
  preferred_currency text default 'USD' check (preferred_currency in ('USD','EUR','GBP','CAD','AUD','JPY')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function fn_set_updated_at();

-- RLS: each user can read/update only their own profile.
alter table public.user_profiles enable row level security;

create policy "users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

create policy "users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);
