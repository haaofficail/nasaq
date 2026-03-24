import { Hono } from "hono";
import { eq, and, desc, asc, sql, count, gte, lte } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import { shifts, users, timeOff } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";

// ============================================================
// STATUS ENGINE
// ============================================================

export type AttendanceStatus =
  | "not_started" | "not_checked_in" | "present" | "late" | "absent"
  | "on_leave" | "week_off" | "holiday" | "incomplete" | "early_leave"
  | "overtime" | "on_mission";

interface Policy {
  grace_minutes: number;
  absent_threshold_minutes: number;
}

const DEFAULT_POLICY: Policy = { grace_minutes: 15, absent_threshold_minutes: 90 };

/** Parse "HH:MM" + date string (YYYY-MM-DD) as Saudi time (UTC+3) */
function parseScheduledTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00+03:00`);
}

interface StatusResult {
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  workedMinutes: number;
}

function computeStatus(params: {
  schedDay: { start_time: string; end_time: string } | null;
  shiftRow: any | null;
  isOnLeave: boolean;
  policy: Policy;
  dateStr: string;
  now: Date;
}): StatusResult {
  const { schedDay, shiftRow, isOnLeave, policy, dateStr, now } = params;
  const zero = { lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, workedMinutes: 0 };

  if (isOnLeave) return { status: "on_leave", ...zero };
  if (!schedDay) return { status: "week_off", ...zero };

  const scheduledStart = parseScheduledTime(dateStr, schedDay.start_time);
  const scheduledEnd = parseScheduledTime(dateStr, schedDay.end_time);
  const graceEnd = new Date(scheduledStart.getTime() + policy.grace_minutes * 60000);
  const absentThreshold = new Date(scheduledStart.getTime() + policy.absent_threshold_minutes * 60000);

  // No check-in at all
  const actualStart = shiftRow?.actual_start_time;
  if (!actualStart) {
    if (now < scheduledStart) return { status: "not_started", ...zero };
    if (now < absentThreshold) return { status: "not_checked_in", ...zero };
    return { status: "absent", ...zero };
  }

  const checkIn = new Date(actualStart as string);
  const lateMinutes = Math.max(0, Math.round((checkIn.getTime() - scheduledStart.getTime()) / 60000));

  const actualEnd = shiftRow?.actual_end_time;
  if (!actualEnd) {
    const workedMinutes = Math.max(0, Math.round((now.getTime() - checkIn.getTime()) / 60000));
    if (now < scheduledEnd) {
      const status = lateMinutes > policy.grace_minutes ? "late" : "present";
      return { status, lateMinutes, earlyLeaveMinutes: 0, overtimeMinutes: 0, workedMinutes };
    }
    return { status: "incomplete", lateMinutes, earlyLeaveMinutes: 0, overtimeMinutes: 0, workedMinutes };
  }

  const checkOut = new Date(actualEnd as string);
  const workedMinutes = Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000));
  const earlyLeaveMinutes = Math.max(0, Math.round((scheduledEnd.getTime() - checkOut.getTime()) / 60000));
  const overtimeMinutes = Math.max(0, Math.round((checkOut.getTime() - scheduledEnd.getTime()) / 60000));

  let status: AttendanceStatus;
  if (earlyLeaveMinutes > 15) status = "early_leave";
  else if (overtimeMinutes > 30) status = "overtime";
  else if (lateMinutes > policy.grace_minutes) status = "late";
  else status = "present";

  return { status, lateMinutes, earlyLeaveMinutes, overtimeMinutes, workedMinutes };
}

function fmtMinutes(m: number): string {
  if (!m) return "—";
  const h = Math.floor(m / 60), min = m % 60;
  if (h > 0) return `${h}س ${min}د`;
  return `${min}د`;
}

// ============================================================
// ROUTER
// ============================================================

export const attendanceRouter = new Hono();

// --------------------------------------------------------
// GET /daily?date=YYYY-MM-DD
// Returns all employees + their attendance status
// --------------------------------------------------------
attendanceRouter.get("/daily", async (c) => {
  const orgId = getOrgId(c);
  const dateStr = c.req.query("date") || new Date().toISOString().split("T")[0];
  const now = new Date();

  // Get org policy
  const { rows: policyRows } = await pool.query(
    `SELECT grace_minutes, absent_threshold_minutes FROM attendance_policies WHERE org_id = $1`,
    [orgId]
  );
  const policy: Policy = policyRows[0] ?? DEFAULT_POLICY;

  // Single query: employees + their schedule for today + shift + time-off
  const dayOfWeek = new Date(dateStr + "T12:00:00Z").getDay(); // 0=Sun..6=Sat

  const { rows } = await pool.query(
    `SELECT
       u.id, u.name, u.job_title, u.avatar,
       esa.schedule_id,
       asd.start_time AS sched_start, asd.end_time AS sched_end,
       s.id AS shift_id,
       s.actual_start_time, s.actual_end_time,
       s.break_minutes, s.status AS shift_status, s.notes,
       s.start_time AS shift_sched_start, s.end_time AS shift_sched_end,
       toff.id AS time_off_id, toff.type AS time_off_type
     FROM users u
     LEFT JOIN employee_schedule_assignments esa
       ON esa.user_id = u.id AND esa.org_id = $1 AND esa.is_active = true
       AND esa.effective_from <= $2 AND (esa.effective_to IS NULL OR esa.effective_to >= $2)
     LEFT JOIN attendance_schedule_days asd
       ON asd.schedule_id = esa.schedule_id AND asd.day_of_week = $3 AND asd.is_active = true
     LEFT JOIN shifts s
       ON s.user_id = u.id AND s.org_id = $1 AND DATE(s.date) = $2
     LEFT JOIN time_off toff
       ON toff.user_id = u.id AND toff.org_id = $1 AND toff.status = 'approved'
       AND toff.start_date::date <= $2 AND toff.end_date::date >= $2
     WHERE u.org_id = $1 AND u.status = 'active' AND u.type IN ('employee', 'owner')
     ORDER BY u.name`,
    [orgId, dateStr, dayOfWeek]
  );

  const records = rows.map((r: any) => {
    const schedDay = r.sched_start
      ? { start_time: r.sched_start, end_time: r.sched_end }
      : r.shift_sched_start
        ? { start_time: r.shift_sched_start, end_time: r.shift_sched_end }
        : null;

    const { status, lateMinutes, earlyLeaveMinutes, overtimeMinutes, workedMinutes } = computeStatus({
      schedDay,
      shiftRow: r.shift_id ? r : null,
      isOnLeave: !!r.time_off_id,
      policy,
      dateStr,
      now,
    });

    return {
      userId: r.id,
      name: r.name,
      jobTitle: r.job_title,
      avatar: r.avatar,
      shiftId: r.shift_id,
      scheduledStart: r.sched_start || r.shift_sched_start,
      scheduledEnd: r.sched_end || r.shift_sched_end,
      actualStart: r.actual_start_time,
      actualEnd: r.actual_end_time,
      breakMinutes: r.break_minutes || 0,
      shiftNotes: r.notes,
      timeOffType: r.time_off_type,
      status,
      lateMinutes,
      lateMinutesFmt: fmtMinutes(lateMinutes),
      earlyLeaveMinutes,
      earlyLeaveMinutesFmt: fmtMinutes(earlyLeaveMinutes),
      overtimeMinutes,
      overtimeMinutesFmt: fmtMinutes(overtimeMinutes),
      workedMinutes,
      workedMinutesFmt: fmtMinutes(workedMinutes),
    };
  });

  return c.json({ data: records });
});

// --------------------------------------------------------
// GET /summary?date=YYYY-MM-DD
// --------------------------------------------------------
attendanceRouter.get("/summary", async (c) => {
  const orgId = getOrgId(c);
  const dateStr = c.req.query("date") || new Date().toISOString().split("T")[0];

  const { rows: policyRows } = await pool.query(
    `SELECT grace_minutes, absent_threshold_minutes FROM attendance_policies WHERE org_id = $1`,
    [orgId]
  );
  const policy: Policy = policyRows[0] ?? DEFAULT_POLICY;
  const now = new Date();
  const dayOfWeek = new Date(dateStr + "T12:00:00Z").getDay();

  const { rows } = await pool.query(
    `SELECT
       u.id,
       asd.start_time AS sched_start, asd.end_time AS sched_end,
       s.actual_start_time, s.actual_end_time,
       toff.id AS time_off_id
     FROM users u
     LEFT JOIN employee_schedule_assignments esa
       ON esa.user_id = u.id AND esa.org_id = $1 AND esa.is_active = true
       AND esa.effective_from <= $2 AND (esa.effective_to IS NULL OR esa.effective_to >= $2)
     LEFT JOIN attendance_schedule_days asd
       ON asd.schedule_id = esa.schedule_id AND asd.day_of_week = $3 AND asd.is_active = true
     LEFT JOIN shifts s ON s.user_id = u.id AND s.org_id = $1 AND DATE(s.date) = $2
     LEFT JOIN time_off toff
       ON toff.user_id = u.id AND toff.org_id = $1 AND toff.status = 'approved'
       AND toff.start_date::date <= $2 AND toff.end_date::date >= $2
     WHERE u.org_id = $1 AND u.status = 'active' AND u.type IN ('employee', 'owner')`,
    [orgId, dateStr, dayOfWeek]
  );

  const counts: Record<AttendanceStatus, number> = {
    not_started: 0, not_checked_in: 0, present: 0, late: 0, absent: 0,
    on_leave: 0, week_off: 0, holiday: 0, incomplete: 0, early_leave: 0,
    overtime: 0, on_mission: 0,
  };

  for (const r of rows) {
    const schedDay = r.sched_start ? { start_time: r.sched_start, end_time: r.sched_end } : null;
    const { status } = computeStatus({
      schedDay, shiftRow: r.actual_start_time ? r : null,
      isOnLeave: !!r.time_off_id, policy, dateStr, now,
    });
    counts[status] = (counts[status] || 0) + 1;
  }

  return c.json({ data: { date: dateStr, total: rows.length, ...counts } });
});

// --------------------------------------------------------
// POST /checkin
// --------------------------------------------------------
attendanceRouter.post("/checkin", async (c) => {
  const orgId = getOrgId(c);
  const actorId = getUserId(c);
  const { userId, shiftId, source = "manual", notes } = await c.req.json();
  const targetUserId = userId || actorId;
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  let resultShift;
  if (shiftId) {
    const [updated] = await db.update(shifts)
      .set({ actualStartTime: now as any, status: "in_progress", notes, updatedAt: now })
      .where(and(eq(shifts.id, shiftId), eq(shifts.orgId, orgId))).returning();
    resultShift = updated;
  } else {
    // Check if shift already exists for today
    const [existing] = await db.select().from(shifts)
      .where(and(eq(shifts.orgId, orgId), eq(shifts.userId, targetUserId), sql`DATE(${shifts.date}) = ${today}`))
      .limit(1);
    if (existing) {
      if (existing.actualStartTime) return c.json({ error: "تم تسجيل الحضور مسبقاً" }, 400);
      const [updated] = await db.update(shifts)
        .set({ actualStartTime: now as any, status: "in_progress", notes, updatedAt: now })
        .where(eq(shifts.id, existing.id)).returning();
      resultShift = updated;
    } else {
      // Get scheduled times for today
      const { rows: schedRows } = await pool.query(
        `SELECT asd.start_time, asd.end_time
         FROM employee_schedule_assignments esa
         JOIN attendance_schedule_days asd ON asd.schedule_id = esa.schedule_id AND asd.day_of_week = $3 AND asd.is_active = true
         WHERE esa.user_id = $1 AND esa.org_id = $2 AND esa.is_active = true LIMIT 1`,
        [targetUserId, orgId, new Date(today + "T12:00:00Z").getDay()]
      );
      const sched = schedRows[0];
      const [created] = await db.insert(shifts).values({
        orgId, userId: targetUserId, date: new Date(today),
        startTime: sched?.start_time || "09:00", endTime: sched?.end_time || "18:00",
        actualStartTime: now as any, status: "in_progress", notes,
      } as any).returning();
      resultShift = created;
    }
  }

  // Log event
  await pool.query(
    `INSERT INTO attendance_events (org_id, shift_id, user_id, event_type, source, performed_by)
     VALUES ($1, $2, $3, 'check_in', $4, $5)`,
    [orgId, resultShift?.id, targetUserId, source, actorId || targetUserId]
  );

  return c.json({ data: resultShift }, 201);
});

// --------------------------------------------------------
// PATCH /:shiftId/checkout
// --------------------------------------------------------
attendanceRouter.patch("/:shiftId/checkout", async (c) => {
  const orgId = getOrgId(c);
  const actorId = getUserId(c);
  const shiftId = c.req.param("shiftId");
  const { source = "manual", notes } = await c.req.json().catch(() => ({}));
  const now = new Date();

  const [updated] = await db.update(shifts)
    .set({ actualEndTime: now as any, status: "completed", notes: notes || undefined, updatedAt: now })
    .where(and(eq(shifts.id, shiftId), eq(shifts.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "السجل غير موجود" }, 404);

  await pool.query(
    `INSERT INTO attendance_events (org_id, shift_id, user_id, event_type, source, performed_by)
     VALUES ($1, $2, $3, 'check_out', $4, $5)`,
    [orgId, shiftId, updated.userId, source, actorId || updated.userId]
  );

  return c.json({ data: updated });
});

// --------------------------------------------------------
// POST /manual — manual attendance entry
// --------------------------------------------------------
attendanceRouter.post("/manual", async (c) => {
  const orgId = getOrgId(c);
  const actorId = getUserId(c);
  const { userId, date, checkIn, checkOut, notes } = await c.req.json();
  if (!userId || !date) return c.json({ error: "المستخدم والتاريخ مطلوبان" }, 400);

  const { rows: schedRows } = await pool.query(
    `SELECT asd.start_time, asd.end_time
     FROM employee_schedule_assignments esa
     JOIN attendance_schedule_days asd ON asd.schedule_id = esa.schedule_id
       AND asd.day_of_week = $3 AND asd.is_active = true
     WHERE esa.user_id = $1 AND esa.org_id = $2 AND esa.is_active = true LIMIT 1`,
    [userId, orgId, new Date(date + "T12:00:00Z").getDay()]
  );
  const sched = schedRows[0];

  const [existing] = await db.select().from(shifts)
    .where(and(eq(shifts.orgId, orgId), eq(shifts.userId, userId), sql`DATE(${shifts.date}) = ${date}`))
    .limit(1);

  let resultShift;
  if (existing) {
    const [updated] = await db.update(shifts).set({
      actualStartTime: checkIn ? new Date(checkIn) as any : existing.actualStartTime,
      actualEndTime: checkOut ? new Date(checkOut) as any : existing.actualEndTime,
      status: checkOut ? "completed" : "in_progress",
      notes, updatedAt: new Date(),
    }).where(eq(shifts.id, existing.id)).returning();
    resultShift = updated;
  } else {
    const [created] = await db.insert(shifts).values({
      orgId, userId, date: new Date(date),
      startTime: sched?.start_time || "09:00", endTime: sched?.end_time || "18:00",
      actualStartTime: checkIn ? new Date(checkIn) as any : undefined,
      actualEndTime: checkOut ? new Date(checkOut) as any : undefined,
      status: checkOut ? "completed" : checkIn ? "in_progress" : "no_show",
      notes,
    } as any).returning();
    resultShift = created;
  }

  await pool.query(
    `INSERT INTO attendance_events (org_id, shift_id, user_id, event_type, source, performed_by, metadata)
     VALUES ($1, $2, $3, 'manual_adjustment', 'manual', $4, $5)`,
    [orgId, resultShift?.id, userId, actorId, JSON.stringify({ date, checkIn, checkOut })]
  );

  return c.json({ data: resultShift }, 201);
});

// ============================================================
// SCHEDULES
// ============================================================

attendanceRouter.get("/schedules", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT s.*,
       json_agg(d ORDER BY d.day_of_week) FILTER (WHERE d.id IS NOT NULL) AS days,
       COUNT(DISTINCT esa.user_id) AS assigned_count
     FROM attendance_schedules s
     LEFT JOIN attendance_schedule_days d ON d.schedule_id = s.id
     LEFT JOIN employee_schedule_assignments esa ON esa.schedule_id = s.id AND esa.is_active = true
     WHERE s.org_id = $1
     GROUP BY s.id ORDER BY s.is_default DESC, s.name`,
    [orgId]
  );
  return c.json({ data: rows });
});

