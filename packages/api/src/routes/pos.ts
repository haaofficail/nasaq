import { Hono } from "hono";
import { z } from "zod";
import { pool, db } from "@nasaq/db/client";
import { invoices, invoiceItems, organizations } from "@nasaq/db/schema";
import { and, eq, desc, sql, count } from "drizzle-orm";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import {
  getAccountsByKeys, createJournalEntry, reverseJournalEntry,
  isAccountingEnabled, postInventoryMovement,
} from "../lib/posting-engine";
import { nanoid } from "nanoid";
import { DEFAULT_VAT_RATE } from "@nasaq/db/constants";
import { lookupByBarcode } from "../lib/barcode";
import { log } from "../lib/logger";

// ============================================================
// INVENTORY HELPERS — POS stock deduction
// ============================================================

/** Deduct stock from flower_inventory after POS sale */
async function deductPOSInventory(orgId: string, items: { id?: string; name: string; quantity: number; price: number }[]) {
  for (const item of items) {
    if (!item.id) continue;
    // Atomic deduct — only if sufficient stock (prevents oversell under concurrency)
    const res = await pool.query(
      `UPDATE flower_inventory SET stock = stock - $1, updated_at = NOW()
       WHERE id = $2 AND org_id = $3 AND stock >= $1
       RETURNING id`,
      [item.quantity, item.id, orgId],
    );
    if (res.rowCount === 0) {
      log.error(`[POS_INVENTORY] insufficient stock for item=${item.id} name=${item.name} qty=${item.quantity} org=${orgId}`);
    }
    // Post COGS entry
    try {
      await postInventoryMovement({
        orgId,
        productId: item.id,
        productName: item.name,
        movementType: "out",
        quantity: item.quantity,
        unitCost: item.price,
        description: `بيع POS: ${item.name} × ${item.quantity}`,
      });
    } catch { /* COGS is optional */ }
  }
}

/** Restore stock when POS sale is refunded */
async function restorePOSInventory(orgId: string, items: any[]) {
  const parsed = typeof items === "string" ? JSON.parse(items) : items;
  if (!Array.isArray(parsed)) return;
  for (const item of parsed) {
    const itemId = item.id || item.product_id;
    const qty = item.quantity || item.qty || 1;
    if (!itemId) continue;
    await pool.query(
      `UPDATE flower_inventory SET stock = stock + $1, updated_at = NOW()
       WHERE id = $2 AND org_id = $3`,
      [qty, itemId, orgId],
    );
  }
}

// ============================================================
// SCHEMAS
// ============================================================

const paymentRowSchema = z.object({
  method: z.enum(["cash", "card", "mada", "apple_pay", "bank_transfer"]),
  amount: z.number().min(0),
  reference: z.string().optional().nullable(),
});

const saleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1, { message: "الكمية يجب أن تكون 1 على الأقل" }),
  price: z.number().min(0, { message: "السعر يجب أن يكون 0 أو أكثر" }),
  staffId: z.string().uuid({ message: "معرّف الموظف غير صحيح" }).optional().nullable(),
  staffName: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentRowSchema).min(1),
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().max(200).optional().nullable(),
  customerPhone: z.string().max(20).optional().nullable(),
  discountType: z.enum(["fixed", "percent"]).optional().nullable(),
  discountValue: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  soldBy: z.string().uuid().optional().nullable(),
  soldByName: z.string().optional().nullable(),
});

const splitPartSchema = z.object({
  items: z.array(saleItemSchema).optional(),  // for 'items' mode
  amount: z.number().min(0),                  // pre-calculated total for this part
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().max(200).optional().nullable(),
  customerPhone: z.string().max(20).optional().nullable(),
  payments: z.array(paymentRowSchema).min(1),
});

const createSplitSaleSchema = z.object({
  splitType: z.enum(["equal", "items", "amount"]),
  allItems: z.array(saleItemSchema).min(1),   // full cart (for parent transaction)
  parts: z.array(splitPartSchema).min(2),
  notes: z.string().optional().nullable(),
  soldBy: z.string().uuid().optional().nullable(),
  soldByName: z.string().optional().nullable(),
});

// ============================================================
// HELPERS
// ============================================================

