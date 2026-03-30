import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, gte, lte, sql, count, sum, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  paymentTransactions, merchantSettlements, paymentSettings,
  organizations, invoices,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { buildMoyasarPaymentUrl, fetchPayment, refundPayment, sarToHalala, halalaToSar } from "../lib/moyasar";
import { requirePermission, superAdminMiddleware } from "../middleware/auth";
import { fireBookingEvent } from "../lib/messaging-engine";
import type { AuthUser } from "../middleware/auth";

export const paymentsRouter = new Hono<{ Variables: { user: AuthUser | null; orgId: string; requestId: string } }>();

const PUBLISHABLE_KEY = process.env.MOYASAR_PUBLISHABLE_KEY ?? "";

// ============================================================
// MERCHANT — إعدادات الدفع
// ============================================================

/** GET /payments/settings */
paymentsRouter.get("/settings", requirePermission("finance", "view"), async (c) => {
  const orgId = getOrgId(c);
  const [setting] = await db
    .select()
    .from(paymentSettings)
    .where(eq(paymentSettings.orgId, orgId))
    .limit(1);
  return c.json({ data: setting ?? null });
});

/** PATCH /payments/settings */
paymentsRouter.patch("/settings", requirePermission("finance", "manage"), async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const schema = z.object({
    ibanNumber:  z.string().optional(),
    accountName: z.string().optional(),
    bankName:    z.string().optional(),
    notifyOnPayment: z.boolean().optional(),
  });
  const data = schema.parse(body);

  const [existing] = await db.select({ id: paymentSettings.id }).from(paymentSettings)
    .where(eq(paymentSettings.orgId, orgId)).limit(1);

  if (existing) {
    await db.update(paymentSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentSettings.orgId, orgId));
  } else {
    await db.insert(paymentSettings).values({ orgId, ...data });
  }

  const [updated] = await db.select().from(paymentSettings)
    .where(eq(paymentSettings.orgId, orgId)).limit(1);
  return c.json({ data: updated });
});

// ============================================================
// MERCHANT — استرداد دفعة
// ============================================================

/** POST /payments/transactions/:id/refund */
paymentsRouter.post("/transactions/:id/refund", requirePermission("finance", "manage"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;
  const body  = await c.req.json().catch(() => ({}));
  const refundAmount = body.amount ? Number(body.amount) : undefined;

  const [tx] = await db.select().from(paymentTransactions)
    .where(and(eq(paymentTransactions.id, id), eq(paymentTransactions.orgId, orgId))).limit(1);

  if (!tx)           return c.json({ error: "المعاملة غير موجودة" }, 404);
  if (tx.status !== "paid") return c.json({ error: "لا يمكن استرداد معاملة غير مدفوعة" }, 400);
  if (!tx.moyasarId) return c.json({ error: "لا يوجد معرّف Moyasar للمعاملة" }, 400);

  try {
    const halala = refundAmount ? sarToHalala(refundAmount) : undefined;
    await refundPayment(tx.moyasarId, halala);

    await db.update(paymentTransactions)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(paymentTransactions.id, id));

    // تحديث الفاتورة المرتبطة
    if (tx.invoiceId) {
      await db.update(invoices)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(and(eq(invoices.id, tx.invoiceId), eq(invoices.orgId, orgId)));
    }

    return c.json({ data: { refunded: true } });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// MERCHANT — قائمة المعاملات
// ============================================================

/** GET /payments/transactions */
paymentsRouter.get("/transactions", requirePermission("finance", "view"), async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const from   = c.req.query("from");
  const to     = c.req.query("to");

  const conditions = [eq(paymentTransactions.orgId, orgId)];
  if (status) conditions.push(eq(paymentTransactions.status, status as any));
  if (from)   conditions.push(gte(paymentTransactions.createdAt, new Date(from)));
  if (to)     conditions.push(lte(paymentTransactions.createdAt, new Date(to)));

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(paymentTransactions)
      .where(and(...conditions))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(paymentTransactions)
      .where(and(...conditions)),
  ]);

  return c.json({ data: rows, total });
});

/** GET /payments/transactions/stats */
paymentsRouter.get("/transactions/stats", requirePermission("finance", "view"), async (c) => {
  const orgId = getOrgId(c);
  const [stats] = await db
    .select({
      totalPaid:        sum(sql`CASE WHEN status='paid' THEN merchant_amount ELSE 0 END`),
      totalFees:        sum(sql`CASE WHEN status='paid' THEN platform_fee ELSE 0 END`),
      countPaid:        count(sql`CASE WHEN status='paid' THEN 1 END`),
      countPending:     count(sql`CASE WHEN status='pending' THEN 1 END`),
      countFailed:      count(sql`CASE WHEN status='failed' THEN 1 END`),
      unsettledAmount:  sum(sql`CASE WHEN status='paid' AND settlement_id IS NULL THEN merchant_amount ELSE 0 END`),
    })
    .from(paymentTransactions)
    .where(eq(paymentTransactions.orgId, orgId));

  return c.json({ data: stats });
});

