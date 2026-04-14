/**
 * CONTRACTS ROUTER — عقود عامة
 *
 * نظام عقود شامل لجميع أنواع المنشآت.
 * منفصل عن rental_contracts (equipment/asset rental) و lease_contracts (property).
 */

import { Hono } from "hono";
import { z } from "zod";
import { db, pool } from "@nasaq/db/client";
import { authMiddleware } from "../middleware/auth";
import { autoJournal } from "../lib/autoJournal";

// ────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────

type ContractType    = "lease" | "service" | "vendor" | "employment" | "other";
type ContractStatus  = "draft" | "active" | "expired" | "terminated" | "renewed";
type PaymentTerms    = "monthly" | "quarterly" | "annual" | "one_time";
type PaymentStatus   = "pending" | "paid" | "overdue" | "cancelled";

// ────────────────────────────────────────────────────────────
// ROUTER
// ────────────────────────────────────────────────────────────

export const contractsRouter = new Hono<{ Variables: { userId: string; orgId: string; role: string } }>();
contractsRouter.use("*", authMiddleware);

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

async function generateContractNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await pool.query<{ num: string }>(
    `SELECT contract_number as num FROM contracts
     WHERE org_id = $1 AND contract_number LIKE $2
     ORDER BY created_at DESC LIMIT 1`,
    [orgId, `CNT-${year}-%`],
  );
  if (!rows.length) return `CNT-${year}-001`;
  const last = rows[0].num;
  const seq  = parseInt(last.split("-")[2] ?? "0", 10);
  return `CNT-${year}-${String(seq + 1).padStart(3, "0")}`;
}

/** حساب عدد دفعات العقد بناءً على شروط الدفع */
function calcInstallments(
  startDate: string,
  endDate: string,
  terms: PaymentTerms,
  totalValue: number,
): Array<{ due_date: string; amount: number }> {
  const start = new Date(startDate);
  const end   = new Date(endDate);

  if (terms === "one_time") {
    return [{ due_date: startDate, amount: totalValue }];
  }

  const installments: Array<{ due_date: string; amount: number }> = [];
  const monthsBetween = (b: Date, a: Date) =>
    (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());

  const totalMonths = Math.max(1, monthsBetween(start, end));
  const step = terms === "monthly" ? 1 : terms === "quarterly" ? 3 : 12;
  const count = Math.max(1, Math.floor(totalMonths / step));
  const perInstallment = parseFloat((totalValue / count).toFixed(2));
  const remainder     = parseFloat((totalValue - perInstallment * count).toFixed(2));

  let current = new Date(start);
  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? perInstallment + remainder : perInstallment;
    installments.push({
      due_date: current.toISOString().slice(0, 10),
      amount,
    });
    current = new Date(current);
    current.setMonth(current.getMonth() + step);
  }
  return installments;
}

// ────────────────────────────────────────────────────────────
// STATS
// ────────────────────────────────────────────────────────────

