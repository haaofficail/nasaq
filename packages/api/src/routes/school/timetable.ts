import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, inArray, or, sql, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@nasaq/db/client";
import {
  schoolSettings,
  classRooms,
  teacherProfiles,
  teacherClassAssignments,
  timetableTemplates,
  timetableTemplatePeriods,
  scheduleWeeks,
  scheduleEntries,
  schoolStandbyActivations,
  schoolTimetable,
  schoolSemesters,
  schoolEvents,
  subjects,
  gradeLevels,
  subjectGradeLevels,
  jobTitles,
  jobTitlePermissions,
} from "@nasaq/db/schema";
import { getOrgId } from "../../lib/helpers";
import { logSchoolAudit } from "../../middleware/school";
import { requirePerm } from "../../middleware/auth";
import type { SchoolEnv } from "../../middleware/school";
import {
  timetableTemplateSchema,
  timetableTemplatePeriodSchema,
  scheduleWeekSchema,
  scheduleEntrySchema,
  bulkScheduleEntriesSchema,
  teacherLateSchema,
  sendSchoolWhatsApp,
  fillTemplate,
} from "./shared";
import { isNull } from "drizzle-orm";

const router = new Hono<SchoolEnv>();

// ============================================================
// TIMETABLE TEMPLATES
// ============================================================

router.get("/timetable-templates", async (c) => {
  const orgId = getOrgId(c);

  const result = await db
    .select()
    .from(timetableTemplates)
    .where(eq(timetableTemplates.orgId, orgId))
    .orderBy(desc(timetableTemplates.createdAt));

  return c.json({ data: result });
});

