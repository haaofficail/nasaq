import {
  pgTable, pgEnum, text, timestamp, boolean,
  uuid, integer, numeric, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";

// ============================================================
// ENUMS — Flower Master Data
// ============================================================

export const flowerTypeEnum = pgEnum("flower_type", [
  // الأنواع الأساسية
  "rose",              // وردة
  "tulip",             // توليب
  "lily",              // زنبق
  "orchid",            // أوركيد
  "carnation",         // قرنفل
  "baby_rose",         // وردة صغيرة
  "hydrangea",         // هيدرنجيا
  "peony",             // فاوانيا
  "sunflower",         // عباد الشمس
  "gypsophila",        // جبسوفيليا
  "chrysanthemum",     // أقحوان
  // أنواع إضافية
  "dahlia",            // دالية
  "freesia",           // فريزيا
  "iris",              // أيريس
  "lisianthus",        // ليزيانثوس
  "anthurium",         // أنثوريوم
  "statice",           // ستاتيس
  "ranunculus",        // رانونكيولوس
  "delphinium",        // ديلفينيوم
  "anemone",           // أنيمون
  "alstroemeria",      // ألسترومريا
  "snapdragon",        // ذبابية
  "narcissus",         // نرجس
  "jasmine",           // ياسمين
  "gardenia",          // قاردينيا
  "protea",            // بروتيا
  "calla_lily",        // كالا ليلي
  "gerbera",           // جيربيرا
  "matthiola",         // مثيولا
  "waxflower",         // شمع الزهور
  "bird_of_paradise",  // طائر الجنة
]);

export const flowerColorEnum = pgEnum("flower_color", [
  "red",        // أحمر
  "pink",       // وردي
  "white",      // أبيض
  "yellow",     // أصفر
  "orange",     // برتقالي
  "purple",     // بنفسجي
  "lavender",   // لافندر
  "peach",      // خوخي
  "coral",      // مرجاني
  "burgundy",   // عنابي
  "cream",      // كريمي
  "bi_color",   // ثنائي اللون
  "mixed",      // مخلوط
  // ألوان إضافية
  "blue",       // أزرق
  "green",      // أخضر
  "champagne",  // شامبانيا
  "black",      // أسود
  "silver",     // فضي
  "other",      // أخرى
]);

export const flowerOriginEnum = pgEnum("flower_origin", [
  // أفريقيا — أكبر مُصدِّري الورد
  "netherlands",   // هولندا          — المزاد الأكبر عالمياً، سلسلة تبريد ممتازة
  "kenya",         // كينيا            — ورد عالي الجودة، شحن جوي مباشر
  "ethiopia",      // إثيوبيا          — جودة متنامية، سعر تنافسي
  "zimbabwe",      // زيمبابوي         — ورد أفريقي ممتاز
  "tanzania",      // تنزانيا          — منشأ صاعد
  "south_africa",  // جنوب أفريقيا    — بروتيا وأزهار أصيلة
  // أمريكا اللاتينية
  "ecuador",       // الإكوادور        — ورد طويل الساق، من الأفضل عالمياً
  "colombia",      // كولومبيا         — قرنفل وورد بجودة عالية
  "brazil",        // البرازيل          — أزهار استوائية
  // أوروبا
  "france",        // فرنسا             — لافندر وورد فاخر
  "spain",         // إسبانيا           — قرنفل وأزهار البحر المتوسط
  "italy",         // إيطاليا           — نباتات زخرفية فاخرة
  // الشرق الأوسط
  "turkey",        // تركيا             — ورد إقليمي جودة متوسطة-ممتازة
  "israel",        // إسرائيل           — جبسوفيليا وورد بجودة عالية
  // آسيا
  "japan",         // اليابان           — جودة فائقة، سعر مرتفع
  "china",         // الصين             — أسعار تنافسية، جودة متفاوتة
  "india",         // الهند             — ورد ومنتجات أقل تكلفة
  "thailand",      // تايلاند           — أوركيد وأزهار استوائية
  "malaysia",      // ماليزيا           — أوركيد وأزهار المناطق الحارة
  "vietnam",       // فيتنام            — صناعة متنامية
  "indonesia",     // إندونيسيا         — أزهار استوائية
  "australia",     // أستراليا          — أزهار أصيلة مميزة
  // محلي — دول الخليج
  "local_saudi",   // محلي — السعودية
  "local_uae",     // محلي — الإمارات
  "local_kuwait",  // محلي — الكويت
  "local_bahrain", // محلي — البحرين
  "local_qatar",   // محلي — قطر
  "local_oman",    // محلي — عُمان
  "other",         // أخرى
]);

export const flowerGradeEnum = pgEnum("flower_grade", [
  "premium_plus", // ممتاز+  (80+ سم، أعلى جودة)
  "premium",      // ممتاز   (60-79 سم)
  "grade_a",      // الدرجة أ (50-59 سم)
  "grade_b",      // الدرجة ب (40-49 سم)
  "grade_c",      // الدرجة ج (أقل من 40 سم أو جودة أدنى)
]);

export const flowerSizeEnum = pgEnum("flower_size", [
  "xs",     // أقل من 40 سم
  "small",  // 40–49 سم
  "medium", // 50–59 سم
  "large",  // 60–69 سم
  "xl",     // 70+ سم
]);

export const bloomStageEnum = pgEnum("bloom_stage", [
  "bud",        // برعم مغلق
  "semi_open",  // نصف مفتوح
  "open",       // مفتوح
  "full_bloom", // مفتوح كلياً
]);

export const flowerQualityStatusEnum = pgEnum("flower_quality_status", [
  "fresh",      // طازج
  "good",       // جيد
  "acceptable", // مقبول
  "expiring",   // قارب الانتهاء
  "expired",    // منتهي الصلاحية
  "damaged",    // تالف
]);

// ============================================================
// FLOWER_VARIANTS — نموذج بيانات الورد الرئيسي
// الهوية الفريدة: (flower_type + color + origin + grade + size + bloom_stage)
// ============================================================

export const flowerVariants = pgTable("flower_variants", {
  id: uuid("id").defaultRandom().primaryKey(),

  // The 6 identity attributes
  flowerType:  flowerTypeEnum("flower_type").notNull(),
  color:       flowerColorEnum("color").notNull(),
  origin:      flowerOriginEnum("origin").notNull(),
  grade:       flowerGradeEnum("grade").notNull(),
  size:        flowerSizeEnum("size").notNull(),
  bloomStage:  bloomStageEnum("bloom_stage").notNull(),

  // Display names (auto-generated or manually set)
  displayNameAr: text("display_name_ar"),
  displayNameEn: text("display_name_en"),

  // Pricing signals — influence org-level price calculations
  basePricePerStem:      numeric("base_price_per_stem",      { precision: 10, scale: 2 }).default("0"),
  // origin affects price (Netherlands premium, local cheaper)
  originPriceMultiplier: numeric("origin_price_multiplier",  { precision: 5, scale: 3 }).default("1.000"),
  // grade affects price (premium+ = 1.5×, grade_c = 0.7×)
  gradePriceMultiplier:  numeric("grade_price_multiplier",   { precision: 5, scale: 3 }).default("1.000"),

  // Shelf life influenced by origin + grade
  shelfLifeDays: integer("shelf_life_days").default(7),

  // Quality notes
  notesAr: text("notes_ar"),
  notesEn: text("notes_en"),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // No two variants can share all 6 identity attributes
  uniqueIndex("flower_variants_identity_idx").on(
    table.flowerType, table.color, table.origin,
    table.grade, table.size, table.bloomStage,
  ),
  index("flower_variants_type_idx").on(table.flowerType),
  index("flower_variants_origin_idx").on(table.origin),
  index("flower_variants_grade_idx").on(table.grade),
]);

// ============================================================
// FLOWER_BATCHES — دُفعات المخزون (FEFO-aware)
// كل دُفعة تنتمي لمنظمة (org) وتحمل variant_id
// ============================================================

export const flowerBatches = pgTable("flower_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId:      uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  variantId:  uuid("variant_id").notNull().references(() => flowerVariants.id),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),

  batchNumber: text("batch_number").notNull(), // رقم الدُفعة

  // Supplier (nullable — references suppliers table by id, no FK to avoid cross-schema)
  supplierId: uuid("supplier_id"),

  // Quantities
  quantityReceived:  integer("quantity_received").notNull().default(0),   // عند الاستلام
  quantityRemaining: integer("quantity_remaining").notNull().default(0),  // المتاح حالياً

  // Cost
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).default("0"), // تكلفة الساق الواحدة

  // Timing
  receivedAt:       timestamp("received_at",        { withTimezone: true }).defaultNow().notNull(),
  // KEY FEFO field — earlier = consumed first
  expiryEstimated:  timestamp("expiry_estimated",   { withTimezone: true }).notNull(),

  // Current state (updated as batch ages)
  currentBloomStage: bloomStageEnum("current_bloom_stage").notNull().default("bud"),
  qualityStatus:     flowerQualityStatusEnum("quality_status").notNull().default("fresh"),

  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("flower_batches_org_idx").on(table.orgId),
  index("flower_batches_variant_idx").on(table.variantId),
  // FEFO index: sort by expiry ASC when consuming
  index("flower_batches_fefo_idx").on(table.orgId, table.variantId, table.expiryEstimated),
  index("flower_batches_quality_idx").on(table.orgId, table.qualityStatus),
]);

