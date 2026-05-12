import type { Metadata, Viewport } from "next";

/**
 * Root-layout metadata, factored out so it can be unit-tested without
 * triggering Next.js's `next/font/google` runtime (which only works
 * inside a real Next build server).
 *
 * `src/app/layout.tsx` re-exports these as `metadata` + `viewport` —
 * Next reads them from the layout module via the file-convention loader,
 * which doesn't follow the re-export through to this file. That's why
 * the layout has to do the re-export, not just `export * from "./_metadata"`.
 */

export const SITE_URL = "https://getpodprofit.com";

/**
 * Default OG image — points at our dynamic /api/og endpoint with no params,
 * which renders the brand fallback ("Real Print-on-Demand profit", brand
 * green, system fonts). Per-page metadata can override this when a
 * page-specific image makes more sense (e.g. share-link preview).
 *
 * Spec'd at 1200x630 because that is what /api/og emits — keeping the
 * declared dimensions in sync with the actual image dimensions avoids
 * Twitter / LinkedIn cropping the image to a default aspect ratio.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/api/og?variant=default",
  width: 1200,
  height: 630,
  alt: "PODProfit — Real Print-on-Demand profit calculator",
} as const;

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PODProfit — Real Print-on-Demand profit calculator",
    template: "%s | PODProfit",
  },
  description:
    "Stop guessing your Print-on-Demand margin. Calculate real profit across Printful and Printify in 6 currencies (USD, EUR, GBP, CAD, AUD, JPY) — all fees itemized, every price dated.",
  applicationName: "PODProfit",
  keywords: [
    "POD profit calculator",
    "print on demand profit",
    "Printful profit calculator",
    "Printify profit calculator",
    "Etsy POD calculator",
    "Shopify POD calculator",
    "multi currency POD calculator",
  ],
  authors: [{ name: "Satsuki Okazaki", url: "https://getpodprofit.com" }],
  creator: "Satsuki Okazaki",
  publisher: "PODProfit",
  // Root canonical — child pages with their own `metadata.alternates.canonical`
  // override this; pages without one inherit the homepage canonical.
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "PODProfit — Real Print-on-Demand profit calculator",
    description:
      "Vendor-neutral. Multi-currency. Share-able. The honest calculator POD sellers wish they'd had.",
    siteName: "PODProfit",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "PODProfit — Real POD profit calculator",
    description:
      "Vendor-neutral. Multi-currency. Share-able. Built in public.",
    images: [DEFAULT_OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F3D2E" },
    { media: "(prefers-color-scheme: dark)", color: "#0F3D2E" },
  ],
  width: "device-width",
  initialScale: 1,
};
