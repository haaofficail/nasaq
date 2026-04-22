// ============================================================
// قوالب صفحات Page Builder v2 — Page Templates API
//
// GET  /api/v2/page-templates          — قائمة القوالب (عام، بدون auth)
// GET  /api/v2/page-templates/:slug    — قالب واحد (عام)
// POST /api/v2/page-templates/:slug/use — إنشاء صفحة من قالب (يحتاج auth)
// ============================================================

import { Hono } from "hono";
import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { pageTemplates, pagesV2, pageVersionsV2 } from "@nasaq/db/schema";
import { z } from "zod";
import { getOrgId, getUserId, validateBody } from "../lib/helpers";

export const pageTemplatesRouter = new Hono();

// ─── GET /page-templates ──────────────────────────────────────────────────────
// عام — لا يحتاج auth
pageTemplatesRouter.get("/", async (c) => {
  const category = c.req.query("category");
  const featured = c.req.query("featured");

  const conditions = [eq(pageTemplates.isPublished, true)];

  if (category) {
    conditions.push(eq(pageTemplates.category, category));
  }
  if (featured === "true") {
    conditions.push(eq(pageTemplates.isFeatured, true));
  }

  const rows = await db
    .select({
      id: pageTemplates.id,
      slug: pageTemplates.slug,
      nameAr: pageTemplates.nameAr,
      descriptionAr: pageTemplates.descriptionAr,
      category: pageTemplates.category,
      businessTypes: pageTemplates.businessTypes,
      previewImageUrl: pageTemplates.previewImageUrl,
      tags: pageTemplates.tags,
      isFeatured: pageTemplates.isFeatured,
      usageCount: pageTemplates.usageCount,
      sortOrder: pageTemplates.sortOrder,
    })
    .from(pageTemplates)
    .where(and(...conditions))
    .orderBy(asc(pageTemplates.sortOrder), asc(pageTemplates.createdAt));

  // تجميع حسب الفئة
  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  return c.json({
    data: rows,
    grouped,
    total: rows.length,
  });
});

// ─── GET /page-templates/:slug ────────────────────────────────────────────────
// عام — يُرجع data كاملة مع Puck content
pageTemplatesRouter.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const [template] = await db
    .select()
    .from(pageTemplates)
    .where(and(eq(pageTemplates.slug, slug), eq(pageTemplates.isPublished, true)))
    .limit(1);

  if (!template) {
    return c.json({ error: "القالب غير موجود" }, 404);
  }

  return c.json({ data: template });
});

// ─── POST /page-templates/:slug/use ──────────────────────────────────────────
// يحتاج auth — ينشئ صفحة جديدة من القالب لمنشأة المستخدم
const useTemplateSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  slug: z
    .string()
    .min(1, "الرابط مطلوب")
    .regex(/^[a-z0-9-]+$/, "الرابط يقبل أحرف إنجليزية صغيرة وأرقام وشرطة فقط"),
  pageType: z
    .enum(["home", "about", "contact", "services", "blog", "faq", "custom"])
    .optional()
    .default("custom"),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  showInNavigation: z.boolean().optional().default(true),
});

pageTemplatesRouter.post("/:slug/use", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const templateSlug = c.req.param("slug");

  const body = await validateBody(c, useTemplateSchema);
  if (!body) return c.json({ error: "بيانات غير صحيحة" }, 400);

  // جلب القالب
  const [template] = await db
    .select()
    .from(pageTemplates)
    .where(and(eq(pageTemplates.slug, templateSlug), eq(pageTemplates.isPublished, true)))
    .limit(1);

  if (!template) {
    return c.json({ error: "القالب غير موجود" }, 404);
  }

  // تحقق من uniqueness الـ slug داخل المنشأة
  const [existing] = await db
    .select({ id: pagesV2.id })
    .from(pagesV2)
    .where(and(eq(pagesV2.orgId, orgId), eq(pagesV2.slug, body.slug)))
    .limit(1);

  if (existing) {
    return c.json({ error: "الرابط مستخدم مسبقاً — اختر رابطاً آخر" }, 409);
  }

  // إنشاء الصفحة بمحتوى القالب
  const [newPage] = await db
    .insert(pagesV2)
    .values({
      orgId,
      slug: body.slug,
      title: body.title,
      pageType: body.pageType,
      status: "draft",
      draftData: template.data as Record<string, unknown>,
      publishedData: null,
      metaTitle: body.metaTitle ?? null,
      metaDescription: body.metaDescription ?? null,
      sortOrder: 0,
      showInNavigation: body.showInNavigation,
      createdBy: userId ?? undefined,
    })
    .returning();

  // إنشاء version أولى
  await db.insert(pageVersionsV2).values({
    pageId: newPage.id,
    orgId,
    versionNumber: 1,
    label: `من قالب: ${template.nameAr}`,
    data: template.data as Record<string, unknown>,
    changeType: "manual_save",
    createdBy: userId ?? undefined,
  });

  // زيادة usage_count للقالب
  await db
    .update(pageTemplates)
    .set({
      usageCount: sql`${pageTemplates.usageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(pageTemplates.id, template.id));

  return c.json(
    {
      success: true,
      data: {
        pageId: newPage.id,
        slug: newPage.slug,
        title: newPage.title,
        message: `تم إنشاء الصفحة من قالب "${template.nameAr}" بنجاح`,
      },
    },
    201
  );
});
