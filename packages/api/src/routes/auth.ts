import { Hono } from "hono";
import { z } from "zod";
import { eq, and, gt, desc, sql, or } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import { users, otpCodes, sessions, auditLogs, organizations, roles, bookingPipelineStages } from "@nasaq/db/schema";
import { nanoid } from "nanoid";
import { SESSION_DURATION_MS, DEFAULT_TRIAL_DAYS, MAX_FAILED_LOGIN_ATTEMPTS } from "../lib/constants";
import { authMiddleware, type AuthUser } from "../middleware/auth";
import { getBusinessDefaults, getTrustedIp } from "../lib/helpers";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { sendSms } from "../lib/sms";
import { sendEmail, buildOtpEmail } from "../lib/email";
import { seedChartOfAccounts } from "../lib/seed-chart-of-accounts";

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

export const authRouter = new Hono<{ Variables: { user: AuthUser | null; orgId: string; requestId: string } }>();

// ============================================================
// IP RATE LIMITER — in-memory with size cap + TTL eviction
// Suitable for single-instance. For multi-instance, replace
// ipHits store with Redis (same interface, same logic).
// ============================================================

const MAX_IP_ENTRIES = 10_000; // prevent unbounded growth
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkIpRateLimit(ip: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || entry.resetAt < now) {
    // Evict oldest entries if map is full
    if (!entry && ipHits.size >= MAX_IP_ENTRIES) {
      const oldest = [...ipHits.entries()]
        .sort((a, b) => a[1].resetAt - b[1].resetAt)
        .slice(0, Math.floor(MAX_IP_ENTRIES * 0.1)); // evict oldest 10%
      for (const [k] of oldest) ipHits.delete(k);
    }
    ipHits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= maxPerWindow;
}

// Prune expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ipHits.entries()) {
    if (val.resetAt < now) ipHits.delete(key);
  }
}, 10 * 60 * 1000);

// ============================================================
// POST /auth/register — تسجيل نشاط تجاري جديد
// يُنشئ مؤسسة + مستخدم مالك + يُرسل OTP للتحقق
// ============================================================

