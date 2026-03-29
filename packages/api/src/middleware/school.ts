import { Context, Next, Env } from "hono";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  schoolStaffProfiles,
  teacherClassAssignments,
  subjects,
} from "@nasaq/db/schema";
import { auditLog } from "@nasaq/db/schema";

// ============================================================
// SCHOOL SCOPE — نوع الـ scope لكل دور مدرسي
// classRoomIds = null → يرى الكل
// subjectIds   = null → يرى الكل
// ============================================================

export type SchoolScope = {
  staffType: "principal" | "vice_principal" | "counselor" | "teacher" | "admin_staff" | "owner";
  teacherProfileId: string | null;
  classRoomIds: string[] | null;
  subjectIds: string[] | null;
  counselorUserId: string | null;
};

// ============================================================
// SCHOOL CONTEXT — Context type آمن بدون any
// الاستخدام: import { SchoolContext } from "../middleware/school"
// ثم: async (c: SchoolContext) => { const scope = c.get("schoolScope"); }
// ============================================================

export type SchoolEnv = Env & {
  Variables: {
    schoolScope: SchoolScope;
  };
};

export type SchoolContext = Context<SchoolEnv>;

/**
 * withSchoolScope — يُحمَّل بعد requirePerm()
 * يحسب scope المستخدم ويضعه في context لاستخدامه في الـ routes
 *
 * الاستخدام:
 *   .get("/students", requirePerm("school.students.read"), withSchoolScope, handler)
 */
export async function withSchoolScope(c: Context, next: Next) {
  const user = c.get("user");
  const orgId = c.get("orgId") as string;

  // Owner يرى الكل دون scope
  if (user?.type === "owner" || user?.systemRole === "owner") {
    c.set("schoolScope", {
      staffType: "owner",
      teacherProfileId: null,
      classRoomIds: null,
      subjectIds: null,
      counselorUserId: null,
    } satisfies SchoolScope);
    return next();
  }

  const userId = user?.id as string;

  const profile = await db.query.schoolStaffProfiles.findFirst({
    where: and(
      eq(schoolStaffProfiles.userId, userId),
      eq(schoolStaffProfiles.orgId, orgId),
      eq(schoolStaffProfiles.isActive, true)
    ),
  });

  // لا يوجد profile → scope عام (admin fallback)
  if (!profile) {
    c.set("schoolScope", {
      staffType: "admin_staff",
      teacherProfileId: null,
      classRoomIds: null,
      subjectIds: null,
      counselorUserId: null,
    } satisfies SchoolScope);
    return next();
  }

  if (profile.staffType === "teacher" && profile.teacherProfileId) {
    // جلب الفصول والمواد من teacherClassAssignments
    const assignments = await db.query.teacherClassAssignments.findMany({
      where: and(
        eq(teacherClassAssignments.teacherId, profile.teacherProfileId),
        eq(teacherClassAssignments.orgId, orgId)
      ),
    });

    const classRoomIds = [
      ...new Set(assignments.map((a) => a.classRoomId).filter((id): id is string => Boolean(id))),
    ];

    // جلب subjectIds عن طريق مطابقة اسم المادة في جدول subjects
    const subjectNames = [...new Set(assignments.map((a) => a.subject).filter(Boolean))];
    let subjectIds: string[] = [];

    if (subjectNames.length > 0) {
      const subjectRows = await db
        .select({ id: subjects.id })
        .from(subjects)
        .where(and(eq(subjects.orgId, orgId), inArray(subjects.name, subjectNames)));
      subjectIds = subjectRows.map((s) => s.id);
    }

    c.set("schoolScope", {
      staffType: "teacher",
      teacherProfileId: profile.teacherProfileId,
      classRoomIds: classRoomIds.length > 0 ? classRoomIds : [],
      subjectIds: subjectIds.length > 0 ? subjectIds : [],
      counselorUserId: null,
    } satisfies SchoolScope);
  } else if (profile.staffType === "counselor") {
    c.set("schoolScope", {
      staffType: "counselor",
      teacherProfileId: null,
      classRoomIds: null,
      subjectIds: null,
      counselorUserId: userId,
    } satisfies SchoolScope);
  } else {
    // principal / vice_principal / admin_staff — يرون الكل
    c.set("schoolScope", {
      staffType: profile.staffType,
      teacherProfileId: null,
      classRoomIds: null,
      subjectIds: null,
      counselorUserId: null,
    } satisfies SchoolScope);
  }

  return next();
}

// ============================================================
// CONCURRENCY CHECK — يُستدعى داخل transaction قبل update
// يرفض إذا تغيّر updatedAt منذ آخر قراءة
// ============================================================

export function checkConcurrency(
  storedUpdatedAt: Date,
  clientUpdatedAt: string | undefined
): boolean {
  if (!clientUpdatedAt) return true; // لا يوجد check → نمرر
  const stored = storedUpdatedAt.getTime();
  const client = new Date(clientUpdatedAt).getTime();
  return stored <= client; // صحيح = لم يتغير
}

// ============================================================
// AUDIT HELPER — يُسجَّل في auditLog الموجود
// يُستدعى بعد كل عملية حساسة
// ============================================================

export type SchoolAuditAction =
  | "timetable.bulk_saved"
  | "timetable.entry_deleted"
  | "violation.created"
  | "violation.status_changed"
  | "referral.created"
  | "referral.assigned"
  | "referral.resolved"
  | "case.status_changed"
  | "case.step_added"
  | "preparation.saved"
  | "daily_log.saved";

export async function logSchoolAudit(
  c: Context,
  action: SchoolAuditAction,
  entityType: string,
  entityId: string | null,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
) {
  try {
    const user = c.get("user");
    const orgId = c.get("orgId") as string;
    const ipAddress =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      null;
    const userAgent = c.req.header("user-agent") ?? null;

    await db.insert(auditLog).values({
      orgId,
      userId: user?.id ?? null,
      action: "update",          // auditActionEnum المتاحة: create|update|delete|...
      entity: entityType,
      entityId: entityId ?? undefined,
      oldData: oldData ?? undefined,
      newData: newData ?? undefined,
      ipAddress,
      userAgent,
      description: action,
    });
  } catch {
    // audit failure لا يوقف العملية الأصلية
  }
}
