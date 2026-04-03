import { Hono } from "hono";
import { db } from "@nasaq/db/client";
import {
  eq, and, ilike, or, desc, asc, gte, lte, sql, isNull, ne, inArray,
} from "drizzle-orm";
import {
  hrEmployees, hrEmployeeDocuments, hrAttendance, hrLeaves, hrLeaveBalances,
  hrLoans, hrLoanInstallments, hrDeductions, hrPayroll, hrPayrollItems,
  hrPerformanceReviews, hrZktecoDevices, hrGovernmentFees,
} from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { autoJournal } from "../lib/autoJournal";

export const hrRouter = new Hono();

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function nextEmployeeNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ num: hrEmployees.employeeNumber })
    .from(hrEmployees)
    .where(eq(hrEmployees.orgId, orgId))
    .orderBy(desc(hrEmployees.createdAt))
    .limit(1);
  const last = result[0]?.num ?? "EMP-000";
  const n = parseInt(last.split("-")[1] || "0") + 1;
  return `EMP-${String(n).padStart(3, "0")}`;
}

async function nextPayrollNumber(orgId: string, month: string): Promise<string> {
  const year = month.split("-")[0];
  const result = await db
    .select({ num: hrPayroll.payrollNumber })
    .from(hrPayroll)
    .where(eq(hrPayroll.orgId, orgId))
    .orderBy(desc(hrPayroll.createdAt))
    .limit(1);
  const last = result[0]?.num;
  const n = last ? parseInt(last.split("-").pop() || "0") + 1 : 1;
  return `PAY-${year}-${String(n).padStart(3, "0")}`;
}

async function nextLoanNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ num: hrLoans.loanNumber })
    .from(hrLoans)
    .where(eq(hrLoans.orgId, orgId))
    .orderBy(desc(hrLoans.createdAt))
    .limit(1);
  const last = result[0]?.num ?? "LOAN-000";
  const n = parseInt(last.split("-")[1] || "0") + 1;
  return `LOAN-${String(n).padStart(3, "0")}`;
}

function calcYearsOfService(hireDate: string, toDate = new Date()): number {
  const hire = new Date(hireDate);
  return (toDate.getTime() - hire.getTime()) / (365.25 * 24 * 3600 * 1000);
}

function calcGratuity(
  basicSalary: number,
  hireDate: string,
  reason: "fired" | "resigned" | "end_of_contract" = "fired",
): number {
  const years = calcYearsOfService(hireDate);
  if (years < 2) return 0;

  let reasonFactor: number;
  if (reason === "fired" || reason === "end_of_contract") {
    reasonFactor = 1;
  } else if (years < 5) {
    reasonFactor = 0;
  } else if (years <= 10) {
    reasonFactor = 1 / 3;
  } else {
    reasonFactor = 1;
  }

  if (reasonFactor === 0) return 0;

  let gratuity = 0;
  if (years <= 5) {
    gratuity = basicSalary * 0.5 * years;
  } else if (years <= 10) {
    gratuity = basicSalary * 0.5 * 5 + basicSalary * (years - 5);
  } else {
    gratuity = basicSalary * 0.5 * 5 + basicSalary * 5 + basicSalary * (years - 10);
  }
  return Math.round(gratuity * 100) / 100 * reasonFactor;
}

function calcGosi(basicSalary: number, isSaudi: boolean) {
  const basic = Number(basicSalary);
  if (!basic) return { employee: 0, employer: 0 };
  if (isSaudi) {
    return {
      employee: Math.round(basic * 0.0975 * 100) / 100,
      employer: Math.round(basic * 0.0975 * 100) / 100,
    };
  } else {
    return {
      employee: 0,
      employer: Math.round(basic * 0.02 * 100) / 100,
    };
  }
}

function calcGratuityMonthlyProvision(basicSalary: number, hireDate: string): number {
  const years = calcYearsOfService(hireDate);
  const monthlyRate = years <= 5 ? (basicSalary * 0.5) / 12 : basicSalary / 12;
  return Math.round(monthlyRate * 100) / 100;
}

// ─────────────────────────────────────────────────────────────
// EMPLOYEES
// ─────────────────────────────────────────────────────────────

hrRouter.get("/employees", async (c) => {
  const orgId = getOrgId(c);
  const { status, department, search, is_saudi, page = "1", limit = "20" } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(hrEmployees.orgId, orgId)];
  if (status) conditions.push(eq(hrEmployees.status, status));
  if (department) conditions.push(eq(hrEmployees.department, department));
  if (is_saudi === "true") conditions.push(eq(hrEmployees.isSaudi, true));
  if (is_saudi === "false") conditions.push(eq(hrEmployees.isSaudi, false));
  if (search) {
    conditions.push(
      or(
        ilike(hrEmployees.fullName, `%${search}%`),
        ilike(hrEmployees.employeeNumber, `%${search}%`),
        ilike(hrEmployees.phone, `%${search}%`),
      )!,
    );
  }

  const where = and(...conditions);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(hrEmployees).where(where).orderBy(desc(hrEmployees.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(hrEmployees).where(where),
  ]);

  return c.json({ data: rows, pagination: { page: pageNum, limit: limitNum, total: count } });
});

hrRouter.get("/employees/stats", async (c) => {
  const orgId = getOrgId(c);
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`sum(case when status='active' then 1 else 0 end)::int`,
      onLeave: sql<number>`sum(case when status='on_leave' then 1 else 0 end)::int`,
      terminated: sql<number>`sum(case when status='terminated' then 1 else 0 end)::int`,
      saudis: sql<number>`sum(case when is_saudi=true then 1 else 0 end)::int`,
      nonSaudis: sql<number>`sum(case when is_saudi=false then 1 else 0 end)::int`,
      totalBasicSalary: sql<number>`coalesce(sum(basic_salary),0)::numeric`,
    })
    .from(hrEmployees)
    .where(and(eq(hrEmployees.orgId, orgId), ne(hrEmployees.status, "terminated")));

  const saudis = stats.saudis ?? 0;
  const nonSaudis = stats.nonSaudis ?? 0;
  const total = saudis + nonSaudis;
  const saudizationRate = total > 0 ? Math.round((saudis / total) * 100) : 0;

  return c.json({
    data: {
      ...stats,
      saudizationRate,
    },
  });
});

hrRouter.get("/employees/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const [emp] = await db
    .select()
    .from(hrEmployees)
    .where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, orgId)));
  if (!emp) return c.json({ error: "الموظف غير موجود" }, 404);
  return c.json({ data: emp });
});

hrRouter.post("/employees", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();

  const employeeNumber = await nextEmployeeNumber(orgId);
  const [emp] = await db
    .insert(hrEmployees)
    .values({
      orgId,
      employeeNumber,
      fullName: body.fullName,
      fullNameEn: body.fullNameEn,
      nationalId: body.nationalId,
      nationality: body.nationality ?? "SA",
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      phone: body.phone,
      email: body.email,
      address: body.address,
      jobTitle: body.jobTitle,
      department: body.department,
      employmentType: body.employmentType ?? "full_time",
      status: "active",
      hireDate: body.hireDate,
      basicSalary: body.basicSalary ?? "0",
      housingAllowance: body.housingAllowance ?? "0",
      transportAllowance: body.transportAllowance ?? "0",
      otherAllowances: body.otherAllowances,
      bankName: body.bankName,
      iban: body.iban,
      gosiNumber: body.gosiNumber,
      gosiEligible: body.gosiEligible ?? true,
      isSaudi: body.isSaudi ?? false,
      payrollDay: body.payrollDay ?? 28,
      managerId: body.managerId,
      userId: body.userId,
      notes: body.notes,
    })
    .returning();

  insertAuditLog({ orgId, userId, action: "created", resource: "hr_employee", resourceId: emp.id });
  return c.json({ data: emp }, 201);
});

