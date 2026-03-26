import { Hono } from "hono";
import { eq, and, desc, asc, sql, count, gte, lte, inArray } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import { campaigns, coupons, loyaltyConfig, loyaltyTransactions, abandonedCarts, reviews, landingPages, customerSegments, customers, organizations } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { evaluateSegment } from "../lib/segments-engine";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  channel: z.enum(["whatsapp", "sms", "email"]).optional(),
  status: z.enum(["active", "paused", "completed", "cancelled", "draft", "scheduled"]).optional(),
  segmentId: z.string().uuid().optional().nullable(),
  subject: z.string().optional().nullable(),
  body: z.string(),
  templateId: z.string().uuid().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  couponId: z.string().uuid().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  cost: z.string().optional(),
});

const createCouponSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  discountType: z.string().optional(),
  discountValue: z.string(),
  maxDiscountAmount: z.string().optional().nullable(),
  minOrderAmount: z.string().optional().nullable(),
  serviceIds: z.array(z.string()).optional(),
  customerIds: z.array(z.string()).optional(),
  maxUses: z.number().int().optional().nullable(),
  maxUsesPerCustomer: z.number().int().optional(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const upsertLoyaltyConfigSchema = z.object({
  isActive: z.boolean().optional(),
  pointsPerSar: z.string().optional(),
  pointValue: z.string().optional(),
  silverThreshold: z.number().int().optional(),
  goldThreshold: z.number().int().optional(),
  vipThreshold: z.number().int().optional(),
  silverDiscount: z.string().optional(),
  goldDiscount: z.string().optional(),
  vipDiscount: z.string().optional(),
  referralRewardPoints: z.number().int().optional(),
  referralDiscountPercent: z.string().optional(),
});

const createLandingPageSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.array(z.unknown()).optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  facebookPixelId: z.string().optional().nullable(),
  googleAnalyticsId: z.string().optional().nullable(),
  snapchatPixelId: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  publishedAt: z.string().optional().nullable(),
});

const updateLandingPageSchema = createLandingPageSchema.partial();

export const marketingRouter = new Hono();

// ============================================================
// CAMPAIGNS
// ============================================================

marketingRouter.get("/campaigns", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const conditions = [eq(campaigns.orgId, orgId)];
  if (status) conditions.push(eq(campaigns.status, status as any));
  const result = await db.select().from(campaigns).where(and(...conditions)).orderBy(desc(campaigns.createdAt));
  return c.json({ data: result });
});

marketingRouter.post("/campaigns", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createCampaignSchema.parse(await c.req.json());
  const { scheduledAt, ...campaignRest } = body;
  const [campaign] = await db.insert(campaigns).values({
    orgId, createdBy: userId, ...campaignRest,
    ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
  }).returning();
  insertAuditLog({ orgId, userId, action: "created", resource: "campaign", resourceId: campaign.id });
  return c.json({ data: campaign }, 201);
});

marketingRouter.patch("/campaigns/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = createCampaignSchema.partial().parse(await c.req.json());
  const { scheduledAt, ...rest } = body;
  const [updated] = await db.update(campaigns).set({
    ...rest,
    ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
    updatedAt: new Date(),
  }).where(and(eq(campaigns.id, id), eq(campaigns.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الحملة غير موجودة" }, 404);
  return c.json({ data: updated });
});

marketingRouter.delete("/campaigns/:id", async (c) => {
  const orgId = getOrgId(c);
  await db.delete(campaigns).where(and(eq(campaigns.id, c.req.param("id")), eq(campaigns.orgId, orgId)));
  return c.json({ success: true });
});

marketingRouter.patch("/campaigns/:id/send", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const [updated] = await db.update(campaigns).set({
    status: "active", sentAt: new Date(), updatedAt: new Date(),
  }).where(and(eq(campaigns.id, id), eq(campaigns.orgId, orgId))).returning();

  if (!updated) return c.json({ error: "الحملة غير موجودة" }, 404);

  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "campaign", resourceId: id, metadata: { action: "send" } });

  // Dispatch to segment members in the background
  if (updated.segmentId) {
    dispatchCampaign(orgId, updated).catch(() => {});
  }

  return c.json({ data: updated });
});

