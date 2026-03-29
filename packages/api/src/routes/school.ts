import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, ilike, or, count, sql, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  schoolSettings,
  classRooms,
  teacherProfiles,
  students,
  timetableTemplates,
  timetableTemplatePeriods,
  scheduleWeeks,
  scheduleEntries,
  schoolCases,
  schoolCaseSteps,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";

// ============================================================
// DAY OF WEEK MAPPING
// ============================================================

const DAY_OF_WEEK_MAP: Record<number, "sun" | "mon" | "tue" | "wed" | "thu"> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
};

// ============================================================
// SCHEMAS
// ============================================================

const schoolSettingsSchema = z.object({
  schoolName:     z.string().min(1).max(200),
  schoolLogoUrl:  z.string().url().optional().nullable(),
  schoolAddress:  z.string().max(500).optional().nullable(),
  schoolPhone:    z.string().max(20).optional().nullable(),
  schoolEmail:    z.string().email().optional().nullable(),
  schoolRegion:   z.string().max(100).optional().nullable(),
  schoolType:     z.enum(["حكومية", "أهلية", "دولية"]).optional().nullable(),
  educationLevel: z.enum(["ابتدائية", "متوسطة", "ثانوية", "شاملة"]).optional().nullable(),
});

const activeWeekSchema = z.object({
  activeWeekId: z.string().uuid().nullable(),
});

