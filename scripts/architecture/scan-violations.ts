#!/usr/bin/env npx tsx
/**
 * ARCHITECTURAL VIOLATION SCANNER
 *
 * Scans the codebase for direct writes to sensitive tables that should
 * only be written via the API → Service Layer → DB path.
 *
 * Usage: npx tsx scripts/architecture/scan-violations.ts
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================
// SENSITIVE TABLES (mirrors packages/shared/architecture/sensitive-tables.ts)
// ============================================================
const SENSITIVE_TABLES = [
  "flower_orders",
  "bookings",
  "booking_items",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "journal_entries",
  "journal_entry_lines",
  "payments",
  "organization_capability_overrides",
  "role_permissions",
  "roles",
  "inventory_movements",
  "stock_movements",
  "flower_batches",
  "customers",
  "approvals",
  "approval_logs",
  "fulfillments",
  "allocations",
];

const ALLOWED_PATHS = [
  "packages/db/migrations",
  "packages/db/schema",
  "scripts/repairs",
  "packages/db/seeds/reference",
];

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".turbo",
  "coverage",
  ".next",
]);

const SCANNED_EXTENSIONS = new Set([".ts", ".js", ".sh", ".sql"]);

// ============================================================
// VIOLATION PATTERNS
// ============================================================
type ViolationType = "DIRECT_INSERT" | "DIRECT_UPDATE" | "DIRECT_DELETE";

interface ViolationPattern {
  type: ViolationType;
  regex: RegExp;
}

function buildPatterns(table: string): ViolationPattern[] {
  return [
    {
      type: "DIRECT_INSERT",
      regex: new RegExp(`INSERT\\s+INTO\\s+["'\`]?${table}["'\`]?`, "i"),
    },
    {
      type: "DIRECT_UPDATE",
      regex: new RegExp(`UPDATE\\s+["'\`]?${table}["'\`]?\\s+SET`, "i"),
    },
    {
      type: "DIRECT_DELETE",
      regex: new RegExp(`DELETE\\s+FROM\\s+["'\`]?${table}["'\`]?`, "i"),
    },
  ];
}

// ============================================================
// FIX SUGGESTION
// ============================================================
function getFixSuggestion(table: string, type: ViolationType): string {
  const fixes: Record<string, Record<ViolationType, string>> = {
    flower_orders: {
      DIRECT_INSERT: "Use POST /flower-builder/orders API instead",
      DIRECT_UPDATE: "Use PATCH /flower-builder/orders/:id API instead",
      DIRECT_DELETE: "Use DELETE /flower-builder/orders/:id API instead",
    },
    bookings: {
      DIRECT_INSERT: "Use POST /bookings API instead",
      DIRECT_UPDATE: "Use PATCH /bookings/:id API instead",
      DIRECT_DELETE: "Use DELETE /bookings/:id API instead",
    },
    invoices: {
      DIRECT_INSERT: "Use POST /finance/invoices API instead",
      DIRECT_UPDATE: "Use PATCH /finance/invoices/:id API instead",
      DIRECT_DELETE: "Use DELETE /finance/invoices/:id API instead",
    },
    journal_entries: {
      DIRECT_INSERT: "Use POST /finance/journal-entries API instead",
      DIRECT_UPDATE: "Use PATCH /finance/journal-entries/:id API instead",
      DIRECT_DELETE: "Use DELETE /finance/journal-entries/:id API instead",
    },
    organization_capability_overrides: {
      DIRECT_INSERT: "Use capability-service.ts enableCapability() instead",
      DIRECT_UPDATE: "Use capability-service.ts enableCapability() instead",
      DIRECT_DELETE: "Use capability-service.ts removeCapabilityOverride() instead",
    },
    role_permissions: {
      DIRECT_INSERT: "Use PUT /team/roles/:id/permissions API instead",
      DIRECT_UPDATE: "Use PUT /team/roles/:id/permissions API instead",
      DIRECT_DELETE: "Use PUT /team/roles/:id/permissions API instead",
    },
    customers: {
      DIRECT_INSERT: "Use POST /customers API instead",
      DIRECT_UPDATE: "Use PATCH /customers/:id API instead",
      DIRECT_DELETE: "Use DELETE /customers/:id API instead",
    },
  };

  const tableFixes = fixes[table];
  if (tableFixes) return tableFixes[type];
  return `Use the appropriate API endpoint for ${table} instead`;
}

// ============================================================
// FILE SCANNER
// ============================================================
interface Violation {
  file: string;
  line: number;
  table: string;
  type: ViolationType;
  content: string;
  severity: "HIGH" | "MEDIUM";
}

function isAllowedPath(filePath: string, repoRoot: string): boolean {
  const relative = path.relative(repoRoot, filePath).replace(/\\/g, "/");
  return ALLOWED_PATHS.some((allowed) => relative.startsWith(allowed));
}

function scanFile(filePath: string, repoRoot: string): Violation[] {
  if (isAllowedPath(filePath, repoRoot)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Violation[] = [];

  for (const table of SENSITIVE_TABLES) {
    const patterns = buildPatterns(table);
    for (const { type, regex } of patterns) {
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          violations.push({
            file: filePath,
            line: idx + 1,
            table,
            type,
            content: line.trim(),
            severity: "HIGH",
          });
        }
      });
    }
  }

  return violations;
}

function walkDir(dir: string, repoRoot: string): Violation[] {
  const violations: Violation[] = [];
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return violations;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      violations.push(...walkDir(fullPath, repoRoot));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCANNED_EXTENSIONS.has(ext)) {
        violations.push(...scanFile(fullPath, repoRoot));
      }
    }
  }

  return violations;
}

// ============================================================
// MAIN
// ============================================================
function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  console.log(`\nARCHITECTURAL VIOLATION SCANNER`);
  console.log(`Scanning: ${repoRoot}`);
  console.log(`Excluded paths: ${ALLOWED_PATHS.join(", ")}\n`);
  console.log("=".repeat(60));

  const violations = walkDir(repoRoot, repoRoot);

  if (violations.length === 0) {
    console.log("\nNo architectural violations detected.\n");
    process.exit(0);
  }

  console.log(`\nFound ${violations.length} violation(s):\n`);

  for (const v of violations) {
    const relative = path.relative(repoRoot, v.file).replace(/\\/g, "/");
    console.log(`ARCHITECTURAL VIOLATION DETECTED`);
    console.log(`File: ${relative} (line ${v.line})`);
    console.log(`Table: ${v.table}`);
    console.log(`Type: ${v.type}`);
    console.log(`Severity: ${v.severity}`);
    console.log(`Fix: ${getFixSuggestion(v.table, v.type)}`);
    console.log(`Content: ${v.content}`);
    console.log("-".repeat(60));
  }

  console.log(`\nTotal violations: ${violations.length}`);
  process.exit(violations.length > 0 ? 1 : 0);
}

main();
