import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { postCashSale, reverseJournalEntry, postInventoryMovement } from "../lib/posting-engine";
import { requirePermission } from "../middleware/auth";

// ── Status enum & state machine ──────────────────────────────────────────────
const FLOWER_ORDER_STATUSES = [
  "pending", "confirmed", "preparing", "ready",
  "out_for_delivery", "delivered", "cancelled",
  "delivery_failed", "returned",
] as const;

const flowerOrderStatusEnum = z.enum(FLOWER_ORDER_STATUSES);

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:          ["confirmed", "preparing", "cancelled"],
  confirmed:        ["preparing", "cancelled"],
  preparing:        ["ready", "cancelled"],
  ready:            ["out_for_delivery", "delivered", "cancelled"],   // delivered = pickup
  out_for_delivery: ["delivered", "delivery_failed"],
  delivered:        [],                                                // terminal
  cancelled:        [],                                                // terminal
  delivery_failed:  ["out_for_delivery", "returned", "cancelled"],
  returned:         [],                                                // terminal
};

// Terminal statuses — no edits allowed
const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "returned"]);

// ============================================================
// ZOD SCHEMAS — تحقق صارم من البيانات
// ============================================================


const createCatalogItemSchema = z.object({
  type: z.enum(["packaging", "gift", "card", "delivery"]),
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional().nullable(),
  price: z.number().min(0).optional().default(0),
  icon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const orderItemSchema = z.object({
  product_id: z.string().optional(),
  id: z.string().optional(),
  name: z.string().min(1),
  nameAr: z.string().optional(),
  qty: z.number().int().min(1).optional(),
  quantity: z.number().int().min(1).optional(),
  price: z.number().min(0).optional(),
  unit_price: z.number().min(0).optional(),
}).passthrough();

const createFlowerOrderSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(5).max(20),
  customerId: z.string().uuid().optional().nullable(),
  items: z.array(orderItemSchema).optional().default([]),
  subtotal: z.number().min(0).optional().default(0),
  total: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  deliveryAddress: z.record(z.unknown()).optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  giftMessage: z.string().max(500).optional().nullable(),
  packaging: z.string().optional().default("bouquet"),
  paymentMethod: z.string().optional().default("cash"),
  paidAmount: z.number().min(0).optional().default(0),
});

const updateOrderSchema = z.object({
  customerName: z.string().min(1).max(200).optional(),
  customerPhone: z.string().min(5).max(20).optional(),
  items: z.array(orderItemSchema).optional(),
  subtotal: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  deliveryAddress: z.record(z.unknown()).optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  giftMessage: z.string().max(500).optional().nullable(),
  packaging: z.string().optional(),
  version: z.number().int().min(1),
});

const updateStatusSchema = z.object({
  status: z.string().min(1),
  version: z.number().int().min(1),
  reason: z.string().max(500).optional(),
});

// ============================================================
// HELPERS
// ============================================================

/** Deduct flower_inventory stock for order items */
async function deductInventoryForOrder(
  orgId: string,
  items: any[],
  userId: string | null,
) {
  for (const item of items) {
    const itemId = item.product_id || item.id;
    const qty = item.qty || item.quantity || 1;
    if (!itemId) continue;

    // Atomic deduction with floor at 0
    await pool.query(
      `UPDATE flower_inventory
       SET stock = GREATEST(stock - $1, 0), updated_at = NOW()
       WHERE id = $2 AND org_id = $3`,
      [qty, itemId, orgId],
    );

    // Post COGS journal entry (async, non-blocking)
    try {
      const invRow = await pool.query(
        `SELECT name, sell_price FROM flower_inventory WHERE id = $1 AND org_id = $2`,
        [itemId, orgId],
      );
      if (invRow.rows[0]) {
        await postInventoryMovement({
          orgId,
          productId: itemId,
          productName: invRow.rows[0].name ?? item.name,
          movementType: "out",
          quantity: qty,
          unitCost: Number(invRow.rows[0].sell_price ?? item.price ?? 0),
          description: `بيع: ${invRow.rows[0].name ?? item.name} × ${qty}`,
        });
      }
    } catch {
      // COGS posting is optional — don't block
    }
  }
}

