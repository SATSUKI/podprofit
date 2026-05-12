import { describe, expect, it } from "vitest";
import {
  logRefundAttempt,
  REFUND_REASONS,
  REFUND_STATUSES,
  validateRefundEntry,
  type RefundAuditEntry,
} from "@/lib/refund/audit-log";
import { createSupabaseMock } from "./_supabase-mock";

const USER_ID = "user_refundee_42";
const OPERATOR_ID = "user_admin_07";
const OPERATOR_EMAIL = "ops@example.com";
const PI = "pi_test_abc123";
const REFUND_ID = "re_test_xyz789";

function baseEntry(overrides: Partial<RefundAuditEntry> = {}): RefundAuditEntry {
  return {
    user_id: USER_ID,
    stripe_payment_intent_id: PI,
    stripe_refund_id: null,
    amount_cents: 14900,
    currency: "usd",
    reason: "cooling_off_14_day",
    operator_id: OPERATOR_ID,
    operator_email: OPERATOR_EMAIL,
    status: "attempted",
    notes: null,
    ...overrides,
  };
}

describe("validateRefundEntry — argument shape mirrors SQL CHECK constraints", () => {
  it("accepts a minimally-valid cooling-off attempt", () => {
    expect(validateRefundEntry(baseEntry())).toBeNull();
  });

  it("rejects zero or negative amount_cents", () => {
    expect(validateRefundEntry(baseEntry({ amount_cents: 0 }))).toMatch(
      /amount_cents/,
    );
    expect(validateRefundEntry(baseEntry({ amount_cents: -1 }))).toMatch(
      /amount_cents/,
    );
  });

  it("rejects non-integer amount_cents (Stripe API never sends fractions)", () => {
    expect(validateRefundEntry(baseEntry({ amount_cents: 149.5 }))).toMatch(
      /amount_cents/,
    );
  });

  it("rejects malformed currency codes", () => {
    expect(validateRefundEntry(baseEntry({ currency: "USD" }))).toMatch(
      /currency/,
    );
    expect(validateRefundEntry(baseEntry({ currency: "us" }))).toMatch(
      /currency/,
    );
    expect(validateRefundEntry(baseEntry({ currency: "japan" }))).toMatch(
      /currency/,
    );
  });

  it("accepts lowercase 3-letter currency codes (usd, gbp, jpy)", () => {
    expect(validateRefundEntry(baseEntry({ currency: "usd" }))).toBeNull();
    expect(validateRefundEntry(baseEntry({ currency: "gbp" }))).toBeNull();
    expect(validateRefundEntry(baseEntry({ currency: "jpy" }))).toBeNull();
  });

  it("rejects unknown reason codes (must match table CHECK enum)", () => {
    // Cast through unknown to bypass the compile-time guard for the test.
    const result = validateRefundEntry(
      baseEntry({ reason: "made_up_reason" as unknown as RefundAuditEntry["reason"] }),
    );
    expect(result).toMatch(/reason must be one of/);
  });

  it("accepts every reason in REFUND_REASONS", () => {
    for (const reason of REFUND_REASONS) {
      const entry =
        reason === "other"
          ? baseEntry({ reason, notes: "operator notes" })
          : baseEntry({ reason });
      expect(validateRefundEntry(entry)).toBeNull();
    }
  });

  it("requires notes when reason='other' (table-level CHECK)", () => {
    expect(
      validateRefundEntry(baseEntry({ reason: "other", notes: null })),
    ).toMatch(/notes is required when reason='other'/);

    expect(
      validateRefundEntry(baseEntry({ reason: "other", notes: "   " })),
    ).toMatch(/notes is required when reason='other'/);

    expect(
      validateRefundEntry(
        baseEntry({ reason: "other", notes: "billing fluke; CEO approved" }),
      ),
    ).toBeNull();
  });

  it("rejects notes over the 2048-byte limit", () => {
    const longNotes = "a".repeat(2049);
    expect(validateRefundEntry(baseEntry({ notes: longNotes }))).toMatch(
      /2048-byte limit/,
    );
  });

  it("accepts notes exactly at 2048 bytes", () => {
    const exact = "a".repeat(2048);
    expect(validateRefundEntry(baseEntry({ notes: exact }))).toBeNull();
  });

  it("requires stripe_refund_id when status='succeeded'", () => {
    expect(
      validateRefundEntry(
        baseEntry({ status: "succeeded", stripe_refund_id: null }),
      ),
    ).toMatch(/stripe_refund_id is required when status='succeeded'/);

    expect(
      validateRefundEntry(
        baseEntry({ status: "succeeded", stripe_refund_id: REFUND_ID }),
      ),
    ).toBeNull();
  });

  it("rejects stripe_refund_id when status='failed' (no fake successes)", () => {
    expect(
      validateRefundEntry(
        baseEntry({ status: "failed", stripe_refund_id: REFUND_ID }),
      ),
    ).toMatch(/stripe_refund_id must be null when status='failed'/);

    expect(
      validateRefundEntry(
        baseEntry({ status: "failed", stripe_refund_id: null }),
      ),
    ).toBeNull();
  });

  it("allows status='attempted' with or without a refund_id (in-flight)", () => {
    expect(
      validateRefundEntry(
        baseEntry({ status: "attempted", stripe_refund_id: null }),
      ),
    ).toBeNull();

    expect(
      validateRefundEntry(
        baseEntry({ status: "attempted", stripe_refund_id: REFUND_ID }),
      ),
    ).toBeNull();
  });

  it("requires operator_id and operator_email to travel together", () => {
    expect(
      validateRefundEntry(
        baseEntry({ operator_id: OPERATOR_ID, operator_email: null }),
      ),
    ).toMatch(/operator_id and operator_email must both be set or both be null/);

    expect(
      validateRefundEntry(
        baseEntry({ operator_id: null, operator_email: OPERATOR_EMAIL }),
      ),
    ).toMatch(/operator_id and operator_email must both be set or both be null/);
  });

  it("accepts a fully system-driven refund (no operator)", () => {
    // Future webhook-driven auto-refund flow: both null is valid.
    expect(
      validateRefundEntry(
        baseEntry({ operator_id: null, operator_email: null }),
      ),
    ).toBeNull();
  });

  it("REFUND_STATUSES is the closed enum the table expects", () => {
    // Tripwire: if someone adds a status without a matching CHECK migration,
    // this test breaks loudly.
    expect(REFUND_STATUSES).toEqual(["attempted", "succeeded", "failed"]);
  });

  it("REFUND_REASONS is the closed enum the table expects", () => {
    // Same tripwire intent as above.
    expect(REFUND_REASONS).toEqual([
      "cooling_off_14_day",
      "no_proration_override",
      "product_not_downloaded",
      "goodwill",
      "bug_compensation",
      "duplicate_charge",
      "chargeback_pre_empt",
      "other",
    ]);
  });
});

