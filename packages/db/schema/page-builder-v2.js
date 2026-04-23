import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, uniqueIndex, index, } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
// ============================================================
// pages_v2 — الجدول الرئيسي للصفحات
// ============================================================
export const pagesV2 = pgTable("pages_v2", {
    id: uuid("id").defaultRandom().primaryKey(),
    // Multi-tenant — إجباري على كل query
    orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    // تعريف الصفحة
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    pageType: text("page_type").notNull().default("custom"),
    // home | about | contact | services | blog | faq | custom
    // حالة النشر
    status: text("status").notNull().default("draft"),
    // draft | published | archived
    // Puck content — نسختان: مسودة + منشورة
    // Format: { content: PuckComponent[], root: { props: Record<string,unknown> } }
    draftData: jsonb("draft_data"),
    publishedData: jsonb("published_data"),
    // SEO (basic)
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    ogImage: text("og_image"),
    // SEO (Day 18: advanced)
    canonicalUrl: text("canonical_url"),
    schemaType: text("schema_type"),
    // Article | Product | Service | Organization
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    // جدولة النشر (Day 19)
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    // نشر
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id, {
        onDelete: "set null",
    }),
    // ترتيب + تنقل
    sortOrder: integer("sort_order").notNull().default(0),
    showInNavigation: boolean("show_in_navigation").notNull().default(true),
    // مراجعة
    createdBy: uuid("created_by").references(() => users.id, {
        onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    // slug فريد داخل كل منشأة
    uniqueIndex("pages_v2_org_slug_idx").on(table.orgId, table.slug),
    // للاستعلام السريع على الحالة
    index("pages_v2_org_status_idx").on(table.orgId, table.status),
]);
// ============================================================
// page_versions_v2 — سجل الإصدارات
// ============================================================
export const pageVersionsV2 = pgTable("page_versions_v2", {
    id: uuid("id").defaultRandom().primaryKey(),
    // Foreign key للصفحة
    pageId: uuid("page_id")
        .notNull()
        .references(() => pagesV2.id, { onDelete: "cascade" }),
    // orgId مكرر هنا للفلترة المباشرة بدون JOIN
    orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    // رقم الإصدار (تصاعدي داخل كل صفحة)
    versionNumber: integer("version_number").notNull(),
    // تسمية اختيارية من المستخدم
    label: text("label"),
    // Puck snapshot كامل
    data: jsonb("data").notNull(),
    // نوع الحفظ
    changeType: text("change_type").notNull().default("auto_save"),
    // auto_save | manual_save | publish | restore
    // من حفظ
    createdBy: uuid("created_by").references(() => users.id, {
        onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => [
    // للاستعلام عن إصدارات صفحة معينة
    index("page_versions_v2_page_idx").on(table.pageId),
    // للفلترة السريعة بالمنشأة
    index("page_versions_v2_org_idx").on(table.orgId),
    // نسخة رقم محددة لصفحة محددة (فريد)
    uniqueIndex("page_versions_v2_page_num_idx").on(table.pageId, table.versionNumber),
]);
//# sourceMappingURL=page-builder-v2.js.map