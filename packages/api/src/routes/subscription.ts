import { Hono } from "hono";
import { eq, and, desc, gte, sql, count, sum, or } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { organizations, subscriptionAddons, subscriptions, subscriptionOrders, bookings, customers, invoices } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const subscriptionRouter = new Hono();
export const orgStatsRouter     = new Hono();

// ============================================================
// GET /organization/subscription
// حالة الاشتراك الشاملة
// ============================================================
subscriptionRouter.get("/", async (c) => {
  const orgId = getOrgId(c);

  const [org] = await db
    .select({
      id:                 organizations.id,
      name:               organizations.name,
      slug:               organizations.slug,
      plan:               organizations.plan,
      subscriptionStatus: organizations.subscriptionStatus,
      trialEndsAt:        organizations.trialEndsAt,
      subscriptionEndsAt: organizations.subscriptionEndsAt,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) return c.json({ error: "المنشأة غير موجودة" }, 404);

  const now = new Date();
  const endDate = org.subscriptionEndsAt ?? org.trialEndsAt;
  const daysRemaining = endDate
    ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000))
    : null;

  const planPrices: Record<string, number> = { basic: 199, advanced: 499, pro: 999, enterprise: 0 };
  const planNames:  Record<string, string> = { basic: "الأساسي", advanced: "المتقدم", pro: "الاحترافي", enterprise: "المؤسسي" };

  const addons = await db
    .select()
    .from(subscriptionAddons)
    .where(and(eq(subscriptionAddons.orgId, orgId), eq(subscriptionAddons.isActive, true)));

  return c.json({
    data: {
      plan:               org.plan,
      planName:           planNames[org.plan] ?? org.plan,
      planPrice:          planPrices[org.plan] ?? 0,
      status:             org.subscriptionStatus,
      startDate:          org.trialEndsAt,
      endDate,
      daysRemaining,
      addons,
    },
  });
});

// ============================================================
// GET /organization/subscription/addons
// الإضافات المفعّلة
// ============================================================
subscriptionRouter.get("/addons", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select()
    .from(subscriptionAddons)
    .where(and(eq(subscriptionAddons.orgId, orgId), eq(subscriptionAddons.isActive, true)))
    .orderBy(desc(subscriptionAddons.createdAt));
  return c.json({ data: rows });
});

// ============================================================
// GET /organization/subscription/history
// سجل الاشتراكات السابقة
// ============================================================
subscriptionRouter.get("/history", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .orderBy(desc(subscriptions.createdAt));
  return c.json({ data: rows });
});

// ============================================================
// POST /organization/subscription/request-addon  (legacy — kept for compat)
// ============================================================
subscriptionRouter.post("/request-addon", async (c) => {
  const orgId = getOrgId(c);
  const { addonKey } = await c.req.json();
  if (!addonKey) return c.json({ error: "addonKey مطلوب" }, 400);
  return c.json({ data: { requested: true, addonKey } });
});

// ── Plan & price maps (server-side mirror of frontend constants) ─────────────
const PLAN_PRICES: Record<string, number> = { basic: 199, advanced: 499, pro: 999, enterprise: 0 };
const PLAN_NAMES:  Record<string, string> = { basic: "الأساسي", advanced: "المتقدم", pro: "الاحترافي", enterprise: "المؤسسي" };
const ADDON_PRICES: Record<string, number> = {
  extra_providers: 890, extra_branches: 1900, hide_branding: 690,
  loyalty: 1190, booking_sync: 1190, accounting: 1190,
  business_email: 1190, access_control: 1190, google_boost: 399, custom_domain: 0,
};
const ADDON_NAMES: Record<string, string> = {
  extra_providers: "مقدمو خدمة إضافيون", extra_branches: "فروع إضافية",
  hide_branding: "إخفاء علامة نسق", loyalty: "برنامج الولاء",
  booking_sync: "ربط الجدولة", accounting: "ربط المحاسبة",
  business_email: "بريد الأعمال", access_control: "التحكم بالوصول",
  google_boost: "تعزيز جوجل", custom_domain: "دومين مخصص",
};

function makeExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now
}

// ============================================================
// GET /organization/subscription/orders
// ============================================================
subscriptionRouter.get("/orders", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select()
    .from(subscriptionOrders)
    .where(eq(subscriptionOrders.orgId, orgId))
    .orderBy(desc(subscriptionOrders.createdAt));
  return c.json({ data: rows });
});