// ============================================================
// FLOWER_VARIANT_PRICING — تسعير المتغيرات على مستوى المنظمة
// كل منظمة تضع سعر بيعها الخاص لكل variant
// ============================================================

export const flowerVariantPricing = pgTable("flower_variant_pricing", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId:     uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => flowerVariants.id),

  // Selling price per stem (overrides variant base)
  pricePerStem: numeric("price_per_stem", { precision: 10, scale: 2 }).notNull(),

  // Optional cost basis for margin tracking
  costPerStem:    numeric("cost_per_stem",    { precision: 10, scale: 2 }),
  markupPercent:  numeric("markup_percent",   { precision: 5,  scale: 2 }),

  // Origin + grade multiplier overrides (org can set their own)
  originMultiplierOverride: numeric("origin_multiplier_override", { precision: 5, scale: 3 }),
  gradeMultiplierOverride:  numeric("grade_multiplier_override",  { precision: 5, scale: 3 }),

  // Validity window
  effectiveFrom: timestamp("effective_from", { withTimezone: true }),
  effectiveTo:   timestamp("effective_to",   { withTimezone: true }),

  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // One active price per variant per org at a time
  uniqueIndex("flower_pricing_org_variant_active_idx").on(table.orgId, table.variantId, table.isActive),
  index("flower_pricing_org_idx").on(table.orgId),
]);

