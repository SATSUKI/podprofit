import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { handleContact } from "@/lib/contact/handler";
import { clientIpFromHeaders } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

/**
 * Public Contact form endpoint. POST only.
 *
 * Behaviour matrix (see `src/lib/contact/handler.ts` for the pure logic):
 *   - 200 + { ok: true }                       → submitted (or honeypot/spam — silent)
 *   - 400 + { error, detail }                  → schema/validation failure
 *   - 429 + { error: 'rate_limit_exceeded' }   → > 5 inquiries / hour / IP
 *   - 500 + { error: 'server_error' }          → DB / unexpected failure
 *
 * Privacy: email + IP + UA are stored. Privacy Policy v0.1 §2.7 / §2.8 +
 * the new §2.9 "Contact form" disclosure cover this; the form UI also
 * surfaces a one-line notice next to the submit button.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", detail: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent");

  // Authenticated submitter detection: best-effort. If Supabase auth isn't
  // configured (local dev / unit tests), we skip it and treat the submitter
  // as anonymous. Server-only client returns service_role; we read the
  // Authorization bearer (set by the browser when logged in) to identify
  // the user without trusting client-side claims.
  let userId: string | null = null;
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;
      if (token) {
        const supabaseForAuth = createServerSupabase();
        const { data, error } = await supabaseForAuth.auth.getUser(token);
        if (!error && data.user) {
          userId = data.user.id;
        }
      }
    } catch {
      /* anonymous submitter — fall through */
    }
  }

  // For the actual write we use the service-role client so the INSERT
  // bypasses RLS (the row-level "anyone can insert" policy is the safety
  // net for any future public PostgREST direct path).
  let supabase;
  try {
    supabase = createServerSupabase();
  } catch (err) {
    return NextResponse.json(
      { error: "server_error", detail: (err as Error).message },
      { status: 500 },
    );
  }

  const result = await handleContact(body, {
    supabase,
    ip,
    userAgent,
    userId,
  });

  switch (result.kind) {
    case "ok":
      // Honeypot + classified-spam paths return 200 to avoid telling bots
      // their submission was rejected.
      return NextResponse.json(
        { ok: true, inquiryId: result.inquiryId },
        { status: 200 },
      );
    case "validation_error":
      return NextResponse.json(
        { error: "invalid_request", detail: result.detail },
        { status: 400 },
      );
    case "rate_limited":
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          retry_after_seconds: result.rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": result.rateLimit.retryAfterSeconds.toString(),
          },
        },
      );
    case "duplicate_burst":
      // Treat as success from the caller's perspective so the user can't
      // probe for our dedupe state by submitting the same payload twice.
      return NextResponse.json({ ok: true, inquiryId: null }, { status: 200 });
    case "server_error":
      return NextResponse.json(
        { error: "server_error", detail: result.detail },
        { status: 500 },
      );
  }
}
