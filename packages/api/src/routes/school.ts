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
  subjects,
  gradeLevels,
  subjectGradeLevels,
  schoolWhatsappLogs,
  teacherAttendance,
  schoolSemesters,
  schoolEvents,
  schoolStandbyActivations,
  schoolTimetable,
  jobTitles,
  jobTitlePermissions,
  schoolStaffProfiles,
  teacherPreparations,
  teacherDailyLogs,
  teacherStudentNotes,
  studentReferrals,
  counselingSessions,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { logSchoolAudit, withSchoolScope } from "../middleware/school";
import { requirePerm } from "../middleware/auth";
import { DEDUCTION_BY_DEGREE, BEHAVIOR_SCORE_CONFIG } from "../constants/behaviorSystem";
import { sendWhatsApp, isWhatsAppConfigured, whatsAppProvider } from "../lib/whatsapp";
import { initBaileys, getBaileysState, logoutBaileys, hasSavedSession } from "../lib/whatsappBaileys";

// ── School WhatsApp helper ────────────────────────────────
async function sendSchoolWhatsApp(opts: {
  orgId: string;
  recipient: string;
  message: string;
  eventType: string;
  studentId?: string;
  teacherId?: string;
  refId?: string;
}) {
  const ok = await sendWhatsApp(opts.recipient, opts.message, opts.orgId).catch(() => false);
  await db.insert(schoolWhatsappLogs).values({
    orgId:     opts.orgId,
    studentId: opts.studentId ?? null,
    teacherId: opts.teacherId ?? null,
    recipient: opts.recipient,
    eventType: opts.eventType,
    message:   opts.message,
    status:    ok ? "sent" : "failed",
    refId:     opts.refId ?? null,
  }).catch(() => {});
  return ok;
}

