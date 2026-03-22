import {
  pgTable, text, timestamp, boolean, pgEnum, uuid, numeric, index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { chartOfAccounts } from "./accounting";

// ============================================================
// ENUMS
// ============================================================

export const reconciliationTypeEnum = pgEnum("reconciliation_type", [
  "bank",   // تسوية بنكية
  "cash",   // تسوية صندوق
  "ar",     // تسوية ذمم عملاء
  "ap",     // تسوية ذمم موردين
]);

export const reconciliationStatusEnum = pgEnum("reconciliation_status", [
  "draft",       // في التحرير
  "in_progress", // قيد التسوية
  "completed",   // مكتملة ومتوازنة
]);

export const reconciliationItemTypeEnum = pgEnum("reconciliation_item_type", [
  "outstanding_check",    // شيك صادر غير محصل
  "deposit_in_transit",   // إيداع في الطريق
  "bank_charge",          // رسوم بنكية
  "bank_interest",        // فوائد بنكية/عائد
  "nsf_check",            // شيك مرتجع
  "error_correction",     // تصحيح خطأ
  "other",                // أخرى
]);

// ============================================================
// RECONCILIATION STATEMENTS — كشوف التسوية
// ============================================================

export const reconciliationStatements = pgTable("reconciliation_statements", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  type: reconciliationTypeEnum("type").notNull(),
  status: reconciliationStatusEnum("status").default("draft").notNull(),

  // الفترة المُسوَّاة
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd:   timestamp("period_end",   { withTimezone: true }).notNull(),

  // حساب الأستاذ المُسوَّى (مثل الصندوق الرئيسي أو البنك)
  glAccountId: uuid("gl_account_id").references(() => chartOfAccounts.id),

  // الأرصدة
  bookBalance:     numeric("book_balance",     { precision: 15, scale: 2 }).notNull(), // رصيد الدفاتر
  externalBalance: numeric("external_balance", { precision: 15, scale: 2 }).notNull(), // رصيد كشف البنك

  // الأرصدة المعدَّلة (تُحسب عند الإكمال)
  adjustedBookBalance:     numeric("adjusted_book_balance",     { precision: 15, scale: 2 }),
  adjustedExternalBalance: numeric("adjusted_external_balance", { precision: 15, scale: 2 }),

  // الفرق بعد التسوية — يجب أن يكون صفراً عند الإكمال
  finalDifference: numeric("final_difference", { precision: 15, scale: 2 }),

  notes: text("notes"),

  completedBy: uuid("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("recon_org_id_idx").on(table.orgId),
  index("recon_status_idx").on(table.orgId, table.status),
  index("recon_period_idx").on(table.orgId, table.periodEnd),
]);

// ============================================================
// RECONCILIATION ITEMS — بنود التسوية
// ============================================================

export const reconciliationItems = pgTable("reconciliation_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  statementId: uuid("statement_id").notNull().references(
    () => reconciliationStatements.id, { onDelete: "cascade" }
  ),

  itemType: reconciliationItemTypeEnum("item_type").notNull(),
  description: text("description").notNull(),

  // موجب = يزيد الرصيد، سالب = ينقص الرصيد
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),

  // "book" = يعدِّل رصيد الدفاتر (رسوم بنك، فوائد، أخطاء دفترية)
  // "external" = يعدِّل الرصيد الخارجي (شيكات معلقة، إيداعات في الطريق)
  adjustsSide: text("adjusts_side").notNull(),

  // رابط لقيد محاسبي إذا ولَّد هذا البند قيداً (مثل رسوم البنك)
  journalEntryId: uuid("journal_entry_id"),

  isCleared: boolean("is_cleared").default(false).notNull(),
  clearedAt: timestamp("cleared_at", { withTimezone: true }),

  // رقم الشيك / مرجع التحويل / رقم المستند
  reference: text("reference"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("recon_items_statement_idx").on(table.statementId),
]);
