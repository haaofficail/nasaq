import { Hono } from "hono";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { teacherProfiles } from "@nasaq/db/schema";
import { users, sessions, organizations } from "@nasaq/db/schema";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

export const schoolInviteRouter = new Hono();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ── GET /school-invite/:token — info only (public) ──────────
schoolInviteRouter.get("/:token", async (c) => {
  const token = c.req.param("token");

  const [teacher] = await db
    .select({
      id:             teacherProfiles.id,
      fullName:       teacherProfiles.fullName,
      inviteExpiresAt: teacherProfiles.inviteExpiresAt,
      userId:         teacherProfiles.userId,
      orgId:          teacherProfiles.orgId,
      orgName:        organizations.name,
    })
    .from(teacherProfiles)
    .leftJoin(organizations, eq(organizations.id, teacherProfiles.orgId))
    .where(eq(teacherProfiles.inviteToken, token));

  if (!teacher) return c.json({ error: "رابط الدعوة غير صحيح أو منتهي" }, 404);
  if (teacher.inviteExpiresAt && new Date() > teacher.inviteExpiresAt)
    return c.json({ error: "انتهت صلاحية رابط الدعوة، اطلب من المدير إرسالها مجدداً" }, 410);

  return c.json({
    data: {
      teacherName: teacher.fullName,
      orgName:     teacher.orgName ?? "",
      expiresAt:   teacher.inviteExpiresAt,
      hasAccount:  !!teacher.userId,
    },
  });
});

// ── POST /school-invite/:token/accept — set password (public) ──
schoolInviteRouter.post("/:token/accept", async (c) => {
  const token    = c.req.param("token");
  const { password } = await c.req.json();

  if (!password || password.length < 6) {
    return c.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, 400);
  }

  const [teacher] = await db
    .select({
      id:             teacherProfiles.id,
      fullName:       teacherProfiles.fullName,
      userId:         teacherProfiles.userId,
      orgId:          teacherProfiles.orgId,
      inviteExpiresAt: teacherProfiles.inviteExpiresAt,
    })
    .from(teacherProfiles)
    .where(eq(teacherProfiles.inviteToken, token));

  if (!teacher) return c.json({ error: "رابط الدعوة غير صحيح" }, 404);
  if (teacher.inviteExpiresAt && new Date() > teacher.inviteExpiresAt)
    return c.json({ error: "انتهت صلاحية رابط الدعوة" }, 410);

  const hash = hashPassword(password);

  // Update user account
  await db.update(users)
    .set({ passwordHash: hash, status: "active", updatedAt: new Date() })
    .where(eq(users.id, teacher.userId!));

  // Clear invite token
  await db.update(teacherProfiles)
    .set({ inviteToken: null, inviteExpiresAt: null, updatedAt: new Date() })
    .where(eq(teacherProfiles.id, teacher.id));

  // Create session
  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    userId:    teacher.userId!,
    token:     sessionToken,
    expiresAt,
    ip:        c.req.header("X-Forwarded-For") ?? null,
    device:    c.req.header("User-Agent") ?? null,
  });

  const [userData] = await db
    .select({ id: users.id, name: users.name, orgId: users.orgId, phone: users.phone, email: users.email })
    .from(users)
    .where(eq(users.id, teacher.userId!));

  return c.json({ data: { token: sessionToken, user: userData } });
});
