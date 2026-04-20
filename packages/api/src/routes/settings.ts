import { Hono } from "hono";
import { eq, and, asc, desc, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, pool } from "@nasaq/db/client";
import { organizations, locations, organizationCapabilityOverrides, services, customers, bookings, users, siteConfig, orgDocuments, capabilityRegistry } from "@nasaq/db/schema";
import { isFeatureEnabledForOrg } from "../lib/feature-flags";
import { getOrgId, getUserId, getBusinessDefaults } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { invalidateOrgContext } from "../lib/org-context";
import { requirePermission } from "../middleware/auth";
import { z } from "zod";
import { DEFAULT_TRIAL_DAYS } from "../lib/constants";

const createBranchSchema = z.object({
  name: z.string().min(1),
  branchCode: z.string().optional().nullable(),
  type: z.string().optional().default("branch"),
  color: z.string().optional().nullable(),
  isMainBranch: z.boolean().optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  managerPhone: z.string().optional().nullable(),
  capacity: z.string().optional().nullable(),
  openingHours: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateBranchSchema = createBranchSchema.partial();

export const settingsRouter = new Hono();

// ============================================================
// ORG PROFILE
// ============================================================

settingsRouter.get("/profile", async (c) => {
  const orgId = getOrgId(c);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) return c.json({ error: "المنظمة غير موجودة" }, 404);
  return c.json({ data: org });
});

// GET /settings/setup-status — حالة إعداد المنشأة للـ checklist في الداشبورد
settingsRouter.get("/setup-status", async (c) => {
  const orgId = getOrgId(c);

  const [[svcRow], [custRow], [bookRow], [teamRow], [branchRow], menuItemsResult, ordersResult] = await Promise.all([
    db.select({ n: count() }).from(services).where(and(eq(services.orgId, orgId), eq(services.status, "active"))),
    db.select({ n: count() }).from(customers).where(eq(customers.orgId, orgId)),
    db.select({ n: count() }).from(bookings).where(eq(bookings.orgId, orgId)),
    db.select({ n: count() }).from(users).where(and(eq(users.orgId, orgId), eq(users.status, "active"))),
    db.select({ n: count() }).from(locations).where(eq(locations.orgId, orgId)),
    pool.query(`SELECT COUNT(*)::int AS n FROM menu_items WHERE org_id = $1 AND is_active = true`, [orgId]).catch(() => null),
    pool.query(`SELECT COUNT(*)::int AS n FROM online_orders WHERE org_id = $1`, [orgId]).catch(() => null),
  ]);

  const [org] = await db.select({ slug: organizations.slug, businessType: organizations.businessType })
    .from(organizations).where(eq(organizations.id, orgId));

  const menuItemCount = (menuItemsResult?.rows?.[0]?.n as number) ?? 0;
  const orderCount    = (ordersResult?.rows?.[0]?.n as number) ?? 0;

  return c.json({
    data: {
      hasServices:   (svcRow?.n ?? 0) > 0,
      hasMenuItems:  menuItemCount > 0,
      hasCustomers:  (custRow?.n ?? 0) > 0,
      hasBookings:   (bookRow?.n ?? 0) > 0,
      hasOrders:     orderCount > 0,
      hasTeam:       (teamRow?.n ?? 0) > 1,
      hasBranch:     (branchRow?.n ?? 0) > 0,
      hasSlug:       !!org?.slug,
      businessType:  org?.businessType ?? "",
      counts: {
        services:   svcRow?.n ?? 0,
        menuItems:  menuItemCount,
        customers:  custRow?.n ?? 0,
        bookings:   bookRow?.n ?? 0,
        orders:     orderCount,
        team:       teamRow?.n ?? 0,
      },
    },
  });
});

// GET /settings/context — resolved org context for the dashboard decision layer
settingsRouter.get("/context", async (c) => {
  const orgId = getOrgId(c);
  const { resolveOrgContext } = await import("../lib/org-context");
  const ctx = await resolveOrgContext(orgId);
  if (!ctx) return c.json({ error: "المنظمة غير موجودة" }, 404);
  return c.json({ data: ctx });
});

settingsRouter.put("/profile", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  // Only allow updating specific fields
  const allowedFields: Record<string, any> = {};
  const editable = [
    "name", "nameEn", "logo", "phone", "email", "website",
    "primaryColor", "secondaryColor", "commercialRegister", "vatNumber",
    "city", "address", "customDomain", "subdomain",
    "businessType", "operatingProfile", "serviceDeliveryModes", "enabledCapabilities",
    "tagline", "description", "coverImage",
    "instagram", "twitter", "tiktok", "snapchat", "googleMapsEmbed",
  ];
  for (const key of editable) {
    if (body[key] !== undefined) allowedFields[key] = body[key];
  }

  // If businessType changed, auto-derive operatingProfile/serviceDeliveryModes/enabledCapabilities
  // unless the caller explicitly provided them (manual override)
  if (allowedFields.businessType) {
    const bizDefaults = getBusinessDefaults(allowedFields.businessType);
    if (allowedFields.operatingProfile === undefined)
      allowedFields.operatingProfile = bizDefaults.operatingProfile;
    if (allowedFields.serviceDeliveryModes === undefined)
      allowedFields.serviceDeliveryModes = bizDefaults.serviceDeliveryModes;
    if (allowedFields.enabledCapabilities === undefined)
      allowedFields.enabledCapabilities = bizDefaults.enabledCapabilities;
  }

  const [updated] = await db.update(organizations).set({ ...allowedFields, updatedAt: new Date() })
    .where(eq(organizations.id, orgId)).returning();

  // Sync primaryColor + logo → site_config so the public storefront reflects the change
  const siteConfigUpdates: Record<string, any> = {};
  if (allowedFields.primaryColor) siteConfigUpdates.primaryColor = allowedFields.primaryColor;
  if (allowedFields.logo) siteConfigUpdates.logoUrl = allowedFields.logo;
  if (Object.keys(siteConfigUpdates).length > 0) {
    const [existingCfg] = await db.select({ id: siteConfig.id }).from(siteConfig).where(eq(siteConfig.orgId, orgId));
    if (existingCfg) {
      await db.update(siteConfig).set({ ...siteConfigUpdates, updatedAt: new Date() }).where(eq(siteConfig.id, existingCfg.id));
    } else {
      await db.insert(siteConfig).values({ orgId, ...siteConfigUpdates });
    }
  }

  invalidateOrgContext(orgId);
  return c.json({ data: updated });
});

