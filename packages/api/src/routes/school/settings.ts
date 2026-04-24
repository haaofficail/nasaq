import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, count, sql, inArray, isNull } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  schoolSettings,
  classRooms,
  students,
  teacherProfiles,
  timetableTemplates,
  timetableTemplatePeriods,
  scheduleWeeks,
  teacherClassAssignments,
  schoolWhatsappLogs,
  jobTitles,
  jobTitlePermissions,
  schoolImportLogs,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../../lib/helpers";
import { requirePerm } from "../../middleware/auth";
import { isWhatsAppConfigured, whatsAppProvider } from "../../lib/whatsapp";
import { initBaileys, getBaileysState, logoutBaileys, hasSavedSession } from "../../lib/whatsappBaileys";
import { sendSchoolWhatsApp, fillTemplate, normalizeGrade, schoolSettingsSchema, activeWeekSchema, classRoomSchema } from "./shared";
import type { SchoolEnv } from "../../middleware/school";

const router = new Hono<SchoolEnv>();

// ============================================================
// SCHOOL SETTINGS
// ============================================================

router.get("/settings", requirePerm("school.students.read"), async (c) => {
  const orgId = getOrgId(c);

  const [settings] = await db
    .select()
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  return c.json({ data: settings ?? null });
});

router.post("/settings", requirePerm("school.settings.manage"), async (c) => {
  const orgId = getOrgId(c);
  const body = schoolSettingsSchema.parse(await c.req.json());

  const [existing] = await db
    .select({ id: schoolSettings.id })
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(schoolSettings)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(schoolSettings.id, existing.id), eq(schoolSettings.orgId, orgId)))
      .returning();
    return c.json({ data: updated });
  }

  const [created] = await db
    .insert(schoolSettings)
    .values({ orgId, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

// PATCH /settings/timing — حفظ توقيت الدوام فقط (بدون حاجة لاسم المدرسة)
router.patch("/settings/timing", requirePerm("school.settings.manage"), async (c) => {
  const orgId = getOrgId(c);
  const timingSchema = z.object({
    sessionStartTime:      z.string().max(10).optional().nullable(),
    sessionEndTime:        z.string().max(10).optional().nullable(),
    periodDurationMinutes: z.coerce.number().int().min(20).max(120).optional().nullable(),
    breakDurationMinutes:  z.coerce.number().int().min(5).max(60).optional().nullable(),
    numberOfPeriods:       z.coerce.number().int().min(1).max(15).optional().nullable(),
    sessionType:           z.enum(["winter", "summer", "ramadan"]).optional().nullable(),
  });
  const body = timingSchema.parse(await c.req.json());

  const [existing] = await db
    .select({ id: schoolSettings.id })
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(schoolSettings)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(schoolSettings.id, existing.id), eq(schoolSettings.orgId, orgId)))
      .returning();
    return c.json({ data: updated });
  }

  // إنشاء السجل إذا لم يوجد مع قيم افتراضية
  const [created] = await db
    .insert(schoolSettings)
    .values({ orgId, schoolName: "", ...body })
    .returning();
  return c.json({ data: created }, 201);
});

