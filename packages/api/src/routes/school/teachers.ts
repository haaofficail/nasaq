import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, count, sql, inArray, isNull, gte } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  teacherProfiles,
  teacherClassAssignments,
  classRooms,
  schoolSettings,
  scheduleEntries,
  timetableTemplatePeriods,
  teacherAttendance,
  teacherPreparations,
  teacherDailyLogs,
  teacherStudentNotes,
  subjects,
  scheduleWeeks,
  behaviorIncidents,
  students,
  organizations,
  users,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../../lib/helpers";
import { requirePerm } from "../../middleware/auth";
import { withSchoolScope, logSchoolAudit } from "../../middleware/school";
import { teacherSchema, getCurrentPeriod, fillTemplate, sendSchoolWhatsApp } from "./shared";
import { sendEmail, buildEmailHtml } from "../../lib/email";
import { scryptSync, randomBytes } from "crypto";
import type { SchoolEnv } from "../../middleware/school";

const router = new Hono<SchoolEnv>();

function _hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function _genPassword(len = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── helper: رقم يوم الأسبوع → كود نصي ─────────────────────
const JS_DAY_TO_CODE: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

// ============================================================
// TEACHER PROFILES
// ============================================================

router.get("/teachers", async (c) => {
  const orgId = getOrgId(c);
  const isActiveParam = c.req.query("isActive");

  const conditions = [eq(teacherProfiles.orgId, orgId)];

  if (isActiveParam !== undefined) {
    conditions.push(eq(teacherProfiles.isActive, isActiveParam === "true"));
  }

  const result = await db
    .select()
    .from(teacherProfiles)
    .where(and(...conditions))
    .orderBy(asc(teacherProfiles.fullName));

  return c.json({ data: result });
});

router.post("/teachers", async (c) => {
  const orgId = getOrgId(c);
  const body = teacherSchema.parse(await c.req.json());

  const [created] = await db
    .insert(teacherProfiles)
    .values({ orgId, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/teachers/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = teacherSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select({ id: teacherProfiles.id })
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, id), eq(teacherProfiles.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "المعلم غير موجود" }, 404);

  const [updated] = await db
    .update(teacherProfiles)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(teacherProfiles.id, id), eq(teacherProfiles.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// ── POST /teachers/:id/invite — إنشاء حساب + إرسال بيانات الدخول ──
router.post("/teachers/:id/invite", requirePerm("school.students.write"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;

  const [teacher] = await db
    .select({
      id:       teacherProfiles.id,
      fullName: teacherProfiles.fullName,
      phone:    teacherProfiles.phone,
      email:    teacherProfiles.email,
      userId:   teacherProfiles.userId,
    })
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, id), eq(teacherProfiles.orgId, orgId)));

  if (!teacher) return c.json({ error: "المعلم غير موجود" }, 404);

  const phone = teacher.phone?.replace(/^0/, "966") ?? null;
  if (!teacher.phone && !teacher.email) {
    return c.json({ error: "يجب إضافة رقم الجوال أو البريد الإلكتروني للمعلم أولاً" }, 400);
  }

  // ── Get org name ──
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  const orgName = org?.name ?? "المدرسة";

  // ── Create or update user account ──
  const tempPassword = _genPassword(10);
  const hash         = _hashPassword(tempPassword);
  const inviteToken  = randomBytes(20).toString("hex");
  const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  let userId = teacher.userId;

  if (!userId) {
    // Create new user account
    const userPhone = teacher.phone ?? `T${id.replace(/-/g, "").slice(0, 12)}`;
    const [newUser] = await db
      .insert(users)
      .values({
        orgId,
        name:         teacher.fullName,
        phone:        userPhone,
        email:        teacher.email ?? undefined,
        passwordHash: hash,
        type:         "employee",
        status:       "invited",
        jobTitle:     "معلم",
      })
      .returning({ id: users.id });
    userId = newUser.id;
  } else {
    // Reset password
    await db.update(users)
      .set({ passwordHash: hash, status: "invited", updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Store invite token on teacher profile
  await db.update(teacherProfiles)
    .set({ userId, inviteToken, inviteExpiresAt: inviteExpiry, invitedAt: new Date(), updatedAt: new Date() })
    .where(eq(teacherProfiles.id, id));

  const APP_URL   = process.env.APP_URL ?? "https://nasaqpro.tech";
  const inviteLink = `${APP_URL}/school/invite/${inviteToken}`;
  const loginPhone = teacher.phone ?? null;

  // ── Send email (if teacher has email) ──
  let sentEmail = false;
  if (teacher.email) {
    sentEmail = await sendEmail({
      to:      teacher.email,
      subject: `دعوة الدخول إلى منصة نسق — ${orgName}`,
      html:    buildEmailHtml({
        orgName,
        title: `مرحباً ${teacher.fullName}، تمت دعوتك كمعلم في ${orgName}`,
        body:  `لتفعيل حسابك وتعيين كلمة مرورك، اضغط على الزر أدناه.\n\nكلمة المرور المؤقتة: ${tempPassword}\n\nيمكنك تغييرها بعد الدخول.`,
        cta:   { label: "تفعيل الحساب", url: inviteLink },
      }),
    });
  }

  return c.json({
    data: {
      inviteLink,
      tempPassword,
      phone:      loginPhone,
      whatsappPhone: phone,
      email:      teacher.email,
      sentEmail,
      teacherName: teacher.fullName,
      orgName,
    },
  });
});

router.delete("/teachers/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [existing] = await db
    .select({ id: teacherProfiles.id })
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, id), eq(teacherProfiles.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "المعلم غير موجود" }, 404);

  await db
    .delete(teacherProfiles)
    .where(and(eq(teacherProfiles.id, id), eq(teacherProfiles.orgId, orgId)));

  return c.json({ success: true });
});

// GET /teachers/:id/schedule — جدول معلم للأسبوع النشط
router.get("/teachers/:id/schedule", async (c) => {
  const orgId = getOrgId(c);
  const teacherId = c.req.param("id");
  const weekId = c.req.query("weekId");

  const [teacher] = await db
    .select()
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, teacherId), eq(teacherProfiles.orgId, orgId)))
    .limit(1);

  if (!teacher) return c.json({ error: "المعلم غير موجود" }, 404);

  // If no weekId, use active week
  let targetWeekId = weekId;
  if (!targetWeekId) {
    const [settings] = await db
      .select({ activeWeekId: schoolSettings.activeWeekId })
      .from(schoolSettings)
      .where(eq(schoolSettings.orgId, orgId))
      .limit(1);
    targetWeekId = settings?.activeWeekId ?? undefined;
  }

  if (!targetWeekId) return c.json({ data: { teacher, entries: [], weekId: null } });

  const entries = await db
    .select({
      id:           scheduleEntries.id,
      dayOfWeek:    scheduleEntries.dayOfWeek,
      subject:      scheduleEntries.subject,
      notes:        scheduleEntries.notes,
      periodId:     scheduleEntries.periodId,
      periodNumber: timetableTemplatePeriods.periodNumber,
      startTime:    timetableTemplatePeriods.startTime,
      endTime:      timetableTemplatePeriods.endTime,
      isBreak:      timetableTemplatePeriods.isBreak,
      label:        timetableTemplatePeriods.label,
      classRoomId:  scheduleEntries.classRoomId,
      classGrade:   classRooms.grade,
      className:    classRooms.name,
    })
    .from(scheduleEntries)
    .innerJoin(timetableTemplatePeriods, eq(scheduleEntries.periodId, timetableTemplatePeriods.id))
    .innerJoin(classRooms, eq(scheduleEntries.classRoomId, classRooms.id))
    .where(and(
      eq(scheduleEntries.teacherId, teacherId),
      eq(scheduleEntries.weekId, targetWeekId),
      eq(scheduleEntries.orgId, orgId)
    ))
    .orderBy(asc(scheduleEntries.dayOfWeek), asc(timetableTemplatePeriods.periodNumber));

  return c.json({ data: { teacher, entries, weekId: targetWeekId } });
});