// Allowed keys for PUT /settings — whitelist prevents injection of arbitrary JSON
const settingsSchema = z.object({
  timezone: z.string().max(50).optional(),
  currency: z.string().max(10).optional(),
  language: z.enum(["ar", "en"]).optional(),
  dateFormat: z.string().max(20).optional(),
  weekStartsOn: z.enum(["saturday", "sunday", "monday"]).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  vatInclusive: z.boolean().optional(),
  financial: z.object({
    enable_full_accounting: z.boolean().optional(),
    enable_manual_journal_entries: z.boolean().optional(),
    enable_bank_reconciliation: z.boolean().optional(),
    enable_cashier_shift_closing: z.boolean().optional(),
    enable_tax_management: z.boolean().optional(),
    enable_advanced_ar_ap: z.boolean().optional(),
    enable_branch_level_treasury: z.boolean().optional(),
    auto_post_bookings: z.boolean().optional(),
    auto_post_expenses: z.boolean().optional(),
    fiscal_year_start: z.string().max(10).optional(),
    tax: z.object({
      vatRate: z.number().min(0).max(100).optional(),
      vatInclusive: z.boolean().optional(),
      vatRegistered: z.boolean().optional(),
      vatNumber: z.string().max(50).nullable().optional(),
    }).optional(),
  }).optional(),
  invoiceTermsTemplate: z.string().max(3000).nullable().optional(),
});

