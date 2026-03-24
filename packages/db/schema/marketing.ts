import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { bookings } from "./bookings";
import { users } from "./auth";
import { services } from "./catalog";

// ============================================================
// ENUMS
// ============================================================

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft", "scheduled", "active", "paused", "completed", "cancelled",
]);

export const campaignChannelEnum = pgEnum("campaign_channel", [
  "whatsapp", "sms", "email", "push", "multi",
]);

export const loyaltyTierEnum = pgEnum("loyalty_tier", [
  "bronze", "silver", "gold", "vip",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending", "approved", "rejected", "flagged",
]);

// ============================================================
// CAMPAIGNS — الحملات التسويقية
// ============================================================

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),
  channel: campaignChannelEnum("channel").default("whatsapp").notNull(),
  status: campaignStatusEnum("status").default("draft").notNull(),

  // Audience
  segmentId: uuid("segment_id"),                   // شريحة مستهدفة
  audienceCount: integer("audience_count").default(0),
  
  // Content
  subject: text("subject"),
  body: text("body").notNull(),
  templateId: uuid("template_id"),
  
  // Schedule
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  
  // Coupon (optional)
  couponId: uuid("coupon_id"),
  
  // UTM
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),

  // Results
  totalSent: integer("total_sent").default(0),
  totalDelivered: integer("total_delivered").default(0),
  totalOpened: integer("total_opened").default(0),
  totalClicked: integer("total_clicked").default(0),
  totalConverted: integer("total_converted").default(0),
  revenueGenerated: numeric("revenue_generated", { precision: 12, scale: 2 }).default("0"),
  cost: numeric("cost", { precision: 10, scale: 2 }).default("0"),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// COUPONS — الكوبونات
// ============================================================

export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),

  // Type
  discountType: text("discount_type").default("percentage").notNull(), // percentage, fixed
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxDiscountAmount: numeric("max_discount_amount", { precision: 10, scale: 2 }), // سقف الخصم للنسبة
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),        // حد أدنى للطلب

  // Scope
  serviceIds: jsonb("service_ids").default([]),     // [] = all services
  customerIds: jsonb("customer_ids").default([]),   // [] = all customers

  // Limits
  maxUses: integer("max_uses"),                    // null = unlimited
  maxUsesPerCustomer: integer("max_uses_per_customer").default(1),
  timesUsed: integer("times_used").default(0),

  // Validity
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("coupons_org_code_idx").on(table.orgId, table.code),
]);

// ============================================================
// LOYALTY PROGRAM — برنامج الولاء
// ============================================================

export const loyaltyConfig = pgTable("loyalty_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  isActive: boolean("is_active").default(false).notNull(),
  pointsPerSar: numeric("points_per_sar", { precision: 5, scale: 2 }).default("1"), // نقطة لكل ريال
  pointValue: numeric("point_value", { precision: 5, scale: 2 }).default("0.1"),     // قيمة النقطة بالريال عند الاستبدال
  
  // Tier thresholds (points)
  silverThreshold: integer("silver_threshold").default(500),
  goldThreshold: integer("gold_threshold").default(2000),
  vipThreshold: integer("vip_threshold").default(5000),

  // Tier benefits
  silverDiscount: numeric("silver_discount", { precision: 5, scale: 2 }).default("5"),  // 5%
  goldDiscount: numeric("gold_discount", { precision: 5, scale: 2 }).default("10"),
  vipDiscount: numeric("vip_discount", { precision: 5, scale: 2 }).default("15"),

  // Referral
  referralRewardPoints: integer("referral_reward_points").default(100),
  referralDiscountPercent: numeric("referral_discount_percent", { precision: 5, scale: 2 }).default("5"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id),

  type: text("type").notNull(),                    // earned, redeemed, bonus, referral, expired
  points: integer("points").notNull(),             // positive = earned, negative = spent
  description: text("description"),
  bookingId: uuid("booking_id"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// ABANDONED CARTS — السلات المتروكة
// ============================================================

export const abandonedCarts = pgTable("abandoned_carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Visitor
  sessionId: text("session_id"),
  customerId: uuid("customer_id"),
  phone: text("phone"),
  email: text("email"),

  // Cart content
  items: jsonb("items").notNull(),                 // [{ serviceId, quantity, addons }]
  eventDate: timestamp("event_date", { withTimezone: true }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),

  // Recovery
  recoveryStatus: text("recovery_status").default("abandoned"), // abandoned, reminder_sent, recovered, expired
  remindersSent: integer("reminders_sent").default(0),
  lastReminderAt: timestamp("last_reminder_at", { withTimezone: true }),
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
  recoveredBookingId: uuid("recovered_booking_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// REVIEWS — التقييمات
// ============================================================

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  serviceId: uuid("service_id").references(() => services.id),

  rating: integer("rating").notNull(),             // 1-5
  title: text("title"),
  comment: text("comment"),
  
  // Response
  responseText: text("response_text"),
  respondedBy: uuid("responded_by").references(() => users.id),
  respondedAt: timestamp("responded_at", { withTimezone: true }),

  status: reviewStatusEnum("status").default("pending").notNull(),
  isPublished: boolean("is_published").default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// LANDING PAGES — صفحات الهبوط
// ============================================================

export const landingPages = pgTable("landing_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  slug: text("slug").notNull(),
  
  // Content (JSON-based page builder)
  content: jsonb("content").default([]),
  /*
    [
      { type: "hero", data: { title: "...", subtitle: "...", image: "..." } },
      { type: "services", data: { serviceIds: ["..."], layout: "grid" } },
      { type: "testimonials", data: { reviewIds: ["..."] } },
      { type: "cta", data: { text: "احجز الآن", link: "/book/..." } },
    ]
  */

  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  
  // Tracking
  facebookPixelId: text("facebook_pixel_id"),
  googleAnalyticsId: text("google_analytics_id"),
  snapchatPixelId: text("snapchat_pixel_id"),
  
  // Stats
  views: integer("views").default(0),
  conversions: integer("conversions").default(0),

  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("landing_pages_org_slug_idx").on(table.orgId, table.slug),
]);
