"use client";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";

/**
 * Browser-side Stripe.js loader.
 *
 * `loadStripe` returns a promise that resolves to the Stripe.js singleton
 * (lazy-loaded once per page). We cache the promise so consumers in different
 * components share the same instance.
 *
 * The publishable key is set via `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. When it
 * is unset (e.g. CI builds without env vars), `getBrowserStripe()` returns a
 * promise that resolves to `null` — callers should treat that as "Stripe is
 * not configured yet" and short-circuit to a graceful error.
 *
 * Today Checkout sessions are server-redirect (303 from /api/stripe/checkout),
 * so this client SDK is only used for advanced flows (Stripe Elements / Embed
 * Checkout) that we don't ship at launch. The loader is kept thin so we can
 * upgrade to Embedded Checkout without churn.
 */

let stripePromise: Promise<StripeJs | null> | null = null;

export function getBrowserStripe(): Promise<StripeJs | null> {
  if (stripePromise) return stripePromise;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    stripePromise = Promise.resolve(null);
    return stripePromise;
  }
  stripePromise = loadStripe(key);
  return stripePromise;
}
