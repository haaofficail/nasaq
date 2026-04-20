#!/usr/bin/env tsx
/**
 * Custom migration runner for ترميز OS.
 *
 * Applies numbered SQL migrations (004_*.sql … NNN_*.sql) in order.
 * Tracks applied migrations in a `_nasaq_migrations` table — independent
 * of drizzle-kit's __drizzle_migrations so both can coexist safely.
 *
 * Usage:
 *   pnpm --filter @nasaq/db migrate          — apply pending numbered migrations
 *   pnpm --filter @nasaq/db migrate --dry-run — list pending without applying
 */

import dotenv from "dotenv";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { readdirSync, readFileSync } from "fs";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env: monorepo root → packages/db/.env → process env
dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config({ path: resolve(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in .env");
  process.exit(1);
}

const dryRun    = process.argv.includes("--dry-run");
const baseline  = process.argv.includes("--baseline");
const MIGRATIONS_DIR = resolve(__dirname, "../migrations");

// Only forward migrations (e.g. 004_*, 128_*) — not drizzle-kit 0000_* files, not *_rollback.sql
function getNumberedMigrations(): Array<{ file: string; num: number }> {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) =>
      /^\d+_.*\.sql$/.test(f) &&
      !f.endsWith("_rollback.sql") &&
      !f.startsWith("0000") && !f.startsWith("0001") && !f.startsWith("0002") && !f.startsWith("0003") && !f.startsWith("0004h") && !f.startsWith("0005")
    )
    .map((f) => ({ file: f, num: parseInt(f.split("_")[0], 10) }))
    .sort((a, b) => a.num - b.num);
}

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _nasaq_migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT    NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Fetch already-applied migrations
    const { rows } = await client.query<{ filename: string }>(
      "SELECT filename FROM _nasaq_migrations ORDER BY id"
    );
    const applied = new Set(rows.map((r) => r.filename));

    const all = getNumberedMigrations();
    const pending = all.filter((m) => !applied.has(m.file));

    // ── Baseline mode ────────────────────────────────────────────────────────
    // Mark all existing migration files as applied WITHOUT running their SQL.
    // Use once on a DB that was set up before this runner existed.
    if (baseline) {
      const untracked = all.filter((m) => !applied.has(m.file));
      if (untracked.length === 0) {
        console.log("Baseline: nothing to record — all files already tracked.");
        return;
      }
      console.log(`Baseline: recording ${untracked.length} existing migration(s) as applied...\n`);
      for (const m of untracked) {
        await client.query(
          "INSERT INTO _nasaq_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
          [m.file]
        );
        console.log(`  ✓ ${m.file}`);
      }
      console.log(`\nBaseline complete. Run 'pnpm migrate' for future migrations.`);
      return;
    }

    // ── Normal mode ──────────────────────────────────────────────────────────
    if (pending.length === 0) {
      console.log("All migrations up to date.");
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);
    for (const m of pending) {
      console.log(`  ${m.file}`);
    }

    if (dryRun) {
      console.log("\n--dry-run: no changes applied.");
      return;
    }

    console.log("");

    for (const m of pending) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, m.file), "utf8");
      console.log(`Applying ${m.file}...`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO _nasaq_migrations (filename) VALUES ($1)",
          [m.file]
        );
        await client.query("COMMIT");
        console.log(`  ✓ done`);
      } catch (err: any) {
        await client.query("ROLLBACK");
        console.error(`  ✗ FAILED: ${err.message}`);
        process.exit(1);
      }
    }

    console.log(`\nMigrations complete.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
