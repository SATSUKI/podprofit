/**
 * vendor 価格ドリフト検知 cron スクリプト
 *
 * 設計書: coo/strategic-initiatives/phase1-pod-profit-calculator/
 *           vendor-price-drift-cron-design-v1.md (運用・インフラ部 / 2026-05-04)
 *
 * 役割:
 *  1. Printful / Printify の公式公開ページから価格を取得
 *  2. ECB / open.er-api.com から FX レートを取得
 *  3. 既存 YAML (`data/printful/products.yml`, `data/printify/products.yml`,
 *     `data/fx-rates.yml`) と比較して差分 (drift) を検出
 *  4. 差分があれば JSON Drift Report を出力
 *  5. (CI 経由実行時) GitHub Issue を自動作成
 *
 * 設計原則:
 *  - fail-soft: scrape 失敗で runner を落とさない (process.exit(0))
 *  - 冪等: 同月内に複数走っても Issue 重複しない (タイトルに YYYY-MM)
 *  - tolerance: vendor 1%, FX 0.5% 未満は noise として無視
 *  - メンテ容易性: vendor 仕様変更時は本ファイルの SELECTORS 定数だけ直せば復旧
 *
 * ローカル実行:
 *   pnpm exec tsx scripts/check-vendor-prices.ts --dry-run
 *
 * CI 実行 (GitHub Actions):
 *   pnpm exec tsx scripts/check-vendor-prices.ts
 *   ※ GH_TOKEN, GITHUB_REPOSITORY 環境変数で Issue 自動作成
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load as loadYaml } from "js-yaml";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type Region = "US" | "EU" | "UK" | "CA" | "AU";
export type VendorKey = "printful" | "printify";
export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY";

export interface VendorProduct {
  id: string;
  name: string;
  baseCostUsdCents: number;
  shippingUsdCents: Partial<Record<Region, number>>;
}

export interface VendorYaml {
  vendor: VendorKey;
  asOfDate: string;
  sourceUrl: string;
  products: VendorProduct[];
}

export interface FxYaml {
  asOfDate: string;
  sourceUrl: string;
  rates: Record<Currency, number>;
}

export interface DriftEntry {
  source: VendorKey | "fx";
  productId?: string;
  field: string;
  current: number;
  fetched: number;
  deltaPct: number;
  severity: "low" | "high";
}

export interface DriftReport {
  generatedAt: string;
  yyyymm: string;
  drifts: DriftEntry[];
  warnings: Array<{ source: string; message: string }>;
}

// ---------------------------------------------------------------------------
// 定数 (vendor 仕様変更時はここを修正)
// ---------------------------------------------------------------------------

const USER_AGENT =
  "PODProfit-PriceDriftBot/1.0 (+https://podprofit.com/bot; mailto:contact@podprofit.com)";

const VENDOR_TOLERANCE_PCT = 1.0; // ±1% 未満は noise
const FX_TOLERANCE_PCT = 0.5;
const HIGH_SEVERITY_PCT = 5.0; // ±5% 超で severity:high

const PRINTFUL_API_BASE = "https://api.printful.com";
const PRINTIFY_CATALOG_BASE = "https://api.printify.com/v1/catalog";

// FX rate primary/secondary endpoints
const FX_PRIMARY_URL = "https://open.er-api.com/v6/latest/USD";
const FX_SECONDARY_URL = "https://api.exchangerate-api.com/v4/latest/USD";

const FETCH_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// fetch helpers (注入可能)
// ---------------------------------------------------------------------------

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

async function fetchWithTimeout(
  url: string,
  fetchFn: FetchFn = globalThis.fetch,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchFn(url, {
      ...init,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// YAML 読み込み
// ---------------------------------------------------------------------------

export function loadVendorYaml(repoRoot: string, vendor: VendorKey): VendorYaml {
  const path = resolve(repoRoot, "data", vendor, "products.yml");
  const raw = readFileSync(path, "utf8");
  const parsed = loadYaml(raw) as VendorYaml;
  return parsed;
}

export function loadFxYaml(repoRoot: string): FxYaml {
  const path = resolve(repoRoot, "data", "fx-rates.yml");
  const raw = readFileSync(path, "utf8");
  const parsed = loadYaml(raw) as FxYaml;
  return parsed;
}

// ---------------------------------------------------------------------------
// fetcher: Printful (公式 Catalog API; 認証不要)
// ---------------------------------------------------------------------------

/**
 * Printful Catalog API のラフな型 (公式 OpenAPI から最低限のみ抜粋)。
 * 仕様変更時は本ファイル先頭で吸収する。
 */
