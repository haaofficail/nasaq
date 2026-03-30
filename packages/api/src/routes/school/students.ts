import { Hono } from "hono";
import { eq, and, desc, asc, ilike, or, count, sql, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@nasaq/db/client";
import {
  students,
  classRooms,
  studentTransfers,
  schoolViolations,
  schoolViolationCategories,
  schoolCases,
  studentAttendance,
  studentReferrals,
  counselingSessions,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../../lib/helpers";
import { requirePerm } from "../../middleware/auth";
import { withSchoolScope } from "../../middleware/school";
import { studentSchema } from "./shared";
import type { SchoolEnv } from "../../middleware/school";

const router = new Hono<SchoolEnv>();

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
// STUDENT REFERRALS — الإحالات الطلابية
// ============================================================

import { z } from "zod";
import { logSchoolAudit } from "../../middleware/school";

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

export const studentsRouter = router;
