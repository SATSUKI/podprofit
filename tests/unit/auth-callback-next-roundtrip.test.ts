/**
 * PODP-64 — the magic-link callback must read `?next=` and redirect
 * there after exchanging the code for a session. This closes the
 * round-trip started by `/api/stripe/checkout?plan=...` → `/login` →
 * magic-link email → `/auth/callback?code=...&next=...` →
 * back to `/api/stripe/checkout?plan=...` with cookies attached.
 *
 * Why source-text? `route.ts` boots a real Supabase SSR client which
 * needs env to instantiate — runtime-testing requires the same
 * cookies/headers plumbing as Next.js does in production. The behaviour
 * we are guarding is the existence of the `?next=` read + default
 * fallback to `/account`. Both are stable, narrow textual contracts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CALLBACK_PATH = path.resolve(
  __dirname,
  "../../src/app/auth/callback/route.ts",
);
const source = readFileSync(CALLBACK_PATH, "utf8");

describe("/auth/callback — PODP-64 ?next= round-trip", () => {
  it("reads the `next` query param", () => {
    expect(source).toMatch(/searchParams\.get\(["']next["']\)/);
  });

  it("falls back to /account when `next` is missing", () => {
    expect(source).toMatch(/\?\?\s*["']\/account["']/);
  });

  it("redirects to the resolved `next` target after exchanging the code", () => {
    // The callback resolves `new URL(next, url.origin)` and feeds it to
    // `NextResponse.redirect`. Asserting on both pieces pins the
    // contract — a refactor that drops the URL resolution would break
    // here.
    expect(source).toContain("new URL(next, url.origin)");
    expect(source).toContain("NextResponse.redirect");
  });
});
