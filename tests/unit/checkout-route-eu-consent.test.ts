import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Source-level assertion for the EU/UK Article 16(m) consent collection
 * (PODP-50, W1).
 *
 * Why a source-text assertion (not a runtime test)?
 *
 *   - The route handler creates a real Stripe Checkout Session via the
 *     SDK. Mocking that out into a Stripe Pricing/Checkout Session
 *     fixture is high-effort and gives us almost nothing — the failure
 *     mode we actually care about is "someone refactors and silently
 *     drops the consent_collection block", which is a textual
 *     regression on the static call-site.
 *   - Stripe's API contract is well-typed; if the field name changes
 *     they'll bump the SDK major and we'll catch it at compile time.
 *   - This test is fast (single file read) and stable (matches a
 *     specific multi-line pattern, not whitespace).
 *
 * If the consent block is moved into a helper file, point this test at
 * the new file's path.
 */

const ROUTE_PATH = path.resolve(
  __dirname,
  "../../src/app/api/stripe/checkout/route.ts",
);

describe("Stripe checkout route — EU/UK Article 16(m) waiver (PODP-50 W1)", () => {
  const source = readFileSync(ROUTE_PATH, "utf8");

  it("collects terms_of_service consent so EU/UK 14-day withdrawal can be waived", () => {
    // The presence of `terms_of_service: "required"` is what flips Stripe
    // Checkout into showing the must-check waiver checkbox.
    expect(source).toContain("consent_collection");
    expect(source).toMatch(/terms_of_service:\s*"required"/);
  });

  it("supplies the literal waiver language as custom_text", () => {
    // The exact phrasing was reviewed by Legal — keeping it in the
    // source (not in a copy module) makes diff review easy when the
    // waiver text is updated.
    expect(source).toContain("custom_text");
    expect(source).toContain("terms_of_service_acceptance");
    expect(source).toContain(
      "14-day EU/UK right of withdrawal once access is granted",
    );
  });

  it("still sets automatic_tax + allow_promotion_codes (regression guard)", () => {
    // The new consent block lives next to these — make sure neither
    // got accidentally dropped during the edit.
    expect(source).toMatch(/automatic_tax:\s*\{\s*enabled:\s*true\s*\}/);
    expect(source).toContain("allow_promotion_codes: true");
  });
});