interface PrintfulVariantApi {
  id: number;
  product_id: number;
  name: string;
  price: string; // USD, e.g. "12.95"
  in_stock?: boolean;
}

interface PrintfulProductApi {
  product: { id: number; title: string };
  variants: PrintfulVariantApi[];
}

/**
 * 既存 YAML id を Printful の product/variant id にマップ。
 * 公開カタログの ID は変動しにくいが、変わったら本テーブルのみ更新。
 *
 * NOTE: v1 では「base price のみ」検証。配送料は別 API で要認証のため
 * Phase 2 (post-launch + 1ヶ月) で対応予定。本 cron は `shippingUsdCents`
 * フィールドの drift 検出は対象外 (warning にも上げない)。
 */
const PRINTFUL_ID_MAP: Record<string, { productId: number; variantHint: string }> = {
  "printful-bella-canvas-3001-tee-white-m": { productId: 71, variantHint: "white / M" },
  "printful-gildan-18000-sweatshirt-black-l": { productId: 145, variantHint: "black / L" },
  "printful-mug-11oz-white": { productId: 19, variantHint: "11oz" },
  "printful-aop-hoodie-unisex-m": { productId: 257, variantHint: "M" },
  "printful-tote-bag-natural": { productId: 84, variantHint: "natural" },
  "printful-poster-matte-18x24": { productId: 1, variantHint: '18″×24″' },
};

export async function fetchPrintfulPrices(
  fetchFn: FetchFn = globalThis.fetch,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const [yamlId, { productId, variantHint }] of Object.entries(PRINTFUL_ID_MAP)) {
    const url = `${PRINTFUL_API_BASE}/products/${productId}`;
    const res = await fetchWithTimeout(url, fetchFn);
    if (!res.ok) {
      throw new Error(`Printful API ${productId} returned HTTP ${res.status}`);
    }
    const json = (await res.json()) as { result?: PrintfulProductApi };
    const variants = json.result?.variants ?? [];
    if (variants.length === 0) {
      throw new Error(`Printful API ${productId} returned 0 variants (schema changed?)`);
    }
    // variantHint と部分一致するものを優先、無ければ最初の variant の price を使う。
    const hit =
      variants.find((v) =>
        v.name.toLowerCase().includes(variantHint.toLowerCase().slice(0, 4)),
      ) ?? variants[0];
    const priceFloat = Number.parseFloat(hit.price);
    if (!Number.isFinite(priceFloat)) {
      throw new Error(`Printful variant ${hit.id} has non-numeric price "${hit.price}"`);
    }
    result.set(yamlId, Math.round(priceFloat * 100));
  }
  return result;
}

// ---------------------------------------------------------------------------
// fetcher: Printify (Catalog API; OAuth トークン要)
// ---------------------------------------------------------------------------

/**
 * Printify は API token がないとアクセス不可。token が設定されていない場合は
 * fail-soft で warning を返す (Issue は立つが drift 検知はスキップ)。
 */
interface PrintifyVariantApi {
  id: number;
  title: string;
  cost: number; // USD cents (Printify は cents 単位)
}

interface PrintifyBlueprintProvidersApi {
  print_provider_id: number;
  variants: PrintifyVariantApi[];
}

const PRINTIFY_ID_MAP: Record<
  string,
  { blueprintId: number; providerId: number; variantHint: string }
> = {
  "printify-bella-canvas-3001-tee-white-m": {
    blueprintId: 6,
    providerId: 99,
    variantHint: "White / M",
  },
  "printify-gildan-18000-sweatshirt-black-l": {
    blueprintId: 49,
    providerId: 99,
    variantHint: "Black / L",
  },
  "printify-mug-11oz-white": { blueprintId: 68, providerId: 28, variantHint: "11oz" },
  "printify-aop-hoodie-unisex-m": { blueprintId: 77, providerId: 6, variantHint: "M" },
  "printify-tote-bag-natural": { blueprintId: 81, providerId: 6, variantHint: "Natural" },
  "printify-poster-matte-18x24": { blueprintId: 97, providerId: 1, variantHint: "18" },
};

