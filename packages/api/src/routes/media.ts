import { Hono } from "hono";
import { eq, and, desc, asc, ilike, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@nasaq/db/client";
import { mediaAssets, mediaGalleries } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { ASSET_BASE_URL } from "../lib/storage";

const UPLOAD_DIR     = process.env.UPLOAD_DIR     || "/var/www/nasaq/static/uploads";
const STATIC_BASE_URL = process.env.STATIC_BASE_URL || "https://tarmizos.com/static/uploads";

// ── Lazy R2 client — only created when env vars are present ─────────────────

let _s3: any = null;

async function getR2Client() {
  if (_s3) return _s3;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKey || !secretKey) return null;

  const { S3Client } = await import("@aws-sdk/client-s3");
  _s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
  return _s3;
}

const R2_BUCKET    = process.env.R2_BUCKET_NAME || "nasaq-files";
// R2_PUBLIC_URL مُوحَّد عبر storage.ts (يدعم CDN_URL تلقائياً)
const R2_PUBLIC_URL = ASSET_BASE_URL;

// ── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg":      "image",
  "image/png":       "image",
  "image/webp":      "image",
  "image/gif":       "image",
  "image/svg+xml":   "image",
  "video/mp4":       "video",
  "video/webm":      "video",
  "video/quicktime": "video",
  "application/pdf": "document",
  "application/msword":                                                  "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel":                                            "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":  "document",
};

// ── Image dimension reader (no external deps) ────────────────────────────────

function getImageDimensions(buf: Buffer, mime: string): { width: number; height: number } | null {
  try {
    if (mime === "image/png") {
      if (buf.length < 24) return null;
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (mime === "image/gif") {
      if (buf.length < 10) return null;
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    if (mime === "image/jpeg") {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xFF) break;
        const m = buf[i + 1];
        if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) ||
            (m >= 0xC9 && m <= 0xCB) || (m >= 0xCD && m <= 0xCF)) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
      return null;
    }
    if (mime === "image/webp") {
      if (buf.length < 30) return null;
      if (buf.slice(0, 4).toString("ascii") !== "RIFF") return null;
      if (buf.slice(8, 12).toString("ascii") !== "WEBP") return null;
      const t = buf.slice(12, 16).toString("ascii").trim();
      if (t === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3FFF, height: buf.readUInt16LE(28) & 0x3FFF };
      if (t === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3FFF) + 1, height: ((b >> 14) & 0x3FFF) + 1 };
      }
      return null;
    }
    return null;
  } catch { return null; }
}

// ── Disk file cleanup helper ──────────────────────────────────────────────────

async function deleteDiskFile(r2Key: string): Promise<void> {
  try {
    // r2Key = "orgId/category/filename" — file lives at UPLOAD_DIR/orgId/filename
    const parts = r2Key.split("/");
    if (parts.length < 3) return;
    const diskPath = join(UPLOAD_DIR, parts[0], parts[parts.length - 1]);
    await unlink(diskPath);
  } catch { /* non-critical */ }
}

function mimeToAssetType(mime: string): "image" | "video" | "document" | "logo" {
  return (ALLOWED_TYPES[mime] as any) || "document";
}

function maxSizeForMime(mime: string): number {
  if (mime.startsWith("video/"))    return 200 * 1024 * 1024;  // 200 MB
  if (mime === "application/pdf")   return 25  * 1024 * 1024;  // 25 MB
  return 15 * 1024 * 1024;                                      // 15 MB images/docs
}

// ── Validation schemas ───────────────────────────────────────────────────────

const presignedSchema = z.object({
  filename:    z.string().min(1),
  contentType: z.string().min(1),
  fileType:    z.enum(["image", "video", "document", "logo"]).optional(),
  category:    z.string().optional(),
});

const confirmSchema = z.object({
  r2Key:      z.string().min(1),
  publicUrl:  z.string().url(),
  name:       z.string().min(1),
  mimeType:   z.string().optional(),
  sizeBytes:  z.number().int().positive().optional(),
  width:      z.number().int().positive().optional(),
  height:     z.number().int().positive().optional(),
  fileType:   z.enum(["image", "video", "document", "logo"]).optional(),
  tags:       z.array(z.string()).optional(),
  category:   z.string().optional(),
  altText:    z.string().optional(),
  relatedServiceId: z.string().uuid().optional(),
});

const updateSchema = z.object({
  name:             z.string().min(1).optional(),
  tags:             z.array(z.string()).optional(),
  category:         z.string().optional(),
  altText:          z.string().optional(),
  fileType:         z.enum(["image", "video", "document", "logo"]).optional(),
  relatedServiceId: z.string().uuid().nullable().optional(),
});

