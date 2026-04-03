import {
  pgTable, uuid, text, integer, boolean, numeric, date, time,
  timestamp, jsonb, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

// ── EMPLOYEES ─────────────────────────────────────────
export const hrEmployees = pgTable("hr_employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeNumber: text("employee_number").notNull(),
  fullName: text("full_name").notNull(),
  fullNameEn: text("full_name_en"),
  nationalId: text("national_id"),
  nationality: text("nationality").default("SA"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  jobTitle: text("job_title"),
  department: text("department"),
  employmentType: text("employment_type").notNull().default("full_time"),
  status: text("status").notNull().default("active"),
  hireDate: date("hire_date").notNull(),
  terminationDate: date("termination_date"),
  terminationReason: text("termination_reason"),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  housingAllowance: numeric("housing_allowance", { precision: 10, scale: 2 }).default("0"),
  transportAllowance: numeric("transport_allowance", { precision: 10, scale: 2 }).default("0"),
  otherAllowances: jsonb("other_allowances"),
  bankName: text("bank_name"),
  iban: text("iban"),
  gosiNumber: text("gosi_number"),
  gosiEligible: boolean("gosi_eligible").default(true),
  isSaudi: boolean("is_saudi").default(false),
  payrollDay: integer("payroll_day").default(28),
  managerId: uuid("manager_id"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("hr_emp_org_number_idx").on(table.orgId, table.employeeNumber),
  index("hr_emp_org_status_idx").on(table.orgId, table.status),
]);

// ── DOCUMENTS ─────────────────────────────────────────
export const hrEmployeeDocuments = pgTable("hr_employee_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  documentName: text("document_name").notNull(),
  documentNumber: text("document_number"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  fileUrl: text("file_url"),
  isVerified: boolean("is_verified").default(false),
  reminderDays: integer("reminder_days").default(60),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("hr_docs_emp_idx").on(table.employeeId),
  index("hr_docs_expiry_idx2").on(table.expiryDate),
]);

// ── ATTENDANCE ─────────────────────────────────────────
export const hrAttendance = pgTable("hr_attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  attendanceDate: date("attendance_date").notNull(),
  checkIn: time("check_in"),
  checkOut: time("check_out"),
  status: text("status").notNull().default("present"),
  lateMinutes: integer("late_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  source: text("source").default("manual"),
  zktecDeviceId: text("zkteco_device_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("hr_att_emp_date_idx").on(table.orgId, table.employeeId, table.attendanceDate),
  index("hr_att_org_date_idx").on(table.orgId, table.attendanceDate),
]);

// ── LEAVES ─────────────────────────────────────────────
export const hrLeaves = pgTable("hr_leaves", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  leaveType: text("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  daysCount: integer("days_count").notNull(),
  status: text("status").notNull().default("pending"),
  reason: text("reason"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("hr_leaves_emp_idx").on(table.employeeId, table.status),
]);

// ── LEAVE BALANCES ─────────────────────────────────────
export const hrLeaveBalances = pgTable("hr_leave_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  leaveType: text("leave_type").notNull(),
  entitledDays: integer("entitled_days").default(0),
  usedDays: integer("used_days").default(0),
  remainingDays: integer("remaining_days").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("hr_lb_emp_year_type_idx").on(table.orgId, table.employeeId, table.year, table.leaveType),
]);

// ── LOANS ─────────────────────────────────────────────
export const hrLoans = pgTable("hr_loans", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  loanNumber: text("loan_number").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  purpose: text("purpose"),
  approvalStatus: text("approval_status").default("pending"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  totalInstallments: integer("total_installments").notNull().default(1),
  paidInstallments: integer("paid_installments").default(0),
  installmentAmount: numeric("installment_amount", { precision: 10, scale: 2 }),
  startMonth: text("start_month"),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("hr_loans_org_number_idx").on(table.orgId, table.loanNumber),
  index("hr_loans_emp_idx").on(table.employeeId),
]);

// ── LOAN INSTALLMENTS ─────────────────────────────────
export const hrLoanInstallments = pgTable("hr_loan_installments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  loanId: uuid("loan_id").notNull().references(() => hrLoans.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(),
  dueMonth: text("due_month").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  payrollId: uuid("payroll_id"),
  deductedAt: timestamp("deducted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── DEDUCTIONS ─────────────────────────────────────────
export const hrDeductions = pgTable("hr_deductions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  deductionType: text("deduction_type").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  deductionMonth: text("deduction_month").notNull(),
  status: text("status").default("pending"),
  payrollId: uuid("payroll_id"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── PAYROLL ─────────────────────────────────────────────
export const hrPayroll = pgTable("hr_payroll", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  payrollNumber: text("payroll_number").notNull(),
  payrollMonth: text("payroll_month").notNull(),
  payrollDate: date("payroll_date").notNull(),
  status: text("status").notNull().default("draft"),
  totalBasic: numeric("total_basic", { precision: 14, scale: 2 }).default("0"),
  totalAllowances: numeric("total_allowances", { precision: 14, scale: 2 }).default("0"),
  totalAdditions: numeric("total_additions", { precision: 14, scale: 2 }).default("0"),
  totalDeductions: numeric("total_deductions", { precision: 14, scale: 2 }).default("0"),
  totalLoans: numeric("total_loans", { precision: 14, scale: 2 }).default("0"),
  totalGosiEmployee: numeric("total_gosi_employee", { precision: 12, scale: 2 }).default("0"),
  totalGosiEmployer: numeric("total_gosi_employer", { precision: 12, scale: 2 }).default("0"),
  totalNet: numeric("total_net", { precision: 14, scale: 2 }).default("0"),
  totalGratuityProvision: numeric("total_gratuity_provision", { precision: 12, scale: 2 }).default("0"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentMethod: text("payment_method").default("bank_transfer"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("hr_payroll_org_number_idx").on(table.orgId, table.payrollNumber),
  index("hr_payroll_month_idx2").on(table.orgId, table.payrollMonth),
]);

// ── PAYROLL ITEMS ───────────────────────────────────────
export const hrPayrollItems = pgTable("hr_payroll_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  payrollId: uuid("payroll_id").notNull().references(() => hrPayroll.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).default("0"),
  housingAllowance: numeric("housing_allowance", { precision: 10, scale: 2 }).default("0"),
  transportAllowance: numeric("transport_allowance", { precision: 10, scale: 2 }).default("0"),
  otherAllowances: jsonb("other_allowances"),
  overtimeAmount: numeric("overtime_amount", { precision: 10, scale: 2 }).default("0"),
  additionsAmount: numeric("additions_amount", { precision: 10, scale: 2 }).default("0"),
  absenceDeduction: numeric("absence_deduction", { precision: 10, scale: 2 }).default("0"),
  lateDeduction: numeric("late_deduction", { precision: 10, scale: 2 }).default("0"),
  loansDeduction: numeric("loans_deduction", { precision: 10, scale: 2 }).default("0"),
  directDeductions: numeric("direct_deductions", { precision: 10, scale: 2 }).default("0"),
  gosiEmployee: numeric("gosi_employee", { precision: 10, scale: 2 }).default("0"),
  gosiEmployer: numeric("gosi_employer", { precision: 10, scale: 2 }).default("0"),
  gratuityProvision: numeric("gratuity_provision", { precision: 10, scale: 2 }).default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).default("0"),
  workingDays: integer("working_days").default(0),
  absentDays: integer("absent_days").default(0),
  lateDays: integer("late_days").default(0),
  overtimeHours: numeric("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  status: text("status").default("included"),
  notes: text("notes"),
}, (table) => [
  index("hr_pi_payroll_idx").on(table.payrollId),
  index("hr_pi_emp_idx").on(table.employeeId),
]);

// ── PERFORMANCE REVIEWS ─────────────────────────────────
export const hrPerformanceReviews = pgTable("hr_performance_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  reviewYear: integer("review_year").notNull(),
  reviewPeriod: text("review_period").notNull(),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  overallScore: numeric("overall_score", { precision: 3, scale: 1 }),
  criteria: jsonb("criteria"),
  strengths: text("strengths"),
  improvements: text("improvements"),
  goalsNextPeriod: text("goals_next_period"),
  status: text("status").default("draft"),
  employeeAcknowledged: boolean("employee_acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── ZKTECO DEVICES ──────────────────────────────────────
export const hrZktecoDevices = pgTable("hr_zkteco_devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  deviceName: text("device_name"),
  deviceIp: text("device_ip"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  recordsSynced: integer("records_synced").default(0),
  status: text("status").default("active"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("hr_zkteco_org_device_idx").on(table.orgId, table.deviceId),
]);

// ── GOVERNMENT FEES ─────────────────────────────────────
export const hrGovernmentFees = pgTable("hr_government_fees", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  feeType: text("fee_type").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date"),
  paidDate: date("paid_date"),
  status: text("status").default("upcoming"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("hr_gov_fees_due_idx2").on(table.orgId, table.dueDate, table.status),
]);
