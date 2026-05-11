import { describe, expect, it } from "vitest";
import { verifyBasicAuth } from "@/lib/api/admin-auth";

function header(user: string, pass: string): string {
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

describe("verifyBasicAuth", () => {
  it("returns not_configured when ADMIN_USER or ADMIN_PASS is missing", () => {
    expect(verifyBasicAuth(header("a", "b"), undefined, "x").kind).toBe(
      "not_configured",
    );
    expect(verifyBasicAuth(header("a", "b"), "x", undefined).kind).toBe(
      "not_configured",
    );
    expect(verifyBasicAuth(header("a", "b"), "", "").kind).toBe(
      "not_configured",
    );
  });

  it("returns missing_header when header is absent or not Basic", () => {
    expect(verifyBasicAuth(null, "u", "p").kind).toBe("missing_header");
    expect(verifyBasicAuth("Bearer tok", "u", "p").kind).toBe(
      "missing_header",
    );
  });

  it("returns invalid_credentials for malformed payloads", () => {
    expect(verifyBasicAuth("Basic !!!not-base64!!!", "u", "p").kind).toBe(
      "invalid_credentials",
    );
    expect(
      verifyBasicAuth(`Basic ${btoa("missing-colon")}`, "u", "p").kind,
    ).toBe("invalid_credentials");
  });

  it("returns invalid_credentials when user or pass mismatch", () => {
    expect(verifyBasicAuth(header("u", "wrong"), "u", "p").kind).toBe(
      "invalid_credentials",
    );
    expect(verifyBasicAuth(header("wrong", "p"), "u", "p").kind).toBe(
      "invalid_credentials",
    );
  });

  it("returns ok for correct credentials", () => {
    expect(verifyBasicAuth(header("u", "p"), "u", "p").kind).toBe("ok");
  });

  it("accepts passwords with colons (e.g., complex generated tokens)", () => {
    const pass = "abc:def:ghi";
    expect(verifyBasicAuth(header("u", pass), "u", pass).kind).toBe("ok");
  });

  it("is case-insensitive on the Basic prefix per RFC 7617", () => {
    expect(verifyBasicAuth(`basic ${btoa("u:p")}`, "u", "p").kind).toBe(
      "ok",
    );
    expect(verifyBasicAuth(`BASIC ${btoa("u:p")}`, "u", "p").kind).toBe(
      "ok",
    );
  });
});