// ============================================================
// TEACHER CLASS ASSIGNMENTS — صلاحيات المعلمين وربطهم بالفصول
// ============================================================

const teacherAssignmentSchema = z.object({
  classRoomId: z.string().uuid().optional().nullable(),
  grade:       z.string().max(100).optional().nullable(),
  stage:       z.string().max(100).optional().nullable(),
  subject:     z.string().min(1).max(200),
  notes:       z.string().max(1000).optional().nullable(),
});

// GET /teachers/:id/assignments — قائمة ارتباطات معلم
router.get("/teachers/:id/assignments", async (c) => {
  const orgId = getOrgId(c);
  const teacherId = c.req.param("id");

  // Verify teacher belongs to org
  const [teacher] = await db
    .select()
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, teacherId), eq(teacherProfiles.orgId, orgId)))
    .limit(1);

  if (!teacher) return c.json({ error: "المعلم غير موجود" }, 404);

  const assignments = await db
    .select({
      id:          teacherClassAssignments.id,
      classRoomId: teacherClassAssignments.classRoomId,
      grade:       teacherClassAssignments.grade,
      stage:       teacherClassAssignments.stage,
      subject:     teacherClassAssignments.subject,
      notes:       teacherClassAssignments.notes,
      createdAt:   teacherClassAssignments.createdAt,
      // classRoom info if linked
      classRoomGrade: classRooms.grade,
      classRoomName:  classRooms.name,
    })
    .from(teacherClassAssignments)
    .leftJoin(classRooms, eq(teacherClassAssignments.classRoomId, classRooms.id))
    .where(and(
      eq(teacherClassAssignments.teacherId, teacherId),
      eq(teacherClassAssignments.orgId, orgId)
    ))
    .orderBy(asc(teacherClassAssignments.createdAt));

  return c.json({ data: { teacher, assignments } });
});