contractsRouter.get("/stats", async (c) => {
  const orgId = c.get("orgId");
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'active')     AS active_count,
       COUNT(*) FILTER (WHERE status = 'draft')      AS draft_count,
       COUNT(*) FILTER (WHERE status = 'expired')    AS expired_count,
       COUNT(*) FILTER (WHERE status = 'terminated') AS terminated_count,
       COALESCE(SUM(value) FILTER (WHERE status = 'active'), 0) AS active_value,
       COUNT(*) FILTER (
         WHERE status = 'active'
           AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       ) AS expiring_soon
     FROM contracts WHERE org_id = $1`,
    [orgId],
  );
  return c.json({ data: rows[0] });
});

// ────────────────────────────────────────────────────────────
// EXPIRING
// ────────────────────────────────────────────────────────────

contractsRouter.get("/expiring", async (c) => {
  const orgId = c.get("orgId");
  const days  = parseInt(c.req.query("days") ?? "30", 10);
  const { rows } = await pool.query(
    `SELECT id, contract_number, title, party_name, end_date, status, value
     FROM contracts
     WHERE org_id = $1
       AND status = 'active'
       AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2 || ' days')::INTERVAL
     ORDER BY end_date`,
    [orgId, days],
  );
  return c.json({ data: rows });
});

// ────────────────────────────────────────────────────────────
// LIST
// ────────────────────────────────────────────────────────────

contractsRouter.get("/", async (c) => {
  const orgId  = c.get("orgId");
  const status = c.req.query("status");
  const type   = c.req.query("type");
  const search = c.req.query("search");

  let q = `
    SELECT c.*,
      (SELECT COUNT(*) FROM contract_payments cp WHERE cp.contract_id = c.id AND cp.status = 'pending') AS pending_payments,
      (SELECT COUNT(*) FROM contract_documents cd WHERE cd.contract_id = c.id) AS document_count,
      CASE
        WHEN c.linked_entity_id IS NOT NULL
          THEN (SELECT a.name FROM assets a WHERE a.id = c.linked_entity_id LIMIT 1)
        ELSE NULL
      END AS linked_entity_name
    FROM contracts c
    WHERE c.org_id = $1
  `;
  const params: any[] = [orgId];

  if (status && status !== "all") {
    params.push(status);
    q += ` AND c.status = $${params.length}`;
  }
  if (type) {
    params.push(type);
    q += ` AND c.contract_type = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    q += ` AND (c.title ILIKE $${params.length} OR c.party_name ILIKE $${params.length} OR c.contract_number ILIKE $${params.length})`;
  }

  q += " ORDER BY c.created_at DESC";

  const { rows } = await pool.query(q, params);
  return c.json({ data: rows });
});

// ────────────────────────────────────────────────────────────
// GET ONE
// ────────────────────────────────────────────────────────────

contractsRouter.get("/:id", async (c) => {
  const orgId = c.get("orgId");
  const { id } = c.req.param();

  const [{ rows: [contract] }, { rows: payments }, { rows: documents }] = await Promise.all([
    pool.query(
      `SELECT c.*,
         CASE
           WHEN c.linked_entity_id IS NOT NULL
             THEN (SELECT a.name FROM assets a WHERE a.id = c.linked_entity_id LIMIT 1)
           ELSE NULL
         END AS linked_entity_name
       FROM contracts c WHERE c.id=$1 AND c.org_id=$2`,
      [id, orgId]
    ),
    pool.query("SELECT * FROM contract_payments WHERE contract_id=$1 ORDER BY due_date", [id]),
    pool.query("SELECT * FROM contract_documents WHERE contract_id=$1 ORDER BY created_at", [id]),
  ]);

  if (!contract) return c.json({ error: "العقد غير موجود" }, 404);
  return c.json({ data: { ...contract, payments, documents } });
});

// ────────────────────────────────────────────────────────────
// CREATE
// ────────────────────────────────────────────────────────────

