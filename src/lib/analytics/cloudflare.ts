/**
 * Cloudflare Web Analytics — minimal client helper.
 *
 * Per `measurement-spec-v1.md` §4.1, custom events are sent through the
 * Cloudflare beacon already loaded in `<head>`. The beacon attaches a global
 * `__cfBeacon` once `beacon.min.js` finishes booting; before that, we drop
 * the event silently (Cloudflare's own client does the same — there is no
 * persistent client-side queue available without a paid Workers Analytics
 * Engine, which we are deliberately avoiding for Phase 1).
 *
 * Hard rules (Privacy v0.1 §2.4 + measurement-spec §4.1):
 *   - Never send `email`, `user_id`, `share_slug`, or input text.
 *   - Props are aggregate-only categorical labels (vendor, marketplace, …).
 *   - Cookieless: this helper never reads or writes cookies / localStorage.
 *
 * Token wiring: when `process.env.NEXT_PUBLIC_CF_WA_TOKEN` is undefined, the
 * `<Script>` tag in `layout.tsx` doesn't load the beacon, so `trackEvent` is
 * a no-op. This is the documented "fallback" for local dev / preview builds.
 */

type EventProps = Record<string, string | number | boolean>;

interface CfBeacon {
  events?: Array<{ name: string; props?: EventProps }>;
}

function getCfBeacon(): CfBeacon | null {
  if (typeof window === "undefined") return null;
  // The Cloudflare beacon attaches `__cfBeacon` to the global. We probe via
  // a structural cast (no `any`) so the rest of the helper stays type-safe.
  const win = window as unknown as { __cfBeacon?: CfBeacon };
  return win.__cfBeacon ?? null;
}

/**
 * Track a Cloudflare Web Analytics custom event.
 *
 * Returns `true` if the event was queued on `__cfBeacon`, `false` otherwise
 * (server-side render, beacon not loaded, or token not configured).
 *
 * Callers MUST validate that `props` contain no PII before passing them in;
 * this helper does not redact.
 */
export function trackCfEvent(name: string, props?: EventProps): boolean {
  if (typeof window === "undefined") return false;
  if (!process.env.NEXT_PUBLIC_CF_WA_TOKEN) return false;

  const beacon = getCfBeacon();
  if (!beacon) return false;

  // Cloudflare's beacon initialises `events` lazily — be defensive.
  if (!Array.isArray(beacon.events)) {
    beacon.events = [];
  }
  beacon.events.push(props ? { name, props } : { name });
  return true;
}
