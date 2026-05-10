import { describe, expect, it } from "vitest";
import * as React from "react";
import TokushohoPage, { metadata } from "@/app/legal/tokushoho/page";

/**
 * /legal/tokushoho is the JP-mandated 特定商取引法 disclosure page. The
 * exact phrasing of certain clauses is contractual — Stripe review reads
 * this surface, and we have a v1.3 set of Legal-recommended fixes
 * (PODP-50) that need to land before re-submission.
 *
 * These tests walk the rendered React tree and assert on text content,
 * which is sturdier than HTML-string snapshots (resilient to whitespace
 * + attribute-order changes).
 */
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

describe("/legal/tokushoho v1.3 metadata", () => {
  it("declares the canonical Tokushoho URL", () => {
    expect(metadata.alternates?.canonical).toBe(
      "https://getpodprofit.com/legal/tokushoho",
    );
  });

  it("uses the legally required title (JP regulators search by exact phrase)", () => {
    expect(metadata.title).toBe("特定商取引法に基づく表記");
  });
});

describe("/legal/tokushoho v1.3 content (PODP-50 Legal recommendations)", () => {
  const text = renderToText(TokushohoPage());

  it("publishes the v1.3 / 2026-05-11 stamp (matches the rest of the legal set)", () => {
    expect(text).toContain("最終更新日: 2026-05-11");
    expect(text).toContain("バージョン: 1.3");
  });

  it("strengthens 販売事業者 with the trade name (推奨-3)", () => {
    // Stripe + JP regulators read this row first — making it explicit
    // that the trade name is "PODProfit" (and confirming sole proprietor)
    // is what Legal recommended.
    expect(text).toContain("屋号: PODProfit");
    expect(text).toContain("個人事業主");
  });

  it("publishes 運営統括責任者 as an independent disclosure (推奨-4)", () => {
    // Tokushoho 法 doesn't strictly require this row when it equals the
    // 販売事業者, but JP regulators + Stripe review prefer the explicit row.
    expect(text).toContain("運営統括責任者");
    expect(text).toContain("販売事業者と同一");
  });

  it("declares 免税事業者 status with no inability to issue インボイス (推奨-5)", () => {
    // Required disclosure for JP B2B customers who may be expecting
    // inputs for 仕入税額控除 — they need to know up-front that we
    // can't issue 適格請求書 (Qualified Invoices).
    expect(text).toContain("免税事業者");
    expect(text).toContain("適格請求書");
    expect(text).toContain("インボイス");
  });

  it("clarifies that Lifetime is a service-period license, not a perpetuity (推奨-6)", () => {
    // Without this note, "Lifetime" reads as "we owe you the service
    // forever" — which is impossible to underwrite. The phrase
    // "サービス運営期間中の利用権" is the Legal-recommended exact wording.
    expect(text).toContain("サービス運営期間中の利用権");
  });

  it("documents Pro Monthly cancellation timing (当月末まで利用可能) (推奨-7a)", () => {
    expect(text).toContain("当月末まで");
  });

  it("documents Pro Annual cancellation timing (年度末まで利用可能) (推奨-7b)", () => {
    expect(text).toContain("年度末");
    expect(text).toContain("次回更新日");
  });

  it("retains the EU/UK Article 16(m) waiver disclosure (W1 prerequisite)", () => {
    // This existed before; we're verifying the Stripe checkout-side
    // consent_collection landing in this commit is consistent with
    // what the Tokushoho already promises the customer.
    expect(text).toContain("EU 2011/83/EU 第 16 条 m");
    expect(text).toContain("チェックアウト時に明示的に同意取得");
  });

  it("keeps the address virtual-office-suffix-free (PODP-30 retained guarantee)", () => {
    // Regression guard — earlier ADR-0002 entries removed the DMM virtual
    // office suffix. If a future commit ever puts it back, this catches
    // the Stripe re-review risk.
    expect(text).not.toContain("バーチャルオフィス");
    expect(text).not.toContain("DMM");
  });

  it("never reintroduces Lemon Squeezy / MoR text (PODP-32 / PODP-34 retained guarantee)", () => {
    expect(text.toLowerCase()).not.toContain("lemon squeezy");
    expect(text.toLowerCase()).not.toContain("merchant of record");
    expect(text).not.toContain("MoR");
  });
});
