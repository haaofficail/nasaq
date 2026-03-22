import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";

// ============================================================
// ENUMS
// ============================================================

export const serviceStatusEnum = pgEnum("service_status", [
  "draft",       // مسودة — غير منشورة
  "active",      // نشطة — متاحة للحجز
  "paused",      // معلقة — مؤقتاً غير متاحة
  "archived",    // مؤرشفة — لا تظهر
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "image",
  "video",
]);

export const pricingRuleTypeEnum = pgEnum("pricing_rule_type", [
  "seasonal",    // موسمي: رمضان، أعياد، شتاء
  "day_of_week", // يوم الأسبوع: خميس/جمعة أغلى
  "capacity",    // حسب عدد الضيوف
  "location",    // حسب الموقع
  "customer",    // سعر خاص لعميل/شريحة
  "early_bird",  // حجز مبكر = خصم
]);

export const addonTypeEnum = pgEnum("addon_type", [
  "optional",    // اختياري — العميل يختار
  "required",    // إلزامي — يُضاف تلقائياً
]);

export const pricingModeEnum = pgEnum("pricing_mode", [
  "fixed",       // مبلغ ثابت
  "percentage",  // نسبة من السعر الأساسي
]);

// ============================================================
// CATEGORIES
// شجرة تصنيفات غير محدودة المستويات
// ============================================================

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): any => categories.id, { onDelete: "set null" }),

  name: text("name").notNull(),                    // خيام مغربية
  nameEn: text("name_en"),                         // Moroccan Tents
  slug: text("slug").notNull(),                    // moroccan-tents
  description: text("description"),
  image: text("image"),                            // صورة التصنيف
  icon: text("icon"),                              // أيقونة (اختياري)

  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  
  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("categories_org_slug_idx").on(table.orgId, table.slug),
]);

// ============================================================
// SERVICES
// الخدمات — قلب المنصة
// ============================================================

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),

  // Basic info
  name: text("name").notNull(),                    // خيمة مغربية فاخرة 12×12
  nameEn: text("name_en"),
  slug: text("slug").notNull(),                    // خيمة-مغربية-فاخرة-12x12
  shortDescription: text("short_description"),     // وصف مختصر للكروت
  description: text("description"),                // وصف تفصيلي (Markdown/HTML)
  
  // Status
  status: serviceStatusEnum("status").default("draft").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  scheduledPublishAt: timestamp("scheduled_publish_at", { withTimezone: true }), // نشر مستقبلي

  // Pricing (base)
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(), // السعر الأساسي
  currency: text("currency").default("SAR").notNull(),
  vatInclusive: boolean("vat_inclusive").default(true).notNull(),           // السعر شامل الضريبة؟

  // Capacity
  minCapacity: integer("min_capacity"),             // أقل عدد ضيوف
  maxCapacity: integer("max_capacity"),             // أقصى عدد ضيوف
  capacityLabel: text("capacity_label"),            // "ضيف" أو "شخص" أو "طاولة"

  // Duration
  durationMinutes: integer("duration_minutes"),     // مدة الخدمة بالدقائق
  setupMinutes: integer("setup_minutes"),           // وقت التجهيز
  teardownMinutes: integer("teardown_minutes"),     // وقت التفكيك
  bufferMinutes: integer("buffer_minutes").default(0), // فترة فاصلة بين الحجوزات

  // Booking rules
  minAdvanceHours: integer("min_advance_hours"),    // حد أدنى للحجز المسبق (ساعات)
  maxAdvanceeDays: integer("max_advance_days"),     // حد أقصى للحجز المسبق (أيام)
  
  // Cancellation policy
  cancellationPolicy: jsonb("cancellation_policy").default({
    freeHours: 24,                                 // إلغاء مجاني خلال 24 ساعة
    refundPercentBefore: 50,                        // استرداد 50% قبل الموعد
    refundDaysBefore: 3,                            // إذا ألغى قبل 3 أيام
    noRefundDaysBefore: 1,                          // لا استرداد قبل يوم واحد
  }),

  // Deposit
  depositPercent: numeric("deposit_percent", { precision: 5, scale: 2 }).default("30"), // نسبة العربون
  
  // Location
  allowedLocationIds: jsonb("allowed_location_ids").default([]), // [] = all locations
  
  // Logistics (linked to inventory later)
  requiredAssets: jsonb("required_assets").default([]),  // [{assetTypeId, quantity}]
  requiredStaff: integer("required_staff").default(0),   // عدد الموظفين المطلوبين

  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),

  // Display
  sortOrder: integer("sort_order").default(0).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(), // مميزة (تظهر أولاً)
  
  // Stats (denormalized for performance)
  totalBookings: integer("total_bookings").default(0),
  avgRating: numeric("avg_rating", { precision: 3, scale: 2 }),
  
  // Template
  isTemplate: boolean("is_template").default(false).notNull(), // قالب جاهز
  templateId: uuid("template_id"),                              // أُنشئت من قالب

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("services_org_slug_idx").on(table.orgId, table.slug),
]);

