import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

// ============================================================
// SITE PAGES — صفحات موقع المشترك
// ============================================================

export const sitePages = pgTable("site_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  slug: text("slug").notNull(),                    // about, contact, terms
  type: text("type").default("custom").notNull(),  // home, services, about, contact, terms, privacy, custom

  // Content (block-based builder)
  blocks: jsonb("blocks").default([]),
  /*
    [
      { id: "b1", type: "hero", data: { title: "...", subtitle: "...", image: "...", cta: { text: "...", link: "..." } } },
      { id: "b2", type: "services_grid", data: { title: "خدماتنا", categoryIds: [], layout: "grid", limit: 6 } },
      { id: "b3", type: "text", data: { content: "..." } },
      { id: "b4", type: "gallery", data: { images: ["..."], layout: "masonry" } },
      { id: "b5", type: "testimonials", data: { title: "آراء العملاء", count: 4 } },
      { id: "b6", type: "contact_form", data: { fields: ["name", "phone", "message"] } },
      { id: "b7", type: "map", data: { locations: ["all"] } },
      { id: "b8", type: "faq", data: { items: [{ q: "...", a: "..." }] } },
      { id: "b9", type: "cta", data: { title: "...", buttonText: "...", link: "..." } },
      { id: "b10", type: "embed", data: { html: "..." } },
    ]
  */

  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),

  isPublished: boolean("is_published").default(false),
  isActive: boolean("is_active").default(true).notNull(), // soft delete
  sortOrder: integer("sort_order").default(0),
  showInNavigation: boolean("show_in_navigation").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("site_pages_org_slug_idx").on(table.orgId, table.slug),
]);

// ============================================================
// SITE CONFIG — إعدادات الموقع
// ============================================================

export const siteConfig = pgTable("site_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Template
  templateId: text("template_id").default("default"),
  
  // Branding
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color").default("#1A56DB"),
  secondaryColor: text("secondary_color"),
  fontFamily: text("font_family").default("IBM Plex Sans Arabic"),
  
  // Header/Footer
  headerConfig: jsonb("header_config").default({
    showLogo: true, showPhone: true, showBookButton: true,
    navigation: [
      { label: "الرئيسية", link: "/" },
      { label: "خدماتنا", link: "/services" },
      { label: "من نحن", link: "/about" },
      { label: "تواصل معنا", link: "/contact" },
    ],
  }),
  footerConfig: jsonb("footer_config").default({
    showSocial: true, showContact: true, copyright: "",
    social: { instagram: "", twitter: "", snapchat: "", tiktok: "" },
  }),

  // SEO
  defaultMetaTitle: text("default_meta_title"),
  defaultMetaDescription: text("default_meta_description"),
  googleVerification: text("google_verification"),
  sitemapEnabled: boolean("sitemap_enabled").default(true),
  
  // Analytics & Tracking
  googleAnalyticsId: text("google_analytics_id"),
  gtmContainerId: text("gtm_container_id"),
  facebookPixelId: text("facebook_pixel_id"),
  snapchatPixelId: text("snapchat_pixel_id"),
  tiktokPixelId: text("tiktok_pixel_id"),

  // Custom code
  customHeadCode: text("custom_head_code"),        // Inject in <head>
  customBodyCode: text("custom_body_code"),        // Inject before </body>

  // Domain
  customDomain: text("custom_domain"),              // www.almahfal.com
  sslEnabled: boolean("ssl_enabled").default(true),
  
  // White Label
  whitelabelEnabled: boolean("whitelabel_enabled").default(false),
  hidePoweredBy: boolean("hide_powered_by").default(false),

  // Builder (visual site builder settings)
  builderConfig: jsonb("builder_config").default({}),

  // Publish state
  isPublished: boolean("is_published").default(false),

  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// BLOG POSTS — المدونة
// ============================================================

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  slug: text("slug").notNull(),
  excerpt: text("excerpt"),                        // ملخص قصير
  content: text("content").notNull(),              // Markdown or HTML
  coverImage: text("cover_image"),
  
  // Author
  authorId: uuid("author_id").references(() => users.id),
  authorName: text("author_name"),
  
  // Categorization
  tags: jsonb("tags").default([]),                 // ["رمضان", "خيام", "نصائح"]
  category: text("category"),                      // نصائح, أخبار, دليل
  
  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  
  // Linked services (for internal linking)
  relatedServiceIds: jsonb("related_service_ids").default([]),
  
  // Status
  status: text("status").default("draft").notNull(), // draft, published, scheduled, archived
  publishedAt: timestamp("published_at", { withTimezone: true }),
  scheduledPublishAt: timestamp("scheduled_publish_at", { withTimezone: true }),
  
  // Stats
  views: integer("views").default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("blog_posts_org_slug_idx").on(table.orgId, table.slug),
]);

// ============================================================
// CONTACT FORM SUBMISSIONS
// ============================================================

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  message: text("message").notNull(),
  
  source: text("source").default("website"),       // website, landing_page
  pageSlug: text("page_slug"),
  
  isRead: boolean("is_read").default(false),
  repliedAt: timestamp("replied_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// WEBSITE TEMPLATES — قوالب الموقع
// ============================================================

export const websiteTemplates = pgTable("website_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  thumbnail: text("thumbnail"),
  category: text("category").default("all"),
  isPremium: boolean("is_premium").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