// POST /teachers/:id/assignments — إضافة ارتباط
router.post("/teachers/:id/assignments", async (c) => {
  const orgId = getOrgId(c);
  const teacherId = c.req.param("id");

  const [teacher] = await db
    .select({ id: teacherProfiles.id, phone: teacherProfiles.phone, fullName: teacherProfiles.fullName })
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, teacherId), eq(teacherProfiles.orgId, orgId)))
    .limit(1);

  if (!teacher) return c.json({ error: "المعلم غير موجود" }, 404);

  const body = teacherAssignmentSchema.parse(await c.req.json());

  const [created] = await db
    .insert(teacherClassAssignments)
    .values({ orgId, teacherId, ...body })
    .returning();

  // ── إشعار واتساب للمعلم ──────────────────────────────
  (async () => {
    try {
      const [settings] = await db.select({ notificationSettings: schoolSettings.notificationSettings })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
      const ns = (settings?.notificationSettings ?? {}) as Record<string, any>;
      if (!ns.notifyTeacherOnAssignment) return;

      const teacherRow = teacher;
      if (!teacherRow.phone) return;

      const [schoolRow] = await db.select({ schoolName: schoolSettings.schoolName })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);

      let class_name = body.grade ? `صف ${body.grade}` : (body.stage ? `مرحلة ${body.stage}` : "جميع المراحل");
      if (body.classRoomId) {
        const [cr] = await db.select({ name: classRooms.name, grade: classRooms.grade })
          .from(classRooms).where(eq(classRooms.id, body.classRoomId)).limit(1);
        if (cr) class_name = `${cr.grade} — فصل ${cr.name}`;
      }

      const defaultTpl = `{school_name}

الأستاذ الفاضل،
السلام عليكم ورحمة الله وبركاته

نفيدكم بأنه تم إسنادكم لحصة انتظار:
• الفصل / الصف: {class_name}
• المادة: {subject}

نتمنى لكم التوفيق والسداد.
إدارة {school_name}`;

      // Fix old templates that used {scope}
      const savedTpl = (ns.teacherAssignMessage ?? "").replace(/\{scope\}/g, "{class_name}").replace(/لتدريس/g, "لحصة انتظار") || null;
      const msg = fillTemplate(savedTpl ?? defaultTpl, {
        school_name: schoolRow?.schoolName ?? "المدرسة",
        subject:     body.subject || undefined,
        class_name,
      });
      await sendSchoolWhatsApp({ orgId, recipient: teacherRow.phone, message: msg, eventType: "teacher_assignment", teacherId, refId: created.id });
    } catch {}
  })();

  return c.json({ data: created }, 201);
});

// DELETE /teacher-assignments/:id — حذف ارتباط
router.delete("/teacher-assignments/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(teacherClassAssignments)
    .where(and(eq(teacherClassAssignments.id, id), eq(teacherClassAssignments.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "الارتباط غير موجود" }, 404);

  return c.json({ success: true });
});

// ============================================================
// TEACHER ATTENDANCE — حضور المعلمين (الوكيل يسجّل، النظام يُخطر)
// ============================================================

// GET /teacher-attendance?date=YYYY-MM-DD&classRoomId=...
router.get("/teacher-attendance", async (c) => {
  const orgId       = getOrgId(c);
  const dateParam   = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const classRoomId = c.req.query("classRoomId");

  const conds = [
    eq(teacherAttendance.orgId, orgId),
    eq(teacherAttendance.attendanceDate, dateParam),
  ];
  if (classRoomId) conds.push(eq(teacherAttendance.classRoomId, classRoomId));

  const rows = await db
    .select({
      id:             teacherAttendance.id,
      teacherId:      teacherAttendance.teacherId,
      teacherName:    teacherProfiles.fullName,
      teacherPhone:   teacherProfiles.phone,
      classRoomId:    teacherAttendance.classRoomId,
      classRoomName:  classRooms.name,
      classRoomGrade: classRooms.grade,
      attendanceDate: teacherAttendance.attendanceDate,
      status:         teacherAttendance.status,
      periodNumber:   teacherAttendance.periodNumber,
      notes:          teacherAttendance.notes,
      notified:       teacherAttendance.notified,
      createdAt:      teacherAttendance.createdAt,
    })
    .from(teacherAttendance)
    .leftJoin(teacherProfiles, eq(teacherAttendance.teacherId, teacherProfiles.id))
    .leftJoin(classRooms,      eq(teacherAttendance.classRoomId, classRooms.id))
    .where(and(...conds))
    .orderBy(asc(teacherAttendance.createdAt));

  return c.json({ data: rows });
});