authRouter.post("/register", async (c) => {
  const ip = getTrustedIp(c);
  if (!checkIpRateLimit(ip, 5, 60 * 60 * 1000)) { // 5 registrations per IP per hour
    return c.json({ error: "تم تجاوز الحد المسموح — حاول لاحقاً", code: "RATE_LIMITED" }, 429);
  }

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
    const biz = businessType || "general";
    const bizDefaults = getBusinessDefaults(biz);
    const seqResult = await tx.execute(sql`SELECT nextval('org_code_seq') AS n`);
    const seqRow = (seqResult as any).rows?.[0] ?? (seqResult as any)[0] ?? { n: "0001" };
    const orgCode = `NSQ-${String(seqRow.n).padStart(4, "0")}`;

    const [org] = await tx.insert(organizations).values({
      orgCode,
      name: businessName,
      slug,
      phone: normalizedPhone,
      email: email || null,
      businessType: biz,
      plan: "basic",
      subscriptionStatus: "trialing",
      trialEndsAt: new Date(Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000),
      subdomain: slug,
      operatingProfile: bizDefaults.operatingProfile,
      serviceDeliveryModes: bizDefaults.serviceDeliveryModes,
      enabledCapabilities: bizDefaults.enabledCapabilities,
    }).returning();

    const [owner] = await tx.insert(users).values({
      orgId: org.id,
      name: businessName,
      phone: normalizedPhone as string,
      email: email ? email.toLowerCase().trim() : undefined,
      passwordHash: password ? hashPassword(password) : undefined,
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

  // Seed chart of accounts for new org (fire and forget — never throws)
  seedChartOfAccounts(result.org.id).catch(console.error);

  // Auto-create free trial subscription + update org plan fields (fire and forget)
  const trialEnd = new Date(Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  pool.query(
    `INSERT INTO subscriptions (org_id, plan_key, plan_name, plan_price, start_date, end_date, status, subscription_number)
     VALUES ($1, 'free', 'مجاني', 0, NOW(), $2::timestamptz, 'active', 'SUB-' || substring(gen_random_uuid()::text, 1, 8))
     ON CONFLICT DO NOTHING`,
    [result.org.id, trialEnd.toISOString()]
  ).catch(console.error);
  pool.query(
    `UPDATE organizations SET current_plan_code='free', is_trial=true, trial_started_at=NOW() WHERE id=$1`,
    [result.org.id]
  ).catch(console.error);

  // Email-only registration → create session immediately (password already verified)
  if (!normalizedPhone && email && password) {
    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.insert(sessions).values({
      userId: result.owner.id,
      token,
      device: c.req.header("User-Agent") || "unknown",
      ip: getTrustedIp(c),
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

  const smsEnabledReg = process.env.SMS_ENABLED === "true";
  if (!smsEnabledReg) {
    console.log(`\n🔐 Register OTP [${normalizedPhone}]: ${code}  (expires in 5 min)\n`);
  }

  return c.json({
    message: "تم إنشاء الحساب — أدخل رمز التحقق",
    phone: normalizedPhone,
    orgId: result.org.id,
    expiresIn: 300,
    ...(!smsEnabledReg ? { _devCode: code } : {}),
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

  // Rate limit: منع طلب OTP أكثر من مرة كل دقيقة لنفس الرقم
  const [recentOtp] = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.purpose, "login"),
        gt(otpCodes.expiresAt, new Date()),
        sql`${otpCodes.createdAt} > NOW() - INTERVAL '1 minute'`
      )
    )
    .limit(1);

  if (recentOtp) {
    return c.json({ error: "يرجى الانتظار دقيقة قبل طلب رمز جديد" }, 429);
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

  const otpMessage = `مرحباً،\nرمز التحقق الخاص بك في منصة ترميز OS:\n*${code}*\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.\nترميز OS`;

  // محاولة الإرسال: واتساب أولاً ← SMS احتياطياً
  let sent = false;
  let channel = "none";

  try {
    const { sendViaBaileys } = await import("../lib/whatsappBaileys");
    sent = await sendViaBaileys("platform", phone, otpMessage);
    if (sent) channel = "whatsapp";
  } catch { /* Baileys غير جاهز */ }

  if (!sent) {
    sent = await sendSms(phone, `رمز التحقق في ترميز OS: ${code}\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`);
    if (sent) channel = "sms";
  }

  if (!sent) {
    console.log(`\n[OTP] ${phone}: ${code}\n`);
  }

  return c.json({
    message: channel === "whatsapp"
      ? "تم إرسال رمز التحقق عبر واتساب"
      : channel === "sms"
        ? "تم إرسال رمز التحقق برسالة نصية"
        : "رمز التحقق ظهر في سجلات الخادم",
    channel,
    expiresIn: 300,
    ...(channel === "none" ? { _devCode: code } : {}),
  });
});

// ============================================================
// POST /auth/otp/request-email — إرسال OTP عبر الإيميل
// ============================================================

authRouter.post("/otp/request-email", async (c) => {
  const body = await c.req.json();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: "بريد إلكتروني غير صحيح" }, 400);
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, status: users.status })
    .from(users)
    .where(eq(users.email, email));

  if (!user) return c.json({ error: "البريد الإلكتروني غير مسجل في النظام" }, 404);
  if (user.status === "suspended") return c.json({ error: "الحساب موقوف — تواصل مع المسؤول" }, 403);

  // Rate limit: مرة واحدة كل دقيقة
  const [recent] = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(and(
      eq(otpCodes.email, email),
      eq(otpCodes.purpose, "login"),
      gt(otpCodes.expiresAt, new Date()),
      sql`${otpCodes.createdAt} > NOW() - INTERVAL '1 minute'`
    ))
    .limit(1);

  if (recent) return c.json({ error: "يرجى الانتظار دقيقة قبل طلب رمز جديد" }, 429);

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(otpCodes).values({ email, code, purpose: "login", expiresAt });

  const { subject, html, text } = buildOtpEmail(code);
  const sent = await sendEmail({ to: email, subject, html, text });

  if (!sent) console.log(`\n[OTP-EMAIL] ${email}: ${code}\n`);

  return c.json({
    message: sent ? "تم إرسال رمز التحقق على بريدك الإلكتروني" : "رمز التحقق ظهر في سجلات الخادم",
    expiresIn: 300,
    ...(!sent ? { _devCode: code } : {}),
  });
});

// ============================================================
// POST /auth/otp/verify — التحقق من الرمز وتسجيل الدخول
//   يقبل: { phone, code } أو { email, code }
// ============================================================

authRouter.post("/otp/verify", async (c) => {
  const ip = getTrustedIp(c);
  if (!checkIpRateLimit(ip, 30, 15 * 60 * 1000)) {
    return c.json({ error: "تم تجاوز الحد المسموح — حاول بعد 15 دقيقة", code: "RATE_LIMITED" }, 429);
  }

  const body = await c.req.json();
  const phone = normalizePhone(body.phone);
  const email = (body.email ?? "").trim().toLowerCase() || null;
  const code  = body.code;

  if ((!phone && !email) || !code) {
    return c.json({ error: "رقم الجوال أو الإيميل والرمز مطلوبان" }, 400);
  }

  // Build OTP lookup condition
  const otpCondition = email
    ? and(eq(otpCodes.email, email), eq(otpCodes.code, code), gt(otpCodes.expiresAt, new Date()))
    : and(eq(otpCodes.phone, phone!), eq(otpCodes.code, code), gt(otpCodes.expiresAt, new Date()));

  // Find valid OTP
  const [otp] = await db
    .select({ id: otpCodes.id, usedAt: otpCodes.usedAt, attempts: otpCodes.attempts })
    .from(otpCodes)
    .where(otpCondition)
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otp) {
    if (email) {
      await db.execute(sql`
        UPDATE otp_codes SET attempts = COALESCE(attempts, 0) + 1
        WHERE id = (
          SELECT id FROM otp_codes
          WHERE email = ${email} AND purpose = 'login'
            AND expires_at > NOW() AND used_at IS NULL
          ORDER BY created_at DESC LIMIT 1
        )
      `);
    } else {
      await db.execute(sql`
        UPDATE otp_codes SET attempts = COALESCE(attempts, 0) + 1
        WHERE id = (
          SELECT id FROM otp_codes
          WHERE phone = ${phone} AND purpose = 'login'
            AND expires_at > NOW() AND used_at IS NULL
          ORDER BY created_at DESC LIMIT 1
        )
      `);
    }
    return c.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, 400);
  }

  if (otp.usedAt) return c.json({ error: "الرمز مستخدم مسبقاً" }, 400);
  if ((otp.attempts || 0) >= 5) return c.json({ error: "تم تجاوز عدد المحاولات — اطلب رمزاً جديداً" }, 429);

  await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, otp.id));

  // Find user — by email or phone
  const [user] = await db
    .select({
      id: users.id, orgId: users.orgId, name: users.name,
      phone: users.phone, email: users.email, type: users.type, avatar: users.avatar,
    })
    .from(users)
    .where(email ? eq(users.email, email) : eq(users.phone, phone!));

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
    ip: getTrustedIp(c),
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
    ip: getTrustedIp(c),
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
  const ip = getTrustedIp(c);
  if (!checkIpRateLimit(ip, 20, 15 * 60 * 1000)) { // 20 attempts per IP per 15 min
    return c.json({ error: "تم تجاوز الحد المسموح — حاول بعد 15 دقيقة", code: "RATE_LIMITED" }, 429);
  }

  const body = await c.req.json();
  const { email, phone: rawPhone, password } = body;

  if ((!email && !rawPhone) || !password) {
    return c.json({ error: "رقم الجوال أو الإيميل وكلمة المرور مطلوبان" }, 400);
  }

  const normalizedLoginPhone = rawPhone ? normalizePhone(rawPhone) : null;

  const [user] = await db
    .select({
      id: users.id,
      orgId: users.orgId,
      name: users.name,
      phone: users.phone,
      email: users.email,
      type: users.type,
      avatar: users.avatar,
      status: users.status,
      passwordHash: users.passwordHash,
      failedLoginAttempts: users.failedLoginAttempts,
      isSuperAdmin: users.isSuperAdmin,
      nasaqRole: users.nasaqRole,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .where(
      normalizedLoginPhone
        ? eq(users.phone, normalizedLoginPhone)
        : eq(users.email, email.toLowerCase().trim())
    );

  if (!user) {
    return c.json({ error: "رقم الجوال أو كلمة المرور غير صحيحة" }, 401);
  }

  if (user.status === "suspended") {
    return c.json({ error: "الحساب موقوف — تواصل مع المسؤول" }, 403);
  }

  // Lockout after MAX_FAILED_LOGIN_ATTEMPTS consecutive failures
  if ((user.failedLoginAttempts || 0) >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return c.json({
      error: "تم تجاوز عدد محاولات الدخول — تواصل مع المسؤول لإعادة تفعيل الحساب",
      code: "ACCOUNT_LOCKED",
    }, 429);
  }

  if (!user.passwordHash) {
    return c.json({ error: "هذا الحساب يستخدم تسجيل الدخول بالجوال — اختر طريقة الجوال" }, 400);
  }

  if (!verifyPassword(password, user.passwordHash)) {
    await db.update(users)
      .set({ failedLoginAttempts: (user.failedLoginAttempts || 0) + 1 })
      .where(eq(users.id, user.id));
    return c.json({ error: "رقم الجوال أو كلمة المرور غير صحيحة" }, 401);
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
    ip: getTrustedIp(c),
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
    ip: getTrustedIp(c),
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
      isSuperAdmin: user.isSuperAdmin ?? false,
      nasaqRole: user.nasaqRole ?? null,
      mustChangePassword: user.mustChangePassword ?? false,
    },
  });
});

