import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, ilike, or, count, sql, inArray, isNull, gte, lte, between } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@nasaq/db/client";
import {
  schoolSettings,
  classRooms,
  teacherProfiles,
  teacherClassAssignments,
  students,
  timetableTemplates,
  timetableTemplatePeriods,
  scheduleWeeks,
  scheduleEntries,
  schoolCases,
  schoolCaseSteps,
  schoolViolationCategories,
  schoolViolations,
  studentTransfers,
  studentAttendance,
  studentBehaviorScores,
  behaviorIncidents,
  behaviorCompensations,
  guardianNotifications,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { DEDUCTION_BY_DEGREE, BEHAVIOR_SCORE_CONFIG } from "../constants/behaviorSystem";

// ============================================================
// GRADE NORMALIZATION — canonical Arabic grade forms
// ============================================================

// Maps any variant spelling to the canonical form stored in classRooms.grade
const GRADE_VARIANTS: Record<string, string> = {
  // ابتدائي
  "الأول الابتدائي":    "الأول الابتدائي",
  "الأول ابتدائي":      "الأول الابتدائي",
  "اول ابتدائي":        "الأول الابتدائي",
  "الثاني الابتدائي":   "الثاني الابتدائي",
  "الثاني ابتدائي":     "الثاني الابتدائي",
  "ثاني ابتدائي":       "الثاني الابتدائي",
  "الثالث الابتدائي":   "الثالث الابتدائي",
  "الثالث ابتدائي":     "الثالث الابتدائي",
  "ثالث ابتدائي":       "الثالث الابتدائي",
  "الرابع الابتدائي":   "الرابع الابتدائي",
  "الرابع ابتدائي":     "الرابع الابتدائي",
  "رابع ابتدائي":       "الرابع الابتدائي",
  "الخامس الابتدائي":   "الخامس الابتدائي",
  "الخامس ابتدائي":     "الخامس الابتدائي",
  "خامس ابتدائي":       "الخامس الابتدائي",
  "السادس الابتدائي":   "السادس الابتدائي",
  "السادس ابتدائي":     "السادس الابتدائي",
  "سادس ابتدائي":       "السادس الابتدائي",
  // متوسط
  "الأول المتوسط":      "الأول المتوسط",
  "الأول متوسط":        "الأول المتوسط",
  "اول متوسط":          "الأول المتوسط",
  "الثاني المتوسط":     "الثاني المتوسط",
  "الثاني متوسط":       "الثاني المتوسط",
  "ثاني متوسط":         "الثاني المتوسط",
  "الثالث المتوسط":     "الثالث المتوسط",
  "الثالث متوسط":       "الثالث المتوسط",
  "ثالث متوسط":         "الثالث المتوسط",
  // ثانوي
  "الأول الثانوي":      "الأول الثانوي",
  "الأول ثانوي":        "الأول الثانوي",
  "اول ثانوي":          "الأول الثانوي",
  "الثاني الثانوي":     "الثاني الثانوي",
  "الثاني ثانوي":       "الثاني الثانوي",
  "ثاني ثانوي":         "الثاني الثانوي",
  "الثالث الثانوي":     "الثالث الثانوي",
  "الثالث ثانوي":       "الثالث الثانوي",
  "ثالث ثانوي":         "الثالث الثانوي",
};

function normalizeGrade(raw: string): string {
  if (!raw) return raw;
  // Normalize alef variants: أ إ آ → ا, alef maqsura: ى → ي
  const normalized = raw.trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى\b/g, "ي");
  // Lookup exact first, then normalized
  return GRADE_VARIANTS[raw.trim()] ?? GRADE_VARIANTS[normalized] ?? raw.trim();
}

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
  const classRoomId    = c.req.query("classRoomId");
  const search         = c.req.query("search");
  const isActiveParam  = c.req.query("isActive");
  const gradeFilter    = c.req.query("grade");
  const unassignedOnly = c.req.query("unassigned") === "true";
  const pageParam      = parseInt(c.req.query("page") ?? "1", 10);
  const limitParam     = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
  const offset         = (pageParam - 1) * limitParam;

  const conditions = [eq(students.orgId, orgId)];

  if (classRoomId)   conditions.push(eq(students.classRoomId, classRoomId));
  if (unassignedOnly) conditions.push(isNull(students.classRoomId));
  if (gradeFilter)   conditions.push(eq(classRooms.grade, gradeFilter));

  if (isActiveParam !== undefined) {
    conditions.push(eq(students.isActive, isActiveParam === "true"));
  }

  if (search) {
    conditions.push(
      or(
        ilike(students.fullName,      `%${search}%`),
        ilike(students.studentNumber, `%${search}%`),
        ilike(students.nationalId,    `%${search}%`)
      )!
    );
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(students)
    .leftJoin(classRooms, eq(students.classRoomId, classRooms.id))
    .where(and(...conditions));

  const result = await db
    .select({
      id:               students.id,
      fullName:         students.fullName,
      studentNumber:    students.studentNumber,
      nationalId:       students.nationalId,
      grade:            students.grade,
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
    .orderBy(asc(students.fullName))
    .limit(limitParam)
    .offset(offset);

  return c.json({ data: result, total, page: pageParam, limit: limitParam, pages: Math.ceil(total / limitParam) });
});

// GET /students/unassigned — must be before /:id to avoid route conflict
router.get("/students/unassigned", async (c) => {
  const orgId = getOrgId(c);
  const result = await db
    .select({
      id:            students.id,
      fullName:      students.fullName,
      studentNumber: students.studentNumber,
      nationalId:    students.nationalId,
      grade:         students.grade,
    })
    .from(students)
    .where(and(eq(students.orgId, orgId), isNull(students.classRoomId)))
    .orderBy(asc(students.fullName));
  return c.json({ data: result });
});

// GET /students/:id — ملف الطالب الكامل
router.get("/students/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  const [student] = await db
    .select({
      id:               students.id,
      fullName:         students.fullName,
      studentNumber:    students.studentNumber,
      nationalId:       students.nationalId,
      grade:            students.grade,
      birthDate:        students.birthDate,
      gender:           students.gender,
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
    .where(and(eq(students.id, id), eq(students.orgId, orgId)))
    .limit(1);

  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  // Transfers history — alias classRooms twice for from/to joins
  const fromClassAlias = alias(classRooms, "fc");
  const toClassAlias   = alias(classRooms, "tc");

  const transfers = await db
    .select({
      id:            studentTransfers.id,
      fromClassId:   studentTransfers.fromClassId,
      toClassId:     studentTransfers.toClassId,
      reason:        studentTransfers.reason,
      transferredAt: studentTransfers.transferredAt,
      fromGrade:     fromClassAlias.grade,
      fromName:      fromClassAlias.name,
      toGrade:       toClassAlias.grade,
      toName:        toClassAlias.name,
    })
    .from(studentTransfers)
    .leftJoin(fromClassAlias, eq(studentTransfers.fromClassId, fromClassAlias.id))
    .leftJoin(toClassAlias,   eq(studentTransfers.toClassId,   toClassAlias.id))
    .where(and(eq(studentTransfers.studentId, id), eq(studentTransfers.orgId, orgId)))
    .orderBy(desc(studentTransfers.transferredAt));

  // Violations
  const violations = await db
    .select({
      id:              schoolViolations.id,
      description:     schoolViolations.description,
      violationDate:   schoolViolations.violationDate,
      status:          schoolViolations.status,
      categoryName:    schoolViolationCategories.name,
      categoryColor:   schoolViolationCategories.color,
      categorySeverity: schoolViolationCategories.severity,
    })
    .from(schoolViolations)
    .leftJoin(schoolViolationCategories, eq(schoolViolations.categoryId, schoolViolationCategories.id))
    .where(and(eq(schoolViolations.studentId, id), eq(schoolViolations.orgId, orgId)))
    .orderBy(desc(schoolViolations.violationDate));

  // Cases
  const cases = await db
    .select({
      id:        schoolCases.id,
      title:     schoolCases.title,
      category:  schoolCases.category,
      status:    schoolCases.status,
      priority:  schoolCases.priority,
      createdAt: schoolCases.createdAt,
    })
    .from(schoolCases)
    .where(and(eq(schoolCases.studentId, id), eq(schoolCases.orgId, orgId)))
    .orderBy(desc(schoolCases.createdAt));

  // Attendance summary (last 30 days)
  const attendanceSummary = await db
    .select({
      status: studentAttendance.status,
      cnt:    sql<number>`CAST(COUNT(*) AS INTEGER)`,
    })
    .from(studentAttendance)
    .where(and(
      eq(studentAttendance.studentId, id),
      eq(studentAttendance.orgId, orgId),
      sql`${studentAttendance.attendanceDate} >= CURRENT_DATE - INTERVAL '30 days'`
    ))
    .groupBy(studentAttendance.status);

  return c.json({ data: { ...student, transfers, violations, cases, attendanceSummary } });
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
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const body   = studentSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select({ id: students.id, classRoomId: students.classRoomId })
    .from(students)
    .where(and(eq(students.id, id), eq(students.orgId, orgId)))
    .limit(1);

  if (!existing) return c.json({ error: "الطالب غير موجود" }, 404);

  const [updated] = await db
    .update(students)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(students.id, id), eq(students.orgId, orgId)))
    .returning();

  // Log classroom change if it happened
  if (body.classRoomId && body.classRoomId !== existing.classRoomId) {
    await db.insert(studentTransfers).values({
      orgId,
      studentId:     id,
      fromClassId:   existing.classRoomId ?? null,
      toClassId:     body.classRoomId,
      reason:        (body as any).transferReason ?? null,
      transferredBy: userId ?? null,
    });
  }

  return c.json({ data: updated });
});