attendanceRouter.post("/schedules", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { name, description, graceMinutes = 15, absentThresholdMinutes = 90,
    breakMinutes = 0, isDefault = false, days = [] } = body;

  if (!name) return c.json({ error: "اسم الجدول مطلوب" }, 400);

  if (isDefault) {
    await pool.query(`UPDATE attendance_schedules SET is_default = false WHERE org_id = $1`, [orgId]);
  }

  const { rows } = await pool.query(
    `INSERT INTO attendance_schedules (org_id, name, description, grace_minutes, absent_threshold_minutes, break_minutes, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [orgId, name, description, graceMinutes, absentThresholdMinutes, breakMinutes, isDefault]
  );
  const schedule = rows[0];

  if (days.length > 0) {
    const vals = days.map((_: any, i: number) =>
      `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4}, true)`
    ).join(", ");
    const params = days.flatMap((d: any) => [d.dayOfWeek, d.startTime, d.endTime]);
    await pool.query(
      `INSERT INTO attendance_schedule_days (schedule_id, day_of_week, start_time, end_time, is_active)
       VALUES ${vals}`, [schedule.id, ...params]
    );
  }

  return c.json({ data: schedule }, 201);
});

attendanceRouter.put("/schedules/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, description, graceMinutes, absentThresholdMinutes, breakMinutes, isDefault, days } = body;

  if (isDefault) {
    await pool.query(`UPDATE attendance_schedules SET is_default = false WHERE org_id = $1 AND id != $2`, [orgId, id]);
  }

  const { rows } = await pool.query(
    `UPDATE attendance_schedules SET
       name = COALESCE($3, name),
       description = COALESCE($4, description),
       grace_minutes = COALESCE($5, grace_minutes),
       absent_threshold_minutes = COALESCE($6, absent_threshold_minutes),
       break_minutes = COALESCE($7, break_minutes),
       is_default = COALESCE($8, is_default),
       updated_at = now()
     WHERE id = $1 AND org_id = $2 RETURNING *`,
    [id, orgId, name, description, graceMinutes, absentThresholdMinutes, breakMinutes, isDefault]
  );
  if (!rows[0]) return c.json({ error: "الجدول غير موجود" }, 404);

  if (days && Array.isArray(days)) {
    await pool.query(`DELETE FROM attendance_schedule_days WHERE schedule_id = $1`, [id]);
    if (days.length > 0) {
      const vals = days.map((_: any, i: number) =>
        `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4}, true)`
      ).join(", ");
      const params = days.flatMap((d: any) => [d.dayOfWeek, d.startTime, d.endTime]);
      await pool.query(
        `INSERT INTO attendance_schedule_days (schedule_id, day_of_week, start_time, end_time, is_active)
         VALUES ${vals}`, [id, ...params]
      );
    }
  }

  return c.json({ data: rows[0] });
});

attendanceRouter.delete("/schedules/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM employee_schedule_assignments WHERE schedule_id = $1 AND is_active = true`, [id]
  );
  if (parseInt(rows[0].cnt) > 0) return c.json({ error: "لا يمكن حذف جدول مرتبط بموظفين" }, 400);
  await pool.query(`UPDATE attendance_schedules SET is_active = false WHERE id = $1 AND org_id = $2`, [id, orgId]);
  return c.json({ data: { success: true } });
});

