import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://getpodprofit.com";

export const metadata: Metadata = {
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
  authors: [{ name: "Satsuki Okazaki", url: "https://x.com/lastarna" }],
  creator: "Satsuki Okazaki",
  publisher: "PODProfit",
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "PODProfit — Real Print-on-Demand profit calculator",
    description:
      "Vendor-neutral. Multi-currency. Share-able. The honest calculator POD sellers wish they'd had.",
    siteName: "PODProfit",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@lastarna",
    title: "PODProfit — Real POD profit calculator",
    description:
      "Vendor-neutral. Multi-currency. Share-able. Built in public.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F3D2E" },
    { media: "(prefers-color-scheme: dark)", color: "#0F3D2E" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