async function dispatchCampaign(orgId: string, campaign: typeof campaigns.$inferSelect) {
  const [segment] = await db.select().from(customerSegments)
    .where(and(eq(customerSegments.id, campaign.segmentId!), eq(customerSegments.orgId, orgId)));
  if (!segment) return;

  const members = await evaluateSegment(orgId, segment.rules as any);
  if (members.length === 0) return;

  const memberIds = members.map((m) => m.id);
  const memberDetails = await db.select({ id: customers.id, phone: customers.phone })
    .from(customers)
    .where(inArray(customers.id, memberIds));

  const channel = campaign.channel === "multi" ? "whatsapp" : campaign.channel;
  const phones = memberDetails.map((m) => m.phone).filter(Boolean);

  if (phones.length > 0) {
    // Bulk insert into message_logs — one row per recipient
    const placeholders = phones.map((_, i) => `($1, $2, $${i + 3}, $${phones.length + 3}, 'queued', 'campaign')`).join(", ");
    await pool.query(
      `INSERT INTO message_logs (org_id, channel, recipient_phone, message_text, status, category) VALUES ${placeholders}`,
      [orgId, channel, ...phones, campaign.body]
    ).catch(() => {});

    await db.update(campaigns).set({
      audienceCount: phones.length,
      totalSent: phones.length,
      updatedAt: new Date(),
    }).where(eq(campaigns.id, campaign.id));
  }
}

// ============================================================
// SEGMENTS
// ============================================================

marketingRouter.get("/segments", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(customerSegments)
    .where(and(eq(customerSegments.orgId, orgId), eq(customerSegments.isActive, true)))
    .orderBy(desc(customerSegments.createdAt));
  return c.json({ data: result });
});

marketingRouter.get("/segments/:id/preview", async (c) => {
  const orgId = getOrgId(c);
  const segment = await db.select().from(customerSegments)
    .where(and(eq(customerSegments.id, c.req.param("id")), eq(customerSegments.orgId, orgId)));
  if (!segment[0]) return c.json({ error: "الشريحة غير موجودة" }, 404);
  const members = await evaluateSegment(orgId, segment[0].rules as any);
  return c.json({ data: { count: members.length, sample: members.slice(0, 10) } });
});

marketingRouter.post("/segments", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { name, description, color, rules, isActive } = await c.req.json();
  const [seg] = await db.insert(customerSegments).values({
    orgId, name,
    description: description || null,
    color: color || null,
    rules: rules || { operator: "and", conditions: [] },
    isActive: isActive !== false,
  }).returning();
  insertAuditLog({ orgId, userId, action: "created", resource: "customer_segment", resourceId: seg.id });
  return c.json({ data: seg }, 201);
});

marketingRouter.patch("/segments/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const allowed = ["name", "description", "color", "rules", "isActive"] as const;
  const updates: any = { updatedAt: new Date() };
  allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
  const [seg] = await db.update(customerSegments)
    .set(updates)
    .where(and(eq(customerSegments.id, c.req.param("id")), eq(customerSegments.orgId, orgId)))
    .returning();
  if (!seg) return c.json({ error: "الشريحة غير موجودة" }, 404);
  return c.json({ data: seg });
});

marketingRouter.delete("/segments/:id", async (c) => {
  const orgId = getOrgId(c);
  await db.delete(customerSegments)
    .where(and(eq(customerSegments.id, c.req.param("id")), eq(customerSegments.orgId, orgId)));
  return c.json({ success: true });
});

marketingRouter.patch("/abandoned-carts/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status } = await c.req.json();
  const [cart] = await db.update(abandonedCarts)
    .set({
      recoveryStatus: status,
      ...(status === "recovered" ? { recoveredAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(abandonedCarts.id, c.req.param("id")), eq(abandonedCarts.orgId, orgId)))
    .returning();
  if (!cart) return c.json({ error: "السلة غير موجودة" }, 404);
  return c.json({ data: cart });
});

// ============================================================
// COUPONS
// ============================================================

marketingRouter.get("/coupons", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(coupons).where(and(eq(coupons.orgId, orgId), eq(coupons.isActive, true))).orderBy(desc(coupons.createdAt));
  return c.json({ data: result });
});

