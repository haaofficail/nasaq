import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { postCashSale } from "../lib/posting-engine";

const createCatalogItemSchema = z.object({
  type: z.enum(["packaging", "gift", "card", "delivery"]),
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional().nullable(),
  price: z.number().min(0).optional().default(0),
  icon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const createFlowerOrderSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(5).max(20),
  items: z.array(z.unknown()).optional().default([]),
  subtotal: z.number().min(0).optional().default(0),
  total: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  deliveryAddress: z.record(z.unknown()).optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  giftMessage: z.string().max(500).optional().nullable(),
  packaging: z.string().optional().default("bouquet"),
});

export const flowerBuilderRouter = new Hono();

// GET /flower-builder/catalog
flowerBuilderRouter.get("/catalog", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM flower_builder_items WHERE org_id = $1 ORDER BY type ASC, name ASC`,
    [orgId]
  );
  const grouped: Record<string, any[]> = { packaging: [], gift: [], card: [], delivery: [] };
  for (const item of result.rows) {
    if (grouped[item.type]) grouped[item.type].push(item);
  }
  return c.json({ data: grouped });
});

// POST /flower-builder/catalog
flowerBuilderRouter.post("/catalog", async (c) => {
  const orgId = getOrgId(c);
  const body = createCatalogItemSchema.parse(await c.req.json());
  const result = await pool.query(
    `INSERT INTO flower_builder_items (org_id, type, name, name_en, price, icon, image, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [orgId, body.type, body.name, body.nameEn || null, body.price || 0,
     body.icon || null, body.image || null, body.isActive !== false]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "flower_builder_item", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PUT /flower-builder/catalog/:id
flowerBuilderRouter.put("/catalog/:id", async (c) => {
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
     body.isActive ?? null, c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /flower-builder/catalog/:id
flowerBuilderRouter.delete("/catalog/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE flower_builder_items SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// GET /flower-builder/inventory — for dashboard (all items including hidden/zero)
flowerBuilderRouter.get("/inventory", async (c) => {
  const orgId = getOrgId(c);
  const all = c.req.query("all") === "true";
  const query = all
    ? `SELECT * FROM flower_inventory WHERE org_id = $1 ORDER BY name ASC`
    : `SELECT * FROM flower_inventory WHERE org_id = $1 AND stock > 0 ORDER BY name ASC`;
  const result = await pool.query(query, [orgId]);
  return c.json({ data: result.rows });
});

// POST /flower-builder/inventory
flowerBuilderRouter.post("/inventory", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `INSERT INTO flower_inventory (org_id, name, color, type, stock, sell_price, is_hidden, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [orgId, body.name, body.color || null, body.type || null,
     parseInt(body.stock) || 0, parseFloat(body.sellPrice) || 0,
     body.isHidden === true, body.imageUrl || null]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// PUT /flower-builder/inventory/:id
flowerBuilderRouter.put("/inventory/:id", async (c) => {
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
     body.imageUrl || null, c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /flower-builder/inventory/:id
flowerBuilderRouter.delete("/inventory/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `DELETE FROM flower_inventory WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

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
    [...params, limit, offset]
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
    [orgId]
  );
  return c.json({ data: result.rows[0] });
});

// POST /flower-builder/orders
flowerBuilderRouter.post("/orders", async (c) => {
  const orgId = getOrgId(c);
  const rawBody = await c.req.json();
  const body = createFlowerOrderSchema.parse(rawBody);
  const orderNum = `FLW-${Date.now().toString(36).toUpperCase()}`;

  const result = await pool.query(
    `INSERT INTO flower_orders
       (org_id, order_number, customer_name, customer_phone, items, subtotal, total,
        delivery_address, delivery_date, gift_message, packaging,
        recipient_name, recipient_phone, is_surprise, delivery_fee,
        delivery_time, order_type, payment_method)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
    [orgId, orderNum, body.customerName, body.customerPhone,
     JSON.stringify(body.items || []), body.subtotal || (rawBody.totalPrice ?? 0),
     body.total || (rawBody.totalPrice ?? 0),
     rawBody.deliveryAddress ? JSON.stringify(rawBody.deliveryAddress) : null,
     body.deliveryDate || null, body.giftMessage || null, body.packaging || "bouquet",
     rawBody.recipientName || null, rawBody.recipientPhone || null,
     rawBody.isSurprise || false, rawBody.deliveryFee || 0,
     rawBody.deliveryTime || null,
     rawBody.orderType || "regular", rawBody.paymentMethod || "cash"]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "flower_order", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PATCH /flower-builder/orders/:id/status
flowerBuilderRouter.patch("/orders/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { status } = await c.req.json();
  const result = await pool.query(
    `UPDATE flower_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3 RETURNING *`,
    [status, id, orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "flower_order", resourceId: id, metadata: { status } });

  // ── قيد محاسبي عند التسليم ────────────────────────────────
  if (status === "delivered") {
    const order = result.rows[0];
    const amount = Number(order.total ?? order.subtotal ?? 0);
    if (amount > 0) {
      try {
        await postCashSale({
          orgId,
          date: new Date(),
          amount,
          vatAmount: 0,
          description: `طلب ورود #${order.order_number}`,
          sourceType: "pos",
          sourceId: order.id,
          createdBy: getUserId(c) ?? undefined,
        });
      } catch {
        // القيد المحاسبي اختياري — لا يوقف التحديث إن لم تكن الحسابات مهيأة
      }
    }
  }

  return c.json({ data: result.rows[0] });
});