hrRouter.put("/employees/:id", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body = await c.req.json();

  const [existing] = await db.select().from(hrEmployees).where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, orgId)));
  if (!existing) return c.json({ error: "الموظف غير موجود" }, 404);

  const [emp] = await db
    .update(hrEmployees)
    .set({
      fullName: body.fullName ?? existing.fullName,
      fullNameEn: body.fullNameEn ?? existing.fullNameEn,
      nationalId: body.nationalId ?? existing.nationalId,
      nationality: body.nationality ?? existing.nationality,
      dateOfBirth: body.dateOfBirth ?? existing.dateOfBirth,
      gender: body.gender ?? existing.gender,
      phone: body.phone ?? existing.phone,
      email: body.email ?? existing.email,
      address: body.address ?? existing.address,
      jobTitle: body.jobTitle ?? existing.jobTitle,
      department: body.department ?? existing.department,
      employmentType: body.employmentType ?? existing.employmentType,
      status: body.status ?? existing.status,
      hireDate: body.hireDate ?? existing.hireDate,
      terminationDate: body.terminationDate ?? existing.terminationDate,
      terminationReason: body.terminationReason ?? existing.terminationReason,
      basicSalary: body.basicSalary ?? existing.basicSalary,
      housingAllowance: body.housingAllowance ?? existing.housingAllowance,
      transportAllowance: body.transportAllowance ?? existing.transportAllowance,
      otherAllowances: body.otherAllowances ?? existing.otherAllowances,
      bankName: body.bankName ?? existing.bankName,
      iban: body.iban ?? existing.iban,
      gosiNumber: body.gosiNumber ?? existing.gosiNumber,
      gosiEligible: body.gosiEligible ?? existing.gosiEligible,
      isSaudi: body.isSaudi ?? existing.isSaudi,
      payrollDay: body.payrollDay ?? existing.payrollDay,
      managerId: body.managerId ?? existing.managerId,
      notes: body.notes ?? existing.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, orgId)))
    .returning();

  insertAuditLog({ orgId, userId, action: "updated", resource: "hr_employee", resourceId: id });
  return c.json({ data: emp });
});

hrRouter.delete("/employees/:id", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  const [emp] = await db
    .update(hrEmployees)
    .set({
      status: "terminated",
      terminationDate: body.terminationDate ?? new Date().toISOString().split("T")[0],
      terminationReason: body.terminationReason ?? "other",
      updatedAt: new Date(),
    })
    .where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, orgId)))
    .returning();

  if (!emp) return c.json({ error: "الموظف غير موجود" }, 404);
  insertAuditLog({ orgId, userId, action: "deleted", resource: "hr_employee", resourceId: id });
  return c.json({ data: emp });
});

hrRouter.get("/employees/:id/payslips", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const items = await db
    .select({
      item: hrPayrollItems,
      payroll: {
        id: hrPayroll.id,
        payrollNumber: hrPayroll.payrollNumber,
        payrollMonth: hrPayroll.payrollMonth,
        payrollDate: hrPayroll.payrollDate,
        status: hrPayroll.status,
      },
    })
    .from(hrPayrollItems)
    .innerJoin(hrPayroll, eq(hrPayrollItems.payrollId, hrPayroll.id))
    .where(and(eq(hrPayrollItems.employeeId, id), eq(hrPayrollItems.orgId, orgId)))
    .orderBy(desc(hrPayroll.payrollMonth));
  return c.json({ data: items });
});

hrRouter.get("/employees/:id/gratuity-calc", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const { reason = "fired" } = c.req.query();

  const [emp] = await db.select().from(hrEmployees).where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, orgId)));
  if (!emp) return c.json({ error: "الموظف غير موجود" }, 404);

  const years = calcYearsOfService(emp.hireDate);
  const gratuity = calcGratuity(
    Number(emp.basicSalary),
    emp.hireDate,
    reason as "fired" | "resigned" | "end_of_contract",
  );
  return c.json({
    data: {
      employeeId: id,
      fullName: emp.fullName,
      hireDate: emp.hireDate,
      yearsOfService: Math.round(years * 100) / 100,
      basicSalary: emp.basicSalary,
      gratuityAmount: gratuity,
      reason,
    },
  });
});

// ─────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────

hrRouter.get("/employees/:id/documents", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const docs = await db
    .select()
    .from(hrEmployeeDocuments)
    .where(and(eq(hrEmployeeDocuments.employeeId, id), eq(hrEmployeeDocuments.orgId, orgId)))
    .orderBy(asc(hrEmployeeDocuments.expiryDate));
  return c.json({ data: docs });
});

hrRouter.post("/employees/:id/documents", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const body = await c.req.json();
  const [doc] = await db
    .insert(hrEmployeeDocuments)
    .values({
      orgId,
      employeeId: id,
      documentType: body.documentType,
      documentName: body.documentName,
      documentNumber: body.documentNumber,
      issueDate: body.issueDate,
      expiryDate: body.expiryDate,
      fileUrl: body.fileUrl,
      isVerified: body.isVerified ?? false,
      reminderDays: body.reminderDays ?? 60,
      notes: body.notes,
    })
    .returning();
  return c.json({ data: doc }, 201);
});

hrRouter.put("/documents/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const body = await c.req.json();
  const [doc] = await db
    .update(hrEmployeeDocuments)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(hrEmployeeDocuments.id, id), eq(hrEmployeeDocuments.orgId, orgId)))
    .returning();
  if (!doc) return c.json({ error: "الوثيقة غير موجودة" }, 404);
  return c.json({ data: doc });
});

hrRouter.delete("/documents/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const [doc] = await db
    .delete(hrEmployeeDocuments)
    .where(and(eq(hrEmployeeDocuments.id, id), eq(hrEmployeeDocuments.orgId, orgId)))
    .returning();
  if (!doc) return c.json({ error: "الوثيقة غير موجودة" }, 404);
  return c.json({ success: true });
});

hrRouter.get("/documents/expiring", async (c) => {
  const orgId = getOrgId(c);
  const days = parseInt(c.req.query("days") ?? "90");
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const docs = await db
    .select({
      doc: hrEmployeeDocuments,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
      },
    })
    .from(hrEmployeeDocuments)
    .innerJoin(hrEmployees, eq(hrEmployeeDocuments.employeeId, hrEmployees.id))
    .where(
      and(
        eq(hrEmployeeDocuments.orgId, orgId),
        lte(hrEmployeeDocuments.expiryDate, futureDate.toISOString().split("T")[0]),
        gte(hrEmployeeDocuments.expiryDate, new Date().toISOString().split("T")[0]),
      ),
    )
    .orderBy(asc(hrEmployeeDocuments.expiryDate));
  return c.json({ data: docs });
});

