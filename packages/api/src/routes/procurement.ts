import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, ilike, inArray, sql, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  supplierInvoices,
  salonSupplies,
  flowerBatches,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { apiErr } from "../lib/errors";

// ============================================================
// SCHEMAS
// ============================================================

const createSupplierSchema = z.object({
  name: z.string().min(1).max(300),
  nameEn: z.string().optional().nullable(),
  code: z.string().max(50).optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().length(2).optional().default("SA"),
  taxNumber: z.string().max(50).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
  bankIban: z.string().max(34).optional().nullable(),
  currency: z.string().length(3).optional().default("SAR"),
  paymentTermsDays: z.number().int().min(0).max(365).optional().default(30),
  categories: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

const updateSupplierSchema = createSupplierSchema.partial().extend({
  status: z.enum(["active", "inactive", "blacklisted"]).optional(),
});

const createPOItemSchema = z.object({
  itemName: z.string().min(1).max(300),
  itemCode: z.string().max(100).optional().nullable(),
  itemDescription: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  unit: z.string().max(50).optional().default("unit"),
  orderedQuantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().min(0).max(100).optional().default(0),
  assetTypeId: z.string().uuid().optional().nullable(),
  flowerVariantId: z.string().uuid().optional().nullable(),
  supplyItemId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineOrder: z.number().int().optional().default(0),
});

const createPOSchema = z.object({
  supplierId: z.string().uuid(),
  locationId: z.string().uuid().optional().nullable(),
  referenceNumber: z.string().max(100).optional().nullable(),
  orderDate: z.string().datetime().optional(),
  expectedDelivery: z.string().datetime().optional().nullable(),
  deliveryAddress: z.string().max(500).optional().nullable(),
  deliveryNotes: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
  currency: z.string().length(3).optional().default("SAR"),
  items: z.array(createPOItemSchema).min(1),
});

const createGRItemSchema = z.object({
  poItemId: z.string().uuid(),
  receivedQuantity: z.number().positive(),
  acceptedQuantity: z.number().nonnegative(),
  rejectedQuantity: z.number().nonnegative().optional().default(0),
  rejectionReason: z.string().max(500).optional().nullable(),
  qualityNotes: z.string().max(1000).optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  lineOrder: z.number().int().optional().default(0),
});

const createGRSchema = z.object({
  poId: z.string().uuid(),
  locationId: z.string().uuid().optional().nullable(),
  receivedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(createGRItemSchema).min(1),
});

const createInvoiceSchema = z.object({
  supplierId: z.string().uuid(),
  poId: z.string().uuid().optional().nullable(),
  grId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().min(1).max(100),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  subtotal: z.number().positive(),
  vatAmount: z.number().nonnegative().optional().default(0),
  totalAmount: z.number().positive(),
  currency: z.string().length(3).optional().default("SAR"),
  notes: z.string().max(2000).optional().nullable(),
});

// ============================================================
// ROUTER
// ============================================================

export const procurementRouter = new Hono();

// ============================================================
// SUPPLIERS — الموردون
// ============================================================

// GET /procurement/suppliers
procurementRouter.get("/suppliers", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const q = c.req.query("q");
  const status = c.req.query("status");

  const where = and(
    eq(suppliers.orgId, orgId),
    status ? eq(suppliers.status, status as any) : undefined,
    q ? ilike(suppliers.name, `%${q}%`) : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(suppliers)
      .where(where)
      .orderBy(asc(suppliers.name))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(suppliers).where(where),
  ]);

  return c.json({ suppliers: rows, total: Number(total), limit, offset });
});

// GET /procurement/suppliers/:id
procurementRouter.get("/suppliers/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db.select().from(suppliers)
    .where(and(eq(suppliers.id, c.req.param("id")), eq(suppliers.orgId, orgId)));
  if (!row) return apiErr(c, "SUPPLIER_NOT_FOUND", 404);
  return c.json({ supplier: row });
});

