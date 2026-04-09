import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { assets } from "./inventory";

// ============================================================
// ENUMS
// ============================================================

export const serviceStatusEnum = pgEnum("service_status", [
  "draft",       // مسودة — غير منشورة
  "active",      // نشطة — متاحة للحجز
  "paused",      // معلقة — مؤقتاً غير متاحة
  "archived",    // مؤرشفة — لا تظهر
]);

// نوع العنصر المقدَّم — مصدر الحقيقة الوحيد للتمييز بين أنواع الكتالوج
export const offeringTypeEnum = pgEnum("offering_type", [
  "service",          // خدمة تقليدية (مساج، حلاقة، تصوير)
  "product",          // منتج مادي (ورد، معجنات، قهوة)
  "package",          // باقة مجمعة من خدمات/منتجات
  "rental",           // تأجير معدات (خيام، كراسي، صوتيات)
  "room_booking",     // حجز غرفة فندقية
  "vehicle_rental",   // تأجير سيارة
  "subscription",     // اشتراك دوري
  "digital_product",  // منتج رقمي (ملف، كورس)
  "add_on",           // إضافة مستقلة
  "reservation",      // حجز طاولة/مقعد
  "extra_charge",     // رسوم إضافية
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

export const questionTypeEnum = pgEnum("question_type", [
  "text",       // إجابة نصية حرة
  "textarea",   // نص طويل
  "select",     // اختيار واحد من قائمة
  "multi",      // اختيار متعدد
  "checkbox",   // موافقة / تأكيد
  "number",     // رقم (الكمية، العمر...)
  "date",       // تاريخ
  "location",   // موقع / عنوان
  "file",       // ملف
  "image",      // صورة
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

  // Offering type — نوع العنصر المقدَّم
  offeringType: offeringTypeEnum("offering_type").default("service").notNull(),

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

  // Demo flag — تُنشأ أثناء الإعداد الأولي، يمكن حذفها بـ DELETE /settings/demo-data
  isDemo: boolean("is_demo").default(false).notNull(),

  // ── Service Engine fields (migration 019) ─────────────────────────────────
  serviceType:        text("service_type").default("single").notNull(),
    // single | session | package | add_on | bundle
  servicePricingMode: text("service_pricing_mode").default("fixed").notNull(),
    // fixed | from_price | variable
  assignmentMode:     text("assignment_mode").default("open").notNull(),
    // open (any staff) | restricted (specific staff only)
  isBookable:         boolean("is_bookable").default(true).notNull(),
  isVisibleInPOS:     boolean("is_visible_in_pos").default(true).notNull(),
  isVisibleOnline:    boolean("is_visible_online").default(true).notNull(),
  bufferBeforeMinutes: integer("buffer_before_minutes").default(0).notNull(),
  bufferAfterMinutes:  integer("buffer_after_minutes").default(0).notNull(),
  displayName:        text("display_name"),
  // Delivery layer — cross-cutting over all service types
  hasDelivery:        boolean("has_delivery").default(false).notNull(),
  allowsPickup:       boolean("allows_pickup").default(false).notNull(),
  allowsInVenue:      boolean("allows_in_venue").default(false).notNull(),
  deliveryCost:       text("delivery_cost").default("0").notNull(),

  // Amenities — rental, hotel, chalet, apartment, camp (migration 054)
  amenities: jsonb("amenities").default([]).notNull(),
  // e.g. ["wifi", "pool", "ac", "parking", "kitchen", "bbq", "gym"]

  // Barcode (Code128 compatible)
  barcode: text("barcode"),

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

  // Soft delete — never hard-delete media rows
  isActive: boolean("is_active").default(true).notNull(),

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
// SERVICE COMPONENTS
// مكونات الخدمة — ما تحتاجه الخدمة من أصول أو عمالة أو مواد
// ============================================================

export const serviceComponents = pgTable("service_components", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),

  // Source type: 'inventory' = مادة استهلاكية من المخزون | 'manual' = عنصر يدوي | 'asset' = أصل/معدة
  sourceType: text("source_type").notNull().default("manual"), // 'inventory' | 'manual' | 'flower' | 'asset'

  // For inventory type — points to inventory product
  inventoryItemId: uuid("inventory_item_id"),
  flowerInventoryId: uuid("flower_inventory_id"),
  // For asset type — points to assets.id (طاولة، ستاند، فازة، خشب...)
  assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),

  name: text("name").notNull(),
  description: text("description"),

  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("1"),
  unit: text("unit").default("حبة"),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).default("0"),

  isOptional: boolean("is_optional").default(false),
  isUpgradeable: boolean("is_upgradeable").default(false),
  upgradeOptions: jsonb("upgrade_options").default([]),

  showToCustomer: boolean("show_to_customer").default(true),
  customerLabel: text("customer_label"),

  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// SERVICE COSTS
// تكاليف الخدمة التشغيلية (عمالة، مصاريف عامة، عمولة)
// ============================================================

export const serviceCosts = pgTable("service_costs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),

  materialCost: numeric("material_cost", { precision: 10, scale: 2 }).default("0"),
  laborMinutes: integer("labor_minutes").default(0),
  laborCostPerMinute: numeric("labor_cost_per_minute", { precision: 10, scale: 2 }).default("0"),
  overheadPercent: numeric("overhead_percent", { precision: 5, scale: 2 }).default("0"),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// SERVICE REQUIREMENTS — متطلبات الخدمة (موظفون + أصول + نصي)
// ============================================================

export const serviceRequirements = pgTable("service_requirements", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),

  requirementType: text("requirement_type").notNull(), // 'employee' | 'asset' | 'text'

  // For employee type
  userId: uuid("user_id"),                             // references users.id (cross-schema, no FK)
  employeeRole: text("employee_role"),                 // role override for this service

  // For asset type
  assetId: uuid("asset_id"),                           // specific asset instance
  assetTypeId: uuid("asset_type_id"),                  // or by asset type

  // Common
  label: text("label").notNull(),
  quantity: integer("quantity").default(1),
  notes: text("notes"),
  isRequired: boolean("is_required").default(true),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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

// ============================================================
// SERVICE STAFF — ربط الموظفين بالخدمة + تجاوز العمولة
// تحدد من يمكنه تقديم كل خدمة، مع إمكانية تجاوز المدة/السعر/العمولة
// ============================================================

export const serviceStaff = pgTable("service_staff", {
  id:        uuid("id").defaultRandom().primaryKey(),
  orgId:     uuid("org_id").notNull(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  userId:    uuid("user_id").notNull(),

  // Commission override — inherit = use service-level default from service_costs
  commissionMode:  text("commission_mode").default("inherit").notNull(),
    // inherit | none | percentage | fixed
  commissionValue: numeric("commission_value", { precision: 10, scale: 2 }).default("0"),

  // Optional overrides per staff
  customDurationMinutes: integer("custom_duration_minutes"),
  customPrice:           numeric("custom_price", { precision: 10, scale: 2 }),

  isActive:  boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("service_staff_unique_idx").on(table.serviceId, table.userId),
]);

// ============================================================
// SERVICE QUESTIONS — أسئلة مخصصة تُطرح على العميل عند الحجز
// ============================================================

export const serviceQuestions = pgTable("service_questions", {
  id:        uuid("id").defaultRandom().primaryKey(),
  orgId:     uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),

  question:   text("question").notNull(),           // نص السؤال
  type:       questionTypeEnum("type").default("text").notNull(),
  isRequired: boolean("is_required").default(false).notNull(),
  options:    jsonb("options").default([]),           // للنوع select — مصفوفة نصوص

  // مقابل مالي
  isPaid:     boolean("is_paid").default(false).notNull(),
  price:      numeric("price", { precision: 10, scale: 2 }).default("0"),

  sortOrder:  integer("sort_order").default(0).notNull(),
  isActive:   boolean("is_active").default(true).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("service_questions_service_idx").on(table.serviceId),
]);
