import { describe, expect, it } from "vitest";
import * as React from "react";
import TokushohoPage, { metadata } from "@/app/legal/tokushoho/page";

/**
 * /legal/tokushoho is the JP-mandated 特定商取引法 disclosure page. The
 * exact phrasing of certain clauses is contractual — Stripe review reads
 * this surface, and we have a v1.5 set of Legal-recommended fixes
 * (PODP-50 + 2026-05-11 cooling-off policy update + PODP-33 phone number
 * publication on 2026-05-12) that need to land before re-submission.
 *
 * v1.5 (2026-05-12) adds the My050 IP phone number `050-6880-2598` to
 * the 連絡先 table, satisfying the UK CCR 2013 Reg 13(1)(b) and EU CRD
 * 2011/83/EU Art 6(1)(c) requirement to publish a working telephone
 * number in the pre-contract disclosure.
 *
 * v1.4 (2026-05-11) realigned the Tokushoho refund section with the
 * CEO-confirmed cooling-off policy:
 *   - Lifetime: 14-day unconditional refund (no launches gate)
 *   - Pro Monthly / Pro Annual: no-proration, access continues to
 *     period end via Stripe Customer Portal cancellation
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

describe("/legal/tokushoho v1.5 metadata", () => {
  it("declares the canonical Tokushoho URL", () => {
    expect(metadata.alternates?.canonical).toBe(
      "https://getpodprofit.com/legal/tokushoho",
    );
  });

  it("uses the legally required title (JP regulators search by exact phrase)", () => {
    expect(metadata.title).toBe("特定商取引法に基づく表記");
  });

  it("surfaces the v1.5 cooling-off / no-proration summary in the metadata description", () => {
    // The description is the Stripe-review-readable summary; v1.5 must
    // surface both the Lifetime 14-day cooling-off and the Pro
    // no-proration commitment so reviewers can see what changed at a
    // glance without opening the page.
    expect(typeof metadata.description).toBe("string");
    expect(metadata.description).toContain("v1.5");
    expect(metadata.description).toMatch(/14日|14 日/);
    expect(metadata.description).toContain("cooling-off");
    expect(metadata.description).toContain("日割り");
  });
});

describe("/legal/tokushoho v1.5 content (PODP-50 + 2026-05-11 cooling-off + PODP-33 phone)", () => {
  const text = renderToText(TokushohoPage());

  it("publishes the v1.5 / 2026-05-12 stamp (matches the rest of the legal set)", () => {
    expect(text).toContain("最終更新日: 2026-05-12");
    expect(text).toContain("バージョン: 1.5");
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
    // v1.4 phrasing: "当月末 (次回更新日) まで". The split lets us be
    // precise about which "month-end" — the next renewal date — while
    // still anchoring on the legally-required "当月末" concept.
    expect(text).toContain("当月末");
    expect(text).toContain("次回更新日");
  });

  it("documents Pro Annual cancellation timing (年度末まで利用可能) (推奨-7b)", () => {
    expect(text).toContain("年度末");
    expect(text).toContain("次回更新日");
  });

  it("retains the EU/UK Article 16(m) waiver disclosure (W1 prerequisite, Excel / Report only as of v1.4)", () => {
    // Existed since v1.3; v1.4 retains the consent flow for Excel /
    // Benchmark Report (those products remain subject to Art 16(m)
    // waiver because they are downloaded immediately). Lifetime no
    // longer needs Art 16(m) collection because the 14-day window is
    // now unconditional.
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

  // ────────────────────────────────────────────────────────────────
  // v1.4 cooling-off / no-proration policy (2026-05-11)
  // CEO-confirmed policy: Lifetime gets a 14-day unconditional refund
  // window (no launch-count gate). Pro Monthly / Pro Annual are NOT
  // pro-rated. These tests pin the contractual phrasing so a future
  // commit cannot regress it silently.
  // ────────────────────────────────────────────────────────────────

  it("[v1.4] Lifetime now offers an unconditional 14-day cooling-off window (was 7 days + 0 launches in v1.3)", () => {
    // Lifetime section must mention the 14-day window and frame it as
    // "no questions asked" / unconditional. The previous gate of "7
    // days AND zero launches" must NOT appear.
    expect(text).toMatch(/Lifetime[^。]*14\s*日以内[^。]*無条件/);
    expect(text).toContain("cooling-off");
    // Regression guard: the old 7-day window and 0-launch gate must be
    // gone from the public surface (still allowed in internal SOP).
    expect(text).not.toMatch(/Lifetime[^。]*7\s*日以内/);
    expect(text).not.toMatch(/計算機を\s*1\s*度も\s*起動していない/);
  });

  it("[v1.4] Pro Monthly is documented as non-pro-rated with explicit 日割り返金は行いません wording", () => {
    // Stripe + JP regulators read this exact phrasing — any softening
    // (e.g. "原則として日割り返金しない") would weaken our position
    // in a 苦情処理 case. Keep the assertion exact-match.
    expect(text).toContain("日割り計算による返金は行いません");
    // Pro Monthly section must reference the Customer Portal as the
    // immediate-cancellation surface so consumers know where to act.
    expect(text).toMatch(/Pro Monthly[\s\S]*Stripe Customer Portal/);
  });

  it("[v1.4] Pro Annual is documented as non-pro-rated AND explicitly without a 14-day Pro-Annual refund window", () => {
    // v1.3 had a 14-day no-questions-asked window for Pro Annual; v1.4
    // removes it. The phrase "Pro Annual には設けておりません" guards
    // against accidental re-introduction.
    expect(text).toMatch(/Pro Annual[\s\S]*日割り計算による返金は行いません/);
    expect(text).toContain("Pro Annual には設けて");
  });

  it("[v1.4] EU/UK section distinguishes Lifetime (no Art 16(m) consent) from Excel/Report (consent retained)", () => {
    // Lifetime no longer triggers Art 16(m) waiver collection because
    // the 14-day window is now unconditional and granted to everyone
    // worldwide. Excel / Benchmark Report keep the Art 16(m) consent
    // flow because they are downloaded immediately.
    expect(text).toContain("Lifetime に関しては別途の Art 16(m) 同意取得は行いません");
    // The Art 16(m) consent for Excel / Report must still be present.
    expect(text).toMatch(
      /Excel\s*\/\s*Benchmark Report[\s\S]*第 16 条 m[\s\S]*チェックアウト時に明示的に同意取得/,
    );
  });

  it("[v1.4] frames the 14-day cooling-off as a voluntary alignment with UK/EU law (not a JP cooling-off claim)", () => {
    // JP Tokushoho 法 does NOT impose a cooling-off on通販 (通販には
    // クーリング・オフ制度は適用されない). v1.4 must say the
    // 14-day window is a voluntary courtesy aligned with UK/EU. This
    // protects against a claim that we are misrepresenting JP law.
    expect(text).toContain("特定商取引法第15条の3");
    expect(text).toContain("適用されません");
    expect(text).toMatch(/任意の\s*14\s*日間\s*cooling-off/);
  });

  // ────────────────────────────────────────────────────────────────
  // v1.5 phone-number publication (PODP-33, 2026-05-12)
  // CEO acquired the My050 (Brastel) IP number 050-6880-2598 on
  // 2026-05-12. UK CCR 2013 Reg 13(1)(b) and EU CRD 2011/83/EU Art
  // 6(1)(c) both require a working telephone number in the
  // pre-contract disclosure, and Stripe risk-review reads this
  // surface. The previous "請求すれば開示" stance is being replaced
  // with explicit publication.
  // ────────────────────────────────────────────────────────────────

  it("[v1.5] publishes the My050 IP phone number in the 連絡先 table (UK CCR Reg 13(1)(b))", () => {
    // Display format with hyphens is the human-facing canonical
    // string; the click-to-call href is hyphen-stripped separately.
    expect(text).toContain("050-6880-2598");
    // Hours line must be present so consumers know mail is preferred.
    expect(text).toContain("平日 10:00-18:00 JST");
    expect(text).toContain("メール対応推奨");
    // The "請求すれば開示" wording from v1.4 must be gone — UK/EU law
    // does not accept "available on request" for a B2C SaaS.
    expect(text).not.toContain("記載をご希望の方は上記メールアドレスまでご請求");
  });

  it("[v1.5] frames the IP number as best-effort and points to email as the SLA channel", () => {
    // My050 is an IP phone, so occasional unreachable cases are
    // possible. The disclosure must steer consumers toward email
    // for time-sensitive matters without weakening the legal
    // disclosure obligation. The carrier name is named so reviewers
    // can verify provenance.
    expect(text).toContain("My050");
    expect(text).toContain("IP 電話");
    expect(text).toMatch(/確実な連絡をご希望の\s*場合は上記メールアドレス/);
  });
});