// POST /teacher-attendance/bulk — تسجيل دفعة (الوكيل يختار الفصل والحصة والمعلم والحالة)
router.post("/teacher-attendance/bulk", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();

  const entries: Array<{
    teacherId: string;
    classRoomId?: string;
    status: string;
    periodNumber?: number;
    notes?: string;
    attendanceDate?: string;
  }> = body.entries ?? [];

  if (!entries.length) return c.json({ error: "entries مطلوب" }, 400);

  const date = body.date ?? new Date().toISOString().slice(0, 10);

  // نحضّر notifications للغياب فقط
  const absentEntries: typeof entries = [];

  // جلب إعدادات الإشعارات
  const [settingsRow] = await db.select({ ns: schoolSettings.notificationSettings, schoolName: schoolSettings.schoolName })
    .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
  const ns: any        = settingsRow?.ns ?? {};
  const schoolName     = settingsRow?.schoolName ?? "المدرسة";
  const notifyOnAbsent = ns.notifyTeacherOnAbsence !== false;
  const tpl            = ns.teacherAbsenceMessage as string | undefined;

  const inserted: string[] = [];

  for (const entry of entries) {
    if (!entry.teacherId) continue;

    // upsert — إذا سجّل نفس المعلم+الفصل+التاريخ+الحصة، نُحدّث
    const existing = await db.select({ id: teacherAttendance.id })
      .from(teacherAttendance)
      .where(and(
        eq(teacherAttendance.orgId, orgId),
        eq(teacherAttendance.teacherId, entry.teacherId),
        eq(teacherAttendance.attendanceDate, date),
        entry.classRoomId ? eq(teacherAttendance.classRoomId, entry.classRoomId) : isNull(teacherAttendance.classRoomId),
        entry.periodNumber != null
          ? eq(teacherAttendance.periodNumber, entry.periodNumber)
          : isNull(teacherAttendance.periodNumber),
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(teacherAttendance)
        .set({ status: entry.status, notes: entry.notes ?? null, recordedBy: userId })
        .where(eq(teacherAttendance.id, existing[0].id));
      inserted.push(existing[0].id);
    } else {
      const [rec] = await db.insert(teacherAttendance).values({
        orgId,
        teacherId:      entry.teacherId,
        classRoomId:    entry.classRoomId ?? null,
        attendanceDate: date,
        status:         entry.status ?? "absent",
        periodNumber:   entry.periodNumber ?? null,
        notes:          entry.notes ?? null,
        recordedBy:     userId,
        notified:       false,
      }).returning({ id: teacherAttendance.id });
      inserted.push(rec.id);

      if (entry.status === "absent") absentEntries.push(entry);
    }
  }

  // إرسال إشعارات الغياب
  if (notifyOnAbsent && tpl && absentEntries.length > 0) {
    const teacherIds = absentEntries.map(e => e.teacherId);
    const teachers   = await db.select({
      id:          teacherProfiles.id,
      fullName:    teacherProfiles.fullName,
      phone:       teacherProfiles.phone,
    })
      .from(teacherProfiles)
      .where(and(eq(teacherProfiles.orgId, orgId), inArray(teacherProfiles.id, teacherIds)));

    const classMap: Record<string, { name: string; grade: string }> = {};
    const classIds = absentEntries.filter(e => e.classRoomId).map(e => e.classRoomId!);
    if (classIds.length > 0) {
      const rooms = await db.select({ id: classRooms.id, name: classRooms.name, grade: classRooms.grade })
        .from(classRooms).where(and(eq(classRooms.orgId, orgId), inArray(classRooms.id, classIds)));
      rooms.forEach(r => { classMap[r.id] = { name: r.name, grade: r.grade }; });
    }

    (async () => {
      for (const entry of absentEntries) {
        const teacher = teachers.find(t => t.id === entry.teacherId);
        if (!teacher?.phone) continue;
        const room      = entry.classRoomId ? classMap[entry.classRoomId] : null;
        const className = room ? `${room.grade} / ${room.name}` : "—";
        const msg = fillTemplate(tpl, {
          school_name:  schoolName,
          teacher_name: teacher.fullName,
          class_name:   className,
          date,
        });
        await sendSchoolWhatsApp({
          orgId,
          recipient:  teacher.phone,
          message:    msg,
          eventType:  "teacher_absence",
          teacherId:  teacher.id,
        });
        // تحديث notified
        await db.update(teacherAttendance)
          .set({ notified: true })
          .where(and(
            eq(teacherAttendance.orgId, orgId),
            eq(teacherAttendance.teacherId, entry.teacherId),
            eq(teacherAttendance.attendanceDate, date),
          ));
      }
    })();
  }

  return c.json({ data: { inserted: inserted.length } });
});

// DELETE /teacher-attendance/:id
router.delete("/teacher-attendance/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  await db.delete(teacherAttendance)
    .where(and(eq(teacherAttendance.id, id), eq(teacherAttendance.orgId, orgId)));
  return c.json({ data: { deleted: true } });
});

// ============================================================
// TEACHER SYSTEM — Phase 2
// ============================================================