settingsRouter.put("/settings", async (c) => {
  const orgId = getOrgId(c);
  const parseResult = settingsSchema.safeParse(await c.req.json());
  if (!parseResult.success) return c.json({ error: "بيانات الإعدادات غير صالحة", details: parseResult.error.flatten() }, 400);
  const body = parseResult.data;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) return c.json({ error: "المنظمة غير موجودة" }, 404);

  const currentSettings = (org.settings as any) || {};
  const mergedSettings = { ...currentSettings, ...body };

  const [updated] = await db.update(organizations).set({ settings: mergedSettings, updatedAt: new Date() })
    .where(eq(organizations.id, orgId)).returning();
  return c.json({ data: updated.settings });
});

// ============================================================
// CAPABILITY OVERRIDES
// ============================================================

// GET /settings/capabilities — list resolved capabilities + overrides
settingsRouter.get("/capabilities", async (c) => {
  const orgId = getOrgId(c);
  const [org] = await db.select({ enabledCapabilities: organizations.enabledCapabilities })
    .from(organizations).where(eq(organizations.id, orgId));

  const overrides = await db.select().from(organizationCapabilityOverrides)
    .where(eq(organizationCapabilityOverrides.orgId, orgId));

  return c.json({ data: { base: org?.enabledCapabilities ?? [], overrides } });
});

// PUT /settings/capabilities/:key — force-on or force-off a capability (requires settings:manage_settings)
settingsRouter.put("/capabilities/:key", requirePermission("settings", "manage_settings"), async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const key = c.req.param("key")!;
  const { enabled, reason } = await c.req.json() as { enabled: boolean; reason?: string };

  const existing = await db.select({ id: organizationCapabilityOverrides.id })
    .from(organizationCapabilityOverrides)
    .where(and(
      eq(organizationCapabilityOverrides.orgId, orgId),
      eq(organizationCapabilityOverrides.capabilityKey, key)
    ));

  if (existing[0]) {
    await db.update(organizationCapabilityOverrides)
      .set({ enabled, reason: reason ?? null })
      .where(eq(organizationCapabilityOverrides.id, existing[0].id));
  } else {
    await db.insert(organizationCapabilityOverrides).values({
      orgId, capabilityKey: key, enabled, reason: reason ?? null,
      setBy: userId ?? null,
    });
  }

  invalidateOrgContext(orgId);
  insertAuditLog({ orgId, userId, action: "updated", resource: "capability_override", resourceId: key, newValue: { enabled } });
  return c.json({ success: true });
});

// DELETE /settings/capabilities/:key — remove override (revert to businessType default)
settingsRouter.delete("/capabilities/:key", async (c) => {
  const orgId = getOrgId(c);
  const key = c.req.param("key")!;
  await db.delete(organizationCapabilityOverrides)
    .where(and(
      eq(organizationCapabilityOverrides.orgId, orgId),
      eq(organizationCapabilityOverrides.capabilityKey, key)
    ));
  invalidateOrgContext(orgId);
  return c.json({ success: true });
});

// ============================================================
// BRANCHES (locations)
// ============================================================

settingsRouter.get("/locations", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(locations)
    .where(and(eq(locations.orgId, orgId), eq(locations.isActive, true)))
    .orderBy(asc(locations.name));
  return c.json({ data: result });
});

settingsRouter.post("/locations", async (c) => {
  const orgId = getOrgId(c);
  const body = createBranchSchema.parse(await c.req.json());
  // إذا كان الفرع رئيسياً، أزل الرئيسي السابق
  if (body.isMainBranch) {
    await db.update(locations).set({ isMainBranch: false }).where(eq(locations.orgId, orgId));
  }
  const [loc] = await db.insert(locations).values({ orgId, ...body }).returning();
  return c.json({ data: loc }, 201);
});