// POST /students/:id/transfer — نقل رسمي بين فصول نفس الصف مع تسجيل
router.post("/students/:id/transfer", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const body   = await c.req.json() as { classRoomId: string; reason?: string };

  if (!body.classRoomId) return c.json({ error: "الفصل المستهدف مطلوب" }, 400);

  // Fetch student
  const [student] = await db
    .select({ id: students.id, classRoomId: students.classRoomId })
    .from(students)
    .where(and(eq(students.id, id), eq(students.orgId, orgId)))
    .limit(1);
  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  // Fetch target classroom — must be in same grade
  const [targetRoom] = await db
    .select({ id: classRooms.id, grade: classRooms.grade })
    .from(classRooms)
    .where(and(eq(classRooms.id, body.classRoomId), eq(classRooms.orgId, orgId)))
    .limit(1);
  if (!targetRoom) return c.json({ error: "الفصل المستهدف غير موجود" }, 404);

  // Validate: if student has a current classroom, new one must be same grade
  if (student.classRoomId) {
    const [currentRoom] = await db
      .select({ grade: classRooms.grade })
      .from(classRooms)
      .where(eq(classRooms.id, student.classRoomId))
      .limit(1);
    if (currentRoom && currentRoom.grade !== targetRoom.grade) {
      return c.json({ error: `لا يمكن نقل الطالب إلى صف مختلف (${currentRoom.grade} → ${targetRoom.grade}). استخدم تغيير الصف بدلاً من النقل.` }, 422);
    }
  }

  if (student.classRoomId === body.classRoomId) {
    return c.json({ error: "الطالب موجود في هذا الفصل بالفعل" }, 422);
  }

  // Update student classroom
  const [updated] = await db
    .update(students)
    .set({ classRoomId: body.classRoomId, updatedAt: new Date() })
    .where(and(eq(students.id, id), eq(students.orgId, orgId)))
    .returning();

  // Log the transfer
  await db.insert(studentTransfers).values({
    orgId,
    studentId:     id,
    fromClassId:   student.classRoomId ?? null,
    toClassId:     body.classRoomId,
    reason:        body.reason ?? null,
    transferredBy: userId ?? null,
  });

  return c.json({ data: updated });
});