/** Re-add flower_inventory stock when order is cancelled / refunded */
async function restoreInventoryForOrder(orgId: string, items: any[]) {
  for (const item of items) {
    const itemId = item.product_id || item.id;
    const qty = item.qty || item.quantity || 1;
    if (!itemId) continue;

    await pool.query(
      `UPDATE flower_inventory
       SET stock = stock + $1, updated_at = NOW()
       WHERE id = $2 AND org_id = $3`,
      [qty, itemId, orgId],
    );
  }
}

// ============================================================
// ROUTER
// ============================================================

export const flowerBuilderRouter = new Hono();

// ─── CATALOG (packaging, gifts, cards, delivery) ────────────────────────────

flowerBuilderRouter.get("/catalog", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM flower_builder_items WHERE org_id = $1 ORDER BY type ASC, name ASC`,
    [orgId],
  );
  const grouped: Record<string, any[]> = { packaging: [], gift: [], card: [], delivery: [] };
  for (const item of result.rows) {
    if (grouped[item.type]) grouped[item.type].push(item);
  }
  return c.json({ data: grouped });
});

flowerBuilderRouter.post("/catalog", requirePermission("inventory", "create"), async (c) => {
  const orgId = getOrgId(c);
  const body = createCatalogItemSchema.parse(await c.req.json());
  const result = await pool.query(
    `INSERT INTO flower_builder_items (org_id, type, name, name_en, price, icon, image, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [orgId, body.type, body.name, body.nameEn || null, body.price || 0,
     body.icon || null, body.image || null, body.isActive !== false],
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "flower_builder_item", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

flowerBuilderRouter.put("/catalog/:id", requirePermission("inventory", "edit"), async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE flower_builder_items SET
       name = COALESCE($1, name),
       name_en = COALESCE($2, name_en),
       price = COALESCE($3, price),
       icon = COALESCE($4, icon),
       image = COALESCE($5, image),
       is_active = COALESCE($6, is_active)
     WHERE id = $7 AND org_id = $8 RETURNING *`,
    [body.name || null, body.nameEn || null, body.price ?? null,
     body.icon || null, body.image || null,
     body.isActive ?? null, c.req.param("id"), orgId],
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

flowerBuilderRouter.delete("/catalog/:id", requirePermission("inventory", "delete"), async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE flower_builder_items SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId],
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// ─── INVENTORY (flower stock) ──────────────────────────────────────────────

flowerBuilderRouter.get("/inventory", async (c) => {
  const orgId = getOrgId(c);
  const all = c.req.query("all") === "true";
  const query = all
    ? `SELECT * FROM flower_inventory WHERE org_id = $1 ORDER BY name ASC`
    : `SELECT * FROM flower_inventory WHERE org_id = $1 AND stock > 0 ORDER BY name ASC`;
  const result = await pool.query(query, [orgId]);
  return c.json({ data: result.rows });
});

flowerBuilderRouter.post("/inventory", requirePermission("inventory", "create"), async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `INSERT INTO flower_inventory (org_id, name, color, type, stock, sell_price, is_hidden, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [orgId, body.name, body.color || null, body.type || null,
     parseInt(body.stock) || 0, parseFloat(body.sellPrice) || 0,
     body.isHidden === true, body.imageUrl || null],
  );
  return c.json({ data: result.rows[0] }, 201);
});

flowerBuilderRouter.put("/inventory/:id", requirePermission("inventory", "edit"), async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE flower_inventory SET
       name = COALESCE($1, name),
       color = $2,
       type = $3,
       stock = COALESCE($4, stock),
       sell_price = COALESCE($5, sell_price),
       is_hidden = COALESCE($6, is_hidden),
       image_url = $7
     WHERE id = $8 AND org_id = $9 RETURNING *`,
    [body.name || null, body.color || null, body.type || null,
     body.stock !== undefined ? parseInt(body.stock) : null,
     body.sellPrice !== undefined ? parseFloat(body.sellPrice) : null,
     body.isHidden !== undefined ? body.isHidden : null,
     body.imageUrl || null, c.req.param("id"), orgId],
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

flowerBuilderRouter.delete("/inventory/:id", requirePermission("inventory", "delete"), async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `DELETE FROM flower_inventory WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId],
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// ─── ORDERS ────────────────────────────────────────────────────────────────

// GET /flower-builder/orders
flowerBuilderRouter.get("/orders", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");

  const conditions = ["org_id = $1"];
  const params: any[] = [orgId];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT * FROM flower_orders ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  const countResult = await pool.query(`SELECT COUNT(*) FROM flower_orders ${where}`, params);
  return c.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
});