// ============================================================
// PUBLIC — إنشاء جلسة دفع
// ============================================================

/** POST /payments/initiate  (لا يحتاج auth — عميل يدفع) */
paymentsRouter.post("/initiate", async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    orgSlug:     z.string(),
    invoiceId:   z.string().uuid().optional(),
    bookingId:   z.string().uuid().optional(),
    customerId:  z.string().uuid().optional(),
    amount:      z.number().positive(),
    description: z.string().default("دفع عبر نسق"),
    callbackUrl: z.string().url(),
    metadata:    z.record(z.string()).optional(),
  });

  const data = schema.parse(body);

  // جلب المنشأة
  const [org] = await db.select({
    id:   organizations.id,
    name: organizations.name,
  }).from(organizations).where(eq(organizations.slug, data.orgSlug)).limit(1);

  if (!org) return c.json({ error: "المنشأة غير موجودة" }, 404);

  // جلب إعدادات الدفع
  const [settings] = await db.select().from(paymentSettings)
    .where(eq(paymentSettings.orgId, org.id)).limit(1);

  if (!settings?.enabled) {
    return c.json({ error: "الدفع الإلكتروني غير مفعّل لهذه المنشأة" }, 400);
  }

  if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === "__FILL__") {
    return c.json({ error: "بوابة الدفع غير مهيأة" }, 503);
  }

  // حساب رسوم المنصة
  const feePercent = Number(settings.platformFeePercent ?? 2.5);
  const feeFixed   = Number(settings.platformFeeFixed ?? 0);
  const platformFee    = Math.round((data.amount * feePercent / 100 + feeFixed) * 100) / 100;
  const merchantAmount = Math.round((data.amount - platformFee) * 100) / 100;

  // إنشاء معاملة معلقة
  const [tx] = await db.insert(paymentTransactions).values({
    orgId:          org.id,
    invoiceId:      data.invoiceId ?? null,
    bookingId:      data.bookingId ?? null,
    customerId:     data.customerId ?? null,
    amount:         String(data.amount),
    platformFee:    String(platformFee),
    merchantAmount: String(merchantAmount),
    currency:       "SAR",
    status:         "pending",
    description:    data.description,
    successUrl:     data.callbackUrl,
    failureUrl:     data.callbackUrl,
    metadata:       data.metadata ?? {},
  }).returning();

  // بناء رابط Moyasar
  const payUrl = buildMoyasarPaymentUrl({
    publishableKey: PUBLISHABLE_KEY,
    amount:         sarToHalala(data.amount),
    currency:       "SAR",
    description:    data.description,
    callbackUrl:    data.callbackUrl,
    metadata: {
      ...(data.metadata ?? {}),
      nasaq_tx_id: tx.id,
      org_id:      org.id,
    },
  });

  return c.json({ data: { transactionId: tx.id, paymentUrl: payUrl } });
});

// ============================================================
// CALLBACK — مساعد مشترك لمعالجة نتيجة الدفع
// ============================================================

async function processMoyasarPayment(moyasarId: string, txId?: string | null) {
  const payment = await fetchPayment(moyasarId);

  // إيجاد المعاملة
  const whereClause = txId
    ? eq(paymentTransactions.id, txId)
    : eq(paymentTransactions.moyasarId, moyasarId);

  const [tx] = await db.select().from(paymentTransactions).where(whereClause).limit(1);
  if (!tx) return { error: "المعاملة غير موجودة" };

  // تجنب إعادة المعالجة
  if (tx.status === "paid" && payment.status === "paid") {
    return { alreadyProcessed: true, tx };
  }

  const updateData: any = {
    moyasarId:     payment.id,
    moyasarStatus: payment.status,
    moyasarData:   payment as any,
    updatedAt:     new Date(),
  };

  if (payment.status === "paid") {
    updateData.status        = "paid";
    updateData.paidAt        = new Date();
    updateData.paymentMethod = payment.source?.type ?? null;
    if (payment.source?.number) {
      updateData.cardInfo = { brand: payment.source.company, last4: payment.source.number };
    }

    // ── تحديث الفاتورة المرتبطة تلقائياً ──────────────────
    if (tx.invoiceId) {
      await db.update(invoices)
        .set({ status: "paid", paidAmount: tx.amount, paidAt: new Date(), updatedAt: new Date() })
        .where(and(eq(invoices.id, tx.invoiceId), eq(invoices.orgId, tx.orgId)));
    }

    // ── إشعار للتاجر ───────────────────────────────────────
    try {
      await fireBookingEvent("payment_received", {
        orgId:     tx.orgId,
        bookingId: tx.bookingId ?? undefined,
        amount:    Number(tx.amount),
      });
    } catch { /* إشعار اختياري — لا يوقف المعالجة */ }

  } else if (["failed", "cancelled", "voided"].includes(payment.status)) {
    updateData.status = "failed";
  }

  const [updated] = await db.update(paymentTransactions)
    .set(updateData).where(whereClause).returning();

  return { tx: updated, paymentStatus: payment.status };
}