// GET /students/:id/transfers — سجل تنقلات طالب
router.get("/students/:id/transfers", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  const fromRoom = { grade: classRooms.grade, name: classRooms.name };

  const history = await db
    .select({
      id:            studentTransfers.id,
      fromClassId:   studentTransfers.fromClassId,
      toClassId:     studentTransfers.toClassId,
      reason:        studentTransfers.reason,
      transferredAt: studentTransfers.transferredAt,
      toGrade:       sql<string>`(SELECT grade FROM class_rooms WHERE id = ${studentTransfers.toClassId})`,
      toName:        sql<string>`(SELECT name  FROM class_rooms WHERE id = ${studentTransfers.toClassId})`,
      fromGrade:     sql<string>`(SELECT grade FROM class_rooms WHERE id = ${studentTransfers.fromClassId})`,
      fromName:      sql<string>`(SELECT name  FROM class_rooms WHERE id = ${studentTransfers.fromClassId})`,
    })
    .from(studentTransfers)
    .where(and(eq(studentTransfers.orgId, orgId), eq(studentTransfers.studentId, id)))
    .orderBy(desc(studentTransfers.transferredAt));

  return c.json({ data: history });
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
  for (const alias of aliases) {
    ALIAS_REVERSE[alias.trim().toLowerCase()] = canonical;
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
              const [existing] = await db.select({ id: classRooms.id })
                .from(classRooms)
                .where(and(eq(classRooms.orgId, orgId), eq(classRooms.grade, normGrade), eq(classRooms.name, roomName)))
                .limit(1);
              if (existing) {
                roomMap.set(lookupKey, existing.id);
                classRoomId = existing.id;
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

  const classroomsCreated: number = (c as any).__classroomsCreated ?? 0;
  return c.json({ data: { imported, updated, errors, errorList, classroomsCreated } });
});

// ============================================================
// STUDENTS REPAIR — إصلاح الطلاب غير المسندين لفصول
// ============================================================

// POST /students/assign-classroom — إسناد طلاب لفصل (مجمّع)
router.post("/students/assign-classroom", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json() as { studentIds: string[]; classRoomId: string };
  const { studentIds, classRoomId } = body;
  if (!studentIds?.length || !classRoomId) return c.json({ error: "بيانات ناقصة" }, 400);

  // Verify classroom belongs to org
  const [room] = await db.select({ id: classRooms.id }).from(classRooms)
    .where(and(eq(classRooms.id, classRoomId), eq(classRooms.orgId, orgId))).limit(1);
  if (!room) return c.json({ error: "الفصل غير موجود" }, 404);

  await db.update(students)
    .set({ classRoomId, updatedAt: new Date() })
    .where(and(eq(students.orgId, orgId), inArray(students.id, studentIds)));

  return c.json({ data: { assigned: studentIds.length } });
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
    .select({ id: teacherProfiles.id })
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.id, teacherId), eq(teacherProfiles.orgId, orgId)))
    .limit(1);

  if (!teacher) return c.json({ error: "المعلم غير موجود" }, 404);

  const body = teacherAssignmentSchema.parse(await c.req.json());

  const [created] = await db
    .insert(teacherClassAssignments)
    .values({ orgId, teacherId, ...body })
    .returning();

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
// VIOLATION CATEGORIES — أنواع وتصنيفات المخالفات
// ============================================================

router.get("/violation-categories", async (c) => {
  const orgId = getOrgId(c);
  const categories = await db
    .select()
    .from(schoolViolationCategories)
    .where(eq(schoolViolationCategories.orgId, orgId))
    .orderBy(asc(schoolViolationCategories.name));
  return c.json({ data: categories });
});

// Default categories from Saudi MOE "لائحة تنظيم السلوك والمواظبة"
const DEFAULT_VIOLATION_CATEGORIES = [
  // منخفضة
  { name: "التأخر عن الحضور",            severity: "low",    color: "#3b82f6", description: "الحضور بعد موعد الطابور الصباحي أو بداية الحصة" },
  { name: "عدم ارتداء الزي المدرسي",     severity: "low",    color: "#8b5cf6", description: "الحضور بزي غير نظامي أو غير مكتمل" },
  { name: "إهمال الواجبات المنزلية",     severity: "low",    color: "#6366f1", description: "عدم أداء أو تسليم الواجبات المطلوبة" },
  { name: "عدم إحضار الأدوات الدراسية", severity: "low",    color: "#a78bfa", description: "نسيان الكتب أو الأدوات اللازمة للدرس" },
  { name: "عدم الانضباط في الطابور",    severity: "low",    color: "#7c3aed", description: "التصرف بشكل غير منظم أثناء الطابور الصباحي" },
  { name: "الإخلال بالنظام داخل الفصل", severity: "low",    color: "#2563eb", description: "التشويش على سير الدرس أو إزعاج الزملاء" },
  // متوسطة
  { name: "الغياب غير المبرر",           severity: "medium", color: "#f59e0b", description: "الغياب عن المدرسة أو الحصص بدون مسوّغ نظامي" },
  { name: "استخدام الجوال أثناء الدراسة",severity: "medium", color: "#d97706", description: "استخدام الهاتف أو الأجهزة الإلكترونية داخل الفصل" },
  { name: "الإساءة اللفظية",             severity: "medium", color: "#b45309", description: "توجيه كلام مسيء أو غير لائق للمعلمين أو الزملاء" },
  { name: "الخروج من المدرسة بدون إذن", severity: "medium", color: "#92400e", description: "مغادرة المدرسة أو الفصل بدون تصريح رسمي" },
  { name: "التقصير في الاختبارات",       severity: "medium", color: "#78350f", description: "عدم الاستعداد أو إهمال الاختبارات والتقييمات" },
  // مرتفعة
  { name: "الغش في الاختبارات",          severity: "high",   color: "#ef4444", description: "محاولة الغش أو إدخال مواد مساعدة غير مسموح بها" },
  { name: "الاعتداء الجسدي",             severity: "high",   color: "#dc2626", description: "الاعتداء بالضرب أو الإيذاء الجسدي على أي شخص" },
  { name: "التنمر والإيذاء",             severity: "high",   color: "#b91c1c", description: "الإيذاء المتكرر للزملاء سواء جسدياً أو نفسياً أو إلكترونياً" },
  { name: "التخريب في ممتلكات المدرسة", severity: "high",   color: "#991b1b", description: "إتلاف أو تكسير أو العبث بممتلكات المدرسة" },
  { name: "التدخين",                     severity: "high",   color: "#7f1d1d", description: "التدخين داخل نطاق المدرسة أو الحافلة المدرسية" },
];

