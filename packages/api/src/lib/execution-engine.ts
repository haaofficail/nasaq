/**
 * Execution Engine — محرك التنفيذ الميداني
 *
 * المسؤوليات:
 *   1. applyBlueprint  — تحويل قالب حدث إلى بنود تنفيذية على طلب موجود
 *   2. createProjectFromService — المسار الرسمي الوحيد لإنشاء مشروع ميداني
 *
 * المبادئ:
 *   - بدون أي حجز للأصول أو المخزون (blueprint only)
 *   - كل عملية داخل transaction
 *   - idempotency عبر OverridePolicy
 *   - org_id مُتحقَّق منه في كل query
 */

import { pool as defaultPool } from "@nasaq/db/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * سياسة التطبيق عند وجود بنود سابقة على الطلب:
 *
 *   skip_if_applied  — إذا كان applied_template_id = هذا القالب بالضبط → لا تفعل شيئاً
 *                      (idempotency: تطبيق نفس القالب مرتين = لا أثر)
 *
 *   replace_all      — احذف جميع البنود الحالية ثم أدرج بنود القالب من جديد
 *                      (استبدال كامل — مفيد عند تغيير القالب)
 *
 *   merge            — أضف بنود القالب فوق ما هو موجود بدون حذف
 *                      (دمج — مفيد لإضافة قالب إضافي)
 */
export type OverridePolicy = "skip_if_applied" | "replace_all" | "merge";

export interface BlueprintResult {
  templateId:   string;
  templateName: string;
  applied:      number;        // عدد البنود المُنشأة (0 = تم تجاهلها بسبب skip)
  skipped:      boolean;       // true عند skip_if_applied وكان القالب مُطبَّقاً
  replaced:     boolean;       // true عند replace_all وكانت هناك بنود سابقة
  warnings:     string[];      // تحذيرات توفر الأصول/المواد
}

export interface CreateProjectParams {
  orgId:         string;
  userId:        string | null;
  serviceId:     string;
  customerName:  string;
  customerPhone?: string | null;
  eventDate?:    string | null;
  eventTime?:    string | null;
  eventLocation?: string | null;
  description?:  string | null;
  notes?:        string | null;
  depositAmount?: number | null;
  totalAmount?:   number | null;
  teamSize?:      number;
  /** القالب الذي سيُطبَّق — يتجاوز template_id الخدمة إذا أُعطي */
  overrideTemplateId?: string | null;
  /** تصنيف الطلب: sale | booking | project */
  orderKind?: "sale" | "booking" | "project" | null;
}

export interface CreateProjectResult {
  order:     Record<string, unknown>;
  blueprint: BlueprintResult | null;
}

// ─── 1. applyBlueprint ────────────────────────────────────────────────────────

export async function applyBlueprint(
  pool:           typeof defaultPool,
  orderId:        string,
  templateId:     string,
  orgId:          string,
  policy:         OverridePolicy = "skip_if_applied",
): Promise<BlueprintResult> {

  // ── التحقق من القالب ─────────────────────────────────────────────────────
  const { rows: tmplRows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name
     FROM event_package_templates
     WHERE id=$1 AND org_id=$2 AND is_active=TRUE`,
    [templateId, orgId],
  );
  if (!tmplRows[0]) {
    return {
      templateId, templateName: "", applied: 0,
      skipped: false, replaced: false,
      warnings: ["القالب غير موجود أو غير نشط أو لا ينتمي للمنشأة"],
    };
  }
  const templateName = tmplRows[0].name;

  // ── التحقق من الوضع الحالي للطلب ─────────────────────────────────────────
  const { rows: orderRows } = await pool.query<{
    applied_template_id: string | null;
    items_count: string;
  }>(
    `SELECT applied_template_id,
            (SELECT COUNT(*)::text FROM service_order_items
             WHERE service_order_id=so.id) AS items_count
     FROM service_orders so
     WHERE id=$1 AND org_id=$2`,
    [orderId, orgId],
  );
  if (!orderRows[0]) {
    return {
      templateId, templateName, applied: 0,
      skipped: false, replaced: false,
      warnings: ["الطلب غير موجود"],
    };
  }

  const currentTemplateId = orderRows[0].applied_template_id;
  const hasItems          = Number(orderRows[0].items_count) > 0;

  // ── تطبيق سياسة skip_if_applied ─────────────────────────────────────────
  if (policy === "skip_if_applied" && currentTemplateId === templateId) {
    return {
      templateId, templateName, applied: 0,
      skipped: true, replaced: false,
      warnings: [],
    };
  }

  // ── جلب بنود القالب ───────────────────────────────────────────────────────
  const { rows: items } = await pool.query(
    `SELECT *
     FROM event_package_template_items
     WHERE template_id=$1 AND org_id=$2
     ORDER BY sort_order ASC, item_type ASC`,
    [templateId, orgId],
  );

  if (!items.length) {
    return {
      templateId, templateName, applied: 0,
      skipped: false, replaced: false,
      warnings: [],
    };
  }

  // ── Transaction: حذف + إدراج + تحديث ──────────────────────────────────────
  const client  = await pool.connect();
  let   replaced = false;

  try {
    await client.query("BEGIN");

    // replace_all: احذف جميع البنود الحالية أولاً
    if (policy === "replace_all" && hasItems) {
      await client.query(
        `DELETE FROM service_order_items WHERE service_order_id=$1`,
        [orderId],
      );
      replaced = true;
    }

    // أدرج بنود القالب
    for (const item of items) {
      const subtotal = Number(item.quantity) * Number(item.unit_cost_estimate);
      await client.query(
        `INSERT INTO service_order_items
           (service_order_id, item_type, description, quantity, unit,
            unit_cost, subtotal, variant_id, asset_category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          orderId,
          item.item_type,
          item.description,
          item.quantity,
          item.unit,
          item.unit_cost_estimate,
          subtotal,
          item.variant_id    ?? null,
          item.asset_category ?? null,
        ],
      );
    }

    // سجِّل applied_template_id (المصدر الوحيد لهذا التحديث)
    await client.query(
      `UPDATE service_orders
         SET applied_template_id=$1, updated_at=NOW()
       WHERE id=$2 AND org_id=$3`,
      [templateId, orderId, orgId],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // ── تحقق من التوفر (خارج الـ transaction — إنذار فقط) ────────────────────
  const warnings: string[] = [];

  for (const item of items) {
    if (item.item_type === "asset" && item.asset_id) {
      const { rows: [asset] } = await pool.query(
        `SELECT name, status FROM decor_assets WHERE id=$1 AND org_id=$2`,
        [item.asset_id, orgId],
      );
      if (asset && asset.status !== "available") {
        const reason =
          asset.status === "reserved" ? "محجوز مسبقاً" :
          asset.status === "in_use"   ? "قيد الاستخدام" : "غير متاح";
        warnings.push(`${asset.name}: ${reason} — تأكيد الحجز يدوياً مطلوب`);
      }
    }

    if (item.item_type === "consumable_natural" && item.variant_id) {
      const { rows: [stock] } = await pool.query(
        `SELECT COALESCE(SUM(quantity_remaining),0)::numeric AS available
         FROM flower_batches
         WHERE variant_id=$1 AND org_id=$2
           AND quality_status NOT IN ('damaged','expired')
           AND quantity_remaining > 0`,
        [item.variant_id, orgId],
      );
      const available = Number(stock?.available ?? 0);
      const needed    = Math.ceil(Number(item.quantity));
      if (available < needed) {
        warnings.push(
          `${item.description}: متوفر ${available} من أصل ${needed} ساق — يجب تأمين الفرق`,
        );
      }
    }
  }

  return { templateId, templateName, applied: items.length, skipped: false, replaced, warnings };
}