// ============================================================
// CALLBACK — Moyasar يعيد توجيه العميل (GET redirect)
// ============================================================

/** GET /payments/callback */
paymentsRouter.get("/callback", async (c) => {
  const moyasarId = c.req.query("id");
  const txId      = c.req.query("nasaq_tx_id") ?? c.req.query("metadata[nasaq_tx_id]") ?? null;

  if (!moyasarId) return c.json({ error: "معرّف الدفع مفقود" }, 400);

  try {
    const result = await processMoyasarPayment(moyasarId, txId);
    if ("error" in result) return c.json({ error: result.error }, 404);
    return c.json({ data: { status: result.paymentStatus ?? "processed", moyasarId } });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// WEBHOOK — Moyasar يُرسل إشعار server-to-server
// ============================================================

/** POST /payments/webhook  (Moyasar server-to-server) */
paymentsRouter.post("/webhook", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.id) return c.json({ error: "payload غير صالح" }, 400);

  // التحقق من signature إذا كان webhook_secret مضبوطاً
  const secret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (secret) {
    const rawBody   = JSON.stringify(body);
    const signature = c.req.header("x-moyasar-signature") ?? "";
    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (signature !== expected) return c.json({ error: "توقيع غير صالح" }, 401);
  }

  try {
    const txId = body.metadata?.nasaq_tx_id ?? null;
    await processMoyasarPayment(body.id, txId);
    return c.json({ received: true });
  } catch (err: any) {
    // إعادة 200 حتى Moyasar لا يُعيد المحاولة لأخطاء غير حرجة
    return c.json({ received: true, note: err.message });
  }
});

// ============================================================
// ADMIN — إدارة المعاملات والتسويات
// ============================================================

const adminPayments = new Hono<{ Variables: { user: AuthUser | null; orgId: string; requestId: string } }>();
adminPayments.use("*", superAdminMiddleware);

/** GET /payments/admin/transactions */
adminPayments.get("/transactions", async (c) => {
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const orgId  = c.req.query("orgId");
  const from   = c.req.query("from");
  const to     = c.req.query("to");

  const conditions = [];
  if (status) conditions.push(eq(paymentTransactions.status, status as any));
  if (orgId)  conditions.push(eq(paymentTransactions.orgId, orgId));
  if (from)   conditions.push(gte(paymentTransactions.createdAt, new Date(from)));
  if (to)     conditions.push(lte(paymentTransactions.createdAt, new Date(to)));

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      tx:  paymentTransactions,
      org: { id: organizations.id, name: organizations.name, slug: organizations.slug },
    })
      .from(paymentTransactions)
      .leftJoin(organizations, eq(paymentTransactions.orgId, organizations.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(paymentTransactions)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  return c.json({ data: rows, total });
});

/** GET /payments/admin/stats */
adminPayments.get("/stats", async (c) => {
  const [stats] = await db
    .select({
      totalVolume:   sum(sql`CASE WHEN status='paid' THEN amount ELSE 0 END`),
      totalFees:     sum(sql`CASE WHEN status='paid' THEN platform_fee ELSE 0 END`),
      totalPaid:     count(sql`CASE WHEN status='paid' THEN 1 END`),
      totalPending:  count(sql`CASE WHEN status='pending' THEN 1 END`),
      totalFailed:   count(sql`CASE WHEN status='failed' THEN 1 END`),
      unsettled:     sum(sql`CASE WHEN status='paid' AND settlement_id IS NULL THEN merchant_amount ELSE 0 END`),
    })
    .from(paymentTransactions);

  return c.json({ data: stats });
});

/** GET /payments/admin/settlements */
adminPayments.get("/settlements", async (c) => {
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const orgId  = c.req.query("orgId");

  const conditions = [];
  if (status) conditions.push(eq(merchantSettlements.status, status as any));
  if (orgId)  conditions.push(eq(merchantSettlements.orgId, orgId));

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      settlement: merchantSettlements,
      org: { id: organizations.id, name: organizations.name },
    })
      .from(merchantSettlements)
      .leftJoin(organizations, eq(merchantSettlements.orgId, organizations.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(merchantSettlements.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(merchantSettlements)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  return c.json({ data: rows, total });
});

/** POST /payments/admin/settlements  — إنشاء تسوية جديدة */
adminPayments.post("/settlements", async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    orgId:       z.string().uuid(),
    periodStart: z.string().datetime(),
    periodEnd:   z.string().datetime(),
    adminNote:   z.string().optional(),
  });
  const data = schema.parse(body);
  const adminId = getUserId(c);

  // جمع المعاملات المدفوعة غير المُسوّاة في الفترة
  const txRows = await db.select().from(paymentTransactions)
    .where(and(
      eq(paymentTransactions.orgId, data.orgId),
      eq(paymentTransactions.status, "paid"),
      sql`settlement_id IS NULL`,
      gte(paymentTransactions.paidAt, new Date(data.periodStart)),
      lte(paymentTransactions.paidAt, new Date(data.periodEnd)),
    ));

  if (!txRows.length) return c.json({ error: "لا توجد معاملات مدفوعة غير مُسوّاة في هذه الفترة" }, 400);

  const totalAmount    = txRows.reduce((s, t) => s + Number(t.amount), 0);
  const totalFee       = txRows.reduce((s, t) => s + Number(t.platformFee), 0);
  const netAmount      = txRows.reduce((s, t) => s + Number(t.merchantAmount), 0);

  // جلب IBAN من إعدادات المنشأة
  const [settings] = await db.select().from(paymentSettings)
    .where(eq(paymentSettings.orgId, data.orgId)).limit(1);

  const [settlement] = await db.insert(merchantSettlements).values({
    orgId:           data.orgId,
    totalAmount:     String(totalAmount),
    totalPlatformFee: String(totalFee),
    netAmount:       String(netAmount),
    periodStart:     new Date(data.periodStart),
    periodEnd:       new Date(data.periodEnd),
    ibanNumber:      settings?.ibanNumber ?? null,
    accountName:     settings?.accountName ?? null,
    adminNote:       data.adminNote ?? null,
    status:          "pending",
  }).returning();

  // ربط المعاملات بالتسوية
  await db.update(paymentTransactions)
    .set({ settlementId: settlement.id })
    .where(inArray(paymentTransactions.id, txRows.map(t => t.id)));

  return c.json({ data: settlement }, 201);
});