function fillTemplate(tpl: string, vars: Record<string, string | undefined | null>): string {
  let s = tpl;
  for (const [k, v] of Object.entries(vars)) {
    if (!v) {
      // Remove the entire bullet line if value is empty
      s = s.replace(new RegExp(`^[•\\-]?\\s*[^\\n]*\\{${k}\\}[^\\n]*\\n?`, "gm"), "");
      s = s.replaceAll(`{${k}}`, "");
    } else {
      s = s.replaceAll(`{${k}}`, v);
    }
  }
  // Clean up consecutive blank lines
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

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
  schoolName:            z.string().min(1).max(200),
  schoolLogoUrl:         z.string().url().optional().nullable(),
  schoolAddress:         z.string().max(500).optional().nullable(),
  schoolPhone:           z.string().max(20).optional().nullable(),
  schoolEmail:           z.string().email().optional().nullable(),
  schoolRegion:          z.string().max(100).optional().nullable(),
  schoolType:            z.enum(["حكومية", "أهلية", "دولية"]).optional().nullable(),
  educationLevel:        z.enum(["ابتدائية", "متوسطة", "ثانوية", "شاملة"]).optional().nullable(),
  // توقيت الدوام
  sessionStartTime:      z.string().max(10).optional().nullable(),
  sessionEndTime:        z.string().max(10).optional().nullable(),
  periodDurationMinutes: z.coerce.number().int().min(20).max(120).optional().nullable(),
  breakDurationMinutes:  z.coerce.number().int().min(5).max(60).optional().nullable(),
  numberOfPeriods:       z.coerce.number().int().min(1).max(15).optional().nullable(),
  sessionType:           z.enum(["winter", "summer", "ramadan"]).optional().nullable(),
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
  semesterId:  z.string().uuid().optional().nullable(),
  templateId:  z.string().uuid().optional().nullable(),
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

import type { SchoolEnv } from "../middleware/school";
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

router.get("/students", requirePerm("school.students.read"), withSchoolScope, async (c) => {
  const orgId = getOrgId(c);
  const scope = c.get("schoolScope");
  const classRoomId    = c.req.query("classRoomId");
  const search         = c.req.query("search");
  const isActiveParam  = c.req.query("isActive");
  const gradeFilter    = c.req.query("grade");
  const unassignedOnly = c.req.query("unassigned") === "true";
  const pageParam      = parseInt(c.req.query("page") ?? "1", 10);
  const limitParam     = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
  const offset         = (pageParam - 1) * limitParam;

  const conditions = [eq(students.orgId, orgId)];

  // Scope: المعلم يرى طلاب فصوله فقط
  if (scope?.classRoomIds) {
    conditions.push(inArray(students.classRoomId, scope.classRoomIds));
  } else if (classRoomId) {
    conditions.push(eq(students.classRoomId, classRoomId));
  }

  // dummy to keep linter happy — original classRoomId check below is now replaced
  void classRoomId;
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
router.get("/students/unassigned", requirePerm("school.students.read"), async (c) => {
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
      degree:          schoolViolations.degree,
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

router.post("/students", requirePerm("school.students.write"), async (c) => {
  const orgId = getOrgId(c);
  const body = studentSchema.parse(await c.req.json());

  const [created] = await db
    .insert(students)
    .values({ orgId, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/students/:id", requirePerm("school.students.write"), async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id")!;
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

router.delete("/students/:id", requirePerm("school.students.write"), async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

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

router.get("/cases", requirePerm("school.cases.access"), async (c) => {
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

router.post("/cases", requirePerm("school.cases.access"), async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = schoolCaseSchema.parse(await c.req.json());

  const [created] = await db
    .insert(schoolCases)
    .values({ orgId, createdBy: userId ?? undefined, ...body })
    .returning();

  return c.json({ data: created }, 201);
});

router.put("/cases/:id", requirePerm("school.cases.access"), async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;
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

  if (body.status) {
    void logSchoolAudit(c, "case.status_changed", "case", id ?? null, null, { status: body.status });
  }

  return c.json({ data: updated });
});

router.get("/cases/:id", requirePerm("school.cases.access"), async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

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

router.post("/cases/:caseId/steps", requirePerm("school.cases.access"), async (c) => {
  const orgId = getOrgId(c);
  const caseId = c.req.param("caseId")!;
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

router.delete("/cases/:caseId/steps/:id", requirePerm("school.cases.access"), async (c) => {
  const orgId = getOrgId(c);
  const caseId = c.req.param("caseId")!;
  const id = c.req.param("id")!;

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
// CURRENT PERIOD ENGINE
// ============================================================

type PeriodSlot = {
  periodNumber: number;
  label:        string | null;
  startTime:    string;
  endTime:      string;
  isBreak:      boolean | null;
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getCurrentPeriod(nowStr: string, periods: PeriodSlot[]): {
  current: (PeriodSlot & { minutesRemaining: number }) | null;
  next:    (PeriodSlot & { minutesUntil: number }) | null;
  status:  "in_period" | "in_break" | "before_school" | "after_school";
} {
  if (!periods.length) return { current: null, next: null, status: "before_school" };

  const now    = timeToMinutes(nowStr);
  const sorted = [...periods].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const first  = timeToMinutes(sorted[0].startTime);
  const last   = timeToMinutes(sorted[sorted.length - 1].endTime);

  if (now < first) {
    return { current: null, next: { ...sorted[0], minutesUntil: first - now }, status: "before_school" };
  }
  if (now >= last) {
    return { current: null, next: null, status: "after_school" };
  }

  // داخل حصة أو فسحة
  for (let i = 0; i < sorted.length; i++) {
    const p     = sorted[i];
    const start = timeToMinutes(p.startTime);
    const end   = timeToMinutes(p.endTime);
    if (now >= start && now < end) {
      const next = sorted[i + 1] ?? null;
      return {
        current: { ...p, minutesRemaining: end - now },
        next: next ? { ...next, minutesUntil: timeToMinutes(next.startTime) - now } : null,
        status: p.isBreak ? "in_break" : "in_period",
      };
    }
    // فجوة بين حصتين (نادراً)
    if (i < sorted.length - 1) {
      const nextP     = sorted[i + 1];
      const nextStart = timeToMinutes(nextP.startTime);
      if (now >= end && now < nextStart) {
        return {
          current: null,
          next: { ...nextP, minutesUntil: nextStart - now },
          status: "in_break",
        };
      }
    }
  }

  return { current: null, next: null, status: "after_school" };
}

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

  // الوقت الحالي بتوقيت السعودية (UTC+3)
  const nowDate = new Date();
  const nowStr  = `${String(nowDate.getUTCHours() + 3).padStart(2, "0")}:${String(nowDate.getUTCMinutes()).padStart(2, "0")}`;

  // جلب كل periods اليوم (بدون تكرار) لمحرك الحصة الحالية
  const uniquePeriods: PeriodSlot[] = [];
  const seenPeriodIds = new Set<string>();
  for (const entry of todayEntries as any[]) {
    if (entry.periodId && !seenPeriodIds.has(entry.periodId)) {
      seenPeriodIds.add(entry.periodId);
      uniquePeriods.push({
        periodNumber: entry.periodNumber,
        label:        entry.periodLabel,
        startTime:    entry.startTime,
        endTime:      entry.endTime,
        isBreak:      entry.isBreak,
      });
    }
  }

  // إضافة الفسحات من القالب إن وجدت (قد لا تكون في scheduleEntries)
  if (activeWeek) {
    const [weekRow] = await db.select({ templateId: scheduleWeeks.templateId })
      .from(scheduleWeeks)
      .where(and(eq(scheduleWeeks.id, activeWeek.id), eq(scheduleWeeks.orgId, orgId)))
      .limit(1);
    if (weekRow?.templateId) {
      const allPeriods = await db.select({
        id:           timetableTemplatePeriods.id,
        periodNumber: timetableTemplatePeriods.periodNumber,
        label:        timetableTemplatePeriods.label,
        startTime:    timetableTemplatePeriods.startTime,
        endTime:      timetableTemplatePeriods.endTime,
        isBreak:      timetableTemplatePeriods.isBreak,
      })
      .from(timetableTemplatePeriods)
      .where(and(
        eq(timetableTemplatePeriods.templateId, weekRow.templateId!),
        eq(timetableTemplatePeriods.orgId, orgId),
      ));
      for (const p of allPeriods) {
        if (!seenPeriodIds.has(p.id)) {
          uniquePeriods.push({ periodNumber: p.periodNumber, label: p.label, startTime: p.startTime, endTime: p.endTime, isBreak: p.isBreak });
        }
      }
    }
  }

  const periodEngine = getCurrentPeriod(nowStr, uniquePeriods);

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
      periodEngine: {
        nowStr,
        currentPeriod: periodEngine.current,
        nextPeriod:    periodEngine.next,
        status:        periodEngine.status,
      },
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
  subject:          z.string().min(1).max(200),
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
      subject:          body.subject,
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

  // الأسبوع النشط
  const [settings] = await db
    .select({ activeWeekId: schoolSettings.activeWeekId })
    .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
  if (!settings?.activeWeekId) {
    return c.json({ error: "لا يوجد أسبوع نشط — قم بإعداد العام الدراسي أولاً" }, 400);
  }

  // قالب الأسبوع النشط
  const [week] = await db
    .select({ templateId: scheduleWeeks.templateId })
    .from(scheduleWeeks)
    .where(and(eq(scheduleWeeks.id, settings.activeWeekId), eq(scheduleWeeks.orgId, orgId))).limit(1);
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
  { name: "التأخر عن الحضور",             severity: "low",    color: "#3b82f6", description: "الحضور بعد موعد الطابور الصباحي أو بداية الحصة" },
  { name: "عدم ارتداء الزي المدرسي",      severity: "low",    color: "#8b5cf6", description: "الحضور بزي غير نظامي أو غير مكتمل" },
  { name: "إهمال الواجبات المنزلية",      severity: "low",    color: "#6366f1", description: "عدم أداء أو تسليم الواجبات المطلوبة" },
  { name: "عدم إحضار الأدوات الدراسية",  severity: "low",    color: "#a78bfa", description: "نسيان الكتب أو الأدوات اللازمة للدرس" },
  { name: "عدم الانضباط في الطابور",     severity: "low",    color: "#7c3aed", description: "التصرف بشكل غير منظم أثناء الطابور الصباحي" },
  { name: "الإخلال بالنظام داخل الفصل",  severity: "low",    color: "#2563eb", description: "التشويش على سير الدرس أو إزعاج الزملاء" },
  { name: "الفوضى في الممرات والساحة",   severity: "low",    color: "#0284c7", description: "التصرف بشكل مزعج في الممرات أو الساحة أثناء الفسحة" },
  { name: "النوم أثناء الدرس",            severity: "low",    color: "#0369a1", description: "النوم أو الإغفاء داخل الفصل أثناء الحصة" },
  { name: "تلويث بيئة المدرسة",          severity: "low",    color: "#4f46e5", description: "إلقاء النفايات في غير أماكنها أو العبث بنظافة المدرسة" },
  // متوسطة
  { name: "الغياب غير المبرر",            severity: "medium", color: "#f59e0b", description: "الغياب عن المدرسة أو الحصص بدون مسوّغ نظامي" },
  { name: "استخدام الجوال أثناء الدراسة", severity: "medium", color: "#d97706", description: "استخدام الهاتف أو الأجهزة الإلكترونية داخل الفصل" },
  { name: "الإساءة اللفظية",              severity: "medium", color: "#b45309", description: "توجيه كلام مسيء أو غير لائق للمعلمين أو الزملاء" },
  { name: "الخروج من المدرسة بدون إذن",  severity: "medium", color: "#92400e", description: "مغادرة المدرسة أو الفصل بدون تصريح رسمي" },
  { name: "التقصير في الاختبارات",        severity: "medium", color: "#78350f", description: "عدم الاستعداد أو إهمال الاختبارات والتقييمات" },
  { name: "الكذب والتضليل",              severity: "medium", color: "#ca8a04", description: "تقديم معلومات كاذبة للمعلمين أو الإدارة" },
  { name: "إتلاف أدوات الزملاء",         severity: "medium", color: "#a16207", description: "إتلاف أو سرقة مقتنيات الطلاب الآخرين" },
  { name: "السلوك غير اللائق",           severity: "medium", color: "#854d0e", description: "أي تصرف يتنافى مع الآداب العامة داخل المدرسة" },
  // مرتفعة
  { name: "الغش في الاختبارات",           severity: "high",   color: "#ef4444", description: "محاولة الغش أو إدخال مواد مساعدة غير مسموح بها" },
  { name: "الاعتداء الجسدي على الزملاء", severity: "high",   color: "#dc2626", description: "الاعتداء بالضرب أو الإيذاء الجسدي على الطلاب" },
  { name: "الاعتداء على أحد المعلمين",   severity: "high",   color: "#b91c1c", description: "الاعتداء اللفظي أو الجسدي على المعلم أو العاملين" },
  { name: "التنمر والإيذاء",              severity: "high",   color: "#991b1b", description: "الإيذاء المتكرر للزملاء سواء جسدياً أو نفسياً أو إلكترونياً" },
  { name: "التخريب في ممتلكات المدرسة",  severity: "high",   color: "#7f1d1d", description: "إتلاف أو تكسير أو العبث بممتلكات المدرسة" },
  { name: "التدخين",                      severity: "high",   color: "#6b1111", description: "التدخين داخل نطاق المدرسة أو الحافلة المدرسية" },
  { name: "التهديد والابتزاز",            severity: "high",   color: "#7c2020", description: "تهديد الزملاء أو ابتزازهم مادياً أو معنوياً" },
  { name: "إحضار مواد ممنوعة",           severity: "high",   color: "#881337", description: "إحضار أسلحة أو مواد خطيرة أو محتوى غير لائق للمدرسة" },
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
    .values(DEFAULT_VIOLATION_CATEGORIES.map((cat) => ({
      orgId,
      ...cat,
      defaultDegree: SEVERITY_DEFAULT_DEGREE[cat.severity] ?? "1",
    })))
    .returning();
  return c.json({ data: inserted });
});

// خريطة الدرجة الافتراضية بناءً على الخطورة
const SEVERITY_DEFAULT_DEGREE: Record<string, string> = {
  low: "1", medium: "3", high: "5",
};

router.post("/violation-categories", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const schema = z.object({
    name:          z.string().min(1).max(100),
    description:   z.string().max(500).optional().nullable(),
    severity:      z.enum(["low", "medium", "high"]).default("medium"),
    color:         z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f59e0b"),
    defaultDegree: z.enum(["1","2","3","4","5"]).optional(),
  });
  const data = schema.parse(body);
  // إذا لم تُحدَّد الدرجة، اشتقها من الخطورة
  const defaultDegree = data.defaultDegree ?? SEVERITY_DEFAULT_DEGREE[data.severity] ?? "1";
  const [cat] = await db.insert(schoolViolationCategories).values({
    orgId,
    ...data,
    defaultDegree,
  }).returning();
  return c.json({ data: cat }, 201);
});

router.put("/violation-categories/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const schema = z.object({
    name:          z.string().min(1).max(100).optional(),
    description:   z.string().max(500).optional().nullable(),
    severity:      z.enum(["low", "medium", "high"]).optional(),
    color:         z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    defaultDegree: z.enum(["1","2","3","4","5"]).optional(),
    isActive:      z.boolean().optional(),
  });
  const data = schema.parse(body);
  // إذا تغيّرت الخطورة ولم تُحدَّد درجة، حدّث الدرجة تلقائياً
  const updatePayload: any = { ...data };
  if (data.severity && !data.defaultDegree) {
    updatePayload.defaultDegree = SEVERITY_DEFAULT_DEGREE[data.severity];
  }
  const [updated] = await db.update(schoolViolationCategories)
    .set(updatePayload)
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

router.get("/violations", requirePerm("school.behavior.view"), async (c) => {
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
      degree:          schoolViolations.degree,
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

router.post("/violations", requirePerm("school.behavior.write"), async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();
  const schema = z.object({
    studentId:      z.string().uuid(),
    categoryId:     z.string().uuid().optional().nullable(),
    description:    z.string().max(1000).optional().nullable(),
    violationDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    degree:         z.enum(["1","2","3","4","5"]).default("1"),
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
    degree:        data.degree,
    violationDate: data.violationDate ?? new Date().toISOString().split("T")[0],
    recordedBy:    userId ?? undefined,
  }).returning();

  // ── إشعار واتساب لولي الأمر ───────────────────────────
  (async () => {
    try {
      const [settings] = await db.select({ notificationSettings: schoolSettings.notificationSettings })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
      const ns = (settings?.notificationSettings ?? {}) as Record<string, any>;
      if (!ns.notifyGuardianOnViolation) return;

      const [stu] = await db.select({
        fullName: students.fullName, grade: students.grade, guardianPhone: students.guardianPhone,
      }).from(students).where(eq(students.id, data.studentId)).limit(1);
      if (!stu?.guardianPhone) return;

      let categoryName = "";
      if (data.categoryId) {
        const [cat] = await db.select({ name: schoolViolationCategories.name })
          .from(schoolViolationCategories).where(eq(schoolViolationCategories.id, data.categoryId!)).limit(1);
        categoryName = cat?.name ?? "";
      }

      const [schoolRow] = await db.select({ schoolName: schoolSettings.schoolName, schoolPhone: schoolSettings.schoolPhone })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);

      const msg = fillTemplate(ns.violationMessage ?? "{school_name}\nطالبكم {student_name} ({grade})\nمخالفة: {category} - الدرجة {degree}\nبتاريخ {date}", {
        school_name:  schoolRow?.schoolName ?? "المدرسة",
        student_name: stu.fullName,
        grade:        stu.grade ?? "",
        category:     categoryName || (data.description ?? "مخالفة"),
        degree:       data.degree,
        date:         violation.violationDate ?? new Date().toISOString().split("T")[0],
      });

      await sendSchoolWhatsApp({ orgId, recipient: stu.guardianPhone, message: msg, eventType: "violation", studentId: data.studentId, refId: violation.id });
    } catch {}
  })();

  // Audit log — تسجيل المخالفة
  void logSchoolAudit(c, "violation.created", "violation", violation.id, null, { studentId: violation.studentId, degree: violation.degree, violationDate: violation.violationDate });

  return c.json({ data: violation }, 201);
});

router.put("/violations/:id", requirePerm("school.behavior.write"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;
  const body  = await c.req.json();
  const schema = z.object({
    categoryId:      z.string().uuid().optional().nullable(),
    description:     z.string().max(1000).optional().nullable(),
    violationDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    degree:          z.enum(["1","2","3","4","5"]).optional(),
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

router.delete("/violations/:id", requirePerm("school.behavior.write"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;
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
router.get("/attendance", requirePerm("school.attendance.record"), withSchoolScope, async (c) => {
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
router.post("/attendance/bulk", requirePerm("school.attendance.record"), async (c) => {
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

  // ── إشعار واتساب للغياب ───────────────────────────────
  (async () => {
    try {
      const [settings] = await db.select({ notificationSettings: schoolSettings.notificationSettings })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
      const ns = (settings?.notificationSettings ?? {}) as Record<string, any>;
      if (!ns.notifyGuardianOnAbsence) return;

      const [schoolRow] = await db.select({ schoolName: schoolSettings.schoolName })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);

      const absentIds = body.records.filter(r => r.status === "absent").map(r => r.studentId);
      if (!absentIds.length) return;

      const absentStudents = await db.select({
        id: students.id, fullName: students.fullName, grade: students.grade, guardianPhone: students.guardianPhone,
      }).from(students).where(and(eq(students.orgId, orgId), inArray(students.id, absentIds)));

      for (const stu of absentStudents) {
        if (!stu.guardianPhone) continue;
        const msg = fillTemplate(ns.absenceMessage ?? "{school_name}\nغياب طالبكم {student_name} ({grade}) بتاريخ {date}", {
          school_name:  schoolRow?.schoolName ?? "المدرسة",
          student_name: stu.fullName,
          grade:        stu.grade ?? "",
          date:         body.date,
        });
        await sendSchoolWhatsApp({ orgId, recipient: stu.guardianPhone, message: msg, eventType: "absence", studentId: stu.id });
      }
    } catch {}
  })();

  // ── إشعار واتساب للتأخر ────────────────────────────────
  (async () => {
    try {
      const [settings2] = await db.select({ notificationSettings: schoolSettings.notificationSettings })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);
      const ns2 = (settings2?.notificationSettings ?? {}) as Record<string, any>;
      if (!ns2.notifyGuardianOnLate) return;

      const [schoolRow2] = await db.select({ schoolName: schoolSettings.schoolName })
        .from(schoolSettings).where(eq(schoolSettings.orgId, orgId)).limit(1);

      const lateIds = body.records.filter(r => r.status === "late").map(r => r.studentId);
      if (!lateIds.length) return;

      const lateStudents = await db.select({
        id: students.id, fullName: students.fullName, grade: students.grade, guardianPhone: students.guardianPhone,
      }).from(students).where(and(eq(students.orgId, orgId), inArray(students.id, lateIds)));

      const now = new Date();
      const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: false });

      for (const stu of lateStudents) {
        if (!stu.guardianPhone) continue;
        const msg = fillTemplate(ns2.lateMessage ?? "{school_name}\nتأخر الطالب {student_name} ({grade}) بتاريخ {date} الساعة {time}", {
          school_name:  schoolRow2?.schoolName ?? "المدرسة",
          student_name: stu.fullName,
          grade:        stu.grade ?? "",
          date:         body.date,
          time:         timeStr,
        });
        await sendSchoolWhatsApp({ orgId, recipient: stu.guardianPhone, message: msg, eventType: "late", studentId: stu.id });
      }
    } catch {}
  })();

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

// GET /attendance/stats?classRoomId=&month=&date= — إحصائيات الحضور
router.get("/attendance/stats", async (c) => {
  const orgId       = getOrgId(c);
  const classRoomId = c.req.query("classRoomId");
  const month       = c.req.query("month"); // YYYY-MM
  const date        = c.req.query("date");  // YYYY-MM-DD

  const conditions = [eq(studentAttendance.orgId, orgId)];
  if (classRoomId) conditions.push(eq(studentAttendance.classRoomId, classRoomId));
  if (date)  conditions.push(eq(studentAttendance.attendanceDate, date));
  else if (month) conditions.push(sql`to_char(${studentAttendance.attendanceDate}, 'YYYY-MM') = ${month}`);

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
router.get("/behavior/overview", requirePerm("school.behavior.view"), async (c) => {
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
router.get("/behavior/incidents", requirePerm("school.behavior.view"), async (c) => {
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
router.post("/behavior/incidents", requirePerm("school.behavior.write"), async (c) => {
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

  void logSchoolAudit(c, "violation.created", "behaviorIncident", incident.id, null, {
    studentId: data.studentId, degree: data.degree, incidentDate,
  });

  return c.json({ data: incident }, 201);
});

// PUT /behavior/incidents/:id — تعديل حادثة
router.put("/behavior/incidents/:id", requirePerm("school.behavior.write"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;
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
router.delete("/behavior/incidents/:id", requirePerm("school.behavior.write"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;
  const [deleted] = await db.delete(behaviorIncidents)
    .where(and(eq(behaviorIncidents.id, id), eq(behaviorIncidents.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "الحادثة غير موجودة" }, 404);

  const year = deleted.incidentDate.slice(0, 4);
  await recalculateStudentScore(orgId, deleted.studentId, year);

  return c.json({ success: true });
});

// GET /behavior/compensations — قائمة التعويضات
router.get("/behavior/compensations", requirePerm("school.behavior.view"), async (c) => {
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
router.post("/behavior/compensations", requirePerm("school.behavior.write"), async (c) => {
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
router.delete("/behavior/compensations/:id", requirePerm("school.behavior.write"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;
  const [deleted] = await db.delete(behaviorCompensations)
    .where(and(eq(behaviorCompensations.id, id), eq(behaviorCompensations.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "التعويض غير موجود" }, 404);

  const year = deleted.compensationDate.slice(0, 4);
  await recalculateStudentScore(orgId, deleted.studentId, year);

  return c.json({ success: true });
});

// GET /behavior/scores — نقاط السلوك لجميع الطلاب
router.get("/behavior/scores", requirePerm("school.behavior.view"), async (c) => {
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
router.post("/behavior/scores/recalculate", requirePerm("school.behavior.write"), async (c) => {
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
router.get("/behavior/notifications", requirePerm("school.behavior.view"), async (c) => {
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
router.post("/behavior/notifications", requirePerm("school.behavior.write"), async (c) => {
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

// ============================================================
// SUBJECT SYSTEM — نظام المواد الدراسية الديناميكي
// ============================================================

// بيانات الإعداد الافتراضية لكل مرحلة
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
// WHATSAPP QR SESSION — ربط بالباركود
// ============================================================

// GET /whatsapp/session — current status + QR if available
router.get("/whatsapp/session", async (c) => {
  const orgId    = getOrgId(c);
  const state    = getBaileysState(orgId);
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
// TEACHER SYSTEM — Phase 2
// نظام المعلم: لوحة التحكم اليومية + التحضير + اليومية + الملاحظات
// ============================================================

// ── helper: رقم يوم الأسبوع → كود نصي ─────────────────────
const JS_DAY_TO_CODE: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

// ── GET /teacher/dashboard — لوحة التحكم اليومية ─────────────
// الصلاحية: school.teacher.dashboard — للمعلمين فقط
router.get("/teacher/dashboard", requirePerm("school.teacher.dashboard"), withSchoolScope, async (c) => {
  const orgId  = getOrgId(c);
  const scope  = c.get("schoolScope");

  // ✅ معلمون فقط — بقية الأدوار ترجع 403
  const teacherProfileId = scope?.teacherProfileId;
  if (!teacherProfileId) {
    return c.json({ error: "هذه الصفحة للمعلمين فقط", staffType: scope?.staffType ?? null }, 403);
  }

  // ── Timezone: Asia/Riyadh (UTC+3) ──
  // نستخدم Intl لحساب الوقت الصحيح بغض النظر عن timezone السيرفر
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
      .orderBy(desc(count()))       // ← الأكثر مخالفات أولاً
      .limit(5);                    // ← حد منطقي
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
      conds.push(lte(teacherDailyLogs.date, week.endDate));
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

// ============================================================
// STUDENT REFERRALS — الإحالات الطلابية
// ============================================================

// GET /referrals — قائمة الإحالات
router.get("/referrals", requirePerm("school.referrals.create"), withSchoolScope, async (c) => {
  const orgId  = getOrgId(c);
  const scope  = c.get("schoolScope");
  const status = c.req.query("status");
  const studentId = c.req.query("studentId");

  const conds = [eq(studentReferrals.orgId, orgId)];
  if (status)    conds.push(eq(studentReferrals.status, status as any));
  if (studentId) conds.push(eq(studentReferrals.studentId, studentId));

  // Counselor only sees referrals assigned to them
  if (scope?.staffType === "counselor" && scope.counselorUserId) {
    conds.push(eq(studentReferrals.assignedToUserId, scope.counselorUserId));
  }

  const rows = await db
    .select({
      id:               studentReferrals.id,
      studentId:        studentReferrals.studentId,
      studentName:      students.fullName,
      studentNumber:    students.studentNumber,
      referralDate:     studentReferrals.referralDate,
      referralType:     studentReferrals.referralType,
      reason:           studentReferrals.reason,
      urgency:          studentReferrals.urgency,
      status:           studentReferrals.status,
      assignedAt:       studentReferrals.assignedAt,
      resolvedAt:       studentReferrals.resolvedAt,
      notes:            studentReferrals.notes,
      caseId:           studentReferrals.caseId,
      createdAt:        studentReferrals.createdAt,
    })
    .from(studentReferrals)
    .innerJoin(students, eq(studentReferrals.studentId, students.id))
    .where(and(...conds))
    .orderBy(desc(studentReferrals.createdAt))
    .limit(200);

  return c.json({ data: rows });
});

// POST /referrals — إحالة طالب
router.post("/referrals", requirePerm("school.referrals.create"), async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c)!;

  const body = await c.req.json();
  const schema = z.object({
    studentId:    z.string().uuid(),
    referralDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split("T")[0]),
    referralType: z.enum(["counselor","vice_principal","medical"]),
    reason:       z.string().min(1).max(1000),
    urgency:      z.enum(["low","normal","high","urgent"]).default("normal"),
    notes:        z.string().max(1000).optional().nullable(),
    caseId:       z.string().uuid().optional().nullable(),
  });
  const data = schema.parse(body);

  const [student] = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, data.studentId), eq(students.orgId, orgId)))
    .limit(1);
  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  const [referral] = await db.insert(studentReferrals)
    .values({ orgId, referredByUserId: userId, ...data, notes: data.notes ?? null, caseId: data.caseId ?? null })
    .returning();

  void logSchoolAudit(c, "referral.created", "studentReferral", referral.id, null, {
    studentId: data.studentId, referralType: data.referralType, urgency: data.urgency,
  });

  return c.json({ data: referral }, 201);
});

// PUT /referrals/:id — تحديث حالة الإحالة
router.put("/referrals/:id", requirePerm("school.referrals.manage"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;

  const body = await c.req.json();
  const schema = z.object({
    status:           z.enum(["pending","assigned","in_progress","resolved","rejected"]).optional(),
    assignedToUserId: z.string().uuid().optional().nullable(),
    notes:            z.string().max(1000).optional().nullable(),
    caseId:           z.string().uuid().optional().nullable(),
  });
  const data = schema.parse(body);

  const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.status === "assigned" && !updates.assignedAt) updates.assignedAt = new Date();
  if (data.status === "resolved" && !updates.resolvedAt) updates.resolvedAt = new Date();

  const [updated] = await db.update(studentReferrals)
    .set(updates)
    .where(and(eq(studentReferrals.id, id), eq(studentReferrals.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "الإحالة غير موجودة" }, 404);

  void logSchoolAudit(c, "referral.assigned", "studentReferral", id, null, { status: data.status });

  return c.json({ data: updated });
});

// ============================================================
// COUNSELING SESSIONS — جلسات الإرشاد الطلابي
// ============================================================

// GET /counseling/sessions — قائمة الجلسات
router.get("/counseling/sessions", requirePerm("school.counseling.access"), withSchoolScope, async (c) => {
  const orgId  = getOrgId(c);
  const scope  = c.get("schoolScope");
  const status = c.req.query("status");
  const studentId = c.req.query("studentId");

  const conds = [eq(counselingSessions.orgId, orgId)];
  if (status)    conds.push(eq(counselingSessions.status, status as any));
  if (studentId) conds.push(eq(counselingSessions.studentId, studentId));

  // Counselor only sees their sessions
  if (scope?.staffType === "counselor" && scope.counselorUserId) {
    conds.push(eq(counselingSessions.counselorUserId, scope.counselorUserId));
  }

  const rows = await db
    .select({
      id:              counselingSessions.id,
      studentId:       counselingSessions.studentId,
      studentName:     students.fullName,
      sessionDate:     counselingSessions.sessionDate,
      sessionType:     counselingSessions.sessionType,
      durationMinutes: counselingSessions.durationMinutes,
      sessionNotes:    counselingSessions.sessionNotes,
      actionPlan:      counselingSessions.actionPlan,
      nextSessionDate: counselingSessions.nextSessionDate,
      status:          counselingSessions.status,
      caseId:          counselingSessions.caseId,
      referralId:      counselingSessions.referralId,
    })
    .from(counselingSessions)
    .innerJoin(students, eq(counselingSessions.studentId, students.id))
    .where(and(...conds))
    .orderBy(desc(counselingSessions.sessionDate))
    .limit(200);

  return c.json({ data: rows });
});

// POST /counseling/sessions — إنشاء جلسة
router.post("/counseling/sessions", requirePerm("school.counseling.access"), async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c)!;

  const body = await c.req.json();
  const schema = z.object({
    studentId:       z.string().uuid(),
    sessionDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sessionType:     z.enum(["individual","group","guardian"]),
    durationMinutes: z.number().int().min(1).max(240).optional().nullable(),
    sessionNotes:    z.string().max(3000).optional().nullable(),
    actionPlan:      z.string().max(1000).optional().nullable(),
    nextSessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    status:          z.enum(["scheduled","completed","cancelled"]).default("scheduled"),
    caseId:          z.string().uuid().optional().nullable(),
    referralId:      z.string().uuid().optional().nullable(),
  });
  const data = schema.parse(body);

  const [student] = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, data.studentId), eq(students.orgId, orgId)))
    .limit(1);
  if (!student) return c.json({ error: "الطالب غير موجود" }, 404);

  const [session] = await db.insert(counselingSessions)
    .values({ orgId, counselorUserId: userId, ...data,
      durationMinutes: data.durationMinutes ?? null,
      sessionNotes: data.sessionNotes ?? null,
      actionPlan: data.actionPlan ?? null,
      nextSessionDate: data.nextSessionDate ?? null,
      caseId: data.caseId ?? null,
      referralId: data.referralId ?? null,
    })
    .returning();

  return c.json({ data: session }, 201);
});

// PUT /counseling/sessions/:id — تحديث جلسة
router.put("/counseling/sessions/:id", requirePerm("school.counseling.access"), async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id")!;

  const body = await c.req.json();
  const schema = z.object({
    sessionNotes:    z.string().max(3000).optional().nullable(),
    actionPlan:      z.string().max(1000).optional().nullable(),
    nextSessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    durationMinutes: z.number().int().min(1).max(240).optional().nullable(),
    status:          z.enum(["scheduled","completed","cancelled"]).optional(),
  });
  const data = schema.parse(body);

  const [updated] = await db.update(counselingSessions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(counselingSessions.id, id), eq(counselingSessions.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "الجلسة غير موجودة" }, 404);
  return c.json({ data: updated });
});

export const schoolRouter = router;
