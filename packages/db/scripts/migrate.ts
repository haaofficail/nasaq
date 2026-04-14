#!/usr/bin/env tsx
/**
 * Migration wrapper — loads .env from monorepo root before running drizzle-kit.
 * Avoids shell `source` issues with multi-line .env values.
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try monorepo root (.env), then local packages/db/.env
dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config({ path: resolve(__dirname, "../.env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

execSync("drizzle-kit migrate", {
  stdio: "inherit",
  env: process.env,
  cwd: resolve(__dirname, ".."),
});