router.patch("/settings/active-week", async (c) => {
  const orgId = getOrgId(c);
  const { activeWeekId } = activeWeekSchema.parse(await c.req.json());

  const [existing] = await db
    .select({ id: schoolSettings.id })
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  if (!existing) return c.json({ error: "لم يتم إعداد المدرسة بعد" }, 404);

  const [updated] = await db
    .update(schoolSettings)
    .set({ activeWeekId, updatedAt: new Date() })
    .where(and(eq(schoolSettings.id, existing.id), eq(schoolSettings.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// ============================================================
// CLASS ROOMS
// ============================================================

router.get("/class-rooms", async (c) => {
  const orgId = getOrgId(c);

  // Get classrooms with student count in one query
  const result = await db
    .select({
      id:          classRooms.id,
      orgId:       classRooms.orgId,
      grade:       classRooms.grade,
      name:        classRooms.name,
      capacity:    classRooms.capacity,
      isActive:    classRooms.isActive,
      createdAt:   classRooms.createdAt,
      updatedAt:   classRooms.updatedAt,
      studentCount: sql<number>`CAST(COUNT(${students.id}) AS INTEGER)`,
    })
    .from(classRooms)
    .leftJoin(students, and(eq(students.classRoomId, classRooms.id), eq(students.orgId, orgId)))
    .where(eq(classRooms.orgId, orgId))
    .groupBy(classRooms.id)
    .orderBy(asc(classRooms.grade), asc(classRooms.name));

  return c.json({ data: result });
});

router.post("/class-rooms", async (c) => {
  const orgId = getOrgId(c);
  const body = classRoomSchema.parse(await c.req.json());

  const [created] = await db
    .insert(classRooms)
    .values({ orgId, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/class-rooms/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = classRoomSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select({ id: classRooms.id })
    .from(classRooms)
    .where(and(eq(classRooms.id, id), eq(classRooms.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الفصل غير موجود" }, 404);

  const [updated] = await db
    .update(classRooms)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(classRooms.id, id), eq(classRooms.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

router.delete("/class-rooms/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [existing] = await db
    .select({ id: classRooms.id })
    .from(classRooms)
    .where(and(eq(classRooms.id, id), eq(classRooms.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الفصل غير موجود" }, 404);

  const [{ studentCount }] = await db
    .select({ studentCount: count() })
    .from(students)
    .where(and(eq(students.classRoomId, id), eq(students.orgId, orgId)));

  if (Number(studentCount) > 0) {
    return c.json({ error: "لا يمكن حذف الفصل لأنه يحتوي على طلاب" }, 409);
  }

  await db
    .delete(classRooms)
    .where(and(eq(classRooms.id, id), eq(classRooms.orgId, orgId)));

  return c.json({ success: true });
});

// ============================================================
// SETUP WIZARD — معالج التهيئة
// ============================================================

// Helper: convert Arabic/Western digit string to Arabic digits
function toArabicNum(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

const STAGE_GRADES: Record<string, string[]> = {
  "ابتدائي": [
    "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي",
    "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
  ],
  "متوسط": ["الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط"],
  "ثانوي": ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي"],
};

const DEFAULT_SUBJECTS_BY_STAGE: Record<string, string[]> = {
  "ابتدائي": ["رياضيات", "علوم", "لغتي", "دراسات إسلامية", "دراسات اجتماعية", "إنجليزي", "مهارات رقمية", "تربية فنية", "تربية بدنية"],
  "متوسط":  ["رياضيات", "علوم", "لغتي", "دراسات إسلامية", "اجتماعيات", "إنجليزي", "مهارات رقمية", "تربية فنية", "تربية بدنية"],
  "ثانوي":  ["رياضيات", "فيزياء", "كيمياء", "أحياء", "اللغة العربية", "دراسات إسلامية", "إنجليزي", "حاسب آلي", "تربية بدنية"],
};

// GET /setup-status — حالة التهيئة
router.get("/setup-status", async (c) => {
  const orgId = getOrgId(c);
  const [settings] = await db
    .select({
      setupStatus: schoolSettings.setupStatus,
      setupStep:   schoolSettings.setupStep,
      schoolName:  schoolSettings.schoolName,
    })
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);
  return c.json({ data: settings ?? { setupStatus: "not_started", setupStep: 0, schoolName: null } });
});

// PUT /setup-status — تحديث خطوة التهيئة
router.put("/setup-status", async (c) => {
  const orgId = getOrgId(c);
  const body  = await c.req.json() as { setupStatus?: string; setupStep?: number };
  await db.update(schoolSettings)
    .set({ setupStatus: body.setupStatus ?? "in_progress", setupStep: body.setupStep ?? 1, updatedAt: new Date() })
    .where(eq(schoolSettings.orgId, orgId));
  return c.json({ success: true });
});

// POST /setup/complete — الإنشاء الكامل للهيكل الدراسي
router.post("/setup/complete", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json() as {
    // Step 1: school info
    schoolName:     string;
    schoolGender:   string;
    educationLevel: string;  // ابتدائي | متوسط | ثانوي
    // Step 2: classrooms per grade
    classroomsPerGrade: Record<string, number>;  // { "الأول المتوسط": 3, ... }
    // Step 3: weeks
    weekCount: number;
    // Step 4: calendar
    calendar: Array<{
      sessionType: "winter" | "summer";
      startDate: string;
      endDate: string;
      dayStartTime: string; // "07:30"
      periodCount: number;
      periodDuration: number; // minutes
      breakDuration: number;  // minutes
      breakAfterPeriod: number;
    }>;
    // Step 5+6: teachers with assignments
    teachers: Array<{
      fullName: string;
      subject:  string;
      classRoomIds: string[];
    }>;
  };

  const results = {
    classrooms: 0, weeks: 0, teachers: 0, assignments: 0, templates: 0, periods: 0,
  };

  // 1. Upsert school settings
  const [existingSettings] = await db.select({ id: schoolSettings.id })
    .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);

  if (existingSettings) {
    await db.update(schoolSettings)
      .set({
        schoolName:     body.schoolName,
        schoolGender:   body.schoolGender,
        educationLevel: body.educationLevel,
        setupStatus:    "completed",
        setupStep:      7,
        updatedAt:      new Date(),
      })
      .where(eq(schoolSettings.orgId, orgId));
  } else {
    await db.insert(schoolSettings).values({
      orgId,
      schoolName:     body.schoolName,
      schoolGender:   body.schoolGender,
      educationLevel: body.educationLevel,
      setupStatus:    "completed",
      setupStep:      7,
    });
  }

  // 2. Create classrooms
  const createdRooms: Record<string, string> = {}; // "grade:name" -> id
  for (const [grade, roomCount] of Object.entries(body.classroomsPerGrade)) {
    for (let i = 1; i <= roomCount; i++) {
      const name = toArabicNum(i);
      try {
        const [room] = await db.insert(classRooms)
          .values({ orgId, grade, name })
          .onConflictDoUpdate({
            target: [classRooms.orgId, classRooms.grade, classRooms.name],
            set: { updatedAt: new Date() },
          })
          .returning({ id: classRooms.id });
        createdRooms[`${grade}:${name}`] = room.id;
        results.classrooms++;
      } catch {}
    }
  }

  // 3+4. Create timetable templates and periods — idempotent (skip if already exists)
  const templateIds: Record<string, string> = {};

  // جلب القوالب الموجودة لتجنب التكرار
  const existingTemplates = await db
    .select({ id: timetableTemplates.id, sessionType: timetableTemplates.sessionType })
    .from(timetableTemplates)
    .where(eq(timetableTemplates.orgId, orgId));
  for (const et of existingTemplates) {
    if (et.sessionType) templateIds[et.sessionType] = et.id;
  }

  for (const cal of body.calendar) {
    // تخطّ إذا كان القالب موجوداً
    if (templateIds[cal.sessionType]) continue;

    const [tmpl] = await db.insert(timetableTemplates).values({
      orgId,
      name:        `جدول ${cal.sessionType === "winter" ? "شتوي" : "صيفي"}`,
      sessionType: cal.sessionType,
      isActive:    true,
    }).returning({ id: timetableTemplates.id });
    templateIds[cal.sessionType] = tmpl.id;
    results.templates++;

    // توليد أوقات الحصص
    const [startH, startM] = cal.dayStartTime.split(":").map(Number);
    let currentMinutes = startH * 60 + startM;
    let periodNum = 1;

    for (let p = 1; p <= cal.periodCount; p++) {
      const startTime = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`;
      currentMinutes += cal.periodDuration;
      const endTime   = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`;

      await db.insert(timetableTemplatePeriods).values({
        orgId,
        templateId:   tmpl.id,
        periodNumber: periodNum++,
        label:        `الحصة ${toArabicNum(p)}`,
        startTime,
        endTime,
        isBreak:      false,
      });
      results.periods++;

      if (p === cal.breakAfterPeriod) {
        const bStart = endTime;
        currentMinutes += cal.breakDuration;
        const bEnd = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`;
        await db.insert(timetableTemplatePeriods).values({
          orgId,
          templateId:   tmpl.id,
          periodNumber: periodNum++,
          label:        "الفسحة",
          startTime:    bStart,
          endTime:      bEnd,
          isBreak:      true,
        });
        results.periods++;
      }
    }

    // إنشاء الأسابيع لهذا القالب
    for (let w = 1; w <= body.weekCount; w++) {
      await db.insert(scheduleWeeks).values({
        orgId,
        templateId: tmpl.id,
        weekNumber: w,
        label:      `الأسبوع ${toArabicNum(w)}`,
        isActive:   w === 1,
      });
      results.weeks++;
    }
  }

  // تحديد activeWeekId — الأولوية: صيفي ثم شتوي ثم أي قالب
  const activeSessionType = templateIds["summer"] ? "summer" : (templateIds["winter"] ? "winter" : null);
  const activeTemplateId  = activeSessionType ? templateIds[activeSessionType] : Object.values(templateIds)[0];
  if (activeTemplateId) {
    const [firstWeek] = await db.select({ id: scheduleWeeks.id })
      .from(scheduleWeeks)
      .where(and(eq(scheduleWeeks.orgId, orgId), eq(scheduleWeeks.templateId, activeTemplateId), eq(scheduleWeeks.weekNumber, 1)))
      .limit(1);
    if (firstWeek) {
      await db.update(schoolSettings)
        .set({ activeWeekId: firstWeek.id, updatedAt: new Date() })
        .where(eq(schoolSettings.orgId, orgId));
    }
  }

  // 5+6. Create teachers and assignments
  for (const t of body.teachers) {
    if (!t.fullName?.trim()) continue;
    const [teacher] = await db.insert(teacherProfiles).values({
      orgId,
      fullName: t.fullName.trim(),
      subject:  t.subject || null,
    }).returning({ id: teacherProfiles.id });
    results.teachers++;

    // Create assignments for each selected classroom
    for (const classRoomId of (t.classRoomIds ?? [])) {
      // Verify classroom belongs to org
      const [room] = await db.select({ id: classRooms.id })
        .from(classRooms)
        .where(and(eq(classRooms.id, classRoomId), eq(classRooms.orgId, orgId)))
        .limit(1);
      if (!room) continue;

      try {
        await db.insert(teacherClassAssignments).values({
          orgId,
          teacherId:   teacher.id,
          classRoomId,
          subject:     t.subject || "غير محدد",
        });
        results.assignments++;
      } catch {}
    }
  }

  // 6. Seed school jobTitles (idempotent — skip if already exist)
  const SCHOOL_JOB_TITLES: Array<{
    name: string; nameEn: string; color: string;
    permissions: string[];
  }> = [
    {
      name: "مدير المدرسة", nameEn: "Principal", color: "#1d4ed8",
      permissions: [
        "school.students.read","school.students.write","school.timetable.view","school.timetable.edit",
        "school.attendance.record","school.attendance.view_all","school.behavior.view","school.behavior.write",
        "school.cases.access","school.cases.manage","school.referrals.create","school.referrals.manage",
        "school.counseling.access","school.reports.view","school.settings.manage",
      ],
    },
    {
      name: "وكيل المدرسة", nameEn: "Vice Principal", color: "#0891b2",
      permissions: [
        "school.students.read","school.students.write","school.timetable.view","school.timetable.edit",
        "school.attendance.record","school.attendance.view_all","school.behavior.view","school.behavior.write",
        "school.cases.access","school.cases.manage","school.referrals.create","school.referrals.manage",
        "school.counseling.access","school.reports.view",
      ],
    },
    {
      name: "مرشد طلابي", nameEn: "Counselor", color: "#7c3aed",
      permissions: [
        "school.students.read","school.behavior.view","school.behavior.write","school.cases.access",
        "school.referrals.create","school.referrals.manage","school.counseling.access","school.reports.view",
      ],
    },
    {
      name: "معلم", nameEn: "Teacher", color: "#059669",
      permissions: [
        "school.students.read","school.timetable.view","school.attendance.record",
        "school.behavior.view","school.behavior.write","school.referrals.create",
        "school.preparations.write","school.daily_logs.write","school.teacher.dashboard",
      ],
    },
    {
      name: "إداري", nameEn: "Admin Staff", color: "#d97706",
      permissions: [
        "school.students.read","school.students.write","school.timetable.view",
        "school.attendance.record","school.attendance.view_all","school.reports.view",
      ],
    },
  ];

  for (const jt of SCHOOL_JOB_TITLES) {
    // Check if already exists
    const [existing] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(and(eq(jobTitles.orgId, orgId), eq(jobTitles.name, jt.name)))
      .limit(1);

    let jobTitleId: string;
    if (existing) {
      jobTitleId = existing.id;
    } else {
      const [created] = await db.insert(jobTitles).values({
        orgId,
        name: jt.name,
        nameEn: jt.nameEn,
        color: jt.color,
        systemRole: "employee",
        isDefault: false,
        isActive: true,
        sortOrder: 0,
      }).returning({ id: jobTitles.id });
      jobTitleId = created.id;
    }

    // Upsert permissions (flat list — no systemRole logic)
    for (const perm of jt.permissions) {
      await db.insert(jobTitlePermissions).values({
        orgId,
        jobTitleId,
        permissionKey: perm,
        allowed: true,
      }).onConflictDoNothing();
    }
  }

  return c.json({ data: { ...results, setupStatus: "completed" } });
});

// GET /setup/grades — الصفوف بحسب المرحلة
router.get("/setup/grades", async (c) => {
  const stage = c.req.query("stage") ?? "متوسط";
  const grades = STAGE_GRADES[stage] ?? STAGE_GRADES["متوسط"];
  const subjects = DEFAULT_SUBJECTS_BY_STAGE[stage] ?? DEFAULT_SUBJECTS_BY_STAGE["متوسط"];
  return c.json({ data: { grades, subjects } });
});

// ============================================================
// NOTIFICATION SETTINGS — إعدادات إشعارات واتساب المدرسة
// ============================================================

// GET /notification-settings
router.get("/notification-settings", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db
    .select({ notificationSettings: schoolSettings.notificationSettings })
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  const defaults = {
    notifyGuardianOnViolation:  true,
    notifyGuardianOnAbsence:    true,
    notifyGuardianOnLate:       false,
    notifyTeacherOnAssignment:  false,
    violationMessage:
`{school_name}

ولي أمر الطالب / {student_name}
السلام عليكم ورحمة الله وبركاته

نفيدكم بأنه تم تسجيل مخالفة سلوكية لابنكم:
• الطالب : {student_name}
• الصف   : {grade}
• المخالفة: {category}
• الدرجة  : {degree}
• التاريخ : {date}

نأمل التواصل مع إدارة المدرسة للاطلاع على التفاصيل.
مع تحيات إدارة {school_name}`,

    absenceMessage:
`{school_name}

ولي أمر الطالب / {student_name}
السلام عليكم ورحمة الله وبركاته

نفيدكم بغياب ابنكم:
• الطالب: {student_name}
• الصف  : {grade}
• التاريخ: {date}

نأمل الاطلاع على سبب الغياب والتواصل مع إدارة المدرسة.
مع تحيات إدارة {school_name}`,

    lateMessage:
`{school_name}

ولي أمر الطالب / {student_name}
السلام عليكم ورحمة الله وبركاته

نفيدكم بتأخر الطالب:
• الطالب: {student_name}
• الصف  : {grade}
• التاريخ: {date}
• وقت الحضور: {time}

مع تحيات إدارة {school_name}`,

    teacherAssignMessage:
`{school_name}

الأستاذ الفاضل،
السلام عليكم ورحمة الله وبركاته

نفيدكم بأنه تم إسنادكم لحصة انتظار:
• الفصل / الصف: {class_name}
• المادة: {subject}

نتمنى لكم التوفيق والسداد.
إدارة {school_name}`,
  };

  const saved = (row?.notificationSettings as Record<string, string> | null) ?? {};
  // Auto-fix old templates that used {scope} or "لتدريس"
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(saved)) {
    if (typeof v === "string") {
      cleaned[k] = v.replace(/\{scope\}/g, "{class_name}").replace(/لتدريس:/g, "لحصة انتظار:");
    } else {
      cleaned[k] = v;
    }
  }
  return c.json({ data: { ...defaults, ...cleaned } });
});

// PUT /notification-settings
router.put("/notification-settings", async (c) => {
  const orgId = getOrgId(c);
  const body  = await c.req.json();

  const [existing] = await db.select({ id: schoolSettings.id, ns: schoolSettings.notificationSettings })
    .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);

  const merged = { ...(existing?.ns as object ?? {}), ...body };

  if (existing) {
    await db.update(schoolSettings)
      .set({ notificationSettings: merged })
      .where(and(eq(schoolSettings.id, existing.id), eq(schoolSettings.orgId, orgId)));
  }

  return c.json({ data: merged });
});

// GET /notification-logs — سجل الإشعارات المُرسَلة
router.get("/notification-logs", async (c) => {
  const orgId      = getOrgId(c);
  const eventType  = c.req.query("eventType");
  const status     = c.req.query("status");
  const limit      = Math.min(Number(c.req.query("limit") ?? 50), 200);

  const conds = [eq(schoolWhatsappLogs.orgId, orgId)];
  if (eventType) conds.push(eq(schoolWhatsappLogs.eventType, eventType));
  if (status)    conds.push(eq(schoolWhatsappLogs.status,    status));

  const rows = await db
    .select({
      id:          schoolWhatsappLogs.id,
      eventType:   schoolWhatsappLogs.eventType,
      recipient:   schoolWhatsappLogs.recipient,
      message:     schoolWhatsappLogs.message,
      status:      schoolWhatsappLogs.status,
      createdAt:   schoolWhatsappLogs.createdAt,
      studentName: students.fullName,
      studentGrade:students.grade,
      teacherName: teacherProfiles.fullName,
    })
    .from(schoolWhatsappLogs)
    .leftJoin(students,        eq(schoolWhatsappLogs.studentId, students.id))
    .leftJoin(teacherProfiles, eq(schoolWhatsappLogs.teacherId, teacherProfiles.id))
    .where(and(...conds))
    .orderBy(desc(schoolWhatsappLogs.createdAt))
    .limit(limit);

  const [{ total }] = await db
    .select({ total: count() })
    .from(schoolWhatsappLogs)
    .where(and(...conds));

  return c.json({ data: rows, total });
});

// POST /notification-logs/test — اختبار إرسال واتساب
router.post("/notification-logs/test", async (c) => {
  const orgId = getOrgId(c);
  const { phone, message } = await c.req.json();
  if (!phone || !message) return c.json({ error: "phone و message مطلوبان" }, 400);
  const ok = await sendSchoolWhatsApp({ orgId, recipient: phone, message, eventType: "test" });
  return c.json({ data: { sent: ok } });
});

// GET /whatsapp-status — حالة ربط الواتساب
router.get("/whatsapp-status", async (c) => {
  const configured = isWhatsAppConfigured();
  const provider   = whatsAppProvider();
  return c.json({
    data: {
      configured,
      provider,  // "meta" | "unifonic" | "twilio" | null
      setupGuide: configured ? null : {
        meta:     "أضف META_WA_TOKEN و META_WA_PHONE_ID في متغيرات البيئة (مجاني عبر Meta for Developers)",
        unifonic: "أضف UNIFONIC_APP_SID و UNIFONIC_WHATSAPP_SENDER في متغيرات البيئة",
        twilio:   "أضف TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN و TWILIO_WHATSAPP_FROM",
      },
    },
  });
});

// ============================================================
// WHATSAPP QR SESSION — ربط بالباركود
// ============================================================

// GET /whatsapp/session — current status + QR if available
router.get("/whatsapp/session", async (c) => {
  const orgId    = getOrgId(c);
  const state    = await getBaileysState(orgId);
  const apiReady = isWhatsAppConfigured();

  return c.json({
    data: {
      // Baileys QR session
      baileys: {
        status:    state.status,       // disconnected | connecting | qr_ready | connected
        qrBase64:  state.qrBase64,     // data:image/png;base64,… (null unless qr_ready)
        phone:     state.phone,        // connected phone number or null
        hasSaved:  hasSavedSession(orgId),
        updatedAt: state.updatedAt,
      },
      // API-based providers (Unifonic / Meta / Twilio)
      api: {
        configured: apiReady,
        provider:   whatsAppProvider(),
      },
    },
  });
});

// POST /whatsapp/session — start QR session
router.post("/whatsapp/session", async (c) => {
  const orgId = getOrgId(c);
  // Fire async — don't await (QR arrives via polling)
  initBaileys(orgId).catch(() => {});
  return c.json({ data: { starting: true } });
});

// DELETE /whatsapp/session — logout
router.delete("/whatsapp/session", async (c) => {
  const orgId = getOrgId(c);
  await logoutBaileys(orgId);
  return c.json({ data: { loggedOut: true } });
});

// ============================================================
// IMPORT — templates / preview / confirm / logs
// ============================================================

import { schoolImportLogs as schoolImportLogsTable } from "@nasaq/db/schema";

// قاموس مرادفات أعمدة الاستيراد — يتحمل اختلاف أسماء الأعمدة في ملفات المستخدمين
const COLUMN_ALIASES: Record<string, string[]> = {
  "الاسم الكامل":    ["الاسم", "اسم الطالب", "اسم المعلم", "اسم المعلمة", "الاسم الكامل للطالب", "full name", "name"],
  "رقم الطالب":     ["رقم الطالب", "رقم_الطالب", "student number", "student_number", "رقم"],
  "رقم الهوية":     ["رقم الهوية", "الهوية", "رقم_الهوية", "national id", "national_id", "هوية"],
  "تاريخ الميلاد":  ["تاريخ الميلاد", "الميلاد", "birth date", "birthdate"],
  "الجنس":          ["الجنس", "النوع", "gender"],
  "الصف":           ["الصف", "الصف الدراسي", "المرحلة", "المرحلة الدراسية", "grade", "الدراسي"],
  "اسم الفصل":      ["اسم الفصل", "الفصل", "رقم الفصل", "رمز الفصل", "class", "classroom", "section", "class name"],
  "اسم ولي الأمر":  ["اسم ولي الأمر", "ولي الأمر", "الوالد", "parent name", "guardian"],
  "جوال ولي الأمر": ["جوال ولي الأمر", "جوال الولي", "هاتف ولي الأمر", "phone", "جوال"],
  "صلة القرابة":    ["صلة القرابة", "القرابة", "العلاقة", "relation"],
  "الرقم الوظيفي":  ["الرقم الوظيفي", "رقم الموظف", "employee number", "employee_number"],
  "المادة":         ["المادة", "التخصص", "subject"],
  "الجوال":         ["الجوال", "الهاتف", "phone", "mobile"],
  "البريد الإلكتروني": ["البريد الإلكتروني", "الايميل", "email"],
  "المؤهل العلمي":  ["المؤهل العلمي", "المؤهل", "qualification"],
  "الطاقة الاستيعابية": ["الطاقة الاستيعابية", "السعة", "capacity", "max students"],
  "اليوم":          ["اليوم", "day"],
  "رقم الحصة":      ["رقم الحصة", "الحصة", "period", "session"],
  "اسم المعلم":     ["اسم المعلم", "المعلم", "المدرس", "teacher"],
};

// بناء خريطة عكسية: alias → canonical
const ALIAS_REVERSE: Record<string, string> = {};
for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const aliasItem of aliases) {
    ALIAS_REVERSE[aliasItem.trim().toLowerCase()] = canonical;
  }
  ALIAS_REVERSE[canonical.trim().toLowerCase()] = canonical;
}

// تطبيع صف واحد بتحويل أعمدته إلى الأسماء القياسية
function normalizeRowKeys(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    const canonical = ALIAS_REVERSE[key.trim().toLowerCase()] ?? key.trim();
    normalized[canonical] = val;
  }
  return normalized;
}

const IMPORT_TEMPLATES: Record<string, { headers: string[]; sample: Record<string, string>; required: string[] }> = {
  students: {
    headers:  ["الاسم الكامل", "رقم الطالب", "رقم الهوية", "تاريخ الميلاد", "الجنس", "الصف", "اسم الفصل", "اسم ولي الأمر", "جوال ولي الأمر", "صلة القرابة"],
    sample:   { "الاسم الكامل": "أحمد علي الزهراني", "رقم الطالب": "S-001", "رقم الهوية": "", "تاريخ الميلاد": "2015-03-10", "الجنس": "ذكر", "الصف": "الأول الابتدائي", "اسم الفصل": "أ", "اسم ولي الأمر": "علي الزهراني", "جوال ولي الأمر": "0512345678", "صلة القرابة": "الأب" },
    required: ["الاسم الكامل"],
  },
  teachers: {
    headers:  ["الاسم الكامل", "الرقم الوظيفي", "المادة", "الجوال", "البريد الإلكتروني", "رقم الهوية", "الجنس", "المؤهل العلمي"],
    sample:   { "الاسم الكامل": "محمد سعد العتيبي", "الرقم الوظيفي": "EMP-001", "المادة": "الرياضيات", "الجوال": "0556789012", "البريد الإلكتروني": "teacher@school.sa", "رقم الهوية": "", "الجنس": "ذكر", "المؤهل العلمي": "بكالوريوس تربية" },
    required: ["الاسم الكامل"],
  },
  classRooms: {
    headers:  ["الصف", "اسم الفصل", "الطاقة الاستيعابية"],
    sample:   { "الصف": "الأول الابتدائي", "اسم الفصل": "أ", "الطاقة الاستيعابية": "30" },
    required: ["الصف", "اسم الفصل"],
  },
  schedules: {
    headers:  ["الصف", "اسم الفصل", "اليوم", "رقم الحصة", "المادة", "اسم المعلم"],
    sample:   { "الصف": "الأول الابتدائي", "اسم الفصل": "أ", "اليوم": "الأحد", "رقم الحصة": "1", "المادة": "الرياضيات", "اسم المعلم": "محمد العتيبي" },
    required: ["الصف", "اسم الفصل", "اليوم", "رقم الحصة"],
  },
};

router.get("/import/templates/:type", async (c) => {
  const type = c.req.param("type") as string;
  const tpl = IMPORT_TEMPLATES[type];
  if (!tpl) return c.json({ error: "نوع الاستيراد غير مدعوم" }, 400);
  return c.json({ data: { headers: tpl.headers, sample: tpl.sample } });
});

router.get("/import/logs", async (c) => {
  const orgId = getOrgId(c);
  const type  = c.req.query("type");
  const conditions = [eq(schoolImportLogsTable.orgId, orgId)];
  if (type) conditions.push(eq(schoolImportLogsTable.importType, type));
  const logs = await db
    .select()
    .from(schoolImportLogsTable)
    .where(and(...conditions))
    .orderBy(desc(schoolImportLogsTable.createdAt))
    .limit(50);
  return c.json({ data: logs });
});

router.post("/import/preview", async (c) => {
  const orgId  = getOrgId(c);
  const body   = await c.req.json();
  const type   = body.type as string;
  const rawRows = body.rows as Record<string, string>[];
  const rows   = rawRows.map(normalizeRowKeys);  // تطبيع أسماء الأعمدة
  const tpl    = IMPORT_TEMPLATES[type];
  if (!tpl) return c.json({ error: "نوع غير مدعوم" }, 400);

  // For students: pre-check classroom matches
  let roomMap: Map<string, "found" | "will_create"> | null = null;
  if (type === "students") {
    const existingRooms = await db.select({ id: classRooms.id, grade: classRooms.grade, name: classRooms.name })
      .from(classRooms).where(eq(classRooms.orgId, orgId));
    roomMap = new Map();
    for (const r of existingRooms) {
      const key = `${normalizeGrade(r.grade ?? "")}::${(r.name ?? "").trim()}`;
      roomMap.set(key, "found");
    }

    // Pre-scan all rows to mark will_create
    for (const row of rows) {
      const normGrade = normalizeGrade(row["الصف"]?.trim() ?? "");
      const roomName  = (row["اسم الفصل"]?.trim() ?? "");
      if (normGrade && roomName) {
        const key = `${normGrade}::${roomName}`;
        if (!roomMap.has(key)) roomMap.set(key, "will_create");
      }
    }
  }

  const result = rows.map((row) => {
    const missing = tpl.required.filter((k) => !row[k]?.trim());
    if (missing.length > 0) {
      return { data: row, valid: false, error: `حقول مطلوبة: ${missing.join("، ")}` };
    }
    const entry: Record<string, any> = { data: row, valid: true };
    if (roomMap) {
      const normGrade = normalizeGrade(row["الصف"]?.trim() ?? "");
      const roomName  = (row["اسم الفصل"]?.trim() ?? "");
      if (!normGrade || !roomName) {
        entry.classroomStatus = "unspecified";
      } else {
        entry.classroomStatus = roomMap.get(`${normGrade}::${roomName}`) ?? "will_create";
      }
      entry.normalizedGrade = normGrade;
    }
    return entry;
  });

  return c.json({ data: { rows: result } });
});

router.post("/import/confirm", async (c) => {
  const orgId   = getOrgId(c);
  const userId  = getUserId(c);
  const body    = await c.req.json();
  const type    = body.type as string;
  const rows    = (body.rows as Record<string, string>[]).map(normalizeRowKeys);  // تطبيع أسماء الأعمدة

  let imported = 0; let updated = 0; let errors = 0;
  const errorList: any[] = [];

  if (type === "students") {
    // Build a lookup map: "normalizedGrade::roomName" → classRoomId
    const existingRooms = await db.select().from(classRooms).where(eq(classRooms.orgId, orgId));
    const roomMap = new Map<string, string>();
    for (const r of existingRooms) {
      const key = `${normalizeGrade(r.grade ?? "")}::${(r.name ?? "").trim()}`;
      roomMap.set(key, r.id);
    }

    let classroomsCreated = 0;

    for (const row of rows) {
      try {
        const fullName = row["الاسم الكامل"]?.trim();
        if (!fullName) { errors++; continue; }

        const gradeName = row["الصف"]?.trim() ?? "";
        const roomName  = row["اسم الفصل"]?.trim() ?? "";
        const normGrade = normalizeGrade(gradeName);
        const lookupKey = `${normGrade}::${roomName}`;

        let classRoomId: string | null = null;

        if (normGrade && roomName) {
          if (roomMap.has(lookupKey)) {
            classRoomId = roomMap.get(lookupKey)!;
          } else {
            // Auto-create missing classroom
            const [created] = await db.insert(classRooms).values({
              orgId,
              grade: normGrade,
              name:  roomName,
            }).onConflictDoNothing().returning({ id: classRooms.id });

            if (created) {
              roomMap.set(lookupKey, created.id);
              classRoomId = created.id;
              classroomsCreated++;
            } else {
              // Race condition — fetch the existing one
              const [existingRoom] = await db.select({ id: classRooms.id })
                .from(classRooms)
                .where(and(eq(classRooms.orgId, orgId), eq(classRooms.grade, normGrade), eq(classRooms.name, roomName)))
                .limit(1);
              if (existingRoom) {
                roomMap.set(lookupKey, existingRoom.id);
                classRoomId = existingRoom.id;
              }
            }
          }
        }

        const studentNumber = row["رقم الطالب"]?.trim() || null;
        const nationalId    = row["رقم الهوية"]?.trim()  || null;

        // Try to find an existing student by nationalId or studentNumber to avoid duplicates
        let existingStudent: { id: string } | null = null;
        if (nationalId) {
          const [found] = await db.select({ id: students.id })
            .from(students)
            .where(and(eq(students.orgId, orgId), eq(students.nationalId, nationalId)))
            .limit(1);
          existingStudent = found ?? null;
        }
        if (!existingStudent && studentNumber) {
          const [found] = await db.select({ id: students.id })
            .from(students)
            .where(and(eq(students.orgId, orgId), eq(students.studentNumber, studentNumber)))
            .limit(1);
          existingStudent = found ?? null;
        }

        const payload = {
          fullName,
          studentNumber,
          nationalId,
          grade:            normGrade || null,  // تخزين الصف مستقلاً عن الفصل
          birthDate:        row["تاريخ الميلاد"] || null,
          gender:           (row["الجنس"] === "أنثى" ? "أنثى" : row["الجنس"] === "ذكر" ? "ذكر" : null) as any,
          classRoomId,
          guardianName:     row["اسم ولي الأمر"] || null,
          guardianPhone:    row["جوال ولي الأمر"] || null,
          guardianRelation: row["صلة القرابة"] || null,
          updatedAt:        new Date(),
        };

        if (existingStudent) {
          // Update existing — especially classRoomId if it was null before
          await db.update(students)
            .set(payload)
            .where(and(eq(students.id, existingStudent.id), eq(students.orgId, orgId)));
          updated++;
        } else {
          await db.insert(students).values({ orgId, ...payload });
          imported++;
        }
      } catch (e: any) {
        errors++;
        errorList.push({ row, error: e.message });
      }
    }

    // Append classroomsCreated to response later
    (c as any).__classroomsCreated = classroomsCreated;
  } else if (type === "teachers") {
    for (const row of rows) {
      try {
        const fullName = row["الاسم الكامل"]?.trim();
        if (!fullName) { errors++; continue; }
        await db.insert(teacherProfiles).values({
          orgId,
          fullName,
          employeeNumber: row["الرقم الوظيفي"] || null,
          subject:        row["المادة"] || null,
          phone:          row["الجوال"] || null,
          email:          row["البريد الإلكتروني"] || null,
          nationalId:     row["رقم الهوية"] || null,
          gender:         (row["الجنس"] as any) || null,
          qualification:  row["المؤهل العلمي"] || null,
        });
        imported++;
      } catch (e: any) {
        errors++;
        errorList.push({ row, error: e.message });
      }
    }
  } else if (type === "classRooms") {
    for (const row of rows) {
      try {
        const grade = row["الصف"]?.trim();
        const name  = row["اسم الفصل"]?.trim();
        if (!grade || !name) { errors++; continue; }
        await db.insert(classRooms).values({
          orgId,
          grade,
          name,
          capacity: row["الطاقة الاستيعابية"] ? Number(row["الطاقة الاستيعابية"]) || null : null,
        });
        imported++;
      } catch (e: any) {
        errors++;
        errorList.push({ row, error: e.message });
      }
    }
  }

  // Log the import
  await db.insert(schoolImportLogsTable).values({
    orgId,
    importType:   type,
    status:       errors === 0 ? "completed" : imported > 0 ? "completed" : "failed",
    totalRows:    rows.length,
    importedRows: imported,
    errorRows:    errors,
    errors:       errorList,
    createdBy:    userId ?? undefined,
    startedAt:    new Date(),
    completedAt:  new Date(),
  } as any);

  const classroomsCreated: number = (c as any).__classroomsCreated ?? 0;
  return c.json({ data: { imported, updated, errors, errorList, classroomsCreated } });
});

export const settingsRouter = router;
