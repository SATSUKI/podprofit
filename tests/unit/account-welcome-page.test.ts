import { describe, expect, it } from "vitest";
import { metadata } from "@/app/account/welcome/page";

/**
 * /account/welcome is the Stripe checkout success_url landing page (PODP-48).
 *
 * It must:
 *  - exist (the success_url returns 200, not 404 — Stripe-review blocker)
 *  - opt out of indexing (per-user dynamic URL, no AIO value)
 *  - announce its title clearly so the browser tab is not generic post-payment
 */
describe("/account/welcome page metadata", () => {
  it("opts out of indexing (per-user dynamic URL)", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("uses a welcoming title (browser tab post-payment)", () => {
    expect(metadata.title).toBe("Welcome to PODProfit");
  });

  it("does not declare a canonical URL (would conflict with noindex)", () => {
    // Setting a canonical on a noindex page is a soft contradiction Google
    // sometimes flags. Keeping this absent is the right posture.
    expect(metadata.alternates?.canonical).toBeUndefined();
  });
});
