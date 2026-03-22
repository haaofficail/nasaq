import { Hono } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { organizations, locations } from "@nasaq/db/schema";
import { getOrgId } from "../lib/helpers";
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

settingsRouter.put("/profile", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  
  // Only allow updating specific fields
  const allowedFields: Record<string, any> = {};
  const editable = [
    "name", "nameEn", "logo", "phone", "email", "website",
    "primaryColor", "secondaryColor", "commercialRegister", "vatNumber",
    "city", "address", "customDomain", "subdomain",
    "businessType", "tagline", "description", "coverImage",
    "instagram", "twitter", "tiktok", "snapchat", "googleMapsEmbed",
  ];
  for (const key of editable) {
    if (body[key] !== undefined) allowedFields[key] = body[key];
  }

  const [updated] = await db.update(organizations).set({ ...allowedFields, updatedAt: new Date() })
    .where(eq(organizations.id, orgId)).returning();
  return c.json({ data: updated });
});

settingsRouter.put("/settings", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) return c.json({ error: "المنظمة غير موجودة" }, 404);

  const currentSettings = (org.settings as any) || {};
  const mergedSettings = { ...currentSettings, ...body };

  const [updated] = await db.update(organizations).set({ settings: mergedSettings, updatedAt: new Date() })
    .where(eq(organizations.id, orgId)).returning();
  return c.json({ data: updated.settings });
});

// ============================================================
// BRANCHES (locations)
// ============================================================

settingsRouter.get("/locations", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(locations).where(eq(locations.orgId, orgId)).orderBy(asc(locations.name));
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
  const [deleted] = await db.delete(locations)
    .where(and(eq(locations.id, c.req.param("id")), eq(locations.orgId, orgId))).returning();
  if (!deleted) return c.json({ error: "الفرع غير موجود" }, 404);
  return c.json({ data: deleted });
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
    const [org] = await tx.insert(organizations).values({
      name: orgName, slug, phone: ownerPhone, city,
      businessType: industry || "general",
      plan: "basic", subscriptionStatus: "trialing",
      trialEndsAt: new Date(Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000),
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
      { name: "طلب جديد", color: "#9E9E9E", sortOrder: 1, isDefault: true },
      { name: "تأكيد أولي", color: "#FF9800", sortOrder: 2 },
      { name: "عربون مدفوع", color: "#2196F3", sortOrder: 3 },
      { name: "تأكيد نهائي", color: "#4CAF50", sortOrder: 4 },
      { name: "قيد التجهيز", color: "#9C27B0", sortOrder: 5 },
      { name: "مكتمل", color: "#4CAF50", sortOrder: 7, isTerminal: true },
      { name: "ملغي", color: "#F44336", sortOrder: 8, isTerminal: true },
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
