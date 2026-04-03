import { Hono } from "hono";
import { z } from "zod";
import { pool, db } from "@nasaq/db/client";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { loyaltyStamps } from "@nasaq/db/schema";
import { customers } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const restaurantRouter = new Hono();

// ─────────────────────────────────────────────────
// TABLE MAP
// ─────────────────────────────────────────────────

const tableSchema = z.object({
  number:    z.string().min(1).max(20),
  section:   z.string().max(100).optional().nullable(),
  capacity:  z.number().int().min(1).max(50).optional().default(4),
  status:    z.enum(["available", "occupied", "reserved", "cleaning"]).optional().default("available"),
  notes:     z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

// GET /restaurant/tables
restaurantRouter.get("/tables", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT t.*,
            ts.id       AS session_id,
            ts.guests,
            ts.seated_at,
            ts.waiter_id,
            ts.order_id
     FROM restaurant_tables t
     LEFT JOIN table_sessions ts ON ts.table_id = t.id AND ts.closed_at IS NULL
     WHERE t.org_id = $1
     ORDER BY t.sort_order ASC, t.number ASC`,
    [orgId]
  );
  return c.json({ data: result.rows });
});

// POST /restaurant/tables
restaurantRouter.post("/tables", async (c) => {
  const orgId = getOrgId(c);
  const body = tableSchema.parse(await c.req.json());
  try {
    const result = await pool.query(
      `INSERT INTO restaurant_tables (org_id, number, section, capacity, status, notes, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [orgId, body.number, body.section || null, body.capacity, body.status, body.notes || null, body.sortOrder]
    );
    insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "restaurant_table", resourceId: result.rows[0]?.id });
    return c.json({ data: result.rows[0] }, 201);
  } catch (err: any) {
    if (err?.code === "23505") {
      return c.json({ error: `رقم الطاولة "${body.number}" موجود بالفعل — اختر رقماً مختلفاً` }, 409);
    }
    throw err;
  }
});

