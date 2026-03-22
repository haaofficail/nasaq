import { Hono } from "hono";
import { eq, and, desc, asc, gte, lte, sql, count, sum } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { invoices, invoiceItems, expenses, vendorCommissions, vendorPayouts, paymentGatewayConfigs, bookings, payments } from "@nasaq/db/schema";
import { getOrgId, getPagination } from "../lib/helpers";
import { nanoid } from "nanoid";
import { z } from "zod";
import { DEFAULT_VAT_RATE } from "@nasaq/db/constants";

const createExpenseSchema = z.object({
  category: z.string(),
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
  notes: z.string().optional().nullable(),
});

const createInvoiceSchema = z.object({
  invoiceType: z.enum(["simplified", "standard"]).optional(),
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

  return c.json({ data: invoice }, 201);
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
  const body = createExpenseSchema.parse(await c.req.json());
  const [expense] = await db.insert(expenses).values({ orgId, ...body, expenseDate: new Date(body.expenseDate) }).returning();
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

financeRouter.post("/payouts/generate", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { vendorId, periodStart, periodEnd } = body;

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

financeRouter.get("/gateways", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(paymentGatewayConfigs).where(eq(paymentGatewayConfigs.orgId, orgId));
  // Hide sensitive keys
  return c.json({ data: result.map(g => ({ ...g, apiKey: g.apiKey ? "***" : null, secretKey: g.secretKey ? "***" : null })) });
});

financeRouter.post("/gateways", async (c) => {
  const orgId = getOrgId(c);
  const body = createGatewaySchema.parse(await c.req.json());
  const [gw] = await db.insert(paymentGatewayConfigs).values({ orgId, ...body }).returning();
  return c.json({ data: gw }, 201);
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