// ─────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────

hrRouter.get("/attendance", async (c) => {
  const orgId = getOrgId(c);
  const { employee_id, date, month, status, page = "1", limit = "50" } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 200);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(hrAttendance.orgId, orgId)];
  if (employee_id) conditions.push(eq(hrAttendance.employeeId, employee_id));
  if (date) conditions.push(eq(hrAttendance.attendanceDate, date));
  if (month) {
    conditions.push(
      and(
        gte(hrAttendance.attendanceDate, `${month}-01`),
        lte(hrAttendance.attendanceDate, `${month}-31`),
      )!,
    );
  }
  if (status) conditions.push(eq(hrAttendance.status, status));

  const rows = await db
    .select({
      att: hrAttendance,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
        department: hrEmployees.department,
      },
    })
    .from(hrAttendance)
    .innerJoin(hrEmployees, eq(hrAttendance.employeeId, hrEmployees.id))
    .where(and(...conditions))
    .orderBy(desc(hrAttendance.attendanceDate))
    .limit(limitNum)
    .offset(offset);

  return c.json({ data: rows });
});

hrRouter.get("/attendance/today", async (c) => {
  const orgId = getOrgId(c);
  const today = new Date().toISOString().split("T")[0];
  const rows = await db
    .select({
      att: hrAttendance,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
        department: hrEmployees.department,
      },
    })
    .from(hrAttendance)
    .innerJoin(hrEmployees, eq(hrAttendance.employeeId, hrEmployees.id))
    .where(and(eq(hrAttendance.orgId, orgId), eq(hrAttendance.attendanceDate, today)));
  return c.json({ data: rows, date: today });
});

hrRouter.get("/attendance/summary/:month", async (c) => {
  const orgId = getOrgId(c);
  const { month } = c.req.param();
  const [summary] = await db
    .select({
      present: sql<number>`sum(case when status='present' then 1 else 0 end)::int`,
      absent: sql<number>`sum(case when status='absent' then 1 else 0 end)::int`,
      late: sql<number>`sum(case when status='late' then 1 else 0 end)::int`,
      halfDay: sql<number>`sum(case when status='half_day' then 1 else 0 end)::int`,
      onLeave: sql<number>`sum(case when status='on_leave' then 1 else 0 end)::int`,
      totalOvertimeMinutes: sql<number>`coalesce(sum(overtime_minutes),0)::int`,
      totalLateMinutes: sql<number>`coalesce(sum(late_minutes),0)::int`,
    })
    .from(hrAttendance)
    .where(
      and(
        eq(hrAttendance.orgId, orgId),
        gte(hrAttendance.attendanceDate, `${month}-01`),
        lte(hrAttendance.attendanceDate, `${month}-31`),
      ),
    );
  return c.json({ data: summary, month });
});

hrRouter.post("/attendance", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const [att] = await db
    .insert(hrAttendance)
    .values({
      orgId,
      employeeId: body.employeeId,
      attendanceDate: body.attendanceDate,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      status: body.status ?? "present",
      lateMinutes: body.lateMinutes ?? 0,
      overtimeMinutes: body.overtimeMinutes ?? 0,
      source: body.source ?? "manual",
      zktecDeviceId: body.zktecDeviceId,
      notes: body.notes,
    })
    .onConflictDoUpdate({
      target: [hrAttendance.orgId, hrAttendance.employeeId, hrAttendance.attendanceDate],
      set: {
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        status: body.status ?? "present",
        lateMinutes: body.lateMinutes ?? 0,
        overtimeMinutes: body.overtimeMinutes ?? 0,
        source: body.source ?? "manual",
        updatedAt: new Date(),
      },
    })
    .returning();
  return c.json({ data: att }, 201);
});

hrRouter.put("/attendance/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const body = await c.req.json();
  const [att] = await db
    .update(hrAttendance)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(hrAttendance.id, id), eq(hrAttendance.orgId, orgId)))
    .returning();
  if (!att) return c.json({ error: "السجل غير موجود" }, 404);
  return c.json({ data: att });
});

hrRouter.delete("/attendance/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const [att] = await db
    .delete(hrAttendance)
    .where(and(eq(hrAttendance.id, id), eq(hrAttendance.orgId, orgId)))
    .returning();
  if (!att) return c.json({ error: "السجل غير موجود" }, 404);
  return c.json({ success: true });
});

hrRouter.post("/attendance/bulk", async (c) => {
  const orgId = getOrgId(c);
  const { records } = await c.req.json();
  if (!Array.isArray(records) || records.length === 0) {
    return c.json({ error: "لا توجد سجلات" }, 400);
  }
  const values = records.map((r: any) => ({
    orgId,
    employeeId: r.employeeId,
    attendanceDate: r.attendanceDate,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    status: r.status ?? "present",
    lateMinutes: r.lateMinutes ?? 0,
    overtimeMinutes: r.overtimeMinutes ?? 0,
    source: r.source ?? "zkteco",
    zktecDeviceId: r.zktecDeviceId,
  }));
  await db.insert(hrAttendance).values(values).onConflictDoNothing();
  return c.json({ success: true, count: values.length });
});

// ─────────────────────────────────────────────────────────────
// LEAVES
// ─────────────────────────────────────────────────────────────

hrRouter.get("/leaves", async (c) => {
  const orgId = getOrgId(c);
  const { employee_id, status, leave_type, page = "1", limit = "20" } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(hrLeaves.orgId, orgId)];
  if (employee_id) conditions.push(eq(hrLeaves.employeeId, employee_id));
  if (status) conditions.push(eq(hrLeaves.status, status));
  if (leave_type) conditions.push(eq(hrLeaves.leaveType, leave_type));

  const rows = await db
    .select({
      leave: hrLeaves,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
        department: hrEmployees.department,
      },
    })
    .from(hrLeaves)
    .innerJoin(hrEmployees, eq(hrLeaves.employeeId, hrEmployees.id))
    .where(and(...conditions))
    .orderBy(desc(hrLeaves.createdAt))
    .limit(limitNum)
    .offset(offset);

  return c.json({ data: rows });
});

hrRouter.post("/leaves", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  const [emp] = await db.select().from(hrEmployees).where(and(eq(hrEmployees.id, body.employeeId), eq(hrEmployees.orgId, orgId)));
  if (!emp) return c.json({ error: "الموظف غير موجود" }, 404);

  if (body.leaveType === "hajj") {
    const years = calcYearsOfService(emp.hireDate);
    if (years < 2) return c.json({ error: "يجب اكتمال سنتان متصلتان من الخدمة لإجازة الحج" }, 400);
    const hadHajj = await db.select().from(hrLeaves).where(
      and(eq(hrLeaves.employeeId, body.employeeId), eq(hrLeaves.leaveType, "hajj"), eq(hrLeaves.status, "approved")),
    );
    if (hadHajj.length > 0) return c.json({ error: "إجازة الحج ممنوحة مرة واحدة فقط طوال فترة الخدمة" }, 400);
  }

  const [leave] = await db
    .insert(hrLeaves)
    .values({
      orgId,
      employeeId: body.employeeId,
      leaveType: body.leaveType,
      startDate: body.startDate,
      endDate: body.endDate,
      daysCount: body.daysCount,
      status: "pending",
      reason: body.reason,
    })
    .returning();
  return c.json({ data: leave }, 201);
});

