import { Hono } from "hono";
import { eq, and, desc, asc, gte, lte, sql, count, sum } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { invoices, invoiceItems, invoicePayments, expenses, vendorCommissions, vendorPayouts, paymentGatewayConfigs, bookings, payments, organizations, bookingItems } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { nanoid } from "nanoid";
import { z } from "zod";
import { DEFAULT_VAT_RATE } from "@nasaq/db/constants";
import { postCreditSale, postExpense, isAccountingEnabled, getAccountByKey } from "../lib/posting-engine";
import { insertAuditLog } from "../lib/audit";
import { requirePermission } from "../middleware/auth";
import { fireBookingEvent } from "../lib/messaging-engine";
import { sendInvoiceEmail, buildInvoiceData } from "../lib/invoice-pdf";
import { encryptString, decryptString } from "../lib/encryption";
import { pool } from "@nasaq/db/client";

const createExpenseSchema = z.object({
  category: z.enum(["marketing", "maintenance", "rent", "salaries", "equipment", "transport", "utilities", "supplies", "other"]),
  subcategory: z.string().optional(),
  description: z.string(),
  amount: z.string(),
  currency: z.string().optional(),
  expenseDate: z.string(),
  bookingId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.string().optional().nullable(),
  chartOfAccountId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createInvoiceSchema = z.object({
  invoiceType: z.enum(["simplified", "tax", "credit_note", "debit_note"]).optional(),
  sourceType: z.enum(["manual", "booking", "order", "services"]).optional(),
  bookingId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  sellerName: z.string().min(1),
  sellerVatNumber: z.string().optional().nullable(),
  sellerAddress: z.string().optional().nullable(),
  sellerCR: z.string().optional().nullable(),
  buyerName: z.string().min(1),
  buyerPhone: z.string().optional().nullable(),
  buyerEmail: z.string().email().optional().nullable(),
  buyerVatNumber: z.string().optional().nullable(),
  buyerCompanyName: z.string().optional().nullable(),
  buyerCrNumber: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  subtotal: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "subtotal must be a non-negative number" }),
  discountAmount: z.string().optional(),
  taxableAmount: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "taxableAmount must be a non-negative number" }),
  vatRate: z.string().optional(),
  vatAmount: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "vatAmount must be a non-negative number" }),
  totalAmount: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "totalAmount must be positive" }),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.string().optional(),
    unitPrice: z.string(),
    discountAmount: z.string().optional(),
    taxableAmount: z.string(),
    vatRate: z.string().optional(),
    vatAmount: z.string(),
    totalAmount: z.string(),
  })).optional(),
});

const generatePayoutSchema = z.object({
  vendorId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

const createGatewaySchema = z.object({
  provider: z.string(),
  displayName: z.string(),
  apiKey: z.string().optional().nullable(),
  publishableKey: z.string().optional().nullable(),
  secretKey: z.string().optional().nullable(),
  webhookSecret: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  supportedMethods: z.array(z.string()).optional(),
  transactionFeePercent: z.string().optional().nullable(),
  transactionFeeFixed: z.string().optional().nullable(),
});

export const financeRouter = new Hono();

// ============================================================
// INVOICES
// ============================================================

// GET /finance/invoices
financeRouter.get("/invoices", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status     = c.req.query("status");
  const type       = c.req.query("type");
  const customerId = c.req.query("customerId");
  const q          = c.req.query("q");

  const conditions = [eq(invoices.orgId, orgId)];
  if (status)     conditions.push(eq(invoices.status, status as any));
  if (type)       conditions.push(eq(invoices.invoiceType, type as any));
  if (customerId) conditions.push(eq(invoices.customerId, customerId));
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      sql`(${invoices.invoiceNumber} ILIKE ${like} OR ${invoices.buyerName} ILIKE ${like} OR ${invoices.buyerPhone} ILIKE ${like})`
    );
  }

  const [result, [{ total }]] = await Promise.all([
    db.select().from(invoices).where(and(...conditions)).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(invoices).where(and(...conditions)),
  ]);

  return c.json({ data: result, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

// GET /finance/invoices/:id
financeRouter.get("/invoices/:id", async (c) => {
  const orgId = getOrgId(c);
  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, c.req.param("id")), eq(invoices.orgId, orgId)));
  if (!invoice) return c.json({ error: "الفاتورة غير موجودة" }, 404);
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)).orderBy(asc(invoiceItems.sortOrder));
  return c.json({ data: { ...invoice, items } });
});