// ============================================================
// POST /organization/subscription/upgrade
// body: { planKey }
// ============================================================
subscriptionRouter.post("/upgrade", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { planKey } = await c.req.json();
  if (!planKey || !PLAN_NAMES[planKey]) return c.json({ error: "planKey غير صالح" }, 400);

  const annualPrice = (PLAN_PRICES[planKey] ?? 0) * 12;

  // Expire any existing pending orders for this org
  await db.update(subscriptionOrders)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(subscriptionOrders.orgId, orgId), eq(subscriptionOrders.status, "pending_payment")));

  const [order] = await db.insert(subscriptionOrders).values({
    orgId,
    orderType: "upgrade",
    itemKey:   planKey,
    itemName:  PLAN_NAMES[planKey],
    price:     annualPrice,
    status:    "pending_payment",
    expiresAt: makeExpiry(),
  }).returning();

  insertAuditLog({
    orgId,
    userId,
    action:     "created",
    resource:   "subscription_order",
    resourceId: order.id,
    newValue:   { orderType: "upgrade", planKey, price: annualPrice },
    metadata:   { planName: PLAN_NAMES[planKey] },
  });

  return c.json({
    data: {
      orderId:   order.id,
      planName:  PLAN_NAMES[planKey],
      planPrice: annualPrice,
      status:    "pending_payment",
    },
  });
});

// ============================================================
// POST /organization/subscription/renew
// ============================================================
subscriptionRouter.post("/renew", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);

  const [org] = await db.select({ plan: organizations.plan })
    .from(organizations).where(eq(organizations.id, orgId));
  if (!org) return c.json({ error: "المنشأة غير موجودة" }, 404);

  const annualPrice = (PLAN_PRICES[org.plan] ?? 0) * 12;

  // Expire any existing pending orders for this org
  await db.update(subscriptionOrders)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(subscriptionOrders.orgId, orgId), eq(subscriptionOrders.status, "pending_payment")));

  const [order] = await db.insert(subscriptionOrders).values({
    orgId,
    orderType: "renewal",
    itemKey:   org.plan,
    itemName:  PLAN_NAMES[org.plan] ?? org.plan,
    price:     annualPrice,
    status:    "pending_payment",
    expiresAt: makeExpiry(),
  }).returning();

  insertAuditLog({
    orgId,
    userId,
    action:     "created",
    resource:   "subscription_order",
    resourceId: order.id,
    newValue:   { orderType: "renewal", planKey: org.plan, price: annualPrice },
  });

  return c.json({
    data: {
      orderId:   order.id,
      planName:  PLAN_NAMES[org.plan] ?? org.plan,
      planPrice: annualPrice,
      status:    "pending_payment",
    },
  });
});

// ============================================================
// POST /organization/subscription/addons/purchase
// body: { addonKey }
// ============================================================
subscriptionRouter.post("/addons/purchase", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { addonKey } = await c.req.json();
  if (!addonKey || !ADDON_NAMES[addonKey]) return c.json({ error: "addonKey غير صالح" }, 400);

  // Check if already active
  const [existing] = await db.select({ id: subscriptionAddons.id })
    .from(subscriptionAddons)
    .where(and(eq(subscriptionAddons.orgId, orgId), eq(subscriptionAddons.addonKey, addonKey), eq(subscriptionAddons.isActive, true)));
  if (existing) return c.json({ error: "الإضافة مفعّلة بالفعل" }, 409);

  const addonPrice = ADDON_PRICES[addonKey] ?? 0;

  const [order] = await db.insert(subscriptionOrders).values({
    orgId,
    orderType: "addon",
    itemKey:   addonKey,
    itemName:  ADDON_NAMES[addonKey],
    price:     addonPrice,
    status:    "pending_payment",
    expiresAt: makeExpiry(),
  }).returning();

  insertAuditLog({
    orgId,
    userId,
    action:     "created",
    resource:   "subscription_order",
    resourceId: order.id,
    newValue:   { orderType: "addon", addonKey, price: addonPrice },
    metadata:   { addonName: ADDON_NAMES[addonKey] },
  });

  return c.json({
    data: {
      orderId:    order.id,
      addonName:  ADDON_NAMES[addonKey],
      addonPrice,
      status:     "pending_payment",
    },
  });
});

