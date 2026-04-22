/**
 * /api/v1/public — Public platform-level endpoints (no auth, no orgId)
 *
 * These endpoints serve the platform's own marketing/legal pages.
 * They are NOT org-specific — they belong to ترميز OS itself.
 *
 * Replaces: /api/v1/website/public/contact
 *           /api/v1/website/public/privacy-request
 *
 * Endpoints:
 *   POST /public/contact          — platform contact form (ContactPage)
 *   POST /public/privacy-request  — PDPL privacy request (PrivacyPage)
 */

import { Hono } from "hono";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { privacyRequests } from "@nasaq/db/schema";
import { log } from "../lib/logger";

export const publicRouter = new Hono();

// ── Rate limiter (in-memory) ──────────────────────────────────
const _rateMap = new Map<string, { count: number; resetAt: number }>();
function rateAllowed(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = _rateMap.get(key);
  if (!entry || entry.resetAt < now) {
    _rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ── POST /api/v1/public/contact ───────────────────────────────
// نموذج التواصل في صفحة /contact — للتواصل مع فريق ترميز OS

const contactSchema = z.object({
  name:    z.string().min(2).max(120),
  phone:   z.string().optional(),
  email:   z.string().optional(),
  message: z.string().min(5).max(3000),
});

publicRouter.post("/contact", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
  if (!rateAllowed(`contact:${ip}`, 3, 15 * 60 * 1000)) {
    return c.json({ error: "تم تجاوز الحد المسموح به. حاول مرة أخرى بعد 15 دقيقة." }, 429);
  }

  const raw = await c.req.json().catch(() => null);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "بيانات غير صحيحة", details: parsed.error.flatten() }, 400);
  }

  const { name, phone, email, message } = parsed.data;
  log.info({ name, phone, email: email || null, messageLength: message.length }, "[platform-contact] new message");

  return c.json({ data: { message: "تم استلام رسالتك — سنتواصل معك قريباً" } }, 201);
});

// ── POST /api/v1/public/privacy-request ──────────────────────
// طلبات الخصوصية PDPL — من صفحة /legal/privacy

const privacySchema = z.object({
  type:            z.enum(["export", "delete"]),
  requesterName:   z.string().min(2).max(120),
  requesterPhone:  z.string().min(7).max(20),
  requesterEmail:  z.string().optional().nullable(),
});

publicRouter.post("/privacy-request", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = privacySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "بيانات غير صحيحة", details: parsed.error.flatten() }, 400);
  }

  const { type, requesterName, requesterPhone, requesterEmail } = parsed.data;

  // Rate limit: طلبان لنفس الهاتف كل 24 ساعة
  if (!rateAllowed(`privacy:${requesterPhone}`, 2, 24 * 60 * 60 * 1000)) {
    return c.json({ error: "لقد أرسلت طلباً مؤخراً. انتظر 24 ساعة." }, 429);
  }

  // تحقق من عدم وجود طلب مفتوح مسبقاً لنفس الهاتف ونفس النوع
  const [existing] = await db
    .select({ id: privacyRequests.id })
    .from(privacyRequests)
    .where(
      and(
        eq(privacyRequests.requesterPhone, requesterPhone),
        eq(privacyRequests.type, type),
        isNull(privacyRequests.orgId),
      )
    )
    .limit(1);

  if (existing) {
    return c.json({ error: "يوجد طلب مفتوح بنفس البيانات" }, 409);
  }

  await db.insert(privacyRequests).values({
    orgId:          null,
    type,
    requesterName,
    requesterPhone,
    requesterEmail: requesterEmail ?? null,
    status:         "pending",
  } as any);

  log.info({ type, requesterName, requesterPhone }, "[platform-privacy] privacy request created");

  return c.json({ data: { message: "تم تسجيل طلبك — سنتواصل معك خلال 30 يوماً وفق PDPL م/11" } }, 201);
});