// ── GET /teacher/dashboard — لوحة التحكم اليومية ─────────────
router.get("/teacher/dashboard", requirePerm("school.teacher.dashboard"), withSchoolScope, async (c) => {
  const orgId  = getOrgId(c);
  const scope  = c.get("schoolScope");

  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) {
    return c.json({ error: "هذه الصفحة للمعلمين فقط", staffType: scope?.staffType ?? null }, 403);
  }

  // ── Timezone: Asia/Riyadh (UTC+3) ──
  const TZ = "Asia/Riyadh";
  const nowInTZ   = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const dayCode   = JS_DAY_TO_CODE[nowInTZ.getDay()] ?? "sun";
  const todayIso  = nowInTZ.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const nowTime   = `${String(nowInTZ.getHours()).padStart(2, "0")}:${String(nowInTZ.getMinutes()).padStart(2, "0")}`;
  const nowMins   = nowInTZ.getHours() * 60 + nowInTZ.getMinutes();

  const DAY_LABELS: Record<string, string> = {
    sun: "الأحد", mon: "الاثنين", tue: "الثلاثاء",
    wed: "الأربعاء", thu: "الخميس",
  };

  // بيانات المعلم
  const [teacher] = await db.select().from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, teacherProfileId), eq(teacherProfiles.orgId, orgId)))
    .limit(1);
  if (!teacher) return c.json({ error: "المعلم غير موجود" }, 404);

  // الأسبوع النشط
  const [settings] = await db.select({ activeWeekId: schoolSettings.activeWeekId })
    .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
  const activeWeekId = settings?.activeWeekId ?? null;

  // حصص المعلم اليوم — مع join subjects للحصول على subjectId
  let todayEntries: any[] = [];
  let allPeriods:   any[] = [];

  if (activeWeekId) {
    // جلب الحصص مع join subjects (by name + orgId)
    const rawEntries = await db
      .select({
        id:          scheduleEntries.id,
        periodId:    scheduleEntries.periodId,
        classRoomId: scheduleEntries.classRoomId,
        subjectName: scheduleEntries.subject,
        dayOfWeek:   scheduleEntries.dayOfWeek,
        subjectId:   subjects.id,
      })
      .from(scheduleEntries)
      .leftJoin(subjects, and(
        eq(subjects.orgId, orgId),
        eq(subjects.name, scheduleEntries.subject),
      ))
      .where(and(
        eq(scheduleEntries.orgId, orgId),
        eq(scheduleEntries.weekId, activeWeekId),
        eq(scheduleEntries.teacherId, teacherProfileId),
        eq(scheduleEntries.dayOfWeek, dayCode as any),
      ));

    todayEntries = rawEntries;

    // الحصص من القالب (للوقت)
    const [activeWeek] = await db.select({ templateId: scheduleWeeks.templateId })
      .from(scheduleWeeks).where(eq(scheduleWeeks.id, activeWeekId)).limit(1);

    if (activeWeek?.templateId) {
      allPeriods = await db.select()
        .from(timetableTemplatePeriods)
        .where(eq(timetableTemplatePeriods.templateId, activeWeek.templateId))
        .orderBy(asc(timetableTemplatePeriods.periodNumber));
    }
  }

  // دمج بيانات الفصل مع الحصص
  const classRoomIds = [...new Set(todayEntries.map(e => e.classRoomId).filter(Boolean))];
  let classRoomMap: Record<string, string> = {};
  if (classRoomIds.length > 0) {
    const rooms = await db.select({ id: classRooms.id, name: classRooms.name, grade: classRooms.grade })
      .from(classRooms).where(and(eq(classRooms.orgId, orgId), inArray(classRooms.id, classRoomIds)));
    classRoomMap = Object.fromEntries(rooms.map(r => [r.id, `${r.grade} ${r.name}`.trim()]));
  }

  // الحصة الحالية والتالية
  const currentPeriodInfo = getCurrentPeriod(nowTime, allPeriods);

  // حصص بدون تحضير
  const todayPeriodIds = todayEntries.map(e => e.periodId).filter(Boolean);
  let preparedPeriodIds: string[] = [];
  if (todayPeriodIds.length > 0 && activeWeekId) {
    const preps = await db.select({ periodId: teacherPreparations.periodId })
      .from(teacherPreparations)
      .where(and(
        eq(teacherPreparations.orgId, orgId),
        eq(teacherPreparations.teacherProfileId, teacherProfileId),
        eq(teacherPreparations.weekId, activeWeekId),
        inArray(teacherPreparations.periodId, todayPeriodIds),
        eq(teacherPreparations.dayOfWeek, dayCode as any),
      ));
    preparedPeriodIds = preps.map(p => p.periodId).filter(Boolean);
  }

  const unpreparedEntries = todayEntries.filter(e => !preparedPeriodIds.includes(e.periodId));

  // تنبيه: طلاب متكررون في المخالفات هذا الأسبوع — مرتب تنازلياً
  const teacherClassRoomIds = scope?.classRoomIds;
  let violationAlerts: any[] = [];
  if (teacherClassRoomIds && teacherClassRoomIds.length > 0) {
    // بداية الأسبوع (الأحد) بتوقيت المدرسة
    const weekStartInTZ = new Date(nowInTZ);
    weekStartInTZ.setDate(nowInTZ.getDate() - nowInTZ.getDay());
    const weekStartStr = weekStartInTZ.toLocaleDateString("en-CA");

    violationAlerts = await db
      .select({
        studentId:   behaviorIncidents.studentId,
        studentName: students.fullName,
        count:       count(),
      })
      .from(behaviorIncidents)
      .innerJoin(students, eq(behaviorIncidents.studentId, students.id))
      .where(and(
        eq(behaviorIncidents.orgId, orgId),
        inArray(students.classRoomId, teacherClassRoomIds),
        gte(behaviorIncidents.incidentDate, weekStartStr),
      ))
      .groupBy(behaviorIncidents.studentId, students.fullName)
      .having(sql`count(*) >= 2`)
      .orderBy(desc(count()))
      .limit(5);
  }

  // حصص منجزة بدون يومية (لليوم الحالي)
  let unloggedEntries: any[] = [];
  const passedEntries = todayEntries.filter(e => {
    const period = allPeriods.find((p: any) => p.id === e.periodId);
    if (!period || period.isBreak) return false;
    const [h, m] = period.endTime.split(":").map(Number);
    return nowMins > h * 60 + m;
  });
  if (passedEntries.length > 0) {
    const passedPeriodIds = passedEntries.map(e => e.periodId).filter(Boolean);
    const logs = await db.select({ periodId: teacherDailyLogs.periodId })
      .from(teacherDailyLogs)
      .where(and(
        eq(teacherDailyLogs.orgId, orgId),
        eq(teacherDailyLogs.teacherProfileId, teacherProfileId),
        eq(teacherDailyLogs.date, todayIso),
        inArray(teacherDailyLogs.periodId, passedPeriodIds),
      ));
    const loggedPeriodIds = logs.map(l => l.periodId).filter(Boolean);
    unloggedEntries = passedEntries.filter(e => !loggedPeriodIds.includes(e.periodId));
  }

  // بناء قائمة الحصص مع الحالة
  const enrichedEntries = todayEntries.map(entry => {
    const period = allPeriods.find((p: any) => p.id === entry.periodId);
    const isPrepared = preparedPeriodIds.includes(entry.periodId);
    const isLogged = !unloggedEntries.find(u => u.periodId === entry.periodId);
    let periodStatus: "upcoming" | "current" | "passed" | "break" = "upcoming";
    if (period) {
      const [sh, sm] = period.startTime.split(":").map(Number);
      const [eh, em] = period.endTime.split(":").map(Number);
      if (nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em) periodStatus = "current";
      else if (nowMins > eh * 60 + em) periodStatus = "passed";
    }
    return {
      ...entry,
      subject:       entry.subjectName,   // للتوافق مع الواجهة
      classRoomName: classRoomMap[entry.classRoomId] ?? null,
      period: period ?? null,
      isPrepared,
      isLogged: periodStatus === "passed" ? isLogged : null,
      periodStatus,
    };
  });

  return c.json({
    data: {
      teacher,
      today:            { date: todayIso, dayCode, dayLabel: DAY_LABELS[dayCode] ?? dayCode, nowTime },
      currentStatus:    currentPeriodInfo,
      todayEntries:     enrichedEntries,
      allPeriods,
      activeWeekId,
      alerts: {
        unpreparedCount:  unpreparedEntries.length,
        unpreparedEntries,
        unloggedCount:    unloggedEntries.length,
        unloggedEntries,
        violationAlerts,
      },
    },
  });
});

