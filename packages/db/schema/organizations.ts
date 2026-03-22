import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid } from "drizzle-orm/pg-core";
import { DEFAULT_VAT_RATE } from "../constants";

// ============================================================
// ENUMS
// ============================================================

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
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