export async function fetchPrintifyPrices(
  apiToken: string | undefined,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<Map<string, number>> {
  if (!apiToken) {
    throw new Error("PRINTIFY_API_TOKEN not set; skipping Printify drift check");
  }
  const result = new Map<string, number>();
  for (const [yamlId, { blueprintId, providerId, variantHint }] of Object.entries(
    PRINTIFY_ID_MAP,
  )) {
    const url = `${PRINTIFY_CATALOG_BASE}/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`;
    const res = await fetchWithTimeout(url, fetchFn, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok) {
      throw new Error(`Printify API ${blueprintId}/${providerId} returned HTTP ${res.status}`);
    }
    const json = (await res.json()) as PrintifyBlueprintProvidersApi;
    const variants = json.variants ?? [];
    if (variants.length === 0) {
      throw new Error(
        `Printify blueprint ${blueprintId} returned 0 variants (schema changed?)`,
      );
    }
    const hit =
      variants.find((v) => v.title.toLowerCase().includes(variantHint.toLowerCase())) ??
      variants[0];
    if (typeof hit.cost !== "number") {
      throw new Error(`Printify variant ${hit.id} has non-numeric cost`);
    }
    result.set(yamlId, hit.cost);
  }
  return result;
}

// ---------------------------------------------------------------------------
// fetcher: FX (open.er-api.com → fallback exchangerate-api.com)
// ---------------------------------------------------------------------------

interface FxApiResponse {
  base_code?: string;
  base?: string; // exchangerate-api.com 互換
  rates: Record<string, number>;
}

export async function fetchFxRates(
  fetchFn: FetchFn = globalThis.fetch,
): Promise<Record<Currency, number>> {
  const tryParse = async (url: string): Promise<Record<Currency, number>> => {
    const res = await fetchWithTimeout(url, fetchFn);
    if (!res.ok) {
      throw new Error(`FX API ${url} returned HTTP ${res.status}`);
    }
    const json = (await res.json()) as FxApiResponse;
    const base = json.base_code ?? json.base;
    if (base !== "USD") {
      throw new Error(`FX API ${url} returned unexpected base "${base}"`);
    }
    const need: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
    const out = {} as Record<Currency, number>;
    for (const c of need) {
      const v = json.rates[c];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new Error(`FX API ${url} missing rate for ${c}`);
      }
      out[c] = v;
    }
    return out;
  };

  try {
    return await tryParse(FX_PRIMARY_URL);
  } catch (e) {
    // fallback
    console.warn(`[fx] primary failed (${(e as Error).message}), trying secondary`);
    return await tryParse(FX_SECONDARY_URL);
  }
}

// ---------------------------------------------------------------------------
// diff engine
// ---------------------------------------------------------------------------

export function diffVendorPrices(
  source: VendorKey,
  yaml: VendorYaml,
  fetched: Map<string, number>,
): DriftEntry[] {
  const drifts: DriftEntry[] = [];
  for (const product of yaml.products) {
    const fetchedCents = fetched.get(product.id);
    if (fetchedCents === undefined) continue; // 未対応 ID
    const current = product.baseCostUsdCents;
    const deltaPct = ((fetchedCents - current) / current) * 100;
    if (Math.abs(deltaPct) < VENDOR_TOLERANCE_PCT) continue;
    drifts.push({
      source,
      productId: product.id,
      field: "baseCostUsdCents",
      current,
      fetched: fetchedCents,
      deltaPct: Math.round(deltaPct * 100) / 100,
      severity: Math.abs(deltaPct) >= HIGH_SEVERITY_PCT ? "high" : "low",
    });
  }
  return drifts;
}

export function diffFxRates(
  yaml: FxYaml,
  fetched: Record<Currency, number>,
): DriftEntry[] {
  const drifts: DriftEntry[] = [];
  for (const cur of Object.keys(yaml.rates) as Currency[]) {
    const current = yaml.rates[cur];
    const fetchedRate = fetched[cur];
    if (typeof fetchedRate !== "number") continue;
    const deltaPct = ((fetchedRate - current) / current) * 100;
    if (Math.abs(deltaPct) < FX_TOLERANCE_PCT) continue;
    drifts.push({
      source: "fx",
      field: cur,
      current,
      fetched: fetchedRate,
      deltaPct: Math.round(deltaPct * 100) / 100,
      severity: Math.abs(deltaPct) >= HIGH_SEVERITY_PCT ? "high" : "low",
    });
  }
  return drifts;
}

// ---------------------------------------------------------------------------
// notifier (GitHub Issue 作成)
// ---------------------------------------------------------------------------