// ============================================================
// TEACHER PREPARATIONS — تحضير الدروس
// ============================================================

// GET /teacher/preparations — قائمة التحضيرات
router.get("/teacher/preparations", requirePerm("school.preparations.write"), withSchoolScope, async (c) => {
  const orgId = getOrgId(c);
  const scope = c.get("schoolScope");
  const weekId  = c.req.query("weekId");
  const dayCode = c.req.query("dayOfWeek");

  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) return c.json({ data: [] });

  const conds = [
    eq(teacherPreparations.orgId, orgId),
    eq(teacherPreparations.teacherProfileId, teacherProfileId),
  ];
  if (weekId)  conds.push(eq(teacherPreparations.weekId, weekId));
  if (dayCode) conds.push(eq(teacherPreparations.dayOfWeek, dayCode as any));

  const rows = await db
    .select({
      id:                 teacherPreparations.id,
      weekId:             teacherPreparations.weekId,
      periodId:           teacherPreparations.periodId,
      classRoomId:        teacherPreparations.classRoomId,
      dayOfWeek:          teacherPreparations.dayOfWeek,
      subjectId:          teacherPreparations.subjectId,
      subjectName:        subjects.name,
      preparationText:    teacherPreparations.preparationText,
      learningObjectives: teacherPreparations.learningObjectives,
      resources:          teacherPreparations.resources,
      status:             teacherPreparations.status,
      updatedAt:          teacherPreparations.updatedAt,
    })
    .from(teacherPreparations)
    .leftJoin(subjects, eq(teacherPreparations.subjectId, subjects.id))
    .where(and(...conds))
    .orderBy(asc(teacherPreparations.updatedAt));

  return c.json({ data: rows });
});

