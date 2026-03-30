import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, inArray, sql, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  schoolSettings,
  classRooms,
  students,
  schoolCases,
  schoolCaseSteps,
  schoolViolationCategories,
  schoolViolations,
  studentAttendance,
  studentBehaviorScores,
  behaviorIncidents,
  behaviorCompensations,
  guardianNotifications,
  counselingSessions,
  studentReferrals,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../../lib/helpers";
import { logSchoolAudit, withSchoolScope } from "../../middleware/school";
import { requirePerm } from "../../middleware/auth";
import type { SchoolEnv } from "../../middleware/school";
import { sendSchoolWhatsApp, fillTemplate, schoolCaseSchema, schoolCaseStepSchema } from "./shared";
import { DEDUCTION_BY_DEGREE, BEHAVIOR_SCORE_CONFIG } from "../../constants/behaviorSystem";

const router = new Hono<SchoolEnv>();

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

// خريطة الدرجة الافتراضية بناءً على الخطورة
const SEVERITY_DEFAULT_DEGREE: Record<string, string> = {
  low: "1", medium: "3", high: "5",
};

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
// BEHAVIOR SYSTEM routes
// ============================================================

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
          DEDUCTION_BY_DEGREE: DED } = await import("../../constants/behaviorSystem");
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

export const behaviorRouter = router;