// GET /flower-builder/orders/stats
flowerBuilderRouter.get("/orders/stats", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'pending') as pending,
       COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
       COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
       COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as today,
       COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled')), 0) as total_revenue,
       COALESCE(SUM(total) FILTER (WHERE created_at::date = CURRENT_DATE AND status NOT IN ('cancelled')), 0) as today_revenue
     FROM flower_orders WHERE org_id = $1`,
    [orgId],
  );
  return c.json({ data: result.rows[0] });
});

// GET /flower-builder/orders/:id — single order detail
flowerBuilderRouter.get("/orders/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM flower_orders WHERE id = $1 AND org_id = $2`,
    [c.req.param("id"), orgId],
  );
  if (!result.rows[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  return c.json({ data: result.rows[0] });
});

// POST /flower-builder/orders — create order + auto-link customer + deduct inventory
flowerBuilderRouter.post("/orders", async (c) => {
  const orgId = getOrgId(c);
  const rawBody = await c.req.json();
  const body = createFlowerOrderSchema.parse(rawBody);
  const orderNum = `FLW-${Date.now().toString(36).toUpperCase()}`;

  // Auto-link or create customer
  let customerId = body.customerId || rawBody.customerId || null;
  if (!customerId && body.customerPhone) {
    const existingCustomer = await pool.query(
      `SELECT id FROM customers WHERE org_id = $1 AND phone = $2 LIMIT 1`,
      [orgId, body.customerPhone],
    );
    if (existingCustomer.rows[0]) {
      customerId = existingCustomer.rows[0].id;
    } else {
      try {
        const newCustomer = await pool.query(
          `INSERT INTO customers (org_id, name, phone, type, tier)
           VALUES ($1, $2, $3, 'individual', 'regular')
           ON CONFLICT (org_id, phone) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [orgId, body.customerName, body.customerPhone],
        );
        customerId = newCustomer.rows[0]?.id ?? null;
      } catch {
        // Customer creation is optional
      }
    }
  }

  const finalTotal = body.total || body.totalPrice || body.subtotal || 0;
  const paidAmount = body.paidAmount || (body.paymentMethod !== "credit" ? finalTotal : 0);

  const result = await pool.query(
    `INSERT INTO flower_orders
       (org_id, order_number, customer_name, customer_phone, customer_id, items, subtotal, total,
        delivery_address, delivery_date, gift_message, packaging,
        recipient_name, recipient_phone, is_surprise, delivery_fee,
        delivery_time, order_type, payment_method, paid_amount, payment_status, version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,1) RETURNING *`,
    [orgId, orderNum, body.customerName, body.customerPhone, customerId,
     JSON.stringify(body.items || []), body.subtotal || finalTotal, finalTotal,
     rawBody.deliveryAddress ? JSON.stringify(rawBody.deliveryAddress) : null,
     body.deliveryDate || null, body.giftMessage || null, body.packaging || "bouquet",
     rawBody.recipientName || null, rawBody.recipientPhone || null,
     rawBody.isSurprise || false, rawBody.deliveryFee || 0,
     rawBody.deliveryTime || null,
     rawBody.orderType || rawBody.sale_type || "regular",
     body.paymentMethod || rawBody.payment_method || "cash",
     paidAmount,
     paidAmount >= finalTotal ? "paid" : (paidAmount > 0 ? "partial" : "unpaid")],
  );

  // Deduct inventory (async, non-blocking)
  const items = body.items || [];
  if (items.length > 0) {
    deductInventoryForOrder(orgId, items, getUserId(c)).catch(() => {});
  }

  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "flower_order", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PUT /flower-builder/orders/:id — edit order (with optimistic locking)
flowerBuilderRouter.put("/orders/:id", requirePermission("bookings", "edit"), async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = updateOrderSchema.parse(await c.req.json());

  // Check order exists and is editable
  const current = await pool.query(
    `SELECT * FROM flower_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId],
  );
  if (!current.rows[0]) return c.json({ error: "الطلب غير موجود" }, 404);

  const order = current.rows[0];
  if (order.status === "delivered" || order.status === "cancelled") {
    return c.json({ error: "لا يمكن تعديل طلب مُسلّم أو ملغي" }, 400);
  }

  // Optimistic locking check
  if (order.version !== body.version) {
    return c.json({
      error: "تم تعديل الطلب من قبل مستخدم آخر — يرجى إعادة تحميل الصفحة",
      code: "VERSION_CONFLICT",
    }, 409);
  }

  const result = await pool.query(
    `UPDATE flower_orders SET
       customer_name = COALESCE($1, customer_name),
       customer_phone = COALESCE($2, customer_phone),
       items = COALESCE($3, items),
       subtotal = COALESCE($4, subtotal),
       total = COALESCE($5, total),
       delivery_address = COALESCE($6, delivery_address),
       delivery_date = COALESCE($7, delivery_date),
       gift_message = COALESCE($8, gift_message),
       packaging = COALESCE($9, packaging),
       version = version + 1,
       updated_at = NOW()
     WHERE id = $10 AND org_id = $11 AND version = $12 RETURNING *`,
    [
      body.customerName || null,
      body.customerPhone || null,
      body.items ? JSON.stringify(body.items) : null,
      body.subtotal ?? null,
      body.total ?? null,
      body.deliveryAddress ? JSON.stringify(body.deliveryAddress) : null,
      body.deliveryDate || null,
      body.giftMessage ?? null,
      body.packaging || null,
      id, orgId, body.version,
    ],
  );

  if (!result.rows[0]) {
    return c.json({ error: "تعارض في التحديث — يرجى إعادة المحاولة", code: "VERSION_CONFLICT" }, 409);
  }

  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "flower_order", resourceId: id, metadata: { version: body.version + 1 } });
  return c.json({ data: result.rows[0] });
});

