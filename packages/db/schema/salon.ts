import {
  pgTable, text, timestamp, boolean,
  uuid, numeric, integer, date, index, uniqueIndex, jsonb,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { bookings } from "./bookings";
import { services } from "./catalog";

// ============================================================
// SALON SUPPLIES — consumable materials tracking
// مستلزمات الصالون: كريمات، صبغات، مواد استهلاكية
// ============================================================

export const salonSupplies = pgTable("salon_supplies", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name:          text("name").notNull(),
  category:      text("category").notNull().default("general"),
  // e.g. "hair_color", "hair_care", "nail", "skin", "tools", "general"

  unit:          text("unit").notNull().default("piece"),
  // e.g. "ml", "g", "piece", "bottle", "tube"

  quantity:      numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  minQuantity:   numeric("min_quantity", { precision: 10, scale: 2 }).notNull().default("0"),

  costPerUnit:   numeric("cost_per_unit", { precision: 10, scale: 2 }),
  supplierId:    uuid("supplier_id"),
  // references suppliers table if present — nullable, no FK to avoid dependency

  notes:         text("notes"),
  isActive:      boolean("is_active").notNull().default(true),

  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("salon_supplies_org_idx").on(t.orgId),
  activeCategoryIdx: index("salon_supplies_active_category_idx").on(t.orgId, t.isActive, t.category),
}));

// ============================================================
// SUPPLY ADJUSTMENTS — track quantity changes with reason
// سجل حركة المخزون: إضافة، استهلاك، تعديل
// ============================================================

export const salonSupplyAdjustments = pgTable("salon_supply_adjustments", {
  id:         uuid("id").defaultRandom().primaryKey(),
  orgId:      uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  supplyId:   uuid("supply_id").notNull().references(() => salonSupplies.id, { onDelete: "cascade" }),

  delta:      numeric("delta", { precision: 10, scale: 2 }).notNull(),
  // positive = restock, negative = consumed

  reason:     text("reason").notNull().default("manual"),
  // "restock" | "consumed" | "manual" | "waste" | "return"

  notes:      text("notes"),
  createdBy:  uuid("created_by"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  supplyIdx: index("salon_supply_adj_supply_idx").on(t.supplyId),
  orgIdx:    index("salon_supply_adj_org_idx").on(t.orgId),
}));

// ============================================================
// CLIENT BEAUTY PROFILE — بطاقة الجمال الذكية per عميل
// تتبع نوع الشعر / البشرة / الحساسيات / الفورمولا الأخيرة
// ============================================================

export const clientBeautyProfiles = pgTable("client_beauty_profiles", {
  id:           uuid("id").defaultRandom().primaryKey(),
  orgId:        uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId:   uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),

  // شعر
  hairType:      text("hair_type"),       // straight | wavy | curly | coily
  hairTexture:   text("hair_texture"),    // fine | medium | thick | coarse
  hairCondition: text("hair_condition"),  // healthy | damaged | color_treated | bleached | dry | oily
  naturalColor:  text("natural_color"),
  currentColor:  text("current_color"),

  // بشرة
  skinType:      text("skin_type"),       // normal | oily | dry | combination | sensitive
  skinConcerns:  text("skin_concerns"),   // comma-separated

  // تنبيهات طبية
  allergies:     text("allergies"),
  sensitivities: text("sensitivities"),
  medicalNotes:  text("medical_notes"),

  // تفضيلات
  preferredStaffId: uuid("preferred_staff_id"),
  preferences:   text("preferences"),
  avoidNotes:    text("avoid_notes"),

  // آخر فورمولا (اختصار سريع للرجوع)
  lastFormula:   text("last_formula"),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniquePerCustomer: uniqueIndex("cbp_org_customer_uidx").on(t.orgId, t.customerId),
  orgCustomerIdx:    index("cbp_org_customer_idx").on(t.orgId, t.customerId),
}));

// ============================================================
// VISIT NOTES — ملاحظات الزيارة per حجز
// فورمولا الصبغة، المنتجات المستخدمة، صور قبل/بعد، موعد قادم
// ============================================================

export const visitNotes = pgTable("visit_notes", {
  id:         uuid("id").defaultRandom().primaryKey(),
  orgId:      uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingId:  uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  staffId:    uuid("staff_id"),
  serviceId:  uuid("service_id"),

  // الفورمولا
  formula:        text("formula"),
  productsUsed:   text("products_used"),    // comma-separated
  processingTime: integer("processing_time"), // دقائق

  // الملاحظات
  technique:     text("technique"),
  resultNotes:   text("result_notes"),
  privateNotes:  text("private_notes"),

  // التوصيات
  recommendedProducts: text("recommended_products"),
  nextVisitIn:   integer("next_visit_in"),   // أسابيع
  nextVisitDate: date("next_visit_date"),

  // صور
  beforePhotoUrl: text("before_photo_url"),
  afterPhotoUrl:  text("after_photo_url"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  bookingIdx:  index("vn_booking_idx").on(t.bookingId),
  customerIdx: index("vn_customer_idx").on(t.orgId, t.customerId),
  staffIdx:    index("vn_staff_idx").on(t.orgId, t.staffId),
}));

// ============================================================
// SERVICE SUPPLY RECIPES — وصفة استهلاك المستلزمات per خدمة
// عند إتمام الحجز → خصم تلقائي من المخزون
// ============================================================

// ============================================================
// SALON MONITORING EVENTS — أحداث المراقبة التشغيلية
// يُخزّن الأحداث المهمة القابلة للاستعلام في ملخص المراقبة
// ============================================================

export const salonMonitoringEvents = pgTable("salon_monitoring_events", {
  id:        uuid("id").defaultRandom().primaryKey(),
  orgId:     uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  // booking_conflict_rejected | booking_failed | inventory_low_stock_warning | inventory_recipe_missing | db_error
  bookingId: uuid("booking_id"),
  metadata:  jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  orgTypeIdx:      index("sme_org_type_idx").on(t.orgId, t.eventType),
  orgCreatedIdx:   index("sme_org_created_idx").on(t.orgId, t.createdAt),
}));

// ============================================================
// SERVICE SUPPLY RECIPES — وصفة استهلاك المستلزمات per خدمة
// عند إتمام الحجز → خصم تلقائي من المخزون
// ============================================================

export const serviceSupplyRecipes = pgTable("service_supply_recipes", {
  id:        uuid("id").defaultRandom().primaryKey(),
  orgId:     uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  supplyId:  uuid("supply_id").notNull().references(() => salonSupplies.id, { onDelete: "cascade" }),
  quantity:  numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  notes:     text("notes"),
}, (t) => ({
  uniquePerPair: uniqueIndex("ssr_service_supply_uidx").on(t.serviceId, t.supplyId),
  serviceIdx:    index("ssr_service_idx").on(t.serviceId),
  supplyIdx:     index("ssr_supply_idx").on(t.supplyId),
}));