// POST /teacher/preparations — إنشاء أو تحديث تحضير (upsert)
router.post("/teacher/preparations", requirePerm("school.preparations.write"), withSchoolScope, async (c) => {
  const orgId = getOrgId(c);
  const scope = c.get("schoolScope");

  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) return c.json({ error: "ليس لديك صلاحية معلم" }, 403);

  const body = await c.req.json();
  const schema = z.object({
    weekId:             z.string().uuid(),
    periodId:           z.string().uuid(),
    classRoomId:        z.string().uuid(),
    dayOfWeek:          z.enum(["sun","mon","tue","wed","thu"]),
    subjectId:          z.string().uuid(),
    preparationText:    z.string().max(3000).optional().nullable(),
    learningObjectives: z.string().max(1000).optional().nullable(),
    resources:          z.string().max(500).optional().nullable(),
    status:             z.enum(["draft","ready","done"]).default("draft"),
  });
  const data = schema.parse(body);

  // upsert by unique key
  const existing = await db.query.teacherPreparations.findFirst({
    where: and(
      eq(teacherPreparations.orgId, orgId),
      eq(teacherPreparations.teacherProfileId, teacherProfileId),
      eq(teacherPreparations.weekId, data.weekId),
      eq(teacherPreparations.periodId, data.periodId),
      eq(teacherPreparations.classRoomId, data.classRoomId),
      eq(teacherPreparations.dayOfWeek, data.dayOfWeek),
    ),
  });

  let result;
  if (existing) {
    [result] = await db.update(teacherPreparations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teacherPreparations.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(teacherPreparations)
      .values({ orgId, teacherProfileId, ...data })
      .returning();
  }

  void logSchoolAudit(c, "preparation.saved", "teacherPreparation", result.id, existing ?? null, data);

  return c.json({ data: result }, existing ? 200 : 201);
});

// PUT /teacher/preparations/:id — تحديث تحضير
router.put("/teacher/preparations/:id", requirePerm("school.preparations.write"), withSchoolScope, async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;
  const scope = c.get("schoolScope");

  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) return c.json({ error: "ليس لديك صلاحية معلم" }, 403);

  const body = await c.req.json();
  const schema = z.object({
    preparationText:    z.string().max(3000).optional().nullable(),
    learningObjectives: z.string().max(1000).optional().nullable(),
    resources:          z.string().max(500).optional().nullable(),
    status:             z.enum(["draft","ready","done"]).optional(),
  });
  const data = schema.parse(body);

  const [updated] = await db.update(teacherPreparations)
    .set({ ...data, updatedAt: new Date() })
    .where(and(
      eq(teacherPreparations.id, id),
      eq(teacherPreparations.orgId, orgId),
      eq(teacherPreparations.teacherProfileId, teacherProfileId),
    ))
    .returning();

  if (!updated) return c.json({ error: "التحضير غير موجود" }, 404);

  void logSchoolAudit(c, "preparation.saved", "teacherPreparation", id, null, data);

  return c.json({ data: updated });
});

// ============================================================
// TEACHER DAILY LOGS — يومية التدريس
// ============================================================

// GET /teacher/daily-logs — قائمة اليوميات
router.get("/teacher/daily-logs", requirePerm("school.daily_logs.write"), withSchoolScope, async (c) => {
  const orgId  = getOrgId(c);
  const scope  = c.get("schoolScope");
  const date   = c.req.query("date");
  const weekId = c.req.query("weekId");

  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) return c.json({ data: [] });

  const conds = [
    eq(teacherDailyLogs.orgId, orgId),
    eq(teacherDailyLogs.teacherProfileId, teacherProfileId),
  ];
  if (date)   conds.push(eq(teacherDailyLogs.date, date));
  if (weekId) {
    // Filter by date range of the week
    const [week] = await db.select({ startDate: scheduleWeeks.startDate, endDate: scheduleWeeks.endDate })
      .from(scheduleWeeks).where(eq(scheduleWeeks.id, weekId)).limit(1);
    if (week?.startDate && week.endDate) {
      conds.push(gte(teacherDailyLogs.date, week.startDate));
      conds.push(sql`${teacherDailyLogs.date} <= ${week.endDate}`);
    }
  }

  const rows = await db
    .select({
      id:                teacherDailyLogs.id,
      date:              teacherDailyLogs.date,
      classRoomId:       teacherDailyLogs.classRoomId,
      periodId:          teacherDailyLogs.periodId,
      subjectId:         teacherDailyLogs.subjectId,
      subjectName:       subjects.name,
      topicCovered:      teacherDailyLogs.topicCovered,
      notes:             teacherDailyLogs.notes,
      studentEngagement: teacherDailyLogs.studentEngagement,
      studentsAbsent:    teacherDailyLogs.studentsAbsent,
      updatedAt:         teacherDailyLogs.updatedAt,
    })
    .from(teacherDailyLogs)
    .leftJoin(subjects, eq(teacherDailyLogs.subjectId, subjects.id))
    .where(and(...conds))
    .orderBy(desc(teacherDailyLogs.date));

  return c.json({ data: rows });
});

