import { pgTable, pgEnum, text, integer, boolean, uuid, timestamp, date, jsonb, uniqueIndex, index, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";
import { users } from "./auth";
// ============================================================
// ENUMS
// ============================================================
export const schoolSessionTypeEnum = pgEnum("school_session_type", [
    "summer",
    "winter",
    "ramadan",
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
export const schoolSettings = pgTable("school_settings", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    schoolName: text("school_name").notNull(),
    schoolLogoUrl: text("school_logo_url"),
    schoolAddress: text("school_address"),
    schoolPhone: text("school_phone"),
    schoolEmail: text("school_email"),
    schoolRegion: text("school_region"),
    schoolType: text("school_type"), // حكومية | أهلية | دولية
    educationLevel: text("education_level"), // ابتدائية | متوسطة | ثانوية | مختلطة
    schoolGender: text("school_gender"), // بنين | بنات
    // إعداد النظام
    setupStatus: text("setup_status").notNull().default("not_started"), // not_started | in_progress | completed
    setupStep: integer("setup_step").notNull().default(0),
    // الأسبوع النشط — بدون FK constraint لتجنب الدائرية مع scheduleWeeks
    activeWeekId: uuid("active_week_id"),
    // توقيت الدوام — مرن حسب المنطقة والفصل
    sessionStartTime: text("session_start_time").default("07:30"),
    sessionEndTime: text("session_end_time").default("14:30"),
    periodDurationMinutes: integer("period_duration_minutes").default(45),
    breakDurationMinutes: integer("break_duration_minutes").default(30),
    numberOfPeriods: integer("number_of_periods").default(7),
    sessionType: text("session_type").default("winter"), // 'winter' | 'summer'
    // إعدادات الإشعارات (JSONB)
    notificationSettings: jsonb("notification_settings").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    uniqueIndex("school_settings_org_unique").on(t.orgId),
]);
// ============================================================
// class_rooms — الفصول الدراسية
// grade: "الأول"  name: "أ"
// ============================================================
export const classRooms = pgTable("class_rooms", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    grade: text("grade").notNull(), // الصف مثل "الأول"
    name: text("name").notNull(), // اسم الفصل مثل "أ"
    capacity: integer("capacity"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("class_rooms_org_idx").on(t.orgId),
    index("class_rooms_grade_idx").on(t.orgId, t.grade),
    uniqueIndex("class_rooms_org_grade_name_unique").on(t.orgId, t.grade, t.name),
]);
// ============================================================
// teacher_profiles — المعلمون
// ============================================================
export const teacherProfiles = pgTable("teacher_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    employeeNumber: text("employee_number"),
    subject: text("subject"), // التخصص الرئيسي
    phone: text("phone"),
    email: text("email"),
    nationalId: text("national_id"),
    dateOfBirthHijri: text("date_of_birth_hijri"),
    gender: text("gender"), // ذكر | أنثى
    qualification: text("qualification"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    // Invite / login link
    userId: uuid("user_id"), // FK to users — set after invite accepted
    inviteToken: text("invite_token"), // random UUID — one-time invite link
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("teacher_profiles_org_idx").on(t.orgId),
    index("teacher_profiles_active_idx").on(t.orgId, t.isActive),
]);
// ============================================================
// students — الطلاب (مرتبطون بفصل)
// ============================================================
export const students = pgTable("students", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").references(() => classRooms.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    studentNumber: text("student_number"),
    nationalId: text("national_id"),
    grade: text("grade"), // الصف — مخزّن مستقل عن الفصل
    birthDate: date("birth_date"),
    gender: text("gender"), // ذكر | أنثى
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    guardianRelation: text("guardian_relation"), // أب | أم | أخ | غيره
    address: text("address"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("students_org_idx").on(t.orgId),
    index("students_class_room_idx").on(t.orgId, t.classRoomId),
    index("students_active_idx").on(t.orgId, t.isActive),
    index("students_grade_idx").on(t.orgId, t.grade),
]);
// ============================================================
// timetable_templates — قوالب الدوام (شتوي / صيفي)
// ============================================================
export const timetableTemplates = pgTable("timetable_templates", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sessionType: schoolSessionTypeEnum("session_type").notNull().default("winter"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("timetable_templates_org_idx").on(t.orgId),
]);
// ============================================================
// timetable_template_periods — الحصص في القالب
// periodNumber: رقم الحصة (1، 2، 3 ...)
// isBreak: هل هي فسحة؟
// ============================================================
export const timetableTemplatePeriods = pgTable("timetable_template_periods", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").notNull().references(() => timetableTemplates.id, { onDelete: "cascade" }),
    periodNumber: integer("period_number").notNull(),
    label: text("label"), // "الحصة الأولى" أو "الفسحة"
    startTime: text("start_time").notNull(), // "07:30"
    endTime: text("end_time").notNull(), // "08:15"
    isBreak: boolean("is_break").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("timetable_template_periods_template_idx").on(t.templateId),
    uniqueIndex("timetable_template_periods_unique").on(t.templateId, t.periodNumber),
]);
// ============================================================
// schedule_weeks — الأسابيع الدراسية (مرتبطة بقالب)
// ============================================================
export const scheduleWeeks = pgTable("schedule_weeks", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => timetableTemplates.id, { onDelete: "set null" }),
    semesterId: uuid("semester_id").references(() => schoolSemesters.id, { onDelete: "set null" }),
    weekNumber: integer("week_number").notNull(),
    label: text("label"), // "الأسبوع الأول" أو "1-5 مارس 2026"
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("schedule_weeks_org_idx").on(t.orgId),
    index("schedule_weeks_template_idx").on(t.orgId, t.templateId),
]);
// ============================================================
// schedule_entries — مدخلات الجدول الأسبوعي
// UNIQUE: أسبوع + حصة + فصل + يوم
// ============================================================
export const scheduleEntries = pgTable("schedule_entries", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    weekId: uuid("week_id").notNull().references(() => scheduleWeeks.id, { onDelete: "cascade" }),
    periodId: uuid("period_id").notNull().references(() => timetableTemplatePeriods.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => teacherProfiles.id, { onDelete: "set null" }),
    dayOfWeek: schoolDayOfWeekEnum("day_of_week").notNull(),
    subject: text("subject").notNull(),
    // تتبع التأخر
    teacherLateMinutes: integer("teacher_late_minutes").notNull().default(0),
    teacherArrivedAt: text("teacher_arrived_at"), // "07:45"
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("schedule_entries_org_idx").on(t.orgId),
    index("schedule_entries_week_idx").on(t.weekId),
    index("schedule_entries_class_room_idx").on(t.orgId, t.classRoomId),
    index("schedule_entries_teacher_idx").on(t.orgId, t.teacherId),
    uniqueIndex("schedule_entries_unique").on(t.weekId, t.periodId, t.classRoomId, t.dayOfWeek),
]);
// ============================================================
// school_cases — الحالات والمتابعة
// studentId: اختياري
// ============================================================
export const schoolCases = pgTable("school_cases", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
    classRoomId: uuid("class_room_id").references(() => classRooms.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    category: text("category").notNull(), // سلوكية | أكاديمية | صحية | اجتماعية | إدارية
    description: text("description"),
    status: schoolCaseStatusEnum("status").notNull().default("open"),
    priority: schoolCasePriorityEnum("priority").notNull().default("normal"),
    assignedTo: text("assigned_to"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolution: text("resolution"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_cases_org_idx").on(t.orgId),
    index("school_cases_student_idx").on(t.orgId, t.studentId),
    index("school_cases_status_idx").on(t.orgId, t.status),
    index("school_cases_priority_idx").on(t.orgId, t.priority),
]);
// ============================================================
// school_case_steps — خطوات متابعة الحالات
// ============================================================
export const schoolCaseSteps = pgTable("school_case_steps", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull().references(() => schoolCases.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    description: text("description").notNull(),
    actionTaken: text("action_taken"),
    result: text("result"),
    doneBy: text("done_by"),
    doneAt: timestamp("done_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_case_steps_case_idx").on(t.caseId),
]);
// ============================================================
// teacher_class_assignments — ربط المعلمين بالفصول/الصفوف/المراحل
// scope: classRoomId | grade | stage (يُحدَّد واحد فقط)
// ============================================================
export const teacherClassAssignments = pgTable("teacher_class_assignments", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").notNull().references(() => teacherProfiles.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").references(() => classRooms.id, { onDelete: "cascade" }),
    grade: text("grade"),
    stage: text("stage"),
    subject: text("subject").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("teacher_class_assignments_teacher_idx").on(t.orgId, t.teacherId),
    index("teacher_class_assignments_classroom_idx").on(t.orgId, t.classRoomId),
]);
// ============================================================
// school_violation_categories — أنواع وتصنيفات المخالفات
// ============================================================
export const schoolViolationCategories = pgTable("school_violation_categories", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    severity: text("severity").notNull().default("medium"), // low | medium | high
    defaultDegree: text("default_degree").notNull().default("1"), // 1-5 الدرجة الافتراضية
    color: text("color").notNull().default("#f59e0b"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_violation_categories_org_idx").on(t.orgId),
]);
// ============================================================
// school_violations — سجل مخالفات الطلاب
// ============================================================
export const schoolViolations = pgTable("school_violations", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => schoolViolationCategories.id, { onDelete: "set null" }),
    description: text("description"),
    degree: text("degree").notNull().default("1"), // 1-5 درجة المخالفة وفق لائحة وزارة التعليم
    violationDate: date("violation_date").notNull().default(sql `CURRENT_DATE`),
    status: text("status").notNull().default("open"), // open | resolved | cancelled
    resolutionNotes: text("resolution_notes"),
    recordedBy: uuid("recorded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_violations_org_idx").on(t.orgId, t.violationDate),
    index("school_violations_student_idx").on(t.orgId, t.studentId),
    index("school_violations_degree_idx").on(t.orgId, t.degree),
]);
// ============================================================
// school_import_logs — سجل عمليات الاستيراد (Excel / CSV)
// ============================================================
// ============================================================
// student_transfers — سجل تنقلات الطلاب بين الفصول
// ============================================================
export const studentTransfers = pgTable("student_transfers", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    fromClassId: uuid("from_class_id").references(() => classRooms.id, { onDelete: "set null" }),
    toClassId: uuid("to_class_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    reason: text("reason"),
    transferredBy: uuid("transferred_by"),
    transferredAt: timestamp("transferred_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("student_transfers_student_idx").on(t.orgId, t.studentId),
    index("student_transfers_date_idx").on(t.orgId, t.transferredAt),
]);
// ============================================================
// student_attendance — سجل الحضور والغياب اليومي
// ============================================================
export const studentAttendanceStatusEnum = pgEnum("student_attendance_status", [
    "present",
    "absent",
    "late",
    "excused",
]);
export const studentAttendance = pgTable("student_attendance", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: studentAttendanceStatusEnum("status").notNull().default("present"),
    lateMinutes: integer("late_minutes"),
    notes: text("notes"),
    recordedBy: uuid("recorded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    uniqueIndex("student_attendance_unique_idx").on(t.orgId, t.studentId, t.attendanceDate),
    index("student_attendance_org_date_idx").on(t.orgId, t.attendanceDate),
    index("student_attendance_student_idx").on(t.studentId),
    index("student_attendance_classroom_idx").on(t.classRoomId, t.attendanceDate),
]);
// ============================================================
// BEHAVIOR SYSTEM — نظام السلوك والمواظبة (لائحة وزارة التعليم)
// ============================================================
export const behaviorIncidentDegreeEnum = pgEnum("behavior_incident_degree", [
    "1", "2", "3", "4", "5",
]);
export const studentBehaviorScores = pgTable("student_behavior_scores", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    academicYear: text("academic_year").notNull().default(sql `to_char(CURRENT_DATE, 'YYYY')`),
    behaviorScore: integer("behavior_score").notNull().default(80),
    attendanceScore: integer("attendance_score").notNull().default(100),
    totalScore: integer("total_score").notNull().default(90),
    lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    uniqueIndex("student_behavior_scores_unique").on(t.orgId, t.studentId, t.academicYear),
    index("student_behavior_scores_org_idx").on(t.orgId, t.studentId),
]);
export const behaviorIncidents = pgTable("behavior_incidents", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => schoolViolationCategories.id, { onDelete: "set null" }),
    incidentDate: date("incident_date").notNull().default(sql `CURRENT_DATE`),
    degree: behaviorIncidentDegreeEnum("degree").notNull().default("1"),
    violationCode: text("violation_code"),
    description: text("description"),
    deductionPoints: integer("deduction_points").notNull().default(0),
    actionTaken: text("action_taken"),
    guardianNotified: boolean("guardian_notified").notNull().default(false),
    status: text("status").notNull().default("open"),
    resolutionNotes: text("resolution_notes"),
    recordedBy: uuid("recorded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("behavior_incidents_org_idx").on(t.orgId, t.incidentDate),
    index("behavior_incidents_student_idx").on(t.orgId, t.studentId),
    index("behavior_incidents_status_idx").on(t.orgId, t.status),
]);
export const behaviorCompensations = pgTable("behavior_compensations", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    compensationDate: date("compensation_date").notNull().default(sql `CURRENT_DATE`),
    compensationType: text("compensation_type").notNull(),
    description: text("description"),
    pointsAdded: integer("points_added").notNull().default(5),
    recordedBy: uuid("recorded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("behavior_compensations_org_idx").on(t.orgId, t.compensationDate),
    index("behavior_compensations_student_idx").on(t.orgId, t.studentId),
]);
export const guardianNotifications = pgTable("guardian_notifications", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id").references(() => behaviorIncidents.id, { onDelete: "set null" }),
    notificationDate: date("notification_date").notNull().default(sql `CURRENT_DATE`),
    notificationType: text("notification_type").notNull(),
    message: text("message"),
    sentTo: text("sent_to"),
    status: text("status").notNull().default("sent"),
    sentBy: uuid("sent_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("guardian_notifications_org_idx").on(t.orgId, t.notificationDate),
    index("guardian_notifications_student_idx").on(t.orgId, t.studentId),
]);
// ============================================================
// teacher_attendance — حضور وغياب المعلمين (يسجّله الوكيل)
// ============================================================
export const teacherAttendance = pgTable("teacher_attendance", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").notNull().references(() => teacherProfiles.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").references(() => classRooms.id, { onDelete: "set null" }),
    attendanceDate: date("attendance_date").notNull(),
    status: text("status").notNull().default("absent"), // present | absent | late | excused
    periodNumber: integer("period_number"),
    notes: text("notes"),
    recordedBy: uuid("recorded_by"),
    notified: boolean("notified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("teacher_attendance_org_date_idx").on(t.orgId, t.attendanceDate),
    index("teacher_attendance_teacher_idx").on(t.orgId, t.teacherId),
]);
// ============================================================
// school_whatsapp_logs — سجل رسائل واتساب المدرسة
// ============================================================
export const schoolWhatsappLogs = pgTable("school_whatsapp_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
    teacherId: uuid("teacher_id").references(() => teacherProfiles.id, { onDelete: "set null" }),
    recipient: text("recipient").notNull(),
    eventType: text("event_type").notNull(), // violation | absence | teacher_assignment
    message: text("message").notNull(),
    status: text("status").notNull().default("sent"), // sent | failed | pending
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_whatsapp_logs_org_idx").on(t.orgId, t.createdAt),
    index("school_whatsapp_logs_student_idx").on(t.orgId, t.studentId),
]);
export const schoolImportLogs = pgTable("school_import_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    importType: text("import_type").notNull(), // students | teachers | schedule
    status: schoolImportStatusEnum("status").notNull().default("pending"),
    fileName: text("file_name"),
    fileUrl: text("file_url"),
    totalRows: integer("total_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    errors: jsonb("errors").notNull().default([]), // تفاصيل الأخطاء لكل صف
    notes: text("notes"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_import_logs_org_idx").on(t.orgId),
    index("school_import_logs_status_idx").on(t.orgId, t.status),
    index("school_import_logs_type_idx").on(t.orgId, t.importType),
]);
// ============================================================
// SUBJECT SYSTEM — نظام المواد الدراسية الديناميكي
// ============================================================
export const subjects = pgTable("subjects", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    code: text("code"), // مفتاح ثابت: 'math' | 'critical_thinking' ...
    name: text("name").notNull(), // للعرض فقط
    type: text("type").notNull().default("core"), // core | skill | activity
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("subjects_org_idx").on(t.orgId, t.type),
    uniqueIndex("subjects_org_name_idx").on(t.orgId, t.name),
    uniqueIndex("subjects_org_code_idx").on(t.orgId, t.code),
]);
export const gradeLevels = pgTable("grade_levels", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    code: text("code"), // مفتاح ثابت: 'middle_1' | 'middle_3' ...
    name: text("name").notNull(), // للعرض: "الأول المتوسط"
    stage: text("stage").notNull().default("متوسط"), // ابتدائي | متوسط | ثانوي
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("grade_levels_org_stage_idx").on(t.orgId, t.stage),
    uniqueIndex("grade_levels_org_name_idx").on(t.orgId, t.name),
    uniqueIndex("grade_levels_org_code_idx").on(t.orgId, t.code),
]);
export const subjectGradeLevels = pgTable("subject_grade_levels", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    gradeLevelId: uuid("grade_level_id").notNull().references(() => gradeLevels.id, { onDelete: "cascade" }),
    weeklyHours: integer("weekly_hours").notNull().default(4), // legacy — kept for compat
    weeklyPeriods: integer("weekly_periods").default(4), // الحصص الأسبوعية الرسمية
    isRequired: boolean("is_required").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("sgl_grade_idx").on(t.orgId, t.gradeLevelId),
    index("sgl_subject_idx").on(t.orgId, t.subjectId),
    uniqueIndex("sgl_unique_idx").on(t.orgId, t.subjectId, t.gradeLevelId),
]);
// ============================================================
// ACADEMIC CALENDAR — الفصول الدراسية والأحداث
// ============================================================
export const schoolSemesters = pgTable("school_semesters", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    yearLabel: text("year_label").notNull(), // "1446-1447"
    semesterNumber: integer("semester_number").notNull(), // 1 | 2
    label: text("label"), // "الفصل الدراسي الأول"
    startDate: date("start_date"),
    endDate: date("end_date"),
    isActive: boolean("is_active").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_semesters_org_idx").on(t.orgId),
    uniqueIndex("school_semesters_unique").on(t.orgId, t.yearLabel, t.semesterNumber),
]);
export const schoolEventTypeEnum = pgEnum("school_event_type", [
    "holiday", // إجازة
    "national_day", // مناسبة وطنية
    "exam", // اختبار
    "activity", // نشاط مدرسي
    "other", // أخرى
]);
export const schoolEvents = pgTable("school_events", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    semesterId: uuid("semester_id").references(() => schoolSemesters.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    eventType: schoolEventTypeEnum("event_type").notNull().default("other"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"), // null = single day
    description: text("description"),
    color: text("color"), // hex للعرض مثل "#ef4444"
    affectsAttendance: boolean("affects_attendance").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_events_org_idx").on(t.orgId),
    index("school_events_semester_idx").on(t.orgId, t.semesterId),
    index("school_events_date_idx").on(t.orgId, t.startDate),
]);
// ============================================================
// school_standby_activations — تفعيل حصص الانتظار
// يُسجَّل عند تكليف معلم لتغطية فصل في حال غياب المعلم الأصلي
// ============================================================
export const schoolStandbyActivations = pgTable("school_standby_activations", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    activationDate: date("activation_date").notNull(), // تاريخ الحصة
    absentTeacherId: uuid("absent_teacher_id").references(() => teacherProfiles.id, { onDelete: "set null" }),
    standbyTeacherId: uuid("standby_teacher_id").notNull().references(() => teacherProfiles.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").references(() => classRooms.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    periodLabel: text("period_label"), // "الحصة الأولى"
    startTime: text("start_time"), // "08:00"
    endTime: text("end_time"), // "08:45"
    notes: text("notes"),
    notified: boolean("notified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("standby_activations_org_date_idx").on(t.orgId, t.activationDate),
    index("standby_activations_absent_idx").on(t.orgId, t.absentTeacherId),
    index("standby_activations_standby_idx").on(t.orgId, t.standbyTeacherId),
]);
// ============================================================
// school_timetable — الجدول الدراسي الأسبوعي لكل فصل
// ============================================================
export const schoolTimetable = pgTable("school_timetable", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0=الأحد … 4=الخميس
    periodNumber: integer("period_number").notNull(), // 1..15
    subject: text("subject"),
    teacherId: uuid("teacher_id").references(() => teacherProfiles.id, { onDelete: "set null" }),
    startTime: text("start_time"), // "07:30"
    endTime: text("end_time"), // "08:15"
    isBreak: boolean("is_break").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("school_timetable_class_idx").on(t.orgId, t.classRoomId),
    index("school_timetable_teacher_idx").on(t.orgId, t.teacherId),
    uniqueIndex("school_timetable_unique").on(t.orgId, t.classRoomId, t.dayOfWeek, t.periodNumber),
]);
// ============================================================
// SCHOOL STAFF PROFILES — ربط المستخدم ببيانات الكادر المدرسي
// الصلاحيات تبقى في RBAC (jobTitles + jobTitlePermissions)
// هذا الجدول لربط userId بـ teacherProfileId وتحديد نوع الـ scope
// ============================================================
export const schoolStaffTypeEnum = pgEnum("school_staff_type", [
    "principal",
    "vice_principal",
    "counselor",
    "teacher",
    "admin_staff",
]);
export const schoolStaffProfiles = pgTable("school_staff_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    staffType: schoolStaffTypeEnum("staff_type").notNull(),
    teacherProfileId: uuid("teacher_profile_id").references(() => teacherProfiles.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    uniqueIndex("school_staff_profiles_org_user_unique").on(t.orgId, t.userId),
    index("school_staff_profiles_org_idx").on(t.orgId),
    index("school_staff_profiles_teacher_idx").on(t.orgId, t.teacherProfileId),
]);
// ============================================================
// TEACHER PREPARATIONS — تحضير الدروس
// مرتبط بـ: scheduleWeeks + timetableTemplatePeriods + classRooms + subjects
// ============================================================
export const teacherPrepStatusEnum = pgEnum("teacher_prep_status", [
    "draft",
    "ready",
    "done",
]);
export const teacherPreparations = pgTable("teacher_preparations", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    teacherProfileId: uuid("teacher_profile_id").notNull().references(() => teacherProfiles.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    weekId: uuid("week_id").notNull().references(() => scheduleWeeks.id, { onDelete: "cascade" }),
    periodId: uuid("period_id").notNull().references(() => timetableTemplatePeriods.id, { onDelete: "cascade" }),
    dayOfWeek: schoolDayOfWeekEnum("day_of_week").notNull(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    preparationText: text("preparation_text"),
    learningObjectives: text("learning_objectives"),
    resources: text("resources"),
    status: teacherPrepStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    uniqueIndex("teacher_preparations_unique").on(t.teacherProfileId, t.weekId, t.periodId, t.classRoomId, t.dayOfWeek),
    index("teacher_preparations_teacher_idx").on(t.orgId, t.teacherProfileId),
    index("teacher_preparations_week_idx").on(t.orgId, t.weekId),
    index("teacher_preparations_subject_idx").on(t.orgId, t.subjectId),
]);
// ============================================================
// TEACHER DAILY LOGS — يومية التدريس
// مرتبط بـ: scheduleEntries + classRooms + subjects
// ============================================================
export const teacherEngagementEnum = pgEnum("teacher_engagement_level", [
    "low",
    "normal",
    "high",
]);
export const teacherDailyLogs = pgTable("teacher_daily_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    teacherProfileId: uuid("teacher_profile_id").notNull().references(() => teacherProfiles.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    scheduleEntryId: uuid("schedule_entry_id").references(() => scheduleEntries.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    periodId: uuid("period_id").references(() => timetableTemplatePeriods.id, { onDelete: "set null" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    topicCovered: text("topic_covered").notNull(),
    notes: text("notes"),
    studentEngagement: teacherEngagementEnum("student_engagement").notNull().default("normal"),
    studentsAbsent: jsonb("students_absent").notNull().default([]), // [{studentId, name}]
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    uniqueIndex("teacher_daily_logs_unique").on(t.teacherProfileId, t.classRoomId, t.date, t.periodId),
    index("teacher_daily_logs_teacher_idx").on(t.orgId, t.teacherProfileId),
    index("teacher_daily_logs_date_idx").on(t.orgId, t.date),
    index("teacher_daily_logs_subject_idx").on(t.orgId, t.subjectId),
]);
// ============================================================
// TEACHER STUDENT NOTES — ملاحظات المعلم على الطلاب
// ============================================================
export const teacherNoteTypeEnum = pgEnum("teacher_note_type", [
    "academic",
    "behavioral",
    "social",
    "other",
]);
export const teacherFollowUpEnum = pgEnum("teacher_follow_up_by", [
    "counselor",
    "vice_principal",
    "guardian",
]);
export const teacherStudentNotes = pgTable("teacher_student_notes", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    teacherProfileId: uuid("teacher_profile_id").notNull().references(() => teacherProfiles.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    classRoomId: uuid("class_room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    noteDate: date("note_date").notNull(),
    noteType: teacherNoteTypeEnum("note_type").notNull(),
    note: text("note").notNull(),
    isPrivate: boolean("is_private").notNull().default(false),
    requiresFollowUp: boolean("requires_follow_up").notNull().default(false),
    followUpBy: teacherFollowUpEnum("follow_up_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("teacher_student_notes_teacher_idx").on(t.orgId, t.teacherProfileId),
    index("teacher_student_notes_student_idx").on(t.orgId, t.studentId),
    index("teacher_student_notes_date_idx").on(t.orgId, t.noteDate),
    index("teacher_student_notes_follow_up_idx").on(t.orgId, t.requiresFollowUp),
]);
// ============================================================
// STUDENT REFERRALS — إحالات الطلاب
// workflow: pending → assigned → in_progress → resolved | rejected
// ============================================================
export const studentReferralTypeEnum = pgEnum("student_referral_type", [
    "counselor",
    "vice_principal",
    "medical",
]);
export const studentReferralStatusEnum = pgEnum("student_referral_status", [
    "pending",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
]);
export const studentReferralUrgencyEnum = pgEnum("student_referral_urgency", [
    "low",
    "normal",
    "high",
    "urgent",
]);
export const studentReferrals = pgTable("student_referrals", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    referredByUserId: uuid("referred_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    referralDate: date("referral_date").notNull(),
    referralType: studentReferralTypeEnum("referral_type").notNull(),
    reason: text("reason").notNull(),
    urgency: studentReferralUrgencyEnum("urgency").notNull().default("normal"),
    status: studentReferralStatusEnum("status").notNull().default("pending"),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    caseId: uuid("case_id").references(() => schoolCases.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("student_referrals_org_idx").on(t.orgId, t.referralDate),
    index("student_referrals_student_idx").on(t.orgId, t.studentId),
    index("student_referrals_status_idx").on(t.orgId, t.status),
    index("student_referrals_assigned_idx").on(t.orgId, t.assignedToUserId),
    index("student_referrals_urgency_idx").on(t.orgId, t.urgency),
]);
// ============================================================
// COUNSELING SESSIONS — جلسات الإرشاد الطلابي
// مرتبطة بـ: schoolCases + studentReferrals
// ============================================================
export const counselingSessionTypeEnum = pgEnum("counseling_session_type", [
    "individual",
    "group",
    "guardian",
]);
export const counselingSessionStatusEnum = pgEnum("counseling_session_status", [
    "scheduled",
    "completed",
    "cancelled",
]);
export const counselingSessions = pgTable("counseling_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    counselorUserId: uuid("counselor_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").references(() => schoolCases.id, { onDelete: "set null" }),
    referralId: uuid("referral_id").references(() => studentReferrals.id, { onDelete: "set null" }),
    sessionDate: date("session_date").notNull(),
    sessionType: counselingSessionTypeEnum("session_type").notNull(),
    durationMinutes: integer("duration_minutes"),
    sessionNotes: text("session_notes"),
    actionPlan: text("action_plan"),
    nextSessionDate: date("next_session_date"),
    status: counselingSessionStatusEnum("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("counseling_sessions_org_idx").on(t.orgId, t.sessionDate),
    index("counseling_sessions_counselor_idx").on(t.orgId, t.counselorUserId),
    index("counseling_sessions_student_idx").on(t.orgId, t.studentId),
    index("counseling_sessions_case_idx").on(t.orgId, t.caseId),
    index("counseling_sessions_status_idx").on(t.orgId, t.status),
]);
//# sourceMappingURL=school.js.map