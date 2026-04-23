/**
 * Canonical Catalog
 *
 * ARCHITECTURE:
 * - services (legacy) = frozen. No new offeringType values.
 * - catalog_items     = canonical root with item_type discriminator
 * - service_definitions    = Engine: Appointment/Service
 * - product_definitions    = Engine: Commerce
 * - rental_unit_definitions = Engine: Stay/Rental
 *
 * ALLOWED item_type values (canonical, not enum to allow engine extensions):
 *   "service" | "product" | "rental_unit" | "subscription" | "digital"
 */
import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { categories } from "./catalog";
import { services } from "./catalog";
import { locations } from "./organizations";
// ============================================================
// CATALOG ITEMS — Canonical root
// ============================================================
export const catalogItems = pgTable("catalog_items", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    // item_type is the canonical discriminator (replaces offeringType)
    itemType: text("item_type").notNull(),
    // "service" | "product" | "rental_unit" | "subscription" | "digital"
    name: text("name").notNull(),
    nameEn: text("name_en"),
    description: text("description"),
    imageUrl: text("image_url"),
    categoryId: uuid("category_id").references(() => categories.id),
    status: text("status").notNull().default("active"), // active|draft|archived
    isTaxable: boolean("is_taxable").notNull().default(true),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("15"),
    // Legacy link — null for new items
    legacyServiceId: uuid("legacy_service_id").references(() => services.id),
    sortOrder: integer("sort_order").default(0),
    tags: jsonb("tags").default([]),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("catalog_items_org_idx").on(t.orgId),
    index("catalog_items_type_idx").on(t.itemType),
    index("catalog_items_category_idx").on(t.categoryId),
    index("catalog_items_legacy_idx").on(t.legacyServiceId),
]);
// ============================================================
// SERVICE DEFINITIONS
// Engine: Appointment
// ============================================================
export const serviceDefinitions = pgTable("service_definitions", {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogItemId: uuid("catalog_item_id").notNull().unique().references(() => catalogItems.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    // Pricing
    basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull().default("0"),
    priceType: text("price_type").notNull().default("fixed"), // fixed|from|range|on_request
    priceFrom: numeric("price_from", { precision: 12, scale: 2 }),
    priceTo: numeric("price_to", { precision: 12, scale: 2 }),
    // Time
    durationMinutes: integer("duration_minutes"),
    bufferBeforeMins: integer("buffer_before_mins").default(0),
    bufferAfterMins: integer("buffer_after_mins").default(0),
    bookingAdvanceHrs: integer("booking_advance_hrs").default(0),
    // Availability
    requiresAssignment: boolean("requires_assignment").default(false),
    maxConcurrent: integer("max_concurrent").default(1),
    // Limits
    minQuantity: integer("min_quantity").default(1),
    maxQuantity: integer("max_quantity"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("svc_def_org_idx").on(t.orgId),
]);
// ============================================================
// PRODUCT DEFINITIONS
// Engine: Commerce
// ============================================================
export const productDefinitions = pgTable("product_definitions", {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogItemId: uuid("catalog_item_id").notNull().unique().references(() => catalogItems.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    // Pricing
    basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull().default("0"),
    comparePrice: numeric("compare_price", { precision: 12, scale: 2 }), // pre-discount display price
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }), // purchase cost
    // Inventory
    sku: text("sku"),
    barcode: text("barcode"),
    trackInventory: boolean("track_inventory").default(false),
    stockQuantity: integer("stock_quantity").default(0),
    reorderLevel: integer("reorder_level").default(0),
    // Shipping
    isShippable: boolean("is_shippable").default(false),
    weightGrams: integer("weight_grams"),
    requiresAgeVerify: boolean("requires_age_verify").default(false),
    // Variants
    hasVariants: boolean("has_variants").default(false),
    variantOptions: jsonb("variant_options").default([]),
    // [{ name: "size", values: ["S","M","L"] }]
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("prod_def_org_idx").on(t.orgId),
    index("prod_def_sku_idx").on(t.sku),
]);
// ============================================================
// RENTAL UNIT DEFINITIONS
// Engine: Stay / Rental
// ============================================================
export const rentalUnitDefinitions = pgTable("rental_unit_definitions", {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogItemId: uuid("catalog_item_id").notNull().unique().references(() => catalogItems.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    unitType: text("unit_type").notNull(), // room|vehicle|equipment|property|hall
    unitCode: text("unit_code"), // room number, plate number, etc.
    // Pricing (applicable fields depend on unit_type)
    pricePerNight: numeric("price_per_night", { precision: 12, scale: 2 }),
    pricePerHour: numeric("price_per_hour", { precision: 12, scale: 2 }),
    pricePerDay: numeric("price_per_day", { precision: 12, scale: 2 }),
    pricePerWeek: numeric("price_per_week", { precision: 12, scale: 2 }),
    pricePerMonth: numeric("price_per_month", { precision: 12, scale: 2 }),
    minRentalDays: integer("min_rental_days").default(1),
    depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
    // Capacity and Specs
    capacity: integer("capacity"),
    specs: jsonb("specs").default({}),
    // room:    { floor, view, bed_type, amenities: [] }
    // vehicle: { make, model, year, plate, color, fuel_type, transmission }
    // equipment: { brand, model, serial_number }
    // Maintenance
    maintenanceDueAt: timestamp("maintenance_due_at", { withTimezone: true }),
    lastServicedAt: timestamp("last_serviced_at", { withTimezone: true }),
    isAvailable: boolean("is_available").default(true),
    locationId: uuid("location_id").references(() => locations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("rental_def_org_idx").on(t.orgId),
    index("rental_def_type_idx").on(t.unitType),
]);
//# sourceMappingURL=canonical-catalog.js.map