// ============================================================
// POST /organization/subscription/confirm-payment
// body: { orderId, paymentRef }
// يتحقق من الدفع عبر Moyasar API قبل التفعيل
// ============================================================
subscriptionRouter.post("/confirm-payment", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { orderId, paymentRef } = await c.req.json();
  if (!orderId || !paymentRef) return c.json({ error: "orderId و paymentRef مطلوبان" }, 400);

  const [order] = await db.select()
    .from(subscriptionOrders)
    .where(and(eq(subscriptionOrders.id, orderId), eq(subscriptionOrders.orgId, orgId)));

  if (!order) return c.json({ error: "الطلب غير موجود" }, 404);
  if (order.status === "paid")      return c.json({ error: "الطلب مدفوع بالفعل" }, 409);
  if (order.status === "cancelled") return c.json({ error: "الطلب ملغي" }, 409);
  if (order.status === "expired")   return c.json({ error: "انتهت صلاحية الطلب" }, 409);

  // التحقق من الدفع عبر Moyasar API
  const moyasarKey = process.env.MOYASAR_API_KEY;
  if (moyasarKey) {
    try {
      const verifyRes = await fetch(`https://api.moyasar.com/v1/payments/${paymentRef}`, {
        headers: {
          "Authorization": `Basic ${Buffer.from(moyasarKey + ":").toString("base64")}`,
        },
      });

      if (!verifyRes.ok) {
        return c.json({ error: "تعذر التحقق من الدفع — حاول مجدداً" }, 502);
      }

      const payment = await verifyRes.json() as {
        id: string;
        status: string;
        amount: number;
        currency: string;
        metadata?: { orgId?: string };
      };

      if (payment.status !== "paid") {
        return c.json({ error: `الدفع غير مكتمل (الحالة: ${payment.status})` }, 402);
      }

      // التحقق أن الدفع لهذه المنشأة
      if (payment.metadata?.orgId && payment.metadata.orgId !== orgId) {
        return c.json({ error: "الدفع لا ينتمي لهذه المنشأة" }, 403);
      }
    } catch {
      return c.json({ error: "خطأ في التواصل مع بوابة الدفع" }, 502);
    }
  }
  // إذا لم يُهيأ MOYASAR_API_KEY — يُقبل مؤقتاً (dev mode)

  await _activateOrder(order, paymentRef, userId);
  return c.json({ data: { success: true, orderId } });
});

// ============================================================
// SHARED: activate order after payment confirmed
// ============================================================
export async function _activateOrder(order: any, paymentRef: string | null, actorId?: string | null) {
  const now = new Date();

  // Mark order as paid
  await db.update(subscriptionOrders)
    .set({ status: "paid", paymentRef: paymentRef ?? null, updatedAt: now })
    .where(eq(subscriptionOrders.id, order.id));

  if (order.orderType === "upgrade") {
    await db.update(organizations)
      .set({ plan: order.itemKey, subscriptionStatus: "active", updatedAt: now })
      .where(eq(organizations.id, order.orgId));

    // Record in subscription history
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);
    await db.insert(subscriptions).values({
      orgId:       order.orgId,
      planKey:     order.itemKey,
      planName:    order.itemName,
      planPrice:   order.price,
      startDate:   now,
      endDate,
      status:      "active",
    });
    // Extend subscriptionEndsAt on org
    await db.update(organizations)
      .set({ subscriptionEndsAt: endDate, updatedAt: now })
      .where(eq(organizations.id, order.orgId));

  } else if (order.orderType === "renewal") {
    // Extend by 1 year from today (or from current end if in future)
    const [org] = await db.select({ subscriptionEndsAt: organizations.subscriptionEndsAt })
      .from(organizations).where(eq(organizations.id, order.orgId));
    const base   = org?.subscriptionEndsAt && org.subscriptionEndsAt > now ? org.subscriptionEndsAt : now;
    const endDate = new Date(base);
    endDate.setFullYear(endDate.getFullYear() + 1);

    await db.update(organizations)
      .set({ subscriptionStatus: "active", subscriptionEndsAt: endDate, updatedAt: now })
      .where(eq(organizations.id, order.orgId));

    await db.insert(subscriptions).values({
      orgId:       order.orgId,
      planKey:     order.itemKey,
      planName:    order.itemName,
      planPrice:   order.price,
      startDate:   now,
      endDate,
      status:      "active",
    });

  } else if (order.orderType === "addon") {
    // Activate addon (insert or re-enable)
    const [existing] = await db.select({ id: subscriptionAddons.id })
      .from(subscriptionAddons)
      .where(and(eq(subscriptionAddons.orgId, order.orgId), eq(subscriptionAddons.addonKey, order.itemKey)));

    if (existing) {
      await db.update(subscriptionAddons)
        .set({ isActive: true, activatedAt: now, updatedAt: now })
        .where(eq(subscriptionAddons.id, existing.id));
    } else {
      await db.insert(subscriptionAddons).values({
        orgId:      order.orgId,
        addonKey:   order.itemKey,
        addonName:  order.itemName,
        price:      String(order.price),
        isActive:   true,
        activatedAt: now,
      });
    }
  }

  // Audit: payment confirmed + subscription activated
  insertAuditLog({
    orgId:      order.orgId,
    userId:     actorId ?? null,
    action:     "approved",
    resource:   "subscription_order",
    resourceId: order.id,
    newValue:   {
      status:     "paid",
      orderType:  order.orderType,
      itemKey:    order.itemKey,
      price:      order.price,
      paymentRef: paymentRef ?? null,
    },
    metadata: {
      description: `تم تفعيل ${order.orderType === "addon" ? `إضافة "${order.itemName}"` : `خطة "${order.itemName}"`} بعد تأكيد الدفع`,
    },
  });
}

