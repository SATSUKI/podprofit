# ADR 0002: Stripe-only payment stack on the public Tokushoho / Pricing surfaces

Status: Accepted
Date: 2026-05-10
Deciders: Engineering (PODProfit), via COO instruction (PODP-30 — Stripe Live re-approval)

## Context

PODProfit's Stripe Live account submission was placed on hold by Stripe review
on 2026-05-10. The reviewer asked us to:

1. Make the website publicly reachable without auth gates (already true).
2. Match the registered legal name and product copy across the site.
3. Make the Tokushoho (特定商取引法に基づく表記) page meet Stripe's standard.

Two specific issues were called out by the reviewer plus our own audit:

- The Tokushoho address contained a "DMM バーチャルオフィス渋谷道玄坂店" suffix
  in parentheses after the street address. Industry standard for Japanese
  Tokushoho disclosures is to publish the registered street address only;
  spelling out a virtual-office brand reads as a negative signal during
  payment-processor review.
- The Tokushoho payment-method section listed two processors —
  Stripe (for Lifetime / Pro Monthly / Pro Annual) and Lemon Squeezy
  (for the future Excel Template and Benchmark Report PDF). Per a
  separate decision (PODP-20), we are consolidating the payment stack to
  Stripe only for Phase 1, including the Excel and Report products that
  will launch in 2026-07 / 2026-08. Surfacing a second processor on the
  Tokushoho page contradicts that decision and confused the Stripe review.
- The home page LP described the Pro plan as "planned for saved
  calculations…" with no price and no date. That phrasing was a likely
  contributor to Stripe classifying the product as "not yet operating."

## Decision

For the public-facing legal and pricing surfaces — `/legal/tokushoho`,
the home LP (`/`), and `/pricing` — we present a single, definite
payment stack and a single, definite price/date for every paid plan:

1. `/legal/tokushoho`
   - Address: `〒150-0044 東京都渋谷区円山町5番3号 MIEUX渋谷ビル8階` (no
     virtual-office suffix; the registered address is real and the
     virtual-office registration completed 2026-05-07).
   - Payment method: a single paragraph stating "all products are
     processed by Stripe, Inc." — no Lemon Squeezy mention on this page.
   - International tax disclosure: collected via Stripe Tax (replaces
     the prior Lemon Squeezy MoR sentence).
   - Excel Template / Benchmark Report rows in the price table keep
     their planned launch dates but no longer name a processor.

2. `/` (home LP)
   - Pro plan FAQ entry now states explicit prices ($9 USD/month and
     $79 USD/year) and an explicit availability date (June 9, 2026).
     "Planned" wording is removed.

3. `/pricing`
   - Four-tier grid: Free (Available now) / Pro Monthly ($9 USD/month,
     Available June 9, 2026) / Pro Annual ($79 USD/year, Available
     June 9, 2026) / Lifetime ($149 one-time, Available now — N seats
     remaining out of 100).
   - Free CTA goes to `/`. Pro Monthly / Pro Annual CTAs are
     "Notify me when available" anchored to an in-page email signup
     (no Stripe checkout link before launch, so the CTAs do not 404
     during review). Lifetime CTA is "Reserve seat" pointing at
     `/lifetime`.

Other documents — `/legal/terms`, `/legal/privacy`, `/legal/refunds`,
`/faq`, the `lemonsqueezy` API webhook stub, and `src/lib/refund/*` —
are intentionally **out of scope** for this ADR. They contain the
contractual record of the prior dual-processor design and the
Lemon-Squeezy-as-MoR disclosure that was correct at the time of
publication. They will be revised in a follow-up if and when the
Excel/Report products are migrated to Stripe checkout flows; until
then they accurately describe the legal posture for those products.

## Consequences

- The public Tokushoho / LP / Pricing surfaces match the Stripe Live
  registration filing one-to-one (Stripe-only, prices definite, dates
  definite) — which is what Stripe review needs to clear PODP-30.
- The home LP and Pricing page now publish concrete launch dates for
  Pro. We are committed to having Pro Monthly and Pro Annual live on
  June 9, 2026; this is consistent with the Phase 1 launch roadmap
  already in user memory.
- The Tokushoho page and the longer-form legal documents (Terms /
  Privacy / Refunds) temporarily disagree about whether
  Excel/Report use Lemon Squeezy. The Tokushoho page reflects the
  intended go-forward stance; the long-form documents reflect the
  in-force contractual position until they are explicitly revised.
  This is a known, time-limited inconsistency; QA should confirm a
  follow-up ticket exists to align all surfaces before the
  2026-07-23 Excel launch.

### 2026-05-10 — PODP-32 (Phase 2: long-form legal docs)

The temporary inconsistency described above was closed for the
long-form legal documents on 2026-05-10:

- `/legal/privacy` → v0.2 (2026-05-11): Lemon Squeezy / MoR removed
  from scope, payment-information, legal-bases table, sub-processor
  table, retention table, security, and trademarks sections.
