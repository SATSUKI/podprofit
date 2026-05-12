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
import {
  BRAND_50,
  BRAND_700,
  BRAND_ACCENT,
  parseVariant,
  VARIANT_CONFIG,
  type Variant,
} from "./variants";

/**
 * Dynamic OG image endpoint.
 *
 * Two response modes, dispatched by URL params:
 *
 *   1. Calculator share-link mode — when the request decodes to a complete
 *      share-link state (product + vendor + marketplace + region + currency
 *      + retail price), we render the actual net-profit headline. This is
 *      what makes /c/<encoded> share previews show real numbers.
 *
 *   2. Variant mode — `?variant=<name>` selects a brand-styled per-page
 *      OG image (default | pricing | lifetime | about |
 *      cornerstone-multicurrency). No share-link decoding required — these
 *      are static-content posters with page-specific headlines.
 *
 * Share-link decoding takes precedence: a fully-formed share URL renders
 * the calculator result even if `variant=` is also present, so existing
 * share previews never regress.
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

  // ── Share-link mode — keep existing behavior when a full state decodes ─
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
      const headline = formatCurrency(result.netProfitCents, state.currency);
      const subline = `${product.name} · ${capitalize(state.marketplace)} · ${state.region}`;
      const marginLine = `${result.marginPercent.toFixed(1)}% margin`;
      const isLoss = result.netProfitCents <= 0;
      return renderShareLinkPoster({ headline, subline, marginLine, isLoss });
    } catch {
      // Fall through to variant rendering
    }
  }

  // ── Variant mode — page-specific posters ───────────────────────────────
  const variant = parseVariant(url.searchParams.get("variant"));
  return renderVariantPoster(variant);
}

function renderShareLinkPoster(props: {
  headline: string;
  subline: string;
  marginLine: string;
  isLoss: boolean;
}) {
  const { headline, subline, marginLine, isLoss } = props;
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: BRAND_700,
          color: BRAND_50,
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

        <div style={{ marginTop: 40, fontSize: 32, opacity: 0.85 }}>
          Net profit
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
              color: isLoss ? "#FCA5A5" : BRAND_ACCENT,
              lineHeight: 1,
            }}
          >
            {headline}
          </div>
          <div style={{ fontSize: 48, opacity: 0.85 }}>{marginLine}</div>
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
    { width: 1200, height: 630 },
  );
}

function renderVariantPoster(variant: Variant) {
  const cfg = VARIANT_CONFIG[variant];
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: BRAND_700,
          color: BRAND_50,
          padding: 80,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Eyebrow — page-specific kicker, doubles as breadcrumb. */}
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
          {cfg.eyebrow}
        </div>

        {/* Hero headline — sized per-variant so longer copy
            (e.g. cornerstone) doesn't wrap awkwardly. */}
        <div
          style={{
            marginTop: 56,
            fontSize: cfg.headlineSize,
            fontWeight: 800,
            lineHeight: 1.05,
            color: cfg.accentColor,
            maxWidth: 1040,
          }}
        >
          {cfg.headline}
        </div>

        {/* Sub-headline — concrete promise/spec line. */}
        <div
          style={{
            marginTop: 32,
            fontSize: 40,
            lineHeight: 1.25,
            opacity: 0.92,
            maxWidth: 1040,
          }}
        >
          {cfg.sub}
        </div>

        <div style={{ flexGrow: 1 }} />

        {/* Brand accent strip — thin colored bar above the footer reads as a
            visual signature in Twitter/LinkedIn previews even when the copy
            scales down. */}
        <div
          style={{
            display: "flex",
            height: 6,
            width: 200,
            backgroundColor: cfg.accentColor,
            marginBottom: 28,
            borderRadius: 3,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            opacity: 0.75,
          }}
        >
          <div style={{ maxWidth: 800 }}>{cfg.footerLeft}</div>
          <div>getpodprofit.com</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
