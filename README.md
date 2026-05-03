# PODProfit

> **Stop guessing your Print-on-Demand margin. See the real number in 30 seconds.**

The vendor-neutral, multi-currency, share-able profit calculator for Print-on-Demand sellers — built in public.

🌐 [getpodprofit.com](https://getpodprofit.com) (launching 2026-06-09)
👤 Building in public: [@lastarna](https://x.com/lastarna) / [u/o_satsuki](https://reddit.com/u/o_satsuki) / [IndieHackers](https://www.indiehackers.com/u/o_satsuki)

## Why PODProfit

POD sellers on Etsy, Shopify, Printful, and Printify need to know their **real** profit before listing — including platform fees, marketplace cuts, and currency conversion. Existing calculators are vendor-locked, USD-only, or hide their data sources.

PODProfit is:
- **Vendor-neutral** — Compare Printful and Printify side-by-side
- **Multi-currency** — USD / EUR / GBP / CAD / AUD / JPY
- **Share-able** — Every calculation gets a clean URL with a dynamic OG image
- **Transparent** — Every price has an "as of" date, every fee is itemized

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript
- **Backend**: Supabase (Postgres + Auth) + Stripe Billing/Tax
- **Edge / CDN**: Cloudflare DNS / Workers / R2
- **Hosting**: Vercel (Hobby tier)
- **Testing**: Vitest

## Local Setup

```bash
# 1. Clone + install
git clone https://github.com/SATSUKI/podprofit.git
cd podprofit
pnpm install

# 2. Copy env template (then fill in values)
cp .env.local.example .env.local

# 3. Run
pnpm dev   # http://localhost:3000
pnpm test  # Run unit tests
```

## Project Structure

```
src/
  app/                  # Next.js App Router
  lib/
    calculator/         # Pure TS profit calculation
    supabase/           # DB client wrapper
    stripe/             # Billing wrapper
    utils/              # Shared helpers
  types/                # Shared TS types
data/
  printful/products.yml # Printful price table (manual + monthly PR sync)
  printify/products.yml
  fx-rates.yml          # USD/EUR/GBP/CAD/AUD/JPY
supabase/
  migrations/           # SQL migrations
scripts/
  yaml-to-ts.ts         # Generate TS types from YAML
tests/
  unit/                 # Vitest unit tests
  e2e/                  # Playwright (later)
docs/adr/               # Architecture Decision Records
```

## Build in Public

This product is built fully transparent — code, decisions, revenue. Follow along:
- [@lastarna on X](https://x.com/lastarna) — daily build notes
- [Indie Hackers — `o_satsuki`](https://www.indiehackers.com/u/o_satsuki) — weekly P&L
- This repo — every commit is the source of truth

## License

MIT (code). Price data and content under their respective sources (see `data/*/README.md`).
