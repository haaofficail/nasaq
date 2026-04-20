import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Only run v2 tests — existing tests use node:test runner, not Vitest
    include: ["src/__tests__/pages-v2-*.test.ts", "src/__tests__/v2/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@nasaq/db": path.resolve(__dirname, "../db"),
    },
  },
});
