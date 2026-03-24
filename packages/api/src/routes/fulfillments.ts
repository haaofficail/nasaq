import { Hono } from "hono";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";

export const fulfillmentsRouter = new Hono();

// ============================================================
// STATE MACHINES
// ============================================================

// Fulfillment: which stages are valid next steps from each current stage
const VALID_FULFILLMENT_TRANSITIONS: Record<string, string[]> = {
  reserved:             ["picking"],
  picking:              ["preparation"],
  preparation:          ["dispatched"],
  dispatched:           ["in_use"],
  in_use:               ["returned"],
  returned:             ["inspection"],
  inspection:           ["completed", "maintenance_required"],
  completed:            [],   // terminal
  maintenance_required: [],   // terminal
};

// Allocation per-asset: valid next statuses from current
const VALID_ALLOC_TRANSITIONS: Record<string, string[]> = {
  allocated:  ["picked"],
  picked:     ["dispatched"],
  dispatched: ["in_use"],
  in_use:     ["returned"],
  returned:   ["inspected"],
  inspected:  [],  // terminal
};

// Stages where the fulfillment is locked (no add/remove allocations)
const LOCKED_FOR_ALLOC = new Set(["dispatched", "in_use", "returned", "inspection", "completed", "maintenance_required"]);

// Stage → which asset.status to set for all allocated assets
const ASSET_STATUS_ON_STAGE: Record<string, string | null> = {
  dispatched:           "in_use",
  completed:            "available",
  maintenance_required: "maintenance",
};

// Stage timestamp columns
// Note: maintenance_required is NOT listed here — inspection_completed_at is set
// by the inspection block below to avoid duplicate column assignment.
const STAGE_TIMESTAMP: Record<string, string> = {
  picking:     "picking_started_at",
  preparation: "prepared_at",
  dispatched:  "dispatched_at",
  returned:    "returned_at",
  completed:   "completed_at",
};

// Stage → allocation status auto-sync (fulfillment stage is ground truth)
const STAGE_TO_ALLOC_STATUS: Record<string, string> = {
  dispatched:           "dispatched",
  in_use:               "in_use",
  returned:             "returned",
  completed:            "inspected",
  maintenance_required: "inspected",
};

// Stage → allocation timestamp column to set on auto-sync
const ALLOC_STAGE_TS_COL: Record<string, string> = {
  dispatched:           "dispatched_at",
  returned:             "returned_at",
  completed:            "inspected_at",
  maintenance_required: "inspected_at",
};

// ============================================================
// HELPERS
// ============================================================

// Build a safe parameterized WHERE clause for optional filters
// Returns { clause: string, values: any[], nextIdx: number }
function buildFilters(
  base: any[],
  filters: Array<{ condition: boolean; col: string; val: any }>,
) {
  let idx = base.length + 1;
  const clauses: string[] = [];
  const vals: any[] = [];
  for (const f of filters) {
    if (f.condition) {
      clauses.push(`AND ${f.col} = $${idx++}`);
      vals.push(f.val);
    }
  }
  return { clauses, vals, nextIdx: idx };
}

// ============================================================
// STATS/SUMMARY — must be before /:id
// ============================================================

