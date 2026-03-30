/**
 * Commerce Engine
 *
 * Owns: product_definitions, orders (online-orders + POS)
 * Business types: retail, bakery, flower_shop, printing, laundry, digital_services
 *
 * Rules:
 * - Products reference product_definitions (not legacy services)
 * - Inventory is decremented on order completion
 * - Delegates to legacy online-orders.ts via facade until full migration
 */

import { Hono } from "hono";
import { db } from "@nasaq/db/client";
import { catalogItems, productDefinitions } from "@nasaq/db/schema/canonical-catalog";
import { eq, and, desc } from "drizzle-orm";
import type { AuthUser } from "../../middleware/auth";

export const commerceEngine = new Hono<{
  Variables: {
    user: AuthUser | null;
    orgId: string;
    requestId: string;
  }
}>();

// GET /engines/commerce/products
commerceEngine.get("/products", async (c) => {
  const orgId = c.get("orgId") as string;
  const { status, categoryId, page = "1" } = c.req.query();
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  const conditions = [
    eq(catalogItems.orgId, orgId),
    eq(catalogItems.itemType, "product"),
  ];
  if (status)     conditions.push(eq(catalogItems.status, status));
  if (categoryId) conditions.push(eq(catalogItems.categoryId, categoryId));

  const rows = await db
    .select({
      item:    catalogItems,
      product: productDefinitions,
    })
    .from(catalogItems)
    .leftJoin(productDefinitions, eq(productDefinitions.catalogItemId, catalogItems.id))
    .where(and(...conditions))
    .orderBy(desc(catalogItems.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// POST /engines/commerce/products
commerceEngine.post("/products", async (c) => {
  const orgId = c.get("orgId") as string;
  const body = await c.req.json();

  const [item] = await db
    .insert(catalogItems)
    .values({
      orgId,
      itemType:    "product",
      name:        body.name,
      nameEn:      body.nameEn,
      description: body.description,
      imageUrl:    body.imageUrl,
      categoryId:  body.categoryId,
      status:      body.status ?? "active",
      isTaxable:   body.isTaxable ?? true,
      taxRate:     String(body.taxRate ?? 15),
      tags:        body.tags ?? [],
    })
    .returning();

  const [product] = await db
    .insert(productDefinitions)
    .values({
      catalogItemId:  item.id,
      orgId,
      basePrice:      String(body.basePrice ?? 0),
      comparePrice:   body.comparePrice ? String(body.comparePrice) : undefined,
      costPrice:      body.costPrice    ? String(body.costPrice)    : undefined,
      sku:            body.sku,
      barcode:        body.barcode,
      trackInventory: body.trackInventory ?? false,
      stockQuantity:  body.stockQuantity  ?? 0,
      reorderLevel:   body.reorderLevel   ?? 0,
      isShippable:    body.isShippable    ?? false,
      weightGrams:    body.weightGrams,
      hasVariants:    body.hasVariants    ?? false,
      variantOptions: body.variantOptions ?? [],
    })
    .returning();

  return c.json({ data: { item, product } }, 201);
});
