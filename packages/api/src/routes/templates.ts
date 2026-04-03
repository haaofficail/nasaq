// ============================================================
// قوالب الخدمات الجاهزة — Templates API
// GET  /templates                        → قائمة كل الأنواع
// GET  /templates/:businessType          → قوالب نوع معين
// POST /templates/:businessType/import   → استيراد قوالب إلى المنشأة
// ============================================================

import { Hono } from "hono";
import { z } from "zod";
import { eq, and, ilike } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { services, categories } from "@nasaq/db/schema";
import { getOrgId, validateBody } from "../lib/helpers";
import {
  SERVICE_TEMPLATES,
  getTemplateByBusinessType,
  getAvailableBusinessTypes,
  type TemplateItem,
} from "../lib/serviceTemplates";

export const templatesRouter = new Hono();

// ─── GET /templates ──────────────────────────────────────────────────────────
templatesRouter.get("/", async (c) => {
  return c.json({ data: getAvailableBusinessTypes() });
});

// ─── GET /templates/:businessType ────────────────────────────────────────────
templatesRouter.get("/:businessType", async (c) => {
  const businessType = c.req.param("businessType");
  const tmpl = getTemplateByBusinessType(businessType);
  if (!tmpl) {
    return c.json({ error: "لا يوجد قالب لهذا النوع" }, 404);
  }

  // تجميع حسب التصنيف
  const grouped: Record<string, TemplateItem[]> = {};
  for (const item of tmpl.items) {
    if (!grouped[item.categoryName]) grouped[item.categoryName] = [];
    grouped[item.categoryName].push(item);
  }

  return c.json({
    data: {
      businessType: tmpl.businessType,
      label: tmpl.label,
      totalItems: tmpl.items.length,
      categories: Object.entries(grouped).map(([cat, items]) => ({
        categoryName: cat,
        items,
      })),
    },
  });
});

// ─── POST /templates/:businessType/import ────────────────────────────────────
const importSchema = z.object({
  categories: z.array(z.string()).optional(), // تصفية بالتصنيفات — فارغ = استيراد الكل
  overwrite: z.boolean().default(false),       // هل تحذف الخدمات الموجودة أولاً؟
  status: z.enum(["draft", "active"]).default("active"),
});

templatesRouter.post("/:businessType/import", async (c) => {
  const orgId = getOrgId(c);
  const businessType = c.req.param("businessType");
  const body = await validateBody(c, importSchema);
  if (!body) return c.json({ error: "بيانات غير صحيحة" }, 400);

  const tmpl = getTemplateByBusinessType(businessType);
  if (!tmpl) {
    return c.json({ error: "لا يوجد قالب لهذا النوع" }, 404);
  }

  // فلترة التصنيفات إذا حُددت
  const selectedCategories = body.categories && body.categories.length > 0
    ? body.categories
    : null;

  const itemsToImport = selectedCategories
    ? tmpl.items.filter(i => selectedCategories.includes(i.categoryName))
    : tmpl.items;

  if (itemsToImport.length === 0) {
    return c.json({ error: "لا خدمات للاستيراد" }, 400);
  }

  // ─── بناء خريطة التصنيفات الفريدة ───────────────────────────────────────
  const uniqueCategories = [...new Set(itemsToImport.map(i => i.categoryName))];
  const categoryMap: Record<string, string> = {}; // categoryName → id

  for (const catName of uniqueCategories) {
    // هل التصنيف موجود أصلاً؟
    const slug = catName
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]/g, "")
      .toLowerCase();

    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.orgId, orgId), ilike(categories.name, catName)))
      .limit(1);

    if (existing.length > 0) {
      categoryMap[catName] = existing[0].id;
    } else {
      const [created] = await db
        .insert(categories)
        .values({ orgId, name: catName, slug: `${slug}-${Date.now()}`, isActive: true })
        .returning({ id: categories.id });
      categoryMap[catName] = created.id;
    }
  }

  // ─── استيراد الخدمات ─────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;

  for (const item of itemsToImport) {
    const baseSlug = item.name
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]/g, "")
      .toLowerCase();
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    // تحقق إذا كانت الخدمة موجودة بنفس الاسم
    if (!body.overwrite) {
      const exists = await db
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.orgId, orgId), ilike(services.name, item.name)))
        .limit(1);

      if (exists.length > 0) {
        skipped++;
        continue;
      }
    }

    await db.insert(services).values({
      orgId,
      categoryId: categoryMap[item.categoryName] ?? null,
      name: item.name,
      nameEn: item.nameEn ?? null,
      description: item.description ?? null,
      slug,
      basePrice: String(item.basePrice),
      durationMinutes: item.durationMinutes ?? null,
      offeringType: item.offeringType as any,
      serviceType: item.serviceType as any,
      status: body.status,
      sortOrder: item.sortOrder,
      isTemplate: false,
      isDemo: false,
    });

    created++;
  }

  return c.json({
    success: true,
    data: {
      created,
      skipped,
      total: itemsToImport.length,
      message: `تم استيراد ${created} خدمة${skipped > 0 ? `، تجاهل ${skipped} موجودة مسبقاً` : ""}`,
    },
  });
});
