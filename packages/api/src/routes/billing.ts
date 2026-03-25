import { Hono } from "hono";
import { createHmac } from "crypto";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, pool } from "@nasaq/db/client";
import { organizations, invoices } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { invalidateOrgStatusCache } from "../middleware/auth";
import { log } from "../lib/logger";

// ============================================================
// BILLING ROUTER
// المسارات المالية لإدارة الاشتراك
//
// GET  /billing/status            — حالة الاشتراك الحالية (يعمل حتى عند الإيقاف)
// POST /billing/renew             — إنشاء رابط دفع Moyasar
// POST /billing/webhook/moyasar   — استقبال تأكيد الدفع من Moyasar
// ============================================================

export const billingRouter = new Hono();

// ── خطط الاشتراك والأسعار ─────────────────────────────────
const PLAN_PRICES: Record<string, { monthly: number; yearly: number; label: string }> = {
  basic:    { monthly: 199,  yearly: 1912,  label: "الأساسية" },    // 199 × 12 × 0.80
  advanced: { monthly: 499,  yearly: 4790,  label: "المتقدمة" },    // 499 × 12 × 0.80
  pro:      { monthly: 999,  yearly: 9590,  label: "الاحترافية" },   // 999 × 12 × 0.80
};

// ── GET /billing/status ────────────────────────────────────
billingRouter.get("/status", async (c) => {
  const orgId = getOrgId(c);
  const [org] = await db
    .select({
      id:                 organizations.id,
      name:               organizations.name,
      plan:               organizations.plan,
      subscriptionStatus: organizations.subscriptionStatus,
      trialEndsAt:        organizations.trialEndsAt,
      subscriptionEndsAt: organizations.subscriptionEndsAt,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) return c.json({ error: "المنشأة غير موجودة" }, 404);

  const planInfo = PLAN_PRICES[org.plan] ?? null;
  const now = new Date();
  const daysRemaining = org.subscriptionEndsAt
    ? Math.max(0, Math.ceil((org.subscriptionEndsAt.getTime() - now.getTime()) / 86_400_000))
    : null;

  return c.json({
    data: {
      plan:               org.plan,
      planLabel:          planInfo?.label ?? org.plan,
      status:             org.subscriptionStatus,
      trialEndsAt:        org.trialEndsAt,
      subscriptionEndsAt: org.subscriptionEndsAt,
      daysRemaining,
      pricing:            planInfo ?? null,
    },
  });
});

// ── POST /billing/renew ────────────────────────────────────
billingRouter.post("/renew", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { plan, billingCycle } = await c.req.json() as {
    plan: string;
    billingCycle: "monthly" | "yearly";
  };

  const planInfo = PLAN_PRICES[plan];
  if (!planInfo) return c.json({ error: "الباقة غير صحيحة" }, 400);

  const [org] = await db
    .select({ name: organizations.name, phone: organizations.phone })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  if (!org) return c.json({ error: "المنشأة غير موجودة" }, 404);

  const amount = billingCycle === "yearly" ? planInfo.yearly : planInfo.monthly;
  const amountHalala = amount * 100; // Moyasar uses smallest currency unit

  const moyasarKey = process.env.MOYASAR_API_KEY;
  if (!moyasarKey) return c.json({ error: "بوابة الدفع غير مهيأة" }, 503);

  // إنشاء طلب الدفع عبر Moyasar API
  const response = await fetch("https://api.moyasar.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Basic ${Buffer.from(moyasarKey + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      amount:       amountHalala,
      currency:     "SAR",
      description:  `اشتراك نسق — باقة ${planInfo.label} (${billingCycle === "yearly" ? "سنوي" : "شهري"})`,
      callback_url: `${process.env.DASHBOARD_URL}/billing/confirm`,
      metadata: {
        orgId,
        plan,
        billingCycle,
        source: "subscription_renewal",
      },
      source: { type: "creditcard" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    log.error({ err, orgId }, "[billing] Moyasar create payment failed");
    return c.json({ error: "تعذر إنشاء رابط الدفع" }, 502);
  }

  const payment = await response.json() as { id: string; amount: number; status: string; source: { transaction_url?: string } };

  insertAuditLog({ orgId, userId, action: "created", resource: "payment_link", resourceId: payment.id });

  return c.json({
    data: {
      paymentId:      payment.id,
      amount,
      currency:       "SAR",
      transactionUrl: payment.source?.transaction_url ?? null,
    },
  }, 201);
});

// ── POST /billing/webhook/moyasar ──────────────────────────
// مسار عام — لا يتطلب تسجيل دخول
billingRouter.post("/webhook/moyasar", async (c) => {
  const rawBody = await c.req.text();

  // التحقق من توقيع Moyasar — مطلوب دائماً
  const signature = c.req.header("X-Moyasar-Signature") ?? "";
  const secret    = process.env.MOYASAR_WEBHOOK_SECRET ?? "";

  if (!secret) {
    log.error("[billing/webhook] MOYASAR_WEBHOOK_SECRET is not configured — rejecting webhook");
    return c.json({ error: "Webhook not configured" }, 503);
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (signature !== expected) {
    log.warn({ signature }, "[billing/webhook] invalid Moyasar signature");
    return c.json({ error: "Invalid signature" }, 401);
  }

  let event: {
    type: string;
    data: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      description: string;
      metadata: { orgId?: string; plan?: string; billingCycle?: string };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (event.type !== "payment.paid") {
    return c.json({ received: true }); // نتجاهل الأحداث الأخرى
  }

  const { orgId, plan, billingCycle } = event.data.metadata ?? {};
  if (!orgId || !plan) {
    log.warn({ metadata: event.data.metadata }, "[billing/webhook] missing metadata");
    return c.json({ received: true });
  }

  // حساب تاريخ انتهاء الاشتراك الجديد
  const now            = new Date();
  const daysToAdd      = billingCycle === "yearly" ? 365 : 30;
  const newEndsAt      = new Date(now.getTime() + daysToAdd * 86_400_000);

  // تحديث حالة المنشأة
  await db
    .update(organizations)
    .set({
      subscriptionStatus: "active",
      plan:               plan as any,
      subscriptionEndsAt: newEndsAt,
      suspendedAt:        null,
      suspendReason:      null,
    })
    .where(eq(organizations.id, orgId));

  // إبطال cache المنشأة فوراً
  invalidateOrgStatusCache(orgId);

  // سجل فاتورة اشتراك
  await createSubscriptionInvoice({
    orgId,
    plan,
    billingCycle: billingCycle ?? "monthly",
    amount:       event.data.amount / 100, // تحويل من هللة إلى ريال
    paymentId:    event.data.id,
    endsAt:       newEndsAt,
  });

  log.info({ orgId, plan, billingCycle, newEndsAt }, "[billing/webhook] subscription renewed");
  return c.json({ received: true });
});

// ── مساعد: إنشاء فاتورة الاشتراك ─────────────────────────
async function createSubscriptionInvoice(params: {
  orgId:        string;
  plan:         string;
  billingCycle: string;
  amount:       number;
  paymentId:    string;
  endsAt:       Date;
}) {
  const [org] = await db
    .select({ name: organizations.name, vatNumber: organizations.vatNumber, address: organizations.address, commercialRegister: organizations.commercialRegister })
    .from(organizations)
    .where(eq(organizations.id, params.orgId));
  if (!org) return;

  const planLabels: Record<string, string> = {
    basic: "الأساسية", advanced: "المتقدمة", pro: "الاحترافية", enterprise: "المؤسسية",
  };
  const vatRate  = 15;
  const vatAmount = +(params.amount * vatRate / (100 + vatRate)).toFixed(2);
  const subtotal  = +(params.amount - vatAmount).toFixed(2);
  const invoiceNumber = `SUB-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
  const invoiceUuid   = crypto.randomUUID();

  await db.insert(invoices).values({
    orgId:          params.orgId,
    invoiceNumber,
    invoiceType:    "simplified",
    uuid:           invoiceUuid,
    status:         "paid",
    sellerName:     "شركة نسق للبرمجيات",
    sellerVatNumber: process.env.NASAQ_VAT_NUMBER ?? "",
    buyerName:      org.name,
    buyerVatNumber: org.vatNumber ?? null,
    subtotal:       String(subtotal),
    taxableAmount:  String(subtotal),
    vatRate:        String(vatRate),
    vatAmount:      String(vatAmount),
    totalAmount:    String(params.amount),
    paidAmount:     String(params.amount),
    notes:          `اشتراك نسق — باقة ${planLabels[params.plan] ?? params.plan} (${params.billingCycle === "yearly" ? "سنوي" : "شهري"}) — حتى ${params.endsAt.toISOString().split("T")[0]}`,
    paidAt:         new Date(),
    issueDate:      new Date(),
  });
}
