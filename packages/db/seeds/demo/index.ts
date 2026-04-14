#!/usr/bin/env tsx
/**
 * Comprehensive Demo Data Seed — ترميز OS
 *
 * Creates production-grade demo data for all 33 business types.
 * Each org gets: users, roles, pipeline, chart of accounts, categories,
 * services, 30 customers, 40+ bookings with invoices & journal entries,
 * POS transactions (where applicable), and monthly expenses.
 *
 * Usage:
 *   pnpm --filter @nasaq/db seed:demo             # seed all types
 *   pnpm --filter @nasaq/db seed:demo --all        # seed all types (explicit)
 *   pnpm --filter @nasaq/db seed:demo --type=salon # seed only salon
 *   pnpm --filter @nasaq/db seed:demo --reset      # delete all demo orgs first
 *
 * Safe to rerun: orgs are identified by slug and skipped if they exist.
 */

import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env: try monorepo root first, then local packages/db/
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();
import { ALL_ORGS } from "./_data";
import {
  createOrg, createTeam, createPipeline, createCatalog,
  createCustomers, createBookings, createPosTransactions,
  createExpenses, seedChartOfAccounts,
} from "./_shared";
import { seedVertical } from "./_verticals";

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const typeArg = args.find(a => a.startsWith("--type="))?.split("=")[1];
const resetFlag = args.includes("--reset");
const allFlag = args.includes("--all") || !typeArg;

const orgsToSeed = typeArg
  ? ALL_ORGS.filter(o => o.businessType === typeArg || o.slug === typeArg)
  : ALL_ORGS;

if (orgsToSeed.length === 0) {
  console.error(`No orgs found for type: ${typeArg}`);
  process.exit(1);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log(`\nTramiZ OS — Demo Seed`);
    console.log(`Seeding ${orgsToSeed.length} org(s)...\n`);

    if (resetFlag) {
      console.log("Resetting demo orgs...");
      // Collect demo org IDs
      const demoRes = await client.query(
        `SELECT id FROM organizations WHERE has_demo_data = true AND slug LIKE 'demo-%'`
      );
      const demoIds: string[] = demoRes.rows.map((r: any) => r.id);

      if (demoIds.length > 0) {
        // Safe delete: silently skips if table doesn't exist (pg code 42P01)
        const safeDelete = async (table: string) => {
          try {
            await client.query(`DELETE FROM ${table} WHERE org_id = ANY($1)`, [demoIds]);
          } catch (err: any) {
            if (err.code === "42P01") return; // undefined_table — skip
            throw err;
          }
        };

        // 1. Pre-delete tables that may block org deletion
        //    Only tables confirmed to have RESTRICT/NO ACTION FK or that our seed writes to
        const preTables = [
          "rfp_proposals",      // ON DELETE no action (confirmed)
          "menu_categories",    // F&B vertical writes here
          "menu_items",         // F&B vertical writes here
          "restaurant_tables",  // F&B vertical writes here
        ];
        for (const tbl of preTables) {
          await safeDelete(tbl);
        }

        // 2. booking_items.service_id → services (RESTRICT, no org_id column)
        await client.query(
          `DELETE FROM booking_items WHERE booking_id IN
           (SELECT id FROM bookings WHERE org_id = ANY($1))`,
          [demoIds]
        );

        // 3. journal_entry_lines.account_id → chart_of_accounts (RESTRICT, no org_id column)
        await client.query(
          `DELETE FROM journal_entry_lines WHERE entry_id IN
           (SELECT id FROM journal_entries WHERE org_id = ANY($1))`,
          [demoIds]
        );

        // Now safe to delete orgs
        await client.query(`DELETE FROM organizations WHERE id = ANY($1)`, [demoIds]);
      }
      console.log("  → Done\n");
    }

    for (const cfg of orgsToSeed) {
      await client.query("BEGIN");
      try {
        console.log(`[${cfg.businessType}] ${cfg.name} (${cfg.slug})`);

        const orgId = await createOrg(client, cfg);
        if (!orgId) {
          await client.query("ROLLBACK");
          continue;
        }

        // Team
        await createTeam(client, orgId, cfg.ownerName, cfg.phone, cfg.email);

        // Roles
        await client.query(
          `INSERT INTO roles (org_id, name, name_en, is_system) VALUES
             ($1,'مدير عمليات','Operations Manager',true),
             ($1,'مشرف حجوزات','Booking Supervisor',true),
             ($1,'محاسب','Accountant',true)
           ON CONFLICT DO NOTHING`,
          [orgId]
        );

        // Pipeline
        await createPipeline(client, orgId);

        // Chart of Accounts
        const accounts = await seedChartOfAccounts(client, orgId);

        // Catalog
        const { serviceIds } = await createCatalog(
          client, orgId, cfg.categories, cfg.services
        );

        // POS settings (for pos-capable orgs)
        if (cfg.hasPos) {
          await client.query(
            `INSERT INTO pos_settings (org_id, default_tax_percent, max_discount_percent)
             VALUES ($1, 15, 20)
             ON CONFLICT (org_id) DO NOTHING`,
            [orgId]
          );
        }

        // Customers
        const customers = await createCustomers(client, orgId);

        // Bookings + invoices + journal entries
        const bookingCount = cfg.hasPos ? 30 : 40;
        await createBookings(
          client, orgId, cfg.name, customers, serviceIds, cfg.services, accounts, bookingCount,
          cfg.vatNumber, cfg.crNumber, cfg.city
        );

        // POS transactions
        if (cfg.hasPos) {
          await createPosTransactions(
            client, orgId, cfg.name, customers, cfg.services, accounts, 50
          );
        }

        // Monthly expenses
        const monthlyRent = [8000, 10000, 12000, 15000, 6000, 5000][
          Math.floor(Math.random() * 6)
        ];
        await createExpenses(client, orgId, accounts, monthlyRent);

        // Vertical-specific deep data (flower_shop, hotel, car_rental, salon, school, ...)
        await seedVertical(client, orgId, cfg.businessType);

        await client.query("COMMIT");
        console.log(`  → OK (orgId: ${orgId})`);

      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  → FAILED: ${err}`);
        // Continue with other orgs
      }
    }

    console.log(`\nSeed complete.`);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
