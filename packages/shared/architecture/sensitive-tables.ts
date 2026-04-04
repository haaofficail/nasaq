/**
 * SENSITIVE TABLES REGISTRY
 *
 * These tables must NEVER be written to directly from:
 * - seed scripts
 * - bash/curl scripts
 * - manual SQL outside migrations/repairs
 *
 * All writes must go through: API → Service Layer → DB
 */

export const SENSITIVE_TABLES = [
  // Orders & Operations
  "flower_orders",
  "bookings",
  "booking_items",
  // Financial
  "invoices",
  "invoice_items",
  "invoice_payments",
  "journal_entries",
  "journal_entry_lines",
  "payments",
  // Capabilities & Permissions
  "organization_capability_overrides",
  "role_permissions",
  "roles",
  // Inventory
  "inventory_movements",
  "stock_movements",
  "flower_batches",
  // Customer Activity
  "customers",
  // Approvals
  "approvals",
  "approval_logs",
  // Delivery
  "fulfillments",
  "allocations",
] as const;

export type SensitiveTable = (typeof SENSITIVE_TABLES)[number];

export const ALLOWED_DIRECT_WRITE_PATHS = [
  "packages/db/migrations",
  "packages/db/schema",
  "scripts/repairs",
  "packages/db/seeds/reference", // lookup/reference data only
] as const;

export const BYPASS_POLICY = `
ARCHITECTURAL GUARDRAIL: Direct writes to sensitive tables are forbidden outside
allowed paths. All business data must flow through:
  API → Validation → Service Layer → DB

Allowed exceptions (requires explicit approval):
  1. Database migrations (schema changes only)
  2. Reference/lookup data seeding (non-business data)
  3. Approved data repair scripts in scripts/repairs/

If you need to create business data: use the API simulation layer.
` as const;