// PATCH /flower-builder/orders/:id/status — with state machine + optimistic locking + idempotent posting
flowerBuilderRouter.patch("/orders/:id/status", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const body   = updateStatusSchema.parse(await c.req.json());
  const { status, version, reason } = body;

  // ── Fetch current order ───────────────────────────────────────
  const { rows: [order] } = await pool.query(
    `SELECT * FROM flower_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  if (!order) return c.json({ error: "الطلب غير موجود" }, 404);

  // ── Optimistic locking ────────────────────────────────────────
  if (order.version !== version) {
    return c.json({
      error: "تم تعديل الطلب من قبل مستخدم آخر — يرجى إعادة تحميل الصفحة",
      code: "VERSION_CONFLICT",
    }, 409);
  }

  // ── State machine validation ──────────────────────────────────
  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    return c.json({
      error: `لا يمكن الانتقال من "${order.status}" إلى "${status}"`,
      code: "INVALID_TRANSITION",
    }, 422);
  }

  // ── Build timestamp & cancellation fields ─────────────────────
  const tsField: Record<string, string> = {
    confirmed: "confirmed_at",
    preparing: "preparing_at",
    ready: "ready_at",
    out_for_delivery: "dispatched_at",
    delivered: "delivered_at",
    cancelled: "cancelled_at",
    delivery_failed: "updated_at",
    returned: "updated_at",
  };
  const tsCol = tsField[status] || "updated_at";

  // ── Atomic: status change + financial posting in one transaction ─
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const setClauses = [
      `status = $3`,
      `${tsCol} = NOW()`,
      `updated_at = NOW()`,
      `version = version + 1`,
    ];
    const params: any[] = [id, orgId, status];

    if (status === "cancelled") {
      params.push(reason || null);
      setClauses.push(`cancellation_reason = $${params.length}`);
      params.push(userId || null);
      setClauses.push(`cancelled_by = $${params.length}`);
    }

    // Version check for optimistic locking
    params.push(version);
    const versionCheck = `AND version = $${params.length}`;

    const { rows: [updated] } = await client.query(
      `UPDATE flower_orders SET ${setClauses.join(", ")}
       WHERE id = $1 AND org_id = $2 ${versionCheck}
       RETURNING *`,
      params
    );

    if (!updated) {
      await client.query("ROLLBACK");
      return c.json({ error: "تعارض في التحديث — يرجى إعادة المحاولة", code: "VERSION_CONFLICT" }, 409);
    }

    // ── Financial posting when delivered (with duplicate protection) ──
    if (status === "delivered" && !updated.journal_entry_id) {
      const amount = Number(updated.total ?? updated.subtotal ?? 0);
      if (amount > 0) {
        try {
          const postResult = await postCashSale({
            orgId,
            date: new Date(),
            amount,
            vatAmount: 0,
            description: `طلب ورود #${updated.order_number}`,
            sourceType: "pos",
            sourceId: updated.id,
            createdBy: userId ?? undefined,
          });
          if (postResult?.entryId) {
            await client.query(
              `UPDATE flower_orders SET journal_entry_id = $1, payment_status = 'paid', paid_amount = $2 WHERE id = $3`,
              [postResult.entryId, amount, id]
            );
          }
        } catch {
          // المحاسبة غير مُفعّلة — نكمل بدون قيد
        }
      }
    }

    // ── Reverse financial entry on cancellation ─────────────────
    if (status === "cancelled" && updated.journal_entry_id) {
      try {
        await reverseJournalEntry(
          updated.journal_entry_id,
          userId ?? "system",
          reason || `إلغاء طلب ورود #${order.order_number}`
        );
        await client.query(
          `UPDATE flower_orders SET payment_status = 'refunded' WHERE id = $1 AND org_id = $2`,
          [id, orgId]
        );
      } catch {
        // تجاهل أخطاء المحاسبة
      }
    }

    await client.query("COMMIT");

    // ── Restore inventory on cancellation (async, non-blocking) ──
    if (status === "cancelled") {
      const items = typeof order.items === "string" ? JSON.parse(order.items || "[]") : (order.items || []);
      if (items.length > 0) {
        restoreInventoryForOrder(orgId, items).catch(() => {});
      }
    }

    // ── Audit with old/new status ───────────────────────────────
    insertAuditLog({
      orgId,
      userId,
      action: "updated",
      resource: "flower_order",
      resourceId: id,
      oldValue: { status: order.status },
      newValue: { status },
      metadata: { status, reason },
    });

    return c.json({ data: updated });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// PATCH /flower-builder/orders/:id/driver — assign driver (with optimistic locking)
