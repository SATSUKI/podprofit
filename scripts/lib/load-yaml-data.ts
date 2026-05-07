/**
 * Build-time YAML loader for product / FX data.
 *
 * Why this exists separately from `src/lib/calculator/load-products.ts`:
 *  - That file is the *runtime* (browser-shipped) catalog and currently inlines
 *    its data as TS to avoid bundling YAML into the client.
 *  - Build scripts run in Node and are free to read YAML directly. Reading from
 *    the YAML files is the safer source of truth for shippable artifacts
 *    (Excel template, PDF report) — when YAML changes, the artifacts change,
 *    no second-source drift.
 *
 * If/when the runtime catalog is regenerated from YAML at build time, this
 * loader is the natural shared starting point.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import type {
  Currency,
  FxRates,
  ProductVariant,
  Region,
  Vendor,
} from "@/types/calculator";

interface RawVendorYaml {
  vendor: Vendor;
  asOfDate: string;
  sourceUrl: string;
  disclaimer?: string;
  products: Array<{
    id: string;
    name: string;
    category?: string;
    baseCostUsdCents: number;
    shippingUsdCents: Partial<Record<Region, number>>;
  }>;
}

interface RawFxYaml {
  asOfDate: string;
  sourceUrl: string;
  rates: Record<Currency, number>;
}

const REPO_ROOT = resolve(__dirname, "..", "..");

function readYaml<T>(relativePath: string): T {
  const abs = resolve(REPO_ROOT, relativePath);
  const text = readFileSync(abs, "utf8");
  return yaml.load(text) as T;
}

function vendorToVariants(raw: RawVendorYaml): ProductVariant[] {
  return raw.products.map((p) => ({
    id: p.id,
    vendor: raw.vendor,
    name: p.name,
    baseCostUsdCents: p.baseCostUsdCents,
    shippingUsdCents: p.shippingUsdCents,
    sourceUrl: raw.sourceUrl,
    asOfDate: raw.asOfDate,
  }));
}

export interface LoadedCatalog {
  printful: {
    raw: RawVendorYaml;
    variants: ProductVariant[];
  };
  printify: {
    raw: RawVendorYaml;
    variants: ProductVariant[];
  };
  fx: FxRates & { sourceUrl: string };
  allVariants: ProductVariant[];
}

export function loadCatalog(): LoadedCatalog {
  const printfulRaw = readYaml<RawVendorYaml>("data/printful/products.yml");
  const printifyRaw = readYaml<RawVendorYaml>("data/printify/products.yml");
  const fxRaw = readYaml<RawFxYaml>("data/fx-rates.yml");

  const printfulVariants = vendorToVariants(printfulRaw);
  const printifyVariants = vendorToVariants(printifyRaw);

  return {
    printful: { raw: printfulRaw, variants: printfulVariants },
    printify: { raw: printifyRaw, variants: printifyVariants },
    fx: {
      asOfDate: fxRaw.asOfDate,
      rates: fxRaw.rates,
      sourceUrl: fxRaw.sourceUrl,
    },
    allVariants: [...printfulVariants, ...printifyVariants],
  };
}