fulfillmentsRouter.get("/stats/summary", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT stage, COUNT(*)::int AS count
     FROM fulfillments
     WHERE org_id = $1 AND stage NOT IN ('completed','maintenance_required')
     GROUP BY stage`,
    [orgId],
  );
  return c.json({ data: rows });
});

// ============================================================
// LIST
// ============================================================

fulfillmentsRouter.get("/", async (c) => {
  const orgId     = getOrgId(c);
  const stage     = c.req.query("stage") || "";
  const bookingId = c.req.query("bookingId") || "";
  const { limit, offset } = getPagination(c);

  const base = [orgId];
  const { clauses, vals, nextIdx } = buildFilters(base, [
    { condition: !!stage,     col: "f.stage",      val: stage },
    { condition: !!bookingId, col: "f.booking_id",  val: bookingId },
  ]);

  const { rows } = await pool.query(
    `SELECT f.*,
       b.booking_number, b.event_date, b.status AS booking_status,
       c.name AS customer_name,
       COUNT(aa.id)::int AS allocation_count
     FROM fulfillments f
     JOIN bookings b ON b.id = f.booking_id
     LEFT JOIN customers c ON c.id = b.customer_id
     LEFT JOIN asset_allocations aa ON aa.fulfillment_id = f.id
     WHERE f.org_id = $1
       ${clauses.join(" ")}
     GROUP BY f.id, b.booking_number, b.event_date, b.status, c.name
     ORDER BY f.created_at DESC
     LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
    [...base, ...vals, limit, offset],
  );
  return c.json({ data: rows });
});

// ============================================================
// GET SINGLE — with allocations + consumable requirements
// ============================================================

fulfillmentsRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  const { rows: [fulfillment] } = await pool.query(
    `SELECT f.*,
       b.booking_number, b.event_date, b.status AS booking_status,
       c.name AS customer_name, c.phone AS customer_phone
     FROM fulfillments f
     JOIN bookings b ON b.id = f.booking_id
     LEFT JOIN customers c ON c.id = b.customer_id
     WHERE f.id = $1 AND f.org_id = $2`,
    [id, orgId],
  );
  if (!fulfillment) return c.json({ error: "التنفيذ غير موجود" }, 404);

  const { rows: allocations } = await pool.query(
    `SELECT aa.*,
       a.serial_number, a.barcode, a.name AS asset_name, a.condition, a.status AS asset_status,
       at.name AS type_name, at.category AS type_category
     FROM asset_allocations aa
     JOIN assets a ON a.id = aa.asset_id
     LEFT JOIN asset_types at ON at.id = aa.asset_type_id
     WHERE aa.fulfillment_id = $1
     ORDER BY aa.created_at ASC`,
    [id],
  );

  // Consumable requirements derived from booking's service components
  const { rows: consumables } = await pool.query(
    `SELECT
       sc.inventory_item_id,
       ip.name AS product_name, ip.unit, ip.current_stock,
       sc.quantity * bi.quantity AS required_qty,
       COALESCE(
         (SELECT SUM(m.quantity) FROM stock_movements m
          WHERE m.reference_id = $1 AND m.reference_type = 'fulfillment'
            AND m.product_id = sc.inventory_item_id AND m.type = 'out'),
         0
       )::numeric AS consumed_qty
     FROM booking_items bi
     JOIN service_components sc ON sc.service_id = bi.service_id
       AND sc.source_type = 'inventory'
       AND sc.inventory_item_id IS NOT NULL
       AND sc.is_active = true
     JOIN inventory_products ip ON ip.id = sc.inventory_item_id
     WHERE bi.booking_id = $2
     ORDER BY ip.name`,
    [id, fulfillment.booking_id],
  );

  return c.json({ data: { ...fulfillment, allocations, consumables } });
});

// ============================================================
// CREATE FULFILLMENT
// ============================================================

fulfillmentsRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { bookingId, notes } = await c.req.json();
  if (!bookingId) return c.json({ error: "bookingId مطلوب" }, 400);

  // Booking must belong to org
  const { rows: [booking] } = await pool.query(
    "SELECT id FROM bookings WHERE id = $1 AND org_id = $2",
    [bookingId, orgId],
  );
  if (!booking) return c.json({ error: "الحجز غير موجود" }, 404);

  // No active fulfillment for this booking
  const { rows: [existing] } = await pool.query(
    `SELECT id FROM fulfillments
     WHERE booking_id = $1 AND org_id = $2
       AND stage NOT IN ('completed','maintenance_required')`,
    [bookingId, orgId],
  );
  if (existing) {
    return c.json({ error: "يوجد طلب تنفيذ نشط لهذا الحجز", existingId: existing.id }, 409);
  }

  const { rows: [f] } = await pool.query(
    `INSERT INTO fulfillments (org_id, booking_id, stage, notes, created_by, reserved_at)
     VALUES ($1, $2, 'reserved', $3, $4, NOW()) RETURNING *`,
    [orgId, bookingId, notes || null, userId || null],
  );
  return c.json({ data: f }, 201);
});

