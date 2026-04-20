/**
 * /api/v2/pages — Page Builder v2 CRUD routes
 *
 * Auth:  authMiddleware (mounted in index.ts)
 * Gate:  requireCapability("page_builder_v2") (mounted in index.ts)
 *
 * Endpoints:
 *   GET    /pages              — list org pages
 *   POST   /pages              — create draft page
 *   GET    /pages/:id          — get single page
 *   PUT    /pages/:id          — update draft (saves version)
 *   DELETE /pages/:id          — archive (soft delete)
 *   POST   /pages/:id/publish  — publish draft → published
 *   GET    /pages/:id/versions — version history
 */

import { Hono } from "hono";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { pagesV2, pageVersionsV2 } from "@nasaq/db/schema";
import { z } from "zod";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";

// ── Zod schemas ───────────────────────────────────────────────

const createPageSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  slug: z.string().min(1, "الرابط مطلوب").regex(
    /^[a-z0-9-]+$/,
    "الرابط يقبل أحرف إنجليزية صغيرة وأرقام وشرطة فقط"
  ),
  pageType: z.enum(["home", "about", "contact", "services", "blog", "faq", "custom"])
    .optional()
    .default("custom"),
  draftData: z.record(z.unknown()).optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  showInNavigation: z.boolean().optional().default(true),
});

const updatePageSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  pageType: z.enum(["home", "about", "contact", "services", "blog", "faq", "custom"]).optional(),
  draftData: z.record(z.unknown()).optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  showInNavigation: z.boolean().optional(),
  // SEO Day 18
  canonicalUrl: z.string().optional().nullable(),
  schemaType: z.enum(["Article", "Product", "Service", "Organization"]).optional().nullable(),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
}).strict();
// .strict() rejects unknown fields including orgId injection

// ── MAX_VERSIONS per page (enforced on write) ─────────────────
const MAX_VERSIONS = 50;

// ── Router ────────────────────────────────────────────────────
export const pagesV2Router = new Hono();

// ────────────────────────────────────────────────────────────
// POST /slug-check — check if slug is available in this org
// Must be registered BEFORE /:id routes (no param conflict)
// ────────────────────────────────────────────────────────────
pagesV2Router.post("/slug-check", async (c) => {
  const orgId = getOrgId(c);
  const raw = await c.req.json().catch(() => null);
  if (!raw || typeof raw.slug !== "string") {
    return c.json({ error: "slug مطلوب" }, 400);
  }

  const { slug, excludeId } = raw as { slug: string; excludeId?: string };

  // Validate slug format first
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return c.json({ available: false, suggestion: slug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") });
  }

  // Check uniqueness within org, optionally excluding current page's own id
  const existing = await db
    .select({ id: pagesV2.id })
    .from(pagesV2)
    .where(
      excludeId
        ? and(eq(pagesV2.orgId, orgId), eq(pagesV2.slug, slug))
        : and(eq(pagesV2.orgId, orgId), eq(pagesV2.slug, slug)),
    )
    .limit(1);

  // If a result exists and it's NOT the excluded page, slug is taken
  const taken = existing.length > 0 && existing[0].id !== excludeId;

  if (!taken) {
    return c.json({ available: true });
  }

  // Suggest an alternative: slug-2, slug-3, ...
  let n = 2;
  let suggestion = `${slug}-${n}`;
  while (true) {
    const check = await db
      .select({ id: pagesV2.id })
      .from(pagesV2)
      .where(and(eq(pagesV2.orgId, orgId), eq(pagesV2.slug, suggestion)))
      .limit(1);
    if (check.length === 0) break;
    n++;
    suggestion = `${slug}-${n}`;
    if (n > 99) break; // safety
  }

  return c.json({ available: false, suggestion });
});

// ────────────────────────────────────────────────────────────
// GET /pages — list
// ────────────────────────────────────────────────────────────
pagesV2Router.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status"); // optional filter

  const where = status
    ? and(eq(pagesV2.orgId, orgId), eq(pagesV2.status, status))
    : eq(pagesV2.orgId, orgId);

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: pagesV2.id,
        slug: pagesV2.slug,
        title: pagesV2.title,
        pageType: pagesV2.pageType,
        status: pagesV2.status,
        sortOrder: pagesV2.sortOrder,
        showInNavigation: pagesV2.showInNavigation,
        publishedAt: pagesV2.publishedAt,
        updatedAt: pagesV2.updatedAt,
      })
      .from(pagesV2)
      .where(where)
      .orderBy(pagesV2.sortOrder, desc(pagesV2.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(pagesV2)
      .where(where),
  ]);

  const total = Number((countResult as Array<{ total: unknown }>)[0]?.total ?? 0);

  return c.json({
    data: rows,
    meta: { page, limit, total },
  });
});