contractsRouter.post("/", async (c) => {
  const orgId  = c.get("orgId");
  const userId = c.get("userId");

  const body = z.object({
    title:               z.string().min(1).max(300),
    contractType:        z.enum(["lease","service","vendor","employment","other"]).default("other"),
    partyName:           z.string().min(1).max(200),
    partyIdNumber:       z.string().optional().nullable(),
    partyPhone:          z.string().optional().nullable(),
    partyEmail:          z.string().email().optional().nullable(),
    startDate:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    value:               z.number().min(0).default(0),
    currency:            z.string().default("SAR"),
    paymentTerms:        z.enum(["monthly","quarterly","annual","one_time"]).default("monthly"),
    autoRenew:           z.boolean().default(false),
    renewalNoticeDays:   z.number().int().min(0).default(30),
    linkedEntityType:    z.string().optional().nullable(),
    linkedEntityId:      z.string().uuid().optional().nullable(),
    notes:               z.string().optional().nullable(),
    termsAndConditions:  z.string().optional().nullable(),
    signedAt:            z.string().optional().nullable(),
  }).parse(await c.req.json());

  const contractNumber = await generateContractNumber(orgId);

  const { rows: [contract] } = await pool.query(
    `INSERT INTO contracts (
       org_id, contract_number, contract_type, title,
       party_name, party_id_number, party_phone, party_email,
       start_date, end_date, value, currency, payment_terms,
       auto_renew, renewal_notice_days,
       linked_entity_type, linked_entity_id,
       notes, terms_and_conditions, created_by, signed_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     RETURNING *`,
    [
      orgId, contractNumber, body.contractType, body.title,
      body.partyName, body.partyIdNumber ?? null, body.partyPhone ?? null, body.partyEmail ?? null,
      body.startDate, body.endDate, body.value, body.currency, body.paymentTerms,
      body.autoRenew, body.renewalNoticeDays,
      body.linkedEntityType ?? null, body.linkedEntityId ?? null,
      body.notes ?? null, body.termsAndConditions ?? null, userId,
      body.signedAt ?? null,
    ],
  );

  return c.json({ data: contract }, 201);
});

// ────────────────────────────────────────────────────────────
// UPDATE
// ────────────────────────────────────────────────────────────

contractsRouter.put("/:id", async (c) => {
  const orgId = c.get("orgId");
  const { id } = c.req.param();

  const { rows: [existing] } = await pool.query(
    "SELECT id, status FROM contracts WHERE id=$1 AND org_id=$2",
    [id, orgId],
  );
  if (!existing) return c.json({ error: "العقد غير موجود" }, 404);
  if (existing.status === "terminated") return c.json({ error: "لا يمكن تعديل عقد منتهٍ" }, 422);

  const body = z.object({
    title:              z.string().min(1).max(300).optional(),
    contractType:       z.enum(["lease","service","vendor","employment","other"]).optional(),
    partyName:          z.string().min(1).max(200).optional(),
    partyIdNumber:      z.string().optional().nullable(),
    partyPhone:         z.string().optional().nullable(),
    partyEmail:         z.string().email().optional().nullable(),
    startDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    value:              z.number().min(0).optional(),
    currency:           z.string().optional(),
    paymentTerms:       z.enum(["monthly","quarterly","annual","one_time"]).optional(),
    autoRenew:          z.boolean().optional(),
    renewalNoticeDays:  z.number().int().min(0).optional(),
    notes:              z.string().optional().nullable(),
    termsAndConditions: z.string().optional().nullable(),
    signedAt:           z.string().optional().nullable(),
  }).parse(await c.req.json());

  const sets: string[] = ["updated_at = NOW()"];
  const params: any[]  = [id, orgId];
  const add = (col: string, val: any) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };

  if (body.title             !== undefined) add("title", body.title);
  if (body.contractType      !== undefined) add("contract_type", body.contractType);
  if (body.partyName         !== undefined) add("party_name", body.partyName);
  if (body.partyIdNumber     !== undefined) add("party_id_number", body.partyIdNumber);
  if (body.partyPhone        !== undefined) add("party_phone", body.partyPhone);
  if (body.partyEmail        !== undefined) add("party_email", body.partyEmail);
  if (body.startDate         !== undefined) add("start_date", body.startDate);
  if (body.endDate           !== undefined) add("end_date", body.endDate);
  if (body.value             !== undefined) add("value", body.value);
  if (body.currency          !== undefined) add("currency", body.currency);
  if (body.paymentTerms      !== undefined) add("payment_terms", body.paymentTerms);
  if (body.autoRenew         !== undefined) add("auto_renew", body.autoRenew);
  if (body.renewalNoticeDays !== undefined) add("renewal_notice_days", body.renewalNoticeDays);
  if (body.notes             !== undefined) add("notes", body.notes);
  if (body.termsAndConditions !== undefined) add("terms_and_conditions", body.termsAndConditions);
  if (body.signedAt          !== undefined) add("signed_at", body.signedAt);

  const { rows: [updated] } = await pool.query(
    `UPDATE contracts SET ${sets.join(", ")} WHERE id=$1 AND org_id=$2 RETURNING *`,
    params,
  );
  return c.json({ data: updated });
});

