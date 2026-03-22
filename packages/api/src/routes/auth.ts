import { Hono } from "hono";
import { z } from "zod";
import { eq, and, gt, desc, sql, or } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { users, otpCodes, sessions, auditLogs, organizations, roles, bookingPipelineStages } from "@nasaq/db/schema";
import { nanoid } from "nanoid";
import { SESSION_DURATION_MS } from "../lib/constants";
import { DEFAULT_TRIAL_DAYS } from "../lib/constants";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// ============================================================
// PASSWORD HELPERS (scrypt — no extra dependency)
// ============================================================

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const inputHash = scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hash, "hex");
  if (inputHash.length !== storedHash.length) return false;
  return timingSafeEqual(inputHash, storedHash);
}

export const authRouter = new Hono();

// ============================================================
// POST /auth/register — تسجيل نشاط تجاري جديد
// يُنشئ مؤسسة + مستخدم مالك + يُرسل OTP للتحقق
// ============================================================

authRouter.post("/register", async (c) => {
  const body = await c.req.json();
  const { businessName, phone, email, businessType, password } = body;

  if (!businessName || (!phone && !email)) {
    return c.json({ error: "اسم النشاط مطلوب مع جوال أو إيميل" }, 400);
  }

  // Email registration requires password
  if (email && !phone && !password) {
    return c.json({ error: "كلمة المرور مطلوبة عند التسجيل بالإيميل" }, 400);
  }

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  if (phone && !normalizedPhone) {
    return c.json({ error: "رقم الجوال غير صحيح" }, 400);
  }

  // Check duplicates
  if (normalizedPhone) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, normalizedPhone));
    if (existing) return c.json({ error: "رقم الجوال مسجل مسبقاً — سجّل دخول" }, 409);
  }
  if (email) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (existing) return c.json({ error: "الإيميل مسجل مسبقاً — سجّل دخول" }, 409);
  }

  // Generate unique slug from businessName
  const baseSlug = businessName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0621-\u064Aa-z0-9-]/g, "")
    || "nasaq";
  const suffix = nanoid(6).toLowerCase();
  const slug = `${baseSlug}-${suffix}`;

  // Create org + owner + default pipeline in a transaction
  const result = await db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({
      name: businessName,
      slug,
      phone: normalizedPhone,
      email: email || null,
      businessType: businessType || "general",
      plan: "basic",
      subscriptionStatus: "trialing",
      trialEndsAt: new Date(Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000),
      subdomain: slug,
    }).returning();

    const [owner] = await tx.insert(users).values({
      orgId: org.id,
      name: businessName,
      phone: normalizedPhone,
      email: email ? email.toLowerCase().trim() : null,
      passwordHash: password ? hashPassword(password) : null,
      type: "owner",
      status: "active",
    }).returning();

    // Default roles
    await tx.insert(roles).values([
      { orgId: org.id, name: "مدير عمليات", nameEn: "Operations Manager", isSystem: true },
      { orgId: org.id, name: "مشرف حجوزات", nameEn: "Booking Supervisor", isSystem: true },
      { orgId: org.id, name: "محاسب", nameEn: "Accountant", isSystem: true },
    ]);

    // Default booking pipeline stages
    await tx.insert(bookingPipelineStages).values([
      { orgId: org.id, name: "طلب جديد", color: "#9E9E9E", sortOrder: 1, isDefault: true },
      { orgId: org.id, name: "تأكيد أولي", color: "#FF9800", sortOrder: 2 },
      { orgId: org.id, name: "عربون مدفوع", color: "#2196F3", sortOrder: 3 },
      { orgId: org.id, name: "تأكيد نهائي", color: "#4CAF50", sortOrder: 4 },
      { orgId: org.id, name: "مكتمل", color: "#4CAF50", sortOrder: 5, isTerminal: true },
      { orgId: org.id, name: "ملغي", color: "#F44336", sortOrder: 6, isTerminal: true },
    ]);

    return { org, owner };
  });

  // Email-only registration → create session immediately (password already verified)
  if (!normalizedPhone && email && password) {
    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.insert(sessions).values({
      userId: result.owner.id,
      token,
      device: c.req.header("User-Agent") || "unknown",
      ip: c.req.header("X-Forwarded-For") || "unknown",
      expiresAt,
    });
    const [org2] = await db.select({ businessType: organizations.businessType }).from(organizations).where(eq(organizations.id, result.org.id));
    return c.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: result.owner.id,
        orgId: result.org.id,
        name: result.owner.name,
        phone: result.owner.phone,
        email: result.owner.email,
        type: result.owner.type,
        businessType: org2?.businessType || "general",
      },
    }, 201);
  }

  // Phone registration → send OTP
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(otpCodes).values({
    phone: normalizedPhone!,
    code,
    purpose: "register",
    expiresAt,
  });

  if (process.env.NODE_ENV === "development") {
    console.log(`\n🔐 Register OTP for ${normalizedPhone}: ${code}\n`);
  }

  return c.json({
    message: "تم إنشاء الحساب — أدخل رمز التحقق المرسل لجوالك",
    phone: normalizedPhone,
    orgId: result.org.id,
    expiresIn: 300,
    ...(process.env.NODE_ENV === "development" ? { _devCode: code } : {}),
  }, 201);
});