flowerBuilderRouter.patch("/orders/:id/driver", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { driverName, driverPhone, version } = await c.req.json();

  if (typeof version !== "number") {
    return c.json({ error: "version مطلوب" }, 400);
  }

  // Verify current status allows driver assignment
  const { rows: [current] } = await pool.query(
    `SELECT id, status, version FROM flower_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  if (!current) return c.json({ error: "الطلب غير موجود" }, 404);

  if (!["ready", "delivery_failed"].includes(current.status)) {
    return c.json({
      error: `لا يمكن تعيين مندوب والطلب في حالة "${current.status}" — يجب أن يكون "ready" أو "delivery_failed"`,
    }, 422);
  }

  const { rows: [updated] } = await pool.query(
    `UPDATE flower_orders
     SET driver_name=$3, driver_phone=$4, status='out_for_delivery',
         dispatched_at=COALESCE(dispatched_at, NOW()), updated_at=NOW(),
         version = version + 1
     WHERE id=$1 AND org_id=$2 AND version=$5 RETURNING *`,
    [id, orgId, driverName || null, driverPhone || null, version]
  );
  if (!updated) {
    return c.json({ error: "الطلب غير موجود أو تم تعديله", code: "VERSION_CONFLICT" }, 409);
  }

  insertAuditLog({
    orgId,
    userId: getUserId(c),
    action: "updated",
    resource: "flower_order",
    resourceId: id,
    oldValue: { status: current.status },
    newValue: { status: "out_for_delivery" },
    metadata: { driverName },
  });
  return c.json({ data: updated });
});

// PATCH /flower-builder/orders/:id/assign-staff — assign florist (with optimistic locking)
flowerBuilderRouter.patch("/orders/:id/assign-staff", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { staffId, staffName, version } = await c.req.json();

  if (typeof version !== "number") {
    return c.json({ error: "version مطلوب" }, 400);
  }

  // Verify current status allows staff assignment
  const { rows: [current] } = await pool.query(
    `SELECT id, status, version FROM flower_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  if (!current) return c.json({ error: "الطلب غير موجود" }, 404);

  if (!["pending", "confirmed"].includes(current.status)) {
    return c.json({
      error: `لا يمكن تعيين منسق والطلب في حالة "${current.status}" — يجب أن يكون "pending" أو "confirmed"`,
    }, 422);
  }

  const { rows: [updated] } = await pool.query(
    `UPDATE flower_orders
     SET assigned_staff_id=$3, assigned_staff_name=$4,
         status='preparing', preparing_at=COALESCE(preparing_at, NOW()), updated_at=NOW(),
         version = version + 1
     WHERE id=$1 AND org_id=$2 AND version=$5 RETURNING *`,
    [id, orgId, staffId || null, staffName || null, version]
  );
  if (!updated) {
    return c.json({ error: "الطلب غير موجود أو تم تعديله", code: "VERSION_CONFLICT" }, 409);
  }

  insertAuditLog({
    orgId,
    userId: getUserId(c),
    action: "updated",
    resource: "flower_order",
    resourceId: id,
    oldValue: { status: current.status },
    newValue: { status: "preparing" },
    metadata: { assigned_staff_id: staffId },
  });
  return c.json({ data: updated });
});