// POST /procurement/suppliers
procurementRouter.post("/suppliers", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();
  const parsed = createSupplierSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const data = parsed.data;

  const [row] = await db.insert(suppliers).values({
    orgId,
    name: data.name,
    nameEn: data.nameEn,
    code: data.code,
    contactName: data.contactName,
    phone: data.phone,
    email: data.email,
    website: data.website,
    address: data.address,
    city: data.city,
    country: data.country,
    taxNumber: data.taxNumber,
    bankName: data.bankName,
    bankIban: data.bankIban,
    currency: data.currency,
    paymentTermsDays: data.paymentTermsDays,
    categories: data.categories ?? [],
    notes: data.notes,
    createdBy: userId,
  }).returning();

  insertAuditLog({ orgId, userId, action: "created", resource: "supplier", resourceId: row.id, metadata: { name: row.name } });
  return c.json({ supplier: row }, 201);
});

// PATCH /procurement/suppliers/:id
procurementRouter.patch("/suppliers/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const parsed = updateSupplierSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [existing] = await db.select({ id: suppliers.id }).from(suppliers)
    .where(and(eq(suppliers.id, c.req.param("id")), eq(suppliers.orgId, orgId)));
  if (!existing) return apiErr(c, "SUPPLIER_NOT_FOUND", 404);

  const [row] = await db.update(suppliers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(suppliers.id, c.req.param("id")), eq(suppliers.orgId, orgId)))
    .returning();

  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "supplier", resourceId: row.id });
  return c.json({ supplier: row });
});

// DELETE /procurement/suppliers/:id (soft-delete)
procurementRouter.delete("/suppliers/:id", async (c) => {
  const orgId = getOrgId(c);
  const [existing] = await db.select({ id: suppliers.id }).from(suppliers)
    .where(and(eq(suppliers.id, c.req.param("id")), eq(suppliers.orgId, orgId)));
  if (!existing) return apiErr(c, "SUPPLIER_NOT_FOUND", 404);

  await db.update(suppliers)
    .set({ isActive: false, status: "inactive", updatedAt: new Date() })
    .where(and(eq(suppliers.id, c.req.param("id")), eq(suppliers.orgId, orgId)));

  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "supplier", resourceId: existing.id });
  return c.json({ ok: true });
});

// ============================================================
// PURCHASE ORDERS — أوامر الشراء
// ============================================================

// Generate sequential PO number: PO-YYYY-NNNNN
async function generatePoNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.orgId, orgId),
      sql`po_number LIKE ${prefix + "%"}`,
    ));
  const seq = String(Number(cnt) + 1).padStart(5, "0");
  return `${prefix}${seq}`;
}

// GET /procurement/orders
procurementRouter.get("/orders", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const supplierId = c.req.query("supplier_id");

  const where = and(
    eq(purchaseOrders.orgId, orgId),
    status ? eq(purchaseOrders.status, status as any) : undefined,
    supplierId ? eq(purchaseOrders.supplierId, supplierId) : undefined,
  );

  const [rows, [{ total }], supplierRows] = await Promise.all([
    db.select().from(purchaseOrders)
      .where(where)
      .orderBy(desc(purchaseOrders.orderDate))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(purchaseOrders).where(where),
    db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers)
      .where(eq(suppliers.orgId, orgId)),
  ]);

  const supplierMap = new Map(supplierRows.map(s => [s.id, s.name]));
  const enriched = rows.map(r => ({ ...r, supplierName: supplierMap.get(r.supplierId) ?? null }));

  return c.json({ orders: enriched, total: Number(total), limit, offset });
});

// GET /procurement/orders/:id
procurementRouter.get("/orders/:id", async (c) => {
  const orgId = getOrgId(c);
  const poId = c.req.param("id");

  const [[po], items] = await Promise.all([
    db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.orgId, orgId))),
    db.select().from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.poId, poId))
      .orderBy(asc(purchaseOrderItems.lineOrder)),
  ]);

  if (!po) return apiErr(c, "PO_NOT_FOUND", 404);

  const [supplierRow] = await db.select({ name: suppliers.name, code: suppliers.code })
    .from(suppliers).where(eq(suppliers.id, po.supplierId));

  return c.json({ order: po, items, supplier: supplierRow ?? null });
});

