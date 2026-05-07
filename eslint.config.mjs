import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated digital products (xlsx/pdf live here).
    "dist/**",
  ]),
  // Build scripts run in Node, not the browser. The `react/no-unescaped-entities`
  // rule is meaningless for @react-pdf/renderer JSX (not real DOM), and console
  // logging is intentional for build-time progress reporting.
  {
    files: ["scripts/**/*.{ts,tsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