// ────────────────────────────────────────────────────────────
// POST /pages — create draft
// ────────────────────────────────────────────────────────────
pagesV2Router.post("/", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);

  const raw = await c.req.json().catch(() => null);
  if (!raw) return c.json({ error: "Request body مطلوب" }, 400);

  const parsed = createPageSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "بيانات غير صالحة", details: parsed.error.flatten() }, 400);
  }

  const { title, slug, pageType, draftData, metaTitle, metaDescription, ogImage, sortOrder, showInNavigation } = parsed.data;

  // Check slug uniqueness within org
  const existing = await db
    .select({ id: pagesV2.id })
    .from(pagesV2)
    .where(and(eq(pagesV2.orgId, orgId), eq(pagesV2.slug, slug)))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: `الرابط "${slug}" مستخدم بالفعل في هذه المنشأة` }, 409);
  }

  const insertedRows = await db
    .insert(pagesV2)
    .values({
      orgId,
      slug,
      title,
      pageType,
      status: "draft",
      draftData: draftData ?? null,
      metaTitle: metaTitle ?? null,
      metaDescription: metaDescription ?? null,
      ogImage: ogImage ?? null,
      sortOrder,
      showInNavigation,
      createdBy: userId ?? undefined,
    })
    .returning() as Array<typeof pagesV2.$inferSelect>;

  const newPage = insertedRows[0];
  if (!newPage) return c.json({ error: "فشل إنشاء الصفحة" }, 500);

  // Create initial version
  await db.insert(pageVersionsV2).values({
    pageId: newPage.id,
    orgId,
    versionNumber: 1,
    data: (draftData ?? {}) as Record<string, unknown>,
    changeType: "manual_save",
    createdBy: userId ?? undefined,
  });

  return c.json({ data: newPage }, 201);
});

// ────────────────────────────────────────────────────────────
// GET /pages/:id — single page
// ────────────────────────────────────────────────────────────
pagesV2Router.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const [page] = await db
    .select()
    .from(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .limit(1);

  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);
  return c.json({ data: page });
});

// ────────────────────────────────────────────────────────────
// PUT /pages/:id — update draft + save version
// ────────────────────────────────────────────────────────────
pagesV2Router.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();

  const raw = await c.req.json().catch(() => null);
  if (!raw) return c.json({ error: "Request body مطلوب" }, 400);

  const parsed = updatePageSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "بيانات غير صالحة", details: parsed.error.flatten() }, 400);
  }

  // Verify ownership
  const [existing] = await db
    .select({ id: pagesV2.id, orgId: pagesV2.orgId })
    .from(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الصفحة غير موجودة" }, 404);

  const { draftData, ...rest } = parsed.data;

  const [updated] = await db
    .update(pagesV2)
    .set({
      ...rest,
      ...(draftData !== undefined ? { draftData } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .returning();

  // Save version if draftData changed
  if (draftData !== undefined) {
    const [{ maxVer }] = await db
      .select({ maxVer: count() })
      .from(pageVersionsV2)
      .where(eq(pageVersionsV2.pageId, id));

    const nextVersion = Number(maxVer) + 1;

    // Prune oldest if at limit
    if (Number(maxVer) >= MAX_VERSIONS) {
      const oldest = await db
        .select({ id: pageVersionsV2.id })
        .from(pageVersionsV2)
        .where(eq(pageVersionsV2.pageId, id))
        .orderBy(pageVersionsV2.versionNumber)
        .limit(1);
      if (oldest.length > 0) {
        await db.delete(pageVersionsV2).where(eq(pageVersionsV2.id, oldest[0].id));
      }
    }

    await db.insert(pageVersionsV2).values({
      pageId: id,
      orgId,
      versionNumber: nextVersion,
      data: (draftData ?? {}) as Record<string, unknown>,
      changeType: "auto_save",
      createdBy: userId ?? undefined,
    });
  }

  return c.json({ data: updated });
});

// ────────────────────────────────────────────────────────────
// DELETE /pages/:id — archive (soft delete)
// ────────────────────────────────────────────────────────────
pagesV2Router.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const [existing] = await db
    .select({ id: pagesV2.id })
    .from(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الصفحة غير موجودة" }, 404);

  await db
    .update(pagesV2)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)));

  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// POST /pages/:id/publish — publish draft
