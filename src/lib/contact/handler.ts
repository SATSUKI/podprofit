/**
 * Pure handler for `/api/contact` POST. Factored out of the route so
 * vitest can exercise insertion / spam classification / rate limiting
 * without spinning up next/server.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  classifyInquiry,
  isDuplicateBurst,
  type SpamClassification,
} from "./spam-detection";
import { consumeContact, type ContactRateLimitResult } from "./rate-limit";

export const ContactRequestSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().email().max(254),
  category: z
    .enum(["bug", "refund", "feature_request", "pricing", "general", "other"])
    .optional()
    .default("general"),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10).max(5000),
  /** Honeypot — rendered hidden in the UI. Bots fill this; humans don't. */
  website: z.string().optional(),
});

export type ContactRequest = z.infer<typeof ContactRequestSchema>;

export type HandleContactResult =
  | { kind: "ok"; inquiryId: string | null; spamSilent: boolean }
  | { kind: "validation_error"; detail: string }
  | { kind: "rate_limited"; rateLimit: ContactRateLimitResult }
  | { kind: "duplicate_burst" }
  | { kind: "server_error"; detail: string };

export interface HandleContactDeps {
  supabase: SupabaseClient;
  /** Resolved IP (or null when no upstream proxy header present). */
  ip: string | null;
  userAgent: string | null;
  /** Authenticated user id when the submitter is logged in (else null). */
  userId: string | null;
  /** Injectable clock for tests. */
  now?: number;
}

/**
 * Handle one contact submission end-to-end.
 *
 * Order of operations (cheapest first, abort early):
 *   1. zod validation        → { validation_error }
 *   2. honeypot / URL flood / keyword classification (pure)
 *      - if spam: still INSERT with status='spam' (so we can audit) AND
 *        return { ok, spamSilent: true }. The route returns 200 to the
 *        caller so the bot can't distinguish accept vs reject.
 *   3. IP-based rate limit (5 / hour)  → { rate_limited }
 *   4. duplicate-burst dedupe (same email, < 10s)  → { duplicate_burst }
 *      (The route returns 200 so callers can't probe for dedupe state.)
 *   5. INSERT row, return id.
 */
export async function handleContact(
  raw: unknown,
  deps: HandleContactDeps,
): Promise<HandleContactResult> {
  // --- 1. Validate -------------------------------------------------------
  let parsed: ContactRequest;
  try {
    parsed = ContactRequestSchema.parse(raw);
  } catch (err) {
    return {
      kind: "validation_error",
      detail: (err as Error).message,
    };
  }

  // --- 2. Spam classification (pure) ------------------------------------
  const classification: SpamClassification = classifyInquiry({
    message: parsed.message,
    honeypotValue: parsed.website,
  });

  // Honeypot path: don't insert, don't query DB. Silent success.
  if (classification.spam && classification.reason === "honeypot") {
    return { kind: "ok", inquiryId: null, spamSilent: true };
  }

  // --- 3. Rate limit ----------------------------------------------------
  // We only consume a slot for non-honeypot traffic so honeypot bursts
  // don't poison the legitimate budget for a shared CGNAT IP.
  if (deps.ip) {
    const rl = consumeContact(`contact:${deps.ip}`, deps.now);
    if (!rl.ok) {
      return { kind: "rate_limited", rateLimit: rl };
    }
  }

  // --- 4. Duplicate-burst dedupe ----------------------------------------
  // Look up the most-recent prior inquiry from the same email. The mock
  // doesn't implement order/limit, so we scan all and pick the max.
  try {
    const { data: priorRows, error } = await deps.supabase
      .from("inquiries")
      .select("created_at")
      .eq("email", parsed.email);
    if (error) {
      return { kind: "server_error", detail: error.message };
    }
    const nowMs = deps.now ?? Date.now();
    const priorMs = pickMostRecentMs(priorRows);
    if (isDuplicateBurst(priorMs, nowMs)) {
      return { kind: "duplicate_burst" };
    }
  } catch (err) {
    return { kind: "server_error", detail: (err as Error).message };
  }

  // --- 5. Insert --------------------------------------------------------
  const status =
    classification.spam && classification.reason !== "honeypot" ? "spam" : "new";
  const category = classification.spam ? "other" : parsed.category;
  // Generate id client-side so we can echo it back without an extra
  // SELECT round-trip and so vitest assertions on the inserted row can
  // pin a deterministic value.
  const inquiryId = randomUuid();

  try {
    const { error } = await deps.supabase.from("inquiries").insert({
      id: inquiryId,
      name: parsed.name ?? null,
      email: parsed.email,
      category: classification.spam ? "other" : category,
      subject: parsed.subject ?? null,
      message: parsed.message,
      status,
      user_id: deps.userId,
      ip_address: deps.ip,
      user_agent: deps.userAgent ? deps.userAgent.slice(0, 512) : null,
    });
    if (error) {
      return { kind: "server_error", detail: error.message };
    }
    return {
      kind: "ok",
      inquiryId,
      spamSilent: classification.spam,
    };
  } catch (err) {
    return { kind: "server_error", detail: (err as Error).message };
  }
}

function randomUuid(): string {
  // Edge / Node 18+: globalThis.crypto.randomUUID is standardised.
  // Fallback only if running in a degraded runtime — extremely unlikely.
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // RFC 4122 v4 fallback (test/old-Node only).
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function pickMostRecentMs(rows: unknown): number | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let best: number | null = null;
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const v = (r as { created_at?: unknown }).created_at;
    if (typeof v !== "string") continue;
    const t = Date.parse(v);
    if (!Number.isFinite(t)) continue;
    if (best == null || t > best) best = t;
  }
  return best;
}