// ============================================================
// POST /auth/password/change — تغيير كلمة المرور
// ============================================================

authRouter.post("/password/change", async (c) => {
  // authMiddleware guarantees user is set
  const authUser = c.get("user") as { id: string } | null;
  if (!authUser) return c.json({ error: "غير مصرح" }, 401);

  const { currentPassword, newPassword } = await c.req.json();
  if (!newPassword || newPassword.length < 8) {
    return c.json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" }, 400);
  }

  // Load only what we need — passwordHash for verification
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, authUser.id));
  if (!user) return c.json({ error: "المستخدم غير موجود" }, 404);

  // If user already has a password, verify current one
  if (user.passwordHash && currentPassword) {
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return c.json({ error: "كلمة المرور الحالية غير صحيحة" }, 400);
    }
  }

  await db.update(users)
    .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false, updatedAt: new Date() })
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
// Protected auth routes — require valid session
// ============================================================

authRouter.use("/me", authMiddleware);
authRouter.use("/sessions", authMiddleware);
authRouter.use("/sessions/*", authMiddleware);
authRouter.use("/password/change", authMiddleware);
authRouter.use("/account/update", authMiddleware);

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
// PATCH /auth/account/update — تحديث بيانات المستخدم الشخصية
// ============================================================

authRouter.patch("/account/update", async (c) => {
  const authUser = c.get("user") as { id: string } | null;
  if (!authUser) return c.json({ error: "غير مصرح" }, 401);

  const body = await c.req.json();
  const allowed = ["name", "email", "avatar"] as const;
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "لا توجد بيانات للتحديث" }, 400);
  }

  if (updates.email) {
    const email = String(updates.email).toLowerCase().trim();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), sql`${users.id} != ${authUser.id}`));
    if (existing) return c.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, 409);
    updates.email = email;
  }

  const [updated] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, authUser.id))
    .returning({ id: users.id, name: users.name, email: users.email, avatar: users.avatar });

  // Refresh stored user in any active session (best-effort localStorage sync via response)
  return c.json({ data: updated });
});