// ────────────────────────────────────────────────────────────
pagesV2Router.post("/:id/publish", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();

  const [page] = await db
    .select({ id: pagesV2.id, draftData: pagesV2.draftData })
    .from(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .limit(1);

  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);

  const now = new Date();

  const [published] = await db
    .update(pagesV2)
    .set({
      status: "published",
      publishedData: page.draftData,
      publishedAt: now,
      publishedBy: userId ?? undefined,
      updatedAt: now,
    })
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .returning();

  // Snapshot version labeled as "publish"
  const [{ maxVer }] = await db
    .select({ maxVer: count() })
    .from(pageVersionsV2)
    .where(eq(pageVersionsV2.pageId, id));

  await db.insert(pageVersionsV2).values({
    pageId: id,
    orgId,
    versionNumber: Number(maxVer) + 1,
    data: (page.draftData ?? {}) as Record<string, unknown>,
    changeType: "publish",
    label: `نشر ${now.toLocaleDateString("ar-SA")}`,
    createdBy: userId ?? undefined,
  });

  return c.json({ data: published });
});

// ────────────────────────────────────────────────────────────
// POST /pages/:id/duplicate — clone page
// ────────────────────────────────────────────────────────────
pagesV2Router.post("/:id/duplicate", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();

  const [page] = await db
    .select()
    .from(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .limit(1);

  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);

  // Build a unique slug: <base>-copy, <base>-copy-2, ...
  const baseSlug = `${page.slug}-copy`;
  const existingSlugs = (
    await db
      .select({ slug: pagesV2.slug })
      .from(pagesV2)
      .where(and(eq(pagesV2.orgId, orgId)))
  ).map((r) => r.slug);

  let newSlug = baseSlug;
  let n = 2;
  while (existingSlugs.includes(newSlug)) {
    newSlug = `${baseSlug}-${n}`;
    n++;
  }

  const newTitle = `${page.title} (نسخة)`;

  const inserted = await db
    .insert(pagesV2)
    .values({
      orgId,
      slug: newSlug,
      title: newTitle,
      pageType: page.pageType,
      status: "draft",
      draftData: page.draftData,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      ogImage: page.ogImage,
      sortOrder: page.sortOrder + 1,
      showInNavigation: false,
      createdBy: userId ?? undefined,
    })
    .returning() as Array<typeof pagesV2.$inferSelect>;

  const dup = inserted[0];
  if (!dup) return c.json({ error: "فشل تكرار الصفحة" }, 500);

  return c.json({ data: dup }, 201);
});

// ────────────────────────────────────────────────────────────
// POST /pages/:id/restore — restore archived page to draft
// ────────────────────────────────────────────────────────────
pagesV2Router.post("/:id/restore", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const [page] = await db
    .select({ id: pagesV2.id, status: pagesV2.status })
    .from(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .limit(1);

  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);
  if (page.status !== "archived") return c.json({ error: "الصفحة ليست مؤرشفة" }, 400);

  const [restored] = await db
    .update(pagesV2)
    .set({ status: "draft", updatedAt: new Date() })
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .returning();

  return c.json({ data: restored });
});

// ────────────────────────────────────────────────────────────
// DELETE /pages/:id/permanent — permanent delete
// ────────────────────────────────────────────────────────────
pagesV2Router.delete("/:id/permanent", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const [page] = await db
    .select({ id: pagesV2.id, status: pagesV2.status })
    .from(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .limit(1);

  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);

  // Delete versions first (FK)
  await db.delete(pageVersionsV2).where(eq(pageVersionsV2.pageId, id));
  await db
    .delete(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)));

  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// PATCH /reorder — update sortOrder for multiple pages
// ────────────────────────────────────────────────────────────
pagesV2Router.patch("/reorder", async (c) => {
  const orgId = getOrgId(c);
  const raw = await c.req.json().catch(() => null);
  if (!raw || !Array.isArray(raw.ids)) {
    return c.json({ error: "ids array مطلوب" }, 400);
  }

  const ids: string[] = raw.ids;

  // Update each page's sortOrder to its position in the ids array
  await Promise.all(
    ids.map((id, index) =>
      db
        .update(pagesV2)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId))),
    ),
  );

  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// GET /pages/:id/versions — version history
// ────────────────────────────────────────────────────────────
pagesV2Router.get("/:id/versions", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  // Verify page belongs to org
  const [page] = await db
    .select({ id: pagesV2.id })
    .from(pagesV2)
    .where(and(eq(pagesV2.id, id), eq(pagesV2.orgId, orgId)))
    .limit(1);

  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);

  const versions = await db
    .select({
      id: pageVersionsV2.id,
      versionNumber: pageVersionsV2.versionNumber,
      label: pageVersionsV2.label,
      changeType: pageVersionsV2.changeType,
      createdBy: pageVersionsV2.createdBy,
      createdAt: pageVersionsV2.createdAt,
    })
    .from(pageVersionsV2)
    .where(and(eq(pageVersionsV2.pageId, id), eq(pageVersionsV2.orgId, orgId)))
    .orderBy(desc(pageVersionsV2.versionNumber))
    .limit(50);

  return c.json({ data: versions });
});
