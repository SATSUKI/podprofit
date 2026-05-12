import { describe, expect, it } from "vitest";
import {
  isInquiryStatus,
  normaliseLimit,
  listInquiries,
  getInquiryById,
  updateInquiry,
  INQUIRIES_LIST_DEFAULT_LIMIT,
  INQUIRIES_LIST_MAX_LIMIT,
} from "@/lib/admin/inquiries";
import { createSupabaseMock } from "./_supabase-mock";

const seed = () => ({
  inquiries: [
    {
      id: "i1",
      email: "alice@example.com",
      category: "bug",
      subject: "calc bug",
      message: "calc breaks on EUR",
      status: "new",
      created_at: "2026-06-10T10:00:00Z",
      replied_at: null,
      reply_message: null,
      user_id: null,
      name: null,
      ip_address: null,
      user_agent: null,
    },
    {
      id: "i2",
      email: "bob@example.com",
      category: "refund",
      subject: "lifetime refund",
      message: "want my money back",
      status: "replied",
      created_at: "2026-06-09T10:00:00Z",
      replied_at: "2026-06-09T11:00:00Z",
      reply_message: "Refunded 6/9 via admin UI.",
      user_id: null,
      name: null,
      ip_address: null,
      user_agent: null,
    },
  ],
});

describe("normaliseLimit", () => {
  it("defaults to the standard list cap when no query param is given", () => {
    expect(normaliseLimit(undefined)).toBe(INQUIRIES_LIST_DEFAULT_LIMIT);
  });

  it("rejects non-numeric or non-positive inputs", () => {
    expect(normaliseLimit("abc")).toBe(INQUIRIES_LIST_DEFAULT_LIMIT);
    expect(normaliseLimit("-5")).toBe(INQUIRIES_LIST_DEFAULT_LIMIT);
    expect(normaliseLimit("0")).toBe(INQUIRIES_LIST_DEFAULT_LIMIT);
  });

  it("clamps very large values to the hard ceiling", () => {
    expect(normaliseLimit("9999")).toBe(INQUIRIES_LIST_MAX_LIMIT);
  });
});

describe("isInquiryStatus", () => {
  it("accepts the five canonical enum values", () => {
    for (const s of [
      "new",
      "in_progress",
      "replied",
      "archived",
      "spam",
    ]) {
      expect(isInquiryStatus(s)).toBe(true);
    }
  });

  it("rejects unknown values (defense against forged form payloads)", () => {
    expect(isInquiryStatus("deleted")).toBe(false);
    expect(isInquiryStatus(undefined)).toBe(false);
    expect(isInquiryStatus(42)).toBe(false);
  });
});

describe("listInquiries", () => {
  it("defaults to status='new' so the dashboard backlog stays visible", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const res = await listInquiries(mock.client);
    expect(res.error).toBeNull();
    expect(res.rows.map((r) => r.id)).toEqual(["i1"]);
  });

  it("returns every status when caller passes status='all'", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const res = await listInquiries(mock.client, { status: "all" });
    expect(res.rows.map((r) => r.id).sort()).toEqual(["i1", "i2"]);
  });

  it("respects the explicit status filter", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const res = await listInquiries(mock.client, { status: "replied" });
    expect(res.rows.map((r) => r.id)).toEqual(["i2"]);
  });
});

describe("getInquiryById", () => {
  it("returns null for an unknown id rather than throwing", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const res = await getInquiryById(mock.client, "does-not-exist");
    expect(res).toBeNull();
  });

  it("returns the full row for a known id", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const res = await getInquiryById(mock.client, "i1");
    expect(res?.email).toBe("alice@example.com");
  });
});

describe("updateInquiry", () => {
  it("rejects bad status before touching the DB", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const res = await updateInquiry(mock.client, "i1", {
      status: "deleted" as never,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/status/i);
    // Underlying row untouched.
    expect(mock.inspect("inquiries")[0]?.status).toBe("new");
  });

  it("rejects reply_message longer than the 10k char cap", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const long = "x".repeat(10_001);
    const res = await updateInquiry(mock.client, "i1", {
      reply_message: long,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/10,?000/);
  });

  it("requires at least one field to update — empty patches fail loudly", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const res = await updateInquiry(mock.client, "i1", {});
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/no fields/i);
  });

  it("status='in_progress' updates the row and returns it", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const res = await updateInquiry(mock.client, "i1", {
      status: "in_progress",
    });
    expect(res.ok).toBe(true);
    expect(res.row?.status).toBe("in_progress");
    expect(mock.inspect("inquiries").find((r) => r.id === "i1")?.status).toBe(
      "in_progress",
    );
  });

  it("markReplied=true sets replied_at; false clears it", async () => {
    const mock = createSupabaseMock({ seed: seed() });
    const now = new Date("2026-06-10T12:00:00Z");
    const setRes = await updateInquiry(
      mock.client,
      "i1",
      { markReplied: true },
      now,
    );
    expect(setRes.ok).toBe(true);
    expect(setRes.row?.replied_at).toBe("2026-06-10T12:00:00.000Z");

    const clearRes = await updateInquiry(mock.client, "i2", {
      markReplied: false,
    });
    expect(clearRes.ok).toBe(true);
    expect(clearRes.row?.replied_at).toBeNull();
  });

  it("reply_message='' (empty) is treated as 'no update' by the patch builder when undefined", async () => {
    // Sanity: setting reply_message to null explicitly clears it.
    const mock = createSupabaseMock({ seed: seed() });
    const res = await updateInquiry(mock.client, "i2", {
      reply_message: null,
    });
    expect(res.ok).toBe(true);
    expect(res.row?.reply_message).toBeNull();
  });
});
