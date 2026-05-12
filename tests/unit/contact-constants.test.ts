import { describe, expect, it } from "vitest";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_E164,
  SUPPORT_PHONE_HOURS_EN,
  SUPPORT_PHONE_HOURS_JA,
} from "@/lib/contact";

/**
 * Guard the public-facing contact constants exported from src/lib/contact.ts.
 *
 * Why: every downstream consumer — the Tokushoho 連絡先 table, the /about
 * JSON-LD ContactPoint, the /contact alternative-channel aside, and the
 * Stripe support_phone field — pulls its value from this module. If any
 * of these constants drifts the legal disclosure breaks across the whole
 * site, so a single, unambiguous test file owns the invariants (PODP-33).
 */
describe("src/lib/contact constants (PODP-33)", () => {
  it("exposes the canonical My050 display number with JP hyphenation", () => {
    // 050-6880-2598 is the human-facing canonical string that must appear
    // verbatim on Tokushoho. Any change here will fail the legal-page
    // assertions on purpose.
    expect(SUPPORT_PHONE_DISPLAY).toBe("050-6880-2598");
  });

  it("normalises the phone number to strict E.164 for JSON-LD / Stripe", () => {
    // Strict E.164: `+` + country code + subscriber number, no separators,
    // up to 15 digits total. JP 050 numbers drop the leading 0; the result
    // is `+815068802598` (12 digits inc. the country code).
    expect(SUPPORT_PHONE_E164).toBe("+815068802598");
    // Format guard so a future typo introducing a hyphen or space fails.
    expect(SUPPORT_PHONE_E164).toMatch(/^\+[1-9]\d{7,14}$/);
    // Must encode JP country code 81.
    expect(SUPPORT_PHONE_E164.startsWith("+81")).toBe(true);
  });

  it("keeps the display and E.164 forms numerically consistent (no transcription drift)", () => {
    // Stripping hyphens from the display number, dropping the leading 0,
    // and prepending +81 must produce the E.164 value. This catches a
    // future edit that updates one constant but forgets the other.
    const digits = SUPPORT_PHONE_DISPLAY.replace(/-/g, "");
    const expected = `+81${digits.replace(/^0/, "")}`;
    expect(expected).toBe(SUPPORT_PHONE_E164);
  });

  it("publishes bilingual operating-hours strings for legal + JSON-LD surfaces", () => {
    // Tokushoho (JP) uses the JA string; /about + /contact (EN audience)
    // use the EN string. Both must mention the 10:00-18:00 JST window so
    // the disclosure matches the JSON-LD OpeningHoursSpecification.
    expect(SUPPORT_PHONE_HOURS_JA).toContain("平日 10:00-18:00 JST");
    expect(SUPPORT_PHONE_HOURS_JA).toContain("メール対応推奨");
    expect(SUPPORT_PHONE_HOURS_EN).toContain("Weekdays 10:00-18:00 JST");
    expect(SUPPORT_PHONE_HOURS_EN.toLowerCase()).toContain("email preferred");
  });

  it("keeps the support email aligned with the rest of the legal set", () => {
    // Repeated in Privacy, Terms, Refunds, Tokushoho and the contact form
    // — single source of truth so a future re-route (e.g. support@…) is
    // a one-line edit.
    expect(SUPPORT_EMAIL).toBe("hello@getpodprofit.com");
  });
});
