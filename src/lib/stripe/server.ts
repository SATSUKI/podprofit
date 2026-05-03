import "server-only";
import Stripe from "stripe";

/**
 * Server-only Stripe client.
 *
 * Lazy-initialized so the module can be imported without env vars (e.g., during
 * build of pages that don't actually call Stripe). The check fires only when used.
 */
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is required to use the Stripe client");
  }
  // Use the SDK's default API version (the version it was built against).
  // Pin explicitly via STRIPE_API_VERSION env var only after compatibility testing.
  stripe = new Stripe(secret, { typescript: true });
  return stripe;
}