// ============================================================
// ADVANCE STAGE — strictly enforced state machine
// ============================================================

fulfillmentsRouter.patch("/:id/stage", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const body   = await c.req.json();
  const { targetStage, notes, inspectionResult, inspectionNotes } = body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: [f] } = await client.query(
      "SELECT * FROM fulfillments WHERE id = $1 AND org_id = $2 FOR UPDATE",
      [id, orgId],
    );
    if (!f) { await client.query("ROLLBACK"); return c.json({ error: "التنفيذ غير موجود" }, 404); }

    const allowed = VALID_FULFILLMENT_TRANSITIONS[f.stage] ?? [];
    if (allowed.length === 0) {
      await client.query("ROLLBACK");
      return c.json({ error: "المرحلة الحالية نهائية ولا يمكن تغييرها" }, 400);
    }

    // Determine target stage
    let nextStage: string;
    if (targetStage) {
      if (f.stage !== "inspection" || !["completed", "maintenance_required"].includes(targetStage)) {
        await client.query("ROLLBACK");
        return c.json({ error: "لا يمكن تحديد المرحلة التالية يدوياً في هذه المرحلة" }, 400);
      }
      nextStage = targetStage;
    } else {
      nextStage = allowed[0];
    }

    if (!allowed.includes(nextStage)) {
      await client.query("ROLLBACK");
      return c.json({ error: `الانتقال من "${f.stage}" إلى "${nextStage}" غير مسموح` }, 400);
    }

    // ── Pre-flight checks (dispatched only) ──────────────────────────────────
    // Declared here so consumableCheck is accessible in the side-effects block below
    let consumableCheck: Array<{
      inventory_item_id: string;
      product_name: string;
      current_stock: string;
      required_qty: string;
    }> = [];

    if (nextStage === "dispatched") {
      // 0. Guard against double-deduction on retry (idempotency)
      if (f.dispatched_at !== null) {
        await client.query("ROLLBACK");
        return c.json({ error: "هذا الطلب تم إرساله مسبقاً — لا يمكن تكرار العملية" }, 400);
      }

      // 1. Re-check all allocated assets are still available (race condition guard)
      const { rows: unavailableAssets } = await client.query(
        `SELECT a.name, a.status
         FROM assets a
         JOIN asset_allocations aa ON aa.asset_id = a.id
         WHERE aa.fulfillment_id = $1 AND a.status != 'available'`,
        [id],
      );
      if (unavailableAssets.length > 0) {
        await client.query("ROLLBACK");
        return c.json({
          error: "لا يمكن الإرسال: بعض الأصول لم تعد متاحة",
          assets: unavailableAssets.map((a: any) => ({ name: a.name, status: a.status })),
        }, 409);
      }

      // 2. All-or-nothing consumable stock check — no silent clipping allowed
      const { rows: consumables } = await client.query(
        `SELECT sc.inventory_item_id, ip.name AS product_name,
           ip.current_stock, SUM(sc.quantity * bi.quantity)::numeric AS required_qty
         FROM booking_items bi
         JOIN service_components sc ON sc.service_id = bi.service_id
           AND sc.source_type = 'inventory'
           AND sc.inventory_item_id IS NOT NULL
           AND sc.is_active = true
         JOIN inventory_products ip ON ip.id = sc.inventory_item_id
         WHERE bi.booking_id = $1
         GROUP BY sc.inventory_item_id, ip.name, ip.current_stock`,
        [f.booking_id],
      );

      const insufficient = consumables.filter(
        (r: any) => parseFloat(r.current_stock) < parseFloat(r.required_qty),
      );
      if (insufficient.length > 0) {
        await client.query("ROLLBACK");
        return c.json({
          error: "لا يمكن الإرسال: مخزون غير كافٍ لبعض المواد المطلوبة",
          items: insufficient.map((r: any) => ({
            product: r.product_name,
            required: parseFloat(r.required_qty),
            available: parseFloat(r.current_stock),
          })),
        }, 409);
      }

      consumableCheck = consumables;
    }

    // ── Update fulfillment stage ──────────────────────────────────────────────
    const sets = ["stage = $1", "updated_at = NOW()"];
    const vals: any[] = [nextStage];
    let p = 2;

    const tsCol = STAGE_TIMESTAMP[nextStage];
    if (tsCol) sets.push(`${tsCol} = NOW()`);

    if (["completed", "maintenance_required"].includes(nextStage)) {
      sets.push(`inspection_completed_at = NOW()`);
      if (inspectionResult) { sets.push(`inspection_result = $${p++}`); vals.push(inspectionResult); }
      if (inspectionNotes)  { sets.push(`inspection_notes = $${p++}`);  vals.push(inspectionNotes); }
      sets.push(`inspection_by = $${p++}`); vals.push(userId || null);
    }
    if (notes) { sets.push(`notes = $${p++}`); vals.push(notes); }

    const { rows: [updated] } = await client.query(
      `UPDATE fulfillments SET ${sets.join(", ")} WHERE id = $${p++} AND org_id = $${p} RETURNING *`,
      [...vals, id, orgId],
    );

    // ── Side-effect: update asset statuses ───────────────────────────────────
    const newAssetStatus = ASSET_STATUS_ON_STAGE[nextStage];
    if (newAssetStatus) {
      if (nextStage === "completed") {
        // Clean assets (no damage recorded) → available + back to warehouse
        await client.query(
          `UPDATE assets
           SET status = 'available', location_type = 'warehouse',
               rented_to_customer_id = NULL, rental_booking_id = NULL, updated_at = NOW()
           WHERE id IN (
             SELECT asset_id FROM asset_allocations
             WHERE fulfillment_id = $1 AND (damage_cost IS NULL OR damage_cost = 0)
           )`,
          [id],
        );
        // Damaged assets → maintenance; never silently returned to available
        await client.query(
          `UPDATE assets SET status = 'maintenance', updated_at = NOW()
           WHERE id IN (
             SELECT asset_id FROM asset_allocations
             WHERE fulfillment_id = $1 AND damage_cost > 0
           )`,
          [id],
        );
      } else {
        await client.query(
          `UPDATE assets SET status = $1, updated_at = NOW()
           WHERE id IN (
             SELECT asset_id FROM asset_allocations WHERE fulfillment_id = $2
           )`,
          [newAssetStatus, id],
        );
        if (newAssetStatus === "available") {
          await client.query(
            `UPDATE assets
             SET location_type = 'warehouse', rented_to_customer_id = NULL, rental_booking_id = NULL
             WHERE id IN (SELECT asset_id FROM asset_allocations WHERE fulfillment_id = $1)`,
            [id],
          );
        }
      }
    }

    // ── Auto-sync allocation statuses (fulfillment stage is ground truth) ────
    const allocStatus = STAGE_TO_ALLOC_STATUS[nextStage];
    if (allocStatus) {
      const allocTsCol = ALLOC_STAGE_TS_COL[nextStage];
      await client.query(
        `UPDATE asset_allocations
         SET status = $1${allocTsCol ? `, ${allocTsCol} = NOW()` : ""}
         WHERE fulfillment_id = $2`,
        [allocStatus, id],
      );
    }

    // ── Auto-create maintenance log for every asset on maintenance_required ──
    if (nextStage === "maintenance_required") {
      const { rows: allocsForMaint } = await client.query(
        `SELECT asset_id, damage_cost, damage_notes, condition_after
         FROM asset_allocations WHERE fulfillment_id = $1`,
        [id],
      );
      for (const alloc of allocsForMaint) {
        await client.query(
          `INSERT INTO asset_maintenance_logs
             (org_id, asset_id, maintenance_type, description, cost, status, notes, started_at)
           VALUES ($1, $2, 'inspection_damage', $3, $4, 'pending', $5, NOW())`,
          [
            orgId,
            alloc.asset_id,
            `تالف عند الإعادة — طلب تنفيذ ${id}`,
            alloc.damage_cost || 0,
            alloc.damage_notes || alloc.condition_after || null,
          ],
        );
      }
    }

    // ── Consume inventory on dispatched (pre-validated, never clips to 0) ────
    if (nextStage === "dispatched") {
      for (const row of consumableCheck) {
        await client.query(
          `UPDATE inventory_products
           SET current_stock = current_stock - $1, updated_at = NOW()
           WHERE id = $2`,
          [parseFloat(row.required_qty), row.inventory_item_id],
        );
        await client.query(
          `INSERT INTO stock_movements
             (org_id, product_id, type, quantity, reference_id, reference_type, notes, performed_by)
           VALUES ($1, $2, 'out', $3, $4, 'fulfillment', 'صرف للحجز', $5)`,
          [orgId, row.inventory_item_id, parseFloat(row.required_qty), id, userId || null],
        );
      }
    }

    await client.query("COMMIT");
    return c.json({ data: updated });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ============================================================
