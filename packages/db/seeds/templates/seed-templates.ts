/**
 * Seed: Page Templates — 10 قوالب عربية جاهزة
 *
 * آمن للتشغيل عدة مرات (INSERT ON CONFLICT UPDATE)
 *
 * Usage:
 *   pnpm --filter @nasaq/db seed:templates
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { TEMPLATES_DATA } from "./templates-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../../.env") });
dotenv.config({ path: resolve(__dirname, "../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in .env");
  process.exit(1);
}

async function seedTemplates() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Seeding page_templates...\n");

    let upserted = 0;

    for (const t of TEMPLATES_DATA) {
      await client.query(
        `INSERT INTO page_templates (
          slug, name_ar, description_ar, category, business_types,
          data, preview_image_url, tags, is_featured, is_published,
          usage_count, sort_order, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET
          name_ar          = EXCLUDED.name_ar,
          description_ar   = EXCLUDED.description_ar,
          category         = EXCLUDED.category,
          business_types   = EXCLUDED.business_types,
          data             = EXCLUDED.data,
          preview_image_url = EXCLUDED.preview_image_url,
          tags             = EXCLUDED.tags,
          is_featured      = EXCLUDED.is_featured,
          is_published     = EXCLUDED.is_published,
          sort_order       = EXCLUDED.sort_order,
          updated_at       = NOW()`,
        [
          t.slug,
          t.nameAr,
          t.descriptionAr,
          t.category,
          t.businessTypes,
          JSON.stringify(t.data),
          t.previewImageUrl,
          t.tags,
          t.isFeatured,
          t.isPublished,
          0,
          t.sortOrder,
        ]
      );

      console.log(`  [OK] ${t.slug} — ${t.nameAr}`);
      upserted++;
    }

    console.log(`\nDone: ${upserted} templates upserted.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTemplates().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
