# Supabase Migrations

Per `supabase-er-rls-design.md` (in the company-internal docs):

- 5 migrations covering the W1 launch scope
- Naming: `YYYYMMDD_NNNNNN_<slug>.sql`
- Apply locally: `supabase db push` (when Supabase CLI is installed)
- Apply to production: GitHub Actions on merge to main (planned)

## Files

1. `20260512_000001_init_extensions_enums.sql` — uuid-ossp, pgcrypto, enums, `fn_set_updated_at`
2. `20260512_000002_user_profiles.sql` — 1:1 with auth.users
3. `20260512_000003_subscriptions_and_lifetime.sql` — Stripe mirror + atomic lifetime seat claim
4. `20260512_000004_calculations.sql` — share-able calculations + view counter RPC
5. `20260512_000005_email_subscribers_and_audit.sql` — Buttondown mirror + audit log

## Deferred (per CEO slim-down 2026-05-03)

- Vendor catalog tables (price data lives in `data/*.yml`, not the database)
- AIO tracking table (deferred until launch + traffic)
- Detailed permissions per role (Free vs Pro logic stays in app code for now)