/** PATCH /payments/admin/settlements/:id — تحديث حالة التسوية */
adminPayments.patch("/settlements/:id", async (c) => {
  const id = c.req.param("id")!;
  const body = await c.req.json();
  const schema = z.object({
    status:          z.enum(["pending", "processing", "completed", "failed"]).optional(),
    payoutReference: z.string().optional(),
    adminNote:       z.string().optional(),
  });
  const data = schema.parse(body);
  const adminId = getUserId(c);

  const updateData: any = { ...data };
  if (data.status === "completed") {
    updateData.completedAt = new Date();
    updateData.completedBy = adminId;
  }

  await db.update(merchantSettlements).set(updateData).where(eq(merchantSettlements.id, id));

  const [updated] = await db.select().from(merchantSettlements)
    .where(eq(merchantSettlements.id, id)).limit(1);
  return c.json({ data: updated });
});

/** GET /payments/admin/org-settings — إعدادات الدفع لمنشأة معينة */
adminPayments.get("/org-settings/:orgId", async (c) => {
  const orgId = c.req.param("orgId")!;
  const [setting] = await db.select().from(paymentSettings)
    .where(eq(paymentSettings.orgId, orgId)).limit(1);
  return c.json({ data: setting ?? null });
});

/** PATCH /payments/admin/org-settings/:orgId — تعديل إعدادات + رسوم منشأة */
adminPayments.patch("/org-settings/:orgId", async (c) => {
  const orgId = c.req.param("orgId")!;
  const body = await c.req.json();
  const schema = z.object({
    enabled:            z.boolean().optional(),
    platformFeePercent: z.string().optional(),
    platformFeeFixed:   z.string().optional(),
    ibanNumber:         z.string().optional(),
    accountName:        z.string().optional(),
    bankName:           z.string().optional(),
  });
  const data = schema.parse(body);

  const [existing] = await db.select({ id: paymentSettings.id }).from(paymentSettings)
    .where(eq(paymentSettings.orgId, orgId)).limit(1);

  if (existing) {
    await db.update(paymentSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentSettings.orgId, orgId));
  } else {
    await db.insert(paymentSettings).values({ orgId, ...data });
  }

  const [updated] = await db.select().from(paymentSettings)
    .where(eq(paymentSettings.orgId, orgId)).limit(1);
  return c.json({ data: updated });
});

// ماونت admin تحت /payments/admin
paymentsRouter.route("/admin", adminPayments);