const classRoomSchema = z.object({
  grade:    z.string().min(1).max(100),
  name:     z.string().min(1).max(100),
  capacity: z.number().int().positive().optional().nullable(),
  notes:    z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

const teacherSchema = z.object({
  fullName:       z.string().min(1).max(200),
  employeeNumber: z.string().max(50).optional().nullable(),
  subject:        z.string().max(100).optional().nullable(),
  phone:          z.string().max(20).optional().nullable(),
  email:          z.string().email().optional().nullable(),
  nationalId:     z.string().max(20).optional().nullable(),
  gender:         z.enum(["ذكر", "أنثى"]).optional().nullable(),
  qualification:  z.string().max(200).optional().nullable(),
  notes:          z.string().max(2000).optional().nullable(),
  isActive:       z.boolean().optional(),
});

const studentSchema = z.object({
  classRoomId:      z.string().uuid().optional().nullable(),
  fullName:         z.string().min(1).max(200),
  studentNumber:    z.string().max(50).optional().nullable(),
  nationalId:       z.string().max(20).optional().nullable(),
  birthDate:        z.string().optional().nullable(),
  gender:           z.enum(["ذكر", "أنثى"]).optional().nullable(),
  guardianName:     z.string().max(200).optional().nullable(),
  guardianPhone:    z.string().max(20).optional().nullable(),
  guardianRelation: z.string().max(50).optional().nullable(),
  address:          z.string().max(500).optional().nullable(),
  notes:            z.string().max(2000).optional().nullable(),
  isActive:         z.boolean().optional(),
});

const timetableTemplateSchema = z.object({
  name:        z.string().min(1).max(200),
  sessionType: z.enum(["summer", "winter"]).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive:    z.boolean().optional(),
});

const timetableTemplatePeriodSchema = z.object({
  periodNumber: z.number().int().positive(),
  label:        z.string().max(100).optional().nullable(),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/),
  isBreak:      z.boolean().optional(),
});

const scheduleWeekSchema = z.object({
  templateId:  z.string().uuid(),
  weekNumber:  z.number().int().positive(),
  label:       z.string().max(200).optional().nullable(),
  startDate:   z.string().optional().nullable(),
  endDate:     z.string().optional().nullable(),
  notes:       z.string().max(1000).optional().nullable(),
});

const scheduleEntrySchema = z.object({
  weekId:      z.string().uuid(),
  periodId:    z.string().uuid(),
  classRoomId: z.string().uuid(),
  teacherId:   z.string().uuid().optional().nullable(),
  dayOfWeek:   z.enum(["sun", "mon", "tue", "wed", "thu"]),
  subject:     z.string().min(1).max(200),
  notes:       z.string().max(1000).optional().nullable(),
});

const bulkScheduleEntriesSchema = z.object({
  entries: z.array(scheduleEntrySchema),
});

const teacherLateSchema = z.object({
  teacherLateMinutes: z.number().int().min(0).max(120),
  teacherArrivedAt:   z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

const schoolCaseSchema = z.object({
  studentId:   z.string().uuid().optional().nullable(),
  classRoomId: z.string().uuid().optional().nullable(),
  title:       z.string().min(1).max(300),
  category:    z.enum(["سلوكية", "أكاديمية", "صحية", "اجتماعية", "إدارية"]),
  description: z.string().max(5000).optional().nullable(),
  status:      z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority:    z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedTo:  z.string().max(200).optional().nullable(),
  resolution:  z.string().max(5000).optional().nullable(),
});

const schoolCaseStepSchema = z.object({
  stepNumber:  z.number().int().positive(),
  description: z.string().min(1).max(1000),
  actionTaken: z.string().max(2000).optional().nullable(),
  result:      z.string().max(2000).optional().nullable(),
  doneBy:      z.string().max(200).optional().nullable(),
  doneAt:      z.string().datetime().optional().nullable(),
  notes:       z.string().max(2000).optional().nullable(),
});

// ============================================================
// ROUTER
// ============================================================

const router = new Hono();

// ============================================================
// SCHOOL SETTINGS
// ============================================================

router.get("/settings", async (c) => {
  const orgId = getOrgId(c);

  const [settings] = await db
    .select()
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  return c.json({ data: settings ?? null });
});

router.post("/settings", async (c) => {
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

  const result = await db
    .select()
    .from(classRooms)
    .where(eq(classRooms.orgId, orgId))
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

// ============================================================
// STUDENTS
// ============================================================

router.get("/students", async (c) => {
  const orgId = getOrgId(c);
  const classRoomId = c.req.query("classRoomId");
  const search = c.req.query("search");
  const isActiveParam = c.req.query("isActive");

  const conditions = [eq(students.orgId, orgId)];

  if (classRoomId) conditions.push(eq(students.classRoomId, classRoomId));

  if (isActiveParam !== undefined) {
    conditions.push(eq(students.isActive, isActiveParam === "true"));
  }

  if (search) {
    conditions.push(
      or(
        ilike(students.fullName, `%${search}%`),
        ilike(students.studentNumber, `%${search}%`)
      )!
    );
  }

  const result = await db
    .select({
      id:               students.id,
      orgId:            students.orgId,
      fullName:         students.fullName,
      studentNumber:    students.studentNumber,
      classRoomId:      students.classRoomId,
      guardianName:     students.guardianName,
      guardianPhone:    students.guardianPhone,
      guardianRelation: students.guardianRelation,
      isActive:         students.isActive,
      createdAt:        students.createdAt,
      classRoomGrade:   classRooms.grade,
      classRoomName:    classRooms.name,
    })
    .from(students)
    .leftJoin(classRooms, eq(students.classRoomId, classRooms.id))
    .where(and(...conditions))
    .orderBy(asc(students.fullName));

  return c.json({ data: result });
});

router.post("/students", async (c) => {
  const orgId = getOrgId(c);
  const body = studentSchema.parse(await c.req.json());

  const [created] = await db
    .insert(students)
    .values({ orgId, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/students/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = studentSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, id), eq(students.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الطالب غير موجود" }, 404);

  const [updated] = await db
    .update(students)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(students.id, id), eq(students.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

router.delete("/students/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [existing] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, id), eq(students.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الطالب غير موجود" }, 404);

  await db
    .delete(students)
    .where(and(eq(students.id, id), eq(students.orgId, orgId)));

  return c.json({ success: true });
});

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
  const orgId = getOrgId(c);
  const templateId = c.req.query("templateId");

  const conditions = [eq(scheduleWeeks.orgId, orgId)];
  if (templateId) conditions.push(eq(scheduleWeeks.templateId, templateId));

  const result = await db
    .select()
    .from(scheduleWeeks)
    .where(and(...conditions))
    .orderBy(asc(scheduleWeeks.weekNumber));

  return c.json({ data: result });
});

router.post("/schedule-weeks", async (c) => {
  const orgId = getOrgId(c);
  const body = scheduleWeekSchema.parse(await c.req.json());

  const [template] = await db
    .select({ id: timetableTemplates.id })
    .from(timetableTemplates)
    .where(and(eq(timetableTemplates.id, body.templateId), eq(timetableTemplates.orgId, orgId)))
    .limit(1);

  if (!template) return c.json({ error: "القالب غير موجود" }, 404);

  const [created] = await db
    .insert(scheduleWeeks)
    .values({ orgId, ...body })
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
    .select({ id: scheduleWeeks.id, templateId: scheduleWeeks.templateId })
    .from(scheduleWeeks)
    .where(and(eq(scheduleWeeks.id, id), eq(scheduleWeeks.orgId, orgId)))
    .limit(1);

  if (!week) return c.json({ error: "الأسبوع غير موجود" }, 404);

  // إلغاء تفعيل جميع الأسابيع في نفس القالب
  await db
    .update(scheduleWeeks)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(scheduleWeeks.templateId, week.templateId),
        eq(scheduleWeeks.orgId, orgId)
      )
    );

  // تفعيل الأسبوع المطلوب
  const [activated] = await db
    .update(scheduleWeeks)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(scheduleWeeks.id, id), eq(scheduleWeeks.orgId, orgId)))
    .returning();

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
// SCHOOL CASES
// ============================================================

router.get("/cases", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const category = c.req.query("category");

  const conditions = [eq(schoolCases.orgId, orgId)];
  if (status) conditions.push(eq(schoolCases.status, status as any));
  if (category) conditions.push(eq(schoolCases.category, category));

  const result = await db
    .select({
      id:             schoolCases.id,
      title:          schoolCases.title,
      category:       schoolCases.category,
      priority:       schoolCases.priority,
      status:         schoolCases.status,
      description:    schoolCases.description,
      studentId:      schoolCases.studentId,
      createdBy:      schoolCases.createdBy,
      createdAt:      schoolCases.createdAt,
      updatedAt:      schoolCases.updatedAt,
      studentName:    students.fullName,
      classRoomGrade: classRooms.grade,
      classRoomName:  classRooms.name,
    })
    .from(schoolCases)
    .leftJoin(students, eq(schoolCases.studentId, students.id))
    .leftJoin(classRooms, eq(students.classRoomId, classRooms.id))
    .where(and(...conditions))
    .orderBy(desc(schoolCases.createdAt));

  return c.json({ data: result });
});

router.post("/cases", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = schoolCaseSchema.parse(await c.req.json());

  const [created] = await db
    .insert(schoolCases)
    .values({ orgId, createdBy: userId ?? undefined, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/cases/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = schoolCaseSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select({ id: schoolCases.id })
    .from(schoolCases)
    .where(and(eq(schoolCases.id, id), eq(schoolCases.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الحالة غير موجودة" }, 404);

  const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
  if (body.status === "resolved" && !body.resolution) {
    updateData.resolvedAt = new Date();
  }

  const [updated] = await db
    .update(schoolCases)
    .set(updateData)
    .where(and(eq(schoolCases.id, id), eq(schoolCases.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

router.get("/cases/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [schoolCase] = await db
    .select()
    .from(schoolCases)
    .where(and(eq(schoolCases.id, id), eq(schoolCases.orgId, orgId)))
    .limit(1);

  if (!schoolCase) return c.json({ error: "الحالة غير موجودة" }, 404);

  const steps = await db
    .select()
    .from(schoolCaseSteps)
    .where(and(eq(schoolCaseSteps.caseId, id), eq(schoolCaseSteps.orgId, orgId)))
    .orderBy(asc(schoolCaseSteps.stepNumber));

  return c.json({ data: { ...schoolCase, steps } });
});

// ============================================================
// SCHOOL CASE STEPS
// ============================================================

router.post("/cases/:caseId/steps", async (c) => {
  const orgId = getOrgId(c);
  const caseId = c.req.param("caseId");
  const body = schoolCaseStepSchema.parse(await c.req.json());

  const [schoolCase] = await db
    .select({ id: schoolCases.id })
    .from(schoolCases)
    .where(and(eq(schoolCases.id, caseId), eq(schoolCases.orgId, orgId)))
    .limit(1);

  if (!schoolCase) return c.json({ error: "الحالة غير موجودة" }, 404);

  const doneAtValue = body.doneAt ? new Date(body.doneAt) : undefined;

  const [created] = await db
    .insert(schoolCaseSteps)
    .values({
      orgId,
      caseId,
      ...body,
      doneAt: doneAtValue,
    })
    .returning();

  return c.json({ data: created }, 201);
});

router.delete("/cases/:caseId/steps/:id", async (c) => {
  const orgId = getOrgId(c);
  const caseId = c.req.param("caseId");
  const id = c.req.param("id");

  const [existing] = await db
    .select({ id: schoolCaseSteps.id })
    .from(schoolCaseSteps)
    .where(
      and(
        eq(schoolCaseSteps.id, id),
        eq(schoolCaseSteps.caseId, caseId),
        eq(schoolCaseSteps.orgId, orgId)
      )
    )
    .limit(1);

  if (!existing) return c.json({ error: "الخطوة غير موجودة" }, 404);

  await db
    .delete(schoolCaseSteps)
    .where(
      and(
        eq(schoolCaseSteps.id, id),
        eq(schoolCaseSteps.caseId, caseId),
        eq(schoolCaseSteps.orgId, orgId)
      )
    );

  return c.json({ success: true });
});

// ============================================================
// DAY MONITOR STATS
// ============================================================

router.get("/day-monitor", async (c) => {
  const orgId = getOrgId(c);

  const todayDayNum = new Date().getDay(); // 0=Sun, 1=Mon, ... 4=Thu
  const todayDayOfWeek = DAY_OF_WEEK_MAP[todayDayNum];

  // جلب إعدادات المدرسة للحصول على الأسبوع النشط
  const [settings] = await db
    .select()
    .from(schoolSettings)
    .where(eq(schoolSettings.orgId, orgId))
    .limit(1);

  let activeWeek = null;
  let todayEntries: typeof scheduleEntries.$inferSelect[] = [];
  let lateCount = 0;

  if (settings?.activeWeekId) {
    const [week] = await db
      .select()
      .from(scheduleWeeks)
      .where(and(eq(scheduleWeeks.id, settings.activeWeekId), eq(scheduleWeeks.orgId, orgId)))
      .limit(1);

    activeWeek = week ?? null;

    if (activeWeek && todayDayOfWeek) {
      const rawEntries = await db
        .select({
          id:                  scheduleEntries.id,
          dayOfWeek:           scheduleEntries.dayOfWeek,
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
        .where(
          and(
            eq(scheduleEntries.orgId, orgId),
            eq(scheduleEntries.weekId, activeWeek.id),
            eq(scheduleEntries.dayOfWeek, todayDayOfWeek)
          )
        )
        .orderBy(asc(timetableTemplatePeriods.periodNumber));

      todayEntries = rawEntries as any;
      lateCount = rawEntries.filter((e) => (e.teacherLateMinutes ?? 0) > 0).length;
    }
  }

  const [
    [{ studentCount }],
    [{ classRoomCount }],
    [{ teacherCount }],
    [{ openCasesCount }],
  ] = await Promise.all([
    db.select({ studentCount: count() }).from(students)
      .where(and(eq(students.orgId, orgId), eq(students.isActive, true))),
    db.select({ classRoomCount: count() }).from(classRooms)
      .where(and(eq(classRooms.orgId, orgId), eq(classRooms.isActive, true))),
    db.select({ teacherCount: count() }).from(teacherProfiles)
      .where(and(eq(teacherProfiles.orgId, orgId), eq(teacherProfiles.isActive, true))),
    db.select({ openCasesCount: count() }).from(schoolCases)
      .where(and(eq(schoolCases.orgId, orgId), or(eq(schoolCases.status, "open"), eq(schoolCases.status, "in_progress")))),
  ]);

  return c.json({
    data: {
      activeWeek,
      todayDayOfWeek: todayDayOfWeek ?? null,
      todayEntries,
      stats: {
        teachers:   Number(teacherCount),
        classRooms: Number(classRoomCount),
        students:   Number(studentCount),
        lateToday:  lateCount,
      },
      openCasesCount: Number(openCasesCount),
    },
  });
});

// ============================================================
// IMPORT — templates / preview / confirm / logs
// ============================================================

import { schoolImportLogs } from "@nasaq/db/schema";

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
  const conditions = [eq(schoolImportLogs.orgId, orgId)];
  if (type) conditions.push(eq(schoolImportLogs.importType, type));
  const logs = await db
    .select()
    .from(schoolImportLogs)
    .where(and(...conditions))
    .orderBy(desc(schoolImportLogs.createdAt))
    .limit(50);
  return c.json({ data: logs });
});

router.post("/import/preview", async (c) => {
  const orgId  = getOrgId(c);
  const body   = await c.req.json();
  const type   = body.type as string;
  const rows   = body.rows as Record<string, string>[];
  const tpl    = IMPORT_TEMPLATES[type];
  if (!tpl) return c.json({ error: "نوع غير مدعوم" }, 400);

  const result = rows.map((row) => {
    const missing = tpl.required.filter((k) => !row[k]?.trim());
    if (missing.length > 0) {
      return { data: row, valid: false, error: `حقول مطلوبة: ${missing.join("، ")}` };
    }
    return { data: row, valid: true };
  });

  return c.json({ data: { rows: result } });
});

router.post("/import/confirm", async (c) => {
  const orgId   = getOrgId(c);
  const userId  = getUserId(c);
  const body    = await c.req.json();
  const type    = body.type as string;
  const rows    = body.rows as Record<string, string>[];

  let imported = 0; let errors = 0;
  const errorList: any[] = [];

  if (type === "students") {
    // Fetch all classrooms for lookup
    const allRooms = await db.select().from(classRooms).where(eq(classRooms.orgId, orgId));
    for (const row of rows) {
      try {
        const fullName = row["الاسم الكامل"]?.trim();
        if (!fullName) { errors++; continue; }
        // find classRoomId
        const gradeName = row["الصف"]?.trim();
        const roomName  = row["اسم الفصل"]?.trim();
        const room = allRooms.find((r) =>
          (!gradeName || r.grade === gradeName) && (!roomName || r.name === roomName)
        );
        await db.insert(students).values({
          orgId,
          fullName,
          studentNumber: row["رقم الطالب"] || null,
          nationalId:    row["رقم الهوية"] || null,
          birthDate:     row["تاريخ الميلاد"] || null,
          gender:        (row["الجنس"] === "أنثى" ? "أنثى" : row["الجنس"] === "ذكر" ? "ذكر" : null) as any,
          classRoomId:   room?.id ?? null,
          guardianName:  row["اسم ولي الأمر"] || null,
          guardianPhone: row["جوال ولي الأمر"] || null,
          guardianRelation: row["صلة القرابة"] || null,
        });
        imported++;
      } catch (e: any) {
        errors++;
        errorList.push({ row, error: e.message });
      }
    }
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
  await db.insert(schoolImportLogs).values({
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

  return c.json({ data: { imported, errors, errorList } });
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

export const schoolRouter = router;