// ────────────────────────────────────────────────────────────
// ACTIVATE — ينشئ الدفعات تلقائياً
// ────────────────────────────────────────────────────────────

contractsRouter.post("/:id/activate", async (c) => {
  const orgId = c.get("orgId");
  const { id } = c.req.param();

  const { rows: [contract] } = await pool.query(
    "SELECT * FROM contracts WHERE id=$1 AND org_id=$2",
    [id, orgId],
  );
  if (!contract) return c.json({ error: "العقد غير موجود" }, 404);
  if (contract.status !== "draft") return c.json({ error: "يمكن تفعيل المسودات فقط" }, 422);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE contracts SET status='active', updated_at=NOW() WHERE id=$1",
      [id],
    );

    // حذف الدفعات السابقة إن وجدت وإعادة توليدها
    await client.query("DELETE FROM contract_payments WHERE contract_id=$1", [id]);

    const installments = calcInstallments(
      contract.start_date.toISOString().slice(0, 10),
      contract.end_date.toISOString().slice(0, 10),
      contract.payment_terms as PaymentTerms,
      parseFloat(contract.value),
    );

    for (const inst of installments) {
      await client.query(
        `INSERT INTO contract_payments (org_id, contract_id, due_date, amount, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [orgId, id, inst.due_date, inst.amount],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { rows: [updated] } = await pool.query("SELECT * FROM contracts WHERE id=$1", [id]);
  return c.json({ data: updated });
});

// ────────────────────────────────────────────────────────────
// TERMINATE
// ────────────────────────────────────────────────────────────

contractsRouter.post("/:id/terminate", async (c) => {
  const orgId = c.get("orgId");
  const { id } = c.req.param();

  const body = z.object({
    terminationReason: z.string().optional().nullable(),
  }).parse(await c.req.json());

  const { rows: [contract] } = await pool.query(
    "SELECT id, status FROM contracts WHERE id=$1 AND org_id=$2",
    [id, orgId],
  );
  if (!contract) return c.json({ error: "العقد غير موجود" }, 404);
  if (contract.status === "terminated") return c.json({ error: "العقد منتهٍ بالفعل" }, 422);

  const { rows: [updated] } = await pool.query(
    `UPDATE contracts
     SET status='terminated', terminated_at=NOW(),
         termination_reason=$1, updated_at=NOW()
     WHERE id=$2 AND org_id=$3 RETURNING *`,
    [body.terminationReason ?? null, id, orgId],
  );

  // إلغاء الدفعات المعلقة
  await pool.query(
    "UPDATE contract_payments SET status='cancelled' WHERE contract_id=$1 AND status='pending'",
    [id],
  );

  return c.json({ data: updated });
});

// ────────────────────────────────────────────────────────────
// RENEW — ينشئ عقداً جديداً ويغلق القديم
// ────────────────────────────────────────────────────────────

contractsRouter.post("/:id/renew", async (c) => {
  const orgId  = c.get("orgId");
  const userId = c.get("userId");
  const { id } = c.req.param();

  const body = z.object({
    newEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    newValue:   z.number().min(0).optional(),
    notes:      z.string().optional().nullable(),
  }).parse(await c.req.json());

  const { rows: [contract] } = await pool.query(
    "SELECT * FROM contracts WHERE id=$1 AND org_id=$2",
    [id, orgId],
  );
  if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // غلق القديم
    await client.query(
      "UPDATE contracts SET status='renewed', updated_at=NOW() WHERE id=$1",
      [id],
    );

    // إنشاء عقد جديد
    const newNumber = await generateContractNumber(orgId);
    const newStart  = contract.end_date.toISOString().slice(0, 10);
    const newValue  = body.newValue ?? parseFloat(contract.value);

    const { rows: [newContract] } = await client.query(
      `INSERT INTO contracts (
         org_id, contract_number, contract_type, title,
         party_name, party_id_number, party_phone, party_email,
         start_date, end_date, value, currency, payment_terms,
         auto_renew, renewal_notice_days,
         linked_entity_type, linked_entity_id,
         notes, terms_and_conditions, created_by, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'draft')
       RETURNING *`,
      [
        orgId, newNumber, contract.contract_type, contract.title,
        contract.party_name, contract.party_id_number, contract.party_phone, contract.party_email,
        newStart, body.newEndDate, newValue, contract.currency, contract.payment_terms,
        contract.auto_renew, contract.renewal_notice_days,
        contract.linked_entity_type, contract.linked_entity_id,
        body.notes ?? contract.notes, contract.terms_and_conditions, userId,
      ],
    );

    await client.query("COMMIT");
    return c.json({ data: newContract }, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ────────────────────────────────────────────────────────────
// DELETE (soft — terminates)
// ────────────────────────────────────────────────────────────

contractsRouter.delete("/:id", async (c) => {
  const orgId = c.get("orgId");
  const { id } = c.req.param();

  const { rows: [contract] } = await pool.query(
    "SELECT id, status FROM contracts WHERE id=$1 AND org_id=$2",
    [id, orgId],
  );
  if (!contract) return c.json({ error: "العقد غير موجود" }, 404);
  if (contract.status === "draft") {
    // مسودة — حذف نهائي
    await pool.query("DELETE FROM contracts WHERE id=$1", [id]);
  } else {
    // نشط أو منتهٍ — إنهاء ناعم
    await pool.query(
      "UPDATE contracts SET status='terminated', terminated_at=NOW(), updated_at=NOW() WHERE id=$1",
      [id],
    );
  }
  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// PAYMENTS — LIST
// ────────────────────────────────────────────────────────────

contractsRouter.get("/:id/payments", async (c) => {
  const orgId = c.get("orgId");
  const { id } = c.req.param();

  const { rows: [contract] } = await pool.query(
    "SELECT id FROM contracts WHERE id=$1 AND org_id=$2",
    [id, orgId],
  );
  if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

  const { rows } = await pool.query(
    "SELECT * FROM contract_payments WHERE contract_id=$1 ORDER BY due_date",
    [id],
  );
  return c.json({ data: rows });
});

// ────────────────────────────────────────────────────────────
// PAYMENTS — ADD
// ────────────────────────────────────────────────────────────

contractsRouter.post("/:id/payments", async (c) => {
  const orgId = c.get("orgId");
  const { id } = c.req.param();

  const { rows: [contract] } = await pool.query(
    "SELECT id FROM contracts WHERE id=$1 AND org_id=$2",
    [id, orgId],
  );
  if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

  const body = z.object({
    dueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount:        z.number().min(0),
    notes:         z.string().optional().nullable(),
  }).parse(await c.req.json());

  const { rows: [payment] } = await pool.query(
    `INSERT INTO contract_payments (org_id, contract_id, due_date, amount, status)
     VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
    [orgId, id, body.dueDate, body.amount],
  );
  return c.json({ data: payment }, 201);
});