// ============================================================
// POST /auth/otp/request — طلب رمز تحقق
// العميل يرسل رقم جواله > النظام يرسل OTP
// ============================================================

authRouter.post("/otp/request", async (c) => {
  const body = await c.req.json();
  const phone = normalizePhone(body.phone);

  if (!phone) {
    return c.json({ error: "رقم جوال غير صحيح" }, 400);
  }

  // Check if user exists
  const [user] = await db
    .select({ id: users.id, name: users.name, status: users.status })
    .from(users)
    .where(eq(users.phone, phone));

  if (!user) {
    return c.json({ error: "رقم الجوال غير مسجل في النظام" }, 404);
  }

  if (user.status === "suspended") {
    return c.json({ error: "الحساب موقوف — تواصل مع المسؤول" }, 403);
  }

  // Generate OTP (6 digits)
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 دقائق

  // Save OTP
  await db.insert(otpCodes).values({
    phone,
    code,
    purpose: "login",
    expiresAt,
  });

  // TODO: Send via SMS/WhatsApp (Twilio/Unifonic)
  // In dev mode, log it
  if (process.env.NODE_ENV === "development") {
    console.log(`\n🔐 OTP for ${phone}: ${code}\n`);
  }

  return c.json({
    message: "تم إرسال رمز التحقق",
    expiresIn: 300,
    // Only expose OTP code in development builds — never in production (S4)
    ...(process.env.NODE_ENV === "development" ? { _devCode: code } : {}),
  });
});

// ============================================================
// POST /auth/otp/verify — التحقق من الرمز وتسجيل الدخول
// ============================================================

authRouter.post("/otp/verify", async (c) => {
  const body = await c.req.json();
  const phone = normalizePhone(body.phone);
  const code = body.code;

  if (!phone || !code) {
    return c.json({ error: "رقم الجوال والرمز مطلوبان" }, 400);
  }

  // Find valid OTP (accept both login and register purposes)
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.code, code),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otp) {
    // Increment attempts on the latest active OTP for this phone — brute-force protection (P10)
    await db.execute(sql`
      UPDATE otp_codes SET attempts = COALESCE(attempts, 0) + 1
      WHERE id = (
        SELECT id FROM otp_codes
        WHERE phone = ${phone} AND purpose = 'login'
          AND expires_at > NOW() AND used_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      )
    `);
    return c.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, 400);
  }

  if (otp.usedAt) {
    return c.json({ error: "الرمز مستخدم مسبقاً" }, 400);
  }

  if ((otp.attempts || 0) >= 5) {
    return c.json({ error: "تم تجاوز عدد المحاولات — اطلب رمزاً جديداً" }, 429);
  }

  // Mark OTP as used
  await db
    .update(otpCodes)
    .set({ usedAt: new Date() })
    .where(eq(otpCodes.id, otp.id));

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone));

  if (!user) {
    return c.json({ error: "المستخدم غير موجود" }, 404);
  }

  // Get org for businessType
  const [org] = await db
    .select({ businessType: organizations.businessType })
    .from(organizations)
    .where(eq(organizations.id, user.orgId));

  // Create session
  const token = nanoid(64);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId: user.id,
    token,
    device: c.req.header("User-Agent") || "unknown",
    ip: c.req.header("X-Forwarded-For") || "unknown",
    expiresAt,
  });

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), failedLoginAttempts: 0 })
    .where(eq(users.id, user.id));

  // Audit log
  await db.insert(auditLogs).values({
    orgId: user.orgId,
    userId: user.id,
    action: "login",
    resource: "auth",
    resourceId: user.id,
    ip: c.req.header("X-Forwarded-For") || "unknown",
    userAgent: c.req.header("User-Agent") || "unknown",
  });

  return c.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      orgId: user.orgId,
      name: user.name,
      phone: user.phone,
      email: user.email,
      type: user.type,
      avatar: user.avatar,
      businessType: org?.businessType || "general",
    },
  });
});

// ============================================================
// POST /auth/login — تسجيل دخول بالإيميل وكلمة المرور
// ============================================================