// POST /procurement/orders
procurementRouter.post("/orders", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();
  const parsed = createPOSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const data = parsed.data;

  // Verify supplier belongs to org
  const [sup] = await db.select({ id: suppliers.id }).from(suppliers)
    .where(and(eq(suppliers.id, data.supplierId), eq(suppliers.orgId, orgId)));
  if (!sup) return apiErr(c, "SUPPLIER_NOT_FOUND", 404);

  // Compute totals from items
  let subtotal = 0;
  const computedItems = data.items.map((item) => {
    const disc = (item.discount ?? 0) / 100;
    const lineTotal = item.orderedQuantity * item.unitPrice * (1 - disc);
    subtotal += lineTotal;
    return { ...item, totalPrice: String(lineTotal.toFixed(2)) };
  });

  const DEFAULT_VAT = 0.15;
  const vatAmount = subtotal * DEFAULT_VAT;
  const totalAmount = subtotal + vatAmount;
  const poNumber = await generatePoNumber(orgId);

  const result = await db.transaction(async (tx) => {
    const [po] = await tx.insert(purchaseOrders).values({
      orgId,
      supplierId: data.supplierId,
      locationId: data.locationId,
      poNumber,
      referenceNumber: data.referenceNumber,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
      subtotal: String(subtotal.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      totalAmount: String(totalAmount.toFixed(2)),
      currency: data.currency,
      deliveryAddress: data.deliveryAddress,
      deliveryNotes: data.deliveryNotes,
      notes: data.notes,
      internalNotes: data.internalNotes,
      createdBy: userId!,
      status: "draft",
    }).returning();

    await tx.insert(purchaseOrderItems).values(
      computedItems.map((item) => ({
        poId: po.id,
        orgId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        itemDescription: item.itemDescription,
        category: item.category,
        unit: item.unit,
        orderedQuantity: String(item.orderedQuantity),
        unitPrice: String(item.unitPrice),
        discount: String(item.discount ?? 0),
        totalPrice: item.totalPrice,
        assetTypeId: item.assetTypeId,
        flowerVariantId: item.flowerVariantId,
        supplyItemId: item.supplyItemId,
        notes: item.notes,
        lineOrder: item.lineOrder,
      })),
    );

    return po;
  });

  insertAuditLog({ orgId, userId, action: "created", resource: "purchase_order", resourceId: result.id, metadata: { poNumber, supplierId: data.supplierId, totalAmount } });
  return c.json({ order: result }, 201);
});

// PATCH /procurement/orders/:id — update status or notes
procurementRouter.patch("/orders/:id", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const poId = c.req.param("id");
  const body = await c.req.json();

  const updateSchema = z.object({
    status: z.enum(["draft", "submitted", "acknowledged", "cancelled", "closed"]).optional(),
    notes: z.string().max(2000).optional().nullable(),
    internalNotes: z.string().max(2000).optional().nullable(),
    expectedDelivery: z.string().datetime().optional().nullable(),
    referenceNumber: z.string().max(100).optional().nullable(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [existing] = await db.select({ id: purchaseOrders.id, status: purchaseOrders.status })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.orgId, orgId)));
  if (!existing) return apiErr(c, "PO_NOT_FOUND", 404);

  // Only drafts can be cancelled; received/closed POs are immutable
  if (["received", "closed"].includes(existing.status) && parsed.data.status) {
    return apiErr(c, "PO_IMMUTABLE", 400);
  }

  const updateData: Record<string, any> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.status === "submitted") {
    updateData.approvedBy = userId;
    updateData.approvedAt = new Date();
  }
  if (parsed.data.expectedDelivery) {
    updateData.expectedDelivery = new Date(parsed.data.expectedDelivery);
  }

  const [row] = await db.update(purchaseOrders)
    .set(updateData)
    .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.orgId, orgId)))
    .returning();

  insertAuditLog({ orgId, userId, action: "updated", resource: "purchase_order", resourceId: poId, metadata: parsed.data });
  return c.json({ order: row });
});

