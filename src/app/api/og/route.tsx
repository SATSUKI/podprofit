import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { decodeShareLink } from "@/lib/calculator/share-link";
import { calculateProfit } from "@/lib/calculator/calculate-profit";
import {
  getProductById,
  loadFxRates,
} from "@/lib/calculator/load-products";
import {
  formatCurrency,
  parseDisplayAmount,
} from "@/lib/utils/format-currency";

/**
 * Dynamic OG image for share-able calculator results.
 *
 * W3 note: We attempted to load Geist via Google Fonts but @vercel/og's Satori
 * engine doesn't support woff2 (only TTF/OTF). Per CEO slim-down decree —
 * don't over-invest in font perfection when system fonts render cleanly at
 * 144px on a 1200x630 image. Brand identity comes through via color (#0F3D2E)
 * and tabular-numeric layout. Self-hosted Geist TTF can be added post-launch
 * if A/B testing shows it moves share-link CTR.
 */

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const state = decodeShareLink(url.searchParams);

  const fx = loadFxRates();
  const product = state.productId ? getProductById(state.productId) : undefined;

  let headline = "Run the numbers before you list.";
  let subline = "PODProfit · vendor-neutral, multi-currency, share-able";
  let marginLine = "";
  let isLoss = false;

  if (
    product &&
    state.vendor &&
    state.marketplace &&
    state.region &&
    state.currency &&
    state.retailDisplay
  ) {
    try {
      const result = calculateProfit(
        {
          productId: product.id,
          vendor: state.vendor,
          marketplace: state.marketplace,
          region: state.region,
          retailPriceCents: parseDisplayAmount(state.retailDisplay, state.currency),
          displayCurrency: state.currency,
          includeOffsiteAds: state.includeOffsiteAds,
        },
        product,
        fx,
      );
      headline = formatCurrency(result.netProfitCents, state.currency);
      subline = `${product.name} · ${capitalize(state.marketplace)} · ${state.region}`;
      marginLine = `${result.marginPercent.toFixed(1)}% margin`;
      isLoss = result.netProfitCents <= 0;
    } catch {
      // Fall back to defaults
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0F3D2E",
          color: "#ECF6F0",
          padding: 80,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            opacity: 0.85,
          }}
        >
          PODPROFIT · BUILDING IN PUBLIC
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 32,
            opacity: 0.85,
          }}
        >
          {marginLine ? "Net profit" : "Real Print-on-Demand profit"}
        </div>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "baseline",
            gap: 32,
          }}
        >
          <div
            style={{
              fontSize: 144,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              color: isLoss ? "#FCA5A5" : "#A3CFB5",
              lineHeight: 1,
            }}
          >
            {headline}
          </div>
          {marginLine && (
            <div style={{ fontSize: 48, opacity: 0.85 }}>{marginLine}</div>
          )}
        </div>

        <div style={{ flexGrow: 1 }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            opacity: 0.75,
          }}
        >
          <div style={{ maxWidth: 700 }}>{subline}</div>
          <div>getpodprofit.com</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