hrRouter.put("/leaves/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const body = await c.req.json();
  const [leave] = await db
    .update(hrLeaves)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(hrLeaves.id, id), eq(hrLeaves.orgId, orgId)))
    .returning();
  if (!leave) return c.json({ error: "الطلب غير موجود" }, 404);
  return c.json({ data: leave });
});

hrRouter.post("/leaves/:id/approve", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const [leave] = await db
    .update(hrLeaves)
    .set({ status: "approved", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(hrLeaves.id, id), eq(hrLeaves.orgId, orgId)))
    .returning();
  if (!leave) return c.json({ error: "الطلب غير موجود" }, 404);

  // تحديث رصيد الإجازة
  const year = new Date(leave.startDate).getFullYear();
  await db
    .insert(hrLeaveBalances)
    .values({
      orgId,
      employeeId: leave.employeeId,
      year,
      leaveType: leave.leaveType,
      entitledDays: 0,
      usedDays: leave.daysCount,
      remainingDays: 0,
    })
    .onConflictDoUpdate({
      target: [hrLeaveBalances.orgId, hrLeaveBalances.employeeId, hrLeaveBalances.year, hrLeaveBalances.leaveType],
      set: {
        usedDays: sql`hr_leave_balances.used_days + ${leave.daysCount}`,
        remainingDays: sql`hr_leave_balances.entitled_days - (hr_leave_balances.used_days + ${leave.daysCount})`,
        updatedAt: new Date(),
      },
    });

  insertAuditLog({ orgId, userId, action: "approved", resource: "hr_leave", resourceId: id });
  return c.json({ data: leave });
});

hrRouter.post("/leaves/:id/reject", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const { rejectionReason } = await c.req.json();
  const [leave] = await db
    .update(hrLeaves)
    .set({ status: "rejected", rejectionReason, updatedAt: new Date() })
    .where(and(eq(hrLeaves.id, id), eq(hrLeaves.orgId, orgId)))
    .returning();
  if (!leave) return c.json({ error: "الطلب غير موجود" }, 404);
  insertAuditLog({ orgId, userId, action: "rejected", resource: "hr_leave", resourceId: id });
  return c.json({ data: leave });
});

hrRouter.get("/employees/:id/leave-balance", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const year = parseInt(c.req.query("year") ?? String(new Date().getFullYear()));
  const balances = await db
    .select()
    .from(hrLeaveBalances)
    .where(and(eq(hrLeaveBalances.employeeId, id), eq(hrLeaveBalances.orgId, orgId), eq(hrLeaveBalances.year, year)));
  return c.json({ data: balances, year });
});

// ─────────────────────────────────────────────────────────────
// LOANS
// ─────────────────────────────────────────────────────────────

hrRouter.get("/loans", async (c) => {
  const orgId = getOrgId(c);
  const { employee_id, status, approval_status, page = "1", limit = "20" } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(hrLoans.orgId, orgId)];
  if (employee_id) conditions.push(eq(hrLoans.employeeId, employee_id));
  if (status) conditions.push(eq(hrLoans.status, status));
  if (approval_status) conditions.push(eq(hrLoans.approvalStatus, approval_status));

  const rows = await db
    .select({
      loan: hrLoans,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
      },
    })
    .from(hrLoans)
    .innerJoin(hrEmployees, eq(hrLoans.employeeId, hrEmployees.id))
    .where(and(...conditions))
    .orderBy(desc(hrLoans.createdAt))
    .limit(limitNum)
    .offset(offset);

  return c.json({ data: rows });
});

hrRouter.get("/employees/:id/loans", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const loans = await db.select().from(hrLoans).where(and(eq(hrLoans.employeeId, id), eq(hrLoans.orgId, orgId))).orderBy(desc(hrLoans.createdAt));
  return c.json({ data: loans });
});

hrRouter.post("/loans", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  const loanNumber = await nextLoanNumber(orgId);
  const totalInstallments = body.totalInstallments ?? 1;
  const installmentAmount = Math.round((Number(body.amount) / totalInstallments) * 100) / 100;

  const [loan] = await db
    .insert(hrLoans)
    .values({
      orgId,
      employeeId: body.employeeId,
      loanNumber,
      amount: body.amount,
      purpose: body.purpose,
      approvalStatus: "pending",
      totalInstallments,
      installmentAmount: String(installmentAmount),
      startMonth: body.startMonth,
      notes: body.notes,
    })
    .returning();

  // توليد أقساط
  if (body.startMonth) {
    const installments = [];
    const [year, month] = body.startMonth.split("-").map(Number);
    for (let i = 0; i < totalInstallments; i++) {
      const d = new Date(year, month - 1 + i, 1);
      const dueMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      installments.push({
        orgId,
        loanId: loan.id,
        employeeId: body.employeeId,
        installmentNumber: i + 1,
        dueMonth,
        amount: String(installmentAmount),
        status: "pending",
      });
    }
    if (installments.length > 0) await db.insert(hrLoanInstallments).values(installments);
  }

  return c.json({ data: loan }, 201);
});

hrRouter.post("/loans/:id/approve", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();

  const [loan] = await db
    .update(hrLoans)
    .set({ approvalStatus: "approved", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(hrLoans.id, id), eq(hrLoans.orgId, orgId)))
    .returning();
  if (!loan) return c.json({ error: "السلفة غير موجودة" }, 404);

  const [emp] = await db.select({ fullName: hrEmployees.fullName }).from(hrEmployees).where(eq(hrEmployees.id, loan.employeeId));
  await autoJournal.loanApproved({
    orgId,
    loanId: loan.id,
    loanNumber: loan.loanNumber,
    amount: Number(loan.amount),
    employeeName: emp?.fullName ?? "",
  });

  insertAuditLog({ orgId, userId, action: "approved", resource: "hr_loan", resourceId: id });
  return c.json({ data: loan });
});

hrRouter.post("/loans/:id/reject", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));
  const [loan] = await db
    .update(hrLoans)
    .set({ approvalStatus: "rejected", updatedAt: new Date() })
    .where(and(eq(hrLoans.id, id), eq(hrLoans.orgId, orgId)))
    .returning();
  if (!loan) return c.json({ error: "السلفة غير موجودة" }, 404);
  insertAuditLog({ orgId, userId, action: "rejected", resource: "hr_loan", resourceId: id });
  return c.json({ data: loan });
});

hrRouter.get("/loans/:id/installments", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const installments = await db
    .select()
    .from(hrLoanInstallments)
    .where(and(eq(hrLoanInstallments.loanId, id), eq(hrLoanInstallments.orgId, orgId)))
    .orderBy(asc(hrLoanInstallments.installmentNumber));
  return c.json({ data: installments });
});

// ─────────────────────────────────────────────────────────────
// DEDUCTIONS
// ─────────────────────────────────────────────────────────────

