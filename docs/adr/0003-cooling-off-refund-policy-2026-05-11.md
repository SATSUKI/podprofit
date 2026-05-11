# ADR 0003: Cooling-off refund policy — 14-day unconditional Lifetime window, no Pro subscription proration

Status: Accepted
Date: 2026-05-11
Deciders: CEO (policy), Engineering (PODProfit) — instruction via COO

## Context

PODProfit's refund policy was originally encoded in Terms v0.2 §7.1 / §7.3
and in `src/lib/refund/check-eligibility.ts` as:

1. **Lifetime ($149)** — refundable within 7 days of purchase **AND** with
   zero `calculator_launched` events recorded for the account since
   purchase. The "zero launches" gate was server-verified against
   `public.usage_events`.
2. **Pro Monthly / Pro Annual** — informally "no prorated refunds",
   but no helper function existed; the eligibility surface only
   covered Lifetime and the (future) Excel / Report digital downloads.
3. **Excel Template / Benchmark Report** — refundable iff zero
   `product_downloaded` rows exist for the relevant `product_slug`
   since purchase. (Unchanged by this ADR.)

Two operational issues with the original Lifetime gate surfaced:

- **UK / EU 14-day cooling-off mismatch.** Consumer law in those
  jurisdictions provides a 14-day unconditional withdrawal window for
  digital purchases unless the EU Art 16(m) consent flow is invoked
  *and* delivery has begun. PODP-50 (ADR 0002 follow-up) added the
  Art 16(m) consent on the Stripe Checkout surface, but Lifetime
  customers may legitimately want a refund anyway during a 14-day
  window. A 7-day policy is shorter than the regulatory floor and
  triggers chargeback risk.
- **"Zero launches" is operationally indefensible.** Denying a refund
  because the customer used the product they paid for reads as
  punitive in support correspondence and is unlikely to survive a
  chargeback dispute. The original intent was anti-abuse, but the
  signal (one launch ≠ abuse) was too noisy. We accept the small
  abuse risk in exchange for a clearer, regulator-aligned policy.

## Decision

CEO-confirmed policy as of 2026-05-11:

1. **Lifetime**: refundable within **14 days** of purchase. The
   "zero calculator launches" condition is **removed**. Calendar age
   is the *sole* eligibility gate.
2. **Pro Monthly / Pro Annual**: hard-coded "no prorated refunds".
   Cancellation preserves access until period end; no refund of the
   unused portion. This is now exposed as
   `checkSubscriptionRefundEligibility(planId)` returning
   `{ eligible: false, reason: "no_proration" }` unconditionally.
3. **Excel Template / Benchmark Report**: unchanged from prior
   (zero post-purchase downloads).

Code-level changes:

- `LIFETIME_REFUND_WINDOW_DAYS`: `7 → 14`.
- `checkLifetimeRefundEligibility`: stops querying `usage_events`.
- New helper `checkSubscriptionRefundEligibility`.
- `EligibilityResult.reason`: `"calculator_launched"` removed,
  `"no_proration"` added.

Documentation surface (`/legal/refunds`, `/legal/terms`, Tokushoho) is
being updated in a separate parallel commit by the legal stream
(v1.2 → v1.3). This ADR records the engineering decision; the
customer-facing copy revision is tracked there.

## Consequences

### Positive

- Aligns with UK / EU 14-day cooling-off practice, reducing
  chargeback dispute friction.
- Refund eligibility for Lifetime becomes a pure function of two
  timestamps (purchase, now) — easier to audit, easier to explain in
  support, harder to introduce regressions in.
- `checkSubscriptionRefundEligibility` codifies a policy that was
  previously documented only in prose.

### Negative / risks

- Modest abuse window: a Lifetime buyer can extract 14 days of usage
  and refund. Mitigation: at expected launch volume (single-digit
  Lifetime purchases / week) this is bounded; we will revisit if
  refund rate > 5% in a rolling 30-day window.
- The `calculator_launched` event type remains in
  `public.usage_events` and continues to be written by the API
  layer. It is no longer consulted by refund-eligibility code, but
  the dedupe / future-analytics use cases noted in the migration
  header (`20260513_000008_usage_events.sql`) still apply.
  - We deliberately do **not** alter the past migration
    (`20260513_000008_usage_events.sql`) per the project's
    "migrations are immutable" rule. The migration header still
    references refund eligibility; this ADR is the canonical
    update. A future migration may add a comment-only superseding
    note when convenient (no schema change required).

### Neutral

- `checkLifetimeRefundEligibility` keeps `supabase` and `userId`
  parameters in its signature for forward compatibility (e.g. a
  future revision that consults an audit row to detect
  multi-refund abuse). They are currently unused; the next time the
  signature is touched is a good moment to drop them if no consumer
  has materialised.

## References

- CEO policy confirmation: 2026-05-11 (COO instruction log).
- Prior state: `src/lib/refund/check-eligibility.ts` @ commit
  `f743f14` and earlier.
- Related: ADR 0002 (Stripe-only payment stack, Art 16(m) consent),
  migration `20260513_000008_usage_events.sql`.
