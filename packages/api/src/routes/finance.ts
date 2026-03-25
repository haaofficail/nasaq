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
import { encryptString, decryptString } from "../lib/encryption";

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
  const status = c.req.query("status");
  const type = c.req.query("type");

  const conditions = [eq(invoices.orgId, orgId)];
  if (status) conditions.push(eq(invoices.status, status as any));
  if (type) conditions.push(eq(invoices.invoiceType, type as any));

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
  return c.json({ data: invoice }, 201);
});

// PATCH /finance/invoices/:id/status
financeRouter.patch("/invoices/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status } = await c.req.json();
  const [inv] = await db.update(invoices)
    .set({ status, updatedAt: new Date(), ...(status === "paid" ? { paidAt: new Date(), paidAmount: db.select({ v: invoices.totalAmount }).from(invoices).where(eq(invoices.id, c.req.param("id"))).limit(1) } : {}) })
    .where(and(eq(invoices.id, c.req.param("id")), eq(invoices.orgId, orgId)))
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
    amount: z.string(),
    paymentMethod: z.enum(["cash", "bank_transfer", "card", "other"]).optional().default("cash"),
    paymentDate: z.string().optional(),
    reference: z.string().optional().nullable(),
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
    reference: body.reference ?? null,
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
      b.assigned_user_id                                          AS user_id,
      u.name                                                      AS user_name,
      u.job_title                                                 AS job_title,
      u.commission_rate                                           AS staff_rate,
      COUNT(DISTINCT b.id)::int                                   AS booking_count,
      COALESCE(SUM(bi.total_price::numeric), 0)                   AS total_revenue,
      COALESCE(SUM(
        bi.total_price::numeric *
        COALESCE(sc.commission_percent::numeric, u.commission_rate::numeric, 10) / 100
      ), 0)                                                       AS commission_amount
    FROM bookings b
    JOIN booking_items bi  ON bi.booking_id   = b.id
    JOIN services s        ON s.id            = bi.service_id
    LEFT JOIN service_costs sc ON sc.service_id = s.id AND sc.org_id = b.org_id
    LEFT JOIN users u      ON u.id            = b.assigned_user_id
    WHERE b.org_id    = ${orgId}
      AND b.status    = 'completed'
      AND b.event_date >= ${from}
      AND b.event_date <= ${to}
    GROUP BY b.assigned_user_id, u.name, u.job_title, u.commission_rate
    ORDER BY total_revenue DESC
  `);

  return c.json({ data: (rows as any).rows ?? [] });
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