function calcTotals(items: { price: number; quantity: number }[], discountType: string | null | undefined, discountValue: number) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  let discountAmount = 0;
  if (discountType === "percent") discountAmount = +(subtotal * discountValue / 100).toFixed(2);
  else if (discountType === "fixed") discountAmount = Math.min(discountValue, subtotal);
  const taxable = +(subtotal - discountAmount).toFixed(2);
  const vatAmount = +(taxable * DEFAULT_VAT_RATE / 100).toFixed(2);
  const total = +(taxable + vatAmount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), discountAmount, taxable, vatAmount, total };
}

async function generatePOSInvoiceNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = nanoid(5).toUpperCase();
  return `POS-${year}-${seq}`;
}

function generateZATCAQR(data: { sellerName: string; vatNumber: string; timestamp: string; totalWithVat: string; vatAmount: string }): string {
  const fields = [
    { tag: 1, value: data.sellerName },
    { tag: 2, value: data.vatNumber },
    { tag: 3, value: data.timestamp },
    { tag: 4, value: data.totalWithVat },
    { tag: 5, value: data.vatAmount },
  ];
  const tlv = fields.map(f => {
    const valueBytes = new TextEncoder().encode(f.value);
    return new Uint8Array([f.tag, valueBytes.length, ...valueBytes]);
  });
  const combined = new Uint8Array(tlv.reduce((acc, arr) => acc + arr.length, 0));
  let offset = 0;
  tlv.forEach(arr => { combined.set(arr, offset); offset += arr.length; });
  return Buffer.from(combined).toString("base64");
}

/** Creates invoice + invoice_items rows. Returns the invoice record. */
async function createPOSInvoice(params: {
  orgId: string;
  transactionId: string;
  sellerName: string;
  sellerVat: string;
  buyerName: string;
  buyerPhone: string | null;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discountAmount: number;
  taxable: number;
  vatAmount: number;
  total: number;
  notes?: string | null;
  parentInvoiceId?: string | null;
  splitType?: string | null;
  splitIndex?: number | null;
  splitTotal?: number | null;
}) {
  const invoiceNumber = await generatePOSInvoiceNumber(params.orgId);
  const invoiceUuid = crypto.randomUUID();
  const qrCode = generateZATCAQR({
    sellerName: params.sellerName,
    vatNumber: params.sellerVat,
    timestamp: new Date().toISOString(),
    totalWithVat: String(params.total),
    vatAmount: String(params.vatAmount),
  });

  return db.transaction(async (tx) => {
    const [inv] = await tx.insert(invoices).values({
      orgId: params.orgId,
      invoiceNumber,
      uuid: invoiceUuid,
      invoiceType: "simplified",
      sourceType: "pos",
      status: "paid",
      bookingId: null,
      customerId: null,
      sellerName: params.sellerName,
      sellerVatNumber: params.sellerVat || null,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      subtotal: String(params.subtotal),
      discountAmount: String(params.discountAmount),
      taxableAmount: String(params.taxable),
      vatRate: String(DEFAULT_VAT_RATE),
      vatAmount: String(params.vatAmount),
      totalAmount: String(params.total),
      paidAmount: String(params.total),
      qrCode,
      issueDate: new Date(),
      paidAt: new Date(),
      notes: params.notes || null,
      parentInvoiceId: params.parentInvoiceId || null,
      splitType: params.splitType || null,
      splitIndex: params.splitIndex || null,
      splitTotal: params.splitTotal || null,
    }).returning();

    if (params.items.length > 0) {
      await tx.insert(invoiceItems).values(params.items.map((item, i) => {
        const taxable = +(item.price * item.quantity).toFixed(2);
        const vat = +(taxable * DEFAULT_VAT_RATE / 100).toFixed(2);
        return {
          invoiceId: inv.id,
          description: item.name,
          quantity: String(item.quantity),
          unitPrice: String(item.price),
          discountAmount: "0",
          taxableAmount: String(taxable),
          vatRate: String(DEFAULT_VAT_RATE),
          vatAmount: String(vat),
          totalAmount: String(+(taxable + vat).toFixed(2)),
          sortOrder: i,
        };
      }));
    }

    return inv;
  });
}

