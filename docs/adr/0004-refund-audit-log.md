# ADR 0004: Refund audit log — dedicated table separate from generic audit_log

Status: Accepted
Date: 2026-05-14
Deciders: Engineering (PODProfit), via COO. Originated as PODP-60 part 2/2
(audit-trail schema for the admin refund UI in PODP-53).

## Context

PODProfit already has a generic `public.audit_log` table
(`20260512_000005_email_subscribers_and_audit.sql`):

```sql
create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

The natural question for PODP-60 was: do refund events fit there, or
do they deserve a dedicated table? The instinct toward reuse is
correct in general — every new table is overhead — but refund records
have three properties that make them a poor fit for the generic log:

1. **Legal retention.** Refund records carry a multi-year retention
   obligation (consumer law in the UK / EU, accounting / book-keeping
   under JP commercial code — generally 7 years). The generic
   `audit_log` has no such obligation; we'd like to be free to truncate
   it as it grows. Mixing the two forces us to either over-retain the
   generic log or under-retain the refunds — neither is acceptable.

2. **Query shape.** Support and chargeback-dispute workflows search by
   `stripe_payment_intent_id`, by `user_id`, and by date window with
   high frequency. Encoding that data inside `audit_log.metadata jsonb`
   is awkward to index (we'd need a JSONB expression index per key)
   and awkward to query in PostgREST (`metadata->>'stripe_payment_intent_id'
   = ?` is verbose and easy to mis-spell on the client). A dedicated
   table makes these queries first-class.

3. **Operator forensics.** Refunds require capturing *who* triggered
   the operation: `operator_id`, plus a `operator_email` snapshot at
   write-time so an admin who later changes email doesn't degrade the
   trail. The generic `audit_log` has no such columns. Adding them
   there would pollute every other action category that doesn't need
   them.

The cooling-off SOP (`refund-escalation §3.2`) and the admin refund UI
(PODP-53) both need to write *every* refund attempt — successful,
failed, or in-flight — to a tamper-evident store. ADR 0003 codified
the eligibility *policy* (when can we refund?); this ADR codifies the
*recording* of refund operations (what did we actually do, when, who,
why?).

## Decision

Create a dedicated `public.refund_audit_log` table
(`20260514_000011_refund_audit_log.sql`) with:

- Stripe correlation columns (`stripe_payment_intent_id`,
  `stripe_refund_id`) — first-class, indexed.
- Money columns (`amount_cents` integer, `currency` 3-letter lowercase
  with a CHECK regex).
- A `reason` text column with a closed-enum CHECK constraint. The
  eight current categories are documented in the migration header and
  mirrored in `REFUND_REASONS` in
  `src/lib/refund/audit-log.ts`. Adding a new reason requires a
  migration that ALTERs the CHECK — deliberate friction so we don't
  accumulate orphan reason codes.
- A `status` column (`attempted` / `succeeded` / `failed`) with
  cross-column CHECKs that enforce "succeeded implies refund_id
  present" and "failed implies refund_id absent".
- `operator_id` + `operator_email` (both nullable, but constrained to
  travel together via the TS validator — a system-driven webhook
  refund has both null; a human admin refund has both set).
- `notes` text (<= 2KB, required when `reason = 'other'`).
- RLS: users can `select` their own rows. No `insert` / `update`
  policies — writes go through `service_role` from server-side admin
  / webhook code.
- Four indexes: `(user_id)`, `(stripe_payment_intent_id)` partial
  where not null, `(created_at desc)`, `(reason, created_at desc)`.

TypeScript surface in `src/lib/refund/audit-log.ts`:

- `validateRefundEntry(entry)` — argument shape validator mirroring
  the SQL CHECKs (fail fast before DB round-trip).
- `logRefundAttempt(supabase, entry)` — single-op insert; returns a
  tagged `{ ok: true, row } | { ok: false, error }` so the admin UI
  can render errors inline.
- Closed-enum constants `REFUND_REASONS` / `REFUND_STATUSES` exported
  so the admin UI dropdowns stay in lockstep with the table CHECK.

## Consequences

### Positive

- Refunds get a query shape tuned to the actual access patterns
  (PI lookup, user history, monthly close by date range).
- Retention policy for refunds can be set independently of the
  generic audit log — important for the 7-year obligation.
- Tamper-evident: writes are append-only (no UPDATE policy), so the
  `attempted` row stays even if the matching `succeeded` row arrives
  later. Forensics on partial failures (process died between Stripe
  call and DB write) is straightforward — re-read by PI and check
  for orphan `attempted` rows.
- The TS validator catches CHECK violations before the DB does,
  giving admin operators readable error messages instead of opaque
  PostgreSQL constraint errors.

### Negative / risks

- **Two audit tables in the codebase.** New engineers must learn the
  rule "refunds go to `refund_audit_log`, everything else to
  `audit_log`". Mitigated by:
  (a) the migration header pointing back to this ADR, and
  (b) the helper layer (`src/lib/refund/audit-log.ts`) being the
      only sanctioned write path, so the routing decision happens
      once at the API-route layer, not per call site.
- **Reason enum migration friction.** Adding a new reason code
  requires editing both the SQL CHECK and the TS constant in
  lockstep. This is intentional — orphan reason codes would defeat
  the analytics intent — but it does mean reason taxonomy changes
  cost one migration each. We accept this; the eight categories
  shipped here should cover years of operation.

### Neutral

- The generic `audit_log` is unchanged. We may still write a
  *summary* row there for cross-cutting "what happened to this user"
  reads in the future, but the canonical refund record lives in
  `refund_audit_log`.
- File numbering note: this migration is filed as
  `20260514_000011_refund_audit_log.sql` even though
  `20260515_000010_founding_members.sql` already exists with a lower
  `NNNNNN` suffix. Supabase's migration runner orders by the full
  filename ascending, so `20260514_000011 < 20260515_000010` and
  this runs first. The numbering inversion is a one-time artefact of
  parallel-stream work; we accept it rather than renumbering an
  existing migration.

## References

- Migration: `supabase/migrations/20260514_000011_refund_audit_log.sql`
- Helper: `src/lib/refund/audit-log.ts`
- Tests: `tests/unit/refund-audit-log.test.ts`
- Eligibility policy (sibling): ADR 0003.
- Generic audit log (prior art): `20260512_000005_email_subscribers_and_audit.sql`.
- Related work: PODP-53 (admin refund UI), PODP-54 (cooling-off
  policy), refund-escalation SOP §3.2.
