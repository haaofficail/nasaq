import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  uuid,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// ============================================================
// ENUMS
// ============================================================

export const schoolSessionTypeEnum = pgEnum("school_session_type", [
  "summer",
  "winter",
]);

export const schoolDayOfWeekEnum = pgEnum("school_day_of_week", [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
]);

export const schoolCaseStatusEnum = pgEnum("school_case_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const schoolCasePriorityEnum = pgEnum("school_case_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const schoolImportStatusEnum = pgEnum("school_import_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// ============================================================
// school_settings — بيانات المدرسة (سجل واحد لكل منشأة)
// ============================================================

export const schoolSettings = pgTable(
  "school_settings",
  {
    id:              uuid("id").defaultRandom().primaryKey(),
    orgId:           uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    schoolName:      text("school_name").notNull(),
    schoolLogoUrl:   text("school_logo_url"),
    schoolAddress:   text("school_address"),
    schoolPhone:     text("school_phone"),
    schoolEmail:     text("school_email"),
    schoolRegion:    text("school_region"),
    schoolType:      text("school_type"),          // حكومية | أهلية | دولية
    educationLevel:  text("education_level"),      // ابتدائية | متوسطة | ثانوية | مختلطة

    // الأسبوع النشط — بدون FK constraint لتجنب الدائرية مع scheduleWeeks
    activeWeekId:    uuid("active_week_id"),

    createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("school_settings_org_unique").on(t.orgId),
  ]
);

// ============================================================
// class_rooms — الفصول الدراسية
// grade: "الأول"  name: "أ"
// ============================================================

export const classRooms = pgTable(
  "class_rooms",
  {
    id:        uuid("id").defaultRandom().primaryKey(),
    orgId:     uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    grade:     text("grade").notNull(),   // الصف مثل "الأول"
    name:      text("name").notNull(),    // اسم الفصل مثل "أ"
    capacity:  integer("capacity"),
    notes:     text("notes"),

    isActive:  boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("class_rooms_org_idx").on(t.orgId),
    index("class_rooms_grade_idx").on(t.orgId, t.grade),
    uniqueIndex("class_rooms_org_grade_name_unique").on(t.orgId, t.grade, t.name),
  ]
);

// ============================================================
// teacher_profiles — المعلمون
// ============================================================

export const teacherProfiles = pgTable(
  "teacher_profiles",
  {
    id:             uuid("id").defaultRandom().primaryKey(),
    orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    fullName:       text("full_name").notNull(),
    employeeNumber: text("employee_number"),
    subject:        text("subject"),         // التخصص الرئيسي
    phone:          text("phone"),
    email:          text("email"),
    nationalId:     text("national_id"),
    gender:         text("gender"),          // ذكر | أنثى
    qualification:  text("qualification"),
    notes:          text("notes"),

    isActive:       boolean("is_active").notNull().default(true),

    createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("teacher_profiles_org_idx").on(t.orgId),
    index("teacher_profiles_active_idx").on(t.orgId, t.isActive),
  ]
);

// ============================================================
// students — الطلاب (مرتبطون بفصل)
// ============================================================

export const students = pgTable(
  "students",
  {
    id:               uuid("id").defaultRandom().primaryKey(),
    orgId:            uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    classRoomId:      uuid("class_room_id").references(() => classRooms.id, { onDelete: "set null" }),

    fullName:         text("full_name").notNull(),
    studentNumber:    text("student_number"),
    nationalId:       text("national_id"),
    birthDate:        date("birth_date"),
    gender:           text("gender"),          // ذكر | أنثى
    guardianName:     text("guardian_name"),
    guardianPhone:    text("guardian_phone"),
    guardianRelation: text("guardian_relation"),  // أب | أم | أخ | غيره
    address:          text("address"),
    notes:            text("notes"),

    isActive:         boolean("is_active").notNull().default(true),

    createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("students_org_idx").on(t.orgId),
    index("students_class_room_idx").on(t.orgId, t.classRoomId),
    index("students_active_idx").on(t.orgId, t.isActive),
  ]
);

// ============================================================
// timetable_templates — قوالب الدوام (شتوي / صيفي)
// ============================================================

export const timetableTemplates = pgTable(
  "timetable_templates",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    name:        text("name").notNull(),
    sessionType: schoolSessionTypeEnum("session_type").notNull().default("winter"),
    description: text("description"),

    isActive:    boolean("is_active").notNull().default(true),

    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("timetable_templates_org_idx").on(t.orgId),
  ]
);

// ============================================================
// timetable_template_periods — الحصص في القالب
// periodNumber: رقم الحصة (1، 2، 3 ...)
// isBreak: هل هي فسحة؟
// ============================================================

export const timetableTemplatePeriods = pgTable(
  "timetable_template_periods",
  {
    id:           uuid("id").defaultRandom().primaryKey(),
    orgId:        uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    templateId:   uuid("template_id").notNull().references(() => timetableTemplates.id, { onDelete: "cascade" }),

    periodNumber: integer("period_number").notNull(),
    label:        text("label"),          // "الحصة الأولى" أو "الفسحة"
    startTime:    text("start_time").notNull(),   // "07:30"
    endTime:      text("end_time").notNull(),     // "08:15"
    isBreak:      boolean("is_break").notNull().default(false),

    createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("timetable_template_periods_template_idx").on(t.templateId),
    uniqueIndex("timetable_template_periods_unique").on(t.templateId, t.periodNumber),
  ]
);

// ============================================================
// schedule_weeks — الأسابيع الدراسية (مرتبطة بقالب)
// ============================================================

export const scheduleWeeks = pgTable(
  "schedule_weeks",
  {
    id:         uuid("id").defaultRandom().primaryKey(),
    orgId:      uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    templateId: uuid("template_id").notNull().references(() => timetableTemplates.id, { onDelete: "cascade" }),

    weekNumber: integer("week_number").notNull(),
    label:      text("label"),          // "الأسبوع الأول" أو "1-5 مارس 2026"
    startDate:  date("start_date"),
    endDate:    date("end_date"),
    notes:      text("notes"),

    isActive:   boolean("is_active").notNull().default(false),

    createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("schedule_weeks_org_idx").on(t.orgId),
    index("schedule_weeks_template_idx").on(t.orgId, t.templateId),
  ]
);

// ============================================================
// schedule_entries — مدخلات الجدول الأسبوعي
// UNIQUE: أسبوع + حصة + فصل + يوم
// ============================================================

export const scheduleEntries = pgTable(
  "schedule_entries",
  {
    id:                 uuid("id").defaultRandom().primaryKey(),
    orgId:              uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    weekId:             uuid("week_id").notNull().references(() => scheduleWeeks.id, { onDelete: "cascade" }),
    periodId:           uuid("period_id").notNull().references(() => timetableTemplatePeriods.id, { onDelete: "cascade" }),
    classRoomId:        uuid("class_room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    teacherId:          uuid("teacher_id").references(() => teacherProfiles.id, { onDelete: "set null" }),

    dayOfWeek:          schoolDayOfWeekEnum("day_of_week").notNull(),
    subject:            text("subject").notNull(),

    // تتبع التأخر
    teacherLateMinutes: integer("teacher_late_minutes").notNull().default(0),
    teacherArrivedAt:   text("teacher_arrived_at"),   // "07:45"

    notes:              text("notes"),

    createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("schedule_entries_org_idx").on(t.orgId),
    index("schedule_entries_week_idx").on(t.weekId),
    index("schedule_entries_class_room_idx").on(t.orgId, t.classRoomId),
    index("schedule_entries_teacher_idx").on(t.orgId, t.teacherId),
    uniqueIndex("schedule_entries_unique").on(t.weekId, t.periodId, t.classRoomId, t.dayOfWeek),
  ]
);

// ============================================================
// school_cases — الحالات والمتابعة
// studentId: اختياري
// ============================================================

export const schoolCases = pgTable(
  "school_cases",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    studentId:   uuid("student_id").references(() => students.id, { onDelete: "set null" }),
    classRoomId: uuid("class_room_id").references(() => classRooms.id, { onDelete: "set null" }),

    title:       text("title").notNull(),
    category:    text("category").notNull(),  // سلوكية | أكاديمية | صحية | اجتماعية | إدارية
    description: text("description"),
    status:      schoolCaseStatusEnum("status").notNull().default("open"),
    priority:    schoolCasePriorityEnum("priority").notNull().default("normal"),

    assignedTo:  text("assigned_to"),
    resolvedAt:  timestamp("resolved_at", { withTimezone: true }),
    resolution:  text("resolution"),

    createdBy:   uuid("created_by"),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("school_cases_org_idx").on(t.orgId),
    index("school_cases_student_idx").on(t.orgId, t.studentId),
    index("school_cases_status_idx").on(t.orgId, t.status),
    index("school_cases_priority_idx").on(t.orgId, t.priority),
  ]
);

// ============================================================
// school_case_steps — خطوات متابعة الحالات
// ============================================================

export const schoolCaseSteps = pgTable(
  "school_case_steps",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    caseId:      uuid("case_id").notNull().references(() => schoolCases.id, { onDelete: "cascade" }),

    stepNumber:  integer("step_number").notNull(),
    description: text("description").notNull(),
    actionTaken: text("action_taken"),
    result:      text("result"),
    doneBy:      text("done_by"),
    doneAt:      timestamp("done_at", { withTimezone: true }),
    notes:       text("notes"),

    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("school_case_steps_case_idx").on(t.caseId),
  ]
);

// ============================================================
// school_import_logs — سجل عمليات الاستيراد (Excel / CSV)
// ============================================================

export const schoolImportLogs = pgTable(
  "school_import_logs",
  {
    id:           uuid("id").defaultRandom().primaryKey(),
    orgId:        uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    importType:   text("import_type").notNull(),                           // students | teachers | schedule
    status:       schoolImportStatusEnum("status").notNull().default("pending"),

    fileName:     text("file_name"),
    fileUrl:      text("file_url"),

    totalRows:    integer("total_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    skippedRows:  integer("skipped_rows").notNull().default(0),
    errorRows:    integer("error_rows").notNull().default(0),

    errors:       jsonb("errors").notNull().default([]),                    // تفاصيل الأخطاء لكل صف
    notes:        text("notes"),

    startedAt:    timestamp("started_at",   { withTimezone: true }),
    completedAt:  timestamp("completed_at", { withTimezone: true }),

    createdBy:    uuid("created_by"),
    createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("school_import_logs_org_idx").on(t.orgId),
    index("school_import_logs_status_idx").on(t.orgId, t.status),
    index("school_import_logs_type_idx").on(t.orgId, t.importType),
  ]
);