authRouter.post("/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "الإيميل وكلمة المرور مطلوبان" }, 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()));

  if (!user) {
    return c.json({ error: "الإيميل أو كلمة المرور غير صحيحة" }, 401);
  }

  if (user.status === "suspended") {
    return c.json({ error: "الحساب موقوف — تواصل مع المسؤول" }, 403);
  }

  if (!user.passwordHash) {
    return c.json({ error: "هذا الحساب يستخدم تسجيل الدخول بالجوال — اختر طريقة الجوال" }, 400);
  }

  if (!verifyPassword(password, user.passwordHash)) {
    // Increment failed attempts
    await db.update(users)
      .set({ failedLoginAttempts: (user.failedLoginAttempts || 0) + 1 })
      .where(eq(users.id, user.id));
    return c.json({ error: "الإيميل أو كلمة المرور غير صحيحة" }, 401);
  }

  const [org] = await db
    .select({ businessType: organizations.businessType })
    .from(organizations)
    .where(eq(organizations.id, user.orgId));

  const token = nanoid(64);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId: user.id,
    token,
    device: c.req.header("User-Agent") || "unknown",
    ip: c.req.header("X-Forwarded-For") || "unknown",
    expiresAt,
  });

  await db.update(users)
    .set({ lastLoginAt: new Date(), failedLoginAttempts: 0 })
    .where(eq(users.id, user.id));

  await db.insert(auditLogs).values({
    orgId: user.orgId,
    userId: user.id,
    action: "login",
    resource: "auth",
    resourceId: user.id,
    ip: c.req.header("X-Forwarded-For") || "unknown",
    userAgent: c.req.header("User-Agent") || "unknown",
  });

  return c.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      orgId: user.orgId,
      name: user.name,
      phone: user.phone,
      email: user.email,
      type: user.type,
      avatar: user.avatar,
      businessType: org?.businessType || "general",
    },
  });
});

// ============================================================
// POST /auth/password/change — تغيير كلمة المرور
// ============================================================

authRouter.post("/password/change", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return c.json({ error: "غير مصرح" }, 401);

  const token = authHeader.substring(7);
  const [session] = await db.select({ userId: sessions.userId })
    .from(sessions).where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
  if (!session) return c.json({ error: "الجلسة منتهية" }, 401);

  const { currentPassword, newPassword } = await c.req.json();
  if (!newPassword || newPassword.length < 8) {
    return c.json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) return c.json({ error: "المستخدم غير موجود" }, 404);

  // If user already has a password, verify current one
  if (user.passwordHash && currentPassword) {
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return c.json({ error: "كلمة المرور الحالية غير صحيحة" }, 400);
    }
  }

  await db.update(users)
    .set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return c.json({ message: "تم تغيير كلمة المرور بنجاح" });
});

// ============================================================
// POST /auth/logout — تسجيل خروج
// ============================================================

authRouter.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: true }); // Already logged out
  }

  const token = authHeader.substring(7);

  await db
    .delete(sessions)
    .where(eq(sessions.token, token));

  return c.json({ message: "تم تسجيل الخروج" });
});

// ============================================================
// GET /auth/me — بيانات المستخدم الحالي
// ============================================================

authRouter.get("/me", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "غير مسجل الدخول" }, 401);
  }

  return c.json({ data: user });
});

// ============================================================
// GET /auth/sessions — جلساتي النشطة
// ============================================================

authRouter.get("/sessions", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "غير مصرح" }, 401);

  const activeSessions = await db
    .select({
      id: sessions.id,
      device: sessions.device,
      ip: sessions.ip,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, user.id),
        gt(sessions.expiresAt, new Date())
      )
    )
    .orderBy(desc(sessions.createdAt));

  return c.json({ data: activeSessions });
});

// ============================================================
// DELETE /auth/sessions/:id — إنهاء جلسة معينة عن بُعد
// ============================================================

authRouter.delete("/sessions/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "غير مصرح" }, 401);

  const sessionId = c.req.param("id");

  const [deleted] = await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, user.id)
      )
    )
    .returning();

  if (!deleted) return c.json({ error: "الجلسة غير موجودة" }, 404);
  return c.json({ message: "تم إنهاء الجلسة" });
});

// ============================================================
// HELPERS
// ============================================================

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  // Remove spaces and dashes
  let cleaned = phone.replace(/[\s-]/g, "");
  // Convert 05xxx to +966 5xxx
  if (cleaned.startsWith("05")) {
    cleaned = "+966" + cleaned.substring(1);
  }
  // Convert 966xxx to +966xxx
  if (cleaned.startsWith("966")) {
    cleaned = "+" + cleaned;
  }
  // Validate Saudi number
  if (/^\+966[5][0-9]{8}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned; // Return as-is for non-Saudi numbers
}

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}