settingsRouter.put("/locations/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateBranchSchema.parse(await c.req.json());
  // إذا كان الفرع رئيسياً، أزل الرئيسي السابق
  if (body.isMainBranch) {
    await db.update(locations).set({ isMainBranch: false }).where(eq(locations.orgId, orgId));
  }
  const [updated] = await db.update(locations).set({ ...body, updatedAt: new Date() })
    .where(and(eq(locations.id, c.req.param("id")), eq(locations.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الفرع غير موجود" }, 404);
  return c.json({ data: updated });
});

settingsRouter.delete("/locations/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db.update(locations)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(locations.id, c.req.param("id")), eq(locations.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "الفرع غير موجود" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "location", resourceId: updated.id });
  return c.json({ data: updated });
});

// ============================================================
// SUBSCRIPTION INFO
// ============================================================

settingsRouter.get("/subscription", async (c) => {
  const orgId = getOrgId(c);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  return c.json({
    data: {
      plan: org?.plan, status: org?.subscriptionStatus,
      trialEndsAt: org?.trialEndsAt, subscriptionEndsAt: org?.subscriptionEndsAt,
    },
  });
});

// ============================================================
// ONBOARDING — Setup wizard for new subscribers
// ============================================================

settingsRouter.post("/onboard", async (c) => {
  const body = await c.req.json();
  const { orgName, ownerName, ownerPhone, city, industry } = body;

  if (!orgName || !ownerName || !ownerPhone) {
    return c.json({ error: "اسم الشركة والمالك والجوال مطلوبين" }, 400);
  }

  const slug = orgName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\u0621-\u064Aa-z0-9-]/g, "");

  // Load schema symbols once before transaction (avoids dynamic import inside tx)
  const { users, roles, bookingPipelineStages } = await import("@nasaq/db/schema");

  // Wrap all inserts in a single transaction — all-or-nothing (P4)
  const result = await db.transaction(async (tx) => {
    const biz = industry || "general";
    const bizDefaults = getBusinessDefaults(biz);
    const [org] = await tx.insert(organizations).values({
      name: orgName, slug, phone: ownerPhone, city,
      businessType: biz,
      plan: "basic", subscriptionStatus: "trialing",
      trialEndsAt: new Date(Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000),
      operatingProfile: bizDefaults.operatingProfile,
      serviceDeliveryModes: bizDefaults.serviceDeliveryModes,
      enabledCapabilities: bizDefaults.enabledCapabilities,
    }).returning();

    const [owner] = await tx.insert(users).values({
      orgId: org.id, name: ownerName, phone: ownerPhone, type: "owner", status: "active",
    }).returning();

    const defaultRoles = [
      { name: "مدير عمليات", nameEn: "Operations Manager", isSystem: true },
      { name: "مشرف حجوزات", nameEn: "Booking Supervisor", isSystem: true },
      { name: "محاسب", nameEn: "Accountant", isSystem: true },
    ];
    await tx.insert(roles).values(defaultRoles.map((r) => ({ orgId: org.id, ...r })));

    const defaultStages = [
      { name: "طلب جديد",    color: "#9E9E9E", sortOrder: 1, isDefault: true, mappedStatus: "pending" },
      { name: "تأكيد أولي",  color: "#FF9800", sortOrder: 2, mappedStatus: "confirmed" },
      { name: "عربون مدفوع", color: "#2196F3", sortOrder: 3, mappedStatus: "deposit_paid" },
      { name: "تأكيد نهائي", color: "#4CAF50", sortOrder: 4, mappedStatus: "fully_confirmed" },
      { name: "قيد التجهيز", color: "#9C27B0", sortOrder: 5, mappedStatus: "preparing" },
      { name: "مكتمل",       color: "#4CAF50", sortOrder: 7, isTerminal: true, mappedStatus: "completed" },
      { name: "ملغي",        color: "#F44336", sortOrder: 8, isTerminal: true, mappedStatus: "cancelled" },
    ];
    await tx.insert(bookingPipelineStages).values(defaultStages.map((s) => ({ orgId: org.id, ...s })));

    return { org, owner };
  });

  return c.json({
    data: {
      org: { id: result.org.id, name: result.org.name, slug: result.org.slug },
      owner: { id: result.owner.id, name: result.owner.name },
      trialDays: DEFAULT_TRIAL_DAYS,
      nextSteps: ["أضف خدماتك", "أضف مواقعك", "ابدأ باستقبال الحجوزات"],
    },
  }, 201);
});

