/**
 * vendor 価格ドリフト検知 cron のユニットテスト。
 *
 * 実 vendor サイトには絶対に通信しない (fetch は注入する)。
 *
 * Covers:
 *  - normal: vendor 価格と YAML が一致 → drifts=[]
 *  - drift:  価格変更検出 → drifts に entry, severity 判定が正しい
 *  - scrape failure: 例外が warnings に変換される (graceful)
 *  - issue payload: タイトル/本文/labels が想定どおり
 *  - publishIssue: 重複 Issue があれば comment / 無ければ create
 */

import { describe, it, expect, vi } from "vitest";
import { resolve } from "node:path";
import {
  buildDriftIssuePayload,
  buildScrapeBrokenIssuePayload,
  diffFxRates,
  diffVendorPrices,
  fetchFxRates,
  fetchPrintfulPrices,
  fetchPrintifyPrices,
  loadFxYaml,
  loadVendorYaml,
  publishIssue,
  runDriftCheck,
  type DriftReport,
  type FetchFn,
} from "../../scripts/check-vendor-prices";

const REPO_ROOT = resolve(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

interface MockResponse {
  status: number;
  json: unknown;
}

function makeFetch(routes: Record<string, MockResponse | (() => MockResponse)>): FetchFn {
  return (async (url: string | URL | Request) => {
    const u = typeof url === "string" ? url : (url as URL).toString();
    const matchKey = Object.keys(routes).find((k) => u.startsWith(k));
    if (!matchKey) {
      throw new Error(`mock fetch: no route for ${u}`);
    }
    const entry = routes[matchKey];
    const r = typeof entry === "function" ? entry() : entry;
    return new Response(JSON.stringify(r.json), {
      status: r.status,
      headers: { "content-type": "application/json" },
    });
  }) as FetchFn;
}

/** Build a Printful API JSON whose first variant has the given USD price string. */
function printfulProductBody(price: string) {
  return {
    result: {
      product: { id: 1, title: "test" },
      variants: [{ id: 1, product_id: 1, name: "white / M", price }],
    },
  };
}

/** Build a Printify API JSON for blueprints/.../variants endpoint with given cost cents. */
function printifyVariantsBody(costCents: number, hint = "White / M") {
  return {
    print_provider_id: 99,
    variants: [{ id: 1, title: hint, cost: costCents }],
  };
}

// ---------------------------------------------------------------------------
// loadVendorYaml / loadFxYaml
// ---------------------------------------------------------------------------

describe("YAML loaders", () => {
  it("loads printful YAML with expected structure", () => {
    const y = loadVendorYaml(REPO_ROOT, "printful");
    expect(y.vendor).toBe("printful");
    expect(y.products.length).toBeGreaterThan(0);
    expect(typeof y.products[0].baseCostUsdCents).toBe("number");
  });

  it("loads printify YAML", () => {
    const y = loadVendorYaml(REPO_ROOT, "printify");
    expect(y.vendor).toBe("printify");
  });

  it("loads fx YAML with USD = 1.0", () => {
    const y = loadFxYaml(REPO_ROOT);
    expect(y.rates.USD).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// diffVendorPrices
// ---------------------------------------------------------------------------

describe("diffVendorPrices", () => {
  const yaml = {
    vendor: "printful" as const,
    asOfDate: "2026-04-28",
    sourceUrl: "https://x",
    products: [
      {
        id: "printful-bella-canvas-3001-tee-white-m",
        name: "tee",
        baseCostUsdCents: 1295,
        shippingUsdCents: { US: 499 },
      },
      {
        id: "printful-mug-11oz-white",
        name: "mug",
        baseCostUsdCents: 795,
        shippingUsdCents: { US: 499 },
      },
    ],
  };

  it("returns empty array when fetched matches YAML", () => {
    const fetched = new Map([
      ["printful-bella-canvas-3001-tee-white-m", 1295],
      ["printful-mug-11oz-white", 795],
    ]);
    expect(diffVendorPrices("printful", yaml, fetched)).toEqual([]);
  });

  it("ignores tiny noise (within tolerance)", () => {
    // 1295 → 1300 は約 +0.39% で tolerance (1%) 未満
    const fetched = new Map([
      ["printful-bella-canvas-3001-tee-white-m", 1300],
      ["printful-mug-11oz-white", 795],
    ]);
    expect(diffVendorPrices("printful", yaml, fetched)).toEqual([]);
  });

  it("flags low-severity drift between tolerance and high threshold", () => {
    // +2% → > tolerance (1%), < high (5%)
    const fetched = new Map([
      ["printful-bella-canvas-3001-tee-white-m", 1321],
      ["printful-mug-11oz-white", 795],
    ]);
    const drifts = diffVendorPrices("printful", yaml, fetched);
    expect(drifts).toHaveLength(1);
    expect(drifts[0].severity).toBe("low");
    expect(drifts[0].current).toBe(1295);
    expect(drifts[0].fetched).toBe(1321);
  });

  it("flags high-severity drift when delta >= 5%", () => {
    // 1295 → 1395 は +7.7%
    const fetched = new Map([
      ["printful-bella-canvas-3001-tee-white-m", 1395],
      ["printful-mug-11oz-white", 795],
    ]);
    const drifts = diffVendorPrices("printful", yaml, fetched);
    expect(drifts).toHaveLength(1);
    expect(drifts[0].severity).toBe("high");
  });

  it("skips products not present in fetched map", () => {
    const fetched = new Map([["printful-bella-canvas-3001-tee-white-m", 1295]]);
    expect(diffVendorPrices("printful", yaml, fetched)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// diffFxRates
// ---------------------------------------------------------------------------

describe("diffFxRates", () => {
  const yaml = {
    asOfDate: "2026-04-30",
    sourceUrl: "https://ecb",
    rates: { USD: 1.0, EUR: 0.93, GBP: 0.79, CAD: 1.37, AUD: 1.53, JPY: 153.0 },
  };

  it("returns empty when fetched matches", () => {
    expect(diffFxRates(yaml, { ...yaml.rates })).toEqual([]);
  });

  it("ignores within-0.5% noise", () => {
    // 0.93 → 0.932 = +0.21%
    const fetched = { ...yaml.rates, EUR: 0.932 };
    expect(diffFxRates(yaml, fetched)).toEqual([]);
  });

  it("flags FX drift > 0.5%", () => {
    // 153 → 158 = +3.27%
    const fetched = { ...yaml.rates, JPY: 158.0 };
    const drifts = diffFxRates(yaml, fetched);
    expect(drifts).toHaveLength(1);
    expect(drifts[0].field).toBe("JPY");
    expect(drifts[0].severity).toBe("low");
  });

  it("flags FX drift >= 5% as high severity", () => {
    const fetched = { ...yaml.rates, JPY: 165.0 }; // +7.84%
    const drifts = diffFxRates(yaml, fetched);
    expect(drifts[0].severity).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// fetchPrintfulPrices (mocked HTTP)
// ---------------------------------------------------------------------------

describe("fetchPrintfulPrices", () => {
  it("fetches and converts USD price string to cents", async () => {
    const fetchFn = makeFetch({
      "https://api.printful.com/products/": () => ({
        status: 200,
        json: printfulProductBody("12.95"),
      }),
    });
    const result = await fetchPrintfulPrices(fetchFn);
    expect(result.get("printful-bella-canvas-3001-tee-white-m")).toBe(1295);
  });

  it("throws when API returns non-200", async () => {
    const fetchFn = makeFetch({
      "https://api.printful.com/products/": { status: 500, json: { error: "boom" } },
    });
    await expect(fetchPrintfulPrices(fetchFn)).rejects.toThrow(/HTTP 500/);
  });

  it("throws when variants are empty (schema change)", async () => {
    const fetchFn = makeFetch({
      "https://api.printful.com/products/": {
        status: 200,
        json: { result: { product: { id: 1, title: "x" }, variants: [] } },
      },
    });
    await expect(fetchPrintfulPrices(fetchFn)).rejects.toThrow(/0 variants/);
  });

  it("throws when price is not numeric", async () => {
    const fetchFn = makeFetch({
      "https://api.printful.com/products/": {
        status: 200,
        json: printfulProductBody("FREE"),
      },
    });
    await expect(fetchPrintfulPrices(fetchFn)).rejects.toThrow(/non-numeric/);
  });
});

// ---------------------------------------------------------------------------
// fetchPrintifyPrices
// ---------------------------------------------------------------------------

describe("fetchPrintifyPrices", () => {
  it("throws (not crashes) when no API token provided", async () => {
    await expect(fetchPrintifyPrices(undefined)).rejects.toThrow(/PRINTIFY_API_TOKEN/);
  });

  it("fetches and uses cost cents as-is", async () => {
    const fetchFn = makeFetch({
      "https://api.printify.com/v1/catalog/blueprints/": () => ({
        status: 200,
        json: printifyVariantsBody(1095),
      }),
    });
    const result = await fetchPrintifyPrices("test-token", fetchFn);
    expect(result.get("printify-bella-canvas-3001-tee-white-m")).toBe(1095);
  });

  it("throws on non-200", async () => {
    const fetchFn = makeFetch({
      "https://api.printify.com/v1/catalog/blueprints/": { status: 401, json: {} },
    });
    await expect(fetchPrintifyPrices("bad-token", fetchFn)).rejects.toThrow(/HTTP 401/);
  });
});

// ---------------------------------------------------------------------------
// fetchFxRates
// ---------------------------------------------------------------------------

describe("fetchFxRates", () => {
  it("uses primary endpoint when it succeeds", async () => {
    const fetchFn = makeFetch({
      "https://open.er-api.com/": {
        status: 200,
        json: {
          base_code: "USD",
          rates: { USD: 1, EUR: 0.93, GBP: 0.79, CAD: 1.37, AUD: 1.53, JPY: 153 },
        },
      },
    });
    const r = await fetchFxRates(fetchFn);
    expect(r.JPY).toBe(153);
  });

  it("falls back to secondary endpoint when primary fails", async () => {
    const fetchFn = makeFetch({
      "https://open.er-api.com/": { status: 503, json: {} },
      "https://api.exchangerate-api.com/": {
        status: 200,
        json: {
          base: "USD",
          rates: { USD: 1, EUR: 0.94, GBP: 0.79, CAD: 1.37, AUD: 1.53, JPY: 154 },
        },
      },
    });
    const r = await fetchFxRates(fetchFn);
    expect(r.JPY).toBe(154);
  });

  it("rejects when neither endpoint succeeds", async () => {
    const fetchFn = makeFetch({
      "https://open.er-api.com/": { status: 503, json: {} },
      "https://api.exchangerate-api.com/": { status: 503, json: {} },
    });
    await expect(fetchFxRates(fetchFn)).rejects.toThrow(/HTTP 503/);
  });

  it("rejects when base is not USD", async () => {
    const fetchFn = makeFetch({
      "https://open.er-api.com/": {
        status: 200,
        json: { base_code: "EUR", rates: {} },
      },
      "https://api.exchangerate-api.com/": {
        status: 200,
        json: { base: "EUR", rates: {} },
      },
    });
    await expect(fetchFxRates(fetchFn)).rejects.toThrow(/unexpected base/);
  });
});

// ---------------------------------------------------------------------------
// runDriftCheck (orchestrator) - graceful degradation
// ---------------------------------------------------------------------------

describe("runDriftCheck", () => {
  const fixedNow = new Date("2026-06-01T00:00:00Z");

  it("happy path: matching prices → no drifts, no warnings", async () => {
    // We need fetch mocks for *all* endpoints used.
    // Strategy: return the YAML's current values, so diff is empty.
    const printfulYaml = loadVendorYaml(REPO_ROOT, "printful");
    const printifyYaml = loadVendorYaml(REPO_ROOT, "printify");
    const fxYaml = loadFxYaml(REPO_ROOT);

    let printfulIdx = 0;
    let printifyIdx = 0;
    const fetchFn = makeFetch({
      "https://api.printful.com/products/": () => {
        const product = printfulYaml.products[printfulIdx++];
        const dollars = (product.baseCostUsdCents / 100).toFixed(2);
        return { status: 200, json: printfulProductBody(dollars) };
      },
      "https://api.printify.com/v1/catalog/blueprints/": () => {
        const product = printifyYaml.products[printifyIdx++];
        return { status: 200, json: printifyVariantsBody(product.baseCostUsdCents) };
      },
      "https://open.er-api.com/": {
        status: 200,
        json: { base_code: "USD", rates: fxYaml.rates },
      },
    });

    const report = await runDriftCheck({
      repoRoot: REPO_ROOT,
      fetchFn,
      printifyApiToken: "token",
      now: fixedNow,
    });
    expect(report.drifts).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.yyyymm).toBe("2026-06");
  });

  it("drift case: each Printful API returns higher price → drift entries created", async () => {
    const printfulYaml = loadVendorYaml(REPO_ROOT, "printful");
    let printfulIdx = 0;
    const fetchFn = makeFetch({
      "https://api.printful.com/products/": () => {
        const product = printfulYaml.products[printfulIdx++];
        // +10% across the board
        const inflated = ((product.baseCostUsdCents * 1.1) / 100).toFixed(2);
        return { status: 200, json: printfulProductBody(inflated) };
      },
      "https://api.printify.com/v1/catalog/blueprints/": { status: 401, json: {} },
      "https://open.er-api.com/": {
        status: 200,
        json: { base_code: "USD", rates: loadFxYaml(REPO_ROOT).rates },
      },
    });
    const report = await runDriftCheck({
      repoRoot: REPO_ROOT,
      fetchFn,
      printifyApiToken: "token",
      now: fixedNow,
    });
    // All printful products drifted; printify warning; fx empty.
    const printfulDrifts = report.drifts.filter((d) => d.source === "printful");
    expect(printfulDrifts.length).toBe(printfulYaml.products.length);
    expect(printfulDrifts.every((d) => d.severity === "high")).toBe(true);
    expect(report.warnings.some((w) => w.source === "printify")).toBe(true);
  });

  it("scrape failure: Printful API down → recorded as warning, runner does not throw", async () => {
    const fetchFn = makeFetch({
      "https://api.printful.com/products/": { status: 500, json: {} },
      "https://api.printify.com/v1/catalog/blueprints/": { status: 500, json: {} },
      "https://open.er-api.com/": { status: 503, json: {} },
      "https://api.exchangerate-api.com/": { status: 503, json: {} },
    });
    const report = await runDriftCheck({
      repoRoot: REPO_ROOT,
      fetchFn,
      printifyApiToken: "token",
      now: fixedNow,
    });
    expect(report.drifts).toEqual([]);
    // 3 sources all warned
    const sources = new Set(report.warnings.map((w) => w.source));
    expect(sources.has("printful")).toBe(true);
    expect(sources.has("printify")).toBe(true);
    expect(sources.has("fx")).toBe(true);
  });

  it("dry-run: skipPrintifyIfNoToken=true does not produce a Printify warning", async () => {
    const printfulYaml = loadVendorYaml(REPO_ROOT, "printful");
    let printfulIdx = 0;
    const fetchFn = makeFetch({
      "https://api.printful.com/products/": () => {
        const product = printfulYaml.products[printfulIdx++];
        const dollars = (product.baseCostUsdCents / 100).toFixed(2);
        return { status: 200, json: printfulProductBody(dollars) };
      },
      "https://open.er-api.com/": {
        status: 200,
        json: { base_code: "USD", rates: loadFxYaml(REPO_ROOT).rates },
      },
    });
    const report = await runDriftCheck({
      repoRoot: REPO_ROOT,
      fetchFn,
      printifyApiToken: undefined,
      skipPrintifyIfNoToken: true,
      now: fixedNow,
    });
    expect(report.warnings.find((w) => w.source === "printify")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Issue payload builders
// ---------------------------------------------------------------------------

describe("buildDriftIssuePayload", () => {
  const baseReport: DriftReport = {
    generatedAt: "2026-06-01T00:03:00Z",
    yyyymm: "2026-06",
    drifts: [
      {
        source: "printful",
        productId: "printful-bella-canvas-3001-tee-white-m",
        field: "baseCostUsdCents",
        current: 1295,
        fetched: 1395,
        deltaPct: 7.72,
        severity: "high",
      },
    ],
    warnings: [],
  };

  it("title includes vendor and YYYY-MM", () => {
    const p = buildDriftIssuePayload(baseReport);
    expect(p.title).toContain("printful");
    expect(p.title).toContain("2026-06");
  });

  it("body contains the drift table row", () => {
    const p = buildDriftIssuePayload(baseReport);
    expect(p.body).toContain("printful-bella-canvas-3001-tee-white-m");
    expect(p.body).toContain("1295");
    expect(p.body).toContain("1395");
  });

  it("labels include price-drift, automation, and severity:high when high severity present", () => {
    const p = buildDriftIssuePayload(baseReport);
    expect(p.labels).toContain("price-drift");
    expect(p.labels).toContain("automation");
    expect(p.labels).toContain("severity:high");
  });

  it("labels do not include severity:high when only low severity", () => {
    const r: DriftReport = {
      ...baseReport,
      drifts: [{ ...baseReport.drifts[0], severity: "low" }],
    };
    const p = buildDriftIssuePayload(r);
    expect(p.labels).not.toContain("severity:high");
  });
});

describe("buildScrapeBrokenIssuePayload", () => {
  it("contains scrape-broken label", () => {
    const p = buildScrapeBrokenIssuePayload({
      generatedAt: "2026-06-01T00:00:00Z",
      yyyymm: "2026-06",
      drifts: [],
      warnings: [{ source: "printful", message: "TypeError: x" }],
    });
    expect(p.labels).toContain("scrape-broken");
    expect(p.body).toContain("TypeError: x");
  });
});

// ---------------------------------------------------------------------------
// publishIssue (octokit mock)
// ---------------------------------------------------------------------------

describe("publishIssue", () => {
  const mockReport: DriftReport = {
    generatedAt: "2026-06-01T00:00:00Z",
    yyyymm: "2026-06",
    drifts: [
      {
        source: "printful",
        productId: "x",
        field: "baseCostUsdCents",
        current: 100,
        fetched: 110,
        deltaPct: 10,
        severity: "high",
      },
    ],
    warnings: [],
  };
  const payload = buildDriftIssuePayload(mockReport);

  it("creates a new Issue when no duplicate exists", async () => {
    const create = vi.fn(async () => ({
      data: { number: 42, html_url: "https://github.com/o/r/issues/42" },
    }));
    const listForRepo = vi.fn(async () => ({ data: [] }));
    const createComment = vi.fn();
    const octokit = { rest: { issues: { create, listForRepo, createComment } } };
    const r = await publishIssue(octokit, "o", "r", payload, "2026-06");
    expect(r.action).toBe("created");
    expect(r.issueNumber).toBe(42);
    expect(create).toHaveBeenCalledTimes(1);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("comments on existing Issue when one matches the YYYY-MM", async () => {
    const create = vi.fn();
    const listForRepo = vi.fn(async () => ({
      data: [{ number: 7, title: "Vendor price drift detected: printful on 2026-06" }],
    }));
    const createComment = vi.fn(async () => ({
      data: { html_url: "https://github.com/o/r/issues/7#comment-1" },
    }));
    const octokit = { rest: { issues: { create, listForRepo, createComment } } };
    const r = await publishIssue(octokit, "o", "r", payload, "2026-06");
    expect(r.action).toBe("commented");
    expect(r.issueNumber).toBe(7);
    expect(createComment).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });
});