marketingRouter.post("/coupons", async (c) => {
  const orgId = getOrgId(c);
  const body = createCouponSchema.parse(await c.req.json());
  const { startsAt, expiresAt, ...couponRest } = body;
  const [coupon] = await db.insert(coupons).values({
    orgId, ...couponRest,
    ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
    ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
  }).returning();
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "coupon", resourceId: coupon.id });
  return c.json({ data: coupon }, 201);
});

marketingRouter.patch("/coupons/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createCouponSchema.partial().parse(await c.req.json());
  const { startsAt, expiresAt, ...rest } = body;
  const [updated] = await db.update(coupons).set({
    ...rest,
    ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
    ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
  }).where(and(eq(coupons.id, c.req.param("id")), eq(coupons.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الكوبون غير موجود" }, 404);
  return c.json({ data: updated });
});

marketingRouter.delete("/coupons/:id", async (c) => {
  const orgId = getOrgId(c);
  await db.delete(coupons).where(and(eq(coupons.id, c.req.param("id")), eq(coupons.orgId, orgId)));
  return c.json({ success: true });
});

// GET all coupons (active + inactive)
marketingRouter.get("/coupons/all", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(coupons).where(eq(coupons.orgId, orgId)).orderBy(desc(coupons.createdAt));
  return c.json({ data: result });
});

marketingRouter.post("/coupons/validate", async (c) => {
  const orgId = getOrgId(c);
  const { code, customerId, orderAmount } = await c.req.json();

  const [coupon] = await db.select().from(coupons).where(and(
    eq(coupons.orgId, orgId), eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true),
  ));

  if (!coupon) return c.json({ valid: false, error: "كوبون غير صحيح" });
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return c.json({ valid: false, error: "الكوبون منتهي الصلاحية" });
  if (coupon.maxUses && coupon.timesUsed! >= coupon.maxUses) return c.json({ valid: false, error: "الكوبون استُنفد" });
  if (coupon.minOrderAmount && parseFloat(orderAmount) < parseFloat(coupon.minOrderAmount)) return c.json({ valid: false, error: `الحد الأدنى للطلب ${coupon.minOrderAmount} ر.س` });

  let discount = coupon.discountType === "percentage"
    ? parseFloat(orderAmount) * (parseFloat(coupon.discountValue) / 100)
    : parseFloat(coupon.discountValue);
  if (coupon.maxDiscountAmount) discount = Math.min(discount, parseFloat(coupon.maxDiscountAmount));

  return c.json({ valid: true, discount: Math.round(discount * 100) / 100, couponId: coupon.id });
});

// ============================================================
// LOYALTY
// ============================================================

marketingRouter.get("/loyalty/config", async (c) => {
  const orgId = getOrgId(c);
  const [config] = await db.select().from(loyaltyConfig).where(eq(loyaltyConfig.orgId, orgId));
  return c.json({ data: config || null });
});

marketingRouter.put("/loyalty/config", async (c) => {
  const orgId = getOrgId(c);
  const body = upsertLoyaltyConfigSchema.parse(await c.req.json());
  const [existing] = await db.select().from(loyaltyConfig).where(eq(loyaltyConfig.orgId, orgId));
  if (existing) {
    const [updated] = await db.update(loyaltyConfig).set({ ...body, updatedAt: new Date() }).where(eq(loyaltyConfig.id, existing.id)).returning();
    return c.json({ data: updated });
  }
  const [created] = await db.insert(loyaltyConfig).values({ orgId, ...body }).returning();
  return c.json({ data: created }, 201);
});

marketingRouter.get("/loyalty/transactions", async (c) => {
  const orgId = getOrgId(c);
  const customerId = c.req.query("customerId");
  const conditions = [eq(loyaltyTransactions.orgId, orgId)];
  if (customerId) conditions.push(eq(loyaltyTransactions.customerId, customerId));
  const result = await db.select().from(loyaltyTransactions).where(and(...conditions)).orderBy(desc(loyaltyTransactions.createdAt)).limit(50);
  return c.json({ data: result });
});

