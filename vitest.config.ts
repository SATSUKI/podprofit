import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` is a Next.js build-time guard that throws when imported
      // from a Client Component. In vitest we don't run that guard — alias to
      // the stub below so `import "server-only"` is a no-op for unit tests.
      "server-only": path.resolve(__dirname, "./tests/unit/_server-only-stub.ts"),
    },
  },
});