// ────────────────────────────────────────────────────────────
// PAYMENTS — UPDATE
// ────────────────────────────────────────────────────────────

contractsRouter.put("/:id/payments/:payId", async (c) => {
  const orgId = c.get("orgId");
  const { id, payId } = c.req.param();

  const body = z.object({
    dueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    amount:   z.number().min(0).optional(),
    notes:    z.string().optional().nullable(),
  }).parse(await c.req.json());

  const sets: string[] = ["updated_at = NOW()"];
  const params: any[]  = [payId, id, orgId];
  const add = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (body.dueDate !== undefined) add("due_date", body.dueDate);
  if (body.amount  !== undefined) add("amount", body.amount);
  if (body.notes   !== undefined) add("notes", body.notes);

  const { rows: [updated] } = await pool.query(
    `UPDATE contract_payments SET ${sets.join(", ")}
     WHERE id=$1 AND contract_id=$2 AND org_id=$3 RETURNING *`,
    params,
  );
  if (!updated) return c.json({ error: "الدفعة غير موجودة" }, 404);
  return c.json({ data: updated });
});

// ────────────────────────────────────────────────────────────
// PAYMENTS — MARK PAID
// ────────────────────────────────────────────────────────────

contractsRouter.post("/:id/payments/:payId/mark-paid", async (c) => {
  const orgId = c.get("orgId");
  const { id, payId } = c.req.param();

  const body = z.object({
    paymentMethod: z.string().default("cash"),
    reference:     z.string().optional().nullable(),
    notes:         z.string().optional().nullable(),
  }).parse(await c.req.json());

  const { rows: [payment] } = await pool.query(
    `UPDATE contract_payments
     SET status='paid', paid_at=NOW(), payment_method=$1, reference=$2, notes=$3, updated_at=NOW()
     WHERE id=$4 AND contract_id=$5 AND org_id=$6
     RETURNING *`,
    [body.paymentMethod, body.reference ?? null, body.notes ?? null, payId, id, orgId],
  );
  if (!payment) return c.json({ error: "الدفعة غير موجودة" }, 404);

  // قيد محاسبي تلقائي
  const { rows: [contract] } = await pool.query(
    "SELECT contract_number, title FROM contracts WHERE id=$1",
    [id],
  );
  if (contract) {
    autoJournal.contractPaymentReceived({
      orgId,
      contractId: id,
      contractNumber: contract.contract_number,
      amount: parseFloat(payment.amount),
      paymentMethod: body.paymentMethod,
      description: `دفعة عقد ${contract.contract_number} — ${contract.title}`,
    }).catch(() => {});
  }

  return c.json({ data: payment });
});