// ============================================================
// SERVICE MEDIA
// صور وفيديوهات الخدمة
// ============================================================

export const serviceMedia = pgTable("service_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),

  type: mediaTypeEnum("type").default("image").notNull(),
  url: text("url").notNull(),                      // رابط الملف (Cloudflare R2)
  thumbnailUrl: text("thumbnail_url"),             // صورة مصغرة
  altText: text("alt_text"),                       // نص بديل (SEO + accessibility)
  
  sortOrder: integer("sort_order").default(0).notNull(),
  isCover: boolean("is_cover").default(false).notNull(), // صورة الغلاف الرئيسية
  
  // Image dimensions (for responsive loading)
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// PRICING RULES
// قواعد التسعير الذكي لكل خدمة
// ============================================================

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }),
  // serviceId = null means org-wide rule (e.g., Ramadan +30% for all services)

  name: text("name").notNull(),                    // "تسعير رمضان"
  type: pricingRuleTypeEnum("type").notNull(),
  
  // Rule config (depends on type)
  config: jsonb("config").notNull(),
  /*
    seasonal:    { startDate: "2026-03-01", endDate: "2026-03-30", label: "رمضان" }
    day_of_week: { days: ["thursday", "friday"] }
    capacity:    { minGuests: 50, maxGuests: 100 }
    location:    { locationIds: ["uuid-1", "uuid-2"] }
    customer:    { segmentId: "uuid" } or { customerId: "uuid" }
    early_bird:  { daysBeforeEvent: 30 }
  */

  // Adjustment
  adjustmentMode: pricingModeEnum("adjustment_mode").default("percentage").notNull(),
  adjustmentValue: numeric("adjustment_value", { precision: 10, scale: 2 }).notNull(), 
  // +30 (percentage) or +500 (fixed SAR)
  // negative for discounts: -10 = 10% discount
  
  // Priority (higher = applied first, or overrides lower)
  priority: integer("priority").default(0).notNull(),
  
  // Active?
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// ADDONS
// إضافات مستقلة قابلة للمشاركة بين خدمات
// ============================================================

export const addons = pgTable("addons", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                    // دفاية غاز
  nameEn: text("name_en"),                         // Gas Heater
  description: text("description"),
  image: text("image"),
  
  // Pricing
  priceMode: pricingModeEnum("price_mode").default("fixed").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // 200 (fixed) or 10 (%)
  
  // Type
  type: addonTypeEnum("type").default("optional").notNull(),
  
  // Inventory link (optional)
  assetTypeId: uuid("asset_type_id"),              // ربط بنوع أصل في المخزون
  maxQuantity: integer("max_quantity"),             // أقصى كمية يختارها العميل
  
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// SERVICE ADDONS
// ربط الإضافات بالخدمات (many-to-many)
// ============================================================

export const serviceAddons = pgTable("service_addons", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  addonId: uuid("addon_id").notNull().references(() => addons.id, { onDelete: "cascade" }),
  
  // Override addon defaults for this specific service
  priceOverride: numeric("price_override", { precision: 10, scale: 2 }), // null = use addon default
  typeOverride: addonTypeEnum("type_override"),                           // null = use addon default
  sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
  uniqueIndex("service_addons_unique_idx").on(table.serviceId, table.addonId),
]);

// ============================================================
// BUNDLES
// حزم مركبة من عدة خدمات
// ============================================================

export const bundles = pgTable("bundles", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                    // باقة VIP
  nameEn: text("name_en"),
  slug: text("slug").notNull(),
  description: text("description"),
  image: text("image"),
  
  // Status
  status: serviceStatusEnum("status").default("draft").notNull(),
  
  // Discount on total
  discountMode: pricingModeEnum("discount_mode").default("percentage").notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).default("0"),
  // 15 = 15% discount on total, or 500 = 500 SAR off

  // Calculated (denormalized)
  totalBasePrice: numeric("total_base_price", { precision: 10, scale: 2 }),
  finalPrice: numeric("final_price", { precision: 10, scale: 2 }),

  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  
  sortOrder: integer("sort_order").default(0).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("bundles_org_slug_idx").on(table.orgId, table.slug),
]);

// ============================================================
// BUNDLE ITEMS
// الخدمات والإضافات داخل الحزمة
// ============================================================

export const bundleItems = pgTable("bundle_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bundleId: uuid("bundle_id").notNull().references(() => bundles.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  
  quantity: integer("quantity").default(1).notNull(),
  
  // Include specific addons?
  includedAddonIds: jsonb("included_addon_ids").default([]),
  
  sortOrder: integer("sort_order").default(0).notNull(),
});

// ============================================================
// SEASONS
// تعريف المواسم على مستوى المشترك
// ============================================================

export const seasons = pgTable("seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                    // رمضان 2026
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  color: text("color"),                            // لون العرض في التقويم
  
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