// --------------------------------------------------------
// POST /schedules/:id/assign — assign schedule to employees
// --------------------------------------------------------
attendanceRouter.post("/schedules/:id/assign", async (c) => {
  const orgId = getOrgId(c);
  const scheduleId = c.req.param("id");
  const { userIds, effectiveFrom } = await c.req.json();
  if (!userIds?.length) return c.json({ error: "الموظفون مطلوبون" }, 400);

  for (const userId of userIds) {
    await pool.query(
      `INSERT INTO employee_schedule_assignments (org_id, user_id, schedule_id, effective_from, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (org_id, user_id, effective_from)
       DO UPDATE SET schedule_id = $3, is_active = true`,
      [orgId, userId, scheduleId, effectiveFrom || new Date().toISOString().split("T")[0]]
    );
  }

  return c.json({ data: { assigned: userIds.length } });
});

// --------------------------------------------------------
// GET /assignments — employees with their current schedule
// --------------------------------------------------------
attendanceRouter.get("/assignments", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.job_title,
       esa.id AS assignment_id, esa.schedule_id, esa.effective_from, esa.is_active,
       s.name AS schedule_name, s.is_default
     FROM users u
     LEFT JOIN employee_schedule_assignments esa
       ON esa.user_id = u.id AND esa.org_id = $1 AND esa.is_active = true
       AND esa.effective_from = (
         SELECT MAX(e2.effective_from) FROM employee_schedule_assignments e2
         WHERE e2.user_id = u.id AND e2.org_id = $1 AND e2.is_active = true
       )
     LEFT JOIN attendance_schedules s ON s.id = esa.schedule_id
     WHERE u.org_id = $1 AND u.status = 'active' AND u.type IN ('employee','owner')
     ORDER BY u.name`,
    [orgId]
  );
  return c.json({ data: rows });
});

// ============================================================
// POLICIES
// ============================================================

attendanceRouter.get("/policies", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT * FROM attendance_policies WHERE org_id = $1`, [orgId]
  );
  return c.json({ data: rows[0] || { ...DEFAULT_POLICY, rounding_minutes: 5, allow_self_checkin: true, allow_manual_entries: true, require_approval: false, auto_close_open_records: true, auto_close_hour: "23:59", require_gps: false, require_qr: false } });
});

