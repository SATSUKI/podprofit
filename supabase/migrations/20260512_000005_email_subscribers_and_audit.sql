-- Email subscribers (Lead Magnet captures, mirrored from Buttondown for queryability).
create table if not exists public.email_subscribers (
  id uuid primary key default uuid_generate_v4 (),
  email text unique not null,
  source text, -- 'lead_magnet', 'launch_waitlist', 'cornerstone_article_2', etc.
  buttondown_subscriber_id text,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists idx_email_subscribers_email on public.email_subscribers (email);

alter table public.email_subscribers enable row level security;
-- Writes are server-only (no public insert path — must go through validated server action).
-- No reads except service_role.

-- Audit log: track sensitive actions (subscription changes, lifetime claims, refunds).
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4 (),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_user_id on public.audit_log (user_id);
create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);
create index if not exists idx_audit_log_action on public.audit_log (action);

alter table public.audit_log enable row level security;
-- No reads except service_role; admin dashboard later.
