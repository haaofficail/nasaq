/**
 * Seed: Page Builder v2 — dev page sample
 *
 * Creates one draft "home" page for the first org in the DB.
 * Safe to run multiple times (INSERT ... ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   pnpm --filter @nasaq/db exec tsx seeds/seed-pages-v2.ts
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config({ path: resolve(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in .env");
  process.exit(1);
}

// Minimal Puck draft data for a home page
const homeDraftData = {
  content: [],
  root: {
    props: {
      title: "الصفحة الرئيسية",
      description: "أهلاً بكم في موقعنا",
    },
  },
};

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // Get first org
    const { rows: orgs } = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM organizations ORDER BY created_at ASC LIMIT 1"
    );

    if (orgs.length === 0) {
      console.log("No organizations found — run demo seed first.");
      return;
    }

    const org = orgs[0];
    console.log(`Seeding pages_v2 for org: ${org.name} (${org.id})\n`);

    // Insert sample home page
    const { rows: inserted } = await client.query(
      `INSERT INTO pages_v2 (org_id, slug, title, page_type, status, draft_data, sort_order, show_in_navigation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ON CONSTRAINT pages_v2_org_slug_idx DO NOTHING
       RETURNING id, slug, title`,
      [
        org.id,
        "home",
        "الصفحة الرئيسية",
        "home",
        "draft",
        JSON.stringify(homeDraftData),
        0,
        true,
      ]
    );

    if (inserted.length > 0) {
      const p = inserted[0];
      console.log(`  ✓ Created page: "${p.title}" (/${p.slug}) id=${p.id}`);

      // Insert initial version
      await client.query(
        `INSERT INTO page_versions_v2 (page_id, org_id, version_number, data, change_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [p.id, org.id, 1, JSON.stringify(homeDraftData), "manual_save"]
      );
      console.log(`  ✓ Created version 1`);
    } else {
      console.log(`  — Page "home" already exists for this org — skipped`);
    }

    console.log("\nSeed complete.");
  } catch (err: any) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