/** Posts journal entry for a POS sale with potentially mixed payment methods. */
async function postPOSSaleEntry(params: {
  orgId: string;
  payments: { method: string; amount: number }[];
  subtotal: number;
  vatAmount: number;
  description: string;
  sourceId: string;
  createdBy?: string;
}) {
  const accounts = await getAccountsByKeys(params.orgId, [
    "MAIN_CASH", "MAIN_BANK", "SALES_REVENUE", "VAT_PAYABLE",
  ]);
  if (!accounts.SALES_REVENUE) return null;

  const lines = [];
  for (const pay of params.payments) {
    const accId = pay.method === "cash" ? accounts.MAIN_CASH : accounts.MAIN_BANK;
    if (accId && pay.amount > 0) {
      lines.push({ accountId: accId, debit: +pay.amount.toFixed(2), description: pay.method === "cash" ? "نقد" : pay.method === "card" ? "بطاقة" : "تحويل بنكي" });
    }
  }
  if (lines.length === 0) return null;

  lines.push({ accountId: accounts.SALES_REVENUE, credit: params.subtotal });
  if (params.vatAmount > 0 && accounts.VAT_PAYABLE) {
    lines.push({ accountId: accounts.VAT_PAYABLE, credit: params.vatAmount });
  }

  return createJournalEntry({
    orgId: params.orgId,
    date: new Date(),
    description: params.description,
    sourceType: "pos",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines,
  });
}

// ============================================================
// ROUTER
// ============================================================

export const posRouter = new Hono();

// GET /pos/today — today's transactions with details
posRouter.get("/today", async (c) => {
  const orgId = getOrgId(c);
  const today = new Date().toISOString().split("T")[0];
  const result = await pool.query(
    `SELECT id, transaction_number, type, customer_id, customer_name, customer_phone,
            items, subtotal, discount_amount, tax_amount, total_amount, payments, change_amount,
            notes, sold_by, sold_by_name, status, parent_transaction_id, split_type,
            invoice_id, created_at
     FROM pos_transactions
     WHERE org_id = $1 AND created_at::date = $2 AND type = 'sale' AND status = 'completed'
     ORDER BY created_at DESC`,
    [orgId, today]
  );
  return c.json({ data: result.rows });
});

// GET /pos/transactions (paginated)
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
    `SELECT id, transaction_number, type, customer_name, customer_phone,
            items, subtotal, discount_amount, tax_amount, total_amount, payments,
            change_amount, notes, sold_by_name, status, parent_transaction_id, split_type,
            invoice_id, created_at
     FROM pos_transactions ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return c.json({ data: result.rows });
});

// GET /pos/stats
posRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const date = c.req.query("date") || new Date().toISOString().split("T")[0];

  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE type = 'sale' AND status = 'completed')::int  AS sales_count,
       COALESCE(SUM(total_amount) FILTER (WHERE type = 'sale' AND status = 'completed'), 0) AS total_sales,
       COALESCE(AVG(total_amount) FILTER (WHERE type = 'sale' AND status = 'completed'), 0) AS avg_sale,
       COUNT(*) FILTER (WHERE type = 'refund')::int                         AS refunds_count,
       COALESCE(SUM(total_amount) FILTER (WHERE type = 'refund'), 0)        AS total_refunds
     FROM pos_transactions
     WHERE org_id = $1 AND created_at::date = $2`,
    [orgId, date]
  );

  // Payment method breakdown
  const methodResult = await pool.query(
    `SELECT
       pm->>'method' AS method,
       SUM((pm->>'amount')::numeric) AS total
     FROM pos_transactions,
          jsonb_array_elements(payments) AS pm
     WHERE org_id = $1 AND created_at::date = $2 AND type = 'sale' AND status = 'completed'
     GROUP BY pm->>'method'`,
    [orgId, date]
  );
  const byMethod = Object.fromEntries(methodResult.rows.map((r: any) => [r.method, Number(r.total)]));

  return c.json({ data: { ...result.rows[0], byMethod } });
});