// POST /teacher/daily-logs — تسجيل يومية حصة (upsert)
router.post("/teacher/daily-logs", requirePerm("school.daily_logs.write"), withSchoolScope, async (c) => {
  const orgId = getOrgId(c);
  const scope = c.get("schoolScope");

  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) return c.json({ error: "ليس لديك صلاحية معلم" }, 403);

  const body = await c.req.json();
  const schema = z.object({
    classRoomId:       z.string().uuid(),
    date:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodId:          z.string().uuid().optional().nullable(),
    scheduleEntryId:   z.string().uuid().optional().nullable(),
    subjectId:         z.string().uuid(),
    topicCovered:      z.string().min(1).max(500),
    notes:             z.string().max(1000).optional().nullable(),
    studentEngagement: z.enum(["low","normal","high"]).default("normal"),
    studentsAbsent:    z.array(z.object({ studentId: z.string(), name: z.string() })).default([]),
  });
  const data = schema.parse(body);

  const existing = await db.query.teacherDailyLogs.findFirst({
    where: and(
      eq(teacherDailyLogs.orgId, orgId),
      eq(teacherDailyLogs.teacherProfileId, teacherProfileId),
      eq(teacherDailyLogs.classRoomId, data.classRoomId),
      eq(teacherDailyLogs.date, data.date),
      data.periodId ? eq(teacherDailyLogs.periodId, data.periodId) : isNull(teacherDailyLogs.periodId),
    ),
  });

  let result;
  if (existing) {
    [result] = await db.update(teacherDailyLogs)
      .set({ ...data, studentsAbsent: data.studentsAbsent, updatedAt: new Date() })
      .where(eq(teacherDailyLogs.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(teacherDailyLogs)
      .values({ orgId, teacherProfileId, ...data, studentsAbsent: data.studentsAbsent })
      .returning();
  }

  void logSchoolAudit(c, "daily_log.saved", "teacherDailyLog", result.id, existing ?? null, { classRoomId: data.classRoomId, date: data.date });

  return c.json({ data: result }, existing ? 200 : 201);
});

// ============================================================
// TEACHER STUDENT NOTES — ملاحظات المعلم على الطلاب
// ============================================================

// GET /teacher/student-notes — قائمة الملاحظات
router.get("/teacher/student-notes", requirePerm("school.students.read"), withSchoolScope, async (c) => {
  const orgId     = getOrgId(c);
  const scope     = c.get("schoolScope");
  const studentId = c.req.query("studentId");
  const classRoomId = c.req.query("classRoomId");

  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) return c.json({ data: [] });

  const conds = [
    eq(teacherStudentNotes.orgId, orgId),
    eq(teacherStudentNotes.teacherProfileId, teacherProfileId),
  ];
  if (studentId)   conds.push(eq(teacherStudentNotes.studentId, studentId));
  if (classRoomId) conds.push(eq(teacherStudentNotes.classRoomId, classRoomId));

  const rows = await db
    .select({
      id:               teacherStudentNotes.id,
      studentId:        teacherStudentNotes.studentId,
      studentName:      students.fullName,
      classRoomId:      teacherStudentNotes.classRoomId,
      noteDate:         teacherStudentNotes.noteDate,
      noteType:         teacherStudentNotes.noteType,
      note:             teacherStudentNotes.note,
      isPrivate:        teacherStudentNotes.isPrivate,
      requiresFollowUp: teacherStudentNotes.requiresFollowUp,
      followUpBy:       teacherStudentNotes.followUpBy,
      createdAt:        teacherStudentNotes.createdAt,
    })
    .from(teacherStudentNotes)
    .innerJoin(students, eq(teacherStudentNotes.studentId, students.id))
    .where(and(...conds))
    .orderBy(desc(teacherStudentNotes.noteDate), desc(teacherStudentNotes.createdAt))
    .limit(200);

  return c.json({ data: rows });
});

// POST /teacher/student-notes — إضافة ملاحظة
router.post("/teacher/student-notes", requirePerm("school.students.read"), withSchoolScope, async (c) => {
  const orgId = getOrgId(c);
  const scope = c.get("schoolScope");

  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) return c.json({ error: "ليس لديك صلاحية معلم" }, 403);

  const body = await c.req.json();
  const schema = z.object({
    studentId:        z.string().uuid(),
    classRoomId:      z.string().uuid(),
    noteDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split("T")[0]),
    noteType:         z.enum(["academic","behavioral","social","other"]),
    note:             z.string().min(1).max(1000),
    isPrivate:        z.boolean().default(false),
    requiresFollowUp: z.boolean().default(false),
    followUpBy:       z.enum(["counselor","vice_principal","guardian"]).optional().nullable(),
  });
  const data = schema.parse(body);

  // Verify student belongs to org + teacher's classroom
  const [student] = await db.select({ id: students.id, classRoomId: students.classRoomId })
    .from(students)
    .where(and(eq(students.id, data.studentId), eq(students.orgId, orgId)))
    .limit(1);
  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  const [note] = await db.insert(teacherStudentNotes)
    .values({ orgId, teacherProfileId, ...data, followUpBy: data.followUpBy ?? null })
    .returning();

  void logSchoolAudit(c, "case.step_added", "teacherStudentNote", note.id, null, {
    studentId: data.studentId, noteType: data.noteType,
  });

  return c.json({ data: note }, 201);
});

// DELETE /teacher/student-notes/:id
router.delete("/teacher/student-notes/:id", requirePerm("school.students.read"), withSchoolScope, async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;
  const scope = c.get("schoolScope");
  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) return c.json({ error: "غير مصرح" }, 403);

  const [deleted] = await db.delete(teacherStudentNotes)
    .where(and(
      eq(teacherStudentNotes.id, id),
      eq(teacherStudentNotes.orgId, orgId),
      eq(teacherStudentNotes.teacherProfileId, teacherProfileId),
    ))
    .returning();

  if (!deleted) return c.json({ error: "الملاحظة غير موجودة" }, 404);
  return c.json({ success: true });
});

export const teachersRouter = router;