export interface IssuePayload {
  title: string;
  body: string;
  labels: string[];
}

export function buildDriftIssuePayload(report: DriftReport): IssuePayload {
  const sources = Array.from(new Set(report.drifts.map((d) => d.source)));
  const sourceList = sources.join(", ");
  const title = `Vendor price drift detected: ${sourceList} on ${report.yyyymm}`;
  const lines: string[] = [];
  lines.push(`## Summary`);
  lines.push(
    `Detected ${report.drifts.length} drift(s) and ${report.warnings.length} warning(s).`,
  );
  lines.push("");
  if (report.drifts.length > 0) {
    lines.push(`## Drifts`);
    lines.push(`| Source | Target | Current | Fetched | Δ% | Severity |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const d of report.drifts) {
      const target = d.productId ? `${d.productId} / ${d.field}` : d.field;
      lines.push(
        `| ${d.source} | ${target} | ${d.current} | ${d.fetched} | ${d.deltaPct}% | ${d.severity} |`,
      );
    }
    lines.push("");
  }
  if (report.warnings.length > 0) {
    lines.push(`## Warnings (scrape-broken etc.)`);
    for (const w of report.warnings) {
      lines.push(`- **${w.source}**: ${w.message}`);
    }
    lines.push("");
  }
  lines.push(`## Next action (human)`);
  lines.push(`- [ ] vendor 公式で目視確認`);
  lines.push(`- [ ] data/${sources[0] ?? "<vendor>"}/products.yml の値を更新する PR を作成`);
  lines.push(`- [ ] CI 緑を確認 → merge`);
  lines.push(`- [ ] この Issue を close`);
  lines.push("");
  lines.push(`---`);
  lines.push(
    `_Auto-generated by \`vendor-price-drift\` workflow at ${report.generatedAt}._`,
  );
  const labels = ["price-drift", "automation"];
  if (report.drifts.some((d) => d.severity === "high")) labels.push("severity:high");
  return { title, body: lines.join("\n"), labels };
}

export function buildScrapeBrokenIssuePayload(report: DriftReport): IssuePayload {
  const sources = report.warnings.map((w) => w.source).join(", ");
  const title = `Vendor price drift scrape failure: ${sources} on ${report.yyyymm}`;
  const lines: string[] = [];
  lines.push(`## Failure detail`);
  for (const w of report.warnings) {
    lines.push(`### ${w.source}`);
    lines.push("```");
    lines.push(w.message);
    lines.push("```");
  }
  lines.push("");
  lines.push(`## Next action (human)`);
  lines.push(`- [ ] scripts/check-vendor-prices.ts の SELECTORS / ID マップを更新`);
  lines.push(`- [ ] ローカル \`pnpm exec tsx scripts/check-vendor-prices.ts --dry-run\` で復旧確認`);
  lines.push(`- [ ] PR → merge`);
  lines.push(`- [ ] この Issue を close`);
  lines.push("");
  lines.push(`_Generated at ${report.generatedAt}._`);
  return { title, body: lines.join("\n"), labels: ["price-drift", "scrape-broken", "automation"] };
}

// ---------------------------------------------------------------------------
// orchestrator
// ---------------------------------------------------------------------------

export interface CheckOptions {
  repoRoot: string;
  fetchFn?: FetchFn;
  printifyApiToken?: string;
  /** Skip Printify (e.g., when no token) without raising an error. */
  skipPrintifyIfNoToken?: boolean;
  /** Inject a fixed clock for tests / dry-run. */
  now?: Date;
}

export async function runDriftCheck(opts: CheckOptions): Promise<DriftReport> {
  const now = opts.now ?? new Date();
  const yyyymm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const report: DriftReport = {
    generatedAt: now.toISOString(),
    yyyymm,
    drifts: [],
    warnings: [],
  };
  const fetchFn = opts.fetchFn ?? globalThis.fetch;

  // Printful
  try {
    const yaml = loadVendorYaml(opts.repoRoot, "printful");
    const fetched = await fetchPrintfulPrices(fetchFn);
    report.drifts.push(...diffVendorPrices("printful", yaml, fetched));
  } catch (e) {
    report.warnings.push({ source: "printful", message: (e as Error).message });
  }

  // Printify
  try {
    const token = opts.printifyApiToken;
    if (!token && opts.skipPrintifyIfNoToken) {
      // dry-run: skip silently (no warning)
    } else {
      const yaml = loadVendorYaml(opts.repoRoot, "printify");
      const fetched = await fetchPrintifyPrices(token, fetchFn);
      report.drifts.push(...diffVendorPrices("printify", yaml, fetched));
    }
  } catch (e) {
    report.warnings.push({ source: "printify", message: (e as Error).message });
  }

  // FX
  try {
    const yaml = loadFxYaml(opts.repoRoot);
    const fetched = await fetchFxRates(fetchFn);
    report.drifts.push(...diffFxRates(yaml, fetched));
  } catch (e) {
    report.warnings.push({ source: "fx", message: (e as Error).message });
  }

  return report;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

interface OctokitLike {
  rest: {
    issues: {
      listForRepo: (params: {
        owner: string;
        repo: string;
        labels?: string;
        state?: "open" | "closed" | "all";
        per_page?: number;
      }) => Promise<{ data: Array<{ number: number; title: string }> }>;
      create: (params: {
        owner: string;
        repo: string;
        title: string;
        body: string;
        labels: string[];
      }) => Promise<{ data: { number: number; html_url: string } }>;
      createComment: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }) => Promise<{ data: { html_url: string } }>;
    };
  };
}

