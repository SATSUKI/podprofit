/**
 * Launch-gate predicate (PODP-39).
 *
 * Reads `NEXT_PUBLIC_LAUNCH_DATE` (ISO yyyy-mm-dd) and returns true when
 * the current wall-clock time has reached the launch date. Before that
 * date, Pro CTAs on `/pricing` render disabled so we don't accept
 * subscription checkouts ahead of the public announcement.
 *
 * `NEXT_PUBLIC_LAUNCH_DATE` is intentionally a build-time string so
 * Next.js can inline it into the client bundle (the default of
 * 2026-06-09 keeps existing behaviour when the env var is unset).
 *
 * `now` arg is for tests; production callers should omit it.
 */

const DEFAULT_LAUNCH_DATE = "2026-06-09";

export function isLaunched(
  now: Date = new Date(),
  launchDateOverride?: string,
): boolean {
  const raw =
    launchDateOverride ??
    process.env.NEXT_PUBLIC_LAUNCH_DATE ??
    DEFAULT_LAUNCH_DATE;
  const launch = new Date(raw);
  if (Number.isNaN(launch.getTime())) {
    // Misconfigured env var: fail-closed (treat as not yet launched) so we
    // don't accidentally accept Pro checkouts because of a typo. Operator
    // sees the disabled CTA on /pricing and notices the misconfiguration.
    return false;
  }
  return now.getTime() >= launch.getTime();
}

export function getLaunchDateIso(launchDateOverride?: string): string {
  return (
    launchDateOverride ??
    process.env.NEXT_PUBLIC_LAUNCH_DATE ??
    DEFAULT_LAUNCH_DATE
  );
}
