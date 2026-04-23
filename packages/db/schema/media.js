import { pgTable, text, timestamp, boolean, pgEnum, uuid, integer, index, } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { organizations } from "./organizations";
// ============================================================
// ENUM
// Note: mediaTypeEnum ("image"|"video") already exists in catalog.ts
// This enum covers the full DAM asset types
// ============================================================
export const damAssetTypeEnum = pgEnum("dam_asset_type", [
    "image",
    "video",
    "document",
    "logo",
]);
// ============================================================
// MEDIA ASSETS — مكتبة الوسائط الرقمية
// Centralized DAM table — all media scoped by orgId
// ============================================================
export const mediaAssets = pgTable("media_assets", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: text("created_by"), // user ID (nullable in dev)
    // ── File identity ──────────────────────────────────────────
    name: text("name").notNull(), // display name (original filename or user-set)
    fileUrl: text("file_url").notNull(), // CDN public URL
    r2Key: text("r2_key").notNull(), // R2 object key (orgId/category/nanoid.ext)
    fileType: damAssetTypeEnum("file_type").notNull().default("image"),
    mimeType: text("mime_type"), // image/jpeg, video/mp4, application/pdf …
    sizeBytes: integer("size_bytes"), // file size in bytes
    width: integer("width"), // pixels (images/video)
    height: integer("height"), // pixels (images/video)
    // ── Metadata ───────────────────────────────────────────────
    tags: text("tags").array().default([]), // ["logo","hero","dark-bg"]
    category: text("category"), // branding | products | marketing …
    altText: text("alt_text"), // accessibility / SEO
    // ── Optional product linking ───────────────────────────────
    // Plain UUID — no FK to avoid circular import; validated at API layer
    relatedServiceId: uuid("related_service_id"),
    // ── Version control ────────────────────────────────────────
    version: integer("version").default(1).notNull(),
    parentId: uuid("parent_id"), // null = original; non-null = new version of parent
    // ── Soft delete ────────────────────────────────────────────
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("media_assets_org_idx").on(t.orgId),
    index("media_assets_type_idx").on(t.fileType),
    index("media_assets_created_idx").on(t.createdAt),
    index("media_assets_service_idx").on(t.relatedServiceId),
    index("media_assets_parent_idx").on(t.parentId),
]);
// ============================================================
// MEDIA GALLERIES — معرض صور مشترك للاستوديوهات والتصوير
// Photography studios share albums with clients via a token link
// ============================================================
export const mediaGalleries = pgTable("media_galleries", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    // Shareable public token — URL-safe nanoid
    token: text("token").notNull().unique(),
    // Array of media_asset IDs included in this gallery
    assetIds: text("asset_ids").array().notNull().default([]),
    // Client name for labeling (optional)
    clientName: text("client_name"),
    // Optional expiry — null = never expires
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("media_galleries_org_idx").on(t.orgId),
    index("media_galleries_token_idx").on(t.token),
]);
//# sourceMappingURL=media.js.map