// POST /pos/sale — create a complete POS sale
posRouter.post("/sale", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createSaleSchema.parse(await c.req.json());

  const { subtotal, discountAmount, taxable, vatAmount, total } =
    calcTotals(body.items, body.discountType, body.discountValue ?? 0);

  const paymentsTotal = body.payments.reduce((s, p) => s + p.amount, 0);
  if (Math.abs(paymentsTotal - total) > 0.05) {
    return c.json({ error: "مجموع طرق الدفع لا يساوي الإجمالي" }, 400);
  }

  const changeAmount = Math.max(0, +(paymentsTotal - total).toFixed(2));
  const txNum = `POS-${nanoid(10).toUpperCase()}`;

  // Get org info for invoice
  const [orgRow] = await db.select({
    name: organizations.name,
    vatNumber: organizations.vatNumber,
    settings: organizations.settings,
  }).from(organizations).where(eq(organizations.id, orgId));

  // Insert pos_transaction — ON CONFLICT deduplicates retries
  const txResult = await pool.query(
    `INSERT INTO pos_transactions
       (org_id, transaction_number, type, customer_id, customer_name, customer_phone,
        items, subtotal, discount_type, discount_value, discount_amount,
        tax_percent, tax_amount, total_amount, payments, change_amount,
        notes, sold_by, sold_by_name, status)
     VALUES ($1,$2,'sale',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'completed')
     ON CONFLICT (org_id, transaction_number) DO UPDATE SET updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      orgId, txNum,
      body.customerId || null, body.customerName || "زائر", body.customerPhone || null,
      JSON.stringify(body.items),
      subtotal, body.discountType || null, body.discountValue || 0, discountAmount,
      DEFAULT_VAT_RATE, vatAmount, total,
      JSON.stringify(body.payments), changeAmount,
      body.notes || null, body.soldBy || userId || null, body.soldByName || null,
    ]
  );
  const tx = txResult.rows[0];

  // Create invoice — if it fails, roll back the transaction row (compensating delete)
  let invoice;
  try {
    invoice = await createPOSInvoice({
      orgId,
      transactionId: tx.id,
      sellerName: orgRow?.name || "نسق",
      sellerVat: (orgRow as any)?.vatNumber || "",
      buyerName: body.customerName || "زائر",
      buyerPhone: body.customerPhone || null,
      items: body.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
      subtotal, discountAmount, taxable, vatAmount, total,
      notes: body.notes,
    });
  } catch (err) {
    await pool.query(`DELETE FROM pos_transactions WHERE id = $1`, [tx.id]);
    throw err;
  }

  // Link invoice to transaction
  await pool.query(`UPDATE pos_transactions SET invoice_id = $1 WHERE id = $2`, [invoice.id, tx.id]);

  // Async: journal entry + customer stats + inventory deduction
  (async () => {
    try {
      if (isAccountingEnabled((orgRow?.settings as any) ?? {})) {
        await postPOSSaleEntry({
          orgId,
          payments: body.payments,
          subtotal: taxable,
          vatAmount,
          description: `مبيعات POS ${txNum} — ${body.customerName || "زائر"}`,
          sourceId: tx.id,
          createdBy: userId ?? undefined,
        });
      }
    } catch { /* لا يوقف العملية */ }

    // Deduct inventory for sold items
    try {
      await deductPOSInventory(orgId, body.items);
    } catch { /* لا يوقف */ }

    if (body.customerId) {
      try {
        await pool.query(
          `UPDATE customers SET
             total_spent = COALESCE(total_spent, 0) + $1,
             total_bookings = COALESCE(total_bookings, 0) + 1,
             last_booking_at = NOW()
           WHERE id = $2 AND org_id = $3`,
          [total, body.customerId, orgId]
        );
      } catch { /* لا يوقف */ }
    }
  })();

  insertAuditLog({ orgId, userId, action: "created", resource: "pos_sale", resourceId: tx.id, metadata: { total, txNum } });
  return c.json({ data: { transaction: { ...tx, invoice_id: invoice.id }, invoice } }, 201);
});

// POST /pos/sale/split — split bill sale
posRouter.post("/sale/split", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createSplitSaleSchema.parse(await c.req.json());

  const [orgRow] = await db.select({
    name: organizations.name,
    vatNumber: organizations.vatNumber,
    settings: organizations.settings,
  }).from(organizations).where(eq(organizations.id, orgId));

  // Create parent transaction (summary)
  const allTotals = calcTotals(body.allItems, null, 0);
  const parentTxNum = `POS-${nanoid(10).toUpperCase()}`;

  const parentResult = await pool.query(
    `INSERT INTO pos_transactions
       (org_id, transaction_number, type, items, subtotal, tax_percent, tax_amount, total_amount,
        payments, notes, sold_by, sold_by_name, split_type, status)
     VALUES ($1,$2,'sale',$3,$4,$5,$6,$7,'[]'::jsonb,$8,$9,$10,$11,'completed') RETURNING *`,
    [
      orgId, parentTxNum,
      JSON.stringify(body.allItems),
      allTotals.subtotal, DEFAULT_VAT_RATE, allTotals.vatAmount, allTotals.total,
      body.notes || null, body.soldBy || userId || null, body.soldByName || null,
      body.splitType,
    ]
  );
  const parentTx = parentResult.rows[0];

  // Create parent invoice (no items, just summary)
  const parentInvoice = await createPOSInvoice({
    orgId,
    transactionId: parentTx.id,
    sellerName: orgRow?.name || "نسق",
    sellerVat: (orgRow as any)?.vatNumber || "",
    buyerName: "فاتورة مقسّمة",
    buyerPhone: null,
    items: body.allItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
    subtotal: allTotals.subtotal,
    discountAmount: 0,
    taxable: allTotals.taxable,
    vatAmount: allTotals.vatAmount,
    total: allTotals.total,
    notes: body.notes,
    splitType: body.splitType,
    splitTotal: body.parts.length,
  });

  await pool.query(`UPDATE pos_transactions SET invoice_id = $1 WHERE id = $2`, [parentInvoice.id, parentTx.id]);

  const children: any[] = [];

  for (let i = 0; i < body.parts.length; i++) {
    const part = body.parts[i];
    const partItems = part.items || body.allItems;
    const partTotals = calcTotals(partItems, null, 0);
    // For 'equal' and 'amount' modes, use provided amount (may differ from calculated due to rounding)
    const partTotal = body.splitType === "items" ? partTotals.total : part.amount;
    const partVat = +(partTotal * DEFAULT_VAT_RATE / (100 + DEFAULT_VAT_RATE)).toFixed(2);
    const partSubtotal = +(partTotal - partVat).toFixed(2);

    const childTxNum = `${parentTxNum}-${String.fromCharCode(65 + i)}`; // POS-XXX-A, B, C...
    const childResult = await pool.query(
      `INSERT INTO pos_transactions
         (org_id, transaction_number, type, customer_id, customer_name, customer_phone,
          items, subtotal, tax_percent, tax_amount, total_amount, payments,
          sold_by, sold_by_name, parent_transaction_id, status)
       VALUES ($1,$2,'sale',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'completed') RETURNING *`,
      [
        orgId, childTxNum,
        part.customerId || null, part.customerName || `الجزء ${i + 1}`, part.customerPhone || null,
        JSON.stringify(partItems),
        partSubtotal, DEFAULT_VAT_RATE, partVat, partTotal,
        JSON.stringify(part.payments),
        body.soldBy || userId || null, body.soldByName || null,
        parentTx.id,
      ]
    );
    const childTx = childResult.rows[0];

    // Create child invoice
    const childInvoice = await createPOSInvoice({
      orgId,
      transactionId: childTx.id,
      sellerName: orgRow?.name || "نسق",
      sellerVat: (orgRow as any)?.vatNumber || "",
      buyerName: part.customerName || `الجزء ${i + 1}`,
      buyerPhone: part.customerPhone || null,
      items: partItems.map(itm => ({ name: itm.name, quantity: itm.quantity, price: itm.price })),
      subtotal: partSubtotal,
      discountAmount: 0,
      taxable: partSubtotal,
      vatAmount: partVat,
      total: partTotal,
      parentInvoiceId: parentInvoice.id,
      splitType: body.splitType,
      splitIndex: i + 1,
      splitTotal: body.parts.length,
    });

    await pool.query(`UPDATE pos_transactions SET invoice_id = $1 WHERE id = $2`, [childInvoice.id, childTx.id]);

    // Async: journal entry
    (async () => {
      try {
        if (isAccountingEnabled((orgRow?.settings as any) ?? {})) {
          await postPOSSaleEntry({
            orgId,
            payments: part.payments,
            subtotal: partSubtotal,
            vatAmount: partVat,
            description: `POS مقسّم ${childTxNum} — ${part.customerName || `الجزء ${i + 1}`}`,
            sourceId: childTx.id,
            createdBy: userId ?? undefined,
          });
        }
      } catch { /* لا يوقف */ }

      if (part.customerId) {
        try {
          await pool.query(
            `UPDATE customers SET total_spent = COALESCE(total_spent, 0) + $1, total_bookings = COALESCE(total_bookings, 0) + 1, last_booking_at = NOW() WHERE id = $2 AND org_id = $3`,
            [partTotal, part.customerId, orgId]
          );
        } catch { /* لا يوقف */ }
      }
    })();

    children.push({ transaction: childTx, invoice: childInvoice });
  }

  insertAuditLog({ orgId, userId, action: "created", resource: "pos_split_sale", resourceId: parentTx.id, metadata: { splitType: body.splitType, parts: body.parts.length } });
  return c.json({ data: { parentTransaction: parentTx, parentInvoice, children } }, 201);
});

// POST /pos/sale/:id/refund — full refund
posRouter.post("/sale/:id/refund", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { reason } = await c.req.json().catch(() => ({ reason: null }));

  const orig = await pool.query(
    `SELECT * FROM pos_transactions WHERE id = $1 AND org_id = $2 AND type = 'sale'`,
    [c.req.param("id"), orgId]
  );
  if (!orig.rows[0]) return c.json({ error: "العملية غير موجودة" }, 404);
  if (orig.rows[0].status === "refunded") return c.json({ error: "هذه العملية مستردة بالفعل" }, 400);

  const txNum = `REF-${nanoid(10).toUpperCase()}`;
  const result = await pool.query(
    `INSERT INTO pos_transactions
       (org_id, transaction_number, type, customer_id, customer_name, items,
        subtotal, tax_amount, total_amount, payments, original_transaction_id, refund_reason, status)
     VALUES ($1,$2,'refund',$3,$4,$5,$6,$7,$8,$9,$10,$11,'completed') RETURNING *`,
    [orgId, txNum, orig.rows[0].customer_id, orig.rows[0].customer_name, orig.rows[0].items,
     orig.rows[0].subtotal, orig.rows[0].tax_amount, orig.rows[0].total_amount,
     orig.rows[0].payments, orig.rows[0].id, reason || null]
  );

  // Mark original as refunded
  await pool.query(`UPDATE pos_transactions SET status = 'refunded' WHERE id = $1`, [orig.rows[0].id]);

  // Reverse journal entry + restore inventory (async)
  (async () => {
    // Reverse financial entry
    if (orig.rows[0].invoice_id) {
      try {
        const je = await pool.query(
          `SELECT je.id FROM journal_entries je WHERE je.source_id = $1 AND je.org_id = $2 AND je.source_type = 'pos' AND je.status = 'posted' LIMIT 1`,
          [orig.rows[0].id, orgId]
        );
        if (je.rows[0] && userId) {
          await reverseJournalEntry(je.rows[0].id, userId, reason || "استرداد POS");
        }
      } catch (err: any) {
        log.error(`[POS_REFUND] journal reversal failed txId=${orig.rows[0].id} ${err?.message}`);
      }
    }

    // Restore inventory for refunded items
    try {
      await restorePOSInventory(orgId, orig.rows[0].items);
    } catch (err: any) {
      log.error(`[POS_REFUND] inventory restore failed txId=${orig.rows[0].id} ${err?.message}`);
    }
  })();

  insertAuditLog({ orgId, userId, action: "deleted", resource: "pos_sale", resourceId: orig.rows[0].id, metadata: { refundTx: txNum, reason } });
  return c.json({ data: result.rows[0] }, 201);
});

// GET /pos/settings
posRouter.get("/settings", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(`SELECT * FROM pos_settings WHERE org_id = $1 LIMIT 1`, [orgId]);
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
      `UPDATE pos_settings SET tax_rate = COALESCE($1, tax_rate), currency = COALESCE($2, currency),
         allow_discount = COALESCE($3, allow_discount), receipt_footer = COALESCE($4, receipt_footer),
         updated_at = NOW() WHERE org_id = $5 RETURNING *`,
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
    `INSERT INTO pos_quick_items (org_id, name, price, category, color, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
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

// ============================================================
// GET /pos/barcode/:code — Barcode lookup for POS scanner
// ============================================================

posRouter.get("/barcode/:code", async (c) => {
  const orgId   = getOrgId(c);
  const barcode = c.req.param("code");
  const match   = await lookupByBarcode(orgId, barcode);
  if (!match) return c.json({ error: "لا يوجد منتج أو خدمة بهذا الباركود" }, 404);
  return c.json({ data: match });
});