// DELETE /flower-builder/orders/:id — cancel order (shortcut)
flowerBuilderRouter.delete("/orders/:id", requirePermission("bookings", "delete"), async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { reason, version } = await c.req.json().catch(() => ({ reason: null, version: null }));

  const current = await pool.query(
    `SELECT * FROM flower_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId],
  );
  if (!current.rows[0]) return c.json({ error: "الطلب غير موجود" }, 404);

  const order = current.rows[0];
  if (order.status === "delivered") {
    return c.json({ error: "لا يمكن إلغاء طلب مُسلّم" }, 400);
  }
  if (order.status === "cancelled") {
    return c.json({ error: "الطلب ملغي بالفعل" }, 400);
  }

  const result = await pool.query(
    `UPDATE flower_orders SET status = 'cancelled', cancelled_at = NOW(),
       cancellation_reason = $3, version = version + 1, updated_at = NOW()
     WHERE id = $1 AND org_id = $2 RETURNING *`,
    [id, orgId, reason || null],
  );

  // Reverse financial entry
  if (order.journal_entry_id) {
    try {
      const userId = getUserId(c);
      if (userId) {
        await reverseJournalEntry(order.journal_entry_id, userId, reason || "إلغاء طلب ورود");
      }
    } catch { /* optional */ }
  }

  // Restore inventory
  const items = typeof order.items === "string" ? JSON.parse(order.items || "[]") : (order.items || []);
  if (items.length > 0) {
    restoreInventoryForOrder(orgId, items).catch(() => {});
  }

  insertAuditLog({ orgId, userId: getUserId(c), action: "cancelled", resource: "flower_order", resourceId: id, metadata: { reason } });
  return c.json({ data: result.rows[0] });
});

// ─── DELIVERY ───────────────────────────────────────────────────────────────

flowerBuilderRouter.get("/delivery", async (c) => {
  const orgId = getOrgId(c);
  const dateStr = c.req.query("date") || new Date().toISOString().split("T")[0];
  const { rows } = await pool.query(
    `SELECT * FROM flower_orders
     WHERE org_id=$1
       AND (
         (delivery_time::DATE = $2::DATE)
         OR (created_at::DATE = $2::DATE AND order_type IN ('delivery','gift'))
         OR (status NOT IN ('delivered','cancelled') AND order_type IN ('delivery','gift'))
       )
     ORDER BY COALESCE(delivery_time, created_at) ASC`,
    [orgId, dateStr],
  );
  const stats = {
    total: rows.length,
    pending: rows.filter((r: any) => r.status === "pending").length,
    preparing: rows.filter((r: any) => r.status === "preparing").length,
    ready: rows.filter((r: any) => r.status === "ready").length,
    out: rows.filter((r: any) => r.status === "out_for_delivery").length,
    delivered: rows.filter((r: any) => r.status === "delivered").length,
    revenue: rows.filter((r: any) => r.status === "delivered")
      .reduce((s: number, r: any) => s + Number(r.total || 0), 0),
  };
  return c.json({ data: rows, stats });
});

// ─── PAGE CONFIG ─────────────────────────────────────────────────────────────

flowerBuilderRouter.get("/page-config", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT config FROM flower_page_configs WHERE org_id = $1 LIMIT 1`,
    [orgId],
  );
  return c.json({ data: result.rows[0]?.config || {} });
});