// ============================================================
// ABANDONED CARTS
// ============================================================

marketingRouter.get("/abandoned-carts", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status") || "abandoned";
  const result = await db.select().from(abandonedCarts).where(and(
    eq(abandonedCarts.orgId, orgId), eq(abandonedCarts.recoveryStatus, status),
  )).orderBy(desc(abandonedCarts.createdAt));
  return c.json({ data: result });
});

marketingRouter.get("/abandoned-carts/stats", async (c) => {
  const orgId = getOrgId(c);
  const [stats] = await db.select({
    total: count(),
    recovered: sql<number>`COUNT(*) FILTER (WHERE ${abandonedCarts.recoveryStatus} = 'recovered')`,
    totalValue: sql<string>`COALESCE(SUM(CAST(${abandonedCarts.totalAmount} AS DECIMAL)), 0)`,
    recoveredValue: sql<string>`COALESCE(SUM(CAST(${abandonedCarts.totalAmount} AS DECIMAL)) FILTER (WHERE ${abandonedCarts.recoveryStatus} = 'recovered'), 0)`,
  }).from(abandonedCarts).where(eq(abandonedCarts.orgId, orgId));
  return c.json({ data: { ...stats, recoveryRate: stats.total ? Math.round(Number(stats.recovered) / Number(stats.total) * 100) : 0 } });
});

// ============================================================
// REVIEWS
// ============================================================

marketingRouter.get("/reviews", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const conditions = [eq(reviews.orgId, orgId)];
  if (status) conditions.push(eq(reviews.status, status as any));
  const result = await db.select().from(reviews).where(and(...conditions)).orderBy(desc(reviews.createdAt));
  return c.json({ data: result });
});

marketingRouter.patch("/reviews/:id/respond", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { responseText } = await c.req.json();
  const [updated] = await db.update(reviews).set({
    responseText, respondedBy: userId, respondedAt: new Date(), status: "approved", isPublished: true,
  }).where(and(eq(reviews.id, c.req.param("id")), eq(reviews.orgId, orgId))).returning();
  return c.json({ data: updated });
});

// PATCH /reviews/:id/visibility — toggle show/hide
marketingRouter.patch("/reviews/:id/visibility", async (c) => {
  const orgId = getOrgId(c);
  const [review] = await db.select({ isPublished: reviews.isPublished })
    .from(reviews).where(and(eq(reviews.id, c.req.param("id")), eq(reviews.orgId, orgId)));
  if (!review) return c.json({ error: "التقييم غير موجود" }, 404);
  const [updated] = await db.update(reviews)
    .set({ isPublished: !review.isPublished })
    .where(and(eq(reviews.id, c.req.param("id")), eq(reviews.orgId, orgId)))
    .returning();
  return c.json({ data: updated });
});

// PATCH /reviews/:id/status — approve | reject | pending
marketingRouter.patch("/reviews/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status } = await c.req.json();
  const [updated] = await db.update(reviews)
    .set({ status, ...(status === "approved" ? { isPublished: true } : {}) })
    .where(and(eq(reviews.id, c.req.param("id")), eq(reviews.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "التقييم غير موجود" }, 404);
  return c.json({ data: updated });
});

// DELETE /reviews/:id
marketingRouter.delete("/reviews/:id", async (c) => {
  const orgId = getOrgId(c);
  await db.delete(reviews).where(and(eq(reviews.id, c.req.param("id")), eq(reviews.orgId, orgId)));
  return c.json({ success: true });
});

// POST /reviews/request — طلب تقييم عبر واتساب/رسالة نصية
marketingRouter.post("/reviews/request", async (c) => {
  const orgId = getOrgId(c);
  const { phone, customerName, bookingId } = await c.req.json();
  if (!phone) return c.json({ error: "رقم الهاتف مطلوب" }, 400);

  // Build review link
  const [org] = await db.select({ slug: organizations.slug }).from(organizations).where(eq(organizations.id, orgId));
  const reviewUrl = `${process.env.DASHBOARD_URL || "https://nasaqpro.tech"}/book/${org?.slug || ""}?review=1${bookingId ? `&bid=${bookingId}` : ""}`;

  const message = `أهلاً ${customerName || ""}!\nشكراً لاختيارك خدماتنا. نودّ معرفة رأيك.\nقيّمنا هنا:\n${reviewUrl}`;

  const { sendWhatsApp } = await import("../lib/whatsapp");
  const sent = await sendWhatsApp(phone, message).catch(() => false);

  return c.json({ data: { sent, message } });
});