// ── Router ───────────────────────────────────────────────────────────────────

export const mediaRouter = new Hono();

// ============================================================
// GET /media
// List assets with filtering, search, pagination
// ============================================================

mediaRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset, page } = getPagination(c);

  const q        = c.req.query("q")        || "";
  const type     = c.req.query("type")     || "";
  const category = c.req.query("category") || "";
  const tag      = c.req.query("tag")      || "";
  const serviceId = c.req.query("serviceId") || "";
  const sortBy  = c.req.query("sortBy")  || "createdAt";
  const sortDir = c.req.query("sortDir") || "desc";

  const conditions: any[] = [
    eq(mediaAssets.orgId, orgId),
    eq(mediaAssets.isActive, true),
  ];

  if (q)         conditions.push(ilike(mediaAssets.name, `%${q}%`));
  if (category)  conditions.push(eq(mediaAssets.category, category));
  if (serviceId) conditions.push(eq(mediaAssets.relatedServiceId, serviceId));
  if (type && ["image", "video", "document", "logo"].includes(type)) {
    conditions.push(eq(mediaAssets.fileType, type as any));
  }
  if (tag) {
    conditions.push(sql`${mediaAssets.tags} @> ARRAY[${tag}]::text[]`);
  }

  const where = and(...conditions);

  const SORT_COLS: Record<string, any> = {
    createdAt: mediaAssets.createdAt,
    name:      mediaAssets.name,
    sizeBytes: mediaAssets.sizeBytes,
  };
  const sortCol = SORT_COLS[sortBy] ?? mediaAssets.createdAt;
  const orderFn = sortDir === "asc" ? asc : desc;

  const [rows, countRow] = await Promise.all([
    db.select().from(mediaAssets)
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`COUNT(*)` })
      .from(mediaAssets)
      .where(where),
  ]);

  const total = Number(countRow[0]?.count ?? 0);

  return c.json({
    data:  rows,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
});

// ============================================================
// GET /media/categories
// Distinct categories used by this org (for filter dropdown)
// ============================================================

mediaRouter.get("/categories", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .selectDistinct({ category: mediaAssets.category })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.orgId, orgId), eq(mediaAssets.isActive, true)));
  const categories = rows.map(r => r.category).filter(Boolean);
  return c.json({ data: categories });
});

// ============================================================
// GET /media/tags
// All distinct tags used by this org
// ============================================================

mediaRouter.get("/tags", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select({ tags: mediaAssets.tags })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.orgId, orgId), eq(mediaAssets.isActive, true)));
  const tagSet = new Set<string>();
  for (const row of rows) {
    (row.tags || []).forEach((t: string) => tagSet.add(t));
  }
  return c.json({ data: Array.from(tagSet).sort() });
});

// ============================================================
// POST /media/presigned
// Get a presigned PUT URL for direct-to-R2 upload
// ============================================================

mediaRouter.post("/presigned", async (c) => {
  const orgId = getOrgId(c);
  const body  = presignedSchema.parse(await c.req.json());

  const { filename, contentType, category } = body;

  if (!ALLOWED_TYPES[contentType]) {
    return c.json({ error: "نوع الملف غير مدعوم" }, 400);
  }

  const ext  = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key  = `${orgId}/${category || "media"}/${nanoid(14)}.${ext}`;
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  const s3 = await getR2Client();

  if (!s3) {
    // Dev mode — no R2 configured. Return mock data so frontend can skip PUT and
    // call confirm directly with a placeholder URL.
    return c.json({
      data: {
        uploadUrl:  null,
        publicUrl,
        key,
        maxSize:    maxSizeForMime(contentType),
        expiresIn:  3600,
        devMode:    true,
      },
    });
  }

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl }     = await import("@aws-sdk/s3-request-presigner");

  const command = new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return c.json({
    data: {
      uploadUrl,
      publicUrl,
      key,
      maxSize:   maxSizeForMime(contentType),
      expiresIn: 3600,
      devMode:   false,
    },
  });
});

// ============================================================
// POST /media/confirm
// After successful R2 upload, save metadata to DB
// ============================================================

mediaRouter.post("/confirm", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = confirmSchema.parse(await c.req.json());

  const fileType = body.fileType ?? mimeToAssetType(body.mimeType || "");

  const [asset] = await db.insert(mediaAssets).values({
    orgId,
    createdBy:        userId || undefined,
    name:             body.name,
    fileUrl:          body.publicUrl,
    r2Key:            body.r2Key,
    fileType,
    mimeType:         body.mimeType,
    sizeBytes:        body.sizeBytes,
    width:            body.width,
    height:           body.height,
    tags:             body.tags             ?? [],
    category:         body.category,
    altText:          body.altText,
    relatedServiceId: body.relatedServiceId,
  }).returning();

  return c.json({ data: asset }, 201);
});