// GET /finance/invoices/stats
financeRouter.get("/invoices/stats", async (c) => {
  const orgId = getOrgId(c);
  const [totals] = await db.select({
    total: count(),
    totalAmount: sql<string>`COALESCE(SUM(CAST(${invoices.totalAmount} AS DECIMAL)) FILTER (WHERE ${invoices.status} != 'cancelled'), 0)`,
    paidAmount:  sql<string>`COALESCE(SUM(CAST(${invoices.totalAmount} AS DECIMAL)) FILTER (WHERE ${invoices.status} = 'paid'), 0)`,
    unpaidAmount: sql<string>`COALESCE(SUM(CAST(${invoices.totalAmount} AS DECIMAL)) FILTER (WHERE ${invoices.status} IN ('issued','sent','overdue')), 0)`,
    draftCount: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'draft')`,
  }).from(invoices).where(eq(invoices.orgId, orgId));
  return c.json({ data: totals });
});

// GET /finance/invoices/import-booking/:bookingId — fetch booking for invoice import
financeRouter.get("/invoices/import-booking/:bookingId", async (c) => {
  const orgId = getOrgId(c);
  const bookingId = c.req.param("bookingId");
  const [booking] = await db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.orgId, orgId)));
  if (!booking) return c.json({ error: "الحجز غير موجود" }, 404);
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId));
  return c.json({ data: { ...booking, items } });
});

// POST /finance/invoices — Create invoice (auto from booking or manual)
financeRouter.post("/invoices", async (c) => {
  const orgId = getOrgId(c);
  const body = createInvoiceSchema.parse(await c.req.json());

  // Generate ZATCA-compliant invoice number
  const year = new Date().getFullYear();
  const seq = nanoid(4).toUpperCase();
  const invoiceNumber = `INV-${year}-${seq}`;
  const invoiceUuid = crypto.randomUUID();

  // Generate QR code data (ZATCA TLV Base64)
  const qrData = generateZATCAQR({
    sellerName: body.sellerName,
    vatNumber: body.sellerVatNumber || "",
    timestamp: new Date().toISOString(),
    totalWithVat: body.totalAmount,
    vatAmount: body.vatAmount,
  });

  // Wrap both inserts in a transaction — prevents orphaned invoice with no items
  const invoice = await db.transaction(async (tx) => {
    const [inv] = await tx.insert(invoices).values({
      orgId,
      invoiceNumber,
      uuid: invoiceUuid,
      invoiceType: body.invoiceType || "simplified",
      sourceType: body.sourceType || "manual",
      status: "issued",
      bookingId: body.bookingId || null,
      customerId: body.customerId || null,
      sellerName: body.sellerName,
      sellerVatNumber: body.sellerVatNumber,
      sellerAddress: body.sellerAddress,
      sellerCR: body.sellerCR,
      buyerName: body.buyerName,
      buyerPhone: body.buyerPhone,
      buyerEmail: body.buyerEmail,
      buyerVatNumber: body.buyerVatNumber,
      buyerCompanyName: body.buyerCompanyName,
      buyerCrNumber: body.buyerCrNumber,
      buyerAddress: body.buyerAddress,
      subtotal: body.subtotal,
      discountAmount: body.discountAmount || "0",
      taxableAmount: body.taxableAmount,
      vatRate: body.vatRate || String(DEFAULT_VAT_RATE),
      vatAmount: body.vatAmount,
      totalAmount: body.totalAmount,
      qrCode: qrData,
      issueDate: new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      notes: body.notes,
    }).returning();

    if (body.items?.length) {
      await tx.insert(invoiceItems).values(body.items.map((item, i) => ({
        invoiceId: inv.id,
        description: item.description,
        quantity: item.quantity || "1",
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || "0",
        taxableAmount: item.taxableAmount,
        vatRate: item.vatRate || String(DEFAULT_VAT_RATE),
        vatAmount: item.vatAmount,
        totalAmount: item.totalAmount,
        sortOrder: i,
      })));
    }

    return inv;
  });

  // ترحيل محاسبي (غير متزامن — لا يُوقِف الرد)
  const userId = getUserId(c);
  (async () => {
    try {
      const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, orgId));
      if (!isAccountingEnabled((org?.settings as any) ?? {})) return;
      await postCreditSale({
        orgId,
        date: new Date(),
        amount: parseFloat(invoice.taxableAmount),
        vatAmount: parseFloat(invoice.vatAmount),
        description: `فاتورة ${invoice.invoiceNumber} — ${invoice.buyerName}`,
        sourceType: "invoice",
        sourceId: invoice.id,
        createdBy: userId ?? undefined,
      });
    } catch { /* فشل الترحيل لا يُوقف العملية */ }
  })();

  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "invoice", resourceId: invoice.id });

  // إرسال SMS/WhatsApp للعميل (fire-and-forget)
  fireBookingEvent("invoice_issued", {
    orgId,
    invoiceNumber: invoice.invoiceNumber,
    amount: parseFloat(invoice.totalAmount as string),
    extra: {
      customer_name:  invoice.buyerName ?? "",
      invoice_number: invoice.invoiceNumber ?? "",
      amount:         invoice.totalAmount ? String(parseFloat(invoice.totalAmount as string)) : "",
    },
  });

  // إرسال الفاتورة على الإيميل + واتساب تلقائياً (fire-and-forget)
  if (invoice.buyerEmail || invoice.buyerPhone) {
    (async () => {
      const invData = await buildInvoiceData(pool, invoice.id, orgId);
      if (!invData) return;
      if (invData.buyerEmail) await sendInvoiceEmail(invData);
      if (invData.buyerPhone) {
        const { sendWhatsApp } = await import("../lib/whatsapp");
        const fmt = (n: string | number) => parseFloat(String(n)).toLocaleString("ar-SA", { minimumFractionDigits: 2 });
        await sendWhatsApp(invData.buyerPhone, [
          `مرحباً ${invData.buyerName} 👋`,
          `تم إصدار فاتورتك من ${invData.sellerName}`,
          ``,
          `📄 رقم الفاتورة: ${invData.invoiceNumber}`,
          `💰 الإجمالي: ${fmt(invData.totalAmount)} ر.س`,
        ].join("\n"));
      }
    })().catch(() => {});
  }

  return c.json({ data: invoice }, 201);
});

// POST /finance/invoices/:id/send — إرسال الفاتورة يدوياً (إيميل + واتساب)
financeRouter.post("/invoices/:id/send", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  const invData = await buildInvoiceData(pool, id, orgId);
  if (!invData) return c.json({ error: "الفاتورة غير موجودة" }, 404);

  const results: Record<string, boolean> = { email: false, whatsapp: false };

  // إرسال الإيميل
  if (invData.buyerEmail) {
    results.email = await sendInvoiceEmail(invData);
  }

  // إرسال واتساب
  if (invData.buyerPhone) {
    const { sendWhatsApp } = await import("../lib/whatsapp");
    const fmt = (n: string | number) =>
      parseFloat(String(n)).toLocaleString("ar-SA", { minimumFractionDigits: 2 });

    const msg = [
      `مرحباً ${invData.buyerName} 👋`,
      `تم إصدار فاتورتك من ${invData.sellerName}`,
      ``,
      `📄 رقم الفاتورة: ${invData.invoiceNumber}`,
      `💰 الإجمالي: ${fmt(invData.totalAmount)} ر.س`,
      invData.dueDate ? `📅 تاريخ الاستحقاق: ${new Date(invData.dueDate).toLocaleDateString("ar-SA")}` : "",
    ].filter(Boolean).join("\n");

    results.whatsapp = await sendWhatsApp(invData.buyerPhone, msg);
  }

  insertAuditLog({
    orgId, userId: getUserId(c),
    action: "updated", resource: "invoice", resourceId: id,
    metadata: { action: "send", ...results },
  });

  // تحديث حالة الفاتورة إلى "sent"
  await db.update(invoices)
    .set({ status: "sent", updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));

  return c.json({ data: results });
});

// PATCH /finance/invoices/:id/status
financeRouter.patch("/invoices/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const invId = c.req.param("id");
  const { status } = await c.req.json();

  // If marking as paid, fetch totalAmount first to set paidAmount correctly
  let extraFields: Record<string, unknown> = {};
  if (status === "paid") {
    const [existing] = await db.select({ totalAmount: invoices.totalAmount })
      .from(invoices)
      .where(and(eq(invoices.id, invId), eq(invoices.orgId, orgId)));
    extraFields = { paidAt: new Date(), paidAmount: existing?.totalAmount ?? "0" };
  }

  const [inv] = await db.update(invoices)
    .set({ status, updatedAt: new Date(), ...extraFields } as any)
    .where(and(eq(invoices.id, invId), eq(invoices.orgId, orgId)))
    .returning();
  if (!inv) return c.json({ error: "الفاتورة غير موجودة" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "invoice", resourceId: inv.id });
  return c.json({ data: inv });
});

// GET /finance/invoices/:id/payments
financeRouter.get("/invoices/:id/payments", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(invoicePayments)
    .where(and(eq(invoicePayments.invoiceId, c.req.param("id")), eq(invoicePayments.orgId, orgId)))
    .orderBy(desc(invoicePayments.createdAt));
  return c.json({ data: result });
});

// POST /finance/invoices/:id/payments
financeRouter.post("/invoices/:id/payments", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const invoiceId = c.req.param("id");
  const body = z.object({
    amount: z.union([z.string(), z.number()]).transform(v => String(v)),
    paymentMethod: z.enum(["cash", "bank_transfer", "card", "online", "check", "other"]).optional().default("cash"),
    paymentDate: z.string().optional(),
    reference: z.string().optional().nullable(),
    referenceNumber: z.string().optional().nullable(),
    transferName: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).parse(await c.req.json());

  const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
  if (!inv) return c.json({ error: "الفاتورة غير موجودة" }, 404);

  const [payment] = await db.insert(invoicePayments).values({
    invoiceId,
    orgId,
    amount: body.amount,
    paymentMethod: body.paymentMethod,
    paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
    reference: body.referenceNumber ?? body.reference ?? null,
    transferName: body.transferName ?? null,
    notes: body.notes ?? null,
    createdBy: userId ?? null,
  }).returning();

  // Recalculate paid amount and update status
  const [{ totalPaid }] = await db.select({
    totalPaid: sql<string>`COALESCE(SUM(CAST(${invoicePayments.amount} AS DECIMAL)), 0)`,
  }).from(invoicePayments).where(eq(invoicePayments.invoiceId, invoiceId));

  const paid = parseFloat(totalPaid);
  const total = parseFloat(inv.totalAmount);
  const newStatus = paid >= total ? "paid" : paid > 0 ? "partially_paid" : inv.status;

  await db.update(invoices).set({
    paidAmount: paid.toFixed(2),
    status: newStatus as any,
    ...(newStatus === "paid" ? { paidAt: new Date() } : {}),
    updatedAt: new Date(),
  }).where(eq(invoices.id, invoiceId));

  insertAuditLog({ orgId, userId, action: "created", resource: "invoice_payment", resourceId: payment.id });
  return c.json({ data: payment }, 201);
});

// ============================================================
// EXPENSES
// ============================================================

financeRouter.get("/expenses", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const category = c.req.query("category");

  const conditions = [eq(expenses.orgId, orgId)];
  if (category) conditions.push(eq(expenses.category, category as any));

  const [result, [{ total }]] = await Promise.all([
    db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.expenseDate)).limit(limit).offset(offset),
    db.select({ total: count() }).from(expenses).where(and(...conditions)),
  ]);

  return c.json({ data: result, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

financeRouter.post("/expenses", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createExpenseSchema.parse(await c.req.json());
  const [expense] = await db.insert(expenses).values({
    orgId,
    ...body,
    expenseDate: new Date(body.expenseDate),
    chartOfAccountId: body.chartOfAccountId ?? null,
    createdBy: userId ?? null,
  }).returning();

  // ترحيل محاسبي (غير متزامن)
  (async () => {
    try {
      const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, orgId));
      if (!isAccountingEnabled((org?.settings as any) ?? {})) return;

      // جلب حساب المصروف: إما المحدد من المستخدم أو fallback حسب الفئة
      let expenseAccountId = body.chartOfAccountId ?? null;
      if (!expenseAccountId) {
        const categoryKeyMap: Record<string, string> = {
          salaries: "SALARIES_EXPENSE",
          rent: "RENT_EXPENSE",
        };
        const sysKey = categoryKeyMap[body.category] ?? null;
        if (sysKey) expenseAccountId = await getAccountByKey(orgId, sysKey as any);
      }
      if (!expenseAccountId) return; // لا يمكن الترحيل بدون حساب

      await postExpense({
        orgId,
        date: new Date(body.expenseDate),
        amount: parseFloat(body.amount),
        expenseAccountId,
        description: body.description,
        sourceId: expense.id,
        createdBy: userId ?? undefined,
      });
    } catch { /* فشل الترحيل لا يُوقف العملية */ }
  })();

  insertAuditLog({ orgId, userId, action: "created", resource: "expense", resourceId: expense.id });
  return c.json({ data: expense }, 201);
});

// ============================================================
// VENDOR PAYOUTS
// ============================================================

financeRouter.get("/payouts", async (c) => {
  const orgId = getOrgId(c);
  const vendorId = c.req.query("vendorId");
  const conditions = [eq(vendorPayouts.orgId, orgId)];
  if (vendorId) conditions.push(eq(vendorPayouts.vendorId, vendorId));
  const result = await db.select().from(vendorPayouts).where(and(...conditions)).orderBy(desc(vendorPayouts.createdAt));
  return c.json({ data: result });
});

financeRouter.post("/payouts/generate", requirePermission("finance", "approve"), async (c) => {
  const orgId = getOrgId(c);
  const { vendorId, periodStart, periodEnd } = generatePayoutSchema.parse(await c.req.json());

  // Get vendor's bookings in period
  const vendorBookings = await db.select().from(bookings).where(and(
    eq(bookings.orgId, orgId), eq(bookings.vendorId, vendorId),
    gte(bookings.eventDate, new Date(periodStart)), lte(bookings.eventDate, new Date(periodEnd)),
    sql`${bookings.status} NOT IN ('cancelled')`,
  ));

  // Get commission rate
  const [commission] = await db.select().from(vendorCommissions).where(and(
    eq(vendorCommissions.orgId, orgId), eq(vendorCommissions.vendorId, vendorId), eq(vendorCommissions.isActive, true),
  ));

  const grossAmount = vendorBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
  let commissionAmount = 0;
  if (commission) {
    commissionAmount = commission.commissionType === "percentage"
      ? grossAmount * (parseFloat(commission.commissionValue) / 100)
      : parseFloat(commission.commissionValue) * vendorBookings.length;
  }

  const [payout] = await db.insert(vendorPayouts).values({
    orgId, vendorId,
    periodStart: new Date(periodStart), periodEnd: new Date(periodEnd),
    grossAmount: grossAmount.toFixed(2), commissionAmount: commissionAmount.toFixed(2),
    netAmount: (grossAmount - commissionAmount).toFixed(2),
    bookingIds: vendorBookings.map(b => b.id), bookingCount: vendorBookings.length,
  }).returning();

  return c.json({ data: payout }, 201);
});

// ============================================================
// PAYMENT GATEWAY CONFIG
// ============================================================

// Encrypt the three sensitive credential fields before DB write
function encryptGatewayCreds<T extends { apiKey?: string | null; secretKey?: string | null; webhookSecret?: string | null }>(body: T): T {
  const result = { ...body };
  if (body.apiKey != null)       result.apiKey       = encryptString(body.apiKey) as T["apiKey"];
  if (body.secretKey != null)    result.secretKey    = encryptString(body.secretKey) as T["secretKey"];
  if (body.webhookSecret != null) result.webhookSecret = encryptString(body.webhookSecret) as T["webhookSecret"];
  return result;
}

// Strip sensitive fields from list/detail responses
function sanitizeGateway(g: Record<string, unknown>) {
  return {
    ...g,
    apiKey:        g.apiKey        ? "***" : null,
    secretKey:     g.secretKey     ? "***" : null,
    webhookSecret: g.webhookSecret ? "***" : null,
  };
}

financeRouter.get("/gateways", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(paymentGatewayConfigs).where(eq(paymentGatewayConfigs.orgId, orgId));
  return c.json({ data: result.map(sanitizeGateway) });
});

financeRouter.post("/gateways", async (c) => {
  const orgId = getOrgId(c);
  const body = encryptGatewayCreds(createGatewaySchema.parse(await c.req.json()));
  const [gw] = await db.insert(paymentGatewayConfigs).values({ orgId, ...body }).returning();
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "payment_gateway", resourceId: gw.id });
  return c.json({ data: sanitizeGateway(gw as unknown as Record<string, unknown>) }, 201);
});

financeRouter.put("/gateways/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = encryptGatewayCreds(createGatewaySchema.partial().parse(await c.req.json()));
  const [gw] = await db
    .update(paymentGatewayConfigs)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(paymentGatewayConfigs.id, c.req.param("id")), eq(paymentGatewayConfigs.orgId, orgId)))
    .returning();
  if (!gw) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "payment_gateway", resourceId: gw.id });
  return c.json({ data: sanitizeGateway(gw as unknown as Record<string, unknown>) });
});

// Decrypt and return raw credentials — owner/admin only
financeRouter.get("/gateways/:id/credentials", requirePermission("finance", "manage"), async (c) => {
  const orgId = getOrgId(c);
  const [gw] = await db
    .select()
    .from(paymentGatewayConfigs)
    .where(and(eq(paymentGatewayConfigs.id, c.req.param("id")!), eq(paymentGatewayConfigs.orgId, orgId)));
  if (!gw) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "view", resource: "payment_gateway_credentials", resourceId: gw.id });
  return c.json({
    data: {
      apiKey:        decryptString(gw.apiKey),
      publishableKey: gw.publishableKey,
      secretKey:     decryptString(gw.secretKey),
      webhookSecret: decryptString(gw.webhookSecret),
    },
  });
});

// ============================================================
// FINANCIAL REPORTS
// ============================================================

financeRouter.get("/reports/pnl", async (c) => {
  const orgId = getOrgId(c);
  const from = c.req.query("from") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const to = c.req.query("to") || new Date().toISOString();

  const [revenue] = await db.select({
    total: sql<string>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)`,
    count: count(),
  }).from(payments).where(and(
    eq(payments.orgId, orgId), eq(payments.status, "completed"),
    gte(payments.paidAt, new Date(from)), lte(payments.paidAt, new Date(to)),
  ));

  const [expenseTotal] = await db.select({
    total: sql<string>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
    count: count(),
  }).from(expenses).where(and(
    eq(expenses.orgId, orgId),
    gte(expenses.expenseDate, new Date(from)), lte(expenses.expenseDate, new Date(to)),
  ));

  // Expense breakdown by category
  const expenseBreakdown = await db.select({
    category: expenses.category,
    total: sql<string>`SUM(CAST(${expenses.amount} AS DECIMAL))`,
    count: count(),
  }).from(expenses).where(and(
    eq(expenses.orgId, orgId),
    gte(expenses.expenseDate, new Date(from)), lte(expenses.expenseDate, new Date(to)),
  )).groupBy(expenses.category);

  const rev = parseFloat(revenue.total);
  const exp = parseFloat(expenseTotal.total);

  return c.json({
    data: {
      period: { from, to },
      revenue: { total: rev, transactionCount: Number(revenue.count) },
      expenses: { total: exp, transactionCount: Number(expenseTotal.count), breakdown: expenseBreakdown },
      grossProfit: rev - exp,
      profitMargin: rev > 0 ? Math.round(((rev - exp) / rev) * 100) : 0,
    },
  });
});

