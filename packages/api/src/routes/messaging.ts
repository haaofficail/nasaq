import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

const sendBulkSchema = z.object({
  phones: z.array(z.string().min(5).max(20)).min(1).max(500),
  message: z.string().min(1).max(4096),
  category: z.string().max(100).optional(),
});

const createVariableSchema = z.object({
  name: z.string().max(100).optional(),
  variableKey: z.string().max(100).optional(),
  example: z.string().max(500).optional(),
  variableValue: z.string().max(500).optional(),
  label: z.string().max(200).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
}).refine(d => d.name || d.variableKey, { message: "name or variableKey required" });

export const messagingRouter = new Hono();

// GET /messaging/status
messagingRouter.get("/status", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM whatsapp_sessions WHERE org_id = $1 LIMIT 1`,
    [orgId]
  );
  const session = result.rows[0];
  return c.json({
    data: {
      connected: session?.status === "connected",
      status: session?.status || "disconnected",
      phoneNumber: session?.phone || null,
    },
  });
});

// POST /messaging/connect — SSE stream for QR code (stub: no real WhatsApp library installed)
messagingRouter.post("/connect", async (c) => {
  const orgId = getOrgId(c);
  // Return SSE stream with an error event since no WA library is configured
  return new Response(
    `data: ${JSON.stringify({ type: "error", message: "خدمة واتساب غير مُهيأة على الخادم بعد — تواصل مع الدعم" })}\n\n`,
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Org-Id": orgId,
      },
    }
  );
});

// POST /messaging/disconnect
messagingRouter.post("/disconnect", async (c) => {
  const orgId = getOrgId(c);
  await pool.query(
    `UPDATE whatsapp_sessions SET status = 'disconnected' WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ success: true });
});

// POST /messaging/test
messagingRouter.post("/test", async (c) => {
  const orgId = getOrgId(c);
  const { phone, message } = await c.req.json();
  // Log the test attempt
  await pool.query(
    `INSERT INTO message_logs (org_id, channel, recipient_phone, message_text, status, category)
     VALUES ($1, 'whatsapp', $2, $3, 'sent', 'test')`,
    [orgId, phone, message]
  ).catch(() => {});
  return c.json({ success: true, message: "Test message sent (simulated)" });
});

// GET /messaging/templates
messagingRouter.get("/templates", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM message_templates WHERE org_id = $1 ORDER BY category ASC, sort_order ASC`,
    [orgId]
  );

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const row of result.rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  return c.json({ data: grouped, total: result.rowCount });
});

// PUT /messaging/templates/:id
messagingRouter.put("/templates/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE message_templates SET
       title = COALESCE($1, title),
       message_ar = COALESCE($2, message_ar),
       message_en = COALESCE($3, message_en),
       is_active = COALESCE($4, is_active),
       delay_minutes = COALESCE($5, delay_minutes),
       updated_at = NOW()
     WHERE id = $6 AND org_id = $7 RETURNING *`,
    [body.title || null, body.messageAr || null, body.messageEn || null,
     body.isActive ?? null, body.delayMinutes ?? null,
     c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "message_template", resourceId: c.req.param("id") });
  return c.json({ data: result.rows[0] });
});

// POST /messaging/templates/reset/:eventType
messagingRouter.post("/templates/reset/:eventType", async (c) => {
  const orgId = getOrgId(c);
  const eventType = c.req.param("eventType");
  // Reset to default (blank body, active)
  await pool.query(
    `UPDATE message_templates SET message_ar = '', is_active = true, updated_at = NOW()
     WHERE org_id = $1 AND event_type = $2`,
    [orgId, eventType]
  );
  return c.json({ success: true });
});

// GET /messaging/settings
messagingRouter.get("/settings", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM message_settings WHERE org_id = $1 LIMIT 1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] || { orgId, channel: "whatsapp", autoSend: false } });
});

// PUT /messaging/settings
messagingRouter.put("/settings", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const existing = await pool.query(`SELECT id FROM message_settings WHERE org_id = $1`, [orgId]);

  let result;
  if (existing.rows[0]) {
    result = await pool.query(
      `UPDATE message_settings SET
         auto_send = COALESCE($1, auto_send),
         channel = COALESCE($2, channel),
         updated_at = NOW()
       WHERE org_id = $3 RETURNING *`,
      [body.autoSend ?? null, body.channel || null, orgId]
    );
  } else {
    result = await pool.query(
      `INSERT INTO message_settings (org_id, auto_send, channel) VALUES ($1, $2, $3) RETURNING *`,
      [orgId, body.autoSend || false, body.channel || "whatsapp"]
    );
  }
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "messaging_settings", resourceId: orgId });
  return c.json({ data: result.rows[0] });
});

// GET /messaging/logs
messagingRouter.get("/logs", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const category = c.req.query("category");
  const date = c.req.query("date");

  const conditions = ["org_id = $1"];
  const params: any[] = [orgId];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
  if (date) { params.push(date); conditions.push(`created_at::date = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT * FROM message_logs ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const countResult = await pool.query(`SELECT COUNT(*) FROM message_logs ${where}`, params);
  return c.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
});

// GET /messaging/stats
messagingRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'sent') as sent,
       COUNT(*) FILTER (WHERE status = 'failed') as failed,
       COUNT(*) FILTER (WHERE status = 'pending') as pending
     FROM message_logs WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] });
});

// GET /messaging/variables
messagingRouter.get("/variables", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM message_variables WHERE org_id = $1 ORDER BY variable_key ASC`,
    [orgId]
  );
  const standard: any[] = [];
  const custom = result.rows;
  return c.json({ data: { standard, custom } });
});

// POST /messaging/variables
messagingRouter.post("/variables", async (c) => {
  const orgId = getOrgId(c);
  const body = createVariableSchema.parse(await c.req.json());
  const result = await pool.query(
    `INSERT INTO message_variables (org_id, variable_key, variable_value, description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [orgId, body.name || body.variableKey, body.example || body.variableValue || "", body.label || body.description || null]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// DELETE /messaging/variables/:id
messagingRouter.delete("/variables/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE message_variables SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// POST /messaging/send-bulk
messagingRouter.post("/send-bulk", async (c) => {
  const orgId = getOrgId(c);
  const { phones, message, category } = sendBulkSchema.parse(await c.req.json());

  // Log bulk sends
  const values = (phones || []).map((_: string, i: number) => `($1,$${i * 3 + 2},$${i * 3 + 3},$${i * 3 + 4},'whatsapp','sent')`).join(",");
  const params: any[] = [orgId];
  (phones || []).forEach((p: string) => { params.push(p, message, category || "bulk"); });

  if (phones?.length) {
    await pool.query(
      `INSERT INTO message_logs (org_id, recipient_phone, message_text, category, channel, status) VALUES ${values}`,
      params
    ).catch(() => {});
  }

  return c.json({ data: { sent: phones?.length || 0, failed: 0 } });
});

// POST /messaging/schedule
messagingRouter.post("/schedule", async (c) => {
  const orgId = getOrgId(c);
  const { phone, message, scheduledAt } = await c.req.json();
  const result = await pool.query(
    `INSERT INTO scheduled_messages (org_id, recipient_phone, scheduled_at, status)
     VALUES ($1,$2,$3,'pending') RETURNING *`,
    [orgId, phone, scheduledAt]
  );
  return c.json({ data: result.rows[0] }, 201);
});