// ============================================================
// CUSTOM LISTS (stored in org settings JSON)
// ============================================================

settingsRouter.get("/custom-lists", async (c) => {
  const orgId = getOrgId(c);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) return c.json({ error: "المنظمة غير موجودة" }, 404);

  const settings = (org.settings as any) || {};
  const customLists = settings.customLists || {
    paymentMethods: ["تحويل بنكي", "نقداً", "بطاقة ائتمان", "مدى", "Apple Pay"],
    customerSources: ["انستقرام", "واتساب", "توصية", "قوقل", "تيك توك", "معرض"],
    customerTypes: ["individual", "company", "government"],
    expenseCategories: ["رواتب", "إيجار", "مشتريات", "مواصلات", "تسويق", "صيانة", "أخرى"],
    pricingUnits: ["لكل حدث", "لكل ساعة", "لكل يوم", "لكل شخص"],
  };

  return c.json({ data: customLists });
});

settingsRouter.put("/custom-lists", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { key, values } = body;

  if (!key || !Array.isArray(values)) {
    return c.json({ error: "key and values are required" }, 400);
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) return c.json({ error: "المنظمة غير موجودة" }, 404);

  const settings = (org.settings as any) || {};
  const customLists = settings.customLists || {};
  customLists[key] = values;

  const [updated] = await db.update(organizations)
    .set({ settings: { ...settings, customLists }, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();

  return c.json({ data: (updated.settings as any).customLists });
});

// ============================================================
// ONBOARDING PROGRESS
// ============================================================

// PATCH /settings/onboarding-step — تحديث خطوة الإعداد
settingsRouter.patch("/onboarding-step", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { step } = await c.req.json() as { step: string };

  const isDone = step === "done";
  await db.update(organizations)
    .set({
      onboardingStep:      step,
      onboardingCompleted: isDone ? true : undefined,
      updatedAt:           new Date(),
    })
    .where(eq(organizations.id, orgId));

  if (isDone) {
    insertAuditLog({ orgId, userId, action: "completed", resource: "onboarding", resourceId: orgId });
  }

  return c.json({ data: { step, completed: isDone } });
});

// POST /settings/seed-demo — زرع بيانات تجريبية حسب نوع النشاط
settingsRouter.post("/seed-demo", async (c) => {
  const orgId = getOrgId(c);

  const [org] = await db
    .select({ businessType: organizations.businessType, hasDemoData: organizations.hasDemoData })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) return c.json({ error: "المنظمة غير موجودة" }, 404);
  if (org.hasDemoData) return c.json({ data: { seeded: false, reason: "already_seeded" } });

  const biz = org.businessType ?? "general";
  const demoContent = getDemoContent(biz);

  // زرع خدمتين تجريبيتين
  for (const svc of demoContent.services) {
    const slug = svc.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0621-\u064Aa-z0-9-]/g, "") || nanoid(6);
    await db.insert(services).values({
      orgId,
      name:      svc.name,
      slug,
      basePrice: String(svc.price),
      status:    "active",
      isDemo:    true,
    }).onConflictDoNothing();
  }

  // زرع عميلين تجريبيين
  let seededCustomers = 0;
  for (const cust of demoContent.customers) {
    const phone = `050${Math.floor(1000000 + Math.random() * 8999999)}`;
    await db.insert(customers).values({
      orgId,
      name:   cust.name,
      phone,
      source: "demo",
      isDemo: true,
    }).onConflictDoNothing();
    seededCustomers++;
  }

  // تحديث العلم
  await db.update(organizations)
    .set({ hasDemoData: true, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  return c.json({ data: { seeded: true, services: demoContent.services.length, customers: seededCustomers } }, 201);
});

