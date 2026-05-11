/**
 * Basic-auth verification for the /admin/* surface (PODP-29).
 *
 * Edge-runtime compatible (no Node `crypto`, no Buffer dependency) — uses
 * `atob` to decode the header and a constant-time string comparison to
 * avoid timing leaks on the password check.
 *
 * Env contract:
 *   - ADMIN_USER, ADMIN_PASS — both required. Missing either disables the
 *     route entirely (returns `not_configured`), so a misconfigured prod
 *     deploy fails closed rather than exposing the surface unprotected.
 */

export type AdminAuthResult =
  | { kind: "ok" }
  | { kind: "missing_header" }
  | { kind: "invalid_credentials" }
  | { kind: "not_configured" };

/**
 * Constant-time string equality. Both inputs must be the same length to
 * return `true`; we short-circuit on length mismatch (the length itself
 * leaks nothing useful because the expected length is configured by us).
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function verifyBasicAuth(
  headerValue: string | null,
  expectedUser: string | undefined,
  expectedPass: string | undefined,
): AdminAuthResult {
  if (!expectedUser || !expectedPass) {
    return { kind: "not_configured" };
  }
  if (!headerValue || !headerValue.toLowerCase().startsWith("basic ")) {
    return { kind: "missing_header" };
  }

  const encoded = headerValue.slice(6).trim();
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return { kind: "invalid_credentials" };
  }

  const idx = decoded.indexOf(":");
  if (idx < 0) return { kind: "invalid_credentials" };

  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);

  if (
    constantTimeEqual(user, expectedUser) &&
    constantTimeEqual(pass, expectedPass)
  ) {
    return { kind: "ok" };
  }
  return { kind: "invalid_credentials" };
}
