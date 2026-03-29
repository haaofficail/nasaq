import { Hono } from "hono";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import {
  classRooms,
  teacherProfiles,
  students,
  scheduleEntries,
  scheduleWeeks,
  timetableTemplatePeriods,
  schoolImportLogs,
  schoolSettings,
} from "@nasaq/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getOrgId, getUserId } from "../lib/helpers";

export const schoolImportRouter = new Hono();

// ============================================================
// CONSTANTS
// ============================================================

const MAX_ROWS = 1000;

const VALID_TYPES = ["students", "teachers", "class_rooms", "schedule"] as const;
type ImportType = (typeof VALID_TYPES)[number];

const DAY_OF_WEEK_LABEL_MAP: Record<string, "sun" | "mon" | "tue" | "wed" | "thu"> = {
  sun:    "sun",
  mon:    "mon",
  tue:    "tue",
  wed:    "wed",
  thu:    "thu",
  الأحد:  "sun",
  الاثنين: "mon",
  الثلاثاء: "tue",
  الأربعاء: "wed",
  الخميس:  "thu",
};

// ============================================================
// TEMPLATE DEFINITIONS
// ============================================================

const TEMPLATES: Record<
  ImportType,
  { columns: string[]; sample_rows: Record<string, string>[]; notes: string }
> = {
  students: {
    columns: [
      "full_name",
      "student_number",
      "national_id",
      "grade",
      "class_name",
      "guardian_name",
      "guardian_phone",
    ],
    sample_rows: [
      {
        full_name:      "محمد عبدالله الأحمدي",
        student_number: "20250001",
        national_id:    "1098765432",
        grade:          "الأول",
        class_name:     "أ",
        guardian_name:  "عبدالله الأحمدي",
        guardian_phone: "0501234567",
      },
    ],
    notes:
      "grade وclass_name يجب أن يتطابقا مع فصل موجود في المنظومة. student_number اختياري لكن إذا أُدرج يجب أن يكون فريداً لكل منشأة.",
  },
  teachers: {
    columns: [
      "full_name",
      "employee_number",
      "subject",
      "phone",
      "email",
      "gender",
    ],
    sample_rows: [
      {
        full_name:       "سارة محمد القحطاني",
        employee_number: "T-2025-001",
        subject:         "الرياضيات",
        phone:           "0557654321",
        email:           "sara@school.edu.sa",
        gender:          "أنثى",
      },
    ],
    notes:
      "employee_number اختياري لكن إذا أُدرج يجب أن يكون فريداً. gender: ذكر أو أنثى.",
  },
  class_rooms: {
    columns: ["grade", "name", "capacity"],
    sample_rows: [
      { grade: "الأول",  name: "أ", capacity: "30" },
      { grade: "الثاني", name: "ب", capacity: "28" },
    ],
    notes:
      "مجموعة (grade + name) يجب أن تكون فريدة لكل منشأة. capacity اختياري (رقم صحيح موجب).",
  },
  schedule: {
    columns: [
      "grade",
      "class_name",
      "day_of_week",
      "period_number",
      "subject",
      "teacher_name",
    ],
    sample_rows: [
      {
        grade:         "الأول",
        class_name:    "أ",
        day_of_week:   "sun",
        period_number: "1",
        subject:       "الرياضيات",
        teacher_name:  "سارة محمد القحطاني",
      },
    ],
    notes:
      "day_of_week: sun/mon/tue/wed/thu أو الأحد/الاثنين/الثلاثاء/الأربعاء/الخميس. يتطلب وجود أسبوع نشط وقالب حصص في المنظومة. teacher_name اختياري.",
  },
};

// ============================================================
// ADAPTER INTERFACE
// ============================================================

interface RowError {
  row:     number;
  field:   string;
  message: string;
}

interface ValidationResult {
  valid:  boolean;
  errors: string[];
}

interface InsertResult {
  imported: number;
  skipped:  number;
  errors:   RowError[];
}

