/**
 * Public-facing contact constants.
 *
 * Centralised here so a future number / email / hours change is one edit
 * away from every legal page, JSON-LD ContactPoint, /about and /contact —
 * and so unit tests can pin the exact wire format used downstream.
 *
 * 050 number provenance: My050 (Brastel) — acquired 2026-05-12 (PODP-33).
 * Stored separately in secrets/contacts.env outside the public repo.
 *
 * E.164 normalisation note: secrets/contacts.env stores the display string
 * `+81506880-2598` for human readability, but the strict E.164 wire format
 * required by schema.org `ContactPoint.telephone` (and by the Stripe
 * `support_phone` API) is a single `+` followed by the country code and
 * the subscriber number with no separators. For Japan, the leading 0 of
 * the 050 subscriber number is dropped and replaced by `+81`, yielding
 * `+815068802598` (12 digits including the country code).
 *
 * Hard-coded rather than env-driven on purpose at this stage: the number
 * changes at most yearly, a rebuild costs ~90s on Vercel, and an env var
 * adds two failure modes (missing var at build vs at runtime) for zero
 * gain. Promote to PUBLIC_SUPPORT_PHONE only if/when a multi-brand
 * rollout needs per-deploy overrides.
 */

export const SUPPORT_EMAIL = "hello@getpodprofit.com" as const;

/** Display format for human readers (legal pages, /about, /contact). */
export const SUPPORT_PHONE_DISPLAY = "050-6880-2598" as const;

/**
 * Strict E.164 format for machine consumers
 * (schema.org ContactPoint.telephone, Stripe support_phone, vCard, etc.)
 * — no hyphens, no spaces, single leading `+`, JP country code 81 with
 * the leading 0 of the 050 prefix dropped.
 */
export const SUPPORT_PHONE_E164 = "+815068802598" as const;

/** Operating hours for the support phone (mail-first guidance retained). */
export const SUPPORT_PHONE_HOURS_JA =
  "平日 10:00-18:00 JST(メール対応推奨)" as const;

export const SUPPORT_PHONE_HOURS_EN =
  "Weekdays 10:00-18:00 JST (email preferred)" as const;