// ============================================================
// GET /media/stats
// Storage summary for the org
// ============================================================

mediaRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db
    .select({
      totalCount: sql<number>`COUNT(*)`,
      totalSize:  sql<number>`COALESCE(SUM(size_bytes), 0)`,
      imageCount: sql<number>`COUNT(*) FILTER (WHERE file_type = 'image')`,
      videoCount: sql<number>`COUNT(*) FILTER (WHERE file_type = 'video')`,
      docCount:   sql<number>`COUNT(*) FILTER (WHERE file_type = 'document')`,
      logoCount:  sql<number>`COUNT(*) FILTER (WHERE file_type = 'logo')`,
    })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.orgId, orgId), eq(mediaAssets.isActive, true)));
  return c.json({ data: row });
});

// ============================================================
// GET /media/:id
// Single asset with version history
// ============================================================

mediaRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  const [asset] = await db.select().from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.orgId, orgId)));

  if (!asset) return c.json({ error: "الملف غير موجود" }, 404);

  // Fetch version history (siblings and self)
  const rootId = asset.parentId ?? asset.id;
  const versions = await db.select({
    id:        mediaAssets.id,
    version:   mediaAssets.version,
    fileUrl:   mediaAssets.fileUrl,
    name:      mediaAssets.name,
    sizeBytes: mediaAssets.sizeBytes,
    createdAt: mediaAssets.createdAt,
  }).from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.orgId, orgId),
        sql`(${mediaAssets.id} = ${rootId} OR ${mediaAssets.parentId} = ${rootId})`,
      ),
    )
    .orderBy(desc(mediaAssets.version));

  return c.json({ data: { ...asset, versions } });
});

// ============================================================
// PATCH /media/:id
// Update metadata — tags, category, alt text, name, fileType
// ============================================================

mediaRouter.patch("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const body  = updateSchema.parse(await c.req.json());

  const [existing] = await db.select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.orgId, orgId)));

  if (!existing) return c.json({ error: "الملف غير موجود" }, 404);

  const patch: any = { updatedAt: new Date() };
  if (body.name             !== undefined) patch.name             = body.name;
  if (body.tags             !== undefined) patch.tags             = body.tags;
  if (body.category         !== undefined) patch.category         = body.category;
  if (body.altText          !== undefined) patch.altText          = body.altText;
  if (body.fileType         !== undefined) patch.fileType         = body.fileType;
  if (body.relatedServiceId !== undefined) patch.relatedServiceId = body.relatedServiceId;

  const [updated] = await db.update(mediaAssets)
    .set(patch)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// ============================================================
// POST /media/:id/replace
// Create a new version of an asset.
// Returns a presigned URL for the replacement file.
// ============================================================

mediaRouter.post("/:id/replace", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const body  = presignedSchema.parse(await c.req.json());

  const [existing] = await db.select().from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.orgId, orgId)));

  if (!existing) return c.json({ error: "الملف غير موجود" }, 404);

  const { filename, contentType } = body;
  if (!ALLOWED_TYPES[contentType]) return c.json({ error: "نوع الملف غير مدعوم" }, 400);

  const ext       = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key       = `${orgId}/media/v${existing.version + 1}_${nanoid(10)}.${ext}`;
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  // Figure out the root parentId
  const rootId = existing.parentId ?? existing.id;

  const s3 = await getR2Client();

  let uploadUrl: string | null = null;
  let devMode = false;

  if (s3) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl }     = await import("@aws-sdk/s3-request-presigner");
    const command = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType });
    uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  } else {
    devMode = true;
  }

  return c.json({
    data: {
      uploadUrl,
      publicUrl,
      key,
      parentId:   rootId,
      newVersion: existing.version + 1,
      maxSize:    maxSizeForMime(contentType),
      expiresIn:  3600,
      devMode,
    },
  });
});

// ============================================================
// POST /media/:id/confirm-replace
// After uploading the replacement file, create new version record
// ============================================================

