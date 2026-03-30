import { Hono } from "hono";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  schoolSettings,
  classRooms,
  students,
  scheduleEntries,
  timetableTemplatePeriods,
  teacherProfiles,
  scheduleWeeks,
  schoolCases,
  studentAttendance,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../../lib/helpers";
import { requirePerm } from "../../middleware/auth";
import { withSchoolScope } from "../../middleware/school";
import type { SchoolEnv } from "../../middleware/school";
import { sendSchoolWhatsApp, fillTemplate, getCurrentPeriod, DAY_OF_WEEK_MAP } from "./shared";
import type { PeriodSlot } from "./shared";
import { count, or } from "drizzle-orm";

const router = new Hono<SchoolEnv>();

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

export const attendanceRouter = router;
