import { pgTable, text, boolean, timestamp, uuid, uniqueIndex, varchar, integer, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

// ============================================================
// CAPABILITY REGISTRY
// Master list of all possible capabilities with metadata
// ============================================================

// ============================================================
// PLAN CAPABILITIES
// Maps which capabilities are included in each plan by default.
// This is the authoritative source for plan-level feature access.
// ============================================================

export const planCapabilities = pgTable("plan_capabilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  planCode: varchar("plan_code", { length: 20 }).notNull(),      // "free" | "basic" | "advanced" | "pro" | "enterprise"
  capabilityKey: text("capability_key").notNull(),               // FK to capability_registry.key
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("plan_capabilities_unique_idx").on(table.planCode, table.capabilityKey),
]);

// Global reference data — not tenant-scoped by design
export const capabilityRegistry = pgTable("capability_registry", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),                        // "inventory" | "pos" | "hotel"
  labelAr: text("label_ar").notNull(),
  labelEn: text("label_en").notNull(),
  description: text("description"),
  category: text("category").notNull(),              // core | vertical | financial | marketing | operational
  requires: text("requires").array(),                // capability keys that must also be enabled
  isPremium: boolean("is_premium").notNull().default(false),
  // ── Feature flag controls (added migration 148) ────────────
  killSwitch: boolean("kill_switch").notNull().default(false),
  defaultForNewOrgs: boolean("default_for_new_orgs").notNull().default(false),
  rolloutPercentage: integer("rollout_percentage").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("capability_registry_key_idx").on(table.key),
]);

// ── CAPABILITY AUDIT LOG ───────────────────────────────────────────────────
// Tracks every feature-flag change: kill switch, rollout %, org overrides
// ──────────────────────────────────────────────────────────────────────────

export const capabilityAuditLog = pgTable("capability_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  capabilityKey: text("capability_key").notNull(),
  action: text("action").notNull(), // 'kill_switch_on' | 'kill_switch_off' | 'rollout_changed' | etc.
  targetOrgId: uuid("target_org_id").references(() => organizations.id, { onDelete: "set null" }),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("cap_audit_log_key_idx").on(table.capabilityKey),
  index("cap_audit_log_at_idx").on(table.changedAt),
]);