mediaRouter.post("/:id/confirm-replace", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  const body = confirmSchema.extend({
    parentId:   z.string().uuid(),
    newVersion: z.number().int().min(2),
  }).parse(await c.req.json());

  const [existing] = await db.select({ id: mediaAssets.id, orgId: mediaAssets.orgId })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.orgId, orgId)));

  if (!existing) return c.json({ error: "الملف غير موجود" }, 404);

  const [newAsset] = await db.insert(mediaAssets).values({
    orgId,
    createdBy:        userId || undefined,
    name:             body.name,
    fileUrl:          body.publicUrl,
    r2Key:            body.r2Key,
    fileType:         body.fileType ?? mimeToAssetType(body.mimeType || ""),
    mimeType:         body.mimeType,
    sizeBytes:        body.sizeBytes,
    width:            body.width,
    height:           body.height,
    tags:             body.tags     ?? [],
    category:         body.category,
    altText:          body.altText,
    relatedServiceId: body.relatedServiceId,
    version:          body.newVersion,
    parentId:         body.parentId,
  }).returning();

  return c.json({ data: newAsset }, 201);
});

// ============================================================
// DELETE /media/:id
// Soft-delete the asset; also delete from R2 when available
// ============================================================

mediaRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  const [asset] = await db.select().from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.orgId, orgId)));

  if (!asset) return c.json({ error: "الملف غير موجود" }, 404);

  // Soft delete
  await db.update(mediaAssets)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(mediaAssets.id, id));

  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "media_asset", resourceId: id, metadata: { name: asset.name, mimeType: asset.mimeType } });

  // Best-effort file deletion — R2 or disk
  try {
    const s3 = await getR2Client();
    if (s3 && asset.r2Key) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: asset.r2Key }));
    } else if (!s3 && asset.r2Key) {
      await deleteDiskFile(asset.r2Key);
    }
  } catch { /* Non-critical */ }

  return c.json({ data: { id: asset.id, deleted: true } });
});

// ============================================================
// POST /media/upload
// Direct multipart upload — used when R2 is not configured
// ============================================================

mediaRouter.post("/upload", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);

  const form = await c.req.formData();
  const file = form.get("file") as File | null;

  if (!file) return c.json({ error: "لم يتم إرسال ملف" }, 400);
  if (!ALLOWED_TYPES[file.type]) return c.json({ error: "نوع الملف غير مدعوم" }, 400);

  const maxSize = maxSizeForMime(file.type);
  if (file.size > maxSize) return c.json({ error: "حجم الملف كبير جداً" }, 400);

  const ext      = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key      = `${nanoid(14)}.${ext}`;
  const category = (form.get("category") as string) || "media";

  const orgDir = join(UPLOAD_DIR, orgId);
  await mkdir(orgDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(orgDir, key), buffer);

  const fileUrl   = `${STATIC_BASE_URL}/${orgId}/${key}`;
  const r2Key     = `${orgId}/${category}/${key}`;
  const dimensions = file.type.startsWith("image/") ? getImageDimensions(buffer, file.type) : null;

  const tagsRaw = form.get("tags") as string | null;
  const tags    = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  const fileType        = (form.get("fileType") as any) || mimeToAssetType(file.type);
  const altText         = (form.get("altText")  as string | null) ?? undefined;
  const relatedServiceId = (form.get("relatedServiceId") as string | null) ?? undefined;
  const name            = (form.get("name") as string | null) || file.name.replace(/\.[^.]+$/, "");

  const [asset] = await db.insert(mediaAssets).values({
    orgId,
    createdBy:        userId || undefined,
    name,
    fileUrl,
    r2Key,
    fileType,
    mimeType:         file.type,
    sizeBytes:        file.size,
    width:            dimensions?.width,
    height:           dimensions?.height,
    tags,
    category:         category || undefined,
    altText,
    relatedServiceId,
  }).returning();

  return c.json({ data: asset }, 201);
});

// ============================================================
// POST /media/bulk-delete
// Body: { ids: string[] }
// ============================================================

mediaRouter.post("/bulk-delete", async (c) => {
  const orgId = getOrgId(c);
  const body  = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).parse(await c.req.json());

  // Fetch r2Keys before deleting (for disk/R2 cleanup)
  const rows = await db
    .select({ id: mediaAssets.id, r2Key: mediaAssets.r2Key })
    .from(mediaAssets)
    .where(and(inArray(mediaAssets.id, body.ids), eq(mediaAssets.orgId, orgId)));

  const deleted = await db.update(mediaAssets)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(inArray(mediaAssets.id, body.ids), eq(mediaAssets.orgId, orgId)))
    .returning({ id: mediaAssets.id });

  // Best-effort file cleanup
  const s3 = await getR2Client();
  for (const row of rows) {
    if (!row.r2Key) continue;
    try {
      if (s3) {
        const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: row.r2Key }));
      } else {
        await deleteDiskFile(row.r2Key);
      }
    } catch { /* non-critical */ }
  }

  return c.json({ data: { deleted: deleted.length } });
});

// ============================================================
// MEDIA GALLERIES — معرض الصور المشترك
// ============================================================