// PUT /restaurant/tables/:id
restaurantRouter.put("/tables/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE restaurant_tables SET
       number     = COALESCE($1, number),
       section    = COALESCE($2, section),
       capacity   = COALESCE($3, capacity),
       notes      = COALESCE($4, notes),
       sort_order = COALESCE($5, sort_order),
       updated_at = NOW()
     WHERE id = $6 AND org_id = $7 RETURNING *`,
    [body.number || null, body.section ?? null, body.capacity ?? null,
     body.notes ?? null, body.sortOrder ?? null, c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /restaurant/tables/:id
restaurantRouter.delete("/tables/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `DELETE FROM restaurant_tables WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// PATCH /restaurant/tables/:id/status
restaurantRouter.patch("/tables/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status } = await c.req.json();
  const allowed = ["available", "occupied", "reserved", "cleaning"];
  if (!allowed.includes(status)) return c.json({ error: "Invalid status" }, 400);
  const result = await pool.query(
    `UPDATE restaurant_tables SET status = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3 RETURNING *`,
    [status, c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// ─────────────────────────────────────────────────
// TABLE SESSIONS (seat guests / close table)
// ─────────────────────────────────────────────────

// POST /restaurant/tables/:id/seat
restaurantRouter.post("/tables/:id/seat", async (c) => {
  const orgId = getOrgId(c);
  const tableId = c.req.param("id");
  const body = await c.req.json();

  // Check table belongs to org
  const tableRes = await pool.query(
    `SELECT id, status FROM restaurant_tables WHERE id = $1 AND org_id = $2`,
    [tableId, orgId]
  );
  if (!tableRes.rows[0]) return c.json({ error: "Table not found" }, 404);
  if (tableRes.rows[0].status === "occupied") return c.json({ error: "Table already occupied" }, 409);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const session = await client.query(
      `INSERT INTO table_sessions (org_id, table_id, guests, waiter_id, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [orgId, tableId, body.guests || 1, body.waiterId || null, body.notes || null]
    );
    await client.query(
      `UPDATE restaurant_tables SET status = 'occupied', updated_at = NOW() WHERE id = $1`,
      [tableId]
    );
    await client.query("COMMIT");
    return c.json({ data: session.rows[0] }, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// PATCH /restaurant/sessions/:id/close
restaurantRouter.patch("/sessions/:id/close", async (c) => {
  const orgId = getOrgId(c);
  const sessionId = c.req.param("id");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const session = await client.query(
      `UPDATE table_sessions SET closed_at = NOW() WHERE id = $1 AND org_id = $2 RETURNING *`,
      [sessionId, orgId]
    );
    if (!session.rows[0]) { await client.query("ROLLBACK"); return c.json({ error: "Not found" }, 404); }

    await client.query(
      `UPDATE restaurant_tables SET status = 'available', updated_at = NOW() WHERE id = $1`,
      [session.rows[0].table_id]
    );
    await client.query("COMMIT");
    return c.json({ data: session.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────
// MENU 86 TOGGLE (mark item sold-out)
// ─────────────────────────────────────────────────

// PATCH /restaurant/menu-items/:id/toggle-availability
restaurantRouter.patch("/menu-items/:id/toggle-availability", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE menu_items SET is_available = NOT is_available WHERE id = $1 AND org_id = $2 RETURNING id, name, is_available`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// ─────────────────────────────────────────────────
// LOYALTY STAMPS
// ─────────────────────────────────────────────────

// GET /restaurant/loyalty
restaurantRouter.get("/loyalty", async (c) => {
  const orgId = getOrgId(c);
  const search = c.req.query("search") || "";

  const rows = await db
    .select({
      id: loyaltyStamps.id,
      orgId: loyaltyStamps.orgId,
      customerId: loyaltyStamps.customerId,
      stampsCount: loyaltyStamps.stampsCount,
      stampsGoal: loyaltyStamps.stampsGoal,
      freeItemsRedeemed: loyaltyStamps.freeItemsRedeemed,
      lastStampAt: loyaltyStamps.lastStampAt,
      updatedAt: loyaltyStamps.updatedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(loyaltyStamps)
    .innerJoin(customers, eq(loyaltyStamps.customerId, customers.id))
    .where(
      search
        ? and(
            eq(loyaltyStamps.orgId, orgId),
            or(ilike(customers.name, `%${search}%`), ilike(customers.phone, `%${search}%`))
          )
        : eq(loyaltyStamps.orgId, orgId)
    )
    .orderBy(loyaltyStamps.updatedAt)
    .limit(100);

  return c.json({ data: rows });
});

// GET /restaurant/loyalty/:customerId
restaurantRouter.get("/loyalty/:customerId", async (c) => {
  const orgId = getOrgId(c);
  const customerId = c.req.param("customerId");

  const [row] = await db
    .select({
      id: loyaltyStamps.id,
      customerId: loyaltyStamps.customerId,
      stampsCount: loyaltyStamps.stampsCount,
      stampsGoal: loyaltyStamps.stampsGoal,
      freeItemsRedeemed: loyaltyStamps.freeItemsRedeemed,
      lastStampAt: loyaltyStamps.lastStampAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(loyaltyStamps)
    .innerJoin(customers, eq(loyaltyStamps.customerId, customers.id))
    .where(and(eq(loyaltyStamps.orgId, orgId), eq(loyaltyStamps.customerId, customerId)));

  if (!row) {
    const [cu] = await db
      .select({ id: customers.id, name: customers.name, phone: customers.phone })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)));
    if (!cu) return c.json({ error: "Customer not found" }, 404);
    return c.json({ data: { customerId, customerName: cu.name, customerPhone: cu.phone, stampsCount: 0, stampsGoal: 10, freeItemsRedeemed: 0 } });
  }
  return c.json({ data: row });
});

// POST /restaurant/loyalty/:customerId/stamp
restaurantRouter.post("/loyalty/:customerId/stamp", async (c) => {
  const orgId = getOrgId(c);
  const customerId = c.req.param("customerId");
  const body = await c.req.json();
  const count = Math.max(1, parseInt(body.count) || 1);
  const goal = body.stampsGoal ? parseInt(body.stampsGoal) : 10;

  // Upsert using raw SQL for ON CONFLICT — Drizzle doesn't support on-conflict-do-update portably
  const result = await pool.query(
    `INSERT INTO loyalty_stamps (org_id, customer_id, stamps_count, stamps_goal, last_stamp_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
     ON CONFLICT (org_id, customer_id)
     DO UPDATE SET
       stamps_count  = loyalty_stamps.stamps_count + $3,
       last_stamp_at = NOW(),
       updated_at    = NOW()
     RETURNING *`,
    [orgId, customerId, count, goal]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// POST /restaurant/loyalty/:customerId/redeem
restaurantRouter.post("/loyalty/:customerId/redeem", async (c) => {
  const orgId = getOrgId(c);
  const customerId = c.req.param("customerId");

  const [card] = await db
    .select()
    .from(loyaltyStamps)
    .where(and(eq(loyaltyStamps.orgId, orgId), eq(loyaltyStamps.customerId, customerId)));

  if (!card) return c.json({ error: "No loyalty card found" }, 404);
  if (card.stampsCount < card.stampsGoal) {
    return c.json({ error: `يحتاج ${card.stampsGoal - card.stampsCount} طابع إضافي للاستبدال` }, 400);
  }

  const [updated] = await db
    .update(loyaltyStamps)
    .set({
      stampsCount: sql`${loyaltyStamps.stampsCount} - ${loyaltyStamps.stampsGoal}`,
      freeItemsRedeemed: sql`${loyaltyStamps.freeItemsRedeemed} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(loyaltyStamps.orgId, orgId), eq(loyaltyStamps.customerId, customerId)))
    .returning();

  insertAuditLog({ orgId, userId: getUserId(c), action: "edit", resource: "loyalty_redeem", resourceId: customerId });
  return c.json({ data: updated });
});

// ─────────────────────────────────────────────────
// MENU ITEM INGREDIENTS (cost cards)
// ─────────────────────────────────────────────────

// GET /restaurant/ingredients/:itemId
restaurantRouter.get("/ingredients/:itemId", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM menu_item_ingredients WHERE item_id = $1 AND org_id = $2 ORDER BY name ASC`,
    [c.req.param("itemId"), orgId]
  );
  return c.json({ data: result.rows });
});

// POST /restaurant/ingredients/:itemId
restaurantRouter.post("/ingredients/:itemId", async (c) => {
  const orgId = getOrgId(c);
  const itemId = c.req.param("itemId");
  const body = await c.req.json();

  if (!body.name?.trim()) return c.json({ error: "Name required" }, 400);

  const result = await pool.query(
    `INSERT INTO menu_item_ingredients (org_id, item_id, name, quantity, unit, cost)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (item_id, name) DO UPDATE SET
       quantity = EXCLUDED.quantity,
       unit     = EXCLUDED.unit,
       cost     = EXCLUDED.cost
     RETURNING *`,
    [orgId, itemId, body.name.trim(), body.quantity || 1, body.unit || "g", body.cost || 0]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// DELETE /restaurant/ingredients/:id
restaurantRouter.delete("/ingredients/:id", async (c) => {
  const orgId = getOrgId(c);
  await pool.query(`DELETE FROM menu_item_ingredients WHERE id = $1 AND org_id = $2`, [c.req.param("id"), orgId]);
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────
// BOOKING SETTINGS — sections + config
// ─────────────────────────────────────────────────

// GET /restaurant/booking-settings
restaurantRouter.get("/booking-settings", async (c) => {
  const orgId = getOrgId(c);
  const [sections, config] = await Promise.all([
    pool.query(
      `SELECT * FROM restaurant_sections WHERE org_id = $1 ORDER BY sort_order ASC, name ASC`,
      [orgId]
    ),
    pool.query(
      `SELECT * FROM restaurant_booking_config WHERE org_id = $1`,
      [orgId]
    ),
  ]);
  return c.json({
    data: {
      sections: sections.rows,
      config: config.rows[0] || null,
    },
  });
});

// PUT /restaurant/booking-settings  (upsert config)
restaurantRouter.put("/booking-settings", async (c) => {
  const orgId = getOrgId(c);
  const b = await c.req.json();

  const result = await pool.query(
    `INSERT INTO restaurant_booking_config (
       org_id, min_guests, max_guests, slot_duration_min,
       advance_booking_days, min_notice_hours,
       waitlist_enabled, auto_confirm, special_requests_enabled,
       max_concurrent_per_slot, turnover_time_min,
       deposit_required, deposit_amount, cancellation_hours, notes,
       updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
     ON CONFLICT (org_id) DO UPDATE SET
       min_guests               = EXCLUDED.min_guests,
       max_guests               = EXCLUDED.max_guests,
       slot_duration_min        = EXCLUDED.slot_duration_min,
       advance_booking_days     = EXCLUDED.advance_booking_days,
       min_notice_hours         = EXCLUDED.min_notice_hours,
       waitlist_enabled         = EXCLUDED.waitlist_enabled,
       auto_confirm             = EXCLUDED.auto_confirm,
       special_requests_enabled = EXCLUDED.special_requests_enabled,
       max_concurrent_per_slot  = EXCLUDED.max_concurrent_per_slot,
       turnover_time_min        = EXCLUDED.turnover_time_min,
       deposit_required         = EXCLUDED.deposit_required,
       deposit_amount           = EXCLUDED.deposit_amount,
       cancellation_hours       = EXCLUDED.cancellation_hours,
       notes                    = EXCLUDED.notes,
       updated_at               = NOW()
     RETURNING *`,
    [
      orgId,
      b.minGuests ?? 1,
      b.maxGuests ?? 12,
      b.slotDurationMin ?? 60,
      b.advanceBookingDays ?? 30,
      b.minNoticeHours ?? 2,
      b.waitlistEnabled ?? false,
      b.autoConfirm ?? false,
      b.specialRequestsEnabled ?? true,
      b.maxConcurrentPerSlot ?? 5,
      b.turnoverTimeMin ?? 15,
      b.depositRequired ?? false,
      b.depositAmount ?? 0,
      b.cancellationHours ?? 24,
      b.notes ?? null,
    ]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "edit", resource: "restaurant_booking_config", resourceId: orgId });
  return c.json({ data: result.rows[0] });
});

// POST /restaurant/sections
restaurantRouter.post("/sections", async (c) => {
  const orgId = getOrgId(c);
  const b = await c.req.json();
  if (!b.name?.trim()) return c.json({ error: "Name required" }, 400);

  const result = await pool.query(
    `INSERT INTO restaurant_sections (org_id, name, name_en, capacity, is_active, sort_order, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [orgId, b.name.trim(), b.nameEn || null, b.capacity ?? 20, b.isActive ?? true, b.sortOrder ?? 0, b.notes || null]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// PUT /restaurant/sections/:id
restaurantRouter.put("/sections/:id", async (c) => {
  const orgId = getOrgId(c);
  const b = await c.req.json();
  const result = await pool.query(
    `UPDATE restaurant_sections SET
       name       = COALESCE($1, name),
       name_en    = COALESCE($2, name_en),
       capacity   = COALESCE($3, capacity),
       is_active  = COALESCE($4, is_active),
       sort_order = COALESCE($5, sort_order),
       notes      = COALESCE($6, notes),
       updated_at = NOW()
     WHERE id = $7 AND org_id = $8 RETURNING *`,
    [b.name?.trim() || null, b.nameEn ?? null, b.capacity ?? null,
     b.isActive ?? null, b.sortOrder ?? null, b.notes ?? null,
     c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// PATCH /restaurant/sections/:id/toggle
restaurantRouter.patch("/sections/:id/toggle", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE restaurant_sections SET is_active = NOT is_active, updated_at = NOW()
     WHERE id = $1 AND org_id = $2 RETURNING *`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /restaurant/sections/:id
restaurantRouter.delete("/sections/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `DELETE FROM restaurant_sections WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────

// GET /restaurant/analytics?from=&to=
restaurantRouter.get("/analytics", async (c) => {
  const orgId = getOrgId(c);
  const today = new Date().toISOString().split("T")[0];
  const from = c.req.query("from") || today;
  const to   = c.req.query("to")   || today;

  // Top-selling items
  const topItems = await pool.query(
    `SELECT
       mi.id, mi.name, mi.price,
       COUNT(oo.id)                                      AS order_count,
       SUM(oo.total_amount)                              AS total_revenue,
       ROUND(AVG(oo.total_amount)::numeric, 2)           AS avg_ticket
     FROM online_orders oo
     JOIN menu_items mi ON mi.org_id = oo.org_id
     WHERE oo.org_id = $1
       AND DATE(oo.created_at) BETWEEN $2 AND $3
       AND oo.status NOT IN ('cancelled')
     GROUP BY mi.id, mi.name, mi.price
     ORDER BY order_count DESC
     LIMIT 10`,
    [orgId, from, to]
  );

  // Revenue by hour
  const byHour = await pool.query(
    `SELECT
       EXTRACT(HOUR FROM created_at)::int AS hour,
       COUNT(*)                           AS orders,
       SUM(total_amount)                  AS revenue
     FROM online_orders
     WHERE org_id = $1
       AND DATE(created_at) BETWEEN $2 AND $3
       AND status NOT IN ('cancelled')
     GROUP BY hour ORDER BY hour`,
    [orgId, from, to]
  );

  // Food cost per item (uses menu_item_ingredients)
  const costCards = await pool.query(
    `SELECT
       mi.id, mi.name, mi.price,
       COALESCE(SUM(ing.quantity * ing.cost), 0) AS ingredient_cost,
       CASE
         WHEN mi.price > 0 THEN ROUND((COALESCE(SUM(ing.quantity * ing.cost), 0) / mi.price * 100)::numeric, 1)
         ELSE 0
       END AS food_cost_pct
     FROM menu_items mi
     LEFT JOIN menu_item_ingredients ing ON ing.item_id = mi.id
     WHERE mi.org_id = $1 AND mi.is_active = true
     GROUP BY mi.id, mi.name, mi.price
     ORDER BY food_cost_pct DESC`,
    [orgId]
  );

  // Daily totals
  const dailyTotals = await pool.query(
    `SELECT
       DATE(created_at)  AS date,
       COUNT(*)          AS orders,
       SUM(total_amount) AS revenue,
       COUNT(DISTINCT customer_id) AS unique_customers
     FROM online_orders
     WHERE org_id = $1
       AND DATE(created_at) BETWEEN $2 AND $3
       AND status NOT IN ('cancelled')
     GROUP BY DATE(created_at) ORDER BY date`,
    [orgId, from, to]
  );

  // Summary
  const summary = await pool.query(
    `SELECT
       COUNT(*)                                  AS total_orders,
       COALESCE(SUM(total_amount), 0)            AS total_revenue,
       COALESCE(AVG(total_amount), 0)            AS avg_ticket,
       COUNT(DISTINCT customer_id)               AS unique_customers,
       COUNT(*) FILTER (WHERE order_type = 'dine_in')  AS dine_in,
       COUNT(*) FILTER (WHERE order_type = 'takeaway') AS takeaway,
       COUNT(*) FILTER (WHERE order_type = 'delivery') AS delivery
     FROM online_orders
     WHERE org_id = $1
       AND DATE(created_at) BETWEEN $2 AND $3
       AND status NOT IN ('cancelled')`,
    [orgId, from, to]
  );

  return c.json({
    data: {
      summary:    summary.rows[0],
      topItems:   topItems.rows,
      byHour:     byHour.rows,
      costCards:  costCards.rows,
      daily:      dailyTotals.rows,
    },
  });
});
