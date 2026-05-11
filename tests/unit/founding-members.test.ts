import { describe, expect, it } from "vitest";
import {
  ensureFoundingMemberRow,
  getOwnFoundingMember,
  listPublicFoundingMembers,
  normalizeXHandle,
  updateOwnFoundingMember,
} from "@/lib/lifetime/founding-members";
import { createSupabaseMock } from "./_supabase-mock";

describe("normalizeXHandle", () => {
  it("strips leading @ and trims whitespace", () => {
    expect(normalizeXHandle("  @o_satsuki ")).toBe("o_satsuki");
    expect(normalizeXHandle("@@@o_satsuki")).toBe("o_satsuki");
  });

  it("accepts valid handles (alnum + underscore, 1-15 chars)", () => {
    expect(normalizeXHandle("a")).toBe("a");
    expect(normalizeXHandle("o_satsuki")).toBe("o_satsuki");
    expect(normalizeXHandle("abc123_DEF456")).toBe("abc123_DEF456");
    // 15 chars exactly
    expect(normalizeXHandle("abcdefghijklmno")).toBe("abcdefghijklmno");
  });

  it("rejects invalid handles", () => {
    expect(normalizeXHandle("")).toBeNull();
    expect(normalizeXHandle("  ")).toBeNull();
    expect(normalizeXHandle(null)).toBeNull();
    expect(normalizeXHandle(undefined)).toBeNull();
    // 16 chars
    expect(normalizeXHandle("abcdefghijklmnop")).toBeNull();
    // Special chars
    expect(normalizeXHandle("hello-world")).toBeNull();
    expect(normalizeXHandle("hello.world")).toBeNull();
    expect(normalizeXHandle("こんにちは")).toBeNull();
  });
});

describe("ensureFoundingMemberRow", () => {
  it("inserts a row for a first-time Lifetime claimer", async () => {
    const mock = createSupabaseMock({ seed: { founding_members: [] } });
    const result = await ensureFoundingMemberRow(mock.client, "user_1");
    expect(result.ok).toBe(true);
    expect(mock.inspect("founding_members")).toHaveLength(1);
    expect(mock.inspect("founding_members")[0]).toMatchObject({
      user_id: "user_1",
      display_x_handle: false,
      x_handle: null,
    });
  });

  it("is idempotent on replay (no duplicate row)", async () => {
    const mock = createSupabaseMock({
      seed: {
        founding_members: [
          {
            user_id: "user_1",
            display_x_handle: true,
            x_handle: "existing",
            joined_at: "2026-05-10T00:00:00Z",
          },
        ],
      },
    });
    const result = await ensureFoundingMemberRow(mock.client, "user_1");
    expect(result.ok).toBe(true);
    // Row preserved with original preferences (upsert with
    // ignoreDuplicates does not overwrite).
    const rows = mock.inspect("founding_members");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "user_1",
      display_x_handle: true,
      x_handle: "existing",
    });
  });
});

describe("updateOwnFoundingMember", () => {
  it("rejects display=true without a valid X handle", async () => {
    const mock = createSupabaseMock({
      seed: {
        founding_members: [
          {
            user_id: "user_1",
            display_x_handle: false,
            x_handle: null,
            joined_at: "2026-05-10T00:00:00Z",
          },
        ],
      },
    });
    const result = await updateOwnFoundingMember(mock.client, "user_1", {
      display_x_handle: true,
      x_handle: "",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/valid X handle/i);
  });

  it("accepts display=true with a valid X handle and persists both fields", async () => {
    const mock = createSupabaseMock({
      seed: {
        founding_members: [
          {
            user_id: "user_1",
            display_x_handle: false,
            x_handle: null,
            joined_at: "2026-05-10T00:00:00Z",
          },
        ],
      },
    });
    const result = await updateOwnFoundingMember(mock.client, "user_1", {
      display_x_handle: true,
      x_handle: "@o_satsuki",
    });
    expect(result.ok).toBe(true);
    const rows = mock.inspect("founding_members");
    expect(rows[0]).toMatchObject({
      user_id: "user_1",
      display_x_handle: true,
      x_handle: "o_satsuki", // leading @ stripped
    });
  });

  it("permits display=false with no handle (turn-off path)", async () => {
    const mock = createSupabaseMock({
      seed: {
        founding_members: [
          {
            user_id: "user_1",
            display_x_handle: true,
            x_handle: "o_satsuki",
            joined_at: "2026-05-10T00:00:00Z",
          },
        ],
      },
    });
    const result = await updateOwnFoundingMember(mock.client, "user_1", {
      display_x_handle: false,
      x_handle: null,
    });
    expect(result.ok).toBe(true);
    expect(mock.inspect("founding_members")[0]).toMatchObject({
      display_x_handle: false,
      x_handle: null,
    });
  });
});

describe("getOwnFoundingMember", () => {
  it("returns null for non-Lifetime users", async () => {
    const mock = createSupabaseMock({ seed: { founding_members: [] } });
    const row = await getOwnFoundingMember(mock.client, "user_x");
    expect(row).toBeNull();
  });

  it("returns the row for the authenticated Lifetime holder", async () => {
    const mock = createSupabaseMock({
      seed: {
        founding_members: [
          {
            user_id: "user_1",
            display_x_handle: true,
            x_handle: "o_satsuki",
            joined_at: "2026-05-10T00:00:00Z",
          },
          {
            user_id: "user_2",
            display_x_handle: false,
            x_handle: null,
            joined_at: "2026-05-11T00:00:00Z",
          },
        ],
      },
    });
    const row = await getOwnFoundingMember(mock.client, "user_1");
    expect(row).toMatchObject({ user_id: "user_1", x_handle: "o_satsuki" });
  });
});

describe("listPublicFoundingMembers", () => {
  it("returns only opted-in members when Supabase env is set", async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const mock = createSupabaseMock({
      seed: {
        founding_members: [
          {
            user_id: "u1",
            display_x_handle: true,
            x_handle: "alice",
            joined_at: "2026-05-09T00:00:00Z",
          },
          {
            user_id: "u2",
            display_x_handle: false,
            x_handle: null,
            joined_at: "2026-05-10T00:00:00Z",
          },
          {
            user_id: "u3",
            display_x_handle: true,
            x_handle: "bob",
            joined_at: "2026-05-11T00:00:00Z",
          },
        ],
      },
    });
    const rows = await listPublicFoundingMembers(mock.client);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.x_handle).sort()).toEqual(["alice", "bob"]);

    process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
  });

  it("returns empty array when Supabase env is not configured (pre-launch dev)", async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const rows = await listPublicFoundingMembers();
    expect(rows).toEqual([]);

    if (prevUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
  });
});