describe("logRefundAttempt — write-side helper", () => {
  it("inserts a row into refund_audit_log on a valid attempt", async () => {
    const mock = createSupabaseMock({ seed: { refund_audit_log: [] } });

    const result = await logRefundAttempt(mock.client, baseEntry());

    expect(result.ok).toBe(true);
    const stored = mock.inspect("refund_audit_log");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      user_id: USER_ID,
      stripe_payment_intent_id: PI,
      amount_cents: 14900,
      currency: "usd",
      reason: "cooling_off_14_day",
      status: "attempted",
      operator_id: OPERATOR_ID,
      operator_email: OPERATOR_EMAIL,
    });
  });

  it("does NOT touch the DB when validation fails (fast-fail)", async () => {
    const mock = createSupabaseMock({ seed: { refund_audit_log: [] } });

    const result = await logRefundAttempt(
      mock.client,
      baseEntry({ amount_cents: -100 }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/amount_cents/);
    }
    expect(mock.inspect("refund_audit_log")).toHaveLength(0);
  });

  it("records succeeded outcome with refund_id (the common admin flow)", async () => {
    const mock = createSupabaseMock({ seed: { refund_audit_log: [] } });

    const result = await logRefundAttempt(
      mock.client,
      baseEntry({
        status: "succeeded",
        stripe_refund_id: REFUND_ID,
      }),
    );

    expect(result.ok).toBe(true);
    const stored = mock.inspect("refund_audit_log");
    expect(stored[0]?.status).toBe("succeeded");
    expect(stored[0]?.stripe_refund_id).toBe(REFUND_ID);
  });

  it("records failed outcome without a refund_id", async () => {
    const mock = createSupabaseMock({ seed: { refund_audit_log: [] } });

    const result = await logRefundAttempt(
      mock.client,
      baseEntry({
        status: "failed",
        stripe_refund_id: null,
        notes: "Stripe returned charge_already_refunded",
      }),
    );

    expect(result.ok).toBe(true);
    const stored = mock.inspect("refund_audit_log");
    expect(stored[0]?.status).toBe("failed");
    expect(stored[0]?.stripe_refund_id).toBeNull();
  });

  it("supports the two-row pattern: attempted + succeeded for the same PI", async () => {
    // Mirrors the production flow: write 'attempted' before Stripe call,
    // write 'succeeded' after. Both rows are kept for forensic clarity.
    const mock = createSupabaseMock({ seed: { refund_audit_log: [] } });

    await logRefundAttempt(mock.client, baseEntry({ status: "attempted" }));
    await logRefundAttempt(
      mock.client,
      baseEntry({ status: "succeeded", stripe_refund_id: REFUND_ID }),
    );

    const stored = mock.inspect("refund_audit_log");
    expect(stored).toHaveLength(2);
    expect(stored.map((r) => r.status)).toEqual(["attempted", "succeeded"]);
    // Both rows reference the same payment_intent — that's the join key
    // for reconciliation against Stripe.
    expect(stored.every((r) => r.stripe_payment_intent_id === PI)).toBe(true);
  });
});