attendanceRouter.put("/policies", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { rows } = await pool.query(
    `INSERT INTO attendance_policies (org_id, grace_minutes, absent_threshold_minutes, rounding_minutes,
       allow_self_checkin, allow_manual_entries, require_approval, auto_close_open_records, auto_close_hour, require_gps, require_qr)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (org_id) DO UPDATE SET
       grace_minutes = $2, absent_threshold_minutes = $3, rounding_minutes = $4,
       allow_self_checkin = $5, allow_manual_entries = $6, require_approval = $7,
       auto_close_open_records = $8, auto_close_hour = $9, require_gps = $10, require_qr = $11,
       updated_at = now()
     RETURNING *`,
    [orgId, body.graceMinutes ?? 15, body.absentThresholdMinutes ?? 90, body.roundingMinutes ?? 5,
     body.allowSelfCheckin ?? true, body.allowManualEntries ?? true, body.requireApproval ?? false,
     body.autoCloseOpenRecords ?? true, body.autoCloseHour ?? "23:59",
     body.requireGps ?? false, body.requireQr ?? false]
  );
  return c.json({ data: rows[0] });
});

// ============================================================
// ADJUSTMENT REQUESTS
// ============================================================

attendanceRouter.get("/adjustments", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const conditions = ["r.org_id = $1"];
  const params: any[] = [orgId];
  if (status) { conditions.push(`r.status = $${params.length + 1}`); params.push(status); }

  const { rows } = await pool.query(
    `SELECT r.*, u.name AS user_name, u.job_title,
       rb.name AS reviewed_by_name
     FROM attendance_adjustment_requests r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN users rb ON rb.id = r.reviewed_by
     WHERE ${conditions.join(" AND ")}
     ORDER BY r.created_at DESC`,
    params
  );
  return c.json({ data: rows });
});

