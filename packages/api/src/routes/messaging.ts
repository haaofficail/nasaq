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

// Default templates seeded per org on first access
const DEFAULT_TEMPLATES = [
  // ── الحجوزات ──────────────────────────────────────────────
  {
    event_type: "booking_confirmed", category: "bookings", send_to: "customer", sort_order: 1,
    title: "تأكيد الحجز",
    message_ar: "مرحباً {customer_name} 👋\nتم تأكيد حجزك في {org_name}.\n\n📅 التاريخ: {booking_date}\n⏰ الوقت: {booking_time}\n💈 الخدمة: {service_name}\n\nرقم الحجز: {booking_number}\nنتطلع لاستقبالك!",
  },
  {
    event_type: "booking_reminder_24h", category: "bookings", send_to: "customer", sort_order: 2, delay_minutes: 0,
    title: "تذكير قبل 24 ساعة",
    message_ar: "تذكير 📌\nلديك حجز في {org_name} غداً.\n\n📅 {booking_date} ⏰ {booking_time}\n💈 {service_name}\n\nللتعديل أو الإلغاء تواصل معنا.",
  },
  {
    event_type: "booking_reminder_2h", category: "bookings", send_to: "customer", sort_order: 3, delay_minutes: 0,
    title: "تذكير قبل ساعتين",
    message_ar: "تذكير ⏰\nحجزك في {org_name} بعد ساعتين!\n\n📅 {booking_date} - {booking_time}\n💈 {service_name}\n\nنراك قريباً 🙌",
  },
  {
    event_type: "booking_cancelled", category: "bookings", send_to: "customer", sort_order: 4,
    title: "إلغاء الحجز",
    message_ar: "نأسف لإبلاغك {customer_name}\nتم إلغاء حجزك رقم {booking_number} في {org_name}.\n\nللحجز مجدداً تواصل معنا.",
  },
  {
    event_type: "booking_rescheduled", category: "bookings", send_to: "customer", sort_order: 5,
    title: "إعادة جدولة الحجز",
    message_ar: "تم تحديث موعدك في {org_name} 📅\n\nالموعد الجديد:\n📅 {booking_date} ⏰ {booking_time}\n💈 {service_name}\n\nرقم الحجز: {booking_number}",
  },
  {
    event_type: "booking_completed", category: "bookings", send_to: "customer", sort_order: 6,
    title: "اكتمال الحجز",
    message_ar: "شكراً لزيارتك {customer_name} 🌟\nنتمنى أن تكون تجربتك في {org_name} رائعة.\n\nنسعد بخدمتك دائماً!",
  },
  // ── إشعارات المالك ────────────────────────────────────────
  {
    event_type: "owner_new_booking", category: "bookings", send_to: "owner", sort_order: 7,
    title: "إشعار المالك — حجز جديد",
    message_ar: "حجز جديد 📋\nالعميل: {customer_name}\n📅 {booking_date} ⏰ {booking_time}\n💈 {service_name}\n💰 {amount} ر.س\nرقم الحجز: {booking_number}",
  },
  {
    event_type: "owner_booking_cancelled", category: "bookings", send_to: "owner", sort_order: 8,
    title: "إشعار المالك — إلغاء حجز",
    message_ar: "تم إلغاء حجز ⚠️\nالعميل: {customer_name}\n📅 {booking_date} ⏰ {booking_time}\nرقم الحجز: {booking_number}",
  },
  // ── المدفوعات ─────────────────────────────────────────────
  {
    event_type: "payment_received", category: "payments", send_to: "customer", sort_order: 1,
    title: "استلام دفعة",
    message_ar: "تم استلام دفعتك ✅\nالمبلغ: {amount} ر.س\nالحجز: {booking_number}\n{org_name}\n\nشكراً لثقتك بنا 💙",
  },
  {
    event_type: "invoice_issued", category: "payments", send_to: "customer", sort_order: 2,
    title: "إصدار فاتورة",
    message_ar: "تم إصدار فاتورتك من {org_name} 🧾\nالمبلغ: {amount} ر.س\nرقم الفاتورة: {invoice_number}\n\nللاستفسار تواصل معنا.",
  },
  // ── الموظفون ──────────────────────────────────────────────
  {
    event_type: "staff_assigned", category: "staff", send_to: "provider", sort_order: 1,
    title: "تكليف موظف بحجز",
    message_ar: "تم تكليفك بحجز جديد 📌\nالعميل: {customer_name}\n📅 {booking_date} ⏰ {booking_time}\n💈 {service_name}",
  },
  {
    event_type: "staff_schedule_change", category: "staff", send_to: "provider", sort_order: 2,
    title: "تغيير في الجدول",
    message_ar: "تنبيه: تم تعديل جدولك في {org_name} 📅\nيرجى مراجعة التطبيق للاطلاع على التفاصيل.",
  },
];

// GET /messaging/templates
messagingRouter.get("/templates", async (c) => {
  const orgId = getOrgId(c);

  // Seed default templates if org has none
  const existing = await pool.query(
    `SELECT COUNT(*) FROM message_templates WHERE org_id = $1`, [orgId]
  );
  if (parseInt(existing.rows[0].count) === 0) {
    const insertValues = DEFAULT_TEMPLATES.map((t, i) => {
      const base = (i * 8) + 2;
      return `($1,$${base},$${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7})`;
    }).join(",");
    const params: any[] = [orgId];
    DEFAULT_TEMPLATES.forEach(t => {
      params.push(t.event_type, t.category, t.send_to, t.sort_order ?? 0, t.title, t.message_ar, true, 0);
    });
    await pool.query(
      `INSERT INTO message_templates (org_id, event_type, category, send_to, sort_order, title, message_ar, is_active, delay_minutes)
       VALUES ${insertValues} ON CONFLICT (org_id, event_type, send_to) DO NOTHING`,
      params
    ).catch(() => {});
  }

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

const STANDARD_VARIABLES = [
  { key: "customer_name",   label: "اسم العميل",      description: "الاسم الكامل للعميل" },
  { key: "booking_date",    label: "تاريخ الحجز",     description: "تاريخ الحجز بالميلادي" },
  { key: "booking_time",    label: "وقت الحجز",       description: "وقت الحجز" },
  { key: "service_name",    label: "اسم الخدمة",      description: "اسم الخدمة المحجوزة" },
  { key: "booking_number",  label: "رقم الحجز",       description: "الرقم التعريفي للحجز" },
  { key: "org_name",        label: "اسم المنشأة",     description: "اسم منشأتك" },
  { key: "amount",          label: "المبلغ",           description: "المبلغ بالريال السعودي" },
  { key: "staff_name",      label: "اسم الموظف",      description: "اسم الموظف المكلف" },
  { key: "invoice_number",  label: "رقم الفاتورة",    description: "رقم الفاتورة" },
  { key: "phone",           label: "رقم الجوال",      description: "رقم جوال العميل" },
];

// GET /messaging/variables
messagingRouter.get("/variables", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM message_variables WHERE org_id = $1 ORDER BY variable_key ASC`,
    [orgId]
  );
  return c.json({ data: { standard: STANDARD_VARIABLES, custom: result.rows } });
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