- `/legal/terms` → v0.3 (2026-05-11): Excel/Report sections rewritten
  to "not yet on sale; payment, seller-of-record, and tax-collection
  terms specified before launch"; Lemon Squeezy removed from
  trademarks and force-majeure provider lists.
- `/legal/refunds` → v1.2 (2026-05-11): Excel/Report rewritten as
  "not yet on sale"; LSQ MoR sentence and EU/UK 14-day waiver
  consent-collection sentence removed; trademarks de-listed.

Out of scope for PODP-32 (intentionally untouched): the
`/api/lemonsqueezy/webhook` stub and `src/lib/refund/check-eligibility.ts`
helper. These are non-public-surface code reserved as a stub for the
2026-07-23 Excel launch decision; the rollback path (re-introducing
processor sections before launch) is unchanged.

### 2026-05-11 — PODP-34 (Phase 3: FAQ sync)

A follow-up audit found 17 Lemon Squeezy / MoR references remaining
in `src/app/faq/page.tsx`. To eliminate the Stripe re-review risk of
the reviewer reading `/faq` and finding it inconsistent with
`/legal/tokushoho`, `/legal/privacy`, `/legal/terms`, and
`/legal/refunds`, COO authorized scope expansion to also synchronize
FAQ on 2026-05-11:

- Q10 (Excel Template) and Q12 (Benchmark Report) now state "not yet
  on sale; payment processor and tax-collection arrangement to be
  specified in Terms before launch", with prices and planned launch
  dates retained.
- Q14 (Refunds), Q15 (Payment Methods), Q16 (Currency), Q17 (Missing
  email), Q21 (Privacy/Terms reference) consolidate to a Stripe-only
  description for the products on sale, with Excel/Report processor
  details deferred to a future Terms revision.
- Q25 question + answer and the page-footer trademarks paragraph
  drop "Lemon Squeezy" from the trademark/affiliation list, matching
  the trademark list now used in `/legal/terms` v0.3 and
  `/legal/privacy` v0.2.
- FAQPage JSON-LD schema (which AIO sources cite as a fact source)
  was preserved structurally; only the `acceptedAnswer.text` and
  rendered rich text were edited in-place.
- Last-updated date moved 2026-05-04 → 2026-05-11.

After PODP-34, a strict word-boundary grep across the public web
surface (`src/app/legal/**/page.tsx`, `src/app/faq/page.tsx`, `/`,
`/pricing`, `/legal/tokushoho`) returns zero hits for "Lemon
Squeezy", "lemonsqueezy", "LSQ", "Merchant of Record", and "MoR".
The `/api/lemonsqueezy/webhook` stub and the refund-helper file
remain intentionally out of scope (same justification as PODP-32).

Stripe re-approval consistency is now closed across all public
documents. The rollback path before the 2026-07-23 Excel launch is
to revise Terms (and re-add the relevant processor / MoR / EU-UK
consent paragraphs that were removed in v0.3) at that time.

### 2026-05-11 — PODP-32 follow-up: privacy/terms/refunds sync confirmed

The long-form legal docs (`/legal/privacy` v0.2, `/legal/terms` v0.3,
`/legal/refunds` v1.2) were synchronized in commit `216f091`. A
production word-boundary grep on `/legal/{terms,privacy,refunds}`
returns zero hits for "Lemon Squeezy", "lemonsqueezy", "LSQ",
"Merchant of Record", and "MoR".

### 2026-05-11 — PODP-34: /faq sync + bundled consistency fixes

Bundled with the FAQ sync (commit `df0ed59`), QA review on
2026-05-11 surfaced four additional public-surface inconsistencies
that posed a Stripe re-review risk. All were fixed in a single
follow-up commit alongside an ADR re-confirmation:

- `/faq` (`src/app/faq/page.tsx`): production curl re-verified.
  `grep -ciE "lemon|merchant of record"` returns zero on the
  rendered HTML, including FAQPage JSON-LD `acceptedAnswer.text`.
- `/pricing` refund window line corrected from "Refunds available
  within 14 days (Pro Annual / Lifetime)" to "Refunds: 14 days
  (Pro Annual) / 7 days + 0 launches (Lifetime)" — matches
  `/legal/refunds` v1.2 and `/legal/tokushoho` v1.2.
- `/legal/privacy` "About this version" blockquote updated to
  "v0.1 baseline (revised to v0.2 on 2026-05-11)" — closes the
  internal contradiction with the v0.2 metadata.
- `/legal/tokushoho` last-updated date moved 2026-05-10 → 2026-05-11
  and version bumped 1.1 → 1.2 — aligns with the rest of the legal
  page set.
- `src/app/sitemap.ts` adds `/legal/tokushoho` (priority 0.5) as a
  new sitemap entry and bumps `/legal/{terms,privacy,refunds}`
  lastModified to 2026-05-11.

After this bundle, the public-surface state for Stripe re-review is:
all four legal pages dated 2026-05-11, FAQ dated 2026-05-11, /pricing
refund window matches /legal/refunds, no Lemon-Squeezy / MoR
mentions on any rendered page, and sitemap fully advertises the
Tokushoho page to crawlers (including Stripe's reviewer).
