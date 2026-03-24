import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  taxNumber: z.string().max(50).optional().nullable(),
  paymentTerms: z.number().int().min(0).optional().default(30),
  creditLimit: z.number().min(0).optional().default(0),
  notes: z.string().max(2000).optional().nullable(),
});

const createOrderSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().min(1),
    unitPrice: z.string().or(z.number()),
  })).min(1),
  notes: z.string().optional().nullable(),
  expectedDelivery: z.string().optional().nullable(),
});

export const suppliersRouter = new Hono();

// GET /suppliers
suppliersRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const category = c.req.query("category");

  const where = category
    ? `WHERE org_id = $1 AND category = $2 AND is_active = true`
    : `WHERE org_id = $1 AND is_active = true`;
  const params = category ? [orgId, category] : [orgId];

  const result = await pool.query(
    `SELECT * FROM suppliers ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM suppliers ${where}`,
    params
  );

  return c.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
});

// GET /suppliers/stats
suppliersRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE is_active) as active,
       COALESCE(SUM(total_purchases), 0) as total_purchases,
       COALESCE(SUM(balance), 0) as total_balance
     FROM suppliers WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] });
});

// GET /suppliers/orders
suppliersRouter.get("/orders", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const supplierId = c.req.query("supplierId");
  const status = c.req.query("status");

  const conditions = ["po.org_id = $1"];
  const params: any[] = [orgId];
  if (supplierId) { params.push(supplierId); conditions.push(`po.supplier_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`po.status = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT po.*, s.name as supplier_name FROM purchase_orders po
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     ${where} ORDER BY po.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return c.json({ data: result.rows });
});

// POST /suppliers/orders
suppliersRouter.post("/orders", async (c) => {
  const orgId = getOrgId(c);
  const body = createOrderSchema.parse(await c.req.json());
  const { supplierId, items, notes, expectedDelivery } = body;

  const num = `PO-${Date.now().toString(36).toUpperCase()}`;
  const total = (items || []).reduce((s: number, i: any) => s + (i.quantity || 0) * (parseFloat(i.unitPrice) || 0), 0);

  const result = await pool.query(
    `INSERT INTO purchase_orders (org_id, supplier_id, order_number, status, items, total_amount, notes, expected_delivery)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7) RETURNING *`,
    [orgId, supplierId, num, JSON.stringify(items || []), total, notes || null, expectedDelivery || null]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "purchase_order", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PATCH /suppliers/orders/:id
suppliersRouter.patch("/orders/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE purchase_orders SET status = COALESCE($1, status), updated_at = NOW()
     WHERE id = $2 AND org_id = $3 RETURNING *`,
    [body.status || null, c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// GET /suppliers/:id
suppliersRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM suppliers WHERE id = $1 AND org_id = $2`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// POST /suppliers
suppliersRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = createSupplierSchema.parse(await c.req.json());
  const { name, contactName, phone, email, address, category, taxNumber, paymentTerms, creditLimit, notes } = body;

  const result = await pool.query(
    `INSERT INTO suppliers (org_id, name, contact_name, phone, email, address, category, tax_number, payment_terms, credit_limit, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [orgId, name, contactName || null, phone || null, email || null, address || null,
     category || null, taxNumber || null, paymentTerms || 30, creditLimit || 0, notes || null]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "supplier", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PUT /suppliers/:id
suppliersRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE suppliers SET
       name = COALESCE($1, name),
       contact_name = COALESCE($2, contact_name),
       phone = COALESCE($3, phone),
       email = COALESCE($4, email),
       address = COALESCE($5, address),
       category = COALESCE($6, category),
       notes = COALESCE($7, notes),
       updated_at = NOW()
     WHERE id = $8 AND org_id = $9 RETURNING *`,
    [body.name || null, body.contactName || null, body.phone || null, body.email || null,
     body.address || null, body.category || null, body.notes || null,
     c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /suppliers/:id
suppliersRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE suppliers SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "supplier", resourceId: c.req.param("id") });
  return c.json({ success: true });
});