// ALLOCATIONS — add asset to fulfillment
// ============================================================

fulfillmentsRouter.post("/:id/allocations", async (c) => {
  const orgId  = getOrgId(c);
  const fulfId = c.req.param("id");
  const { assetId, assetTypeId, notes } = await c.req.json();
  if (!assetId) return c.json({ error: "assetId مطلوب" }, 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fulfillment must exist, belong to org, not be locked
    const { rows: [f] } = await client.query(
      "SELECT booking_id, stage FROM fulfillments WHERE id = $1 AND org_id = $2 FOR UPDATE",
      [fulfId, orgId],
    );
    if (!f) { await client.query("ROLLBACK"); return c.json({ error: "التنفيذ غير موجود" }, 404); }
    if (LOCKED_FOR_ALLOC.has(f.stage)) {
      await client.query("ROLLBACK");
      return c.json({ error: `لا يمكن إضافة أصول في مرحلة "${f.stage}"` }, 400);
    }

    // Asset must exist, belong to org, be active and available
    const { rows: [asset] } = await client.query(
      "SELECT id, asset_type_id, status, is_active FROM assets WHERE id = $1 AND org_id = $2 FOR UPDATE",
      [assetId, orgId],
    );
    if (!asset) { await client.query("ROLLBACK"); return c.json({ error: "الأصل غير موجود" }, 404); }
    if (!asset.is_active) { await client.query("ROLLBACK"); return c.json({ error: "الأصل غير نشط" }, 400); }
    if (asset.status !== "available") {
      await client.query("ROLLBACK");
      return c.json({ error: `الأصل غير متاح (حالته الحالية: ${asset.status})` }, 400);
    }

    // Asset must not already be in an active unfulfilled allocation
    const { rows: [conflict] } = await client.query(
      `SELECT aa.id FROM asset_allocations aa
       JOIN fulfillments flt ON flt.id = aa.fulfillment_id
       WHERE aa.asset_id = $1
         AND aa.org_id = $2
         AND flt.stage NOT IN ('completed','maintenance_required')
         AND aa.status NOT IN ('returned','inspected')`,
      [assetId, orgId],
    );
    if (conflict) {
      await client.query("ROLLBACK");
      return c.json({ error: "الأصل مخصص مسبقاً في طلب تنفيذ نشط آخر" }, 409);
    }

    const { rows: [alloc] } = await client.query(
      `INSERT INTO asset_allocations
         (org_id, fulfillment_id, booking_id, asset_id, asset_type_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'allocated', $6) RETURNING *`,
      [orgId, fulfId, f.booking_id, assetId, assetTypeId || asset.asset_type_id, notes || null],
    );

    await client.query("COMMIT");
    return c.json({ data: alloc }, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ============================================================
// ALLOCATIONS — remove (only allowed before dispatched)
// ============================================================

fulfillmentsRouter.delete("/:id/allocations/:allocId", async (c) => {
  const orgId   = getOrgId(c);
  const fulfId  = c.req.param("id");
  const allocId = c.req.param("allocId");

  // Check fulfillment stage
  const { rows: [f] } = await pool.query(
    "SELECT stage FROM fulfillments WHERE id = $1 AND org_id = $2",
    [fulfId, orgId],
  );
  if (!f) return c.json({ error: "التنفيذ غير موجود" }, 404);
  if (LOCKED_FOR_ALLOC.has(f.stage)) {
    return c.json({ error: `لا يمكن إزالة أصل في مرحلة "${f.stage}"` }, 400);
  }

  const result = await pool.query(
    "DELETE FROM asset_allocations WHERE id = $1 AND fulfillment_id = $2 AND org_id = $3",
    [allocId, fulfId, orgId],
  );
  if (result.rowCount === 0) return c.json({ error: "التخصيص غير موجود" }, 404);
  return c.json({ success: true });
});

// ============================================================
// ALLOCATIONS — update status (enforced state machine)
// ============================================================

fulfillmentsRouter.patch("/:id/allocations/:allocId", async (c) => {
  const orgId   = getOrgId(c);
  const userId  = getUserId(c);
  const fulfId  = c.req.param("id");
  const allocId = c.req.param("allocId");
  const { status, conditionBefore, conditionAfter, damageCost, damageNotes, notes } = await c.req.json();

  // Load current allocation
  const { rows: [current] } = await pool.query(
    "SELECT status FROM asset_allocations WHERE id = $1 AND fulfillment_id = $2 AND org_id = $3",
    [allocId, fulfId, orgId],
  );
  if (!current) return c.json({ error: "التخصيص غير موجود" }, 404);

  if (status) {
    const allowed = VALID_ALLOC_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(status)) {
      return c.json({
        error: `الانتقال من "${current.status}" إلى "${status}" غير مسموح`,
        allowed,
      }, 400);
    }
  }

  const tsFields: Record<string, string> = {
    picked:     "picked_at",
    dispatched: "dispatched_at",
    returned:   "returned_at",
    inspected:  "inspected_at",
  };

  const sets: string[] = [];
  const vals: any[] = [];
  let p = 1;

  if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
  if (status && tsFields[status]) {
    sets.push(`${tsFields[status]} = NOW()`);
    if (status === "picked") { sets.push(`picked_by = $${p++}`); vals.push(userId || null); }
  }
  if (conditionBefore !== undefined) { sets.push(`condition_before = $${p++}`); vals.push(conditionBefore); }
  if (conditionAfter  !== undefined) { sets.push(`condition_after = $${p++}`);  vals.push(conditionAfter); }
  if (damageCost      !== undefined) { sets.push(`damage_cost = $${p++}`);      vals.push(damageCost); }
  if (damageNotes     !== undefined) { sets.push(`damage_notes = $${p++}`);     vals.push(damageNotes); }
  if (notes           !== undefined) { sets.push(`notes = $${p++}`);            vals.push(notes); }

  if (sets.length === 0) return c.json({ error: "لا توجد حقول للتحديث" }, 400);

  const { rows: [updated] } = await pool.query(
    `UPDATE asset_allocations
     SET ${sets.join(", ")}
     WHERE id = $${p++} AND fulfillment_id = $${p++} AND org_id = $${p}
     RETURNING *`,
    [...vals, allocId, fulfId, orgId],
  );
  if (!updated) return c.json({ error: "التخصيص غير موجود" }, 404);
  return c.json({ data: updated });
});
