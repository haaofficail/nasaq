import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { postCreditSale, reverseJournalEntry } from "../lib/posting-engine";
import { applyBlueprint, createProjectFromService, type OverridePolicy } from "../lib/execution-engine";

export const serviceOrdersRouter = new Hono();

// ─── Status transition rules ──────────────────────────────────────────────────
const SERVICE_ORDER_STATUSES = [
  "draft", "deposit_pending", "confirmed", "scheduled",
  "preparing", "ready", "dispatched", "in_setup",
  "completed_on_site", "returned", "inspected",
  "closed", "cancelled",
] as const;

const serviceOrderStatusEnum = z.enum(SERVICE_ORDER_STATUSES);

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:             ["confirmed","deposit_pending","cancelled"],
  deposit_pending:   ["confirmed","cancelled"],
  confirmed:         ["scheduled","preparing","cancelled"],
  scheduled:         ["preparing","cancelled"],
  preparing:         ["ready"],
  ready:             ["dispatched"],
  dispatched:        ["in_setup"],
  in_setup:          ["completed_on_site"],
  completed_on_site: ["returned"],
  returned:          ["inspected"],
  inspected:         ["closed"],
  closed:            [],
  cancelled:         [],
};

// Terminal statuses — no edits allowed
const TERMINAL_STATUSES = new Set(["closed", "cancelled"]);

// ─── GET / — قائمة طلبات الخدمة ──────────────────────────────────────────────

serviceOrdersRouter.get("/", async (c) => {
  const orgId    = getOrgId(c);
  const status   = c.req.query("status") ?? "";
  const type     = c.req.query("type") ?? "";
  const dateFrom = c.req.query("date_from") ?? "";
  const dateTo   = c.req.query("date_to") ?? "";

  const conditions: string[] = ["org_id = $1"];
  const params: any[] = [orgId];

  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (type)   { params.push(type);   conditions.push(`type = $${params.length}`); }
  if (dateFrom) { params.push(dateFrom); conditions.push(`event_date >= $${params.length}`); }
  if (dateTo)   { params.push(dateTo);   conditions.push(`event_date <= $${params.length}`); }

  const where = conditions.join(" AND ");
  const { rows } = await pool.query(
    `SELECT so.*,
       (SELECT COUNT(*)::int FROM service_order_items WHERE service_order_id = so.id) AS items_count,
       (SELECT COUNT(*)::int FROM decor_asset_reservations WHERE service_order_id = so.id) AS assets_count,
       (SELECT COUNT(*)::int FROM material_reservations WHERE service_order_id = so.id AND status='reserved') AS materials_reserved
     FROM service_orders so
     WHERE ${where}
     ORDER BY
       CASE WHEN so.event_date IS NULL THEN 1 ELSE 0 END,
       so.event_date ASC,
       so.created_at DESC`,
    params
  );
  return c.json({ data: rows });
});

// ─── POST / — إنشاء مشروع ميداني (المسار الرسمي عبر createProjectFromService) ─

serviceOrdersRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();

  const {
    service_id, customer_name, customer_phone, event_date, event_time,
    event_location, description, notes, deposit_amount, total_amount,
    team_size, template_id: overrideTemplateId,
    order_kind, type: orderType,
  } = body;

  if (!customer_name) {
    return c.json({ error: "اسم العميل مطلوب" }, 400);
  }

  // ── مسار الحجز / البيع (بدون service_id أو خدمة غير تنفيذية) ─────────────
  if (!service_id) {
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)+1 AS next FROM service_orders WHERE org_id=$1`, [orgId]
    );
    const orderNumber = `SO-${new Date().getFullYear()}-${String(countRows[0].next).padStart(4, "0")}`;
    const { rows } = await pool.query(
      `INSERT INTO service_orders
         (org_id, order_number, type, customer_name, customer_phone,
          event_date, event_time, event_location, description, notes,
          deposit_amount, total_amount, team_size, order_kind)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        orgId, orderNumber, orderType ?? "custom_arrangement",
        customer_name, customer_phone ?? null,
        event_date ?? null, event_time ?? null, event_location ?? null,
        description ?? null, notes ?? null,
        deposit_amount ?? null, total_amount ?? null,
        team_size ?? 1, order_kind ?? "booking",
      ]
    );
    insertAuditLog({ orgId, userId, action: "create", resource: "service_order", resourceId: rows[0].id });
    return c.json({ data: rows[0] }, 201);
  }

  try {
    const { order, blueprint } = await createProjectFromService(pool, {
      orgId, userId,
      serviceId:         service_id,
      customerName:      customer_name,
      customerPhone:     customer_phone     ?? null,
      eventDate:         event_date         ?? null,
      eventTime:         event_time         ?? null,
      eventLocation:     event_location     ?? null,
      description:       description        ?? null,
      notes:             notes              ?? null,
      depositAmount:     deposit_amount     ?? null,
      totalAmount:       total_amount       ?? null,
      teamSize:          team_size          ?? 1,
      overrideTemplateId: overrideTemplateId ?? null,
      orderKind:         order_kind         ?? "project",
    });

    insertAuditLog({ orgId, userId, action: "create", resource: "service_order", resourceId: order.id as string });

    return c.json({
      data: order,
      ...(blueprint ? { blueprint } : {}),
    }, 201);
  } catch (err: any) {
    if (err?.status === 404) return c.json({ error: err.message }, 404);
    throw err;
  }
});

// ─── GET /:id — تفاصيل الطلب ─────────────────────────────────────────────────

serviceOrdersRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const [orderRes, itemsRes, assetsRes, materialsRes, inspectionRes, staffRes] = await Promise.all([
    pool.query(`SELECT so.*, c.email AS customer_email,
       s.name AS service_name, s.short_description AS service_desc, s.base_price AS service_base_price
       FROM service_orders so
       LEFT JOIN customers c ON c.id = so.customer_id
       LEFT JOIN services s  ON s.id  = so.service_id
       WHERE so.id=$1 AND so.org_id=$2`, [id, orgId]),
    pool.query(
      `SELECT soi.*, fv.flower_type, fv.color, fv.display_name_ar,
              da.name AS asset_name, da.category AS asset_category
       FROM service_order_items soi
       LEFT JOIN flower_variants fv ON fv.id = soi.variant_id
       LEFT JOIN decor_assets da ON da.id = soi.asset_id
       WHERE soi.service_order_id = $1 ORDER BY soi.created_at ASC`, [id]
    ),
    pool.query(
      `SELECT ar.*, da.name AS asset_name, da.category, da.status AS current_status
       FROM decor_asset_reservations ar
       JOIN decor_assets da ON da.id = ar.asset_id
       WHERE ar.service_order_id = $1`, [id]
    ),
    pool.query(
      `SELECT mr.*, fv.flower_type, fv.color, fv.display_name_ar
       FROM material_reservations mr
       JOIN flower_variants fv ON fv.id = mr.variant_id
       WHERE mr.service_order_id = $1`, [id]
    ),
    pool.query(
      `SELECT * FROM return_inspections WHERE service_order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    ),
    pool.query(
      `SELECT sos.id, sos.role, sos.assigned_at,
              e.full_name, e.job_title, e.department, e.status AS employee_status
       FROM service_order_staff sos
       JOIN hr_employees e ON e.id = sos.employee_id
       WHERE sos.service_order_id = $1 ORDER BY sos.assigned_at ASC`, [id]
    ),
  ]);

  if (!orderRes.rows[0]) return c.json({ error: "الطلب غير موجود" }, 404);

  return c.json({
    data: {
      ...orderRes.rows[0],
      items:       itemsRes.rows,
      assets:      assetsRes.rows,
      materials:   materialsRes.rows,
      inspection:  inspectionRes.rows[0] ?? null,
      staff:       staffRes.rows,
    },
  });
});

// ─── PUT /:id — تعديل بيانات الطلب ──────────────────────────────────────────

serviceOrdersRouter.put("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body   = await c.req.json();

  // Verify order exists and check terminal status
  const { rows: existing } = await pool.query(
    `SELECT status FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!existing[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  if (TERMINAL_STATUSES.has(existing[0].status)) {
    return c.json({ error: `لا يمكن تعديل طلب في حالة "${existing[0].status}"` }, 422);
  }

  const {
    customer_name, customer_phone, event_date, event_time,
    event_location, description, notes, deposit_amount,
    total_amount, team_size, internal_notes,
  } = body;

  const { rows } = await pool.query(
    `UPDATE service_orders SET
       customer_name   = COALESCE($3, customer_name),
       customer_phone  = COALESCE($4, customer_phone),
       event_date      = COALESCE($5, event_date),
       event_time      = COALESCE($6, event_time),
       event_location  = COALESCE($7, event_location),
       description     = COALESCE($8, description),
       notes           = COALESCE($9, notes),
       deposit_amount  = COALESCE($10, deposit_amount),
       total_amount    = COALESCE($11, total_amount),
       team_size       = COALESCE($12, team_size),
       internal_notes  = COALESCE($13, internal_notes),
       updated_at      = NOW()
     WHERE id=$1 AND org_id=$2
     RETURNING *`,
    [id, orgId, customer_name, customer_phone, event_date, event_time,
     event_location, description, notes, deposit_amount, total_amount,
     team_size, internal_notes]
  );
  if (!rows[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  insertAuditLog({ orgId, userId, action: "update", resource: "service_order", resourceId: id });
  return c.json({ data: rows[0] });
});

// ─── PATCH /:id/status — تغيير حالة الطلب ────────────────────────────────────

serviceOrdersRouter.patch("/:id/status", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();

  // ── Validate with Zod ─────────────────────────────────────────
  const parsed = z.object({
    status: serviceOrderStatusEnum,
    notes: z.string().optional(),
    cancellationReason: z.string().optional(),
  }).safeParse(await c.req.json());

  if (!parsed.success) {
    return c.json({ error: "حالة غير صالحة", details: parsed.error.errors }, 400);
  }
  const { status, notes, cancellationReason } = parsed.data;

  // ── Fetch current order with version ──────────────────────────
  const { rows: current } = await pool.query(
    `SELECT id, status, version, journal_entry_id, total_amount, customer_name,
            order_number, customer_id
     FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!current[0]) return c.json({ error: "الطلب غير موجود" }, 404);

  const allowed = VALID_TRANSITIONS[current[0].status] ?? [];
  if (!allowed.includes(status)) {
    return c.json({
      error: `لا يمكن الانتقال من "${current[0].status}" إلى "${status}"`,
    }, 422);
  }

  // ── Atomic: status change + version bump + financial posting ──
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const setFields: string[] = [`status = $3`, `updated_at = NOW()`, `version = version + 1`];
    const queryParams: any[] = [id, orgId, status];

    if (notes) {
      queryParams.push(notes);
      setFields.push(`internal_notes = COALESCE($${queryParams.length}, internal_notes)`);
    }

    if (status === "cancelled") {
      queryParams.push(new Date());
      setFields.push(`cancelled_at = $${queryParams.length}`);
      queryParams.push(cancellationReason || null);
      setFields.push(`cancellation_reason = $${queryParams.length}`);
      queryParams.push(userId || null);
      setFields.push(`cancelled_by = $${queryParams.length}`);
    }

    // Version check for optimistic locking
    queryParams.push(current[0].version);
    const versionCheck = `AND version = $${queryParams.length}`;

    const { rows } = await client.query(
      `UPDATE service_orders SET ${setFields.join(", ")}
       WHERE id=$1 AND org_id=$2 ${versionCheck}
       RETURNING *`,
      queryParams
    );

    if (!rows[0]) {
      await client.query("ROLLBACK");
      return c.json({ error: "الطلب تم تعديله بواسطة مستخدم آخر — أعد التحميل" }, 409);
    }

    const order = rows[0];

    // ── Financial posting when confirmed (with duplicate protection) ──
    if (status === "confirmed" && !current[0].journal_entry_id && order.total_amount && Number(order.total_amount) > 0) {
      try {
        const result = await postCreditSale({
          orgId,
          date: new Date(),
          amount: Number(order.total_amount),
          vatAmount: 0,
          description: `طلب خدمة ${order.order_number} — ${order.customer_name}`,
          sourceType: "booking",
          sourceId: id,
          createdBy: userId ?? undefined,
        });
        if (result?.entryId) {
          await client.query(
            `UPDATE service_orders SET journal_entry_id=$1 WHERE id=$2`,
            [result.entryId, id]
          );
        }
      } catch {
        // المحاسبة غير مُفعّلة — نكمل بدون قيد
      }
    }

    // ── Reverse financial entry on cancellation ─────────────────
    if (status === "cancelled" && current[0].journal_entry_id) {
      try {
        await reverseJournalEntry(
          current[0].journal_entry_id,
          userId ?? "system",
          `إلغاء طلب خدمة #${current[0].order_number}`
        );
      } catch {
        // تجاهل أخطاء المحاسبة
      }
    }

    // عند closed: حدّث إحصائيات العميل
    if (status === "closed" && order.customer_id) {
      await client.query(
        `UPDATE customers SET
           total_spent       = COALESCE(total_spent, 0) + $2,
           total_bookings    = COALESCE(total_bookings, 0) + 1,
           last_booking_at   = NOW(),
           updated_at        = NOW()
         WHERE id=$1`,
        [order.customer_id, Number(order.total_amount ?? 0)]
      );
    }

    // عند dispatched: غيّر حالة الأصول المحجوزة → in_use
    if (status === "dispatched") {
      const { rows: reservations } = await client.query(
        `SELECT asset_id FROM decor_asset_reservations WHERE service_order_id=$1 AND status='reserved'`,
        [id]
      );
      for (const r of reservations) {
        await client.query(
          `UPDATE decor_assets SET status='in_use', updated_at=NOW() WHERE id=$1`, [r.asset_id]
        );
        await client.query(
          `UPDATE decor_asset_reservations SET status='dispatched', updated_at=NOW()
           WHERE service_order_id=$1 AND asset_id=$2`,
          [id, r.asset_id]
        );
        await client.query(
          `INSERT INTO decor_asset_movements (asset_id, org_id, movement_type, reference_id, reference_label, notes, created_by)
           VALUES ($1,$2,'dispatched',$3,$4,$5,$6)`,
          [r.asset_id, orgId, id, `طلب ${order.order_number}`, notes ?? null, userId]
        );
      }
      // اخصم المواد المستهلكة
      const { rows: matRes } = await client.query(
        `SELECT * FROM material_reservations WHERE service_order_id=$1 AND status='reserved'`, [id]
      );
      for (const m of matRes) {
        if (m.batch_id) {
          await client.query(
            `UPDATE flower_batches SET quantity_remaining = GREATEST(0, quantity_remaining - $1), updated_at=NOW()
             WHERE id=$2 AND org_id=$3`,
            [m.quantity_stems, m.batch_id, orgId]
          );
        }
        await client.query(
          `UPDATE material_reservations SET status='consumed', updated_at=NOW() WHERE id=$1`, [m.id]
        );
      }
    }

    // عند cancelled: أطلق الحجوزات
    if (status === "cancelled") {
      await client.query(
        `UPDATE decor_asset_reservations SET status='returned_ok', updated_at=NOW()
         WHERE service_order_id=$1 AND status IN ('reserved','dispatched')`, [id]
      );
      await client.query(
        `UPDATE material_reservations SET status='released', updated_at=NOW()
         WHERE service_order_id=$1 AND status='reserved'`, [id]
      );
      // أرجع الأصول للمخزون
      const { rows: assetIds } = await client.query(
        `SELECT DISTINCT asset_id FROM decor_asset_reservations WHERE service_order_id=$1`, [id]
      );
      for (const a of assetIds) {
        await client.query(
          `UPDATE decor_assets SET status='available', updated_at=NOW()
           WHERE id=$1 AND org_id=$2 AND status IN ('reserved','in_use')`,
          [a.asset_id, orgId]
        );
      }
    }

    await client.query("COMMIT");

    // ── Audit with old/new status ───────────────────────────────
    insertAuditLog({
      orgId,
      userId,
      action: "update",
      resource: "service_order_status",
      resourceId: id,
      oldValue: { status: current[0].status },
      newValue: { status },
      metadata: { status, cancellationReason },
    });

    return c.json({ data: order });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ─── POST /:id/items — إضافة بند للطلب ───────────────────────────────────────

serviceOrdersRouter.post("/:id/items", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body   = await c.req.json();

  // تحقق أن الطلب موجود ولم يُغلق
  const { rows: order } = await pool.query(
    `SELECT status FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!order[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  if (["closed","cancelled"].includes(order[0].status)) {
    return c.json({ error: "لا يمكن تعديل طلب مغلق أو ملغي" }, 400);
  }

  const { item_type, variant_id, asset_id, description, quantity = 1,
          unit = "ساق", unit_cost = 0 } = body;

  if (!item_type || !description) {
    return c.json({ error: "نوع البند والوصف مطلوبان" }, 400);
  }

  const subtotal = Number(quantity) * Number(unit_cost);
  const { rows } = await pool.query(
    `INSERT INTO service_order_items
       (service_order_id, item_type, variant_id, asset_id, description,
        quantity, unit, unit_cost, subtotal)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [id, item_type, variant_id ?? null, asset_id ?? null, description,
     quantity, unit, unit_cost, subtotal]
  );

  // إذا كان أصلاً، أنشئ حجز
  if (item_type === "asset" && asset_id) {
    await pool.query(
      `INSERT INTO decor_asset_reservations (asset_id, service_order_id, org_id)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [asset_id, id, orgId]
    );
    await pool.query(
      `UPDATE decor_assets SET status='reserved', updated_at=NOW()
       WHERE id=$1 AND org_id=$2 AND status='available'`,
      [asset_id, orgId]
    );
    await pool.query(
      `INSERT INTO decor_asset_movements (asset_id, org_id, movement_type, reference_id, reference_label, created_by)
       VALUES ($1,$2,'reserved',$3,$4,$5)`,
      [asset_id, orgId, id, `طلب ${id}`, userId]
    );
  }

  // إذا كانت مادة طبيعية، أنشئ حجز مادة
  if (item_type === "consumable_natural" && variant_id) {
    await pool.query(
      `INSERT INTO material_reservations (variant_id, service_order_id, org_id, quantity_stems)
       VALUES ($1,$2,$3,$4)`,
      [variant_id, id, orgId, Math.ceil(quantity)]
    );
  }

  insertAuditLog({ orgId, userId, action: "create", resource: "service_order_item", resourceId: rows[0].id });
  return c.json({ data: rows[0] }, 201);
});

// ─── DELETE /:id/items/:itemId — حذف بند ─────────────────────────────────────

serviceOrdersRouter.delete("/:id/items/:itemId", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id, itemId } = c.req.param();

  // تحقق الطلب لم يُغلق
  const { rows: order } = await pool.query(
    `SELECT status FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!order[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  if (["closed","cancelled"].includes(order[0].status)) {
    return c.json({ error: "لا يمكن تعديل طلب مغلق أو ملغي" }, 400);
  }

  // اقرأ البند قبل الحذف
  const { rows: item } = await pool.query(
    `SELECT * FROM service_order_items WHERE id=$1 AND service_order_id=$2`, [itemId, id]
  );
  if (!item[0]) return c.json({ error: "البند غير موجود" }, 404);

  // أطلق حجز الأصل إن وجد
  if (item[0].item_type === "asset" && item[0].asset_id) {
    await pool.query(
      `DELETE FROM decor_asset_reservations WHERE service_order_id=$1 AND asset_id=$2`,
      [id, item[0].asset_id]
    );
    await pool.query(
      `UPDATE decor_assets SET status='available', updated_at=NOW()
       WHERE id=$1 AND org_id=$2 AND status='reserved'`,
      [item[0].asset_id, orgId]
    );
  }

  // أطلق حجز المادة إن وجد
  if (item[0].item_type === "consumable_natural" && item[0].variant_id) {
    await pool.query(
      `UPDATE material_reservations SET status='released', updated_at=NOW()
       WHERE service_order_id=$1 AND variant_id=$2 AND status='reserved'
       LIMIT 1`,
      [id, item[0].variant_id]
    );
  }

  await pool.query(`DELETE FROM service_order_items WHERE id=$1`, [itemId]);
  insertAuditLog({ orgId, userId, action: "delete", resource: "service_order_item", resourceId: itemId });
  return c.json({ data: { deleted: true } });
});

// ─── POST /:id/inspect — تسجيل فحص المرتجعات ─────────────────────────────────

serviceOrdersRouter.post("/:id/inspect", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const { assets_inspection = [], materials_waste = [], notes } = await c.req.json();

  // تحقق الطلب بحالة returned أو inspected
  const { rows: order } = await pool.query(
    `SELECT status, order_number FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!order[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  if (!["returned","inspected"].includes(order[0].status)) {
    return c.json({ error: "الطلب يجب أن يكون في مرحلة الإرجاع" }, 400);
  }

  // سجّل الفحص
  const { rows } = await pool.query(
    `INSERT INTO return_inspections
       (service_order_id, org_id, inspected_by, assets_inspection, materials_waste, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [id, orgId, userId, JSON.stringify(assets_inspection),
     JSON.stringify(materials_waste), notes ?? null]
  );

  // عالج حالة كل أصل بعد الفحص
  for (const assetInspection of assets_inspection) {
    const { assetId, status: assetStatus } = assetInspection;
    if (!assetId || !assetStatus) continue;

    // تحديث حالة حجز الأصل
    await pool.query(
      `UPDATE decor_asset_reservations SET status=$3, updated_at=NOW()
       WHERE service_order_id=$1 AND asset_id=$2`,
      [id, assetId, assetStatus]
    );

    // تحديث حالة الأصل نفسه
    const newAssetStatus =
      assetStatus === "returned_ok"          ? "available" :
      assetStatus === "maintenance_required" ? "maintenance" :
      assetStatus === "damaged"              ? "damaged" :
      "available";

    await pool.query(
      `UPDATE decor_assets SET status=$1, updated_at=NOW() WHERE id=$2 AND org_id=$3`,
      [newAssetStatus, assetId, orgId]
    );

    // سجّل الحركة
    await pool.query(
      `INSERT INTO decor_asset_movements
         (asset_id, org_id, movement_type, reference_id, reference_label, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [assetId, orgId,
       assetStatus === "returned_ok" ? "returned" :
       assetStatus === "maintenance_required" ? "maintenance" : "damaged",
       id, `طلب ${order[0].order_number}`,
       assetInspection.notes ?? null, userId]
    );
  }

  // سجّل هدر المواد
  for (const waste of materials_waste) {
    if (waste.variantId && waste.qty_wasted > 0) {
      await pool.query(
        `INSERT INTO flower_waste_logs
           (org_id, variant_id, quantity_type, quantity, reason, notes, recorded_by)
         VALUES ($1,$2,'stems',$3,'damage',$4,$5)`,
        [orgId, waste.variantId, waste.qty_wasted,
         `هدر من طلب ${order[0].order_number}`, userId]
      );
    }
  }

  // انقل الطلب لـ inspected
  await pool.query(
    `UPDATE service_orders SET status='inspected', updated_at=NOW() WHERE id=$1 AND org_id=$2`,
    [id, orgId]
  );

  insertAuditLog({ orgId, userId, action: "create", resource: "return_inspection", resourceId: rows[0].id });
  return c.json({ data: rows[0] }, 201);
});

// ─── POST /:id/apply-package — تطبيق قالب كـ blueprint على طلب ───────────────

serviceOrdersRouter.post("/:id/apply-package", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body   = await c.req.json();

  const template_id: string | undefined         = body.template_id;
  const rawPolicy:   string | undefined         = body.policy;
  const VALID_POLICIES: OverridePolicy[]        = ["skip_if_applied", "replace_all", "merge"];
  const policy: OverridePolicy                  =
    VALID_POLICIES.includes(rawPolicy as OverridePolicy)
      ? (rawPolicy as OverridePolicy)
      : "replace_all";   // الافتراضي عند التطبيق اليدوي = استبدال كامل

  if (!template_id) return c.json({ error: "template_id مطلوب" }, 400);

  // تحقق أن الطلب موجود وقابل للتعديل
  const { rows: order } = await pool.query(
    `SELECT status FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!order[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  if (["closed","cancelled"].includes(order[0].status)) {
    return c.json({ error: "لا يمكن تعديل طلب مغلق أو ملغي" }, 400);
  }

  // تطبيق blueprint — السياسة تتحكم في idempotency والاستبدال
  const result = await applyBlueprint(pool, id, template_id, orgId, policy);
  if (!result.skipped && result.applied === 0 && result.warnings.length > 0) {
    return c.json({ error: result.warnings[0] }, 404);
  }

  insertAuditLog({ orgId, userId, action: "update", resource: "service_order_apply_package", resourceId: id });
  return c.json({ data: result });
});

// ─── GET /:id/staff — موظفو الطلب ────────────────────────────────────────────

serviceOrdersRouter.get("/:id/staff", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const { rows: order } = await pool.query(
    `SELECT id FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!order[0]) return c.json({ error: "الطلب غير موجود" }, 404);

  const { rows } = await pool.query(
    `SELECT sos.id, sos.role, sos.assigned_at,
            e.id AS employee_id, e.full_name, e.job_title, e.department, e.status AS employee_status
     FROM service_order_staff sos
     JOIN hr_employees e ON e.id = sos.employee_id
     WHERE sos.service_order_id = $1 ORDER BY sos.assigned_at ASC`, [id]
  );
  return c.json({ data: rows });
});

// ─── POST /:id/staff — تعيين موظف للطلب ──────────────────────────────────────

serviceOrdersRouter.post("/:id/staff", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const { employee_id, role = "field_worker" } = await c.req.json();

  if (!employee_id) return c.json({ error: "employee_id مطلوب" }, 400);

  const { rows: order } = await pool.query(
    `SELECT status FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!order[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  if (["closed","cancelled"].includes(order[0].status)) {
    return c.json({ error: "لا يمكن تعديل طلب مغلق أو ملغي" }, 400);
  }

  // تحقق أن الموظف ينتمي لنفس المنشأة
  const { rows: emp } = await pool.query(
    `SELECT id, full_name, job_title FROM hr_employees WHERE id=$1 AND org_id=$2`, [employee_id, orgId]
  );
  if (!emp[0]) return c.json({ error: "الموظف غير موجود" }, 404);

  const { rows } = await pool.query(
    `INSERT INTO service_order_staff (service_order_id, org_id, employee_id, role, assigned_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (service_order_id, employee_id) DO UPDATE SET role=EXCLUDED.role
     RETURNING *`,
    [id, orgId, employee_id, role, userId]
  );

  insertAuditLog({ orgId, userId, action: "create", resource: "service_order_staff", resourceId: rows[0].id });
  return c.json({ data: { ...rows[0], full_name: emp[0].full_name, job_title: emp[0].job_title } }, 201);
});

// ─── DELETE /:id/staff/:staffId — إلغاء تعيين موظف ──────────────────────────

serviceOrdersRouter.delete("/:id/staff/:staffId", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id, staffId } = c.req.param();

  const { rows: order } = await pool.query(
    `SELECT status FROM service_orders WHERE id=$1 AND org_id=$2`, [id, orgId]
  );
  if (!order[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  if (["closed","cancelled"].includes(order[0].status)) {
    return c.json({ error: "لا يمكن تعديل طلب مغلق أو ملغي" }, 400);
  }

  await pool.query(
    `DELETE FROM service_order_staff WHERE id=$1 AND service_order_id=$2 AND org_id=$3`,
    [staffId, id, orgId]
  );

  insertAuditLog({ orgId, userId, action: "delete", resource: "service_order_staff", resourceId: staffId });
  return c.json({ data: { deleted: true } });
});

// ─── GET /stats — إحصائيات طلبات الخدمة ─────────────────────────────────────

serviceOrdersRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('closed','cancelled'))::int AS active,
       COUNT(*) FILTER (WHERE status='draft')::int AS draft,
       COUNT(*) FILTER (WHERE status IN ('confirmed','scheduled'))::int AS scheduled,
       COUNT(*) FILTER (WHERE status IN ('preparing','ready','dispatched','in_setup'))::int AS in_progress,
       COUNT(*) FILTER (WHERE status='returned')::int AS pending_inspection,
       COUNT(*) FILTER (WHERE event_date = CURRENT_DATE AND status NOT IN ('closed','cancelled'))::int AS today,
       COALESCE(SUM(total_amount) FILTER (WHERE status='closed'), 0) AS closed_revenue
     FROM service_orders WHERE org_id=$1`,
    [orgId]
  );
  return c.json({ data: rows[0] });
});
