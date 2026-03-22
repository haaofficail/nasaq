import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { services } from "./catalog";
import { users } from "./auth";
import { DEFAULT_RATE_LIMIT } from "../constants";

// ============================================================
// MARKETPLACE
// ============================================================

export const marketplaceListings = pgTable("marketplace_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id),

  isActive: boolean("is_active").default(true).notNull(),
  
  // Marketplace-specific pricing (can differ from direct)
  marketplacePrice: numeric("marketplace_price", { precision: 10, scale: 2 }),
  
  // Ranking
  featuredUntil: timestamp("featured_until", { withTimezone: true }),
  sortScore: numeric("sort_score", { precision: 5, scale: 2 }).default("0"),
  
  // Stats
  views: integer("views").default(0),
  inquiries: integer("inquiries").default(0),
  bookings: integer("bookings").default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// RFP — طلبات عروض الأسعار
// ============================================================

export const rfpRequests = pgTable("rfp_requests", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Requester
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  clientEmail: text("client_email"),
  clientCity: text("client_city"),

  // Requirements
  eventType: text("event_type"),                   // حفل زفاف، تجمع عائلي، حفل تخرج
  guestCount: integer("guest_count"),
  eventDate: timestamp("event_date", { withTimezone: true }),
  budget: numeric("budget", { precision: 10, scale: 2 }),
  description: text("description").notNull(),
  
  // Status
  status: text("status").default("open").notNull(), // open, in_review, closed, awarded
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rfpProposals = pgTable("rfp_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  rfpId: uuid("rfp_id").notNull().references(() => rfpRequests.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id),

  // Proposal
  proposalText: text("proposal_text").notNull(),
  proposedPrice: numeric("proposed_price", { precision: 10, scale: 2 }).notNull(),
  estimatedDuration: text("estimated_duration"),
  includedServices: jsonb("included_services").default([]),

  // Status
  status: text("status").default("submitted").notNull(), // submitted, shortlisted, accepted, rejected
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// API KEYS — مفاتيح API للمشتركين
// ============================================================

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                    // "Mobile App Key", "Website Integration"
  key: text("key").notNull().unique(),             // nsq_live_xxxxxxxxxxxx
  keyPrefix: text("key_prefix").notNull(),         // nsq_live_ or nsq_test_
  
  // Permissions
  scopes: jsonb("scopes").default(["read"]),       // ["read", "write", "bookings", "customers"]
  
  // Rate limits
  rateLimit: integer("rate_limit").default(DEFAULT_RATE_LIMIT),    // requests per minute
  
  // Usage
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  totalRequests: integer("total_requests").default(0),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// WEBHOOK SUBSCRIPTIONS — اشتراكات Webhooks
// ============================================================

export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  url: text("url").notNull(),                      // https://example.com/webhook
  secret: text("secret").notNull(),                // HMAC signing secret
  
  events: jsonb("events").default(["*"]),           // ["booking.created", "payment.received"] or ["*"]
  
  isActive: boolean("is_active").default(true).notNull(),
  
  // Stats
  totalDeliveries: integer("total_deliveries").default(0),
  totalFailures: integer("total_failures").default(0),
  lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
  lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").notNull().references(() => webhookSubscriptions.id, { onDelete: "cascade" }),

  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  
  // Response
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  responseTimeMs: integer("response_time_ms"),
  
  status: text("status").default("pending").notNull(), // pending, success, failed, retrying
  attempts: integer("attempts").default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// APP STORE — متجر الإضافات
// ============================================================

export const appStorePlugins = pgTable("app_store_plugins", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  nameEn: text("name_en"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  
  category: text("category"),                      // payment, communication, accounting, analytics, marketing, maps, calendar, automation
  icon: text("icon"),
  
  // Developer
  developerName: text("developer_name"),
  developerUrl: text("developer_url"),
  
  // Pricing
  isFree: boolean("is_free").default(true),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }),
  
  // Config schema (what settings does this plugin need?)
  configSchema: jsonb("config_schema").default([]),
  /*
    [
      { key: "api_key", label: "API Key", type: "text", required: true },
      { key: "webhook_url", label: "Webhook URL", type: "url" },
    ]
  */
  
  isPublished: boolean("is_published").default(false),
  installCount: integer("install_count").default(0),
  avgRating: numeric("avg_rating", { precision: 3, scale: 2 }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Installed plugins per org
export const installedPlugins = pgTable("installed_plugins", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  pluginId: uuid("plugin_id").notNull().references(() => appStorePlugins.id),

  config: jsonb("config").default({}),             // Plugin-specific config values
  isActive: boolean("is_active").default(true).notNull(),
  
  installedAt: timestamp("installed_at", { withTimezone: true }).defaultNow().notNull(),
  installedBy: uuid("installed_by").references(() => users.id),
}, (table) => [
  uniqueIndex("installed_plugins_org_plugin_idx").on(table.orgId, table.pluginId),
]);