// ============================================================
// FLOWER_SUBSTITUTIONS — البدائل
// عند نقص variant معين، يُستخدم البديل التالي حسب الأولوية
// ============================================================

export const flowerSubstitutions = pgTable("flower_substitutions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId:               uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  primaryVariantId:    uuid("primary_variant_id").notNull().references(() => flowerVariants.id),
  substituteVariantId: uuid("substitute_variant_id").notNull().references(() => flowerVariants.id),

  // Grade direction relative to primary
  // 'up' = substitute is better grade (premium substituting grade_a)
  // 'same' = same grade
  // 'down' = substitute is lower grade (only allowed with customer consent)
  gradeDirection: text("grade_direction").default("same").notNull(), // 'up' | 'same' | 'down'

  // How well this substitution works (1 = poor, 10 = perfect)
  compatibilityScore: integer("compatibility_score").default(7).notNull(),

  // Price adjustment when this sub is used (can be positive = more expensive)
  priceAdjustmentPercent: numeric("price_adjustment_percent", { precision: 5, scale: 2 }).default("0"),

  // System can auto-pick this sub without human approval
  isAutoAllowed: boolean("is_auto_allowed").default(false).notNull(),

  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("flower_subs_pair_idx").on(table.orgId, table.primaryVariantId, table.substituteVariantId),
  index("flower_subs_org_idx").on(table.orgId),
  index("flower_subs_primary_idx").on(table.primaryVariantId),
]);

// ============================================================
// FLOWER_RECIPE_COMPONENTS — مكونات الوصفة
// كل وصفة (باقة/تنسيق/خدمة) تحتوي على variants محددة
// ============================================================

export const flowerRecipeComponents = pgTable("flower_recipe_components", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId:     uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => flowerVariants.id),

  // The recipe this component belongs to
  // serviceId — references services(id) — no FK to avoid cross-schema cycle
  serviceId: uuid("service_id"),
  // Alternative: references a flower_package (direct table link)
  packageRef: text("package_ref"), // 'service' | 'arrangement' | 'bundle'

  // How many stems of this variant
  quantity: numeric("quantity", { precision: 8, scale: 1 }).default("1").notNull(),
  unit: text("unit").default("ساق").notNull(),

  isOptional: boolean("is_optional").default(false).notNull(),
  // Ordered list of variant IDs allowed as substitutes for this component
  substitutionVariantIds: text("substitution_variant_ids").array().default([]),

  // Customer-facing display
  showToCustomer: boolean("show_to_customer").default(true).notNull(),
  customerLabelAr: text("customer_label_ar"),

  sortOrder: integer("sort_order").default(0).notNull(),
  isActive:  boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("flower_recipe_org_idx").on(table.orgId),
  index("flower_recipe_service_idx").on(table.serviceId),
  index("flower_recipe_variant_idx").on(table.variantId),
]);