// ── GET /media/galleries — list org galleries ───────────────

mediaRouter.get("/galleries", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select()
    .from(mediaGalleries)
    .where(and(eq(mediaGalleries.orgId, orgId), eq(mediaGalleries.isActive, true)))
    .orderBy(desc(mediaGalleries.createdAt));
  return c.json({ data: rows });
});

// ── POST /media/galleries — create gallery ──────────────────

mediaRouter.post("/galleries", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const schema = z.object({
    name:        z.string().min(1),
    description: z.string().optional(),
    clientName:  z.string().optional(),
    assetIds:    z.array(z.string().uuid()).min(1, "اختر صورة واحدة على الأقل"),
    expiresAt:   z.string().datetime().optional(),
  });
  let body: any;
  try { body = schema.parse(await c.req.json()); }
  catch { return c.json({ error: "بيانات غير صحيحة" }, 400); }

  const token = nanoid(16);

  const [gallery] = await db.insert(mediaGalleries).values({
    orgId,
    createdById: userId ?? undefined,
    name:        body.name,
    description: body.description ?? null,
    clientName:  body.clientName  ?? null,
    assetIds:    body.assetIds,
    token,
    expiresAt:   body.expiresAt ? new Date(body.expiresAt) : null,
  }).returning();

  insertAuditLog({ orgId, userId, action: "create", resource: "media_gallery", resourceId: gallery.id });
  return c.json({ data: gallery }, 201);
});

// ── PATCH /media/galleries/:id — update gallery ─────────────

mediaRouter.patch("/galleries/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const schema = z.object({
    name:        z.string().min(1).optional(),
    description: z.string().optional(),
    clientName:  z.string().optional(),
    assetIds:    z.array(z.string().uuid()).optional(),
    expiresAt:   z.string().datetime().nullable().optional(),
    isActive:    z.boolean().optional(),
  });
  let body: any;
  try { body = schema.parse(await c.req.json()); }
  catch { return c.json({ error: "بيانات غير صحيحة" }, 400); }

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (body.name        !== undefined) updates.name        = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.clientName  !== undefined) updates.clientName  = body.clientName;
  if (body.assetIds    !== undefined) updates.assetIds    = body.assetIds;
  if (body.isActive    !== undefined) updates.isActive    = body.isActive;
  if (body.expiresAt   !== undefined) updates.expiresAt   = body.expiresAt ? new Date(body.expiresAt) : null;

  const [updated] = await db.update(mediaGalleries)
    .set(updates)
    .where(and(eq(mediaGalleries.id, id), eq(mediaGalleries.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "المعرض غير موجود" }, 404);
  return c.json({ data: updated });
});

// ── DELETE /media/galleries/:id — soft delete ───────────────

mediaRouter.delete("/galleries/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  const [existing] = await db.select({ id: mediaGalleries.id })
    .from(mediaGalleries)
    .where(and(eq(mediaGalleries.id, id), eq(mediaGalleries.orgId, orgId)));
  if (!existing) return c.json({ error: "المعرض غير موجود" }, 404);

  await db.update(mediaGalleries)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(mediaGalleries.id, id));

  insertAuditLog({ orgId, userId, action: "delete", resource: "media_gallery", resourceId: id });
  return c.json({ data: { success: true } });
});

// ── GET /media/galleries/share/:token — PUBLIC view ─────────
// No auth required — used by clients to view their shared gallery

mediaRouter.get("/galleries/share/:token", async (c) => {
  const token = c.req.param("token");

  const [gallery] = await db
    .select()
    .from(mediaGalleries)
    .where(and(eq(mediaGalleries.token, token), eq(mediaGalleries.isActive, true)));

  if (!gallery) return c.json({ error: "المعرض غير موجود أو انتهت صلاحيته" }, 404);

  // Check expiry
  if (gallery.expiresAt && gallery.expiresAt < new Date()) {
    return c.json({ error: "انتهت صلاحية هذا الرابط" }, 410);
  }

  // Fetch the actual assets
  const assets = gallery.assetIds.length > 0
    ? await db
        .select({ id: mediaAssets.id, name: mediaAssets.name, fileUrl: mediaAssets.fileUrl, fileType: mediaAssets.fileType, width: mediaAssets.width, height: mediaAssets.height })
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, gallery.assetIds))
    : [];

  return c.json({
    data: {
      gallery: {
        id:          gallery.id,
        name:        gallery.name,
        description: gallery.description,
        clientName:  gallery.clientName,
        createdAt:   gallery.createdAt,
        expiresAt:   gallery.expiresAt,
      },
      assets,
    },
  });
});