interface ImportAdapter {
  type:             ImportType;
  defaultColumnMap: Record<string, string>;
  requiredFields:   string[];
  validate: (
    row:    Record<string, string>,
    orgId:  string
  ) => Promise<ValidationResult>;
  transform: (
    row:       Record<string, string>,
    columnMap: Record<string, string>,
    orgId:     string
  ) => Record<string, unknown>;
  insert: (
    rows:  Record<string, unknown>[],
    orgId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbRef: any
  ) => Promise<InsertResult>;
}

// ============================================================
// HELPERS
// ============================================================

/** Map source row keys through columnMap → normalised target keys */
function applyColumnMap(
  raw:       Record<string, string>,
  columnMap: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [srcKey, value] of Object.entries(raw)) {
    const targetKey = columnMap[srcKey] ?? srcKey;
    out[targetKey] = value;
  }
  return out;
}

/** Trim all string values in an object */
function trimRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

// ============================================================
// ADAPTERS MAP
// ============================================================

const adapters: Record<ImportType, ImportAdapter> = {
  // ----------------------------------------------------------
  // STUDENTS
  // ----------------------------------------------------------
  students: {
    type: "students",
    defaultColumnMap: {
      full_name:      "full_name",
      student_number: "student_number",
      national_id:    "national_id",
      grade:          "grade",
      class_name:     "class_name",
      guardian_name:  "guardian_name",
      guardian_phone: "guardian_phone",
    },
    requiredFields: ["full_name"],

    async validate(row, _orgId) {
      const errors: string[] = [];
      if (!row.full_name) errors.push("full_name مطلوب");
      return { valid: errors.length === 0, errors };
    },

    transform(raw, columnMap, orgId) {
      const row = trimRow(applyColumnMap(raw, columnMap));
      return {
        orgId,
        fullName:      row.full_name   || null,
        studentNumber: row.student_number || null,
        nationalId:    row.national_id || null,
        guardianName:  row.guardian_name || null,
        guardianPhone: row.guardian_phone || null,
        // grade + class_name resolved to classRoomId at insert time
        _grade:        row.grade       || null,
        _className:    row.class_name  || null,
      };
    },

    async insert(rows, orgId, dbRef) {
      let imported = 0;
      let skipped  = 0;
      const errors: RowError[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as Record<string, unknown>;
        const rowIndex = i + 1;

        // Resolve classRoomId
        let classRoomId: string | null = null;
        const grade     = row._grade     as string | null;
        const className = row._className as string | null;

        if (grade && className) {
          const crResult = await dbRef
            .select({ id: classRooms.id })
            .from(classRooms)
            .where(
              and(
                eq(classRooms.orgId, orgId),
                eq(classRooms.grade, grade),
                eq(classRooms.name,  className)
              )
            )
            .limit(1);

          if (crResult.length === 0) {
            errors.push({
              row:     rowIndex,
              field:   "grade/class_name",
              message: `لم يُعثر على فصل: ${grade} / ${className}`,
            });
            continue;
          }
          classRoomId = crResult[0].id;
        }

        // Skip duplicate student_number within org
        const studentNumber = row.studentNumber as string | null;
        if (studentNumber) {
          const existing = await dbRef
            .select({ id: students.id })
            .from(students)
            .where(
              and(
                eq(students.orgId, orgId),
                eq(students.studentNumber, studentNumber)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        try {
          await dbRef.insert(students).values({
            orgId,
            classRoomId,
            fullName:      row.fullName      as string,
            studentNumber: row.studentNumber as string | null,
            nationalId:    row.nationalId    as string | null,
            guardianName:  row.guardianName  as string | null,
            guardianPhone: row.guardianPhone as string | null,
          });
          imported++;
        } catch (err) {
          errors.push({
            row:     rowIndex,
            field:   "insert",
            message: err instanceof Error ? err.message : "خطأ غير معروف",
          });
        }
      }

      return { imported, skipped, errors };
    },
  },

  // ----------------------------------------------------------
  // TEACHERS
  // ----------------------------------------------------------
  teachers: {
    type: "teachers",
    defaultColumnMap: {
      full_name:       "full_name",
      employee_number: "employee_number",
      subject:         "subject",
      phone:           "phone",
      email:           "email",
      gender:          "gender",
    },
    requiredFields: ["full_name"],

    async validate(row, _orgId) {
      const errors: string[] = [];
      if (!row.full_name) errors.push("full_name مطلوب");
      if (row.gender && !["ذكر", "أنثى"].includes(row.gender)) {
        errors.push("gender يجب أن يكون: ذكر أو أنثى");
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push("email غير صالح");
      }
      return { valid: errors.length === 0, errors };
    },

    transform(raw, columnMap, orgId) {
      const row = trimRow(applyColumnMap(raw, columnMap));
      return {
        orgId,
        fullName:       row.full_name       || null,
        employeeNumber: row.employee_number || null,
        subject:        row.subject         || null,
        phone:          row.phone           || null,
        email:          row.email           || null,
        gender:         row.gender          || null,
      };
    },

    async insert(rows, orgId, dbRef) {
      let imported = 0;
      let skipped  = 0;
      const errors: RowError[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row      = rows[i] as Record<string, unknown>;
        const rowIndex = i + 1;
        const employeeNumber = row.employeeNumber as string | null;

        if (employeeNumber) {
          const existing = await dbRef
            .select({ id: teacherProfiles.id })
            .from(teacherProfiles)
            .where(
              and(
                eq(teacherProfiles.orgId, orgId),
                eq(teacherProfiles.employeeNumber, employeeNumber)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        try {
          await dbRef.insert(teacherProfiles).values({
            orgId,
            fullName:       row.fullName       as string,
            employeeNumber: row.employeeNumber as string | null,
            subject:        row.subject        as string | null,
            phone:          row.phone          as string | null,
            email:          row.email          as string | null,
            gender:         row.gender         as string | null,
          });
          imported++;
        } catch (err) {
          errors.push({
            row:     rowIndex,
            field:   "insert",
            message: err instanceof Error ? err.message : "خطأ غير معروف",
          });
        }
      }

      return { imported, skipped, errors };
    },
  },

  // ----------------------------------------------------------
  // CLASS ROOMS
  // ----------------------------------------------------------
  class_rooms: {
    type: "class_rooms",
    defaultColumnMap: {
      grade:    "grade",
      name:     "name",
      capacity: "capacity",
    },
    requiredFields: ["grade", "name"],

    async validate(row, _orgId) {
      const errors: string[] = [];
      if (!row.grade) errors.push("grade مطلوب");
      if (!row.name)  errors.push("name مطلوب");
      if (row.capacity) {
        const cap = parseInt(row.capacity, 10);
        if (isNaN(cap) || cap <= 0) errors.push("capacity يجب أن يكون رقماً موجباً");
      }
      return { valid: errors.length === 0, errors };
    },

    transform(raw, columnMap, orgId) {
      const row = trimRow(applyColumnMap(raw, columnMap));
      return {
        orgId,
        grade:    row.grade    || null,
        name:     row.name     || null,
        capacity: row.capacity ? parseInt(row.capacity, 10) : null,
      };
    },

    async insert(rows, orgId, dbRef) {
      let imported = 0;
      let skipped  = 0;
      const errors: RowError[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row      = rows[i] as Record<string, unknown>;
        const rowIndex = i + 1;

        // Skip duplicate (grade + name) within org
        const existing = await dbRef
          .select({ id: classRooms.id })
          .from(classRooms)
          .where(
            and(
              eq(classRooms.orgId,  orgId),
              eq(classRooms.grade, row.grade as string),
              eq(classRooms.name,  row.name  as string)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        try {
          await dbRef.insert(classRooms).values({
            orgId,
            grade:    row.grade    as string,
            name:     row.name     as string,
            capacity: row.capacity as number | null,
          });
          imported++;
        } catch (err) {
          errors.push({
            row:     rowIndex,
            field:   "insert",
            message: err instanceof Error ? err.message : "خطأ غير معروف",
          });
        }
      }

      return { imported, skipped, errors };
    },
  },

  // ----------------------------------------------------------
  // SCHEDULE
  // ----------------------------------------------------------
  schedule: {
    type: "schedule",
    defaultColumnMap: {
      grade:         "grade",
      class_name:    "class_name",
      day_of_week:   "day_of_week",
      period_number: "period_number",
      subject:       "subject",
      teacher_name:  "teacher_name",
    },
    requiredFields: ["grade", "class_name", "day_of_week", "period_number", "subject"],

    async validate(row, _orgId) {
      const errors: string[] = [];
      if (!row.grade)         errors.push("grade مطلوب");
      if (!row.class_name)    errors.push("class_name مطلوب");
      if (!row.day_of_week)   errors.push("day_of_week مطلوب");
      if (!row.period_number) errors.push("period_number مطلوب");
      if (!row.subject)       errors.push("subject مطلوب");

      if (row.day_of_week && !DAY_OF_WEEK_LABEL_MAP[row.day_of_week]) {
        errors.push(
          `day_of_week غير صالح: ${row.day_of_week}. القيم المقبولة: sun/mon/tue/wed/thu أو بالعربي`
        );
      }
      if (row.period_number) {
        const pn = parseInt(row.period_number, 10);
        if (isNaN(pn) || pn <= 0) errors.push("period_number يجب أن يكون رقماً موجباً");
      }
      return { valid: errors.length === 0, errors };
    },

    transform(raw, columnMap, orgId) {
      const row = trimRow(applyColumnMap(raw, columnMap));
      return {
        orgId,
        _grade:        row.grade          || null,
        _className:    row.class_name     || null,
        _dayOfWeek:    row.day_of_week    || null,
        _periodNumber: row.period_number  ? parseInt(row.period_number, 10) : null,
        subject:       row.subject        || null,
        _teacherName:  row.teacher_name   || null,
      };
    },

    async insert(rows, orgId, dbRef) {
      let imported = 0;
      let skipped  = 0;
      const errors: RowError[] = [];

      // Fetch active week for this org (via school_settings.active_week_id)
      const settingsResult = await dbRef
        .select({ activeWeekId: schoolSettings.activeWeekId })
        .from(schoolSettings)
        .where(eq(schoolSettings.orgId, orgId))
        .limit(1);

      if (settingsResult.length === 0 || !settingsResult[0].activeWeekId) {
        return {
          imported: 0,
          skipped:  rows.length,
          errors: [{
            row:     0,
            field:   "week",
            message: "لا يوجد أسبوع نشط في إعدادات المدرسة. يجب تعيين الأسبوع النشط أولاً.",
          }],
        };
      }

      const activeWeekId = settingsResult[0].activeWeekId as string;

      // Load the template_id for the active week (needed to query periods)
      const weekResult = await dbRef
        .select({ templateId: scheduleWeeks.templateId })
        .from(scheduleWeeks)
        .where(
          and(
            eq(scheduleWeeks.orgId, orgId),
            eq(scheduleWeeks.id,    activeWeekId)
          )
        )
        .limit(1);

      if (weekResult.length === 0) {
        return {
          imported: 0,
          skipped:  rows.length,
          errors: [{
            row:     0,
            field:   "week",
            message: "الأسبوع النشط غير موجود في قاعدة البيانات.",
          }],
        };
      }

      const templateId = weekResult[0].templateId as string;

      for (let i = 0; i < rows.length; i++) {
        const row      = rows[i] as Record<string, unknown>;
        const rowIndex = i + 1;

        const grade        = row._grade        as string | null;
        const className    = row._className    as string | null;
        const dayOfWeekRaw = row._dayOfWeek    as string | null;
        const periodNumber = row._periodNumber as number | null;
        const subject      = row.subject       as string;
        const teacherName  = row._teacherName  as string | null;

        // Resolve dayOfWeek
        const dayOfWeek = dayOfWeekRaw
          ? DAY_OF_WEEK_LABEL_MAP[dayOfWeekRaw] ?? null
          : null;

        if (!dayOfWeek) {
          errors.push({
            row:     rowIndex,
            field:   "day_of_week",
            message: `قيمة غير صالحة: ${dayOfWeekRaw}`,
          });
          continue;
        }

        // Resolve classRoomId
        if (!grade || !className) {
          errors.push({
            row:     rowIndex,
            field:   "grade/class_name",
            message: "grade و class_name مطلوبان",
          });
          continue;
        }

        const crResult = await dbRef
          .select({ id: classRooms.id })
          .from(classRooms)
          .where(
            and(
              eq(classRooms.orgId, orgId),
              eq(classRooms.grade, grade),
              eq(classRooms.name,  className)
            )
          )
          .limit(1);

        if (crResult.length === 0) {
          errors.push({
            row:     rowIndex,
            field:   "grade/class_name",
            message: `لم يُعثر على فصل: ${grade} / ${className}`,
          });
          continue;
        }

        const classRoomId = crResult[0].id as string;

        // Resolve periodId
        if (!periodNumber) {
          errors.push({
            row:     rowIndex,
            field:   "period_number",
            message: "period_number مطلوب",
          });
          continue;
        }

        const periodResult = await dbRef
          .select({ id: timetableTemplatePeriods.id })
          .from(timetableTemplatePeriods)
          .where(
            and(
              eq(timetableTemplatePeriods.orgId,        orgId),
              eq(timetableTemplatePeriods.templateId,   templateId),
              eq(timetableTemplatePeriods.periodNumber, periodNumber)
            )
          )
          .limit(1);

        if (periodResult.length === 0) {
          errors.push({
            row:     rowIndex,
            field:   "period_number",
            message: `لم يُعثر على حصة رقم ${periodNumber} في قالب الدوام النشط`,
          });
          continue;
        }

        const periodId = periodResult[0].id as string;

        // Resolve teacherId (optional — no error if not found)
        let teacherId: string | null = null;
        if (teacherName) {
          const teacherResult = await dbRef
            .select({ id: teacherProfiles.id })
            .from(teacherProfiles)
            .where(
              and(
                eq(teacherProfiles.orgId,     orgId),
                eq(teacherProfiles.fullName,  teacherName)
              )
            )
            .limit(1);

          if (teacherResult.length > 0) {
            teacherId = teacherResult[0].id as string;
          }
        }

        // Upsert: check for existing entry on the unique constraint
        // UNIQUE: weekId + periodId + classRoomId + dayOfWeek
        const existing = await dbRef
          .select({ id: scheduleEntries.id })
          .from(scheduleEntries)
          .where(
            and(
              eq(scheduleEntries.orgId,       orgId),
              eq(scheduleEntries.weekId,      activeWeekId),
              eq(scheduleEntries.periodId,    periodId),
              eq(scheduleEntries.classRoomId, classRoomId),
              eq(scheduleEntries.dayOfWeek,   dayOfWeek)
            )
          )
          .limit(1);

        try {
          if (existing.length > 0) {
            // Update existing entry
            await dbRef
              .update(scheduleEntries)
              .set({ subject, teacherId, updatedAt: new Date() })
              .where(eq(scheduleEntries.id, existing[0].id));
            imported++;
          } else {
            await dbRef.insert(scheduleEntries).values({
              orgId,
              weekId:      activeWeekId,
              periodId,
              classRoomId,
              teacherId,
              dayOfWeek,
              subject,
            });
            imported++;
          }
        } catch (err) {
          errors.push({
            row:     rowIndex,
            field:   "insert",
            message: err instanceof Error ? err.message : "خطأ غير معروف",
          });
        }
      }

      return { imported, skipped, errors };
    },
  },
};

// ============================================================
// VALIDATION PIPELINE (shared between preview & confirm)
// ============================================================

async function runValidation(
  type:         ImportType,
  rawRows:      Record<string, string>[],
  columnMapOverride: Record<string, string> | undefined,
  orgId:        string
): Promise<{
  validRows:   Record<string, unknown>[];
  invalidRows: { index: number; row: Record<string, string>; errors: string[] }[];
}> {
  const adapter   = adapters[type];
  const columnMap = columnMapOverride ?? adapter.defaultColumnMap;

  const validRows:   Record<string, unknown>[]                                          = [];
  const invalidRows: { index: number; row: Record<string, string>; errors: string[] }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow  = rawRows[i];
    const mapped  = trimRow(applyColumnMap(rawRow, columnMap));
    const result  = await adapter.validate(mapped, orgId);

    if (result.valid) {
      validRows.push(adapter.transform(rawRow, columnMap, orgId));
    } else {
      invalidRows.push({ index: i + 1, row: rawRow, errors: result.errors });
    }
  }

  return { validRows, invalidRows };
}

// ============================================================
// ZOD SCHEMAS
// ============================================================

const importBodySchema = z.object({
  type:       z.enum(VALID_TYPES),
  rows:       z.array(z.record(z.string())).min(1).max(MAX_ROWS),
  column_map: z.record(z.string()).optional(),
});

const confirmBodySchema = importBodySchema.extend({
  dry_run: z.boolean().optional().default(false),
});

// ============================================================
// ENDPOINT 1 — GET /school/import/templates/:type
// ============================================================

schoolImportRouter.get("/school/import/templates/:type", async (c) => {
  try {
    getOrgId(c); // Ensure authenticated
  } catch {
    return c.json({ error: "غير مصرح" }, 401);
  }

  const type = c.req.param("type") as ImportType;

  if (!VALID_TYPES.includes(type)) {
    return c.json(
      {
        error:  "نوع الاستيراد غير صالح",
        valid:  VALID_TYPES,
      },
      400
    );
  }

  return c.json(TEMPLATES[type]);
});

// ============================================================
// ENDPOINT 2 — POST /school/import/preview
// ============================================================

schoolImportRouter.post("/school/import/preview", async (c) => {
  let orgId: string;
  try {
    orgId = getOrgId(c);
  } catch {
    return c.json({ error: "غير مصرح" }, 401);
  }

  let body: z.infer<typeof importBodySchema>;
  try {
    const raw = await c.req.json();
    body = importBodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "بيانات غير صالحة", details: err.errors }, 400);
    }
    return c.json({ error: "خطأ في قراءة البيانات" }, 400);
  }

  const { type, rows, column_map } = body;

  if (rows.length > MAX_ROWS) {
    return c.json({ error: `الحد الأقصى ${MAX_ROWS} صف في طلب واحد` }, 400);
  }

  const { validRows, invalidRows } = await runValidation(
    type,
    rows,
    column_map,
    orgId
  );

  return c.json({
    valid: validRows,
    invalid: invalidRows.map((inv) => ({
      row:    inv.index,
      data:   inv.row,
      errors: inv.errors,
    })),
    summary: {
      total:   rows.length,
      valid:   validRows.length,
      invalid: invalidRows.length,
    },
  });
});

// ============================================================
// ENDPOINT 3 — POST /school/import/confirm
// ============================================================

schoolImportRouter.post("/school/import/confirm", async (c) => {
  let orgId:  string;
  let userId: string | null;
  try {
    orgId  = getOrgId(c);
    userId = getUserId(c);
  } catch {
    return c.json({ error: "غير مصرح" }, 401);
  }

  let body: z.infer<typeof confirmBodySchema>;
  try {
    const raw = await c.req.json();
    body = confirmBodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "بيانات غير صالحة", details: err.errors }, 400);
    }
    return c.json({ error: "خطأ في قراءة البيانات" }, 400);
  }

  const { type, rows, column_map, dry_run } = body;

  if (rows.length > MAX_ROWS) {
    return c.json({ error: `الحد الأقصى ${MAX_ROWS} صف في طلب واحد` }, 400);
  }

  const adapter = adapters[type];

  // Validation pass
  const { validRows, invalidRows } = await runValidation(
    type,
    rows,
    column_map,
    orgId
  );

  const validationErrors: RowError[] = invalidRows.map((inv) => ({
    row:     inv.index,
    field:   "validation",
    message: inv.errors.join("; "),
  }));

  // Dry run — return preview without committing
  if (dry_run) {
    return c.json({
      log_id:   null,
      imported: 0,
      skipped:  0,
      dry_run:  true,
      preview: {
        valid:   validRows.length,
        invalid: invalidRows.length,
      },
      errors: validationErrors,
    });
  }

  // Create import log (status: processing)
  const now = new Date();
  const logInsert = await db
    .insert(schoolImportLogs)
    .values({
      orgId,
      importType:   type,
      status:       "processing",
      totalRows:    rows.length,
      importedRows: 0,
      skippedRows:  0,
      errorRows:    invalidRows.length,
      errors:       validationErrors,
      startedAt:    now,
      createdBy:    userId ?? undefined,
    })
    .returning({ id: schoolImportLogs.id });

  const logId = logInsert[0].id;

  // Execute insert inside a transaction
  let insertResult: InsertResult;
  try {
    insertResult = await db.transaction(async (tx) => {
      return adapter.insert(validRows, orgId, tx);
    });
  } catch (err) {
    // Mark log as failed
    await db
      .update(schoolImportLogs)
      .set({
        status:      "failed",
        completedAt: new Date(),
        errors:      [
          ...validationErrors,
          {
            row:     0,
            field:   "transaction",
            message: err instanceof Error ? err.message : "خطأ غير معروف",
          },
        ],
        updatedAt:   new Date(),
      })
      .where(eq(schoolImportLogs.id, logId));

    return c.json({ error: "فشل الاستيراد داخل المعاملة", log_id: logId }, 500);
  }

  const allErrors = [...validationErrors, ...insertResult.errors];

  // Update log to completed
  await db
    .update(schoolImportLogs)
    .set({
      status:       "completed",
      importedRows: insertResult.imported,
      skippedRows:  insertResult.skipped,
      errorRows:    allErrors.length,
      errors:       allErrors,
      completedAt:  new Date(),
      updatedAt:    new Date(),
    })
    .where(eq(schoolImportLogs.id, logId));

  return c.json({
    log_id:   logId,
    imported: insertResult.imported,
    skipped:  insertResult.skipped,
    errors:   allErrors,
  });
});

// ============================================================
// ENDPOINT 4 — GET /school/import/logs
// ============================================================

schoolImportRouter.get("/school/import/logs", async (c) => {
  let orgId: string;
  try {
    orgId = getOrgId(c);
  } catch {
    return c.json({ error: "غير مصرح" }, 401);
  }

  const typeFilter = c.req.query("type") as ImportType | undefined;
  const page       = Math.max(1, parseInt(c.req.query("page")  || "1"));
  const limit      = Math.min(50, Math.max(1, parseInt(c.req.query("limit") || "20")));
  const offset     = (page - 1) * limit;

  const conditions = [eq(schoolImportLogs.orgId, orgId)];
  if (typeFilter && VALID_TYPES.includes(typeFilter)) {
    conditions.push(eq(schoolImportLogs.importType, typeFilter));
  }

  const whereClause = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id:           schoolImportLogs.id,
        importType:   schoolImportLogs.importType,
        status:       schoolImportLogs.status,
        fileName:     schoolImportLogs.fileName,
        totalRows:    schoolImportLogs.totalRows,
        importedRows: schoolImportLogs.importedRows,
        skippedRows:  schoolImportLogs.skippedRows,
        errorRows:    schoolImportLogs.errorRows,
        startedAt:    schoolImportLogs.startedAt,
        completedAt:  schoolImportLogs.completedAt,
        createdAt:    schoolImportLogs.createdAt,
      })
      .from(schoolImportLogs)
      .where(whereClause)
      .orderBy(sql`${schoolImportLogs.createdAt} DESC`)
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schoolImportLogs)
      .where(whereClause),
  ]);

  return c.json({
    data:  rows,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
  });
});

// ============================================================
// ENDPOINT 5 — GET /school/import/logs/:id
// ============================================================

schoolImportRouter.get("/school/import/logs/:id", async (c) => {
  let orgId: string;
  try {
    orgId = getOrgId(c);
  } catch {
    return c.json({ error: "غير مصرح" }, 401);
  }

  const id = c.req.param("id");

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return c.json({ error: "معرّف غير صالح" }, 400);
  }

  const result = await db
    .select()
    .from(schoolImportLogs)
    .where(
      and(
        eq(schoolImportLogs.orgId, orgId),
        eq(schoolImportLogs.id,    id)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "السجل غير موجود" }, 404);
  }

  return c.json(result[0]);
});
