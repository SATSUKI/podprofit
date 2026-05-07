import { beforeEach, describe, expect, it } from "vitest";
import { handleContact } from "@/lib/contact/handler";
import {
  classifyInquiry,
  containsSpamKeyword,
  countUrls,
  isDuplicateBurst,
  SPAM_URL_THRESHOLD,
} from "@/lib/contact/spam-detection";
import {
  __resetContactRateLimitForTests,
  CONTACT_RATE_LIMIT_CONFIG,
  consumeContact,
} from "@/lib/contact/rate-limit";
import { createSupabaseMock } from "./_supabase-mock";

const VALID_BODY = {
  email: "alice@example.com",
  category: "general",
  message: "Hello there, I have a question about Lifetime pricing — thanks!",
};

beforeEach(() => __resetContactRateLimitForTests());

describe("classifyInquiry — pure heuristics", () => {
  it("flags honeypot-filled submissions", () => {
    const r = classifyInquiry({
      message: "hi",
      honeypotValue: "https://spam.site",
    });
    expect(r.spam).toBe(true);
    if (r.spam) expect(r.reason).toBe("honeypot");
  });

  it("ignores empty / whitespace-only honeypot value (legitimate users)", () => {
    expect(classifyInquiry({ message: VALID_BODY.message, honeypotValue: "" }).spam).toBe(false);
    expect(classifyInquiry({ message: VALID_BODY.message, honeypotValue: "   " }).spam).toBe(false);
    expect(classifyInquiry({ message: VALID_BODY.message, honeypotValue: null }).spam).toBe(false);
  });

  it("flags messages with too many URLs", () => {
    const msg = "Check out https://a.com and https://b.com and https://c.com please";
    expect(countUrls(msg)).toBeGreaterThanOrEqual(SPAM_URL_THRESHOLD);
    const r = classifyInquiry({ message: msg, honeypotValue: null });
    expect(r.spam).toBe(true);
    if (r.spam) expect(r.reason).toBe("url_flood");
  });

  it("flags spam keywords case-insensitively", () => {
    expect(containsSpamKeyword("MAKE Money FAST!!!")).toBe(true);
    const r = classifyInquiry({
      message: "MAKE Money FAST without effort, click here",
      honeypotValue: null,
    });
    expect(r.spam).toBe(true);
    if (r.spam) expect(["keyword", "url_flood"]).toContain(r.reason);
  });

  it("does not flag legitimate refund/bug language", () => {
    const r = classifyInquiry({
      message:
        "I purchased the Lifetime plan yesterday and the calculator threw an error when switching currency. Can I get a refund?",
      honeypotValue: null,
    });
    expect(r.spam).toBe(false);
  });
});

describe("isDuplicateBurst", () => {
  it("returns true when prior inquiry was within the window", () => {
    const now = 1_700_000_000_000;
    expect(isDuplicateBurst(now - 5_000, now)).toBe(true);
  });

  it("returns false when prior inquiry is older than the window", () => {
    const now = 1_700_000_000_000;
    expect(isDuplicateBurst(now - 60_000, now)).toBe(false);
  });

  it("returns false when there is no prior inquiry", () => {
    expect(isDuplicateBurst(null, Date.now())).toBe(false);
  });
});

describe("contact rate limit (5 / hour / IP)", () => {
  it("exposes the configured cap as 5/hour", () => {
    expect(CONTACT_RATE_LIMIT_CONFIG.maxInquiriesPerWindow).toBe(5);
    expect(CONTACT_RATE_LIMIT_CONFIG.windowMs).toBe(60 * 60 * 1000);
  });

  it("permits the first 5 then blocks the 6th from the same IP", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 1; i <= 5; i += 1) {
      const r = consumeContact("contact:1.2.3.4", t0 + i);
      expect(r.ok, `request ${i}`).toBe(true);
    }
    const blocked = consumeContact("contact:1.2.3.4", t0 + 6);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("isolates buckets per IP", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 5; i += 1) consumeContact("contact:flooder", t0 + i);
    expect(consumeContact("contact:flooder", t0 + 5).ok).toBe(false);
    expect(consumeContact("contact:innocent", t0 + 5).ok).toBe(true);
  });
});

