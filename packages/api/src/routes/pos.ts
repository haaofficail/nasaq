import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

const createSaleSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0),
  payments: z.array(z.object({
    method: z.string(),
    amount: z.number().min(0),
  })).optional().default([]),
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().max(200).optional().nullable(),
  customerPhone: z.string().max(20).optional().nullable(),
  discountAmount: z.number().min(0).optional().default(0),
  couponCode: z.string().optional().nullable(),
});

export const posRouter = new Hono();

// GET /pos/transactions
posRouter.get("/transactions", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const date = c.req.query("date");
  const type = c.req.query("type");

  const conditions = ["org_id = $1"];
  const params: any[] = [orgId];
  if (date) { params.push(date); conditions.push(`created_at::date = $${params.length}`); }
  if (type) { params.push(type); conditions.push(`type = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT id, transaction_number, type, customer_id, customer_name, customer_phone,
            items, subtotal, tax_amount, total_amount, payments, discount_amount, coupon_code,
            created_at, updated_at
     FROM pos_transactions ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return c.json({ data: result.rows });
});

// POST /pos/sale
posRouter.post("/sale", async (c) => {
  const orgId = getOrgId(c);
  const body = createSaleSchema.parse(await c.req.json());
  const txNum = `POS-${Date.now().toString(36).toUpperCase()}`;

  const { items, subtotal, taxAmount, totalAmount, payments, customerId, customerName, customerPhone, discountAmount, couponCode } = body;

  const result = await pool.query(
    `INSERT INTO pos_transactions
       (org_id, transaction_number, type, customer_id, customer_name, customer_phone,
        items, subtotal, tax_amount, total_amount, payments, discount_amount, coupon_code)
     VALUES ($1,$2,'sale',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [orgId, txNum, customerId || null, customerName || null, customerPhone || null,
     JSON.stringify(items || []), subtotal || 0, taxAmount || 0, totalAmount || 0,
     JSON.stringify(payments || []), discountAmount || 0, couponCode || null]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "pos_sale", resourceId: result.rows[0]?.id, metadata: { total: totalAmount } });
  return c.json({ data: result.rows[0] }, 201);
});

// POST /pos/refund/:id
posRouter.post("/refund/:id", async (c) => {
  const orgId = getOrgId(c);
  const orig = await pool.query(
    `SELECT * FROM pos_transactions WHERE id = $1 AND org_id = $2`,
    [c.req.param("id"), orgId]
  );
  if (!orig.rows[0]) return c.json({ error: "Transaction not found" }, 404);

  const txNum = `REF-${Date.now().toString(36).toUpperCase()}`;
  const result = await pool.query(
    `INSERT INTO pos_transactions
       (org_id, transaction_number, type, customer_id, items, subtotal, tax_amount, total_amount, payments)
     VALUES ($1,$2,'refund',$3,$4,$5,$6,$7,$8) RETURNING *`,
    [orgId, txNum, orig.rows[0].customer_id, orig.rows[0].items,
     orig.rows[0].subtotal, orig.rows[0].tax_amount, orig.rows[0].total_amount, orig.rows[0].payments]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// GET /pos/settings
posRouter.get("/settings", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM pos_settings WHERE org_id = $1 LIMIT 1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] || { orgId, taxRate: 15, currency: "SAR" } });
});

// PUT /pos/settings
posRouter.put("/settings", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  const existing = await pool.query(`SELECT id FROM pos_settings WHERE org_id = $1`, [orgId]);
  let result;
  if (existing.rows[0]) {
    result = await pool.query(
      `UPDATE pos_settings SET
         tax_rate = COALESCE($1, tax_rate),
         currency = COALESCE($2, currency),
         allow_discount = COALESCE($3, allow_discount),
         receipt_footer = COALESCE($4, receipt_footer),
         updated_at = NOW()
       WHERE org_id = $5 RETURNING *`,
      [body.taxRate ?? null, body.currency ?? null, body.allowDiscount ?? null, body.receiptFooter ?? null, orgId]
    );
  } else {
    result = await pool.query(
      `INSERT INTO pos_settings (org_id, tax_rate, currency, allow_discount, receipt_footer)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [orgId, body.taxRate ?? 15, body.currency ?? "SAR", body.allowDiscount ?? true, body.receiptFooter ?? null]
    );
  }
  return c.json({ data: result.rows[0] });
});

// GET /pos/quick-items
posRouter.get("/quick-items", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM pos_quick_items WHERE org_id = $1 AND is_active = true ORDER BY sort_order ASC, name ASC`,
    [orgId]
  );
  return c.json({ data: result.rows });
});

// POST /pos/quick-items
posRouter.post("/quick-items", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return c.json({ error: "الاسم مطلوب" }, 400);
  }
  const result = await pool.query(
    `INSERT INTO pos_quick_items (org_id, name, price, category, color, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [orgId, body.name.trim(), Number(body.price) || 0, body.category || null, body.color || null, Number(body.sortOrder) || 0]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// DELETE /pos/quick-items/:id
posRouter.delete("/quick-items/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE pos_quick_items SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// GET /pos/stats
posRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const date = c.req.query("date") || new Date().toISOString().split("T")[0];

  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE type = 'sale') as sales_count,
       COALESCE(SUM(total_amount) FILTER (WHERE type = 'sale'), 0) as total_sales,
       COUNT(*) FILTER (WHERE type = 'refund') as refunds_count,
       COALESCE(SUM(total_amount) FILTER (WHERE type = 'refund'), 0) as total_refunds
     FROM pos_transactions
     WHERE org_id = $1 AND created_at::date = $2`,
    [orgId, date]
  );
  return c.json({ data: result.rows[0] });
});
