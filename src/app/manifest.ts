import type { MetadataRoute } from "next";

/**
 * Minimum PWA manifest — manifest.webmanifest served at /manifest.webmanifest.
 * Per CEO slim-down decree: install prompt + offline fallback are deferred
 * until launch + traffic. This is just enough for "Add to Home Screen" to
 * work cleanly with brand colors and a real icon name.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PODProfit — Real Print-on-Demand profit calculator",
    short_name: "PODProfit",
    description:
      "Vendor-neutral, multi-currency, share-able profit calculator for POD sellers.",
    start_url: "/",
    display: "minimal-ui",
    background_color: "#fafaf9",
    theme_color: "#0F3D2E",
    icons: [
      // Use the SVG favicon as the maskable icon source. Browsers will scale.
      // Real PNG icons (192/512 maskable) are a follow-up if PWA install
      // metrics indicate value post-launch.
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
