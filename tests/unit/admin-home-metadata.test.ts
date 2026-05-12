import { describe, expect, it } from "vitest";
import { metadata as homeMeta } from "@/app/admin/page";
import { metadata as inquiriesMeta } from "@/app/admin/inquiries/page";
import { metadata as refundsMeta } from "@/app/admin/refunds/page";

/**
 * Admin pages are private surfaces. Even though the Basic auth
 * middleware already keeps unauthenticated traffic out, we set
 * `noindex,nofollow` as defense in depth — if ADMIN_USER/PASS were
 * ever misconfigured (returning 503 instead of 401), search engines
 * still shouldn't crawl the chrome.
 */

describe("admin pages have noindex SEO metadata", () => {
  it("/admin home is noindex,nofollow", () => {
    expect(homeMeta.robots).toEqual({ index: false, follow: false });
  });

  it("/admin/inquiries is noindex,nofollow", () => {
    expect(inquiriesMeta.robots).toEqual({ index: false, follow: false });
  });

  it("/admin/refunds is noindex,nofollow", () => {
    expect(refundsMeta.robots).toEqual({ index: false, follow: false });
  });
});

describe("admin page titles include 'Admin' so we never confuse them with public pages", () => {
  it("home title", () => {
    expect(String(homeMeta.title ?? "")).toMatch(/admin/i);
  });

  it("inquiries title", () => {
    expect(String(inquiriesMeta.title ?? "")).toMatch(/admin/i);
  });

  it("refunds title", () => {
    expect(String(refundsMeta.title ?? "")).toMatch(/admin/i);
  });
});