// ============================================================
// GET /auth/sessions — جلساتي النشطة
// ============================================================

authRouter.get("/sessions", async (c) => {
  const user = c.get("user") as AuthUser | null;
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
  const user = c.get("user") as AuthUser | null;
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
// ADMIN PASSWORD RESET — عبر واتساب OTP
// مسار منفصل تماماً عن reset العميل العادي
// الأكواد والتوكنات تُخزّن كـ HMAC-SHA256 — لا نص plain في DB أبداً
// ============================================================

const ADMIN_NASAQ_ROLES = ["account_manager", "support_agent", "content_manager", "viewer"] as const;

function isAdminUser(u: { isSuperAdmin: boolean | null; nasaqRole: string | null }): boolean {
  return (u.isSuperAdmin === true) || ADMIN_NASAQ_ROLES.includes(u.nasaqRole as any);
}

// HMAC-SHA256 — يُستخدم لتجزئة الأكواد والتوكنات قبل التخزين
function hashAdminCode(value: string): string {
  const secret = process.env.OTP_HASH_SECRET ?? "tarmiz-dev-otp-secret-change-in-prod";
  return createHmac("sha256", secret).update(value).digest("hex");
}

// POST /auth/admin/password/reset/request
authRouter.post("/admin/password/reset/request", async (c) => {
  const ip = getTrustedIp(c);
  // rate limit صارم: 3 طلبات / 15 دقيقة لكل IP
  if (!checkIpRateLimit(ip, 3, 15 * 60 * 1000)) {
    return c.json({ message: "إذا كانت البيانات صحيحة سيتم إرسال رمز التحقق" });
  }

  const body = await c.req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));

  if (!phone) {
    return c.json({ message: "إذا كانت البيانات صحيحة سيتم إرسال رمز التحقق" });
  }

  // ابحث عن المستخدم
  const [user] = await db
    .select({ id: users.id, orgId: users.orgId, name: users.name, isSuperAdmin: users.isSuperAdmin, nasaqRole: users.nasaqRole, status: users.status })
    .from(users)
    .where(eq(users.phone, phone));

  // لا تكشف هل الرقم يخص Admin أو لا
  if (!user || user.status === "suspended" || !isAdminUser(user)) {
    await db.insert(auditLogs).values({
      orgId: user?.orgId ?? null,
      userId: user?.id ?? null,
      action: "admin_reset_request_denied",
      resource: "auth",
      resourceId: user?.id ?? "unknown",
      ip,
      userAgent: c.req.header("User-Agent") || "unknown",
    }).catch(() => {});
    return c.json({ message: "إذا كانت البيانات صحيحة سيتم إرسال رمز التحقق" });
  }

  // rate limit لنفس الرقم: مرة واحدة / دقيقة
  const [recentOtp] = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(and(
      eq(otpCodes.phone, phone),
      eq(otpCodes.purpose, "admin_reset"),
      gt(otpCodes.expiresAt, new Date()),
      sql`${otpCodes.createdAt} > NOW() - INTERVAL '1 minute'`
    ))
    .limit(1);

  if (recentOtp) {
    return c.json({ message: "إذا كانت البيانات صحيحة سيتم إرسال رمز التحقق" });
  }

  // ألغِ الأكواد القديمة غير المستخدمة
  await db.execute(sql`
    UPDATE otp_codes SET used_at = NOW()
    WHERE phone = ${phone} AND purpose = 'admin_reset' AND used_at IS NULL
  `);

  const code = generateOTP();
  const codeHash = hashAdminCode(code);       // ← HMAC-SHA256 — لا نص plain في DB
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(otpCodes).values({ phone, code: codeHash, purpose: "admin_reset", expiresAt });

  const waMessage = `رمز استعادة كلمة مرور حساب الإدارة:\n\n${code}\n\nصالح لمدة 5 دقائق.\nلا تشاركه مع أحد.\n\nTarmiz OS`;

  let sent = false;
  let channel = "none";

  try {
    const { sendViaBaileys } = await import("../lib/whatsappBaileys");
    sent = await sendViaBaileys("platform", phone, waMessage);
    if (sent) channel = "whatsapp";
  } catch { /* Baileys غير جاهز */ }

  if (!sent) {
    sent = await sendSms(phone, `رمز استعادة كلمة مرور ترميز OS: ${code}\nصالح لمدة 5 دقائق. لا تشاركه.`);
    if (sent) channel = "sms";
  }

  // لا يُكشف الكود في response أبداً — سجّل في الـ logs فقط
  if (!sent) {
    console.log(`[ADMIN-RESET OTP] phone=${phone} code=${code} (not sent — check WA/SMS config)`);
  }

  await db.insert(auditLogs).values({
    orgId: user.orgId,
    userId: user.id,
    action: "admin_reset_request",
    resource: "auth",
    resourceId: user.id,
    ip,
    userAgent: c.req.header("User-Agent") || "unknown",
    metadata: { channel, sent },
  }).catch(() => {});

  // لا _devCode في الـ response — الكود يصل فقط عبر واتساب/SMS أو سجل الخادم
  return c.json({
    message: "إذا كانت البيانات صحيحة سيتم إرسال رمز التحقق",
    channel,
    expiresIn: 300,
  });
});

