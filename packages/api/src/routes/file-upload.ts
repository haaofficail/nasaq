/**
 * POST /api/v1/file-upload — رفع ملفات الصور مباشرة إلى السيرفر
 * يُستخدم لرفع صور المنيو وملف المنشأة وأي صور أخرى
 */
import { Hono } from "hono";
import { getOrgId } from "../lib/helpers";
import { nanoid } from "nanoid";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const fileUploadRouter = new Hono();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/nasaq/uploads";
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://nasaqpro.tech";

fileUploadRouter.post("/", async (c) => {
  const orgId = getOrgId(c);

  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "لم يتم إرسال ملف" }, 400);
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "نوع الملف غير مدعوم. يُسمح بـ JPG, PNG, WebP فقط" }, 400);
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return c.json({ error: "حجم الصورة يجب ألا يتجاوز 5MB" }, 400);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${nanoid(16)}.${ext}`;
  const orgDir = join(UPLOAD_DIR, orgId);

  await mkdir(orgDir, { recursive: true });
  const filePath = join(orgDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const publicUrl = `${PUBLIC_BASE}/uploads/${orgId}/${filename}`;
  return c.json({ data: { url: publicUrl } }, 201);
});