// ─── 2. createProjectFromService ──────────────────────────────────────────────
// المسار الرسمي الوحيد لإنشاء مشروع ميداني (service_order) من خدمة

export async function createProjectFromService(
  pool:   typeof defaultPool,
  params: CreateProjectParams,
): Promise<CreateProjectResult> {
  const {
    orgId, userId, serviceId,
    customerName, customerPhone, eventDate, eventTime,
    eventLocation, description, notes,
    depositAmount, totalAmount, teamSize = 1,
    overrideTemplateId, orderKind = "project",
  } = params;

  // ── جلب الخدمة ───────────────────────────────────────────────────────────
  const { rows: svcRows } = await pool.query(
    `SELECT id, base_price, deposit_percent, duration_minutes, template_id, worker_count
     FROM services
     WHERE id=$1 AND org_id=$2 AND service_type='field_service'`,
    [serviceId, orgId],
  );
  if (!svcRows[0]) {
    throw Object.assign(new Error("الخدمة غير موجودة أو ليست خدمة ميدانية"), { status: 404 });
  }
  const svc = svcRows[0];

  // القالب المستخدم: override > خدمة > لا شيء
  const templateId: string | null = overrideTemplateId ?? svc.template_id ?? null;

  // المبالغ: القيم المُعطاة > القيم من الخدمة
  const resolvedTotal   = totalAmount   ?? (svc.base_price     ? Number(svc.base_price)     : null);
  const resolvedDeposit = depositAmount ?? (svc.deposit_percent && resolvedTotal
    ? Math.round(resolvedTotal * Number(svc.deposit_percent) / 100) : null);
  const resolvedTeam    = teamSize      ?? svc.worker_count    ?? 1;

  // ── ربط العميل بالهاتف ────────────────────────────────────────────────────
  let customerId: string | null = null;
  if (customerPhone) {
    const { rows: custRows } = await pool.query(
      `SELECT id FROM customers WHERE org_id=$1 AND phone=$2 LIMIT 1`,
      [orgId, customerPhone],
    );
    if (custRows[0]) customerId = custRows[0].id;
  }

  // ── توليد رقم الطلب ───────────────────────────────────────────────────────
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)+1 AS next FROM service_orders WHERE org_id=$1`, [orgId],
  );
  const orderNumber = `SO-${new Date().getFullYear()}-${String(countRows[0].next).padStart(4, "0")}`;

  // ── إنشاء الطلب ───────────────────────────────────────────────────────────
  const { rows } = await pool.query(
    `INSERT INTO service_orders
       (org_id, order_number, type, service_id, customer_name, customer_phone,
        event_date, event_time, event_location, description, notes,
        deposit_amount, total_amount, team_size, customer_id, order_kind)
     VALUES ($1,$2,'field_execution',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      orgId, orderNumber, serviceId,
      customerName, customerPhone ?? null,
      eventDate ?? null, eventTime ?? null, eventLocation ?? null,
      description ?? null, notes ?? null,
      resolvedDeposit ?? null, resolvedTotal ?? null,
      resolvedTeam, customerId,
      orderKind ?? "project",
    ],
  );

  const order = rows[0];

  // ── تطبيق القالب (إن وُجد) — skip_if_applied لأن الطلب جديد لا تكرار ──────
  let blueprint: BlueprintResult | null = null;
  if (templateId) {
    blueprint = await applyBlueprint(pool, order.id, templateId, orgId, "skip_if_applied");
  }

  return { order, blueprint };
}