router.post("/violation-categories/seed-defaults", async (c) => {
  const orgId = getOrgId(c);
  // Only seed if org has no categories yet
  const [existing] = await db.select({ id: schoolViolationCategories.id })
    .from(schoolViolationCategories)
    .where(eq(schoolViolationCategories.orgId, orgId))
    .limit(1);
  if (existing) {
    return c.json({ data: [], message: "التصنيفات موجودة بالفعل" });
  }
  const inserted = await db.insert(schoolViolationCategories)
    .values(DEFAULT_VIOLATION_CATEGORIES.map((cat) => ({ orgId, ...cat })))
    .returning();
  return c.json({ data: inserted });
});

router.post("/violation-categories", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const schema = z.object({
    name:        z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    severity:    z.enum(["low", "medium", "high"]).default("medium"),
    color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f59e0b"),
  });
  const data = schema.parse(body);
  const [cat] = await db.insert(schoolViolationCategories).values({
    orgId,
    ...data,
  }).returning();
  return c.json({ data: cat }, 201);
});

router.put("/violation-categories/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const schema = z.object({
    name:        z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    severity:    z.enum(["low", "medium", "high"]).optional(),
    color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    isActive:    z.boolean().optional(),
  });
  const data = schema.parse(body);
  const [updated] = await db.update(schoolViolationCategories)
    .set({ ...data })
    .where(and(eq(schoolViolationCategories.id, id), eq(schoolViolationCategories.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "التصنيف غير موجود" }, 404);
  return c.json({ data: updated });
});

router.delete("/violation-categories/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  // Nullify category on violations before deleting
  await db.update(schoolViolations)
    .set({ categoryId: null })
    .where(and(eq(schoolViolations.orgId, orgId), eq(schoolViolations.categoryId, id)));
  const [deleted] = await db.delete(schoolViolationCategories)
    .where(and(eq(schoolViolationCategories.id, id), eq(schoolViolationCategories.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "التصنيف غير موجود" }, 404);
  return c.json({ success: true });
});

// ============================================================
// VIOLATIONS — سجل مخالفات الطلاب
// ============================================================

router.get("/violations", async (c) => {
  const orgId     = getOrgId(c);
  const studentId = c.req.query("studentId");
  const catId     = c.req.query("categoryId");
  const status    = c.req.query("status");
  const dateFrom  = c.req.query("dateFrom");
  const dateTo    = c.req.query("dateTo");

  const conditions = [eq(schoolViolations.orgId, orgId)];
  if (studentId) conditions.push(eq(schoolViolations.studentId, studentId));
  if (catId)     conditions.push(eq(schoolViolations.categoryId, catId));
  if (status)    conditions.push(eq(schoolViolations.status, status));
  if (dateFrom)  conditions.push(sql`${schoolViolations.violationDate} >= ${dateFrom}`);
  if (dateTo)    conditions.push(sql`${schoolViolations.violationDate} <= ${dateTo}`);

  const violations = await db
    .select({
      id:              schoolViolations.id,
      description:     schoolViolations.description,
      violationDate:   schoolViolations.violationDate,
      status:          schoolViolations.status,
      resolutionNotes: schoolViolations.resolutionNotes,
      createdAt:       schoolViolations.createdAt,
      studentId:       schoolViolations.studentId,
      studentName:     students.fullName,
      studentNumber:   students.studentNumber,
      classRoomId:     students.classRoomId,
      categoryId:      schoolViolations.categoryId,
      categoryName:    schoolViolationCategories.name,
      categorySeverity: schoolViolationCategories.severity,
      categoryColor:   schoolViolationCategories.color,
    })
    .from(schoolViolations)
    .innerJoin(students, eq(schoolViolations.studentId, students.id))
    .leftJoin(schoolViolationCategories, eq(schoolViolations.categoryId, schoolViolationCategories.id))
    .where(and(...conditions))
    .orderBy(desc(schoolViolations.violationDate), desc(schoolViolations.createdAt))
    .limit(200);

  return c.json({ data: violations });
});

router.post("/violations", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();
  const schema = z.object({
    studentId:      z.string().uuid(),
    categoryId:     z.string().uuid().optional().nullable(),
    description:    z.string().max(1000).optional().nullable(),
    violationDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  });
  const data = schema.parse(body);

  // Verify student belongs to org
  const [student] = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, data.studentId), eq(students.orgId, orgId)))
    .limit(1);
  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  const [violation] = await db.insert(schoolViolations).values({
    orgId,
    studentId:     data.studentId,
    categoryId:    data.categoryId ?? null,
    description:   data.description ?? null,
    violationDate: data.violationDate ?? new Date().toISOString().split("T")[0],
    recordedBy:    userId ?? undefined,
  }).returning();

  return c.json({ data: violation }, 201);
});

router.put("/violations/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const body  = await c.req.json();
  const schema = z.object({
    categoryId:      z.string().uuid().optional().nullable(),
    description:     z.string().max(1000).optional().nullable(),
    violationDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status:          z.enum(["open", "resolved", "cancelled"]).optional(),
    resolutionNotes: z.string().max(1000).optional().nullable(),
  });
  const data = schema.parse(body);
  const [updated] = await db.update(schoolViolations)
    .set({ ...data })
    .where(and(eq(schoolViolations.id, id), eq(schoolViolations.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "المخالفة غير موجودة" }, 404);
  return c.json({ data: updated });
});

router.delete("/violations/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const [deleted] = await db.delete(schoolViolations)
    .where(and(eq(schoolViolations.id, id), eq(schoolViolations.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "المخالفة غير موجودة" }, 404);
  return c.json({ success: true });
});

// ============================================================
// ATTENDANCE — حضور وغياب الطلاب
// ============================================================