// ============================================================
// STATS — ملخص الشهر (registered at /organization/stats)
// ============================================================

// GET /organization/stats/summary
orgStatsRouter.get("/summary", async (c) => {
  const orgId = getOrgId(c);
  const now    = new Date();
  const start  = new Date(now.getFullYear(), now.getMonth(), 1);

  const [newCustomers, salesRow, bookingsRow] = await Promise.all([
    db.select({ cnt: count() })
      .from(customers)
      .where(and(eq(customers.orgId, orgId), gte(customers.createdAt, start))),

    db.select({ total: sum(invoices.totalAmount) })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        eq(invoices.status, "paid"),
        gte(invoices.createdAt, start),
      )),

    db.select({ cnt: count() })
      .from(bookings)
      .where(and(eq(bookings.orgId, orgId), gte(bookings.createdAt, start))),
  ]);

  return c.json({
    data: {
      newCustomersThisMonth: Number(newCustomers[0]?.cnt ?? 0),
      salesThisMonth:        Number(salesRow[0]?.total ?? 0),
      bookingsThisMonth:     Number(bookingsRow[0]?.cnt ?? 0),
    },
  });
});

// GET /organization/stats/sales?period=today|week
orgStatsRouter.get("/sales", async (c) => {
  const orgId  = getOrgId(c);
  const period = c.req.query("period") ?? "week";
  const now    = new Date();

  let from: Date;
  let days: number;
  if (period === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    days = 1;
  } else {
    from = new Date(now.getTime() - 6 * 86_400_000);
    from = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    days = 7;
  }

  const rows = await db
    .select({
      date:  sql<string>`DATE(${invoices.createdAt} AT TIME ZONE 'Asia/Riyadh')`,
      total: sum(invoices.totalAmount),
    })
    .from(invoices)
    .where(and(
      eq(invoices.orgId, orgId),
      eq(invoices.status, "paid"),
      gte(invoices.createdAt, from),
    ))
    .groupBy(sql`DATE(${invoices.createdAt} AT TIME ZONE 'Asia/Riyadh')`)
    .orderBy(sql`DATE(${invoices.createdAt} AT TIME ZONE 'Asia/Riyadh')`);

  // Fill missing days with 0
  const map = Object.fromEntries(rows.map(r => [r.date, Number(r.total ?? 0)]));
  const result = Array.from({ length: days }, (_, i) => {
    const d = new Date(from.getTime() + i * 86_400_000);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("ar-SA", { weekday: "short", month: "numeric", day: "numeric" });
    return { date: key, label, amount: map[key] ?? 0 };
  });

  return c.json({ data: result });
});