// DELETE /settings/demo-data — مسح علم البيانات التجريبية (البيانات تُحذف بشكل مستقل)
settingsRouter.delete("/demo-data", async (c) => {
  const orgId = getOrgId(c);

  await db.update(organizations)
    .set({ hasDemoData: false, demoClearedAt: new Date(), updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  // حذف الخدمات والعملاء التجريبيين (المميَّزون بـ isDemo = true)
  await db.delete(services).where(and(eq(services.orgId, orgId), eq(services.isDemo, true)));
  await db.delete(customers).where(and(eq(customers.orgId, orgId), eq(customers.isDemo, true)));

  return c.json({ data: { cleared: true } });
});

// ── مساعد: محتوى تجريبي حسب نوع النشاط ────────────────────
function getDemoContent(businessType: string): {
  services: { name: string; price: number }[];
  customers: { name: string }[];
} {
  const map: Record<string, { services: { name: string; price: number }[]; customers: { name: string }[] }> = {
    flower_shop:  { services: [{ name: "باقة ورد كلاسيكية", price: 150 }, { name: "تنسيق طاولة عقد قران", price: 800 }],  customers: [{ name: "سارة العمري" }, { name: "مريم الشهري" }] },
    flowers:      { services: [{ name: "باقة ورد كلاسيكية", price: 150 }, { name: "تنسيق طاولة عقد قران", price: 800 }],  customers: [{ name: "سارة العمري" }, { name: "مريم الشهري" }] },
    salon:        { services: [{ name: "قصة شعر مع تفيف", price: 120 }, { name: "جلسة عناية بالبشرة", price: 250 }],        customers: [{ name: "نورة السالم" }, { name: "هند المطيري" }] },
    barber:       { services: [{ name: "قصة شعر رجالي", price: 60 }, { name: "حلاقة ذقن كاملة", price: 40 }],              customers: [{ name: "عبدالله الرشيد" }, { name: "فهد العتيبي" }] },
    spa:          { services: [{ name: "جلسة مساج 60 دقيقة", price: 350 }, { name: "باقة استرخاء كاملة", price: 600 }],      customers: [{ name: "ريم الزهراني" }, { name: "منيرة الحربي" }] },
    restaurant:   { services: [{ name: "وجبة عائلية للأربعة", price: 220 }, { name: "طقم مشاوي مشكّلة", price: 180 }],       customers: [{ name: "أحمد الدوسري" }, { name: "محمد الشمري" }] },
    cafe:         { services: [{ name: "طقم قهوة وتمر", price: 85 }, { name: "وجبة إفطار كاملة", price: 65 }],              customers: [{ name: "سلمى القحطاني" }, { name: "لجين العنزي" }] },
    hotel:        { services: [{ name: "غرفة مزدوجة - ليلة", price: 450 }, { name: "جناح عائلي - ليلة", price: 750 }],       customers: [{ name: "عائلة الشمري" }, { name: "أ. محمد العتيبي" }] },
    car_rental:   { services: [{ name: "تأجير سيارة سيدان - يومي", price: 200 }, { name: "تأجير حافلة صغيرة - يومي", price: 450 }], customers: [{ name: "خالد المنصور" }, { name: "شركة النور" }] },
    events:       { services: [{ name: "تجهيز قاعة أفراح كاملة", price: 5000 }, { name: "خيمة مغربية 10×10", price: 1500 }],  customers: [{ name: "عائلة الزهراني" }, { name: "م. هند العتيبي" }] },
    photography:  { services: [{ name: "جلسة تصوير خطوبة", price: 800 }, { name: "تصوير حفل زفاف كامل", price: 3500 }],      customers: [{ name: "رانيا الغامدي" }, { name: "أ. أحمد المالكي" }] },
    retail:       { services: [{ name: "منتج أساسي", price: 99 }, { name: "منتج متميز", price: 249 }],                       customers: [{ name: "عميل تجريبي ١" }, { name: "عميل تجريبي ٢" }] },
  };

  return map[businessType] ?? {
    services:  [{ name: "خدمة أساسية", price: 200 }, { name: "خدمة متميزة", price: 500 }],
    customers: [{ name: "عميل تجريبي ١" }, { name: "عميل تجريبي ٢" }],
  };
}

// ── Org Documents (KYC / Verification) ─────────────────────
settingsRouter.get("/documents", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db.select().from(orgDocuments).where(eq(orgDocuments.orgId, orgId)).orderBy(desc(orgDocuments.createdAt));
  return c.json({ data: rows });
});

settingsRouter.post("/documents", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const parsed = z.object({
    type: z.string().min(1).max(100),
    label: z.string().max(200).optional(),
    fileUrl: z.string().min(1),
    documentNumber: z.string().max(100).optional(),
    expiresAt: z.string().optional(),
  }).parse(body);

  const [doc] = await db.insert(orgDocuments).values({
    orgId,
    type: parsed.type,
    label: parsed.label || null,
    fileUrl: parsed.fileUrl,
    documentNumber: parsed.documentNumber || null,
    expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    status: "pending",
  }).returning();

  return c.json({ data: doc }, 201);
});