// ────────────────────────────────────────────────────────────
// DOCUMENTS — ADD
// ────────────────────────────────────────────────────────────

contractsRouter.post("/:id/documents", async (c) => {
  const orgId  = c.get("orgId");
  const userId = c.get("userId");
  const { id } = c.req.param();

  const { rows: [contract] } = await pool.query(
    "SELECT id FROM contracts WHERE id=$1 AND org_id=$2",
    [id, orgId],
  );
  if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

  const body = z.object({
    name:     z.string().min(1).max(200),
    fileUrl:  z.string().url(),
    fileType: z.string().optional().nullable(),
    fileSize: z.number().int().optional().nullable(),
  }).parse(await c.req.json());

  const { rows: [doc] } = await pool.query(
    `INSERT INTO contract_documents (org_id, contract_id, name, file_url, file_type, file_size, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [orgId, id, body.name, body.fileUrl, body.fileType ?? null, body.fileSize ?? null, userId],
  );
  return c.json({ data: doc }, 201);
});

// ────────────────────────────────────────────────────────────
// DOCUMENTS — DELETE
// ────────────────────────────────────────────────────────────

contractsRouter.delete("/:id/documents/:docId", async (c) => {
  const orgId = c.get("orgId");
  const { id, docId } = c.req.param();

  const { rows: [doc] } = await pool.query(
    "SELECT id FROM contract_documents WHERE id=$1 AND contract_id=$2 AND org_id=$3",
    [docId, id, orgId],
  );
  if (!doc) return c.json({ error: "المستند غير موجود" }, 404);

  await pool.query("DELETE FROM contract_documents WHERE id=$1", [docId]);
  return c.json({ success: true });
});