// GET /attendance?classRoomId=&date= — جلب سجل الحضور لفصل في يوم
router.get("/attendance", async (c) => {
  const orgId       = getOrgId(c);
  const classRoomId = c.req.query("classRoomId");
  const dateParam   = c.req.query("date"); // YYYY-MM-DD

  if (!classRoomId || !dateParam) return c.json({ error: "classRoomId و date مطلوبان" }, 400);

  // Get all students in this classroom
  const classStudents = await db
    .select({ id: students.id, fullName: students.fullName, studentNumber: students.studentNumber })
    .from(students)
    .where(and(eq(students.classRoomId, classRoomId), eq(students.orgId, orgId)))
    .orderBy(asc(students.fullName));

  // Get existing attendance records for this date
  const records = await db
    .select()
    .from(studentAttendance)
    .where(and(
      eq(studentAttendance.orgId, orgId),
      eq(studentAttendance.classRoomId, classRoomId),
      eq(studentAttendance.attendanceDate, dateParam)
    ));

  const recordMap = Object.fromEntries(records.map(r => [r.studentId, r]));

  const result = classStudents.map(s => ({
    ...s,
    attendance: recordMap[s.id] ?? null,
  }));

  return c.json({ data: result, date: dateParam, classRoomId });
});

// POST /attendance/bulk — تسجيل الحضور للفصل كاملاً (upsert)
router.post("/attendance/bulk", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json() as {
    classRoomId: string;
    date: string; // YYYY-MM-DD
    records: Array<{ studentId: string; status: string; lateMinutes?: number; notes?: string }>;
  };

  if (!body.classRoomId || !body.date || !Array.isArray(body.records)) {
    return c.json({ error: "بيانات ناقصة" }, 400);
  }

  // Verify classroom
  const [room] = await db.select({ id: classRooms.id })
    .from(classRooms)
    .where(and(eq(classRooms.id, body.classRoomId), eq(classRooms.orgId, orgId)))
    .limit(1);
  if (!room) return c.json({ error: "الفصل غير موجود" }, 404);

  const values = body.records.map(r => ({
    orgId,
    studentId:      r.studentId,
    classRoomId:    body.classRoomId,
    attendanceDate: body.date,
    status:         (r.status as any) ?? "present",
    lateMinutes:    r.lateMinutes ?? null,
    notes:          r.notes ?? null,
    recordedBy:     userId ?? null,
    updatedAt:      new Date(),
  }));

  await db.insert(studentAttendance)
    .values(values)
    .onConflictDoUpdate({
      target: [studentAttendance.orgId, studentAttendance.studentId, studentAttendance.attendanceDate],
      set: {
        status:      sql`excluded.status`,
        lateMinutes: sql`excluded.late_minutes`,
        notes:       sql`excluded.notes`,
        recordedBy:  sql`excluded.recorded_by`,
        updatedAt:   sql`excluded.updated_at`,
      },
    });

  return c.json({ data: { saved: values.length } });
});

// GET /attendance/student/:studentId — سجل حضور طالب
router.get("/attendance/student/:studentId", async (c) => {
  const orgId     = getOrgId(c);
  const studentId = c.req.param("studentId");
  const month     = c.req.query("month"); // YYYY-MM optional

  const conditions = [eq(studentAttendance.studentId, studentId), eq(studentAttendance.orgId, orgId)];
  if (month) conditions.push(sql`to_char(${studentAttendance.attendanceDate}, 'YYYY-MM') = ${month}`);

  const records = await db
    .select()
    .from(studentAttendance)
    .where(and(...conditions))
    .orderBy(desc(studentAttendance.attendanceDate));

  return c.json({ data: records });
});

