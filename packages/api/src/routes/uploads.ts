import { Hono } from "hono";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { serviceMedia, services } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { nanoid } from "nanoid";
import { assetUrl, thumbUrl, uploadUrl, isAllowedPublicUrl } from "../lib/storage";

// Helper: verify that a media item belongs to the caller's org
async function verifyMediaOwnership(mediaId: string, orgId: string): Promise<boolean> {
  const [result] = await db
    .select({ orgId: services.orgId })
    .from(serviceMedia)
    .innerJoin(services, eq(serviceMedia.serviceId, services.id))
    .where(eq(serviceMedia.id, mediaId));
  return result?.orgId === orgId;
}

export const uploadsRouter = new Hono();

// ============================================================
// Storage config — القيم تأتي من storage.ts (CDN_URL → R2_PUBLIC_URL → fallback)
// ============================================================

const R2_BUCKET = process.env.R2_BUCKET_NAME || "nasaq-files";

/**
 * POST /uploads/presigned — Get presigned URL for direct upload
 * العميل يرفع مباشرة لـ R2 بدون المرور بالسيرفر
 */
uploadsRouter.post("/presigned", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { filename, contentType, purpose } = body;

  if (!filename || !contentType) {
    return c.json({ error: "filename و contentType مطلوبان" }, 400);
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"];
  if (!allowedTypes.includes(contentType)) {
    return c.json({ error: "نوع الملف غير مدعوم" }, 400);
  }

  // Validate size hint
  const maxSize = contentType.startsWith("video") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;

  // Generate unique key
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const key = `${orgId}/${purpose || "media"}/${nanoid(12)}.${ext}`;

  // In production: generate actual presigned URL from R2
  // For now: return the expected URL structure (via storage helpers)
  const presignedUploadUrl = uploadUrl(key);
  const publicUrl = assetUrl(key);
  const thumbnailUrl = thumbUrl(key);

  // In production with Cloudflare R2:
  // const command = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType });
  // const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return c.json({
    data: {
      uploadUrl: presignedUploadUrl, // العميل يرفع لهذا الرابط (PUT)
      publicUrl,           // الرابط النهائي بعد الرفع
      thumbnailUrl,        // رابط الصورة المصغرة (يُنشأ تلقائياً بـ Cloudflare Image Resizing)
      key,                 // مفتاح الملف في R2
      expiresIn: 3600,     // صلاحية الرابط (ثانية)
      maxSize,             // الحد الأقصى للحجم
    },
  });
});

/**
 * POST /uploads/confirm — Confirm upload and save metadata
 * بعد ما العميل يرفع الملف، يؤكد هنا ونحفظ البيانات
 */
uploadsRouter.post("/confirm", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { serviceId, key, publicUrl, thumbnailUrl, altText, width, height, sizeBytes, type } = body;

  if (!serviceId || !publicUrl) {
    return c.json({ error: "serviceId و publicUrl مطلوبان" }, 400);
  }

  // Validate publicUrl belongs to our storage domain (prevent storing arbitrary/malicious URLs)
  if (!isAllowedPublicUrl(publicUrl)) {
    return c.json({ error: "رابط الملف غير صالح" }, 400);
  }

  // Verify the service belongs to the authenticated org
  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة أو غير مصرح" }, 404);

  // Get current max sort order
  const existing = await db.select({ sortOrder: serviceMedia.sortOrder })
    .from(serviceMedia)
    .where(eq(serviceMedia.serviceId, serviceId))
    .orderBy(serviceMedia.sortOrder);

  const nextOrder = existing.length > 0 ? Math.max(...existing.map(e => e.sortOrder)) + 1 : 0;

  const [media] = await db.insert(serviceMedia).values({
    serviceId,
    type: type || "image",
    url: publicUrl,
    thumbnailUrl: thumbnailUrl || null,
    altText: altText || null,
    width: width || null,
    height: height || null,
    sizeBytes: sizeBytes || null,
    sortOrder: nextOrder,
    isCover: existing.length === 0, // أول صورة = غلاف تلقائياً
  }).returning();

  return c.json({ data: media }, 201);
});

/**
 * PUT /uploads/reorder — Reorder media for a service
 * Drag & drop ترتيب الصور
 */
uploadsRouter.put("/reorder", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { items } = body as { items: { id: string; sortOrder: number }[] };

  if (!items?.length) return c.json({ success: true });

  // Verify ownership: all items must belong to a service owned by this org
  const mediaIds = items.map((i) => i.id);
  const owned = await db
    .select({ id: serviceMedia.id })
    .from(serviceMedia)
    .innerJoin(services, eq(serviceMedia.serviceId, services.id))
    .where(and(inArray(serviceMedia.id, mediaIds), eq(services.orgId, orgId)));

  if (owned.length !== items.length) {
    return c.json({ error: "غير مصرح — بعض الملفات لا تنتمي لمنظمتك" }, 403);
  }

  for (const item of items) {
    await db.update(serviceMedia)
      .set({ sortOrder: item.sortOrder })
      .where(eq(serviceMedia.id, item.id));
  }

  return c.json({ success: true });
});

/**
 * PUT /uploads/:id/cover — Set as cover image
 */
uploadsRouter.put("/:id/cover", async (c) => {
  const orgId = getOrgId(c);
  const mediaId = c.req.param("id");

  // Get the media to find serviceId (with ownership check)
  const [media] = await db
    .select({ id: serviceMedia.id, serviceId: serviceMedia.serviceId, serviceOrgId: services.orgId })
    .from(serviceMedia)
    .innerJoin(services, eq(serviceMedia.serviceId, services.id))
    .where(eq(serviceMedia.id, mediaId));

  if (!media) return c.json({ error: "الصورة غير موجودة" }, 404);
  if (media.serviceOrgId !== orgId) return c.json({ error: "غير مصرح" }, 403);

  // Remove cover from all others
  await db.update(serviceMedia)
    .set({ isCover: false })
    .where(eq(serviceMedia.serviceId, media.serviceId));

  // Set this as cover
  await db.update(serviceMedia)
    .set({ isCover: true })
    .where(eq(serviceMedia.id, mediaId));

  return c.json({ success: true });
});

/**
 * DELETE /uploads/:id — Delete media
 */
uploadsRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const mediaId = c.req.param("id");

  // Verify ownership before deletion
  const isOwned = await verifyMediaOwnership(mediaId, orgId);
  if (!isOwned) return c.json({ error: "الصورة غير موجودة أو غير مصرح" }, 404);

  const [softDeleted] = await db.update(serviceMedia)
    .set({ isActive: false })
    .where(eq(serviceMedia.id, mediaId))
    .returning();

  if (!softDeleted) return c.json({ error: "الصورة غير موجودة" }, 404);

  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "service_media", resourceId: mediaId });

  return c.json({ data: softDeleted });
});