router.post("/timetable-templates", async (c) => {
  const orgId = getOrgId(c);
  const body = timetableTemplateSchema.parse(await c.req.json());

  const [created] = await db
    .insert(timetableTemplates)
    .values({ orgId, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/timetable-templates/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = timetableTemplateSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select({ id: timetableTemplates.id })
    .from(timetableTemplates)
    .where(and(eq(timetableTemplates.id, id), eq(timetableTemplates.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "القالب غير موجود" }, 404);

  const [updated] = await db
    .update(timetableTemplates)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(timetableTemplates.id, id), eq(timetableTemplates.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

router.delete("/timetable-templates/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  // Delete periods first
  await db.delete(timetableTemplatePeriods)
    .where(and(eq(timetableTemplatePeriods.templateId, id), eq(timetableTemplatePeriods.orgId, orgId)));
  // Delete template
  const [deleted] = await db.delete(timetableTemplates)
    .where(and(eq(timetableTemplates.id, id), eq(timetableTemplates.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "القالب غير موجود" }, 404);
  return c.json({ success: true });
});

// ============================================================
// TIMETABLE TEMPLATE PERIODS
// ============================================================

router.get("/timetable-templates/:templateId/periods", async (c) => {
  const orgId = getOrgId(c);
  const templateId = c.req.param("templateId");

  const [template] = await db
    .select({ id: timetableTemplates.id })
    .from(timetableTemplates)
    .where(and(eq(timetableTemplates.id, templateId), eq(timetableTemplates.orgId, orgId)))
    .limit(1);

  if (!template) return c.json({ error: "القالب غير موجود" }, 404);

  const result = await db
    .select()
    .from(timetableTemplatePeriods)
    .where(
      and(
        eq(timetableTemplatePeriods.templateId, templateId),
        eq(timetableTemplatePeriods.orgId, orgId)
      )
    )
    .orderBy(asc(timetableTemplatePeriods.periodNumber));

  return c.json({ data: result });
});

router.post("/timetable-templates/:templateId/periods", async (c) => {
  const orgId = getOrgId(c);
  const templateId = c.req.param("templateId");
  const body = timetableTemplatePeriodSchema.parse(await c.req.json());

  const [template] = await db
    .select({ id: timetableTemplates.id })
    .from(timetableTemplates)
    .where(and(eq(timetableTemplates.id, templateId), eq(timetableTemplates.orgId, orgId)))
    .limit(1);

  if (!template) return c.json({ error: "القالب غير موجود" }, 404);

  const [created] = await db
    .insert(timetableTemplatePeriods)
    .values({ orgId, templateId, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/timetable-templates/:templateId/periods/:id", async (c) => {
  const orgId = getOrgId(c);
  const templateId = c.req.param("templateId");
  const id = c.req.param("id");
  const body = timetableTemplatePeriodSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select({ id: timetableTemplatePeriods.id })
    .from(timetableTemplatePeriods)
    .where(
      and(
        eq(timetableTemplatePeriods.id, id),
        eq(timetableTemplatePeriods.templateId, templateId),
        eq(timetableTemplatePeriods.orgId, orgId)
      )
    )
    .limit(1);

  if (!existing) return c.json({ error: "الحصة غير موجودة" }, 404);

  const [updated] = await db
    .update(timetableTemplatePeriods)
    .set({ ...body, updatedAt: new Date() })
    .where(
      and(
        eq(timetableTemplatePeriods.id, id),
        eq(timetableTemplatePeriods.templateId, templateId),
        eq(timetableTemplatePeriods.orgId, orgId)
      )
    )
    .returning();

  return c.json({ data: updated });
});

router.delete("/timetable-templates/:templateId/periods/:id", async (c) => {
  const orgId = getOrgId(c);
  const templateId = c.req.param("templateId");
  const id = c.req.param("id");

  const [existing] = await db
    .select({ id: timetableTemplatePeriods.id })
    .from(timetableTemplatePeriods)
    .where(
      and(
        eq(timetableTemplatePeriods.id, id),
        eq(timetableTemplatePeriods.templateId, templateId),
        eq(timetableTemplatePeriods.orgId, orgId)
      )
    )
    .limit(1);

  if (!existing) return c.json({ error: "الحصة غير موجودة" }, 404);

  await db
    .delete(timetableTemplatePeriods)
    .where(
      and(
        eq(timetableTemplatePeriods.id, id),
        eq(timetableTemplatePeriods.templateId, templateId),
        eq(timetableTemplatePeriods.orgId, orgId)
      )
    );

  return c.json({ success: true });
});

// ============================================================
// SCHEDULE WEEKS
// ============================================================

router.get("/schedule-weeks", async (c) => {
  const orgId     = getOrgId(c);
  const templateId = c.req.query("templateId");
  const semesterId = c.req.query("semesterId");

  const conditions: any[] = [eq(scheduleWeeks.orgId, orgId)];
  if (templateId)  conditions.push(eq(scheduleWeeks.templateId, templateId));
  if (semesterId)  conditions.push(eq(scheduleWeeks.semesterId, semesterId));

  const result = await db
    .select()
    .from(scheduleWeeks)
    .where(and(...conditions))
    .orderBy(asc(scheduleWeeks.weekNumber));

  return c.json({ data: result });
});

router.post("/schedule-weeks", async (c) => {
  const orgId = getOrgId(c);
  const body  = scheduleWeekSchema.parse(await c.req.json());

  // Auto-assign first template if none given (for periods lookup in schedule builder)
  let templateId = body.templateId ?? null;
  if (!templateId) {
    const [firstTemplate] = await db
      .select({ id: timetableTemplates.id })
      .from(timetableTemplates)
      .where(eq(timetableTemplates.orgId, orgId))
      .limit(1);
    templateId = firstTemplate?.id ?? null;
  }

  const [created] = await db
    .insert(scheduleWeeks)
    .values({ orgId, ...body, templateId })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/schedule-weeks/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = scheduleWeekSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select({ id: scheduleWeeks.id })
    .from(scheduleWeeks)
    .where(and(eq(scheduleWeeks.id, id), eq(scheduleWeeks.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الأسبوع غير موجود" }, 404);

  const [updated] = await db
    .update(scheduleWeeks)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(scheduleWeeks.id, id), eq(scheduleWeeks.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

router.patch("/schedule-weeks/:id/activate", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [week] = await db
    .select({ id: scheduleWeeks.id, semesterId: scheduleWeeks.semesterId, templateId: scheduleWeeks.templateId })
    .from(scheduleWeeks)
    .where(and(eq(scheduleWeeks.id, id), eq(scheduleWeeks.orgId, orgId)))
    .limit(1);

  if (!week) return c.json({ error: "الأسبوع غير موجود" }, 404);

  // إلغاء تفعيل جميع الأسابيع في نفس الفصل (أو نفس القالب إن لم يكن هناك فصل)
  const deactivateCond = week.semesterId
    ? and(eq(scheduleWeeks.semesterId, week.semesterId), eq(scheduleWeeks.orgId, orgId))
    : and(eq(scheduleWeeks.orgId, orgId));
  await db.update(scheduleWeeks).set({ isActive: false, updatedAt: new Date() }).where(deactivateCond);

  // تفعيل الأسبوع المطلوب
  const [activated] = await db
    .update(scheduleWeeks)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(scheduleWeeks.id, id), eq(scheduleWeeks.orgId, orgId)))
    .returning();

  // تحديث activeWeekId في إعدادات المدرسة
  const [existing] = await db.select({ id: schoolSettings.id }).from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
  if (existing) {
    await db.update(schoolSettings).set({ activeWeekId: id, updatedAt: new Date() }).where(eq(schoolSettings.orgId, orgId));
  } else {
    await db.insert(schoolSettings).values({ orgId, schoolName: "", activeWeekId: id });
  }

  return c.json({ data: activated });
});

// ============================================================
// SCHEDULE ENTRIES
// ============================================================

router.get("/schedule-entries", async (c) => {
  const orgId = getOrgId(c);
  const weekId = c.req.query("weekId");
  const dayOfWeek = c.req.query("dayOfWeek") as "sun" | "mon" | "tue" | "wed" | "thu" | undefined;

  if (!weekId) return c.json({ error: "weekId مطلوب" }, 400);

  // التحقق من أن الأسبوع ينتمي لنفس المنشأة
  const [week] = await db
    .select({ id: scheduleWeeks.id })
    .from(scheduleWeeks)
    .where(and(eq(scheduleWeeks.id, weekId), eq(scheduleWeeks.orgId, orgId)))
    .limit(1);

  if (!week) return c.json({ error: "الأسبوع غير موجود" }, 404);

  const conditions = [
    eq(scheduleEntries.orgId, orgId),
    eq(scheduleEntries.weekId, weekId),
  ];

  if (dayOfWeek) conditions.push(eq(scheduleEntries.dayOfWeek, dayOfWeek));

  const result = await db
    .select({
      id:                  scheduleEntries.id,
      weekId:              scheduleEntries.weekId,
      dayOfWeek:           scheduleEntries.dayOfWeek,
      periodId:            scheduleEntries.periodId,
      classRoomId:         scheduleEntries.classRoomId,
      teacherId:           scheduleEntries.teacherId,
      subject:             scheduleEntries.subject,
      teacherLateMinutes:  scheduleEntries.teacherLateMinutes,
      teacherArrivedAt:    scheduleEntries.teacherArrivedAt,
      periodNumber:        timetableTemplatePeriods.periodNumber,
      periodLabel:         timetableTemplatePeriods.label,
      startTime:           timetableTemplatePeriods.startTime,
      endTime:             timetableTemplatePeriods.endTime,
      isBreak:             timetableTemplatePeriods.isBreak,
      classRoomGrade:      classRooms.grade,
      classRoomName:       classRooms.name,
      teacherName:         teacherProfiles.fullName,
    })
    .from(scheduleEntries)
    .leftJoin(timetableTemplatePeriods, eq(scheduleEntries.periodId, timetableTemplatePeriods.id))
    .leftJoin(classRooms, eq(scheduleEntries.classRoomId, classRooms.id))
    .leftJoin(teacherProfiles, eq(scheduleEntries.teacherId, teacherProfiles.id))
    .where(and(...conditions))
    .orderBy(asc(timetableTemplatePeriods.periodNumber), asc(scheduleEntries.dayOfWeek));

  return c.json({ data: result });
});

router.put("/schedule-entries", async (c) => {
  const orgId = getOrgId(c);
  const { entries } = bulkScheduleEntriesSchema.parse(await c.req.json());

  if (entries.length === 0) return c.json({ data: [] });

  // التحقق من أن جميع الأسابيع ضمن المنشأة
  const weekIds = [...new Set(entries.map((e) => e.weekId))];
  const validWeeks = await db
    .select({ id: scheduleWeeks.id })
    .from(scheduleWeeks)
    .where(and(inArray(scheduleWeeks.id, weekIds), eq(scheduleWeeks.orgId, orgId)));

  if (validWeeks.length !== weekIds.length) {
    return c.json({ error: "بعض الأسابيع غير موجودة أو لا تنتمي لهذه المنشأة" }, 400);
  }

  const result = await db
    .insert(scheduleEntries)
    .values(entries.map((e) => ({ orgId, ...e })))
    .onConflictDoUpdate({
      target: [
        scheduleEntries.weekId,
        scheduleEntries.periodId,
        scheduleEntries.classRoomId,
        scheduleEntries.dayOfWeek,
      ],
      set: {
        teacherId: sql`excluded.teacher_id`,
        subject:   sql`excluded.subject`,
        notes:     sql`excluded.notes`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return c.json({ data: result });
});

router.patch("/schedule-entries/:id/late", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = teacherLateSchema.parse(await c.req.json());

  const [existing] = await db
    .select({ id: scheduleEntries.id })
    .from(scheduleEntries)
    .where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "المدخل غير موجود" }, 404);

  const [updated] = await db
    .update(scheduleEntries)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
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
// STANDBY ACTIVATIONS — تفعيل حصص الانتظار
// ============================================================

const standbyActivationSchema = z.object({
  activationDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  absentTeacherId:  z.string().uuid().optional().nullable(),
  standbyTeacherId: z.string().uuid(),
  classRoomId:      z.string().uuid().optional().nullable(),
  subject:          z.string().min(1).max(200).optional().nullable(),
  periodLabel:      z.string().max(100).optional().nullable(),
  startTime:        z.string().max(10).optional().nullable(),
  endTime:          z.string().max(10).optional().nullable(),
  notes:            z.string().max(1000).optional().nullable(),
});

// GET /standby-activations?date=YYYY-MM-DD
router.get("/standby-activations", async (c) => {
  const orgId = getOrgId(c);
  const dateParam = c.req.query("date") ?? new Date().toISOString().slice(0, 10);

  const absentT  = alias(teacherProfiles, "absent_t");
  const standbyT = alias(teacherProfiles, "standby_t");

  const rows = await db
    .select({
      id:                schoolStandbyActivations.id,
      activationDate:    schoolStandbyActivations.activationDate,
      absentTeacherId:   schoolStandbyActivations.absentTeacherId,
      absentTeacherName: absentT.fullName,
      standbyTeacherId:  schoolStandbyActivations.standbyTeacherId,
      standbyTeacherName: standbyT.fullName,
      standbyTeacherPhone: standbyT.phone,
      classRoomId:       schoolStandbyActivations.classRoomId,
      classRoomGrade:    classRooms.grade,
      classRoomName:     classRooms.name,
      subject:           schoolStandbyActivations.subject,
      periodLabel:       schoolStandbyActivations.periodLabel,
      startTime:         schoolStandbyActivations.startTime,
      endTime:           schoolStandbyActivations.endTime,
      notes:             schoolStandbyActivations.notes,
      notified:          schoolStandbyActivations.notified,
      createdAt:         schoolStandbyActivations.createdAt,
    })
    .from(schoolStandbyActivations)
    .leftJoin(absentT,  eq(schoolStandbyActivations.absentTeacherId,  absentT.id))
    .leftJoin(standbyT, eq(schoolStandbyActivations.standbyTeacherId, standbyT.id))
    .leftJoin(classRooms, eq(schoolStandbyActivations.classRoomId, classRooms.id))
    .where(and(
      eq(schoolStandbyActivations.orgId, orgId),
      eq(schoolStandbyActivations.activationDate, dateParam),
    ))
    .orderBy(asc(schoolStandbyActivations.createdAt));

  return c.json({ data: rows });
});

// POST /standby-activations — تفعيل حصة انتظار
router.post("/standby-activations", async (c) => {
  const orgId = getOrgId(c);
  const body  = standbyActivationSchema.parse(await c.req.json());

  // Validate standby teacher belongs to org
  const [standbyTeacher] = await db.select()
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, body.standbyTeacherId), eq(teacherProfiles.orgId, orgId)))
    .limit(1);
  if (!standbyTeacher) return c.json({ error: "المعلم غير موجود" }, 404);

  const [created] = await db
    .insert(schoolStandbyActivations)
    .values({
      orgId,
      activationDate:   body.activationDate,
      absentTeacherId:  body.absentTeacherId ?? null,
      standbyTeacherId: body.standbyTeacherId,
      classRoomId:      body.classRoomId ?? null,
      subject:          body.subject ?? "",
      periodLabel:      body.periodLabel ?? null,
      startTime:        body.startTime ?? null,
      endTime:          body.endTime ?? null,
      notes:            body.notes ?? null,
    })
    .returning();

  // ── إشعار واتساب للمعلم المكلف ────────────────────────────
  (async () => {
    try {
      if (!standbyTeacher.phone) return;

      const [settings] = await db.select({ notificationSettings: schoolSettings.notificationSettings, schoolName: schoolSettings.schoolName })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
      const ns = (settings?.notificationSettings ?? {}) as Record<string, any>;
      if (!ns.notifyTeacherOnAssignment) return;

      let classLabel = body.subject;
      if (body.classRoomId) {
        const [cr] = await db.select({ name: classRooms.name, grade: classRooms.grade })
          .from(classRooms).where(eq(classRooms.id, body.classRoomId)).limit(1);
        if (cr) classLabel = `${cr.grade} — فصل ${cr.name}`;
      }

      let absentName = "";
      if (body.absentTeacherId) {
        const [at] = await db.select({ fullName: teacherProfiles.fullName })
          .from(teacherProfiles).where(eq(teacherProfiles.id, body.absentTeacherId)).limit(1);
        if (at) absentName = at.fullName;
      }

      const periodInfo = body.periodLabel ? ` — ${body.periodLabel}` : "";
      const timeInfo   = (body.startTime && body.endTime) ? ` (${body.startTime} - ${body.endTime})` : "";

      const defaultTpl = `{school_name}

الأستاذ الفاضل،
السلام عليكم ورحمة الله وبركاته

نفيدكم بأنه تم إسنادكم لحصة انتظار:
• الفصل / الصف: {class_name}${periodInfo}${timeInfo}
• المادة: {subject}
${absentName ? `• بدلاً عن: ${absentName}` : ""}
• التاريخ: {date}

نتمنى لكم التوفيق والسداد.
إدارة {school_name}`;

      // Fix old templates that used {scope}
      const savedTpl2 = (ns.teacherAssignMessage ?? "").replace(/\{scope\}/g, "{class_name}").replace(/لتدريس/g, "لحصة انتظار") || null;
      const msg = fillTemplate(savedTpl2 ?? defaultTpl, {
        school_name: settings?.schoolName ?? "المدرسة",
        subject:     body.subject || undefined,
        class_name:  classLabel,
        date:        body.activationDate,
      });

      await sendSchoolWhatsApp({ orgId, recipient: standbyTeacher.phone, message: msg, eventType: "teacher_assignment", teacherId: standbyTeacher.id, refId: created.id });

      await db.update(schoolStandbyActivations)
        .set({ notified: true })
        .where(eq(schoolStandbyActivations.id, created.id));
    } catch {}
  })();

  return c.json({ data: created }, 201);
});

// DELETE /standby-activations/:id — إلغاء حصة انتظار
router.delete("/standby-activations/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  const [deleted] = await db
    .delete(schoolStandbyActivations)
    .where(and(eq(schoolStandbyActivations.id, id), eq(schoolStandbyActivations.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "حصة الانتظار غير موجودة" }, 404);

  return c.json({ success: true });
});

// ============================================================
// TIMETABLE — الجدول الدراسي الأسبوعي لكل فصل
// ============================================================

// GET /timetable/teacher/:teacherId?dayOfWeek=N — حصص معلم ليوم معين (System A)
router.get("/timetable/teacher/:teacherId", async (c) => {
  const orgId     = getOrgId(c);
  const teacherId = c.req.param("teacherId");
  const dayParam  = c.req.query("dayOfWeek");

  const DAY_NUM_TO_STR: Record<number, "sun"|"mon"|"tue"|"wed"|"thu"> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu",
  };
  const DAY_STR_TO_NUM: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4 };

  // استخدام الأسبوع النشط
  const [settings] = await db
    .select({ activeWeekId: schoolSettings.activeWeekId })
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  if (!settings?.activeWeekId) return c.json({ data: [] });

  const conditions: any[] = [
    eq(scheduleEntries.orgId, orgId),
    eq(scheduleEntries.weekId, settings.activeWeekId),
    eq(scheduleEntries.teacherId, teacherId),
  ];

  if (dayParam !== undefined) {
    const dayStr = DAY_NUM_TO_STR[parseInt(dayParam)];
    if (dayStr) conditions.push(eq(scheduleEntries.dayOfWeek, dayStr));
  }

  const rows = await db
    .select({
      id:           scheduleEntries.id,
      dayOfWeek:    scheduleEntries.dayOfWeek,
      periodNumber: timetableTemplatePeriods.periodNumber,
      subject:      scheduleEntries.subject,
      startTime:    timetableTemplatePeriods.startTime,
      endTime:      timetableTemplatePeriods.endTime,
      isBreak:      timetableTemplatePeriods.isBreak,
      classRoomId:  scheduleEntries.classRoomId,
      classGrade:   classRooms.grade,
      className:    classRooms.name,
    })
    .from(scheduleEntries)
    .leftJoin(timetableTemplatePeriods, eq(scheduleEntries.periodId, timetableTemplatePeriods.id))
    .leftJoin(classRooms, eq(scheduleEntries.classRoomId, classRooms.id))
    .where(and(...conditions))
    .orderBy(asc(scheduleEntries.dayOfWeek), asc(timetableTemplatePeriods.periodNumber));

  // تحويل dayOfWeek من string إلى int للتوافق مع الواجهة
  const data = rows.map(r => ({
    ...r,
    dayOfWeek: DAY_STR_TO_NUM[r.dayOfWeek as string] ?? 0,
  }));

  return c.json({ data });
});

// GET /timetable?classRoomId= (System A — يقرأ من scheduleEntries عبر الأسبوع النشط)
router.get("/timetable", requirePerm("school.timetable.view"), async (c) => {
  const orgId      = getOrgId(c);
  const classRoomId = c.req.query("classRoomId");

  if (!classRoomId) return c.json({ error: "classRoomId مطلوب" }, 400);

  const DAY_STR_TO_NUM: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4 };

  // الأسبوع النشط
  const [settings] = await db
    .select({ activeWeekId: schoolSettings.activeWeekId })
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  if (!settings?.activeWeekId) return c.json({ data: [], weekId: null, periods: [] });

  // جلب periods من القالب لبناء شبكة الجدول في الواجهة
  const [week] = await db
    .select({ templateId: scheduleWeeks.templateId })
    .from(scheduleWeeks)
    .where(and(eq(scheduleWeeks.id, settings.activeWeekId), eq(scheduleWeeks.orgId, orgId)))
    .limit(1);

  const periods = week?.templateId
    ? await db
        .select({
          id:           timetableTemplatePeriods.id,
          periodNumber: timetableTemplatePeriods.periodNumber,
          label:        timetableTemplatePeriods.label,
          startTime:    timetableTemplatePeriods.startTime,
          endTime:      timetableTemplatePeriods.endTime,
          isBreak:      timetableTemplatePeriods.isBreak,
        })
        .from(timetableTemplatePeriods)
        .where(and(
          eq(timetableTemplatePeriods.templateId, week.templateId!),
          eq(timetableTemplatePeriods.orgId, orgId),
        ))
        .orderBy(asc(timetableTemplatePeriods.periodNumber))
    : [];

  const rows = await db
    .select({
      id:           scheduleEntries.id,
      weekId:       scheduleEntries.weekId,
      classRoomId:  scheduleEntries.classRoomId,
      dayOfWeek:    scheduleEntries.dayOfWeek,
      periodId:     scheduleEntries.periodId,
      periodNumber: timetableTemplatePeriods.periodNumber,
      subject:      scheduleEntries.subject,
      teacherId:    scheduleEntries.teacherId,
      teacherName:  teacherProfiles.fullName,
      startTime:    timetableTemplatePeriods.startTime,
      endTime:      timetableTemplatePeriods.endTime,
      isBreak:      timetableTemplatePeriods.isBreak,
      notes:        scheduleEntries.notes,
    })
    .from(scheduleEntries)
    .leftJoin(timetableTemplatePeriods, eq(scheduleEntries.periodId, timetableTemplatePeriods.id))
    .leftJoin(teacherProfiles, eq(scheduleEntries.teacherId, teacherProfiles.id))
    .where(and(
      eq(scheduleEntries.orgId, orgId),
      eq(scheduleEntries.weekId, settings.activeWeekId),
      eq(scheduleEntries.classRoomId, classRoomId),
    ))
    .orderBy(asc(timetableTemplatePeriods.periodNumber), asc(scheduleEntries.dayOfWeek));

  // تحويل dayOfWeek من string → int للتوافق مع الواجهة
  const data = rows.map(r => ({
    ...r,
    dayOfWeek: DAY_STR_TO_NUM[r.dayOfWeek as string] ?? 0,
  }));

  return c.json({ data, weekId: settings.activeWeekId, periods });
});

// PUT /timetable — upsert cell (single) — System A — full transaction
router.put("/timetable", requirePerm("school.timetable.edit"), async (c) => {
  const orgId = getOrgId(c);
  const body  = await c.req.json() as {
    classRoomId:  string;
    dayOfWeek:    number;
    periodNumber: number;
    subject?:     string | null;
    teacherId?:   string | null;
    isBreak?:     boolean;
    notes?:       string | null;
  };

  const { classRoomId, dayOfWeek, periodNumber } = body;
  if (!body.subject?.trim()) return c.json({ error: "المادة مطلوبة" }, 400);

  const DAY_NUM_TO_STR: Record<number, "sun"|"mon"|"tue"|"wed"|"thu"> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu",
  };
  const dayStr = DAY_NUM_TO_STR[dayOfWeek];
  if (!dayStr) return c.json({ error: "يوم غير صالح" }, 400);

  let result: any;
  try {
    result = await db.transaction(async (tx) => {
      const [cr] = await tx.select({ id: classRooms.id, grade: classRooms.grade })
        .from(classRooms).where(and(eq(classRooms.id, classRoomId), eq(classRooms.orgId, orgId))).limit(1);
      if (!cr) throw Object.assign(new Error("الفصل غير موجود"), { status: 404 });

      if (body.teacherId) {
        const [asgn] = await tx.select({ id: teacherClassAssignments.id })
          .from(teacherClassAssignments)
          .where(and(
            eq(teacherClassAssignments.orgId, orgId),
            eq(teacherClassAssignments.teacherId, body.teacherId),
            or(
              eq(teacherClassAssignments.classRoomId, classRoomId),
              eq(teacherClassAssignments.grade, cr.grade),
            )
          )).limit(1);
        if (!asgn) throw Object.assign(new Error("المعلم غير مخصص لهذا الفصل"), { status: 422 });
      }

      const [settings] = await tx.select({ activeWeekId: schoolSettings.activeWeekId })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
      if (!settings?.activeWeekId) throw Object.assign(new Error("لا يوجد أسبوع نشط"), { status: 400 });

      const [week] = await tx.select({ templateId: scheduleWeeks.templateId })
        .from(scheduleWeeks)
        .where(and(eq(scheduleWeeks.id, settings.activeWeekId), eq(scheduleWeeks.orgId, orgId))).limit(1);
      if (!week?.templateId) throw Object.assign(new Error("قالب الجدول غير موجود"), { status: 400 });

      const [period] = await tx.select({ id: timetableTemplatePeriods.id })
        .from(timetableTemplatePeriods)
        .where(and(
          eq(timetableTemplatePeriods.templateId, week.templateId!),
          eq(timetableTemplatePeriods.orgId, orgId),
          eq(timetableTemplatePeriods.periodNumber, periodNumber),
        )).limit(1);
      if (!period) throw Object.assign(new Error("الحصة غير موجودة في القالب"), { status: 404 });

      const [inserted] = await tx.insert(scheduleEntries).values({
        orgId,
        weekId:      settings.activeWeekId,
        classRoomId,
        periodId:    period.id,
        teacherId:   body.teacherId ?? null,
        dayOfWeek:   dayStr,
        subject:     body.subject!,
        notes:       body.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [scheduleEntries.weekId, scheduleEntries.periodId, scheduleEntries.classRoomId, scheduleEntries.dayOfWeek],
        set: {
          teacherId: sql`excluded.teacher_id`,
          subject:   sql`excluded.subject`,
          notes:     sql`excluded.notes`,
          updatedAt: new Date(),
        },
      })
      .returning();
      return inserted;
    });
  } catch (err: any) {
    return c.json({ error: err.message ?? "خطأ في الحفظ" }, err.status ?? 500);
  }

  return c.json({ data: result });
});

// POST /timetable/bulk — bulk upsert (System A — transaction + teacher integrity + concurrency)
router.post("/timetable/bulk", requirePerm("school.timetable.edit"), async (c) => {
  const orgId = getOrgId(c);
  const body  = await c.req.json() as {
    classRoomId:    string;
    lastFetchedAt?: string; // ISO timestamp — للحماية من التعديل المتزامن
    cells: Array<{
      dayOfWeek:    number;
      periodNumber: number;
      subject?:     string | null;
      teacherId?:   string | null;
      isBreak?:     boolean;
    }>;
  };

  const [cr] = await db.select({ id: classRooms.id, grade: classRooms.grade })
    .from(classRooms).where(and(eq(classRooms.id, body.classRoomId), eq(classRooms.orgId, orgId))).limit(1);
  if (!cr) return c.json({ error: "الفصل غير موجود" }, 404);

  // الأسبوع النشط — مع إعداد تلقائي إن لم يكن موجوداً
  let [settings] = await db
    .select({ activeWeekId: schoolSettings.activeWeekId, sessionStartTime: schoolSettings.sessionStartTime, periodDurationMinutes: schoolSettings.periodDurationMinutes, breakDurationMinutes: schoolSettings.breakDurationMinutes, numberOfPeriods: schoolSettings.numberOfPeriods, sessionType: schoolSettings.sessionType })
    .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);

  if (!settings?.activeWeekId) {
    // إعداد تلقائي: أنشئ قالباً وأسبوعاً عند أول حفظ للجدول
    const startTime = settings?.sessionStartTime ?? "07:30";
    const periodDur = settings?.periodDurationMinutes ?? 45;
    const breakDur  = settings?.breakDurationMinutes  ?? 30;
    const numPeriods = settings?.numberOfPeriods ?? 7;
    const breakAfterPeriod = 3;
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const fromMin = (m: number) => { const h = Math.floor(m / 60), min = m % 60; return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`; };
    const ARABIC_LABELS = ["الأولى","الثانية","الثالثة","الرابعة","الخامسة","السادسة","السابعة","الثامنة","التاسعة","العاشرة"];

    const [tmpl] = await db.insert(timetableTemplates).values({
      orgId,
      name: "الجدول الأساسي",
      sessionType: (settings?.sessionType ?? "winter") as "winter" | "summer" | "ramadan",
    }).returning({ id: timetableTemplates.id });

    let currentMin = toMin(startTime);
    for (let i = 1; i <= numPeriods; i++) {
      const endMin = currentMin + periodDur;
      await db.insert(timetableTemplatePeriods).values({
        orgId, templateId: tmpl.id,
        periodNumber: i,
        label: `الحصة ${ARABIC_LABELS[i - 1] ?? i}`,
        startTime: fromMin(currentMin),
        endTime: fromMin(endMin),
        isBreak: false,
      });
      currentMin = endMin;
      if (i === breakAfterPeriod && i < numPeriods) {
        const breakEnd = currentMin + breakDur;
        await db.insert(timetableTemplatePeriods).values({
          orgId, templateId: tmpl.id,
          periodNumber: i + 0.5,
          label: "الفسحة",
          startTime: fromMin(currentMin),
          endTime: fromMin(breakEnd),
          isBreak: true,
        });
        currentMin = breakEnd;
      }
    }

    const [newWeek] = await db.insert(scheduleWeeks).values({
      orgId, templateId: tmpl.id,
      weekNumber: 1, label: "الأسبوع الأول", isActive: true,
    }).returning({ id: scheduleWeeks.id });

    if (settings) {
      await db.update(schoolSettings).set({ activeWeekId: newWeek.id, updatedAt: new Date() }).where(eq(schoolSettings.orgId, orgId));
    } else {
      await db.insert(schoolSettings).values({ orgId, schoolName: "", activeWeekId: newWeek.id });
    }
    settings = { ...settings, activeWeekId: newWeek.id } as typeof settings;
  }

  // قالب الأسبوع النشط
  const [week] = await db
    .select({ templateId: scheduleWeeks.templateId })
    .from(scheduleWeeks)
    .where(and(eq(scheduleWeeks.id, settings.activeWeekId!), eq(scheduleWeeks.orgId, orgId))).limit(1);
  if (!week?.templateId) return c.json({ error: "قالب الجدول غير موجود في الأسبوع النشط" }, 400);

  // جلب periods لتحويل periodNumber → periodId
  const templatePeriods = await db
    .select({ id: timetableTemplatePeriods.id, periodNumber: timetableTemplatePeriods.periodNumber })
    .from(timetableTemplatePeriods)
    .where(and(
      eq(timetableTemplatePeriods.templateId, week.templateId!),
      eq(timetableTemplatePeriods.orgId, orgId),
    ));
  const periodMap: Record<number, string> = Object.fromEntries(
    templatePeriods.map(p => [p.periodNumber, p.id])
  );

  // التحقق من integrity المعلمين — يجب أن تكون لكل معلم تخصيص لهذا الفصل أو مرحلته
  const teacherIds = [...new Set(
    body.cells.filter(c => c.teacherId && !c.isBreak).map(c => c.teacherId!)
  )];
  if (teacherIds.length > 0) {
    const authorized = await db
      .select({ teacherId: teacherClassAssignments.teacherId })
      .from(teacherClassAssignments)
      .where(and(
        eq(teacherClassAssignments.orgId, orgId),
        inArray(teacherClassAssignments.teacherId, teacherIds),
        or(
          eq(teacherClassAssignments.classRoomId, body.classRoomId),
          eq(teacherClassAssignments.grade, cr.grade),
        )
      ));
    const authorizedSet = new Set(authorized.map(a => a.teacherId));
    const unauthorized = teacherIds.filter(id => !authorizedSet.has(id));
    if (unauthorized.length > 0) {
      return c.json({
        error: "بعض المعلمين غير مخصصين لهذا الفصل",
        unauthorized,
      }, 422);
    }
  }

  const DAY_NUM_TO_STR: Record<number, "sun"|"mon"|"tue"|"wed"|"thu"> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu",
  };

  // تصفية الخلايا الصالحة
  const entries = body.cells
    .filter(cell => !cell.isBreak && cell.subject?.trim())
    .map(cell => {
      const periodId = periodMap[cell.periodNumber];
      const dayStr   = DAY_NUM_TO_STR[cell.dayOfWeek];
      if (!periodId || !dayStr) return null;
      return {
        orgId,
        weekId:      settings.activeWeekId!,
        classRoomId: body.classRoomId,
        periodId,
        teacherId:   cell.teacherId ?? null,
        dayOfWeek:   dayStr,
        subject:     cell.subject!,
      };
    })
    .filter(Boolean) as any[];

  // Transaction: فحص التزامن + حذف + إدخال — أو rollback كامل
  try {
    await db.transaction(async (tx) => {
      // فحص التزامن: إذا أرسل العميل lastFetchedAt، تحقق من عدم تغيير البيانات
      if (body.lastFetchedAt) {
        const [maxRow] = await tx
          .select({ maxUpdated: sql<string>`MAX(${scheduleEntries.updatedAt})` })
          .from(scheduleEntries)
          .where(and(
            eq(scheduleEntries.orgId, orgId),
            eq(scheduleEntries.weekId, settings.activeWeekId!),
            eq(scheduleEntries.classRoomId, body.classRoomId),
          ));
        if (maxRow?.maxUpdated && new Date(maxRow.maxUpdated) > new Date(body.lastFetchedAt)) {
          throw Object.assign(new Error("تم تعديل الجدول من مستخدم آخر — أعد تحميل الصفحة"), { status: 409 });
        }
      }

      await tx.delete(scheduleEntries).where(and(
        eq(scheduleEntries.orgId, orgId),
        eq(scheduleEntries.weekId, settings.activeWeekId!),
        eq(scheduleEntries.classRoomId, body.classRoomId),
      ));
      if (entries.length > 0) {
        await tx.insert(scheduleEntries).values(entries)
          .onConflictDoUpdate({
            target: [
              scheduleEntries.weekId,
              scheduleEntries.periodId,
              scheduleEntries.classRoomId,
              scheduleEntries.dayOfWeek,
            ],
            set: {
              teacherId: sql`excluded.teacher_id`,
              subject:   sql`excluded.subject`,
              updatedAt: new Date(),
            },
          });
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message ?? "خطأ في الحفظ" }, err.status ?? 500);
  }

  // Audit log — حفظ الجدول
  void logSchoolAudit(c, "timetable.bulk_saved", "timetable", body.classRoomId, null, { classRoomId: body.classRoomId, count: entries.length });

  return c.json({ success: true, count: entries.length });
});

// DELETE /timetable/:id — System A (id = scheduleEntries.id)
router.delete("/timetable/:id", requirePerm("school.timetable.edit"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;

  await db.delete(scheduleEntries).where(and(
    eq(scheduleEntries.id, id),
    eq(scheduleEntries.orgId, orgId),
  ));

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

// POST /setup/migrate-to-system-a — ترحيل البيانات من schoolTimetable → scheduleEntries
router.post("/setup/migrate-to-system-a", async (c) => {
  const orgId = getOrgId(c);

  const [settings] = await db
    .select({ activeWeekId: schoolSettings.activeWeekId })
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);
  if (!settings?.activeWeekId) {
    return c.json({ error: "لا يوجد أسبوع نشط — قم بإعداد العام الدراسي أولاً" }, 400);
  }

  const [week] = await db
    .select({ templateId: scheduleWeeks.templateId })
    .from(scheduleWeeks)
    .where(and(eq(scheduleWeeks.id, settings.activeWeekId), eq(scheduleWeeks.orgId, orgId)))
    .limit(1);
  if (!week?.templateId) return c.json({ error: "قالب الجدول غير موجود" }, 400);

  const templatePeriods = await db
    .select({ id: timetableTemplatePeriods.id, periodNumber: timetableTemplatePeriods.periodNumber })
    .from(timetableTemplatePeriods)
    .where(and(
      eq(timetableTemplatePeriods.templateId, week.templateId!),
      eq(timetableTemplatePeriods.orgId, orgId),
    ));
  const periodMap: Record<number, string> = Object.fromEntries(
    templatePeriods.map(p => [p.periodNumber, p.id])
  );

  const oldRows = await db
    .select()
    .from(schoolTimetable)
    .where(eq(schoolTimetable.orgId, orgId));

  const DAY_NUM_TO_STR: Record<number, "sun"|"mon"|"tue"|"wed"|"thu"> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu",
  };

  const entries = oldRows
    .filter(row => !row.isBreak && row.subject?.trim() && row.classRoomId)
    .map(row => {
      const periodId = periodMap[row.periodNumber];
      const dayStr   = DAY_NUM_TO_STR[row.dayOfWeek];
      if (!periodId || !dayStr) return null;
      return {
        orgId,
        weekId:      settings.activeWeekId!,
        classRoomId: row.classRoomId!,
        periodId,
        teacherId:   row.teacherId ?? null,
        dayOfWeek:   dayStr,
        subject:     row.subject!,
      };
    })
    .filter(Boolean) as any[];

  // Batch processing داخل transaction واحد — كل شيء أو لا شيء
  const BATCH_SIZE = 500;
  let migrated = 0;
  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        await tx.insert(scheduleEntries).values(batch)
          .onConflictDoUpdate({
            target: [
              scheduleEntries.weekId,
              scheduleEntries.periodId,
              scheduleEntries.classRoomId,
              scheduleEntries.dayOfWeek,
            ],
            set: {
              teacherId: sql`excluded.teacher_id`,
              subject:   sql`excluded.subject`,
              updatedAt: new Date(),
            },
          });
        migrated += batch.length;
      }
    });
  } catch (err: any) {
    return c.json({ error: `فشل الترحيل بعد ${migrated} سجل: ${err.message}` }, 500);
  }

  return c.json({ success: true, migrated, total: entries.length });
});

// ============================================================
// ACADEMIC CALENDAR — الفصول الدراسية والأحداث
// ============================================================

// GET /semesters
router.get("/semesters", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db.select().from(schoolSemesters)
    .where(eq(schoolSemesters.orgId, orgId))
    .orderBy(asc(schoolSemesters.yearLabel), asc(schoolSemesters.semesterNumber));
  return c.json({ data: rows });
});

// POST /semesters
router.post("/semesters", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const schema = z.object({
    yearLabel:      z.string().min(1).max(20),
    semesterNumber: z.number().int().min(1).max(2),
    label:          z.string().optional().nullable(),
    startDate:      z.string().optional().nullable(),
    endDate:        z.string().optional().nullable(),
    isActive:       z.boolean().optional(),
    notes:          z.string().optional().nullable(),
  });
  const data = schema.parse(body);
  const [row] = await db.insert(schoolSemesters).values({ orgId, ...data }).returning();
  return c.json({ data: row }, 201);
});

// PUT /semesters/:id
router.put("/semesters/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();

  // If setting isActive = true, deactivate all others first
  if (body.isActive === true) {
    await db.update(schoolSemesters).set({ isActive: false }).where(eq(schoolSemesters.orgId, orgId));
  }

  const [row] = await db.update(schoolSemesters)
    .set({ ...body, updatedAt: sql`NOW()` })
    .where(and(eq(schoolSemesters.id, id), eq(schoolSemesters.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ data: row });
});

// DELETE /semesters/:id
router.delete("/semesters/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  await db.delete(schoolSemesters).where(and(eq(schoolSemesters.id, id), eq(schoolSemesters.orgId, orgId)));
  return c.json({ data: { deleted: true } });
});

// GET /events?semesterId=&from=&to=&eventType=
router.get("/events", async (c) => {
  const orgId      = getOrgId(c);
  const semesterId = c.req.query("semesterId");
  const from       = c.req.query("from");   // YYYY-MM-DD
  const to         = c.req.query("to");     // YYYY-MM-DD
  const eventType  = c.req.query("eventType");

  const conds: any[] = [eq(schoolEvents.orgId, orgId)];
  if (semesterId) conds.push(eq(schoolEvents.semesterId, semesterId));
  if (eventType)  conds.push(eq(schoolEvents.eventType, eventType as any));
  if (from)       conds.push(gte(schoolEvents.startDate, from));
  if (to)         conds.push(lte(schoolEvents.startDate, to));

  const rows = await db.select().from(schoolEvents)
    .where(and(...conds))
    .orderBy(asc(schoolEvents.startDate));
  return c.json({ data: rows });
});

// POST /events
router.post("/events", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const schema = z.object({
    semesterId:        z.string().uuid().optional().nullable(),
    title:             z.string().min(1).max(200),
    eventType:         z.enum(["holiday", "national_day", "exam", "activity", "other"]).default("other"),
    startDate:         z.string().min(1),
    endDate:           z.string().optional().nullable(),
    description:       z.string().optional().nullable(),
    color:             z.string().optional().nullable(),
    affectsAttendance: z.boolean().optional(),
  });
  const data = schema.parse(body);
  const [row] = await db.insert(schoolEvents).values({ orgId, ...data }).returning();
  return c.json({ data: row }, 201);
});

// PUT /events/:id
router.put("/events/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const [row] = await db.update(schoolEvents)
    .set({ ...body, updatedAt: sql`NOW()` })
    .where(and(eq(schoolEvents.id, id), eq(schoolEvents.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ data: row });
});

// DELETE /events/:id
router.delete("/events/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  await db.delete(schoolEvents).where(and(eq(schoolEvents.id, id), eq(schoolEvents.orgId, orgId)));
  return c.json({ data: { deleted: true } });
});

// ============================================================
// SUBJECT SYSTEM — نظام المواد الدراسية الديناميكي
// ============================================================

// ── كود ثابت للمادة المقيّدة ─────────────────────────────────
const CRITICAL_THINKING_CODE = "critical_thinking";
const CRITICAL_THINKING_GRADE = "middle_3";  // الثالث المتوسط فقط

const DEFAULT_SEED: Record<string, {
  grades: { code: string; name: string; sortOrder: number }[];
  subjects: { code: string; name: string; type: string; sortOrder: number; weeklyPeriods: number; grades: string[] }[];
}> = {
  "متوسط": {
    grades: [
      { code: "middle_1", name: "الأول المتوسط",  sortOrder: 1 },
      { code: "middle_2", name: "الثاني المتوسط", sortOrder: 2 },
      { code: "middle_3", name: "الثالث المتوسط", sortOrder: 3 },
    ],
    subjects: [
      // أساسية
      { code: "science",       name: "علوم",              type: "core",     sortOrder: 1,  weeklyPeriods: 3, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
      { code: "math",          name: "رياضيات",            type: "core",     sortOrder: 2,  weeklyPeriods: 5, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
      { code: "arabic",        name: "لغة عربية",          type: "core",     sortOrder: 3,  weeklyPeriods: 6, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
      { code: "social_studies",name: "دراسات اجتماعية",    type: "core",     sortOrder: 4,  weeklyPeriods: 3, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
      { code: "english",       name: "إنجليزي",            type: "core",     sortOrder: 5,  weeklyPeriods: 5, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
      // مهارية
      { code: "digital_skills",name: "مهارات رقمية",       type: "skill",    sortOrder: 6,  weeklyPeriods: 2, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
      { code: "life_skills",   name: "مهارات حياتية",      type: "skill",    sortOrder: 7,  weeklyPeriods: 2, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
      // تفكير ناقد — الثالث المتوسط فقط (قيد code=critical_thinking)
      { code: CRITICAL_THINKING_CODE, name: "تفكير ناقد", type: "skill",    sortOrder: 8,  weeklyPeriods: 2, grades: ["الثالث المتوسط"] },
      // نشاط
      { code: "art",           name: "تربية فنية",         type: "activity", sortOrder: 9,  weeklyPeriods: 1, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
      { code: "pe",            name: "تربية بدنية",        type: "activity", sortOrder: 10, weeklyPeriods: 2, grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
    ],
  },
  "ابتدائي": {
    grades: [
      { code: "primary_1", name: "الأول الابتدائي",   sortOrder: 1 },
      { code: "primary_2", name: "الثاني الابتدائي",  sortOrder: 2 },
      { code: "primary_3", name: "الثالث الابتدائي",  sortOrder: 3 },
      { code: "primary_4", name: "الرابع الابتدائي",  sortOrder: 4 },
      { code: "primary_5", name: "الخامس الابتدائي",  sortOrder: 5 },
      { code: "primary_6", name: "السادس الابتدائي",  sortOrder: 6 },
    ],
    subjects: [
      { code: "math_p",    name: "رياضيات",          type: "core",     sortOrder: 1, weeklyPeriods: 5, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
      { code: "science_p", name: "علوم",             type: "core",     sortOrder: 2, weeklyPeriods: 3, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
      { code: "arabic_p",  name: "لغتي العربية",     type: "core",     sortOrder: 3, weeklyPeriods: 6, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
      { code: "islamic_p", name: "التربية الإسلامية",type: "core",     sortOrder: 4, weeklyPeriods: 4, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
      { code: "social_p",  name: "الدراسات الاجتماعية",type: "core",   sortOrder: 5, weeklyPeriods: 2, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
      { code: "english_p", name: "اللغة الإنجليزية", type: "core",     sortOrder: 6, weeklyPeriods: 4, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
      { code: "digital_p", name: "مهارات رقمية",     type: "skill",    sortOrder: 7, weeklyPeriods: 2, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
      { code: "art_p",     name: "تربية فنية",        type: "skill",    sortOrder: 8, weeklyPeriods: 1, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
      { code: "pe_p",      name: "تربية بدنية",       type: "activity", sortOrder: 9, weeklyPeriods: 2, grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
    ],
  },
  "ثانوي": {
    grades: [
      { code: "high_1", name: "الأول الثانوي",   sortOrder: 1 },
      { code: "high_2", name: "الثاني الثانوي",  sortOrder: 2 },
      { code: "high_3", name: "الثالث الثانوي",  sortOrder: 3 },
    ],
    subjects: [
      { code: "math_h",    name: "رياضيات",           type: "core",     sortOrder: 1, weeklyPeriods: 4, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
      { code: "physics_h", name: "فيزياء",             type: "core",     sortOrder: 2, weeklyPeriods: 3, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
      { code: "chem_h",    name: "كيمياء",             type: "core",     sortOrder: 3, weeklyPeriods: 3, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
      { code: "bio_h",     name: "أحياء",              type: "core",     sortOrder: 4, weeklyPeriods: 3, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
      { code: "arabic_h",  name: "اللغة العربية",      type: "core",     sortOrder: 5, weeklyPeriods: 4, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
      { code: "islamic_h", name: "التربية الإسلامية",  type: "core",     sortOrder: 6, weeklyPeriods: 4, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
      { code: "english_h", name: "اللغة الإنجليزية",   type: "core",     sortOrder: 7, weeklyPeriods: 4, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
      { code: "cs_h",      name: "حاسب آلي",           type: "skill",    sortOrder: 8, weeklyPeriods: 2, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
      { code: "pe_h",      name: "تربية بدنية",        type: "activity", sortOrder: 9, weeklyPeriods: 2, grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
    ],
  },
};

// ── Grade Levels ─────────────────────────────────────────────

router.get("/grade-levels", async (c) => {
  const orgId = getOrgId(c);
  const stage = c.req.query("stage");
  const conds = [eq(gradeLevels.orgId, orgId)];
  if (stage) conds.push(eq(gradeLevels.stage, stage));
  const rows = await db.select().from(gradeLevels)
    .where(and(...conds))
    .orderBy(asc(gradeLevels.sortOrder), asc(gradeLevels.name));
  return c.json({ data: rows });
});

router.post("/grade-levels", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const schema = z.object({
    name:      z.string().min(1).max(100),
    stage:     z.enum(["ابتدائي","متوسط","ثانوي"]).default("متوسط"),
    sortOrder: z.number().int().default(0),
    isActive:  z.boolean().default(true),
  });
  const data = schema.parse(body);
  const [row] = await db.insert(gradeLevels).values({ orgId, ...data }).returning();
  return c.json({ data: row }, 201);
});

router.put("/grade-levels/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const schema = z.object({
    name:      z.string().min(1).max(100).optional(),
    stage:     z.enum(["ابتدائي","متوسط","ثانوي"]).optional(),
    sortOrder: z.number().int().optional(),
    isActive:  z.boolean().optional(),
  });
  const data = schema.parse(body);
  const [row] = await db.update(gradeLevels).set(data)
    .where(and(eq(gradeLevels.id, id), eq(gradeLevels.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "الصف غير موجود" }, 404);
  return c.json({ data: row });
});

router.delete("/grade-levels/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const [del] = await db.delete(gradeLevels)
    .where(and(eq(gradeLevels.id, id), eq(gradeLevels.orgId, orgId)))
    .returning();
  if (!del) return c.json({ error: "الصف غير موجود" }, 404);
  return c.json({ success: true });
});

// ── Subjects ─────────────────────────────────────────────────

router.get("/subjects", async (c) => {
  const orgId = getOrgId(c);
  const type  = c.req.query("type");
  const conds = [eq(subjects.orgId, orgId)];
  if (type) conds.push(eq(subjects.type, type));
  const rows = await db.select().from(subjects)
    .where(and(...conds))
    .orderBy(asc(subjects.sortOrder), asc(subjects.name));
  return c.json({ data: rows });
});

// GET /subjects/by-grade/:gradeLevelId — مواد صف دراسي معين
router.get("/subjects/by-grade/:gradeLevelId", async (c) => {
  const orgId        = getOrgId(c);
  const gradeLevelId = c.req.param("gradeLevelId");
  const rows = await db
    .select({
      id:          subjects.id,
      name:        subjects.name,
      type:        subjects.type,
      isActive:    subjects.isActive,
      sortOrder:   subjects.sortOrder,
      weeklyHours: subjectGradeLevels.weeklyHours,
      linkId:      subjectGradeLevels.id,
    })
    .from(subjectGradeLevels)
    .innerJoin(subjects, eq(subjectGradeLevels.subjectId, subjects.id))
    .where(and(
      eq(subjectGradeLevels.orgId, orgId),
      eq(subjectGradeLevels.gradeLevelId, gradeLevelId),
      eq(subjectGradeLevels.isActive, true),
    ))
    .orderBy(asc(subjects.sortOrder), asc(subjects.name));
  return c.json({ data: rows });
});

// GET /subjects/by-grade-name?grade=الأول المتوسط — مواد صف بالاسم
router.get("/subjects/by-grade-name", async (c) => {
  const orgId     = getOrgId(c);
  const gradeName = c.req.query("grade");
  if (!gradeName) return c.json({ data: [] });
  const [gradeRow] = await db.select({ id: gradeLevels.id })
    .from(gradeLevels)
    .where(and(eq(gradeLevels.orgId, orgId), eq(gradeLevels.name, gradeName)))
    .limit(1);
  if (!gradeRow) return c.json({ data: [] });
  const rows = await db
    .select({ id: subjects.id, name: subjects.name, type: subjects.type, weeklyHours: subjectGradeLevels.weeklyHours })
    .from(subjectGradeLevels)
    .innerJoin(subjects, eq(subjectGradeLevels.subjectId, subjects.id))
    .where(and(
      eq(subjectGradeLevels.orgId, orgId),
      eq(subjectGradeLevels.gradeLevelId, gradeRow.id),
      eq(subjectGradeLevels.isActive, true),
    ))
    .orderBy(asc(subjects.sortOrder));
  return c.json({ data: rows });
});

router.post("/subjects", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const schema = z.object({
    name:      z.string().min(1).max(100),
    type:      z.enum(["core","skill","activity"]).default("core"),
    sortOrder: z.number().int().default(0),
    isActive:  z.boolean().default(true),
  });
  const data = schema.parse(body);
  const [row] = await db.insert(subjects).values({ orgId, ...data }).returning();
  return c.json({ data: row }, 201);
});

router.put("/subjects/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const schema = z.object({
    name:      z.string().min(1).max(100).optional(),
    type:      z.enum(["core","skill","activity"]).optional(),
    sortOrder: z.number().int().optional(),
    isActive:  z.boolean().optional(),
  });
  const data = schema.parse(body);
  const [row] = await db.update(subjects).set(data)
    .where(and(eq(subjects.id, id), eq(subjects.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "المادة غير موجودة" }, 404);
  return c.json({ data: row });
});

router.delete("/subjects/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const [del] = await db.delete(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.orgId, orgId)))
    .returning();
  if (!del) return c.json({ error: "المادة غير موجودة" }, 404);
  return c.json({ success: true });
});

// ── Subject-Grade Links ───────────────────────────────────────

// POST /subject-grade-levels — ربط مادة بصف
router.post("/subject-grade-levels", async (c) => {
  const orgId = getOrgId(c);
  const body  = await c.req.json();
  const schema = z.object({
    subjectId:     z.string().uuid(),
    gradeLevelId:  z.string().uuid(),
    weeklyHours:   z.number().int().min(1).max(40).default(4),
    weeklyPeriods: z.number().int().min(1).max(40).optional(),
    isRequired:    z.boolean().default(true),
  });
  const data = schema.parse(body);

  // تحقق أن المادة والصف ينتميان للمنشأة — وجلب code للتحقق من القيود
  const [sub] = await db.select({ id: subjects.id, code: subjects.code, name: subjects.name })
    .from(subjects)
    .where(and(eq(subjects.id, data.subjectId), eq(subjects.orgId, orgId))).limit(1);
  if (!sub) return c.json({ error: "المادة غير موجودة" }, 404);

  const [grade] = await db.select({ id: gradeLevels.id, code: gradeLevels.code, name: gradeLevels.name })
    .from(gradeLevels)
    .where(and(eq(gradeLevels.id, data.gradeLevelId), eq(gradeLevels.orgId, orgId))).limit(1);
  if (!grade) return c.json({ error: "الصف الدراسي غير موجود" }, 404);

  // ── قيد "تفكير ناقد" — الثالث المتوسط فقط ──────────────────
  if (sub.code === CRITICAL_THINKING_CODE && grade.code !== CRITICAL_THINKING_GRADE) {
    return c.json({
      error: `مادة "${sub.name}" مخصصة للثالث المتوسط فقط ولا يمكن إضافتها لهذا الصف`,
      code: "SUBJECT_GRADE_RESTRICTED",
    }, 422);
  }

  const weeklyPeriods = data.weeklyPeriods ?? data.weeklyHours;
  const [row] = await db.insert(subjectGradeLevels)
    .values({ orgId, subjectId: data.subjectId, gradeLevelId: data.gradeLevelId,
              weeklyHours: data.weeklyHours, weeklyPeriods, isRequired: data.isRequired })
    .onConflictDoUpdate({
      target: [subjectGradeLevels.orgId, subjectGradeLevels.subjectId, subjectGradeLevels.gradeLevelId],
      set: { weeklyHours: data.weeklyHours, weeklyPeriods, isRequired: data.isRequired, isActive: true },
    })
    .returning();
  return c.json({ data: row }, 201);
});

// DELETE /subject-grade-levels/:id — إلغاء ربط مادة بصف
router.delete("/subject-grade-levels/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const [del] = await db.delete(subjectGradeLevels)
    .where(and(eq(subjectGradeLevels.id, id), eq(subjectGradeLevels.orgId, orgId)))
    .returning();
  if (!del) return c.json({ error: "الربط غير موجود" }, 404);
  return c.json({ success: true });
});

// POST /subjects/seed-defaults — زرع المواد الافتراضية
router.post("/subjects/seed-defaults", async (c) => {
  const orgId = getOrgId(c);
  const stage = (c.req.query("stage") ?? "متوسط") as keyof typeof DEFAULT_SEED;
  const seed  = DEFAULT_SEED[stage];
  if (!seed) return c.json({ error: "مرحلة دراسية غير مدعومة" }, 400);

  const results = { grades: 0, subjects: 0, links: 0 };

  // 1. إنشاء الصفوف الدراسية
  const gradeIdMap: Record<string, string> = {};
  for (const g of seed.grades) {
    // upsert بالـ name: إذا موجود حدّث code، وإلا أنشئ
    const existing = await db.select({ id: gradeLevels.id }).from(gradeLevels)
      .where(and(eq(gradeLevels.orgId, orgId), eq(gradeLevels.name, g.name))).limit(1);
    if (existing.length > 0) {
      gradeIdMap[g.name] = existing[0].id;
      // حدّث code إذا لم يكن مضبوطاً
      await db.update(gradeLevels).set({ code: g.code })
        .where(and(eq(gradeLevels.id, existing[0].id), isNull(gradeLevels.code)));
    } else {
      const [row] = await db.insert(gradeLevels)
        .values({ orgId, code: g.code, name: g.name, stage, sortOrder: g.sortOrder })
        .returning();
      gradeIdMap[g.name] = row.id;
      results.grades++;
    }
  }

  // 2. إنشاء المواد وربطها بالصفوف
  for (const s of seed.subjects) {
    let subjectId: string;
    const existing = await db.select({ id: subjects.id }).from(subjects)
      .where(and(eq(subjects.orgId, orgId), eq(subjects.name, s.name))).limit(1);
    if (existing.length > 0) {
      subjectId = existing[0].id;
      await db.update(subjects).set({ code: s.code, type: s.type })
        .where(and(eq(subjects.id, subjectId), isNull(subjects.code)));
    } else {
      const [row] = await db.insert(subjects)
        .values({ orgId, code: s.code, name: s.name, type: s.type, sortOrder: s.sortOrder })
        .returning();
      subjectId = row.id;
      results.subjects++;
    }

    for (const gradeName of s.grades) {
      const gid = gradeIdMap[gradeName];
      if (!gid) continue;
      await db.insert(subjectGradeLevels)
        .values({
          orgId, subjectId, gradeLevelId: gid,
          weeklyHours: s.weeklyPeriods,
          weeklyPeriods: s.weeklyPeriods,
          isRequired: true,
        })
        .onConflictDoUpdate({
          target: [subjectGradeLevels.orgId, subjectGradeLevels.subjectId, subjectGradeLevels.gradeLevelId],
          set: { weeklyPeriods: s.weeklyPeriods, isRequired: true },
        });
      results.links++;
    }
  }

  return c.json({ data: results });
});

export const timetableRouter = router;
