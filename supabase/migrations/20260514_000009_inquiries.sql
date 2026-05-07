-- Task 22 (Contact Form + Inquiries detection pipeline): server-side store
-- backing the public Contact form (`/contact`) and the COO triage helper
-- (`scripts/check-inquiries.ts`).
--
-- Why a dedicated table (vs reusing audit_log or email_subscribers):
--   - audit_log is keyed to authenticated user_id; many inquiries arrive
--     anonymously (anon visitors who haven't signed up).
--   - email_subscribers tracks opt-in marketing consent; inquiries are
--     transactional support records with a different retention curve.
--   - Privacy Policy v0.1 §2.8 already promises "customer-support
--     correspondence retained up to 24 months" — inquiries is the canonical
--     home for that promise.
--
-- Privacy invariants (Privacy Policy v0.1 §2.7 / §2.8 + Task 22 update):
--   - Email + name + IP + UA are stored to enable replies and abuse
--     investigation. The Privacy Policy update accompanying this migration
--     spells this out.
--   - Retention: 6 months from `replied_at` (status='replied') before the
--     COO archives. The 24-month outer limit in Privacy Policy §2.8 is the
--     hard ceiling; the 6-month default is the practical default.
--
-- COO query shape (`scripts/check-inquiries.ts`):
--   select id, email, category, subject, substr(message, 1, 200), created_at
--   from inquiries
--   where status = 'new'
--   order by created_at desc;

create type inquiry_category as enum (
  'bug',
  'refund',
  'feature_request',
  'pricing',
  'general',
  'other'
);

create type inquiry_status as enum (
  'new',
  'in_progress',
  'replied',
  'archived',
  'spam'
);

create table public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  -- Optional. Anonymous visitors don't have to identify themselves beyond
  -- email; trim leading/trailing whitespace at the API layer.
  name text check (name is null or char_length(name) <= 100),
  -- Required. Validated as RFC-5321-ish at the API layer (zod email);
  -- DB-level cap is defense-in-depth.
  email text not null check (char_length(email) <= 254),
  category inquiry_category not null default 'general',
  -- Optional one-line summary the user supplies; useful for the triage
  -- terminal output but not required to reply.
  subject text check (subject is null or char_length(subject) <= 200),
  -- Required. The 5000-char ceiling is mirrored at the API layer (zod);
  -- DB CHECK is defense-in-depth + DOS guard.
  message text not null check (char_length(message) <= 5000),
  status inquiry_status not null default 'new',
  -- Nullable: anonymous visitors have no account. When the inquiry is
  -- submitted by an authenticated user, we store user_id so the RLS policy
  -- "users read own inquiries" lets them see their own ticket history.
  user_id uuid references auth.users (id) on delete set null,
  -- Set by the COO/founder when the inquiry is replied.
  reply_message text check (reply_message is null or char_length(reply_message) <= 10000),
  replied_at timestamptz,
  -- Coarse abuse signal. We do NOT geo-resolve at write time; that's a
  -- post-launch stretch goal.
  ip_address text check (ip_address is null or char_length(ip_address) <= 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 512),
  created_at timestamptz not null default now()
);

-- Triage probe: "any new inquiries since I last looked?".
create index idx_inquiries_status on public.inquiries (status, created_at desc);

-- Look-ups by reporter email (e.g., "did this person already write in?").
create index idx_inquiries_email on public.inquiries (email);

alter table public.inquiries enable row level security;

-- Authenticated users can read their own inquiries (future "your tickets"
-- self-service page). Writes for authenticated AND anonymous users go
-- through the API (service_role); the INSERT policy below is the fallback
-- path so anon+auth can still POST through the row-level check if RLS is
-- ever forced on for the API path.
create policy "users read own inquiries"
  on public.inquiries for select
  using (auth.uid() = user_id);

-- Anyone (anon + authenticated) can submit an inquiry. The API layer is
-- responsible for spam, rate limit, honeypot — DB-level INSERT policy is
-- intentionally permissive because we want no friction for legitimate
-- abuse reports / refund requests submitted from a logged-out browser.
create policy "anyone can insert"
  on public.inquiries for insert
  with check (true);