flowerBuilderRouter.put("/page-config", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `INSERT INTO flower_page_configs (org_id, config)
     VALUES ($1, $2)
     ON CONFLICT (org_id) DO UPDATE SET config = $2, updated_at = NOW()
     RETURNING config`,
    [orgId, JSON.stringify(body)],
  );
  return c.json({ data: result.rows[0]?.config });
});

// ─── PUBLIC (no auth) ────────────────────────────────────────────────────────

flowerBuilderRouter.get("/public/:slug", async (c) => {
  const slug = c.req.param("slug");
  const orgResult = await pool.query(
    `SELECT o.id, o.name, o.logo, o.phone FROM organizations o
     WHERE o.slug = $1 OR o.subdomain = $2`,
    [slug, slug],
  );
  if (!orgResult.rows[0]) return c.json({ error: "Not found" }, 404);
  const orgId = orgResult.rows[0].id;

  const configRow = await pool.query(`SELECT config FROM flower_page_configs WHERE org_id = $1`, [orgId]);
  const pageConfig = configRow.rows[0]?.config || {};
  if (!pageConfig.isPublic) return c.json({ error: "Store not public" }, 403);

  const inventory = await pool.query(
    `SELECT id, name, type, color, sell_price AS "sellPrice", stock,
            public_label AS "publicLabel", image_url AS "imageUrl",
            CASE WHEN stock <= 5 THEN true ELSE false END AS "isLowStock"
     FROM flower_inventory
     WHERE org_id = $1 AND stock > 0 AND is_hidden = false
     ORDER BY type ASC, name ASC`,
    [orgId],
  );

  const catalogRows = await pool.query(
    `SELECT id, type, name, name_en AS "nameEn", description, price,
            icon, image, is_default AS "isDefault", max_quantity AS "maxQuantity"
     FROM flower_builder_items
     WHERE org_id = $1 AND is_active = true
     ORDER BY sort_order ASC, name ASC`,
    [orgId],
  );
  const catalog: Record<string, any[]> = { packaging: [], gift: [], card: [], delivery: [] };
  for (const item of catalogRows.rows) {
    if (catalog[item.type]) catalog[item.type].push(item);
  }

  const packages = await pool.query(
    `SELECT id, name, description, base_price AS "basePrice", image, components
     FROM flower_packages WHERE org_id = $1 AND is_active = true ORDER BY name ASC`,
    [orgId],
  );

  return c.json({
    data: {
      org: orgResult.rows[0],
      pageConfig,
      inventory: inventory.rows,
      catalog,
      packages: packages.rows,
    },
  });
});

flowerBuilderRouter.post("/public/:slug/order", async (c) => {
  const slug = c.req.param("slug");
  const orgResult = await pool.query(
    `SELECT id FROM organizations WHERE slug = $1 OR subdomain = $2`,
    [slug, slug],
  );
  if (!orgResult.rows[0]) return c.json({ error: "Not found" }, 404);
  const orgId = orgResult.rows[0].id;

  const body = await c.req.json();
  const orderNum = `FLW-${Date.now().toString(36).toUpperCase()}`;

  const delivType = body.deliveryType === "pickup" ? "pickup" : "delivery";
  const orderType = body.isSurprise ? "gift" : (delivType === "pickup" ? "pickup" : "delivery");

  const result = await pool.query(
    `INSERT INTO flower_orders
       (org_id, order_number, customer_name, customer_phone, items, addons,
        subtotal, total, delivery_type, delivery_address, delivery_date, delivery_fee,
        gift_message, packaging, packaging_price,
        recipient_name, recipient_phone, is_surprise,
        order_type, notes, selections, version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,1)
     RETURNING id, order_number, status`,
    [
      orgId, orderNum, body.customerName, body.customerPhone,
      JSON.stringify(body.items || []),
      JSON.stringify(body.addons || []),
      body.subtotal || body.totalPrice || 0,
      body.total || body.totalPrice || 0,
      delivType,
      body.deliveryAddress ? JSON.stringify(body.deliveryAddress) : null,
      body.deliveryDate || null,
      body.deliveryFee || 0,
      body.giftMessage || body.cardMessage || null,
      body.packaging || "bouquet",
      body.packagingPrice || 0,
      body.recipientName || null,
      body.recipientPhone || null,
      body.isSurprise || false,
      orderType,
      body.notes || null,
      JSON.stringify(body.selections || {}),
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});