// POST /auth/admin/password/reset/verify
authRouter.post("/admin/password/reset/verify", async (c) => {
  const ip = getTrustedIp(c);
  if (!checkIpRateLimit(ip, 5, 10 * 60 * 1000)) {
    return c.json({ error: "تم تجاوز الحد المسموح — حاول بعد 10 دقائق", code: "RATE_LIMITED" }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const phone    = normalizePhone(String(body.phone ?? ""));
  const codeRaw  = String(body.code ?? "").trim();

  if (!phone || !codeRaw) {
    return c.json({ error: "رقم الجوال والرمز مطلوبان" }, 400);
  }

  // hash الكود المُدخل قبل المقارنة — لا يُخزّن plain text في DB
  const codeHash = hashAdminCode(codeRaw);

  const [otp] = await db
    .select({ id: otpCodes.id, usedAt: otpCodes.usedAt, attempts: otpCodes.attempts })
    .from(otpCodes)
    .where(and(
      eq(otpCodes.phone, phone),
      eq(otpCodes.code, codeHash),            // ← مقارنة hash مع hash
      eq(otpCodes.purpose, "admin_reset"),
      gt(otpCodes.expiresAt, new Date())
    ))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otp) {
    // زد المحاولات الفاشلة على آخر OTP نشط لهذا الرقم
    await db.execute(sql`
      UPDATE otp_codes SET attempts = COALESCE(attempts, 0) + 1
      WHERE id = (
        SELECT id FROM otp_codes
        WHERE phone = ${phone} AND purpose = 'admin_reset'
          AND expires_at > NOW() AND used_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      )
    `);
    return c.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, 400);
  }

  if (otp.usedAt) return c.json({ error: "الرمز مستخدم مسبقاً" }, 400);
  if ((otp.attempts || 0) >= 5) return c.json({ error: "تم تجاوز عدد المحاولات — اطلب رمزاً جديداً" }, 429);

  // تأكد مجدداً أن المستخدم admin
  const [user] = await db
    .select({ id: users.id, orgId: users.orgId, isSuperAdmin: users.isSuperAdmin, nasaqRole: users.nasaqRole, status: users.status })
    .from(users)
    .where(eq(users.phone, phone));

  if (!user || user.status === "suspended" || !isAdminUser(user)) {
    return c.json({ error: "غير مصرح" }, 403);
  }

  // أنشئ resetToken عشوائي قوي (48 حرف) — يُرسل للعميل plain text مرة واحدة
  const resetToken     = nanoid(48);
  const resetTokenHash = hashAdminCode(resetToken); // ← hash للتخزين في DB
  const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.execute(sql`UPDATE otp_codes SET used_at = NOW() WHERE id = ${otp.id}`);

  // ألغِ أي reset token قديم
  await db.execute(sql`
    UPDATE otp_codes SET used_at = NOW()
    WHERE phone = ${phone} AND purpose = 'admin_reset_token' AND used_at IS NULL
  `);

  // خزّن hash فقط — لا plain token في DB
  await db.insert(otpCodes).values({
    phone,
    code: resetTokenHash,
    purpose: "admin_reset_token",
    expiresAt: tokenExpiresAt,
  });

  await db.insert(auditLogs).values({
    orgId: user.orgId,
    userId: user.id,
    action: "admin_reset_verify",
    resource: "auth",
    resourceId: user.id,
    ip,
    userAgent: c.req.header("User-Agent") || "unknown",
  }).catch(() => {});

  // نُرجع plain resetToken للعميل مرة واحدة — الـ DB يحمل hash فقط
  return c.json({ resetToken, expiresIn: 600 });
});