attendanceRouter.post("/adjustments", async (c) => {
  const orgId = getOrgId(c);
  const actorId = getUserId(c);
  const body = await c.req.json();
  const { userId, type, workDate, requestedCheckIn, requestedCheckOut, reason } = body;
  if (!type || !reason) return c.json({ error: "النوع والسبب مطلوبان" }, 400);

  const targetUserId = userId || actorId;
  let shiftId = body.shiftId;
  if (!shiftId && workDate) {
    const [s] = await db.select().from(shifts)
      .where(and(eq(shifts.orgId, orgId), eq(shifts.userId, targetUserId), sql`DATE(${shifts.date}) = ${workDate}`))
      .limit(1);
    shiftId = s?.id;
  }

  const { rows } = await pool.query(
    `INSERT INTO attendance_adjustment_requests
       (org_id, shift_id, user_id, requested_by, type, work_date, requested_check_in, requested_check_out, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [orgId, shiftId, targetUserId, actorId, type, workDate,
     requestedCheckIn || null, requestedCheckOut || null, reason]
  );
  return c.json({ data: rows[0] }, 201);
});

attendanceRouter.patch("/adjustments/:id/approve", async (c) => {
  const orgId = getOrgId(c);
  const actorId = getUserId(c);
  const id = c.req.param("id");
  const { note } = await c.req.json().catch(() => ({}));

  const { rows } = await pool.query(
    `UPDATE attendance_adjustment_requests
     SET status = 'approved', reviewed_by = $3, reviewed_at = now(), review_note = $4
     WHERE id = $1 AND org_id = $2 RETURNING *`,
    [id, orgId, actorId, note]
  );
  if (!rows[0]) return c.json({ error: "الطلب غير موجود" }, 404);

  // Apply the adjustment
  const req = rows[0];
  if (req.shift_id && (req.requested_check_in || req.requested_check_out)) {
    const updates: any = { updatedAt: new Date() };
    if (req.requested_check_in) updates.actualStartTime = new Date(req.requested_check_in) as any;
    if (req.requested_check_out) updates.actualEndTime = new Date(req.requested_check_out) as any;
    await db.update(shifts).set(updates).where(eq(shifts.id, req.shift_id));
  }

  return c.json({ data: rows[0] });
});

attendanceRouter.patch("/adjustments/:id/reject", async (c) => {
  const orgId = getOrgId(c);
  const actorId = getUserId(c);
  const id = c.req.param("id");
  const { note } = await c.req.json().catch(() => ({}));

  const { rows } = await pool.query(
    `UPDATE attendance_adjustment_requests
     SET status = 'rejected', reviewed_by = $3, reviewed_at = now(), review_note = $4
     WHERE id = $1 AND org_id = $2 RETURNING *`,
    [id, orgId, actorId, note]
  );
  if (!rows[0]) return c.json({ error: "الطلب غير موجود" }, 404);
  return c.json({ data: rows[0] });
});

// ============================================================
// REPORTS
// ============================================================

attendanceRouter.get("/reports/daily", async (c) => {
  const orgId = getOrgId(c);
  const dateStr = c.req.query("date") || new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date(dateStr + "T12:00:00Z").getDay();

  const { rows: policyRows } = await pool.query(
    `SELECT grace_minutes, absent_threshold_minutes FROM attendance_policies WHERE org_id = $1`, [orgId]
  );
  const policy: Policy = policyRows[0] ?? DEFAULT_POLICY;
  const now = new Date();

  const { rows } = await pool.query(
    `SELECT u.name, u.job_title,
       asd.start_time AS sched_start, asd.end_time AS sched_end,
       s.actual_start_time, s.actual_end_time, s.break_minutes,
       toff.type AS time_off_type
     FROM users u
     LEFT JOIN employee_schedule_assignments esa ON esa.user_id = u.id AND esa.org_id = $1 AND esa.is_active = true AND esa.effective_from <= $2 AND (esa.effective_to IS NULL OR esa.effective_to >= $2)
     LEFT JOIN attendance_schedule_days asd ON asd.schedule_id = esa.schedule_id AND asd.day_of_week = $3 AND asd.is_active = true
     LEFT JOIN shifts s ON s.user_id = u.id AND s.org_id = $1 AND DATE(s.date) = $2
     LEFT JOIN time_off toff ON toff.user_id = u.id AND toff.org_id = $1 AND toff.status = 'approved' AND toff.start_date::date <= $2 AND toff.end_date::date >= $2
     WHERE u.org_id = $1 AND u.status = 'active' AND u.type IN ('employee','owner')
     ORDER BY u.name`,
    [orgId, dateStr, dayOfWeek]
  );

  const reportRows = rows.map((r: any) => {
    const schedDay = r.sched_start ? { start_time: r.sched_start, end_time: r.sched_end } : null;
    const result = computeStatus({ schedDay, shiftRow: r.actual_start_time ? r : null, isOnLeave: !!r.time_off_type, policy, dateStr, now });
    return {
      name: r.name, jobTitle: r.job_title,
      scheduledStart: r.sched_start, scheduledEnd: r.sched_end,
      actualStart: r.actual_start_time, actualEnd: r.actual_end_time,
      ...result,
    };
  });

  const summary = { total: rows.length, present: 0, late: 0, absent: 0, on_leave: 0, week_off: 0, incomplete: 0, early_leave: 0, overtime: 0 } as any;
  for (const r of reportRows) {
    if (summary[r.status] !== undefined) summary[r.status]++;
    else summary.present++; // not_started/not_checked_in → count as not present
  }

  return c.json({ data: { date: dateStr, summary, rows: reportRows } });
});

attendanceRouter.get("/reports/monthly", async (c) => {
  const orgId = getOrgId(c);
  const year = parseInt(c.req.query("year") || String(new Date().getFullYear()));
  const month = parseInt(c.req.query("month") || String(new Date().getMonth() + 1));
  const userId = c.req.query("userId");

  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const toDate = new Date(year, month, 0).toISOString().split("T")[0];

  const conditions = ["s.org_id = $1", "DATE(s.date) BETWEEN $2 AND $3"];
  const params: any[] = [orgId, fromDate, toDate];
  if (userId) { conditions.push(`s.user_id = $${params.length + 1}`); params.push(userId); }

  const { rows } = await pool.query(
    `SELECT u.name, u.job_title,
       COUNT(*) AS total_shifts,
       COUNT(*) FILTER (WHERE s.actual_start_time IS NOT NULL) AS present_days,
       COUNT(*) FILTER (WHERE s.status = 'no_show') AS absent_days,
       COUNT(*) FILTER (WHERE s.actual_start_time IS NOT NULL AND s.actual_end_time IS NULL) AS incomplete_days,
       SUM(CASE WHEN s.actual_start_time IS NOT NULL AND s.actual_end_time IS NOT NULL
         THEN EXTRACT(EPOCH FROM (s.actual_end_time::timestamptz - s.actual_start_time::timestamptz)) / 60 ELSE 0 END)::int AS total_worked_minutes
     FROM shifts s
     JOIN users u ON u.id = s.user_id
     WHERE ${conditions.join(" AND ")}
     GROUP BY u.id, u.name, u.job_title ORDER BY u.name`,
    params
  );

  return c.json({ data: { year, month, from: fromDate, to: toDate, rows } });
});

attendanceRouter.get("/reports/employee", async (c) => {
  const orgId = getOrgId(c);
  const userId = c.req.query("userId");
  const from = c.req.query("from");
  const to = c.req.query("to") || new Date().toISOString().split("T")[0];
  if (!userId) return c.json({ error: "userId مطلوب" }, 400);

  const { rows } = await pool.query(
    `SELECT DATE(s.date) AS date, s.start_time, s.end_time,
       s.actual_start_time, s.actual_end_time, s.status, s.break_minutes, s.notes
     FROM shifts s
     WHERE s.org_id = $1 AND s.user_id = $2
       AND ($3::date IS NULL OR DATE(s.date) >= $3::date)
       AND DATE(s.date) <= $4::date
     ORDER BY s.date DESC LIMIT 90`,
    [orgId, userId, from || null, to]
  );

  return c.json({ data: rows });
});