describe("handleContact — end-to-end", () => {
  it("inserts a row with status='new' on a clean submission", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });

    const result = await handleContact(VALID_BODY, {
      supabase: mock.client,
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0 test",
      userId: null,
    });

    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.spamSilent).toBe(false);
      expect(result.inquiryId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }
    const rows = mock.inspect("inquiries");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "alice@example.com",
      category: "general",
      status: "new",
      ip_address: "203.0.113.7",
      user_agent: "Mozilla/5.0 test",
    });
  });

  it("rejects invalid email with validation_error", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });
    const result = await handleContact(
      { ...VALID_BODY, email: "not-an-email" },
      { supabase: mock.client, ip: null, userAgent: null, userId: null },
    );
    expect(result.kind).toBe("validation_error");
    expect(mock.inspect("inquiries")).toHaveLength(0);
  });

  it("rejects message shorter than 10 chars", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });
    const result = await handleContact(
      { ...VALID_BODY, message: "hi" },
      { supabase: mock.client, ip: null, userAgent: null, userId: null },
    );
    expect(result.kind).toBe("validation_error");
  });

  it("rejects message longer than 5000 chars", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });
    const result = await handleContact(
      { ...VALID_BODY, message: "x".repeat(5001) },
      { supabase: mock.client, ip: null, userAgent: null, userId: null },
    );
    expect(result.kind).toBe("validation_error");
  });

  it("silently 'succeeds' on honeypot submissions and does NOT insert", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });
    const result = await handleContact(
      { ...VALID_BODY, website: "https://spam.site" },
      { supabase: mock.client, ip: "10.0.0.1", userAgent: null, userId: null },
    );
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.spamSilent).toBe(true);
      expect(result.inquiryId).toBeNull();
    }
    expect(mock.inspect("inquiries")).toHaveLength(0);
  });

  it("inserts spam-classified rows with status='spam' (not honeypot)", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });
    const result = await handleContact(
      {
        ...VALID_BODY,
        message: "MAKE MONEY FAST! click here for crypto investment riches",
      },
      { supabase: mock.client, ip: "10.0.0.2", userAgent: null, userId: null },
    );
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.spamSilent).toBe(true);
    const rows = mock.inspect("inquiries");
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("spam");
    expect(rows[0].category).toBe("other");
  });

  it("returns rate_limited after 5 inquiries from the same IP", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 5; i += 1) {
      const r = await handleContact(
        { ...VALID_BODY, email: `user${i}@example.com` },
        {
          supabase: mock.client,
          ip: "198.51.100.7",
          userAgent: null,
          userId: null,
          now: t0 + i,
        },
      );
      expect(r.kind, `submission ${i}`).toBe("ok");
    }
    const blocked = await handleContact(
      { ...VALID_BODY, email: "user5@example.com" },
      {
        supabase: mock.client,
        ip: "198.51.100.7",
        userAgent: null,
        userId: null,
        now: t0 + 5,
      },
    );
    expect(blocked.kind).toBe("rate_limited");
    if (blocked.kind === "rate_limited") {
      expect(blocked.rateLimit.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    }
    expect(mock.inspect("inquiries")).toHaveLength(5);
  });

  it("treats two same-email submissions within 10s as a duplicate burst", async () => {
    const t0 = 1_700_000_000_000;
    const mock = createSupabaseMock({
      seed: {
        inquiries: [
          {
            email: "alice@example.com",
            // 5s ago
            created_at: new Date(t0 - 5_000).toISOString(),
            status: "new",
          },
        ],
      },
    });
    const result = await handleContact(VALID_BODY, {
      supabase: mock.client,
      ip: "203.0.113.99",
      userAgent: null,
      userId: null,
      now: t0,
    });
    expect(result.kind).toBe("duplicate_burst");
    // No second row inserted.
    expect(mock.inspect("inquiries")).toHaveLength(1);
  });

  it("does NOT treat a same-email submission older than 10s as a duplicate", async () => {
    const t0 = 1_700_000_000_000;
    const mock = createSupabaseMock({
      seed: {
        inquiries: [
          {
            email: "alice@example.com",
            created_at: new Date(t0 - 60_000).toISOString(),
            status: "new",
          },
        ],
      },
    });
    const result = await handleContact(VALID_BODY, {
      supabase: mock.client,
      ip: "203.0.113.100",
      userAgent: null,
      userId: null,
      now: t0,
    });
    expect(result.kind).toBe("ok");
    expect(mock.inspect("inquiries")).toHaveLength(2);
  });

  it("trims user_agent to 512 chars (defense-in-depth)", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });
    const longUa = "U".repeat(2000);
    const r = await handleContact(VALID_BODY, {
      supabase: mock.client,
      ip: "10.0.0.50",
      userAgent: longUa,
      userId: null,
    });
    expect(r.kind).toBe("ok");
    const row = mock.inspect("inquiries")[0];
    expect((row.user_agent as string).length).toBeLessThanOrEqual(512);
  });

  it("stores user_id when the submitter is authenticated", async () => {
    const mock = createSupabaseMock({ seed: { inquiries: [] } });
    const userId = "00000000-0000-0000-0000-000000000099";
    const r = await handleContact(VALID_BODY, {
      supabase: mock.client,
      ip: "10.0.0.51",
      userAgent: null,
      userId,
    });
    expect(r.kind).toBe("ok");
    expect(mock.inspect("inquiries")[0].user_id).toBe(userId);
  });
});
