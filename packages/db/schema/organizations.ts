import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, index, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { DEFAULT_VAT_RATE } from "../constants";

// ============================================================
// ENUMS
// ============================================================

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",       // مجاني — جميع الميزات + 15 حجز مدى الحياة
  "basic",      // 199 SAR — كتالوج + حجوزات + CRM أساسي
  "advanced",   // 499 SAR — + مالية + مخزون + فريق + أتمتة
  "pro",        // 999 SAR — + تسويق + موقع + تحليلات + تطبيق
  "enterprise", // حسب الطلب — + API + White Label + دعم مخصص
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "suspended",
]);

// ============================================================
// ORGANIZATIONS (TENANTS)
// كل مشترك في نسق = organization
// ============================================================

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Basic info
  orgCode: text("org_code").unique(),               // كود المرجع البشري — NSQ-0001
  name: text("name").notNull(),                    // اسم الشركة
  nameEn: text("name_en"),                         // English name (optional)
  slug: text("slug").notNull().unique(),            // URL slug: nasaq.sa/company-slug
  logo: text("logo"),                              // Logo URL
  phone: text("phone"),                            // رقم الجوال الرئيسي
  email: text("email"),                            // البريد الرئيسي
  website: text("website"),                        // الموقع الخارجي
  
  // Branding
  primaryColor: text("primary_color").default("#1A56DB"),
  secondaryColor: text("secondary_color").default("#C8A951"),
  
  // Business info
  commercialRegister: text("commercial_register"),  // السجل التجاري
  vatNumber: text("vat_number"),                    // الرقم الضريبي
  city: text("city"),
  address: text("address"),
  
  // Subscription
  plan: subscriptionPlanEnum("plan").default("basic").notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("trialing").notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  bookingUsed: integer("booking_used").default(0).notNull(), // عداد حجوزات الخطة المجانية
  
  // Settings (flexible JSON for org-level config)
  settings: jsonb("settings").default({
    timezone: "Asia/Riyadh",
    currency: "SAR",
    language: "ar",
    dateFormat: "YYYY-MM-DD",
    weekStartsOn: "sunday",
    vatRate: DEFAULT_VAT_RATE,
    vatInclusive: true,
    financial: {
      enable_full_accounting: false,
      enable_manual_journal_entries: false,
      enable_bank_reconciliation: false,
      enable_cashier_shift_closing: true,
      enable_tax_management: true,
      enable_advanced_ar_ap: false,
      enable_branch_level_treasury: false,
      auto_post_bookings: false,
      auto_post_expenses: false,
      fiscal_year_start: "01-01",
      tax: {
        vatRate: DEFAULT_VAT_RATE,
        vatInclusive: true,
        vatRegistered: false,
        vatNumber: null,
      },
    },
  }),

  // Business type — source of truth for vertical specialization
  // Values: restaurant, cafe, catering, bakery, salon, barber, spa, fitness,
  //         events, photography, retail, store, flower_shop, rental,
  //         services, medical, education, technology, construction, logistics, other, general
  businessType: text("business_type").default("general"),

  // Operating profile — specific operating model within the business type (Constitution Q2)
  // flowers: florist_retail | florist_kosha | florist_contract_supply | florist_hybrid
  // salon:   salon_in_branch | salon_home_service | salon_spa | salon_hybrid
  // restaurant: restaurant_dine_in | restaurant_takeaway | restaurant_delivery | restaurant_cloud_kitchen | restaurant_catering
  // hotel:   hotel_standard | hotel_apartments | hotel_resort
  // car_rental: car_rental_daily | car_rental_long_term | car_rental_chauffeur
  // rental:  rental_equipment | rental_furniture | rental_venues
  // events:  events_full | events_decor | events_catering_only
  // others:  general
  operatingProfile: text("operating_profile").default("general"),

  // Service delivery modes — how services reach customers (array)
  // on_site | delivery | pickup | at_customer_location | reservation_based | recurring_service | walk_in
  serviceDeliveryModes: jsonb("service_delivery_modes").default([]),

  // Enabled capabilities — controls which modules appear in UI and API (Constitution Q4 + Q20)
  // inventory | assets | bookings | accounting | delivery | contracts | attendance
  // schedules | floral | kosha | pos | website | marketing
  enabledCapabilities: jsonb("enabled_capabilities").default(["bookings", "customers", "catalog", "media"]),

  // Dashboard profile — derived from businessType + operatingProfile, can be overridden
  dashboardProfile: text("dashboard_profile").default("default"),

  // Domain
  customDomain: text("custom_domain"),              // www.almahfal.com
  subdomain: text("subdomain").unique(),            // almahfal.nasaq.sa

  // Social media
  instagram: text("instagram"),
  twitter: text("twitter"),
  tiktok: text("tiktok"),
  snapchat: text("snapchat"),
  googleMapsEmbed: text("google_maps_embed"),

  // Branding extended
  coverImage: text("cover_image"),
  tagline: text("tagline"),
  description: text("description"),

  // Onboarding state
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: text("onboarding_step").default("0"),
  hasDemoData: boolean("has_demo_data").default(false),
  demoClearedAt: timestamp("demo_cleared_at", { withTimezone: true }),

  // Admin management
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspendReason: text("suspend_reason"),
  adminNotes: text("admin_notes"),
  accountManagerId: uuid("account_manager_id"),  // FK to users.id (nasaq staff)
  favicon:       text("favicon"),               // Favicon URL (main)
  faviconFiles:  jsonb("favicon_files"),         // { ico, 16, 32, 180, 192, 512 }

  // Metadata
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// BRANCHES (locations)
// فروع المنشأة — كل موقع عمل معتمد
// ============================================================

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // معلومات الفرع
  name: text("name").notNull(),                    // اسم الفرع
  branchCode: text("branch_code"),                 // FR-01, BRN-002
  type: text("type").default("branch"),            // branch | warehouse | office
  color: text("color").default("#6366f1"),         // لون الفرع للتمييز البصري
  isMainBranch: boolean("is_main_branch").default(false).notNull(),

  // الموقع الجغرافي
  address: text("address"),
  city: text("city"),
  latitude: text("latitude"),
  longitude: text("longitude"),

  // إدارة الفرع
  managerName: text("manager_name"),               // مدير الفرع
  managerPhone: text("manager_phone"),             // جوال المدير
  capacity: text("capacity"),                      // السعة القصوى
  openingHours: jsonb("opening_hours"),            // { sat:{open:"09:00",close:"22:00",active:true}, ... }
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// ORGANIZATION CAPABILITY OVERRIDES
// Per-org forced-on / forced-off on top of businessType defaults
// ============================================================

export const organizationCapabilityOverrides = pgTable("organization_capability_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  capabilityKey: text("capability_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),  // true = force-on, false = force-off
  reason: text("reason"),
  setBy: uuid("set_by"),  // references users.id — FK enforced at DB level in migration
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_cap_overrides_unique_idx").on(table.orgId, table.capabilityKey),
  index("org_cap_overrides_org_idx").on(table.orgId),
]);

// ============================================================
// BUSINESS VOCABULARY
// Org/type-level label overrides (booking = موعد vs حجز vs مشروع)
// ============================================================

export const businessVocabulary = pgTable("business_vocabulary", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),  // NULL = global default for businessType
  businessType: text("business_type"),
  termKey: text("term_key").notNull(),              // "booking" | "service" | "customer" | "staff"
  valueAr: text("value_ar").notNull(),
  valueEn: text("value_en"),
  context: text("context"),                          // "plural" | "short" | null
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("business_vocab_org_idx").on(table.orgId),
  index("business_vocab_type_idx").on(table.businessType, table.termKey),
]);