hrRouter.get("/deductions", async (c) => {
  const orgId = getOrgId(c);
  const { employee_id, month, status } = c.req.query();
  const conditions = [eq(hrDeductions.orgId, orgId)];
  if (employee_id) conditions.push(eq(hrDeductions.employeeId, employee_id));
  if (month) conditions.push(eq(hrDeductions.deductionMonth, month));
  if (status) conditions.push(eq(hrDeductions.status, status));

  const rows = await db
    .select({
      deduction: hrDeductions,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
      },
    })
    .from(hrDeductions)
    .innerJoin(hrEmployees, eq(hrDeductions.employeeId, hrEmployees.id))
    .where(and(...conditions))
    .orderBy(desc(hrDeductions.createdAt));

  return c.json({ data: rows });
});

hrRouter.post("/deductions", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();
  const [ded] = await db
    .insert(hrDeductions)
    .values({
      orgId,
      employeeId: body.employeeId,
      deductionType: body.deductionType,
      description: body.description,
      amount: body.amount,
      deductionMonth: body.deductionMonth,
      status: "pending",
      createdBy: userId,
    })
    .returning();
  return c.json({ data: ded }, 201);
});

hrRouter.put("/deductions/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const body = await c.req.json();
  const [ded] = await db
    .update(hrDeductions)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(hrDeductions.id, id), eq(hrDeductions.orgId, orgId)))
    .returning();
  if (!ded) return c.json({ error: "الخصم غير موجود" }, 404);
  return c.json({ data: ded });
});

hrRouter.delete("/deductions/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const [existing] = await db.select().from(hrDeductions).where(and(eq(hrDeductions.id, id), eq(hrDeductions.orgId, orgId)));
  if (!existing) return c.json({ error: "الخصم غير موجود" }, 404);
  if (existing.status !== "pending") return c.json({ error: "لا يمكن حذف خصم مطبق" }, 400);
  await db.delete(hrDeductions).where(eq(hrDeductions.id, id));
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────────────────
// PAYROLL
// ─────────────────────────────────────────────────────────────

hrRouter.get("/payroll", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select()
    .from(hrPayroll)
    .where(eq(hrPayroll.orgId, orgId))
    .orderBy(desc(hrPayroll.payrollMonth));
  return c.json({ data: rows });
});

hrRouter.get("/payroll/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const [payroll] = await db.select().from(hrPayroll).where(and(eq(hrPayroll.id, id), eq(hrPayroll.orgId, orgId)));
  if (!payroll) return c.json({ error: "الكشف غير موجود" }, 404);

  const items = await db
    .select({
      item: hrPayrollItems,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
        department: hrEmployees.department,
        jobTitle: hrEmployees.jobTitle,
      },
    })
    .from(hrPayrollItems)
    .innerJoin(hrEmployees, eq(hrPayrollItems.employeeId, hrEmployees.id))
    .where(and(eq(hrPayrollItems.payrollId, id), eq(hrPayrollItems.orgId, orgId)));

  return c.json({ data: { ...payroll, items } });
});

hrRouter.post("/payroll/generate", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();
  const { month, payrollDate } = body;
  if (!month) return c.json({ error: "الشهر مطلوب (YYYY-MM)" }, 400);

  // تحقق من عدم وجود كشف لنفس الشهر
  const existing = await db.select().from(hrPayroll).where(and(eq(hrPayroll.orgId, orgId), eq(hrPayroll.payrollMonth, month)));
  if (existing.length > 0) return c.json({ error: `كشف راتب شهر ${month} موجود مسبقاً` }, 400);

  // جلب الموظفين النشطين
  const employees = await db
    .select()
    .from(hrEmployees)
    .where(and(eq(hrEmployees.orgId, orgId), eq(hrEmployees.status, "active")));

  if (employees.length === 0) return c.json({ error: "لا يوجد موظفون نشطون" }, 400);

  // جلب سجلات الحضور لهذا الشهر
  const attendanceRecords = await db
    .select()
    .from(hrAttendance)
    .where(
      and(
        eq(hrAttendance.orgId, orgId),
        gte(hrAttendance.attendanceDate, `${month}-01`),
        lte(hrAttendance.attendanceDate, `${month}-31`),
      ),
    );

  // جلب الخصومات المعلقة
  const pendingDeductions = await db
    .select()
    .from(hrDeductions)
    .where(and(eq(hrDeductions.orgId, orgId), eq(hrDeductions.deductionMonth, month), eq(hrDeductions.status, "pending")));

  // جلب أقساط السلف لهذا الشهر
  const loanInstallmentsDue = await db
    .select()
    .from(hrLoanInstallments)
    .where(and(eq(hrLoanInstallments.orgId, orgId), eq(hrLoanInstallments.dueMonth, month), eq(hrLoanInstallments.status, "pending")));

  const payrollNumber = await nextPayrollNumber(orgId, month);
  const date = payrollDate ?? `${month}-28`;

  // احتساب بنود الرواتب
  const itemsToInsert = employees.map((emp) => {
    const empAttendance = attendanceRecords.filter((a) => a.employeeId === emp.id);
    const absentDays = empAttendance.filter((a) => a.status === "absent").length;
    const lateDays = empAttendance.filter((a) => a.status === "late").length;
    const totalOvertimeMinutes = empAttendance.reduce((acc, a) => acc + (a.overtimeMinutes ?? 0), 0);
    const totalLateMinutes = empAttendance.reduce((acc, a) => acc + (a.lateMinutes ?? 0), 0);
    const workingDays = empAttendance.filter((a) => ["present", "late", "half_day"].includes(a.status)).length;

    const basic = Number(emp.basicSalary);
    const housing = Number(emp.housingAllowance ?? 0);
    const transport = Number(emp.transportAllowance ?? 0);

    // خصم الغياب: يوم عمل / 30 يوم
    const dailySalary = basic / 30;
    const absenceDeduction = Math.round(absentDays * dailySalary * 100) / 100;

    // خصم التأخير: كل 30 دقيقة = نصف يوم
    const lateDeduction = Math.round((totalLateMinutes / 60 / 8) * dailySalary * 100) / 100;

    // أوفرتايم: أجر العمل الإضافي 1.5x
    const hourlyRate = basic / 30 / 8;
    const overtimeAmount = Math.round(totalOvertimeMinutes / 60 * hourlyRate * 1.5 * 100) / 100;

    // خصومات مباشرة
    const empDirectDeductions = pendingDeductions.filter((d) => d.employeeId === emp.id);
    const directDeductions = empDirectDeductions.reduce((acc, d) => acc + Number(d.amount), 0);

    // خصومات السلف
    const empLoanInstallments = loanInstallmentsDue.filter((i) => i.employeeId === emp.id);
    const loansDeduction = empLoanInstallments.reduce((acc, i) => acc + Number(i.amount), 0);

    // GOSI
    const gosi = emp.gosiEligible ? calcGosi(basic, emp.isSaudi ?? false) : { employee: 0, employer: 0 };

    // مخصص مكافأة نهاية الخدمة
    const gratuityProvision = calcGratuityMonthlyProvision(basic, emp.hireDate);

    const totalAllowances = housing + transport;
    const totalDeductions = absenceDeduction + lateDeduction + directDeductions + gosi.employee;
    const netSalary = Math.max(0,
      basic + totalAllowances + overtimeAmount - totalDeductions - loansDeduction,
    );

    return {
      orgId,
      employeeId: emp.id,
      basicSalary: String(basic),
      housingAllowance: String(housing),
      transportAllowance: String(transport),
      overtimeAmount: String(overtimeAmount),
      additionsAmount: "0",
      absenceDeduction: String(absenceDeduction),
      lateDeduction: String(lateDeduction),
      loansDeduction: String(loansDeduction),
      directDeductions: String(directDeductions),
      gosiEmployee: String(gosi.employee),
      gosiEmployer: String(gosi.employer),
      gratuityProvision: String(gratuityProvision),
      netSalary: String(netSalary),
      workingDays,
      absentDays,
      lateDays,
      overtimeHours: String(Math.round(totalOvertimeMinutes / 60 * 100) / 100),
      status: "included",
      _empDirectDeductionIds: empDirectDeductions.map((d) => d.id),
      _empLoanInstallmentIds: empLoanInstallments.map((i) => i.id),
    };
  });

  const totalBasic = itemsToInsert.reduce((acc, i) => acc + Number(i.basicSalary), 0);
  const totalAllowances = itemsToInsert.reduce((acc, i) => acc + Number(i.housingAllowance) + Number(i.transportAllowance), 0);
  const totalAdditions = itemsToInsert.reduce((acc, i) => acc + Number(i.overtimeAmount) + Number(i.additionsAmount), 0);
  const totalDeductions = itemsToInsert.reduce((acc, i) => acc + Number(i.absenceDeduction) + Number(i.lateDeduction) + Number(i.directDeductions) + Number(i.gosiEmployee), 0);
  const totalLoans = itemsToInsert.reduce((acc, i) => acc + Number(i.loansDeduction), 0);
  const totalGosiEmployee = itemsToInsert.reduce((acc, i) => acc + Number(i.gosiEmployee), 0);
  const totalGosiEmployer = itemsToInsert.reduce((acc, i) => acc + Number(i.gosiEmployer), 0);
  const totalNet = itemsToInsert.reduce((acc, i) => acc + Number(i.netSalary), 0);
  const totalGratuityProvision = itemsToInsert.reduce((acc, i) => acc + Number(i.gratuityProvision), 0);

  const [payrollRecord] = await db
    .insert(hrPayroll)
    .values({
      orgId,
      payrollNumber,
      payrollMonth: month,
      payrollDate: date,
      status: "draft",
      totalBasic: String(Math.round(totalBasic * 100) / 100),
      totalAllowances: String(Math.round(totalAllowances * 100) / 100),
      totalAdditions: String(Math.round(totalAdditions * 100) / 100),
      totalDeductions: String(Math.round(totalDeductions * 100) / 100),
      totalLoans: String(Math.round(totalLoans * 100) / 100),
      totalGosiEmployee: String(Math.round(totalGosiEmployee * 100) / 100),
      totalGosiEmployer: String(Math.round(totalGosiEmployer * 100) / 100),
      totalNet: String(Math.round(totalNet * 100) / 100),
      totalGratuityProvision: String(Math.round(totalGratuityProvision * 100) / 100),
    })
    .returning();

  const cleanItems = itemsToInsert.map(({ _empDirectDeductionIds, _empLoanInstallmentIds, ...item }) => ({
    ...item,
    payrollId: payrollRecord.id,
  }));
  await db.insert(hrPayrollItems).values(cleanItems);

  insertAuditLog({ orgId, userId, action: "created", resource: "hr_payroll", resourceId: payrollRecord.id });
  return c.json({ data: payrollRecord }, 201);
});