// GET /attendance/stats?classRoomId=&month= — إحصائيات الحضور
router.get("/attendance/stats", async (c) => {
  const orgId       = getOrgId(c);
  const classRoomId = c.req.query("classRoomId");
  const month       = c.req.query("month"); // YYYY-MM

  const conditions = [eq(studentAttendance.orgId, orgId)];
  if (classRoomId) conditions.push(eq(studentAttendance.classRoomId, classRoomId));
  if (month) conditions.push(sql`to_char(${studentAttendance.attendanceDate}, 'YYYY-MM') = ${month}`);

  const stats = await db
    .select({
      status: studentAttendance.status,
      cnt:    sql<number>`CAST(COUNT(*) AS INTEGER)`,
    })
    .from(studentAttendance)
    .where(and(...conditions))
    .groupBy(studentAttendance.status);

  return c.json({ data: stats });
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
  for (const [grade, count] of Object.entries(body.classroomsPerGrade)) {
    for (let i = 1; i <= count; i++) {
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

  // 3+4. Create timetable templates and periods for each calendar session
  const templateIds: Record<string, string> = {};
  for (const cal of body.calendar) {
    // Create template
    const [tmpl] = await db.insert(timetableTemplates).values({
      orgId,
      name:        `جدول ${cal.sessionType === "winter" ? "شتوي" : "صيفي"}`,
      sessionType: cal.sessionType,
      isActive:    true,
    }).returning({ id: timetableTemplates.id });
    templateIds[cal.sessionType] = tmpl.id;
    results.templates++;

    // Generate period times
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

      // Add break after specified period
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

    // Create schedule weeks using this template
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

  // If only one template, set its first week as active
  if (Object.keys(templateIds).length === 1) {
    const tmplId = Object.values(templateIds)[0];
    const [firstWeek] = await db.select({ id: scheduleWeeks.id })
      .from(scheduleWeeks)
      .where(and(eq(scheduleWeeks.orgId, orgId), eq(scheduleWeeks.templateId, tmplId), eq(scheduleWeeks.weekNumber, 1)))
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
// BEHAVIOR SYSTEM — نظام السلوك والمواظبة
// ============================================================

// Helper: احسب وحدّث نقاط طالب واحد
async function recalculateStudentScore(orgId: string, studentId: string, academicYear: string) {
  // مجموع الخصومات السلوكية
  const [deductRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(deduction_points), 0)` })
    .from(behaviorIncidents)
    .where(and(
      eq(behaviorIncidents.orgId, orgId),
      eq(behaviorIncidents.studentId, studentId),
      sql`to_char(${behaviorIncidents.incidentDate}, 'YYYY') = ${academicYear}`,
      sql`${behaviorIncidents.status} != 'cancelled'`,
    ));
  const totalDeductions = Number(deductRow?.total ?? 0);

  // مجموع نقاط التعويض
  const [compRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(points_added), 0)` })
    .from(behaviorCompensations)
    .where(and(
      eq(behaviorCompensations.orgId, orgId),
      eq(behaviorCompensations.studentId, studentId),
      sql`to_char(${behaviorCompensations.compensationDate}, 'YYYY') = ${academicYear}`,
    ));
  const totalCompensations = Number(compRow?.total ?? 0);

  // نقاط المواظبة: 100 - (غياب غير مبرر)
  const [absRow] = await db
    .select({ total: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(studentAttendance)
    .where(and(
      eq(studentAttendance.orgId, orgId),
      eq(studentAttendance.studentId, studentId),
      eq(studentAttendance.status, "absent"),
      sql`to_char(${studentAttendance.attendanceDate}, 'YYYY') = ${academicYear}`,
    ));
  const unexcusedAbsences = Number(absRow?.total ?? 0);
  const attendanceScore = Math.max(0, 100 - (unexcusedAbsences * BEHAVIOR_SCORE_CONFIG.absenceDeduction));

  const behaviorScore = Math.min(100, Math.max(0,
    BEHAVIOR_SCORE_CONFIG.positiveBase - totalDeductions + totalCompensations
  ));
  const totalScore = Math.round((behaviorScore * 0.6) + (attendanceScore * 0.4));

  await db.insert(studentBehaviorScores)
    .values({
      orgId, studentId, academicYear,
      behaviorScore, attendanceScore, totalScore,
      lastCalculatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [studentBehaviorScores.orgId, studentBehaviorScores.studentId, studentBehaviorScores.academicYear],
      set: {
        behaviorScore:     sql`excluded.behavior_score`,
        attendanceScore:   sql`excluded.attendance_score`,
        totalScore:        sql`excluded.total_score`,
        lastCalculatedAt:  sql`excluded.last_calculated_at`,
        updatedAt:         new Date(),
      },
    });
}

// GET /behavior/overview — ملخص السلوك الكلي للمدرسة
router.get("/behavior/overview", async (c) => {
  const orgId = getOrgId(c);
  const year  = c.req.query("year") ?? new Date().getFullYear().toString();

  const [incidentCount] = await db
    .select({ cnt: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(behaviorIncidents)
    .where(and(
      eq(behaviorIncidents.orgId, orgId),
      sql`to_char(${behaviorIncidents.incidentDate}, 'YYYY') = ${year}`,
      sql`${behaviorIncidents.status} != 'cancelled'`,
    ));

  const [compensationCount] = await db
    .select({ cnt: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(behaviorCompensations)
    .where(and(
      eq(behaviorCompensations.orgId, orgId),
      sql`to_char(${behaviorCompensations.compensationDate}, 'YYYY') = ${year}`,
    ));

  const [absenceCount] = await db
    .select({ cnt: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(studentAttendance)
    .where(and(
      eq(studentAttendance.orgId, orgId),
      eq(studentAttendance.status, "absent"),
      sql`to_char(${studentAttendance.attendanceDate}, 'YYYY') = ${year}`,
    ));

  const [notifCount] = await db
    .select({ cnt: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(guardianNotifications)
    .where(and(
      eq(guardianNotifications.orgId, orgId),
      sql`to_char(${guardianNotifications.notificationDate}, 'YYYY') = ${year}`,
    ));

  // توزيع الحوادث بالدرجة
  const byDegree = await db
    .select({
      degree: behaviorIncidents.degree,
      cnt:    sql<number>`CAST(COUNT(*) AS INTEGER)`,
    })
    .from(behaviorIncidents)
    .where(and(
      eq(behaviorIncidents.orgId, orgId),
      sql`to_char(${behaviorIncidents.incidentDate}, 'YYYY') = ${year}`,
      sql`${behaviorIncidents.status} != 'cancelled'`,
    ))
    .groupBy(behaviorIncidents.degree);

  // أعلى 5 مخالفات بالتصنيف
  const topViolations = await db
    .select({
      categoryId:   behaviorIncidents.categoryId,
      categoryName: schoolViolationCategories.name,
      cnt:          sql<number>`CAST(COUNT(*) AS INTEGER)`,
    })
    .from(behaviorIncidents)
    .leftJoin(schoolViolationCategories, eq(behaviorIncidents.categoryId, schoolViolationCategories.id))
    .where(and(
      eq(behaviorIncidents.orgId, orgId),
      sql`to_char(${behaviorIncidents.incidentDate}, 'YYYY') = ${year}`,
      sql`${behaviorIncidents.status} != 'cancelled'`,
    ))
    .groupBy(behaviorIncidents.categoryId, schoolViolationCategories.name)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(5);

  return c.json({
    data: {
      incidents:    incidentCount?.cnt ?? 0,
      compensations: compensationCount?.cnt ?? 0,
      absences:     absenceCount?.cnt ?? 0,
      notifications: notifCount?.cnt ?? 0,
      byDegree,
      topViolations,
    }
  });
});

// GET /behavior/incidents — قائمة الحوادث
router.get("/behavior/incidents", async (c) => {
  const orgId      = getOrgId(c);
  const studentId  = c.req.query("studentId");
  const status     = c.req.query("status");
  const dateFrom   = c.req.query("dateFrom");
  const dateTo     = c.req.query("dateTo");

  const conditions = [eq(behaviorIncidents.orgId, orgId)];
  if (studentId) conditions.push(eq(behaviorIncidents.studentId, studentId));
  if (status)    conditions.push(sql`${behaviorIncidents.status} = ${status}`);
  if (dateFrom)  conditions.push(sql`${behaviorIncidents.incidentDate} >= ${dateFrom}`);
  if (dateTo)    conditions.push(sql`${behaviorIncidents.incidentDate} <= ${dateTo}`);

  const incidents = await db
    .select({
      id:               behaviorIncidents.id,
      studentId:        behaviorIncidents.studentId,
      studentName:      students.fullName,
      studentNumber:    students.studentNumber,
      categoryId:       behaviorIncidents.categoryId,
      categoryName:     schoolViolationCategories.name,
      categoryColor:    schoolViolationCategories.color,
      incidentDate:     behaviorIncidents.incidentDate,
      degree:           behaviorIncidents.degree,
      violationCode:    behaviorIncidents.violationCode,
      description:      behaviorIncidents.description,
      deductionPoints:  behaviorIncidents.deductionPoints,
      actionTaken:      behaviorIncidents.actionTaken,
      guardianNotified: behaviorIncidents.guardianNotified,
      status:           behaviorIncidents.status,
      resolutionNotes:  behaviorIncidents.resolutionNotes,
      createdAt:        behaviorIncidents.createdAt,
    })
    .from(behaviorIncidents)
    .innerJoin(students, eq(behaviorIncidents.studentId, students.id))
    .leftJoin(schoolViolationCategories, eq(behaviorIncidents.categoryId, schoolViolationCategories.id))
    .where(and(...conditions))
    .orderBy(desc(behaviorIncidents.incidentDate), desc(behaviorIncidents.createdAt))
    .limit(300);

  return c.json({ data: incidents });
});

// POST /behavior/incidents — تسجيل حادثة جديدة
router.post("/behavior/incidents", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();
  const schema = z.object({
    studentId:    z.string().uuid(),
    categoryId:   z.string().uuid().optional().nullable(),
    incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    degree:       z.enum(["1","2","3","4","5"]).default("1"),
    violationCode: z.string().max(20).optional().nullable(),
    description:  z.string().max(1000).optional().nullable(),
    actionTaken:  z.string().max(500).optional().nullable(),
  });
  const data = schema.parse(body);

  // Verify student belongs to org
  const [student] = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, data.studentId), eq(students.orgId, orgId)))
    .limit(1);
  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  const deductionPoints = DEDUCTION_BY_DEGREE[data.degree] ?? 0;
  const incidentDate    = data.incidentDate ?? new Date().toISOString().split("T")[0];

  const [incident] = await db.insert(behaviorIncidents).values({
    orgId,
    studentId:     data.studentId,
    categoryId:    data.categoryId ?? null,
    incidentDate,
    degree:        data.degree,
    violationCode: data.violationCode ?? null,
    description:   data.description ?? null,
    deductionPoints,
    actionTaken:   data.actionTaken ?? null,
    recordedBy:    userId ?? undefined,
  } as any).returning();

  // Recalculate score
  const year = incidentDate.slice(0, 4);
  await recalculateStudentScore(orgId, data.studentId, year);

  return c.json({ data: incident }, 201);
});

// PUT /behavior/incidents/:id — تعديل حادثة
router.put("/behavior/incidents/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const body  = await c.req.json();
  const schema = z.object({
    degree:           z.enum(["1","2","3","4","5"]).optional(),
    description:      z.string().max(1000).optional().nullable(),
    actionTaken:      z.string().max(500).optional().nullable(),
    guardianNotified: z.boolean().optional(),
    status:           z.enum(["open","resolved","cancelled"]).optional(),
    resolutionNotes:  z.string().max(1000).optional().nullable(),
  });
  const data = schema.parse(body);

  const updates: any = { ...data, updatedAt: new Date() };
  if (data.degree) updates.deductionPoints = DEDUCTION_BY_DEGREE[data.degree] ?? 0;

  const [updated] = await db.update(behaviorIncidents)
    .set(updates)
    .where(and(eq(behaviorIncidents.id, id), eq(behaviorIncidents.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "الحادثة غير موجودة" }, 404);

  const year = updated.incidentDate.slice(0, 4);
  await recalculateStudentScore(orgId, updated.studentId, year);

  return c.json({ data: updated });
});

// DELETE /behavior/incidents/:id
router.delete("/behavior/incidents/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const [deleted] = await db.delete(behaviorIncidents)
    .where(and(eq(behaviorIncidents.id, id), eq(behaviorIncidents.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "الحادثة غير موجودة" }, 404);

  const year = deleted.incidentDate.slice(0, 4);
  await recalculateStudentScore(orgId, deleted.studentId, year);

  return c.json({ success: true });
});

// GET /behavior/compensations — قائمة التعويضات
router.get("/behavior/compensations", async (c) => {
  const orgId     = getOrgId(c);
  const studentId = c.req.query("studentId");
  const dateFrom  = c.req.query("dateFrom");
  const dateTo    = c.req.query("dateTo");

  const conditions = [eq(behaviorCompensations.orgId, orgId)];
  if (studentId) conditions.push(eq(behaviorCompensations.studentId, studentId));
  if (dateFrom)  conditions.push(sql`${behaviorCompensations.compensationDate} >= ${dateFrom}`);
  if (dateTo)    conditions.push(sql`${behaviorCompensations.compensationDate} <= ${dateTo}`);

  const comps = await db
    .select({
      id:               behaviorCompensations.id,
      studentId:        behaviorCompensations.studentId,
      studentName:      students.fullName,
      studentNumber:    students.studentNumber,
      compensationDate: behaviorCompensations.compensationDate,
      compensationType: behaviorCompensations.compensationType,
      description:      behaviorCompensations.description,
      pointsAdded:      behaviorCompensations.pointsAdded,
      createdAt:        behaviorCompensations.createdAt,
    })
    .from(behaviorCompensations)
    .innerJoin(students, eq(behaviorCompensations.studentId, students.id))
    .where(and(...conditions))
    .orderBy(desc(behaviorCompensations.compensationDate))
    .limit(200);

  return c.json({ data: comps });
});

// POST /behavior/compensations — تسجيل تعويض
router.post("/behavior/compensations", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();
  const schema = z.object({
    studentId:        z.string().uuid(),
    compensationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    compensationType: z.string().min(1).max(100),
    description:      z.string().max(500).optional().nullable(),
    pointsAdded:      z.number().int().min(1).max(20).default(5),
  });
  const data = schema.parse(body);

  const [student] = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, data.studentId), eq(students.orgId, orgId)))
    .limit(1);
  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  const compensationDate = data.compensationDate ?? new Date().toISOString().split("T")[0];

  const [comp] = await db.insert(behaviorCompensations).values({
    orgId,
    studentId:        data.studentId,
    compensationDate,
    compensationType: data.compensationType,
    description:      data.description ?? null,
    pointsAdded:      data.pointsAdded,
    recordedBy:       userId ?? undefined,
  } as any).returning();

  const year = compensationDate.slice(0, 4);
  await recalculateStudentScore(orgId, data.studentId, year);

  return c.json({ data: comp }, 201);
});

// DELETE /behavior/compensations/:id
router.delete("/behavior/compensations/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const [deleted] = await db.delete(behaviorCompensations)
    .where(and(eq(behaviorCompensations.id, id), eq(behaviorCompensations.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "التعويض غير موجود" }, 404);

  const year = deleted.compensationDate.slice(0, 4);
  await recalculateStudentScore(orgId, deleted.studentId, year);

  return c.json({ success: true });
});

// GET /behavior/scores — نقاط السلوك لجميع الطلاب
router.get("/behavior/scores", async (c) => {
  const orgId = getOrgId(c);
  const year  = c.req.query("year") ?? new Date().getFullYear().toString();

  const scores = await db
    .select({
      id:              studentBehaviorScores.id,
      studentId:       studentBehaviorScores.studentId,
      studentName:     students.fullName,
      studentNumber:   students.studentNumber,
      classRoomId:     students.classRoomId,
      classGrade:      classRooms.grade,
      className:       classRooms.name,
      behaviorScore:   studentBehaviorScores.behaviorScore,
      attendanceScore: studentBehaviorScores.attendanceScore,
      totalScore:      studentBehaviorScores.totalScore,
      lastCalculatedAt: studentBehaviorScores.lastCalculatedAt,
    })
    .from(studentBehaviorScores)
    .innerJoin(students, eq(studentBehaviorScores.studentId, students.id))
    .leftJoin(classRooms, eq(students.classRoomId, classRooms.id))
    .where(and(
      eq(studentBehaviorScores.orgId, orgId),
      eq(studentBehaviorScores.academicYear, year),
    ))
    .orderBy(asc(studentBehaviorScores.totalScore))
    .limit(500);

  return c.json({ data: scores });
});

// POST /behavior/scores/recalculate — إعادة حساب نقاط جميع الطلاب
router.post("/behavior/scores/recalculate", async (c) => {
  const orgId = getOrgId(c);
  const year  = (await c.req.json().catch(() => ({}))).year ?? new Date().getFullYear().toString();

  const allStudents = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.orgId, orgId), eq(students.isActive, true)));

  for (const s of allStudents) {
    await recalculateStudentScore(orgId, s.id, year);
  }

  return c.json({ data: { recalculated: allStudents.length } });
});

// GET /behavior/notifications — إشعارات أولياء الأمور
router.get("/behavior/notifications", async (c) => {
  const orgId     = getOrgId(c);
  const studentId = c.req.query("studentId");

  const conditions = [eq(guardianNotifications.orgId, orgId)];
  if (studentId) conditions.push(eq(guardianNotifications.studentId, studentId));

  const notifs = await db
    .select({
      id:               guardianNotifications.id,
      studentId:        guardianNotifications.studentId,
      studentName:      students.fullName,
      notificationDate: guardianNotifications.notificationDate,
      notificationType: guardianNotifications.notificationType,
      message:          guardianNotifications.message,
      sentTo:           guardianNotifications.sentTo,
      status:           guardianNotifications.status,
      createdAt:        guardianNotifications.createdAt,
    })
    .from(guardianNotifications)
    .innerJoin(students, eq(guardianNotifications.studentId, students.id))
    .where(and(...conditions))
    .orderBy(desc(guardianNotifications.notificationDate))
    .limit(200);

  return c.json({ data: notifs });
});

// POST /behavior/notifications — تسجيل إشعار
router.post("/behavior/notifications", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();
  const schema = z.object({
    studentId:        z.string().uuid(),
    incidentId:       z.string().uuid().optional().nullable(),
    notificationType: z.enum(["sms","call","meeting","letter"]),
    message:          z.string().max(1000).optional().nullable(),
    sentTo:           z.string().max(200).optional().nullable(),
    status:           z.enum(["sent","delivered","failed"]).default("sent"),
  });
  const data = schema.parse(body);

  const [student] = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, data.studentId), eq(students.orgId, orgId)))
    .limit(1);
  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  const [notif] = await db.insert(guardianNotifications).values({
    orgId,
    studentId:        data.studentId,
    incidentId:       data.incidentId ?? null,
    notificationType: data.notificationType,
    message:          data.message ?? null,
    sentTo:           data.sentTo ?? null,
    status:           data.status,
    sentBy:           userId ?? undefined,
  } as any).returning();

  // Mark incident as guardian notified if linked
  if (data.incidentId) {
    await db.update(behaviorIncidents)
      .set({ guardianNotified: true, updatedAt: new Date() })
      .where(and(eq(behaviorIncidents.id, data.incidentId), eq(behaviorIncidents.orgId, orgId)));
  }

  return c.json({ data: notif }, 201);
});

// GET /behavior/constants — ثوابت النظام للفرونت
router.get("/behavior/constants", async (c) => {
  const { ELEMENTARY_VIOLATIONS, SECONDARY_VIOLATIONS, COMPENSATION_TYPES,
          ABSENCE_ESCALATION, VALID_EXCUSES, BEHAVIOR_RATING_LEVELS,
          DEDUCTION_BY_DEGREE: DED } = await import("../constants/behaviorSystem");
  return c.json({
    data: {
      elementaryViolations: ELEMENTARY_VIOLATIONS,
      secondaryViolations:  SECONDARY_VIOLATIONS,
      compensationTypes:    COMPENSATION_TYPES,
      absenceEscalation:    ABSENCE_ESCALATION,
      validExcuses:         VALID_EXCUSES,
      ratingLevels:         BEHAVIOR_RATING_LEVELS,
      deductionByDegree:    DED,
    }
  });
});

export const schoolRouter = router;
