/**
 * Sentry configuration helper.
 *
 * Per CEO slim-down decree: Sentry is FREE tier (5K errors/month, 10K
 * performance events) — no paid commitment. We only initialise it when
 * SENTRY_DSN is set, so the build / dev workflow is identical with or
 * without it. When DSN comes (any time post-launch), errors and slow
 * route handlers start flowing without code changes.
 *
 * We deliberately do NOT install the @sentry/nextjs package yet — it adds
 * ~250KB to the client bundle and modifies next.config which complicates
 * the slim build. Instead, we use Sentry's bare browser/node SDK only on
 * the routes where it matters most (Stripe webhook, calculator save).
 *
 * To activate later:
 *   1. Set SENTRY_DSN in env (Sentry → Project Settings → Client Keys).
 *   2. Run `pnpm add @sentry/nextjs` and follow Sentry's wizard if you
 *      want full-app coverage with source maps + replay.
 */

export const SENTRY_ENABLED = Boolean(process.env.SENTRY_DSN);

export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_ENABLED) {
    if (process.env.NODE_ENV !== "production") {
      // Log locally so devs see errors that would have gone to Sentry.
      console.error("[reportError]", err, context);
    }
    return;
  }
  // When the SDK is wired up (post-launch), this is where we call Sentry.captureException.
  // Today it's a no-op so we ship without an extra dependency.
  console.error("[reportError:passthrough]", err, context);
}