hrRouter.post("/payroll/:id/approve", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const [payroll] = await db
    .update(hrPayroll)
    .set({ status: "approved", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(hrPayroll.id, id), eq(hrPayroll.orgId, orgId), eq(hrPayroll.status, "draft")))
    .returning();
  if (!payroll) return c.json({ error: "الكشف غير موجود أو ليس في حالة مسودة" }, 404);
  insertAuditLog({ orgId, userId, action: "approved", resource: "hr_payroll", resourceId: id });
  return c.json({ data: payroll });
});

hrRouter.post("/payroll/:id/mark-paid", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  const [payroll] = await db
    .update(hrPayroll)
    .set({ status: "paid", paidAt: new Date(), paymentMethod: body.paymentMethod ?? "bank_transfer", updatedAt: new Date() })
    .where(and(eq(hrPayroll.id, id), eq(hrPayroll.orgId, orgId), eq(hrPayroll.status, "approved")))
    .returning();
  if (!payroll) return c.json({ error: "الكشف غير موجود أو لم يتم الاعتماد بعد" }, 404);

  // تحديث حالة الخصومات والأقساط
  await db
    .update(hrDeductions)
    .set({ status: "applied", payrollId: id, updatedAt: new Date() })
    .where(and(eq(hrDeductions.orgId, orgId), eq(hrDeductions.deductionMonth, payroll.payrollMonth), eq(hrDeductions.status, "pending")));

  await db
    .update(hrLoanInstallments)
    .set({ status: "deducted", payrollId: id, deductedAt: new Date() })
    .where(and(eq(hrLoanInstallments.orgId, orgId), eq(hrLoanInstallments.dueMonth, payroll.payrollMonth), eq(hrLoanInstallments.status, "pending")));

  // قيد محاسبي
  await autoJournal.salaryPaid({
    orgId,
    payrollId: payroll.id,
    payrollNumber: payroll.payrollNumber,
    netAmount: Number(payroll.totalNet),
    month: payroll.payrollMonth,
  });

  await autoJournal.gosiExpense({
    orgId,
    payrollId: payroll.id,
    employerAmount: Number(payroll.totalGosiEmployer),
    month: payroll.payrollMonth,
  });

  insertAuditLog({ orgId, userId, action: "updated", resource: "hr_payroll", resourceId: id, metadata: { status: "paid" } });
  return c.json({ data: payroll });
});

hrRouter.get("/payroll/:id/slip/:employeeId", async (c) => {
  const orgId = getOrgId(c);
  const { id, employeeId } = c.req.param();

  const [payroll] = await db.select().from(hrPayroll).where(and(eq(hrPayroll.id, id), eq(hrPayroll.orgId, orgId)));
  if (!payroll) return c.json({ error: "الكشف غير موجود" }, 404);

  const [item] = await db
    .select({
      item: hrPayrollItems,
      employee: hrEmployees,
    })
    .from(hrPayrollItems)
    .innerJoin(hrEmployees, eq(hrPayrollItems.employeeId, hrEmployees.id))
    .where(and(eq(hrPayrollItems.payrollId, id), eq(hrPayrollItems.employeeId, employeeId), eq(hrPayrollItems.orgId, orgId)));

  if (!item) return c.json({ error: "البند غير موجود" }, 404);
  return c.json({ data: { payroll, ...item } });
});

// ─────────────────────────────────────────────────────────────
// GRATUITY SETTLE
// ─────────────────────────────────────────────────────────────

