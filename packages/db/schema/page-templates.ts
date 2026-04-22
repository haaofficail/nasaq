import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  uuid,
  integer,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================
// PAGE_TEMPLATES — قوالب صفحات Page Builder v2
//
// جدول مشترك (لا org_id) — القوالب عامة للكل.
// كل record = قالب جاهز يمكن تطبيقه على منشأة.
// ============================================================

export const pageTemplates = pgTable("page_templates", {
  id: uuid("id").defaultRandom().primaryKey(),

  // معرّف فريد قابل للقراءة
  slug: varchar("slug", { length: 100 }).notNull().unique(),

  // البيانات العربية
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  descriptionAr: text("description_ar"),

  // التصنيف
  category: varchar("category", { length: 50 }).notNull(),
  // restaurant | cafe | salon | clinic | education | real-estate | hotel | car-rental | events | general

  // أنواع الأعمال المناسبة
  businessTypes: text("business_types").array().notNull().default([]),

  // Puck page data structure
  // Format: { content: PuckComponent[], root: { props: Record<string, unknown> } }
  data: jsonb("data").notNull(),

  // صورة المعاينة (Unsplash URL)
  previewImageUrl: text("preview_image_url"),

  // وسوم للبحث والفلترة
  tags: text("tags").array().default([]),

  // ترتيب في المعرض
  isFeatured: boolean("is_featured").default(false),
  isPublished: boolean("is_published").default(true),
  usageCount: integer("usage_count").default(0),
  sortOrder: integer("sort_order").default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_templates_category").on(table.category),
  index("idx_templates_published").on(table.isPublished),
  index("idx_templates_sort").on(table.sortOrder, table.createdAt),
]);

// ── TypeScript Inferred Types ──────────────────────────────
export type PageTemplate = typeof pageTemplates.$inferSelect;
export type NewPageTemplate = typeof pageTemplates.$inferInsert;