// PATCH /flower-builder/orders/:id/driver
flowerBuilderRouter.patch("/orders/:id/driver", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { driverName, driverPhone, notes } = await c.req.json();
  const result = await pool.query(
    `UPDATE flower_orders
     SET driver_name=$3, driver_phone=$4, status='out_for_delivery',
         dispatched_at=COALESCE(dispatched_at, NOW()), updated_at=NOW()
     WHERE id=$1 AND org_id=$2 RETURNING *`,
    [id, orgId, driverName || null, driverPhone || null]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// PATCH /flower-builder/orders/:id/assign-staff — assign a florist to an order
flowerBuilderRouter.patch("/orders/:id/assign-staff", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { staffId, staffName } = await c.req.json();
  const result = await pool.query(
    `UPDATE flower_orders
     SET assigned_staff_id=$3, assigned_staff_name=$4,
         status='preparing', preparing_at=COALESCE(preparing_at, NOW()), updated_at=NOW()
     WHERE id=$1 AND org_id=$2 RETURNING *`,
    [id, orgId, staffId || null, staffName || null]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "flower_order", resourceId: id, metadata: { assigned_staff_id: staffId } });
  return c.json({ data: result.rows[0] });
});

// GET /flower-builder/delivery — today's delivery queue
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
    [orgId, dateStr]
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

// GET /flower-builder/page-config
flowerBuilderRouter.get("/page-config", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT config FROM flower_page_configs WHERE org_id = $1 LIMIT 1`,
    [orgId]
  );
  return c.json({ data: result.rows[0]?.config || {} });
});

// PUT /flower-builder/page-config
flowerBuilderRouter.put("/page-config", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `INSERT INTO flower_page_configs (org_id, config)
     VALUES ($1, $2)
     ON CONFLICT (org_id) DO UPDATE SET config = $2, updated_at = NOW()
     RETURNING config`,
    [orgId, JSON.stringify(body)]
  );
  return c.json({ data: result.rows[0]?.config });
});

// GET /flower-builder/public/:slug — no auth
flowerBuilderRouter.get("/public/:slug", async (c) => {
  const slug = c.req.param("slug");
  const orgResult = await pool.query(
    `SELECT o.id, o.name, o.logo, o.phone FROM organizations o
     WHERE o.slug = $1 OR o.subdomain = $2`,
    [slug, slug]
  );
  if (!orgResult.rows[0]) return c.json({ error: "Not found" }, 404);
  const orgId = orgResult.rows[0].id;

  const configRow = await pool.query(`SELECT config FROM flower_page_configs WHERE org_id = $1`, [orgId]);
  const pageConfig = configRow.rows[0]?.config || {};
  if (!pageConfig.isPublic) return c.json({ error: "Store not public" }, 403);

  // Inventory: flowers with stock > 0
  const inventory = await pool.query(
    `SELECT id, name, type, color, sell_price AS "sellPrice", stock,
            public_label AS "publicLabel", image_url AS "imageUrl",
            CASE WHEN stock <= 5 THEN true ELSE false END AS "isLowStock"
     FROM flower_inventory
     WHERE org_id = $1 AND stock > 0 AND is_hidden = false
     ORDER BY type ASC, name ASC`,
    [orgId]
  );

  // Catalog: packaging, gifts, cards
  const catalogRows = await pool.query(
    `SELECT id, type, name, name_en AS "nameEn", description, price,
            icon, image, is_default AS "isDefault", max_quantity AS "maxQuantity"
     FROM flower_builder_items
     WHERE org_id = $1 AND is_active = true
     ORDER BY sort_order ASC, name ASC`,
    [orgId]
  );
  const catalog: Record<string, any[]> = { packaging: [], gift: [], card: [], delivery: [] };
  for (const item of catalogRows.rows) {
    if (catalog[item.type]) catalog[item.type].push(item);
  }

  // Packages (arrangements)
  const packages = await pool.query(
    `SELECT id, name, description, base_price AS "basePrice", image, components
     FROM flower_packages WHERE org_id = $1 AND is_active = true ORDER BY name ASC`,
    [orgId]
  );

  return c.json({
    data: {
      org: orgResult.rows[0],
      pageConfig,
      inventory: inventory.rows,
      catalog,
      packages: packages.rows,
    }
  });
});

// POST /flower-builder/public/:slug/order — no auth
flowerBuilderRouter.post("/public/:slug/order", async (c) => {
  const slug = c.req.param("slug");
  const orgResult = await pool.query(
    `SELECT id FROM organizations WHERE slug = $1 OR subdomain = $2`,
    [slug, slug]
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
        order_type, notes, selections)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
    ]
  );
  return c.json({ data: result.rows[0] }, 201);
});
