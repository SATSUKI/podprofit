import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { calculateProfit } from "@/lib/calculator/calculate-profit";
import {
  getProductById,
  loadAllProducts,
  loadFxRates,
} from "@/lib/calculator/load-products";

export const runtime = "edge"; // calculator is pure TS — Edge is fast and cheap

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

const QuerySchema = z.object({
  product: z.string(),
  vendor: z.enum(["printful", "printify"]),
  marketplace: z.enum([
    "etsy",
    "shopify",
    "amazon-merch",
    "printify-pop-up",
    "manual",
  ]),
  region: z.enum(["US", "EU", "UK", "CA", "AU"]),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]),
  retail: z.coerce.number().positive(),
  ads: z.coerce.boolean().optional(),
});

/**
 * Public read-only calculator API.
 *
 *   GET /api/v1/calculate
 *     ?product=printful-bella-canvas-3001-tee-white-m
 *     &vendor=printful
 *     &marketplace=etsy
 *     &region=US
 *     &currency=USD
 *     &retail=24.00
 *     &ads=false
 *
 * Returns:
 *   { input, output, meta, products: [available product IDs] }
 *
 * No auth, CORS open, runs at the Edge. AIO-friendly: documented at /docs/api.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Special case: list all available products + currencies (no params).
  if ([...searchParams.keys()].length === 0) {
    return NextResponse.json(
      {
        version: "1.0",
        endpoints: {
          GET_calculate:
            "/api/v1/calculate?product=&vendor=&marketplace=&region=&currency=&retail=",
        },
        products: loadAllProducts().map((p) => ({
          id: p.id,
          name: p.name,
          vendor: p.vendor,
          baseCostUsd: p.baseCostUsdCents / 100,
        })),
        marketplaces: ["etsy", "shopify", "amazon-merch", "printify-pop-up", "manual"],
        regions: ["US", "EU", "UK", "CA", "AU"],
        currencies: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"],
      },
      { headers: CORS_HEADERS },
    );
  }

  let q: z.infer<typeof QuerySchema>;
  try {
    q = QuerySchema.parse({
      product: searchParams.get("product"),
      vendor: searchParams.get("vendor"),
      marketplace: searchParams.get("marketplace"),
      region: searchParams.get("region"),
      currency: searchParams.get("currency"),
      retail: searchParams.get("retail"),
      ads: searchParams.get("ads") ?? undefined,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        detail: (err as Error).message,
        docs: "/docs/api",
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const product = getProductById(q.product);
  if (!product) {
    return NextResponse.json(
      {
        error: `Unknown product "${q.product}"`,
        hint: "Call GET /api/v1/calculate with no params to list valid products.",
      },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  // Currency-correct minor-unit conversion: JPY has 0 decimals, others 2.
  const decimals = q.currency === "JPY" ? 0 : 2;
  const retailMinorUnits = Math.round(q.retail * Math.pow(10, decimals));

  try {
    const result = calculateProfit(
      {
        productId: q.product,
        vendor: q.vendor,
        marketplace: q.marketplace,
        region: q.region,
        retailPriceCents: retailMinorUnits,
        displayCurrency: q.currency,
        includeOffsiteAds: q.ads,
      },
      product,
      loadFxRates(),
    );
    return NextResponse.json(
      {
        input: { ...q },
        output: result,
        meta: {
          version: "1.0",
          docs: "https://getpodprofit.com/docs/api",
          source: "https://github.com/SATSUKI/podprofit",
        },
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}
