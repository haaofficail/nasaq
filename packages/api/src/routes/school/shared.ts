import { z } from "zod";
import { db } from "@nasaq/db/client";
import { schoolWhatsappLogs } from "@nasaq/db/schema";
import { sendWhatsApp } from "../../lib/whatsapp";

// ── School WhatsApp helper ────────────────────────────────
export async function sendSchoolWhatsApp(opts: {
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

export function fillTemplate(tpl: string, vars: Record<string, string | undefined | null>): string {
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

export function normalizeGrade(raw: string): string {
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

export const DAY_OF_WEEK_MAP: Record<number, "sun" | "mon" | "tue" | "wed" | "thu"> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
};

// ============================================================
// CURRENT PERIOD ENGINE
// ============================================================

export type PeriodSlot = {
  periodNumber: number;
  label:        string | null;
  startTime:    string;
  endTime:      string;
  isBreak:      boolean | null;
};

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function getCurrentPeriod(nowStr: string, periods: PeriodSlot[]): {
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
// SCHEMAS
// ============================================================

export const schoolSettingsSchema = z.object({
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

export const activeWeekSchema = z.object({
  activeWeekId: z.string().uuid().nullable(),
});

export const classRoomSchema = z.object({
  grade:    z.string().min(1).max(100),
  name:     z.string().min(1).max(100),
  capacity: z.number().int().positive().optional().nullable(),
  notes:    z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const teacherSchema = z.object({
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

export const studentSchema = z.object({
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

export const timetableTemplateSchema = z.object({
  name:        z.string().min(1).max(200),
  sessionType: z.enum(["summer", "winter"]).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive:    z.boolean().optional(),
});

export const timetableTemplatePeriodSchema = z.object({
  periodNumber: z.number().int().positive(),
  label:        z.string().max(100).optional().nullable(),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/),
  isBreak:      z.boolean().optional(),
});

export const scheduleWeekSchema = z.object({
  semesterId:  z.string().uuid().optional().nullable(),
  templateId:  z.string().uuid().optional().nullable(),
  weekNumber:  z.number().int().positive(),
  label:       z.string().max(200).optional().nullable(),
  startDate:   z.string().optional().nullable(),
  endDate:     z.string().optional().nullable(),
  notes:       z.string().max(1000).optional().nullable(),
});

export const scheduleEntrySchema = z.object({
  weekId:      z.string().uuid(),
  periodId:    z.string().uuid(),
  classRoomId: z.string().uuid(),
  teacherId:   z.string().uuid().optional().nullable(),
  dayOfWeek:   z.enum(["sun", "mon", "tue", "wed", "thu"]),
  subject:     z.string().min(1).max(200),
  notes:       z.string().max(1000).optional().nullable(),
});

export const bulkScheduleEntriesSchema = z.object({
  entries: z.array(scheduleEntrySchema),
});

export const teacherLateSchema = z.object({
  teacherLateMinutes: z.number().int().min(0).max(120),
  teacherArrivedAt:   z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

export const schoolCaseSchema = z.object({
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

export const schoolCaseStepSchema = z.object({
  stepNumber:  z.number().int().positive(),
  description: z.string().min(1).max(1000),
  actionTaken: z.string().max(2000).optional().nullable(),
  result:      z.string().max(2000).optional().nullable(),
  doneBy:      z.string().max(200).optional().nullable(),
  doneAt:      z.string().datetime().optional().nullable(),
  notes:       z.string().max(2000).optional().nullable(),
});
