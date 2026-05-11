/**
 * /pricing — the small footnote under the plan cards summarises the
 * refund regime. Post-2026-05-11 it must read "Lifetime within 14
 * days; Pro subscriptions are not pro-rated …" and must NOT reference
 * the old v1.2 wording ("14 days (Pro Annual) / 7 days + 0 launches
 * (Lifetime)").
 *
 * The test renders the (async) page using mocked Supabase env so the
 * Lifetime claimed-count loader returns a deterministic zero without
 * touching the network.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";

function renderToText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToText).join("");
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children;
    return renderToText(children);
  }
  return "";
}

describe("/pricing refund-note footer (post-2026-05-11)", () => {
  beforeEach(() => {
    vi.resetModules();
    // The pricing page reads NEXT_PUBLIC_SUPABASE_URL via the
    // claimed-count helper; with no env we exercise the safe fallback
    // (returns 0) which is exactly what we want for this assertion.
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("renders the v1.3 refund summary and drops the legacy '7 days + 0 launches' phrase", async () => {
    const { default: PricingPage } = await import("@/app/pricing/page");
    const node = await PricingPage();
    const text = renderToText(node);

    // New v1.3 summary
    expect(text).toContain("Lifetime within 14 days");
    expect(text).toMatch(/Pro subscriptions are not pro-rated/);
    expect(text).toMatch(/end of your billing period/);

    // Legacy wording must be gone
    expect(text).not.toContain("7 days + 0 launches");
    expect(text).not.toMatch(/14 days \(Pro Annual\) \/ 7 days/);
  });
});