// GET /reviews/stats
marketingRouter.get("/reviews/stats", async (c) => {
  const orgId = getOrgId(c);
  const all = await db.select({ rating: reviews.rating, status: reviews.status })
    .from(reviews).where(eq(reviews.orgId, orgId));

  const total = all.length;
  const avg = total > 0 ? all.reduce((s, r) => s + r.rating, 0) / total : 0;
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  all.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });

  return c.json({
    data: {
      total,
      avg: Math.round(avg * 10) / 10,
      distribution: dist,
      pending: all.filter(r => r.status === "pending").length,
    },
  });
});

// ============================================================
// LANDING PAGES
// ============================================================

marketingRouter.get("/landing-pages", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(landingPages).where(eq(landingPages.orgId, orgId)).orderBy(desc(landingPages.createdAt));
  return c.json({ data: result });
});

marketingRouter.post("/landing-pages", async (c) => {
  const orgId = getOrgId(c);
  const body = createLandingPageSchema.parse(await c.req.json());
  const { publishedAt: paCreate, ...pageRest } = body;
  const [page] = await db.insert(landingPages).values({
    orgId, ...pageRest,
    ...(paCreate !== undefined && { publishedAt: paCreate ? new Date(paCreate) : null }),
  }).returning();
  return c.json({ data: page }, 201);
});

marketingRouter.put("/landing-pages/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateLandingPageSchema.parse(await c.req.json());
  const { publishedAt: paUpdate, ...pageUpdateRest } = body;
  const [updated] = await db.update(landingPages).set({
    ...pageUpdateRest,
    ...(paUpdate !== undefined && { publishedAt: paUpdate ? new Date(paUpdate) : null }),
    updatedAt: new Date(),
  }).where(and(eq(landingPages.id, c.req.param("id")), eq(landingPages.orgId, orgId))).returning();
  return c.json({ data: updated });
});

// ============================================================
// MARKETING REPORTS
// ============================================================

marketingRouter.get("/reports/roi", async (c) => {
  const orgId = getOrgId(c);
  const campaignList = await db.select().from(campaigns).where(and(
    eq(campaigns.orgId, orgId), sql`${campaigns.status} IN ('active', 'completed')`,
  )).orderBy(desc(campaigns.revenueGenerated));

  const summary = campaignList.reduce((acc, c) => ({
    totalCost: acc.totalCost + parseFloat(c.cost || "0"),
    totalRevenue: acc.totalRevenue + parseFloat(c.revenueGenerated || "0"),
    totalSent: acc.totalSent + (c.totalSent || 0),
    totalConverted: acc.totalConverted + (c.totalConverted || 0),
  }), { totalCost: 0, totalRevenue: 0, totalSent: 0, totalConverted: 0 });

  return c.json({
    data: {
      campaigns: campaignList.map(c => ({
        id: c.id, name: c.name, channel: c.channel,
        sent: c.totalSent, converted: c.totalConverted,
        cost: parseFloat(c.cost || "0"), revenue: parseFloat(c.revenueGenerated || "0"),
        roi: parseFloat(c.cost || "0") > 0 ? Math.round((parseFloat(c.revenueGenerated || "0") - parseFloat(c.cost || "0")) / parseFloat(c.cost || "0") * 100) : 0,
      })),
      summary: {
        ...summary,
        overallROI: summary.totalCost > 0 ? Math.round((summary.totalRevenue - summary.totalCost) / summary.totalCost * 100) : 0,
        conversionRate: summary.totalSent > 0 ? Math.round(summary.totalConverted / summary.totalSent * 100) : 0,
      },
    },
  });
});