/**
 * Issue 重複防止: 同月 (タイトルに YYYY-MM を含む) の同種 Issue があれば
 * comment を追加、無ければ create する。
 */
export async function publishIssue(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  payload: IssuePayload,
  yyyymm: string,
): Promise<{ action: "created" | "commented"; url: string; issueNumber: number }> {
  const labels = payload.labels.join(",");
  const existing = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    labels,
    state: "open",
    per_page: 50,
  });
  const dup = existing.data.find((i) => i.title.includes(yyyymm));
  if (dup) {
    const r = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: dup.number,
      body: `Re-run on ${new Date().toISOString()} produced new drift:\n\n${payload.body}`,
    });
    return { action: "commented", url: r.data.html_url, issueNumber: dup.number };
  }
  const r = await octokit.rest.issues.create({
    owner,
    repo,
    title: payload.title,
    body: payload.body,
    labels: payload.labels,
  });
  return { action: "created", url: r.data.html_url, issueNumber: r.data.number };
}

async function mainCli(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const repoRoot = resolve(import.meta.dirname ?? __dirname, "..");
  const printifyToken = process.env.PRINTIFY_API_TOKEN;

  const report = await runDriftCheck({
    repoRoot,
    printifyApiToken: printifyToken,
    skipPrintifyIfNoToken: dryRun,
  });

  // Always print the report JSON (machine-readable for grep/jq).
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");

  if (dryRun) {
    process.stdout.write(
      `\n[dry-run] drifts=${report.drifts.length} warnings=${report.warnings.length}\n`,
    );
    return;
  }

  // CI mode: open Issue if drift or warning detected.
  if (report.drifts.length === 0 && report.warnings.length === 0) {
    process.stdout.write("\n[no-op] no drifts and no warnings; not opening any Issue.\n");
    return;
  }

  const ghToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPOSITORY; // "owner/repo"
  if (!ghToken || !ghRepo) {
    process.stdout.write(
      "\n[skip-issue] GH_TOKEN or GITHUB_REPOSITORY not set; skipping Issue creation.\n",
    );
    return;
  }
  const [owner, repo] = ghRepo.split("/");
  // Lazy import to keep dry-run lightweight (and keep the script importable in tests).
  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: ghToken }) as unknown as OctokitLike;

  if (report.drifts.length > 0) {
    const payload = buildDriftIssuePayload(report);
    const r = await publishIssue(octokit, owner, repo, payload, report.yyyymm);
    process.stdout.write(`\n[drift-issue] ${r.action}: ${r.url}\n`);
  }
  if (report.warnings.length > 0) {
    const payload = buildScrapeBrokenIssuePayload(report);
    const r = await publishIssue(octokit, owner, repo, payload, report.yyyymm);
    process.stdout.write(`\n[scrape-broken-issue] ${r.action}: ${r.url}\n`);
  }
}

// fail-soft: vendor 仕様変更で例外が漏れても runner は緑のまま。
// (ただし CI ログに stack trace は残す)
if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  // tsx の場合 import.meta.url がスクリプト URL になる
  import.meta.url === `file://${process.argv[1]}`
) {
  mainCli().catch((e) => {
    console.error("[fatal] uncaught error in mainCli:", e);
    process.exit(0); // fail-soft
  });
}
