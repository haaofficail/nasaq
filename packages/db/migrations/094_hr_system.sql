-- HR System Migration
-- نظام الموارد البشرية الكامل

CREATE TABLE IF NOT EXISTS hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  full_name_en TEXT,
  national_id TEXT,
  nationality TEXT DEFAULT 'SA',
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  phone TEXT,
  email TEXT,
  address TEXT,
  job_title TEXT,
  department TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'daily')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated', 'suspended')),
  hire_date DATE NOT NULL,
  termination_date DATE,
  termination_reason TEXT CHECK (termination_reason IN ('resigned', 'fired', 'end_of_contract', 'retired', 'other')),
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(10,2) DEFAULT 0,
  transport_allowance NUMERIC(10,2) DEFAULT 0,
  other_allowances JSONB,
  bank_name TEXT,
  iban TEXT,
  gosi_number TEXT,
  gosi_eligible BOOLEAN DEFAULT TRUE,
  is_saudi BOOLEAN DEFAULT FALSE,
  payroll_day INTEGER DEFAULT 28 CHECK (payroll_day BETWEEN 1 AND 31),
  manager_id UUID REFERENCES hr_employees(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, employee_number)
);

CREATE TABLE IF NOT EXISTS hr_employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('national_id','iqama','passport','work_permit','contract','medical','driving_license','other')),
  document_name TEXT NOT NULL,
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  reminder_days INTEGER DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS hr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day','holiday','on_leave')),
  late_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','zkteco','mobile')),
  zkteco_device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS hr_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual','sick','emergency','maternity','paternity','hajj','iddah','marriage','bereavement','exam','unpaid','other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reason TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS hr_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  entitled_days INTEGER DEFAULT 0,
  used_days INTEGER DEFAULT 0,
  remaining_days INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, employee_id, year, leave_type)
);

CREATE TABLE IF NOT EXISTS hr_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  loan_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  purpose TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  total_installments INTEGER NOT NULL DEFAULT 1,
  paid_installments INTEGER DEFAULT 0,
  installment_amount NUMERIC(10,2),
  start_month TEXT, -- YYYY-MM
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, loan_number)
);

CREATE TABLE IF NOT EXISTS hr_loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES hr_loans(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_month TEXT NOT NULL, -- YYYY-MM
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','deducted')),
  payroll_id UUID,
  deducted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS hr_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('direct','absence','late','loan','disciplinary','other')),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  deduction_month TEXT NOT NULL, -- YYYY-MM
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','applied')),
  payroll_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS hr_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_number TEXT NOT NULL,
  payroll_month TEXT NOT NULL, -- YYYY-MM
  payroll_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  total_basic NUMERIC(14,2) DEFAULT 0,
  total_allowances NUMERIC(14,2) DEFAULT 0,
  total_additions NUMERIC(14,2) DEFAULT 0,
  total_deductions NUMERIC(14,2) DEFAULT 0,
  total_loans NUMERIC(14,2) DEFAULT 0,
  total_gosi_employee NUMERIC(12,2) DEFAULT 0,
  total_gosi_employer NUMERIC(12,2) DEFAULT 0,
  total_net NUMERIC(14,2) DEFAULT 0,
  total_gratuity_provision NUMERIC(12,2) DEFAULT 0,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method TEXT DEFAULT 'bank_transfer',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, payroll_number)
);

CREATE TABLE IF NOT EXISTS hr_payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_id UUID NOT NULL REFERENCES hr_payroll(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  housing_allowance NUMERIC(10,2) DEFAULT 0,
  transport_allowance NUMERIC(10,2) DEFAULT 0,
  other_allowances JSONB,
  overtime_amount NUMERIC(10,2) DEFAULT 0,
  additions_amount NUMERIC(10,2) DEFAULT 0,
  absence_deduction NUMERIC(10,2) DEFAULT 0,
  late_deduction NUMERIC(10,2) DEFAULT 0,
  loans_deduction NUMERIC(10,2) DEFAULT 0,
  direct_deductions NUMERIC(10,2) DEFAULT 0,
  gosi_employee NUMERIC(10,2) DEFAULT 0,
  gosi_employer NUMERIC(10,2) DEFAULT 0,
  gratuity_provision NUMERIC(10,2) DEFAULT 0,
  net_salary NUMERIC(12,2) DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  overtime_hours NUMERIC(6,2) DEFAULT 0,
  status TEXT DEFAULT 'included' CHECK (status IN ('included','excluded')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS hr_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  review_year INTEGER NOT NULL,
  review_period TEXT NOT NULL CHECK (review_period IN ('H1','H2','annual')),
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  overall_score NUMERIC(3,1) CHECK (overall_score BETWEEN 1 AND 5),
  criteria JSONB,
  strengths TEXT,
  improvements TEXT,
  goals_next_period TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged')),
  employee_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS hr_zkteco_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_ip TEXT,
  last_sync_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','error','offline')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, device_id)
);

CREATE TABLE IF NOT EXISTS hr_government_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('iqama_renewal','work_permit','levy_monthly','transfer_kafala','other')),
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','paid','overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS hr_employees_org_idx ON hr_employees(org_id);
CREATE INDEX IF NOT EXISTS hr_employees_status_idx ON hr_employees(org_id, status);
CREATE INDEX IF NOT EXISTS hr_employees_dept_idx ON hr_employees(org_id, department);
CREATE INDEX IF NOT EXISTS hr_attendance_org_date_idx ON hr_attendance(org_id, attendance_date);
CREATE INDEX IF NOT EXISTS hr_attendance_emp_idx ON hr_attendance(employee_id);
CREATE INDEX IF NOT EXISTS hr_leaves_emp_idx ON hr_leaves(employee_id, status);
CREATE INDEX IF NOT EXISTS hr_payroll_month_idx ON hr_payroll(org_id, payroll_month);
CREATE INDEX IF NOT EXISTS hr_payroll_items_payroll_idx ON hr_payroll_items(payroll_id);
CREATE INDEX IF NOT EXISTS hr_docs_expiry_idx ON hr_employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS hr_gov_fees_due_idx ON hr_government_fees(org_id, due_date, status);
