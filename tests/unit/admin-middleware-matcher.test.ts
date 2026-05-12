import { describe, expect, it } from "vitest";
import { config as middlewareConfig } from "@/middleware";

/**
 * Lock down the middleware matcher so refactors don't accidentally drop
 * coverage of `/api/admin/*`. The mutation routes (inquiry status,
 * refund issue) live under `/api/admin/*` and rely on the SAME Basic
 * auth gate as the page surface — losing this matcher entry would let
 * unauthenticated callers fire form POSTs at the admin mutations.
 */

describe("admin middleware matcher (PODP-53)", () => {
  it("gates the /admin page tree", () => {
    expect(middlewareConfig.matcher).toContain("/admin/:path*");
  });

  it("gates the /api/admin mutation routes", () => {
    expect(middlewareConfig.matcher).toContain("/api/admin/:path*");
  });
});