hrRouter.post("/employees/:id/settle-gratuity", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body = await c.req.json();

  const [emp] = await db.select().from(hrEmployees).where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, orgId)));
  if (!emp) return c.json({ error: "الموظف غير موجود" }, 404);

  const reason = body.reason ?? (emp.terminationReason as "fired" | "resigned" | "end_of_contract") ?? "fired";
  const gratuityAmount = body.amount ?? calcGratuity(Number(emp.basicSalary), emp.hireDate, reason);

  await autoJournal.gratuitySettled({
    orgId,
    employeeId: id,
    employeeName: emp.fullName,
    amount: gratuityAmount,
  });

  insertAuditLog({ orgId, userId, action: "updated", resource: "hr_employee", resourceId: id, metadata: { action: "settle_gratuity", amount: gratuityAmount } });
  return c.json({ data: { employeeId: id, gratuityAmount, settled: true } });
});

// ─────────────────────────────────────────────────────────────
// GOVERNMENT FEES
// ─────────────────────────────────────────────────────────────

hrRouter.get("/government-fees", async (c) => {
  const orgId = getOrgId(c);
  const { status, employee_id, fee_type } = c.req.query();
  const conditions = [eq(hrGovernmentFees.orgId, orgId)];
  if (status) conditions.push(eq(hrGovernmentFees.status, status));
  if (employee_id) conditions.push(eq(hrGovernmentFees.employeeId, employee_id));
  if (fee_type) conditions.push(eq(hrGovernmentFees.feeType, fee_type));

  const rows = await db
    .select({
      fee: hrGovernmentFees,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
        isSaudi: hrEmployees.isSaudi,
        nationality: hrEmployees.nationality,
      },
    })
    .from(hrGovernmentFees)
    .innerJoin(hrEmployees, eq(hrGovernmentFees.employeeId, hrEmployees.id))
    .where(and(...conditions))
    .orderBy(asc(hrGovernmentFees.dueDate));

  return c.json({ data: rows });
});

hrRouter.post("/government-fees", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const [fee] = await db
    .insert(hrGovernmentFees)
    .values({
      orgId,
      employeeId: body.employeeId,
      feeType: body.feeType,
      description: body.description,
      amount: body.amount,
      dueDate: body.dueDate,
      status: "upcoming",
      notes: body.notes,
    })
    .returning();
  return c.json({ data: fee }, 201);
});

hrRouter.put("/government-fees/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const body = await c.req.json();
  const [fee] = await db
    .update(hrGovernmentFees)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(hrGovernmentFees.id, id), eq(hrGovernmentFees.orgId, orgId)))
    .returning();
  if (!fee) return c.json({ error: "الرسم غير موجود" }, 404);
  return c.json({ data: fee });
});

hrRouter.post("/government-fees/:id/mark-paid", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();

  const [fee] = await db
    .update(hrGovernmentFees)
    .set({ status: "paid", paidDate: new Date().toISOString().split("T")[0], updatedAt: new Date() })
    .where(and(eq(hrGovernmentFees.id, id), eq(hrGovernmentFees.orgId, orgId)))
    .returning();
  if (!fee) return c.json({ error: "الرسم غير موجود" }, 404);

  const [emp] = await db.select({ fullName: hrEmployees.fullName }).from(hrEmployees).where(eq(hrEmployees.id, fee.employeeId));
  await autoJournal.govFeesPaid({
    orgId,
    feeId: fee.id,
    amount: Number(fee.amount),
    description: fee.description ?? `${fee.feeType} — ${emp?.fullName ?? ""}`,
  });

  insertAuditLog({ orgId, userId, action: "updated", resource: "hr_gov_fee", resourceId: id, metadata: { status: "paid" } });
  return c.json({ data: fee });
});

hrRouter.get("/government-fees/upcoming", async (c) => {
  const orgId = getOrgId(c);
  const days = parseInt(c.req.query("days") ?? "90");
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const rows = await db
    .select({
      fee: hrGovernmentFees,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
      },
    })
    .from(hrGovernmentFees)
    .innerJoin(hrEmployees, eq(hrGovernmentFees.employeeId, hrEmployees.id))
    .where(
      and(
        eq(hrGovernmentFees.orgId, orgId),
        eq(hrGovernmentFees.status, "upcoming"),
        lte(hrGovernmentFees.dueDate, futureDate.toISOString().split("T")[0]),
      ),
    )
    .orderBy(asc(hrGovernmentFees.dueDate));
  return c.json({ data: rows });
});

hrRouter.get("/government-fees/summary", async (c) => {
  const orgId = getOrgId(c);
  const [summary] = await db
    .select({
      totalUpcoming: sql<number>`sum(case when status='upcoming' then amount else 0 end)::numeric`,
      totalPaid: sql<number>`sum(case when status='paid' then amount else 0 end)::numeric`,
      totalOverdue: sql<number>`sum(case when status='overdue' then amount else 0 end)::numeric`,
      countUpcoming: sql<number>`sum(case when status='upcoming' then 1 else 0 end)::int`,
      countOverdue: sql<number>`sum(case when status='overdue' then 1 else 0 end)::int`,
    })
    .from(hrGovernmentFees)
    .where(eq(hrGovernmentFees.orgId, orgId));
  return c.json({ data: summary });
});

// ─────────────────────────────────────────────────────────────
// NITAQAT
// ─────────────────────────────────────────────────────────────

hrRouter.get("/nitaqat", async (c) => {
  const orgId = getOrgId(c);
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      saudis: sql<number>`sum(case when is_saudi=true then 1 else 0 end)::int`,
      nonSaudis: sql<number>`sum(case when is_saudi=false then 1 else 0 end)::int`,
    })
    .from(hrEmployees)
    .where(and(eq(hrEmployees.orgId, orgId), ne(hrEmployees.status, "terminated")));

  const total = stats.total ?? 0;
  const saudis = stats.saudis ?? 0;
  const nonSaudis = stats.nonSaudis ?? 0;
  const saudizationRate = total > 0 ? Math.round((saudis / total) * 100 * 100) / 100 : 0;

  // تصنيف نطاقات
  let band = "أحمر";
  let color = "red";
  if (saudizationRate >= 75) { band = "بلاتيني"; color = "platinum"; }
  else if (saudizationRate >= 50) { band = "أخضر عالي"; color = "green_high"; }
  else if (saudizationRate >= 35) { band = "أخضر"; color = "green"; }
  else if (saudizationRate >= 20) { band = "أصفر"; color = "yellow"; }

  // حساب levy التقريبي (500 ريال شهرياً لكل غير سعودي زائد)
  const requiredSaudis = Math.ceil(total * 0.35);
  const levyCount = Math.max(0, nonSaudis - (total - requiredSaudis));
  const monthlyLevy = levyCount * 500;

  return c.json({
    data: {
      total,
      saudis,
      nonSaudis,
      saudizationRate,
      band,
      color,
      monthlyLevy,
      levyCount,
      requiredSaudis,
    },
  });
});

// ─────────────────────────────────────────────────────────────
// PERFORMANCE
// ─────────────────────────────────────────────────────────────

hrRouter.get("/performance", async (c) => {
  const orgId = getOrgId(c);
  const { year, period, employee_id } = c.req.query();
  const conditions = [eq(hrPerformanceReviews.orgId, orgId)];
  if (year) conditions.push(eq(hrPerformanceReviews.reviewYear, parseInt(year)));
  if (period) conditions.push(eq(hrPerformanceReviews.reviewPeriod, period));
  if (employee_id) conditions.push(eq(hrPerformanceReviews.employeeId, employee_id));

  const rows = await db
    .select({
      review: hrPerformanceReviews,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        employeeNumber: hrEmployees.employeeNumber,
        department: hrEmployees.department,
      },
    })
    .from(hrPerformanceReviews)
    .innerJoin(hrEmployees, eq(hrPerformanceReviews.employeeId, hrEmployees.id))
    .where(and(...conditions))
    .orderBy(desc(hrPerformanceReviews.createdAt));
  return c.json({ data: rows });
});

