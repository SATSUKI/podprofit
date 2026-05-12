/**
 * Refund-side pricing constants.
 *
 * Kept in a tiny module separate from `src/lib/stripe/products.ts` because
 * the products catalog is the *display* shape (lookup_key, tagline, etc.)
 * while these constants are the *settlement* shape (cents amount that
 * we'd refund). Mixing them invites the kind of off-by-100 bug we very
 * much want to avoid on a real money path.
 *
 * USD-only at launch. If we ever bill in non-USD currencies, this
 * module grows a per-currency map and the admin refund form picks up a
 * currency selector — see PODP-53 v2 backlog.
 */

/**
 * Lifetime headline price: $149.00 → 14900 cents.
 *
 * Source of truth is the Stripe price configured under lookup_key
 * `price_v1_lifetime_usd_149`. We hard-code the cents amount here so
 * the admin "suggested refund amount" field has a sane default without
 * requiring a Stripe round-trip on every refund-page load.
 *
 * If the headline price ever moves, the lookup_key changes too (per
 * the `price_v{n}_{plan}_{currency}_{amount}` convention) — at that
 * point this constant changes in the same migration.
 */
export const LIFETIME_REFUND_PRICE_USD_CENTS = 14_900;

/**
 * Lifetime refund currency. Stripe expects lowercase ISO 4217 here.
 */
export const LIFETIME_REFUND_CURRENCY = "usd" as const;
