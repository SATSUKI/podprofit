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