hrRouter.get("/employees/:id/performance", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const reviews = await db
    .select()
    .from(hrPerformanceReviews)
    .where(and(eq(hrPerformanceReviews.employeeId, id), eq(hrPerformanceReviews.orgId, orgId)))
    .orderBy(desc(hrPerformanceReviews.reviewYear), desc(hrPerformanceReviews.reviewPeriod));
  return c.json({ data: reviews });
});

hrRouter.post("/performance", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = await c.req.json();
  const [review] = await db
    .insert(hrPerformanceReviews)
    .values({
      orgId,
      employeeId: body.employeeId,
      reviewYear: body.reviewYear,
      reviewPeriod: body.reviewPeriod,
      reviewerId: userId,
      overallScore: body.overallScore,
      criteria: body.criteria,
      strengths: body.strengths,
      improvements: body.improvements,
      goalsNextPeriod: body.goalsNextPeriod,
      status: "draft",
    })
    .returning();
  return c.json({ data: review }, 201);
});

hrRouter.put("/performance/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const body = await c.req.json();
  const [review] = await db
    .update(hrPerformanceReviews)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(hrPerformanceReviews.id, id), eq(hrPerformanceReviews.orgId, orgId)))
    .returning();
  if (!review) return c.json({ error: "التقييم غير موجود" }, 404);
  return c.json({ data: review });
});

hrRouter.post("/performance/:id/submit", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const [review] = await db
    .update(hrPerformanceReviews)
    .set({ status: "submitted", updatedAt: new Date() })
    .where(and(eq(hrPerformanceReviews.id, id), eq(hrPerformanceReviews.orgId, orgId)))
    .returning();
  if (!review) return c.json({ error: "التقييم غير موجود" }, 404);
  return c.json({ data: review });
});

hrRouter.post("/performance/:id/acknowledge", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const [review] = await db
    .update(hrPerformanceReviews)
    .set({ status: "acknowledged", employeeAcknowledged: true, acknowledgedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(hrPerformanceReviews.id, id), eq(hrPerformanceReviews.orgId, orgId)))
    .returning();
  if (!review) return c.json({ error: "التقييم غير موجود" }, 404);
  return c.json({ data: review });
});

// ─────────────────────────────────────────────────────────────
// ZKTECO
// ─────────────────────────────────────────────────────────────

hrRouter.get("/zkteco/devices", async (c) => {
  const orgId = getOrgId(c);
  const devices = await db.select().from(hrZktecoDevices).where(eq(hrZktecoDevices.orgId, orgId));
  return c.json({ data: devices });
});

hrRouter.post("/zkteco/devices", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const [device] = await db
    .insert(hrZktecoDevices)
    .values({
      orgId,
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      deviceIp: body.deviceIp,
      status: "active",
    })
    .returning();
  return c.json({ data: device }, 201);
});

hrRouter.post("/zkteco/webhook", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { deviceId, records } = body;

  if (!Array.isArray(records)) return c.json({ error: "records مطلوب" }, 400);

  const values = records.map((r: any) => ({
    orgId,
    employeeId: r.employeeId,
    attendanceDate: r.date,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    status: "present" as const,
    source: "zkteco" as const,
    zktecDeviceId: deviceId,
  }));

  await db.insert(hrAttendance).values(values).onConflictDoNothing();

  // تحديث آخر مزامنة
  await db
    .update(hrZktecoDevices)
    .set({ lastSyncAt: new Date(), recordsSynced: records.length, updatedAt: new Date() })
    .where(and(eq(hrZktecoDevices.deviceId, deviceId), eq(hrZktecoDevices.orgId, orgId)));

  return c.json({ success: true, synced: records.length });
});

hrRouter.get("/zkteco/logs", async (c) => {
  const orgId = getOrgId(c);
  const { date } = c.req.query();
  const conditions = [eq(hrAttendance.orgId, orgId), eq(hrAttendance.source, "zkteco")];
  if (date) conditions.push(eq(hrAttendance.attendanceDate, date));

  const rows = await db
    .select()
    .from(hrAttendance)
    .where(and(...conditions))
    .orderBy(desc(hrAttendance.attendanceDate))
    .limit(100);
  return c.json({ data: rows });
});

// ─────────────────────────────────────────────────────────────
// WPS & GOSI REPORTS
// ─────────────────────────────────────────────────────────────

hrRouter.get("/wps/report/:month", async (c) => {
  const orgId = getOrgId(c);
  const { month } = c.req.param();

  const [payroll] = await db
    .select()
    .from(hrPayroll)
    .where(and(eq(hrPayroll.orgId, orgId), eq(hrPayroll.payrollMonth, month)));

  if (!payroll) return c.json({ error: "لا يوجد كشف راتب لهذا الشهر" }, 404);

  const items = await db
    .select({
      item: hrPayrollItems,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        nationalId: hrEmployees.nationalId,
        iban: hrEmployees.iban,
        bankName: hrEmployees.bankName,
        isSaudi: hrEmployees.isSaudi,
      },
    })
    .from(hrPayrollItems)
    .innerJoin(hrEmployees, eq(hrPayrollItems.employeeId, hrEmployees.id))
    .where(and(eq(hrPayrollItems.payrollId, payroll.id), eq(hrPayrollItems.orgId, orgId)));

  return c.json({
    data: {
      payroll,
      records: items,
      totalEmployees: items.length,
      totalAmount: payroll.totalNet,
      month,
    },
  });
});

hrRouter.get("/gosi/report/:month", async (c) => {
  const orgId = getOrgId(c);
  const { month } = c.req.param();

  const [payroll] = await db
    .select()
    .from(hrPayroll)
    .where(and(eq(hrPayroll.orgId, orgId), eq(hrPayroll.payrollMonth, month)));

  if (!payroll) return c.json({ error: "لا يوجد كشف راتب لهذا الشهر" }, 404);

  const items = await db
    .select({
      item: hrPayrollItems,
      employee: {
        id: hrEmployees.id,
        fullName: hrEmployees.fullName,
        gosiNumber: hrEmployees.gosiNumber,
        nationalId: hrEmployees.nationalId,
        isSaudi: hrEmployees.isSaudi,
        gosiEligible: hrEmployees.gosiEligible,
      },
    })
    .from(hrPayrollItems)
    .innerJoin(hrEmployees, eq(hrPayrollItems.employeeId, hrEmployees.id))
    .where(
      and(
        eq(hrPayrollItems.payrollId, payroll.id),
        eq(hrPayrollItems.orgId, orgId),
        eq(hrEmployees.gosiEligible, true),
      ),
    );

  return c.json({
    data: {
      payroll,
      records: items,
      totalGosiEmployee: payroll.totalGosiEmployee,
      totalGosiEmployer: payroll.totalGosiEmployer,
      month,
    },
  });
});
