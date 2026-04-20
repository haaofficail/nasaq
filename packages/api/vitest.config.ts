import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/__tests__/pages-v2-*.test.ts",
      "src/__tests__/pagebuilder-*.test.ts",
      "src/__tests__/feature-flags-*.test.ts",
      "src/__tests__/v2/**/*.test.ts",
      "src/__tests__/canonical/**/*.test.ts",
    ],
    testTimeout: 15000, // DB tests need more time
    coverage: {
      provider: "v8",
      include: [
        "src/engines/**/*.ts",
        "src/lib/booking-ops.ts",
      ],
      reporter: ["text", "json-summary"],
    },
  },
  resolve: {
    alias: {
      "@nasaq/db": path.resolve(__dirname, "../db"),
    },
  },
});