settingsRouter.delete("/documents/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const [deleted] = await db.delete(orgDocuments).where(
    and(eq(orgDocuments.id, id), eq(orgDocuments.orgId, orgId))
  ).returning({ id: orgDocuments.id });
  if (!deleted) return c.json({ error: "لم يتم العثور على الوثيقة" }, 404);
  return c.json({ data: deleted });
});

// ────────────────────────────────────────────────────────────
// GET /settings/features/me — feature flags for current org
// Returns { features: { [key]: boolean } }
// ────────────────────────────────────────────────────────────
settingsRouter.get("/features/me", async (c) => {
  const orgId = getOrgId(c);

  // Load all capabilities from registry
  const allFeatures = await db
    .select({
      key: capabilityRegistry.key,
      killSwitch: capabilityRegistry.killSwitch,
      defaultForNewOrgs: capabilityRegistry.defaultForNewOrgs,
      rolloutPercentage: capabilityRegistry.rolloutPercentage,
    })
    .from(capabilityRegistry);

  // Load org-specific overrides
  const overrides = await db
    .select({
      capabilityKey: organizationCapabilityOverrides.capabilityKey,
      enabled: organizationCapabilityOverrides.enabled,
    })
    .from(organizationCapabilityOverrides)
    .where(eq(organizationCapabilityOverrides.orgId, orgId));

  const overrideMap = new Map(overrides.map((o) => [o.capabilityKey, { enabled: o.enabled }]));

  // Also load stored capabilities from org
  const [org] = await db
    .select({ enabledCapabilities: organizations.enabledCapabilities })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const storedCaps = new Set<string>((org?.enabledCapabilities as string[] | null) ?? []);

  // Compute effective access for each registered feature
  const features: Record<string, boolean> = {};
  for (const feature of allFeatures) {
    const override = overrideMap.get(feature.key) ?? null;
    // If stored in org.enabledCapabilities and no kill switch, it's enabled
    // (legacy path: before rollout system existed)
    if (!feature.killSwitch && storedCaps.has(feature.key) && override === null) {
      features[feature.key] = true;
    } else {
      features[feature.key] = isFeatureEnabledForOrg(feature, { id: orgId }, override);
    }
  }

  return c.json({ data: { features } });
});
