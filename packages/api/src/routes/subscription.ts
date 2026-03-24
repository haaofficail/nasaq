import { Hono } from "hono";
import { eq, and, desc, gte, sql, count, sum } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { organizations, subscriptionAddons, bookings, customers, invoices } from "@nasaq/db/schema";
import { getOrgId } from "../lib/helpers";

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
// POST /organization/subscription/request-addon
// طلب تفعيل إضافة (يُسجَّل فقط — لا يُفعَّل تلقائياً)
// ============================================================
subscriptionRouter.post("/request-addon", async (c) => {
  const orgId = getOrgId(c);
  const { addonKey } = await c.req.json();
  if (!addonKey) return c.json({ error: "addonKey مطلوب" }, 400);
  // في المرحلة الحالية: نُسجّل الطلب فقط (يُنفَّذ يدوياً من الأدمن)
  return c.json({ data: { requested: true, addonKey } });
});

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