// ============================================================
// GOODS RECEIPTS — إيصالات الاستلام
// ============================================================

async function generateGrNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GR-${year}-`;
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(goodsReceipts)
    .where(and(
      eq(goodsReceipts.orgId, orgId),
      sql`gr_number LIKE ${prefix + "%"}`,
    ));
  const seq = String(Number(cnt) + 1).padStart(5, "0");
  return `${prefix}${seq}`;
}

// GET /procurement/orders/:id/receipts
procurementRouter.get("/orders/:id/receipts", async (c) => {
  const orgId = getOrgId(c);
  const poId = c.req.param("id");

  const [po] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.orgId, orgId)));
  if (!po) return apiErr(c, "PO_NOT_FOUND", 404);

  const receipts = await db.select().from(goodsReceipts)
    .where(and(eq(goodsReceipts.poId, poId), eq(goodsReceipts.orgId, orgId)))
    .orderBy(desc(goodsReceipts.receivedAt));

  return c.json({ receipts });
});

// POST /procurement/receipts — create goods receipt
procurementRouter.post("/receipts", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();
  const parsed = createGRSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const data = parsed.data;

  // Verify PO belongs to org and is in a receivable state
  const [po] = await db.select().from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, data.poId), eq(purchaseOrders.orgId, orgId)));
  if (!po) return apiErr(c, "PO_NOT_FOUND", 404);
  if (!["submitted", "acknowledged", "partially_received"].includes(po.status)) {
    return apiErr(c, "PO_NOT_RECEIVABLE", 400);
  }

  // Verify all po_item_ids belong to this PO
  const poItemIds = data.items.map(i => i.poItemId);
  const poItems = await db.select().from(purchaseOrderItems)
    .where(and(eq(purchaseOrderItems.poId, data.poId), inArray(purchaseOrderItems.id, poItemIds)));
  if (poItems.length !== poItemIds.length) return apiErr(c, "PO_ITEM_NOT_FOUND", 404);

  const poItemMap = new Map(poItems.map(p => [p.id, p]));
  const grNumber = await generateGrNumber(orgId);

  const result = await db.transaction(async (tx) => {
    const [gr] = await tx.insert(goodsReceipts).values({
      orgId,
      poId: data.poId,
      supplierId: po.supplierId,
      locationId: data.locationId,
      grNumber,
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
      receivedBy: userId!,
      notes: data.notes,
      status: "pending",
    }).returning();

    await tx.insert(goodsReceiptItems).values(
      data.items.map((item) => ({
        grId: gr.id,
        poItemId: item.poItemId,
        orgId,
        receivedQuantity: String(item.receivedQuantity),
        acceptedQuantity: String(item.acceptedQuantity),
        rejectedQuantity: String(item.rejectedQuantity ?? 0),
        rejectionReason: item.rejectionReason,
        qualityNotes: item.qualityNotes,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        lineOrder: item.lineOrder,
      })),
    );

    // Update received_quantity on each PO item
    for (const item of data.items) {
      const poItem = poItemMap.get(item.poItemId)!;
      const newReceived = parseFloat(String(poItem.receivedQuantity ?? 0)) + item.acceptedQuantity;
      await tx.update(purchaseOrderItems)
        .set({ receivedQuantity: String(newReceived.toFixed(3)) })
        .where(eq(purchaseOrderItems.id, item.poItemId));
    }

    // Determine new PO status: fully received or partially received
    const updatedItems = await tx.select().from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.poId, data.poId));
    const allReceived = updatedItems.every(
      i => parseFloat(String(i.receivedQuantity)) >= parseFloat(String(i.orderedQuantity)),
    );
    await tx.update(purchaseOrders)
      .set({
        status: allReceived ? "received" : "partially_received",
        actualDelivery: allReceived ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, data.poId));

    return gr;
  });

  insertAuditLog({ orgId, userId, action: "created", resource: "goods_receipt", resourceId: result.id, metadata: { grNumber, poId: data.poId } });
  return c.json({ receipt: result }, 201);
});

// PATCH /procurement/receipts/:id/approve — approve/reject a GR
procurementRouter.patch("/receipts/:id/approve", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const grId = c.req.param("id");
  const body = await c.req.json();

  const schema = z.object({
    status: z.enum(["approved", "rejected"]),
    notes: z.string().max(1000).optional().nullable(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  // Pre-check outside transaction (fast path rejection)
  const [grPre] = await db.select({ id: goodsReceipts.id, status: goodsReceipts.status })
    .from(goodsReceipts)
    .where(and(eq(goodsReceipts.id, grId), eq(goodsReceipts.orgId, orgId)));
  if (!grPre) return apiErr(c, "GR_NOT_FOUND", 404);
  if (grPre.status !== "pending") return apiErr(c, "GR_ALREADY_PROCESSED", 400);

  // Single transaction: status update + inventory update are atomic
  let row: typeof goodsReceipts.$inferSelect | undefined;
  try {
    row = await db.transaction(async (tx) => {
      // Re-read inside transaction to guard against concurrent approval
      const [gr] = await tx.select().from(goodsReceipts)
        .where(and(eq(goodsReceipts.id, grId), eq(goodsReceipts.orgId, orgId)));
      if (!gr || gr.status !== "pending") throw Object.assign(new Error("GR_ALREADY_PROCESSED"), { code: "GR_ALREADY_PROCESSED" });

    const [updated] = await tx.update(goodsReceipts)
      .set({
        status: parsed.data.status,
        approvedBy: userId,
        approvedAt: new Date(),
        notes: parsed.data.notes ?? gr.notes,
      })
      .where(and(eq(goodsReceipts.id, grId), eq(goodsReceipts.orgId, orgId)))
      .returning();

    // Auto-update inventory when GR is approved
    if (parsed.data.status === "approved") {
      const grItems = await tx.select().from(goodsReceiptItems)
        .where(eq(goodsReceiptItems.grId, grId));

      if (grItems.length > 0) {
        const poItemIds = grItems.map(i => i.poItemId);
        const poItems = await tx.select().from(purchaseOrderItems)
          .where(inArray(purchaseOrderItems.id, poItemIds));
        const poItemMap = new Map(poItems.map(p => [p.id, p]));

        for (const grItem of grItems) {
          if (grItem.stockUpdated) continue;
          const accepted = parseFloat(String(grItem.acceptedQuantity));
          if (accepted <= 0) continue;

          const poItem = poItemMap.get(grItem.poItemId);
          if (!poItem) continue;

          // Salon supply → increment quantity
          if (poItem.supplyItemId) {
            const [supply] = await tx.select({ id: salonSupplies.id, quantity: salonSupplies.quantity })
              .from(salonSupplies)
              .where(and(eq(salonSupplies.id, poItem.supplyItemId), eq(salonSupplies.orgId, orgId)));
            if (supply) {
              const newQty = parseFloat(String(supply.quantity ?? 0)) + accepted;
              await tx.update(salonSupplies)
                .set({ quantity: String(newQty.toFixed(2)), updatedAt: new Date() })
                .where(eq(salonSupplies.id, supply.id));
            }
          }

          // Flower variant → create a new batch
          if (poItem.flowerVariantId) {
            const expiryEstimated = grItem.expiryDate
              ? new Date(grItem.expiryDate)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const batchNumber = `GR-${gr.grNumber}-${grItem.lineOrder ?? 0}`;
            await tx.insert(flowerBatches).values({
              orgId,
              variantId: poItem.flowerVariantId,
              locationId: gr.locationId ?? null,
              batchNumber,
              supplierId: gr.supplierId,
              quantityReceived: Math.round(accepted),
              quantityRemaining: Math.round(accepted),
              unitCost: poItem.unitPrice,
              receivedAt: gr.receivedAt,
              expiryEstimated,
              notes: grItem.qualityNotes,
            });
          }

          await tx.update(goodsReceiptItems)
            .set({ stockUpdated: true })
            .where(eq(goodsReceiptItems.id, grItem.id));
        }
      }
    }

      return updated;
    });
  } catch (err: any) {
    if (err?.code === "GR_ALREADY_PROCESSED") return apiErr(c, "GR_ALREADY_PROCESSED", 400);
    throw err;
  }

  insertAuditLog({ orgId, userId, action: "updated", resource: "goods_receipt", resourceId: grId, metadata: { status: parsed.data.status } });
  return c.json({ receipt: row });
});

// GET /procurement/receipts/:id
procurementRouter.get("/receipts/:id", async (c) => {
  const orgId = getOrgId(c);
  const grId = c.req.param("id");

  const [[gr], items] = await Promise.all([
    db.select().from(goodsReceipts)
      .where(and(eq(goodsReceipts.id, grId), eq(goodsReceipts.orgId, orgId))),
    db.select().from(goodsReceiptItems)
      .where(eq(goodsReceiptItems.grId, grId))
      .orderBy(asc(goodsReceiptItems.lineOrder)),
  ]);
  if (!gr) return apiErr(c, "GR_NOT_FOUND", 404);

  return c.json({ receipt: gr, items });
});

// ============================================================
// SUPPLIER INVOICES — فواتير الموردين
// ============================================================

// GET /procurement/invoices
procurementRouter.get("/invoices", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const supplierId = c.req.query("supplier_id");

  const where = and(
    eq(supplierInvoices.orgId, orgId),
    status ? eq(supplierInvoices.status, status as any) : undefined,
    supplierId ? eq(supplierInvoices.supplierId, supplierId) : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(supplierInvoices)
      .where(where)
      .orderBy(desc(supplierInvoices.invoiceDate))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(supplierInvoices).where(where),
  ]);

  return c.json({ invoices: rows, total: Number(total), limit, offset });
});

// GET /procurement/invoices/:id
procurementRouter.get("/invoices/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db.select().from(supplierInvoices)
    .where(and(eq(supplierInvoices.id, c.req.param("id")), eq(supplierInvoices.orgId, orgId)));
  if (!row) return apiErr(c, "SUPPLIER_INVOICE_NOT_FOUND", 404);
  return c.json({ invoice: row });
});

// POST /procurement/invoices
procurementRouter.post("/invoices", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const data = parsed.data;

  // Verify supplier belongs to org
  const [sup] = await db.select({ id: suppliers.id }).from(suppliers)
    .where(and(eq(suppliers.id, data.supplierId), eq(suppliers.orgId, orgId)));
  if (!sup) return apiErr(c, "SUPPLIER_NOT_FOUND", 404);

  const [row] = await db.insert(supplierInvoices).values({
    orgId,
    supplierId: data.supplierId,
    poId: data.poId,
    grId: data.grId,
    invoiceNumber: data.invoiceNumber,
    invoiceDate: new Date(data.invoiceDate),
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    subtotal: String(data.subtotal),
    vatAmount: String(data.vatAmount ?? 0),
    totalAmount: String(data.totalAmount),
    currency: data.currency,
    notes: data.notes,
    status: "received",
  }).returning();

  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "supplier_invoice", resourceId: row.id, metadata: { invoiceNumber: data.invoiceNumber, supplierId: data.supplierId, totalAmount: data.totalAmount } });
  return c.json({ invoice: row }, 201);
});

// PATCH /procurement/invoices/:id/status — advance invoice through workflow
procurementRouter.patch("/invoices/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const invId = c.req.param("id");
  const body = await c.req.json();

  const schema = z.object({
    status: z.enum(["matched", "approved", "paid", "disputed"]),
    paidAmount: z.number().nonnegative().optional(),
    notes: z.string().max(1000).optional().nullable(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [inv] = await db.select().from(supplierInvoices)
    .where(and(eq(supplierInvoices.id, invId), eq(supplierInvoices.orgId, orgId)));
  if (!inv) return apiErr(c, "SUPPLIER_INVOICE_NOT_FOUND", 404);

  const updateData: Record<string, any> = {
    status: parsed.data.status,
    updatedAt: new Date(),
  };
  if (parsed.data.notes) updateData.notes = parsed.data.notes;
  if (parsed.data.status === "approved") {
    updateData.approvedBy = userId;
    updateData.approvedAt = new Date();
  }
  if (parsed.data.status === "paid" && parsed.data.paidAmount !== undefined) {
    updateData.paidAmount = String(parsed.data.paidAmount);
  }

  const [row] = await db.update(supplierInvoices)
    .set(updateData)
    .where(and(eq(supplierInvoices.id, invId), eq(supplierInvoices.orgId, orgId)))
    .returning();

  // When invoice is paid — increment supplier's totalSpent and totalOrders
  if (parsed.data.status === "paid" && inv.status !== "paid") {
    const paidAmt = parsed.data.paidAmount ?? parseFloat(String(inv.totalAmount));
    await db.update(suppliers)
      .set({
        totalSpent: sql`total_spent + ${paidAmt}`,
        totalOrders: sql`total_orders + 1`,
      })
      .where(and(eq(suppliers.id, inv.supplierId), eq(suppliers.orgId, orgId)));
  }

  insertAuditLog({ orgId, userId, action: "updated", resource: "supplier_invoice", resourceId: invId, metadata: { status: parsed.data.status } });
  return c.json({ invoice: row });
});

// ============================================================
// DASHBOARD STATS — ملخص المشتريات
// ============================================================

// GET /procurement/stats
procurementRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);

  const [
    [poStats],
    [invoiceStats],
    pendingGRs,
    topSuppliers,
  ] = await Promise.all([
    // PO totals by status
    db.select({
      total: count(),
      draft: sql<number>`COUNT(*) FILTER (WHERE status = 'draft')`,
      submitted: sql<number>`COUNT(*) FILTER (WHERE status = 'submitted')`,
      received: sql<number>`COUNT(*) FILTER (WHERE status = 'received')`,
      totalAmount: sql<string>`COALESCE(SUM(total_amount), 0)`,
    }).from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId)),

    // Invoice stats
    db.select({
      total: count(),
      pending: sql<number>`COUNT(*) FILTER (WHERE status IN ('received','matched'))`,
      approved: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`,
      overdue: sql<number>`COUNT(*) FILTER (WHERE status NOT IN ('paid','disputed') AND due_date < NOW())`,
      totalDue: sql<string>`COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status NOT IN ('paid','disputed')), 0)`,
    }).from(supplierInvoices).where(eq(supplierInvoices.orgId, orgId)),

    // Pending GRs awaiting approval
    db.select({ id: goodsReceipts.id, grNumber: goodsReceipts.grNumber, receivedAt: goodsReceipts.receivedAt })
      .from(goodsReceipts)
      .where(and(eq(goodsReceipts.orgId, orgId), eq(goodsReceipts.status, "pending")))
      .orderBy(asc(goodsReceipts.receivedAt))
      .limit(5),

    // Top suppliers by total_spent
    db.select({ id: suppliers.id, name: suppliers.name, totalSpent: suppliers.totalSpent, totalOrders: suppliers.totalOrders })
      .from(suppliers)
      .where(and(eq(suppliers.orgId, orgId), eq(suppliers.isActive, true)))
      .orderBy(desc(suppliers.totalSpent))
      .limit(5),
  ]);

  return c.json({
    orders: poStats,
    invoices: invoiceStats,
    pendingReceipts: pendingGRs,
    topSuppliers,
  });
});
