import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// ============================================================
// ENUMS
// ============================================================

export const customerTypeEnum = pgEnum("customer_type", [
  "individual",  // فرد
  "business",    // مؤسسة (B2B)
]);

export const customerTierEnum = pgEnum("customer_tier", [
  "regular",     // عادي
  "vip",         // VIP
  "enterprise",  // مؤسسة/عقد سنوي
]);

export const interactionTypeEnum = pgEnum("interaction_type", [
  "call",        // مكالمة
  "whatsapp",    // واتساب
  "sms",         // رسالة نصية
  "email",       // بريد
  "note",        // ملاحظة داخلية
  "meeting",     // اجتماع
]);

// ============================================================
// CUSTOMERS
// ============================================================

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Identity
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  
  // Type & Tier
  type: customerTypeEnum("type").default("individual").notNull(),
  tier: customerTierEnum("tier").default("regular").notNull(),
  
  // Business info (B2B)
  companyName: text("company_name"),
  commercialRegister: text("commercial_register"),
  vatNumber: text("vat_number"),
  
  // Address
  city: text("city"),
  address: text("address"),
  
  // Acquisition
  source: text("source"),                          // google_ads, snapchat, referral, direct, walk_in
  referredBy: uuid("referred_by"),                 // العميل المُحيل
  referralCode: text("referral_code").unique(),     // كود الإحالة الخاص
  
  // Financial summary (denormalized)
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0"),
  totalBookings: integer("total_bookings").default(0),
  avgBookingValue: numeric("avg_booking_value", { precision: 10, scale: 2 }),
  lastBookingAt: timestamp("last_booking_at", { withTimezone: true }),
  
  // Loyalty
  loyaltyPoints: integer("loyalty_points").default(0),
  
  // Wallet
  walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).default("0"),

  // Credit (B2B)
  creditLimit: numeric("credit_limit", { precision: 10, scale: 2 }),
  creditUsed: numeric("credit_used", { precision: 10, scale: 2 }).default("0"),

  // Tags & Segments
  tags: jsonb("tags").default([]),                 // ["VIP", "رمضان 2025", "شركات"]
  
  // Notes
  internalNotes: text("internal_notes"),           // ملاحظات خاصة (لا يراها العميل)

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// CUSTOMER CONTACTS
// جهات اتصال متعددة (للمؤسسات B2B)
// ============================================================

export const customerContacts = pgTable("customer_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  role: text("role"),                              // مدير المشتريات، مسؤول الفعاليات
  isPrimary: boolean("is_primary").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// CUSTOMER INTERACTIONS
// سجل التفاعلات
// ============================================================

export const customerInteractions = pgTable("customer_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),                         // الموظف المسؤول

  type: interactionTypeEnum("type").notNull(),
  subject: text("subject"),                        // عنوان/ملخص
  content: text("content"),                        // المحتوى/الملاحظات
  
  // Metadata
  metadata: jsonb("metadata").default({}),         // بيانات إضافية حسب النوع

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// CUSTOMER SEGMENTS
// شرائح العملاء الديناميكية
// ============================================================

export const customerSegments = pgTable("customer_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                    // "VIP خامل"
  description: text("description"),
  color: text("color"),
  
  // Rules (JSON-based filter definition)
  rules: jsonb("rules").notNull(),
  /*
    { operator: "and", conditions: [
      { field: "totalSpent", op: "gte", value: 10000 },
      { field: "lastBookingAt", op: "before", value: "30_days_ago" },
    ]}
  */
  
  // Cached count
  customerCount: integer("customer_count").default(0),
  lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