financeRouter.get("/reports/cashflow", async (c) => {
  const orgId = getOrgId(c);
  const months = parseInt(c.req.query("months") || "6");

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Two GROUP BY queries instead of 2×months individual queries (QE3)
  const [inflowRows, outflowRows] = await Promise.all([
    db.select({
      month: sql<string>`to_char(date_trunc('month', ${payments.paidAt}), 'YYYY-MM')`,
      total: sql<string>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)`,
    }).from(payments)
      .where(and(
        eq(payments.orgId, orgId),
        eq(payments.status, "completed"),
        gte(payments.paidAt, startDate),
        lte(payments.paidAt, endDate),
      ))
      .groupBy(sql`date_trunc('month', ${payments.paidAt})`),
    db.select({
      month: sql<string>`to_char(date_trunc('month', ${expenses.expenseDate}), 'YYYY-MM')`,
      total: sql<string>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
    }).from(expenses)
      .where(and(
        eq(expenses.orgId, orgId),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate),
      ))
      .groupBy(sql`date_trunc('month', ${expenses.expenseDate})`),
  ]);

  const inflowMap = new Map(inflowRows.map((r) => [r.month, parseFloat(r.total)]));
  const outflowMap = new Map(outflowRows.map((r) => [r.month, parseFloat(r.total)]));

  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const inflow = inflowMap.get(month) ?? 0;
    const outflow = outflowMap.get(month) ?? 0;
    data.push({ month, inflow, outflow, net: inflow - outflow });
  }

  return c.json({ data });
});

// ============================================================
// GET /finance/commission-summary — ملخص عمولات الموظفين
// يحسب العمولة على أساس نسبة الخدمة (service_costs) أو نسبة الموظف (users.commissionRate)
// ============================================================

financeRouter.get("/commission-summary", async (c) => {
  const orgId = getOrgId(c);
  const year  = parseInt(c.req.query("year")  || String(new Date().getFullYear()));
  const month = parseInt(c.req.query("month") || String(new Date().getMonth() + 1));

  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59);

  // Single aggregation query: joins booking_items → services → service_costs → assigned user
  const rows = await db.execute(sql`
    SELECT
      b.assigned_user_id                                          AS "userId",
      u.name                                                      AS "userName",
      u.job_title                                                 AS "jobTitle",
      COALESCE(u.commission_rate::numeric, 10)                    AS "staffRate",
      COALESCE(u.salary::numeric, 0)                              AS "salary",
      COUNT(DISTINCT b.id)::int                                   AS "bookingCount",
      COALESCE(SUM(bi.total_price::numeric), 0)                   AS "totalRevenue",
      COALESCE(SUM(
        bi.total_price::numeric *
        COALESCE(sc.commission_percent::numeric, u.commission_rate::numeric, 10) / 100
      ), 0)                                                       AS "commissionAmount"
    FROM bookings b
    JOIN booking_items bi  ON bi.booking_id   = b.id
    JOIN services s        ON s.id            = bi.service_id
    LEFT JOIN service_costs sc ON sc.service_id = s.id AND sc.org_id = b.org_id
    LEFT JOIN users u      ON u.id            = b.assigned_user_id
    WHERE b.org_id    = ${orgId}
      AND b.status    = 'completed'
      AND b.event_date >= ${from}
      AND b.event_date <= ${to}
    GROUP BY b.assigned_user_id, u.name, u.job_title, u.commission_rate, u.salary
    ORDER BY "totalRevenue" DESC
  `);

  return c.json({ data: (rows as any).rows ?? [] });
});

// ============================================================
// GET /finance/reports/sales — تقرير المبيعات التفصيلي
// ============================================================

financeRouter.get("/reports/sales", async (c) => {
  const orgId   = getOrgId(c);
  const dateFrom = c.req.query("dateFrom");
  const dateTo   = c.req.query("dateTo");
  const status   = c.req.query("status"); // 'paid' | 'issued' | 'partially_paid'

  // Build date window (default: current month)
  const now   = new Date();
  const from  = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to    = dateTo   ? new Date(dateTo)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const conditions = [`i.org_id = $1`, `i.issue_date >= $2`, `i.issue_date <= $3`];
  const params: any[] = [orgId, from, to];

  if (status) {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  } else {
    conditions.push(`i.status != 'cancelled'`);
  }

  const where = conditions.join(" AND ");

  // Summary
  const summaryResult = await pool.query(`
    SELECT
      COALESCE(SUM(CAST(i.total_amount AS DECIMAL)), 0)    AS total_sales,
      COALESCE(SUM(CAST(i.paid_amount  AS DECIMAL)), 0)    AS paid_amount,
      COALESCE(SUM(CAST(i.discount_amount AS DECIMAL)), 0) AS total_discounts,
      COALESCE(SUM(CAST(i.vat_amount   AS DECIMAL)), 0)    AS total_vat,
      COUNT(*)                                              AS invoice_count
    FROM invoices i
    WHERE ${where}
  `, params);

  const summary = summaryResult.rows[0];
  const netIncome = Number(summary.paid_amount);

  // Items breakdown by service description
  const itemsResult = await pool.query(`
    SELECT
      ii.description,
      MIN(CAST(ii.unit_price AS DECIMAL))              AS unit_price,
      SUM(CAST(ii.quantity  AS DECIMAL))               AS total_qty,
      COALESCE(SUM(CAST(ii.vat_amount AS DECIMAL)), 0) AS total_vat,
      COALESCE(SUM(CAST(ii.discount_amount AS DECIMAL)), 0) AS total_discount,
      SUM(CAST(ii.total_amount AS DECIMAL))            AS total_amount,
      COUNT(DISTINCT ii.invoice_id)                    AS invoice_count
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE ${where}
    GROUP BY ii.description
    ORDER BY total_amount DESC
  `, params);

  return c.json({
    data: {
      summary: {
        totalSales:    Number(summary.total_sales),
        totalRefunds:  0,
        paidAmount:    Number(summary.paid_amount),
        netIncome,
        totalDiscounts: Number(summary.total_discounts),
        totalVat:      Number(summary.total_vat),
        invoiceCount:  Number(summary.invoice_count),
      },
      items: itemsResult.rows.map((r: any) => ({
        description:   r.description,
        unitPrice:     Number(r.unit_price),
        totalQty:      Number(r.total_qty),
        totalVat:      Number(r.total_vat),
        totalDiscount: Number(r.total_discount),
        totalAmount:   Number(r.total_amount),
        invoiceCount:  Number(r.invoice_count),
      })),
    },
  });
});

// ============================================================
// GET /finance/reports/payments — تقرير المدفوعات
// ============================================================

financeRouter.get("/reports/payments", async (c) => {
  const orgId    = getOrgId(c);
  const dateFrom = c.req.query("dateFrom");
  const dateTo   = c.req.query("dateTo");

  const now  = new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to   = dateTo   ? new Date(dateTo)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const result = await pool.query(`
    SELECT
      ip.id,
      ip.amount,
      ip.payment_method,
      ip.payment_date,
      ip.transfer_name,
      ip.reference,
      ip.notes,
      ip.created_at,
      i.invoice_number,
      i.buyer_name,
      i.buyer_phone
    FROM invoice_payments ip
    JOIN invoices i ON i.id = ip.invoice_id
    WHERE ip.org_id = $1
      AND ip.created_at >= $2
      AND ip.created_at <= $3
    ORDER BY ip.created_at DESC
  `, [orgId, from, to]);

  const byMethod = await pool.query(`
    SELECT
      payment_method,
      COUNT(*)                                      AS count,
      COALESCE(SUM(CAST(amount AS DECIMAL)), 0)    AS total
    FROM invoice_payments
    WHERE org_id = $1
      AND created_at >= $2
      AND created_at <= $3
    GROUP BY payment_method
    ORDER BY total DESC
  `, [orgId, from, to]);

  return c.json({
    data: {
      payments: result.rows,
      byMethod: byMethod.rows,
      total: result.rows.reduce((s: number, r: any) => s + Number(r.amount), 0),
    },
  });
});

// ============================================================
// GET /finance/reports/expenses — تقرير المصروفات
// ============================================================

financeRouter.get("/reports/expenses", async (c) => {
  const orgId    = getOrgId(c);
  const dateFrom = c.req.query("dateFrom");
  const dateTo   = c.req.query("dateTo");
  const category = c.req.query("category");

  const now  = new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to   = dateTo   ? new Date(dateTo)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const params: any[] = [orgId, from, to];
  let catFilter = "";
  if (category) { params.push(category); catFilter = `AND category = $${params.length}`; }

  const summaryResult = await pool.query(`
    SELECT
      COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total,
      COUNT(*) AS count
    FROM expenses
    WHERE org_id = $1 AND expense_date >= $2 AND expense_date <= $3 ${catFilter}
  `, params);

  const byCategory = await pool.query(`
    SELECT
      category,
      COUNT(*) AS count,
      COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total
    FROM expenses
    WHERE org_id = $1 AND expense_date >= $2 AND expense_date <= $3
    GROUP BY category ORDER BY total DESC
  `, [orgId, from, to]);

  const rows = await pool.query(`
    SELECT id, category, subcategory, description, amount, expense_date, receipt_number, notes, created_at
    FROM expenses
    WHERE org_id = $1 AND expense_date >= $2 AND expense_date <= $3 ${catFilter}
    ORDER BY expense_date DESC
    LIMIT 500
  `, params);

  return c.json({
    data: {
      summary: { total: Number(summaryResult.rows[0].total), count: Number(summaryResult.rows[0].count) },
      byCategory: byCategory.rows.map((r: any) => ({ category: r.category, count: Number(r.count), total: Number(r.total) })),
      expenses: rows.rows,
    },
  });
});

// ============================================================
// GET /finance/reports/collection — تقرير التحصيل
// ============================================================

financeRouter.get("/reports/collection", async (c) => {
  const orgId    = getOrgId(c);
  const dateFrom = c.req.query("dateFrom");
  const dateTo   = c.req.query("dateTo");

  const now  = new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to   = dateTo   ? new Date(dateTo)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const result = await pool.query(`
    SELECT
      COALESCE(SUM(CAST(i.total_amount AS DECIMAL)), 0)            AS total_issued,
      COALESCE(SUM(CAST(i.paid_amount AS DECIMAL)), 0)             AS total_collected,
      COALESCE(SUM(CAST(i.total_amount AS DECIMAL) - CAST(COALESCE(i.paid_amount, '0') AS DECIMAL)), 0) AS outstanding,
      COUNT(*) FILTER (WHERE i.status = 'paid')                    AS paid_count,
      COUNT(*) FILTER (WHERE i.status = 'issued')                  AS pending_count,
      COUNT(*) FILTER (WHERE i.status = 'partially_paid')          AS partial_count,
      COUNT(*) FILTER (WHERE i.status = 'overdue')                 AS overdue_count,
      COUNT(*)                                                      AS total_count
    FROM invoices i
    WHERE i.org_id = $1 AND i.issue_date >= $2 AND i.issue_date <= $3 AND i.status != 'cancelled'
  `, [orgId, from, to]);

  const byStatus = await pool.query(`
    SELECT
      status,
      COUNT(*) AS count,
      COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) AS total
    FROM invoices
    WHERE org_id = $1 AND issue_date >= $2 AND issue_date <= $3 AND status != 'cancelled'
    GROUP BY status
  `, [orgId, from, to]);

  const overdue = await pool.query(`
    SELECT id, invoice_number, buyer_name, buyer_phone, total_amount, paid_amount, due_date, created_at
    FROM invoices
    WHERE org_id = $1 AND status IN ('issued', 'overdue', 'partially_paid')
    ORDER BY due_date ASC NULLS LAST
    LIMIT 50
  `, [orgId]);

  const row = result.rows[0];
  return c.json({
    data: {
      summary: {
        totalIssued:    Number(row.total_issued),
        totalCollected: Number(row.total_collected),
        outstanding:    Number(row.outstanding),
        collectionRate: row.total_issued > 0 ? Math.round(Number(row.total_collected) / Number(row.total_issued) * 100) : 0,
        paidCount:    Number(row.paid_count),
        pendingCount: Number(row.pending_count),
        partialCount: Number(row.partial_count),
        overdueCount: Number(row.overdue_count),
        totalCount:   Number(row.total_count),
      },
      byStatus: byStatus.rows.map((r: any) => ({ status: r.status, count: Number(r.count), total: Number(r.total) })),
      overdueInvoices: overdue.rows,
    },
  });
});

// ============================================================
// GET /finance/reports/booking-sales — تقرير مبيعات الحجوزات
// ============================================================

financeRouter.get("/reports/booking-sales", async (c) => {
  const orgId    = getOrgId(c);
  const dateFrom = c.req.query("dateFrom");
  const dateTo   = c.req.query("dateTo");
  const status   = c.req.query("status");

  const now  = new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to   = dateTo   ? new Date(dateTo)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const params: any[] = [orgId, from, to];
  let statusFilter = `AND b.status != 'cancelled'`;
  if (status) { params.push(status); statusFilter = `AND b.status = $${params.length}`; }

  const summaryResult = await pool.query(`
    SELECT
      COUNT(*)                                                  AS total_bookings,
      COALESCE(SUM(CAST(b.total_amount  AS DECIMAL)), 0)       AS total_revenue,
      COALESCE(SUM(CAST(b.paid_amount   AS DECIMAL)), 0)       AS total_paid,
      COALESCE(SUM(CAST(b.total_amount  AS DECIMAL) - CAST(COALESCE(b.paid_amount,'0') AS DECIMAL)), 0) AS outstanding,
      COALESCE(AVG(CAST(b.total_amount  AS DECIMAL)), 0)       AS avg_value,
      COUNT(*) FILTER (WHERE b.status = 'completed')           AS completed_count,
      COUNT(*) FILTER (WHERE b.status = 'confirmed')           AS confirmed_count,
      COUNT(*) FILTER (WHERE b.status = 'pending')             AS pending_count,
      COUNT(*) FILTER (WHERE b.status = 'cancelled')           AS cancelled_count
    FROM bookings b
    WHERE b.org_id = $1 AND b.created_at >= $2 AND b.created_at <= $3
  `, [orgId, from, to]);

  const byService = await pool.query(`
    SELECT
      s.name                                                    AS service_name,
      COUNT(bi.id)                                              AS booking_count,
      COALESCE(SUM(CAST(bi.total_price AS DECIMAL)), 0)        AS total_revenue,
      COALESCE(AVG(CAST(bi.unit_price  AS DECIMAL)), 0)        AS avg_price
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    LEFT JOIN services s ON s.id = bi.service_id
    WHERE b.org_id = $1 AND b.created_at >= $2 AND b.created_at <= $3 ${statusFilter.replace(/\$\d+/g, (m) => m)}
    GROUP BY s.name
    ORDER BY total_revenue DESC
    LIMIT 20
  `, params);

  const byDay = await pool.query(`
    SELECT
      DATE(b.created_at)                                        AS day,
      COUNT(*)                                                  AS count,
      COALESCE(SUM(CAST(b.total_amount AS DECIMAL)), 0)        AS revenue
    FROM bookings b
    WHERE b.org_id = $1 AND b.created_at >= $2 AND b.created_at <= $3 ${statusFilter}
    GROUP BY DATE(b.created_at)
    ORDER BY day ASC
  `, params);

  const row = summaryResult.rows[0];
  return c.json({
    data: {
      summary: {
        totalBookings:  Number(row.total_bookings),
        totalRevenue:   Number(row.total_revenue),
        totalPaid:      Number(row.total_paid),
        outstanding:    Number(row.outstanding),
        avgValue:       Number(row.avg_value),
        completedCount: Number(row.completed_count),
        confirmedCount: Number(row.confirmed_count),
        pendingCount:   Number(row.pending_count),
        cancelledCount: Number(row.cancelled_count),
      },
      byService: byService.rows.map((r: any) => ({
        serviceName:   r.service_name || "خدمة غير محددة",
        bookingCount:  Number(r.booking_count),
        totalRevenue:  Number(r.total_revenue),
        avgPrice:      Number(r.avg_price),
      })),
      byDay: byDay.rows.map((r: any) => ({
        day:     r.day,
        count:   Number(r.count),
        revenue: Number(r.revenue),
      })),
    },
  });
});

// ============================================================
// GET /finance/reports/commissions — تقرير العمولات
// ============================================================

financeRouter.get("/reports/commissions", async (c) => {
  try {
    const orgId    = getOrgId(c);
    const dateFrom = c.req.query("dateFrom");
    const dateTo   = c.req.query("dateTo");

    const now  = new Date();
    const from = dateFrom ? dateFrom : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const to   = dateTo   ? dateTo   : now.toISOString().split("T")[0];

    const byMemberResult = await pool.query(`
      SELECT
        m.id                                                            AS member_id,
        u.name                                                          AS member_name,
        m.commission_rate,
        COUNT(b.id)                                                     AS booking_count,
        COALESCE(SUM(CAST(b.total_amount AS DECIMAL)), 0)              AS total_revenue,
        COALESCE(SUM(CAST(b.total_amount AS DECIMAL) * m.commission_rate / 100), 0) AS commission_amount
      FROM org_members m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN bookings b ON b.org_id = m.org_id
        AND b.status = 'completed'
        AND DATE(COALESCE(b.event_date, b.created_at)) >= $2
        AND DATE(COALESCE(b.event_date, b.created_at)) <= $3
      WHERE m.org_id = $1
      GROUP BY m.id, u.name, m.commission_rate
      ORDER BY commission_amount DESC
    `, [orgId, from, to]);

    const rows = byMemberResult.rows;
    const totalCommissions = rows.reduce((sum: number, r: any) => sum + Number(r.commission_amount), 0);
    const memberCount      = rows.length;
    const avgRate          = memberCount > 0
      ? Math.round(rows.reduce((sum: number, r: any) => sum + Number(r.commission_rate), 0) / memberCount * 100) / 100
      : 0;

    return c.json({
      data: {
        summary: { totalCommissions, memberCount, avgRate },
        byMember: rows.map((r: any) => ({
          memberId:         r.member_id,
          memberName:       r.member_name,
          commissionRate:   Number(r.commission_rate),
          bookingCount:     Number(r.booking_count),
          totalRevenue:     Number(r.total_revenue),
          commissionAmount: Number(r.commission_amount),
        })),
      },
    });
  } catch (err) {
    console.error("[/reports/commissions]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================
// GET /finance/reports/refunds — تقرير المستردات
// ============================================================

financeRouter.get("/reports/refunds", async (c) => {
  try {
    const orgId    = getOrgId(c);
    const dateFrom = c.req.query("dateFrom");
    const dateTo   = c.req.query("dateTo");

    const now  = new Date();
    const from = dateFrom ? dateFrom : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const to   = dateTo   ? dateTo   : now.toISOString().split("T")[0];

    const itemsResult = await pool.query(`
      SELECT
        i.id,
        i.invoice_number,
        i.buyer_name,
        i.total_amount,
        i.status,
        i.created_at,
        i.notes
      FROM invoices i
      WHERE i.org_id = $1
        AND i.status IN ('cancelled', 'credit_note')
        AND DATE(i.created_at) BETWEEN $2 AND $3
      ORDER BY i.created_at DESC
    `, [orgId, from, to]);

    const rows        = itemsResult.rows;
    const totalRefunds = rows.reduce((sum: number, r: any) => sum + Math.abs(Number(r.total_amount)), 0);
    const count        = rows.length;
    const avgRefund    = count > 0 ? Math.round(totalRefunds / count * 100) / 100 : 0;

    return c.json({
      data: {
        summary: { totalRefunds, count, avgRefund },
        items: rows.map((r: any) => ({
          id:            r.id,
          invoiceNumber: r.invoice_number,
          buyerName:     r.buyer_name,
          totalAmount:   Number(r.total_amount),
          status:        r.status,
          createdAt:     r.created_at,
          notes:         r.notes,
        })),
      },
    });
  } catch (err) {
    console.error("[/reports/refunds]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================
// GET /finance/reports/subscriptions — تقرير الاشتراكات
// ============================================================

financeRouter.get("/reports/subscriptions", async (c) => {
  try {
    const orgId    = getOrgId(c);
    const dateFrom = c.req.query("dateFrom");
    const dateTo   = c.req.query("dateTo");
    const status   = c.req.query("status");

    const now  = new Date();
    const from = dateFrom ? dateFrom : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const to   = dateTo   ? dateTo   : now.toISOString().split("T")[0];

    // Check if bundle_subscriptions table exists before querying
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'bundle_subscriptions'
      ) AS exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      return c.json({
        data: {
          summary: { totalSubscriptions: 0, activeCount: 0, totalRevenue: 0, avgPrice: 0 },
          items: [],
        },
      });
    }

    const statusFilter = status ? `AND bs.status = $4` : "";
    const params: any[] = [orgId, from, to];
    if (status) params.push(status);

    const itemsResult = await pool.query(`
      SELECT
        bs.id,
        bs.status,
        bs.price,
        bs.start_date,
        bs.next_billing_date,
        bs.current_usage,
        bs.max_usage,
        c.name  AS customer_name,
        c.phone AS customer_phone,
        s.name  AS bundle_name
      FROM bundle_subscriptions bs
      JOIN customers c ON bs.customer_id = c.id
      LEFT JOIN services s ON bs.service_id = s.id
      WHERE bs.org_id = $1
        AND DATE(bs.start_date) BETWEEN $2 AND $3
        ${statusFilter}
      ORDER BY bs.created_at DESC
    `, params);

    const rows            = itemsResult.rows;
    const totalSubscriptions = rows.length;
    const activeCount        = rows.filter((r: any) => r.status === "active").length;
    const totalRevenue       = rows.reduce((sum: number, r: any) => sum + Number(r.price || 0), 0);
    const avgPrice           = totalSubscriptions > 0 ? Math.round(totalRevenue / totalSubscriptions * 100) / 100 : 0;

    return c.json({
      data: {
        summary: { totalSubscriptions, activeCount, totalRevenue, avgPrice },
        items: rows.map((r: any) => ({
          id:              r.id,
          status:          r.status,
          price:           Number(r.price),
          startDate:       r.start_date,
          nextBillingDate: r.next_billing_date,
          currentUsage:    Number(r.current_usage || 0),
          maxUsage:        Number(r.max_usage || 0),
          customerName:    r.customer_name,
          customerPhone:   r.customer_phone,
          bundleName:      r.bundle_name,
        })),
      },
    });
  } catch (err) {
    console.error("[/reports/subscriptions]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================
// GET /finance/reports/peak-times — تقرير أوقات الذروة
// ============================================================

financeRouter.get("/reports/peak-times", async (c) => {
  try {
    const orgId    = getOrgId(c);
    const dateFrom = c.req.query("dateFrom");
    const dateTo   = c.req.query("dateTo");

    const now  = new Date();
    const from = dateFrom ? dateFrom : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const to   = dateTo   ? dateTo   : now.toISOString().split("T")[0];

    const matrixResult = await pool.query(`
      SELECT
        EXTRACT(DOW  FROM event_date)  AS day_of_week,
        EXTRACT(HOUR FROM event_date)  AS hour_of_day,
        COUNT(*)                        AS booking_count,
        COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) AS revenue
      FROM bookings
      WHERE org_id = $1
        AND status != 'cancelled'
        AND event_date BETWEEN $2::timestamp AND $3::timestamp
      GROUP BY day_of_week, hour_of_day
      ORDER BY booking_count DESC
    `, [orgId, from, to]);

    const matrix = matrixResult.rows.map((r: any) => ({
      dayOfWeek:    Number(r.day_of_week),
      hourOfDay:    Number(r.hour_of_day),
      bookingCount: Number(r.booking_count),
      revenue:      Number(r.revenue),
    }));

    // Aggregate by day
    const dayMap: Record<number, { dayOfWeek: number; bookingCount: number; revenue: number }> = {};
    const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    for (const row of matrix) {
      if (!dayMap[row.dayOfWeek]) dayMap[row.dayOfWeek] = { dayOfWeek: row.dayOfWeek, bookingCount: 0, revenue: 0 };
      dayMap[row.dayOfWeek].bookingCount += row.bookingCount;
      dayMap[row.dayOfWeek].revenue      += row.revenue;
    }
    const byDay = Object.values(dayMap)
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .map((d) => ({ ...d, dayName: dayNames[d.dayOfWeek] ?? String(d.dayOfWeek) }));

    // Aggregate by hour
    const hourMap: Record<number, { hourOfDay: number; bookingCount: number; revenue: number }> = {};
    for (const row of matrix) {
      if (!hourMap[row.hourOfDay]) hourMap[row.hourOfDay] = { hourOfDay: row.hourOfDay, bookingCount: 0, revenue: 0 };
      hourMap[row.hourOfDay].bookingCount += row.bookingCount;
      hourMap[row.hourOfDay].revenue      += row.revenue;
    }
    const byHour = Object.values(hourMap).sort((a, b) => b.bookingCount - a.bookingCount);

    const totalAnalyzed = matrix.reduce((sum, r) => sum + r.bookingCount, 0);
    const peakDay       = byDay[0]?.dayName   ?? null;
    const peakHour      = byHour[0]?.hourOfDay ?? null;

    return c.json({
      data: {
        summary: { peakDay, peakHour, totalAnalyzed },
        byDay,
        byHour,
        matrix,
      },
    });
  } catch (err) {
    console.error("[/reports/peak-times]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================
// GET /finance/reports/providers — تقرير أداء مقدمي الخدمة
// ============================================================

financeRouter.get("/reports/providers", async (c) => {
  try {
    const orgId    = getOrgId(c);
    const dateFrom = c.req.query("dateFrom");
    const dateTo   = c.req.query("dateTo");

    const now  = new Date();
    const from = dateFrom ? dateFrom : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const to   = dateTo   ? dateTo   : now.toISOString().split("T")[0];

    const providersResult = await pool.query(`
      SELECT
        m.id                                                                                   AS provider_id,
        u.name                                                                                 AS provider_name,
        m.commission_rate,
        COUNT(b.id)                                                                            AS booking_count,
        COUNT(b.id) FILTER (WHERE b.status = 'completed')                                     AS completed_count,
        COUNT(b.id) FILTER (WHERE b.status = 'cancelled')                                     AS cancelled_count,
        COALESCE(SUM(CAST(b.total_amount AS DECIMAL)) FILTER (WHERE b.status = 'completed'), 0) AS total_revenue,
        ROUND(AVG(CAST(b.total_amount AS DECIMAL)) FILTER (WHERE b.status = 'completed'), 2)  AS avg_booking_value
      FROM org_members m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN bookings b ON b.org_id = m.org_id
        AND DATE(COALESCE(b.event_date, b.created_at)) BETWEEN $2 AND $3
      WHERE m.org_id = $1 AND m.status = 'active'
      GROUP BY m.id, u.name, m.commission_rate
      ORDER BY total_revenue DESC
    `, [orgId, from, to]);

    const rows          = providersResult.rows;
    const providerCount = rows.length;
    const totalRevenue  = rows.reduce((sum: number, r: any) => sum + Number(r.total_revenue), 0);
    const topProvider   = rows[0]?.provider_name ?? null;

    return c.json({
      data: {
        summary: { providerCount, totalRevenue, topProvider },
        providers: rows.map((r: any) => ({
          providerId:      r.provider_id,
          providerName:    r.provider_name,
          commissionRate:  Number(r.commission_rate),
          bookingCount:    Number(r.booking_count),
          completedCount:  Number(r.completed_count),
          cancelledCount:  Number(r.cancelled_count),
          totalRevenue:    Number(r.total_revenue),
          avgBookingValue: r.avg_booking_value !== null ? Number(r.avg_booking_value) : 0,
        })),
      },
    });
  } catch (err) {
    console.error("[/reports/providers]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /finance/reports/cash-close — تقرير إغلاق الصندوق
financeRouter.get("/reports/cash-close", async (c) => {
  const orgId = getOrgId(c);
  const dateFrom = c.req.query("dateFrom") || new Date(new Date().setDate(1)).toISOString().split("T")[0];
  const dateTo   = c.req.query("dateTo")   || new Date().toISOString().split("T")[0];
  try {
    const rows = await pool.query<any>(`
      SELECT
        cs.id,
        cs.opened_at,
        cs.closed_at,
        cs.opening_balance,
        cs.closing_balance,
        cs.difference,
        CASE WHEN cs.closed_at IS NOT NULL THEN 'closed' ELSE 'open' END AS status,
        cs.notes,
        u.name AS opened_by,
        ta.name AS account_name,
        COALESCE(SUM(CASE WHEN tt.type IN ('receipt','transfer_in') THEN tt.amount::numeric ELSE 0 END), 0) AS cash_in,
        COALESCE(SUM(CASE WHEN tt.type IN ('payment','transfer_out') THEN tt.amount::numeric ELSE 0 END), 0) AS cash_out
      FROM cashier_shifts cs
      LEFT JOIN users u ON u.id = cs.cashier_id
      LEFT JOIN treasury_accounts ta ON ta.id = cs.account_id
      LEFT JOIN treasury_transactions tt ON tt.source_id = cs.id AND tt.source_type = 'shift' AND tt.org_id = $1
      WHERE cs.org_id = $1
        AND cs.opened_at::date BETWEEN $2 AND $3
      GROUP BY cs.id, u.name, ta.name
      ORDER BY cs.opened_at DESC
    `, [orgId, dateFrom, dateTo]);

    const shifts = rows.rows;
    const totalCashIn   = shifts.reduce((s: number, r: any) => s + Number(r.cash_in),  0);
    const totalCashOut  = shifts.reduce((s: number, r: any) => s + Number(r.cash_out), 0);
    const shiftCount    = shifts.length;
    const closedShifts  = shifts.filter((r: any) => r.status === "closed");
    const totalDiscrep  = closedShifts.reduce((s: number, r: any) => {
      const expected = Number(r.opening_balance || 0) + Number(r.cash_in) - Number(r.cash_out);
      return s + Math.abs(Number(r.closing_balance || 0) - expected);
    }, 0);

    return c.json({
      data: {
        shiftCount,
        totalCashIn,
        totalCashOut,
        totalDiscrepancy: totalDiscrep,
        rows: shifts.map((r: any) => ({
          id:             r.id,
          openedAt:       r.opened_at,
          closedAt:       r.closed_at,
          openedBy:       r.opened_by || "—",
          accountName:    r.account_name || "—",
          openingBalance: Number(r.opening_balance || 0),
          closingBalance: Number(r.closing_balance || 0),
          cashIn:         Number(r.cash_in),
          cashOut:        Number(r.cash_out),
          discrepancy:    r.status === "closed"
            ? Number(r.closing_balance || 0) - (Number(r.opening_balance || 0) + Number(r.cash_in) - Number(r.cash_out))
            : null,
          status:         r.status,
          notes:          r.notes,
        })),
      },
    });
  } catch (err) {
    console.error("[/reports/cash-close]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /finance/reports/attendance — تقرير حضور الحجوزات
financeRouter.get("/reports/attendance", async (c) => {
  const orgId = getOrgId(c);
  const dateFrom = c.req.query("dateFrom") || new Date(new Date().setDate(1)).toISOString().split("T")[0];
  const dateTo   = c.req.query("dateTo")   || new Date().toISOString().split("T")[0];
  try {
    // Summary totals
    const sumRes = await pool.query<any>(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('completed','confirmed','pending','no_show','cancelled')) AS total,
        COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
        COUNT(*) FILTER (WHERE status = 'no_show')    AS no_show,
        COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled,
        COUNT(*) FILTER (WHERE status IN ('pending','confirmed')) AS upcoming
      FROM bookings
      WHERE org_id = $1
        AND event_date::date BETWEEN $2 AND $3
    `, [orgId, dateFrom, dateTo]);

    // By service
    const byServiceRes = await pool.query<any>(`
      SELECT
        s.name AS service_name,
        COUNT(*) FILTER (WHERE b.status = 'completed')  AS completed,
        COUNT(*) FILTER (WHERE b.status = 'no_show')    AS no_show,
        COUNT(*) FILTER (WHERE b.status = 'cancelled')  AS cancelled,
        COUNT(*) AS total
      FROM bookings b
      LEFT JOIN services s ON s.id = b.service_id
      WHERE b.org_id = $1
        AND b.event_date::date BETWEEN $2 AND $3
      GROUP BY s.name
      ORDER BY total DESC
      LIMIT 20
    `, [orgId, dateFrom, dateTo]);

    const sum = sumRes.rows[0];
    const total     = Number(sum.total);
    const completed = Number(sum.completed);
    const noShow    = Number(sum.no_show);
    const cancelled = Number(sum.cancelled);
    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const noShowRate     = total > 0 ? Math.round((noShow    / total) * 100) : 0;

    return c.json({
      data: {
        total, completed, noShow, cancelled,
        upcoming:       Number(sum.upcoming),
        attendanceRate, noShowRate,
        byService: byServiceRes.rows.map((r: any) => ({
          serviceName: r.service_name || "غير محدد",
          total:       Number(r.total),
          completed:   Number(r.completed),
          noShow:      Number(r.no_show),
          cancelled:   Number(r.cancelled),
          rate:        Number(r.total) > 0 ? Math.round((Number(r.completed) / Number(r.total)) * 100) : 0,
        })),
      },
    });
  } catch (err) {
    console.error("[/reports/attendance]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /finance/reports/visitors — تقرير مصادر الحجوزات
financeRouter.get("/reports/visitors", async (c) => {
  const orgId = getOrgId(c);
  const dateFrom = c.req.query("dateFrom") || new Date(new Date().setDate(1)).toISOString().split("T")[0];
  const dateTo   = c.req.query("dateTo")   || new Date().toISOString().split("T")[0];
  try {
    // Channel breakdown (online vs manual)
    const channelRes = await pool.query<any>(`
      SELECT
        CASE WHEN source = 'online' OR is_online = true THEN 'online' ELSE 'manual' END AS channel,
        COUNT(*) AS total
      FROM bookings
      WHERE org_id = $1
        AND created_at::date BETWEEN $2 AND $3
      GROUP BY channel
    `, [orgId, dateFrom, dateTo]);

    // Daily trend
    const dailyRes = await pool.query<any>(`
      SELECT
        created_at::date AS day,
        COUNT(*) FILTER (WHERE source = 'online' OR is_online = true) AS online,
        COUNT(*) FILTER (WHERE NOT (source = 'online' OR is_online = true)) AS manual,
        COUNT(*) AS total
      FROM bookings
      WHERE org_id = $1
        AND created_at::date BETWEEN $2 AND $3
      GROUP BY day
      ORDER BY day
    `, [orgId, dateFrom, dateTo]);

    const channelMap: Record<string, number> = {};
    channelRes.rows.forEach((r: any) => { channelMap[r.channel] = Number(r.total); });

    const onlineCount = channelMap["online"] || 0;
    const manualCount = channelMap["manual"] || 0;
    const totalCount  = onlineCount + manualCount;
    const onlineRate  = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

    return c.json({
      data: {
        totalBookings: totalCount,
        onlineCount, manualCount, onlineRate,
        daily: dailyRes.rows.map((r: any) => ({
          date:   r.day,
          online: Number(r.online),
          manual: Number(r.manual),
          total:  Number(r.total),
        })),
      },
    });
  } catch (err) {
    console.error("[/reports/visitors]", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================
// HELPERS
// ============================================================

function generateZATCAQR(data: { sellerName: string; vatNumber: string; timestamp: string; totalWithVat: string; vatAmount: string }): string {
  // ZATCA QR is TLV (Tag-Length-Value) encoded then Base64
  // Simplified implementation — production would use proper TLV encoding
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

  // Convert to Base64 (Node.js)
  return Buffer.from(combined).toString("base64");
}