// POST /auth/admin/password/reset/confirm
authRouter.post("/admin/password/reset/confirm", async (c) => {
  const ip = getTrustedIp(c);
  if (!checkIpRateLimit(ip, 5, 10 * 60 * 1000)) {
    return c.json({ error: "تم تجاوز الحد المسموح", code: "RATE_LIMITED" }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const phone        = normalizePhone(String(body.phone ?? ""));
  const resetToken   = String(body.resetToken ?? "").trim();
  const newPassword  = String(body.newPassword ?? "").trim();

  if (!phone || !resetToken || !newPassword) {
    return c.json({ error: "جميع الحقول مطلوبة" }, 400);
  }
  if (newPassword.length < 8) {
    return c.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, 400);
  }

  // hash الـ token المُدخل ثم قارنه بما في DB
  const resetTokenHash = hashAdminCode(resetToken);

  const [tokenRow] = await db
    .select({ id: otpCodes.id, usedAt: otpCodes.usedAt })
    .from(otpCodes)
    .where(and(
      eq(otpCodes.phone, phone),
      eq(otpCodes.code, resetTokenHash),      // ← مقارنة hash مع hash
      eq(otpCodes.purpose, "admin_reset_token"),
      gt(otpCodes.expiresAt, new Date())
    ))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!tokenRow || tokenRow.usedAt) {
    return c.json({ error: "رمز الاستعادة غير صالح أو منتهي الصلاحية — ابدأ من جديد" }, 400);
  }

  const [user] = await db
    .select({ id: users.id, orgId: users.orgId, isSuperAdmin: users.isSuperAdmin, nasaqRole: users.nasaqRole, status: users.status })
    .from(users)
    .where(eq(users.phone, phone));

  if (!user || user.status === "suspended" || !isAdminUser(user)) {
    return c.json({ error: "غير مصرح" }, 403);
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE otp_codes SET used_at = NOW() WHERE id = ${tokenRow.id}`);
    await tx.update(users)
      .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false, failedLoginAttempts: 0, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  });

  // أنهِ جميع الجلسات النشطة — يُجبر على دخول جديد
  await db.execute(sql`DELETE FROM sessions WHERE user_id = ${user.id}`);

  await db.insert(auditLogs).values({
    orgId: user.orgId,
    userId: user.id,
    action: "admin_reset_confirm",
    resource: "auth",
    resourceId: user.id,
    ip,
    userAgent: c.req.header("User-Agent") || "unknown",
  }).catch(() => {});

  return c.json({ message: "تم تغيير كلمة المرور — سجّل دخولك" });
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
