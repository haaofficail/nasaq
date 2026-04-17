import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Users, UserPlus, CalendarDays, ClipboardList, DollarSign,
  Banknote, Shield, CheckCircle, Clock, XCircle,
  Search, BadgeCheck, UserCheck, Plus, Eye, Edit2,
} from "lucide-react";
import { useApi, useMutation } from "@/hooks/useApi";
import { hrApi } from "@/lib/api";
import { Modal, Input, PageHeader, Button } from "@/components/ui";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import { PayslipModal } from "@/components/hr/PayslipModal";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const TABS = [
  { key: "employees",   label: "الموظفون",    icon: Users },
  { key: "attendance",  label: "الحضور",      icon: CalendarDays },
  { key: "leaves",      label: "الإجازات",    icon: ClipboardList },
  { key: "payroll",     label: "الرواتب",     icon: DollarSign },
  { key: "loans",       label: "السلف",       icon: Banknote },
  { key: "compliance",  label: "الامتثال",    icon: Shield },
] as const;
type TabKey = typeof TABS[number]["key"];

const STATUS_EMP: Record<string, { label: string; cls: string }> = {
  active:      { label: "نشط",       cls: "bg-emerald-50 text-emerald-700" },
  inactive:    { label: "غير نشط",   cls: "bg-gray-100 text-gray-500" },
  on_leave:    { label: "في إجازة",  cls: "bg-amber-50 text-amber-700" },
  terminated:  { label: "منتهي",     cls: "bg-red-50 text-red-600" },
};

const STATUS_LEAVE: Record<string, { label: string; cls: string }> = {
  pending:  { label: "بانتظار الموافقة", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "موافق عليها",      cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "مرفوضة",           cls: "bg-red-50 text-red-600" },
};

const STATUS_LOAN: Record<string, { label: string; cls: string }> = {
  pending:  { label: "بانتظار الموافقة", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "موافق عليها",      cls: "bg-emerald-50 text-emerald-700" },
  active:   { label: "جارية",            cls: "bg-blue-50 text-blue-700" },
  settled:  { label: "مسددة",            cls: "bg-gray-100 text-gray-500" },
  rejected: { label: "مرفوضة",           cls: "bg-red-50 text-red-600" },
};

const STATUS_PAYROLL: Record<string, { label: string; cls: string }> = {
  draft:    { label: "مسودة",   cls: "bg-gray-100 text-gray-600" },
  approved: { label: "معتمدة",  cls: "bg-blue-50 text-blue-700" },
  paid:     { label: "مدفوعة",  cls: "bg-emerald-50 text-emerald-700" },
};

function SAR(v: any) {
  return parseFloat(v ?? 0).toLocaleString("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 });
}

// ─────────────────────────────────────────────────────────────
// EMPLOYEE FORM MODAL
// ─────────────────────────────────────────────────────────────

function EmployeeModal({ initial, onClose, onSaved }: { initial?: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    fullName:           initial?.fullName ?? "",
    fullNameEn:         initial?.fullNameEn ?? "",
    nationalId:         initial?.nationalId ?? "",
    nationality:        initial?.nationality ?? "SA",
    gender:             initial?.gender ?? "",
    dateOfBirth:        initial?.dateOfBirth ?? "",
    phone:              initial?.phone ?? "",
    email:              initial?.email ?? "",
    jobTitle:           initial?.jobTitle ?? "",
    department:         initial?.department ?? "",
    employmentType:     initial?.employmentType ?? "full_time",
    hireDate:           initial?.hireDate ?? "",
    basicSalary:        initial?.basicSalary ?? "",
    housingAllowance:   initial?.housingAllowance ?? "0",
    transportAllowance: initial?.transportAllowance ?? "0",
    isSaudi:            initial?.isSaudi ?? false,
    gosiEligible:       initial?.gosiEligible ?? true,
    bankName:           initial?.bankName ?? "",
    iban:               initial?.iban ?? "",
    status:             initial?.status ?? "active",
    notes:              initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }));

  async function handleSave() {
    if (!form.fullName || !form.hireDate || !form.basicSalary) {
      toast.error("الاسم وتاريخ التعيين والراتب الأساسي مطلوبة"); return;
    }
    setSaving(true);
    try {
      if (isEdit) await hrApi.updateEmployee(initial.id, form);
      else await hrApi.createEmployee(form);
      toast.success(isEdit ? "تم تحديث بيانات الموظف" : "تم إضافة الموظف بنجاح");
      onSaved();
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally { setSaving(false); }
  }

  return (
    <Modal open title={isEdit ? "تعديل بيانات الموظف" : "إضافة موظف جديد"} onClose={onClose} size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4" dir="rtl">
        <div>
          <label className="text-xs text-gray-500 block mb-1">الاسم الكامل *</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.fullName} onChange={setF("fullName")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">الاسم بالإنجليزية</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.fullNameEn} onChange={setF("fullNameEn")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">رقم الهوية / الإقامة</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.nationalId} onChange={setF("nationalId")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">الجنسية</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.nationality} onChange={setF("nationality")}>
            <option value="SA">سعودي</option>
            <option value="EG">مصري</option>
            <option value="IN">هندي</option>
            <option value="PK">باكستاني</option>
            <option value="BD">بنغلاديشي</option>
            <option value="PH">فلبيني</option>
            <option value="SY">سوري</option>
            <option value="YE">يمني</option>
            <option value="ET">إثيوبي</option>
            <option value="SD">سوداني</option>
            <option value="OTHER">أخرى</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">الجنس</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.gender} onChange={setF("gender")}>
            <option value="">-- اختر --</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">تاريخ الميلاد</label>
          <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.dateOfBirth} onChange={setF("dateOfBirth")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">الجوال</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.phone} onChange={setF("phone")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">البريد الإلكتروني</label>
          <input type="email" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.email} onChange={setF("email")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">المسمى الوظيفي</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.jobTitle} onChange={setF("jobTitle")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">القسم / الإدارة</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.department} onChange={setF("department")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">نوع التوظيف</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.employmentType} onChange={setF("employmentType")}>
            <option value="full_time">دوام كامل</option>
            <option value="part_time">دوام جزئي</option>
            <option value="contract">عقد محدد المدة</option>
            <option value="trainee">متدرب</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">تاريخ التعيين *</label>
          <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.hireDate} onChange={setF("hireDate")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">الراتب الأساسي (ر.س) *</label>
          <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.basicSalary} onChange={setF("basicSalary")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">بدل السكن (ر.س)</label>
          <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.housingAllowance} onChange={setF("housingAllowance")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">بدل المواصلات (ر.س)</label>
          <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.transportAllowance} onChange={setF("transportAllowance")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">اسم البنك</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.bankName} onChange={setF("bankName")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">رقم الآيبان</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.iban} onChange={setF("iban")} />
        </div>
        <div className="flex items-center gap-4 md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded" checked={form.isSaudi} onChange={setBool("isSaudi")} />
            مواطن سعودي
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded" checked={form.gosiEligible} onChange={setBool("gosiEligible")} />
            مسجل في التأمينات (GOSI)
          </label>
        </div>
        {isEdit && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">الحالة</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.status} onChange={setF("status")}>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="on_leave">في إجازة</option>
              <option value="terminated">منتهية الخدمة</option>
            </select>
          </div>
        )}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 block mb-1">ملاحظات</label>
          <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={setF("notes")} />
        </div>
      </div>
      <div className="flex justify-end gap-3 px-4 pb-4 border-t pt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60">
          {saving ? "جاري الحفظ..." : isEdit ? "حفظ التغييرات" : "إضافة الموظف"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// LEAVE REQUEST MODAL
// ─────────────────────────────────────────────────────────────

function LeaveModal({ onClose, onSaved, employees }: { onClose: () => void; onSaved: () => void; employees: any[] }) {
  const [form, setForm] = useState({ employeeId: "", leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function checkBalance(employeeId: string, leaveType: string) {
    if (!employeeId || leaveType !== "annual") { setBalanceWarning(null); return; }
    setCheckingBalance(true);
    try {
      const res = await hrApi.leaveBalance(employeeId);
      const bal = res?.data;
      const remaining = bal?.remainingAnnual ?? bal?.remaining ?? bal?.annual ?? null;
      if (remaining !== null && Number(remaining) < 1) {
        const empName = employees.find((e) => e.id === employeeId)?.fullName ?? "";
        setBalanceWarning(`تنبيه: رصيد الإجازة السنوية${empName ? " للموظف " + empName : ""} ${remaining} يوم فقط`);
      } else if (remaining !== null) {
        setBalanceWarning(null);
      }
    } catch { setBalanceWarning(null); }
    finally { setCheckingBalance(false); }
  }

  function handleEmployeeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setForm((f) => ({ ...f, employeeId: val }));
    checkBalance(val, form.leaveType);
  }

  function handleLeaveTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setForm((f) => ({ ...f, leaveType: val }));
    checkBalance(form.employeeId, val);
  }

  async function handleSave() {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      toast.error("الموظف وتواريخ الإجازة مطلوبة"); return;
    }
    if (form.startDate > form.endDate) {
      toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية"); return;
    }
    setSaving(true);
    try {
      await hrApi.createLeave(form);
      toast.success("تم إضافة طلب الإجازة");
      onSaved();
    } catch { toast.error("تعذّر حفظ طلب الإجازة — تحقق من البيانات وحاول مجدداً"); } finally { setSaving(false); }
  }

  return (
    <Modal open title="طلب إجازة جديد" onClose={onClose}>
      <div className="space-y-4 p-4" dir="rtl">
        <div>
          <label className="text-xs text-gray-500 block mb-1">الموظف *</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.employeeId} onChange={handleEmployeeChange}>
            <option value="">-- اختر الموظف --</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">نوع الإجازة *</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.leaveType} onChange={handleLeaveTypeChange}>
            <option value="annual">سنوية</option>
            <option value="sick">مرضية</option>
            <option value="emergency">طارئة</option>
            <option value="maternity">أمومة</option>
            <option value="paternity">أبوة</option>
            <option value="hajj">حج</option>
            <option value="unpaid">بدون أجر</option>
          </select>
        </div>
        {checkingBalance && (
          <div className="text-xs text-gray-400 animate-pulse">جاري فحص الرصيد...</div>
        )}
        {balanceWarning && !checkingBalance && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm text-amber-700">
            {balanceWarning}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">من *</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.startDate} onChange={setF("startDate")} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">إلى *</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.endDate} onChange={setF("endDate")} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">السبب</label>
          <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2} value={form.reason} onChange={setF("reason")} />
        </div>
      </div>
      <div className="flex justify-end gap-3 px-4 pb-4 border-t pt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60">
          {saving ? "جاري الإرسال..." : "إرسال الطلب"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// LOAN MODAL
// ─────────────────────────────────────────────────────────────

function LoanModal({ onClose, onSaved, employees }: { onClose: () => void; onSaved: () => void; employees: any[] }) {
  const [form, setForm] = useState({ employeeId: "", amount: "", purpose: "", totalInstallments: "1", startMonth: "" });
  const [saving, setSaving] = useState(false);
  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    if (!form.employeeId || !form.amount) { toast.error("الموظف والمبلغ مطلوبان"); return; }
    setSaving(true);
    try {
      await hrApi.createLoan(form);
      toast.success("تم تسجيل طلب السلفة");
      onSaved();
    } catch { toast.error("تعذّر حفظ طلب السلفة — تحقق من البيانات وحاول مجدداً"); } finally { setSaving(false); }
  }

  return (
    <Modal open title="طلب سلفة / قرض" onClose={onClose}>
      <div className="space-y-4 p-4" dir="rtl">
        <div>
          <label className="text-xs text-gray-500 block mb-1">الموظف *</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.employeeId} onChange={setF("employeeId")}>
            <option value="">-- اختر الموظف --</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">المبلغ (ر.س) *</label>
          <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.amount} onChange={setF("amount")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">الغرض</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.purpose} onChange={setF("purpose")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">عدد الأقساط</label>
          <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.totalInstallments} onChange={setF("totalInstallments")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">شهر بداية الخصم (YYYY-MM)</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="2026-05" value={form.startMonth} onChange={setF("startMonth")} />
        </div>
      </div>
      <div className="flex justify-end gap-3 px-4 pb-4 border-t pt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60">
          {saving ? "جاري الحفظ..." : "تسجيل الطلب"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// PAYROLL GENERATE MODAL
// ─────────────────────────────────────────────────────────────

function PayrollGenerateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({ month: currentMonth, payrollDate: new Date().toISOString().split("T")[0] });
  const [step, setStep] = useState<"form" | "preview">("form");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<{ employeeCount: number; totalSalary: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const ARABIC_MONTHS: Record<string, string> = {
    "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
    "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
    "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
  };
  function monthLabel(ym: string) {
    const [y, m] = ym.split("-");
    return `${ARABIC_MONTHS[m] ?? m} ${y}`;
  }

  async function handlePreview() {
    if (!form.month) { toast.error("الشهر مطلوب"); return; }
    setLoadingPreview(true);
    try {
      const res = await hrApi.employees({ status: "active" });
      const activeEmployees: any[] = res?.data ?? [];
      const totalSalary = activeEmployees.reduce((sum: number, emp: any) => {
        return sum + (parseFloat(emp.basicSalary ?? 0) + parseFloat(emp.housingAllowance ?? 0) + parseFloat(emp.transportAllowance ?? 0));
      }, 0);
      setPreview({ employeeCount: activeEmployees.length, totalSalary });
      setStep("preview");
    } catch {
      toast.error("تعذّر تحميل معاينة الرواتب");
    } finally { setLoadingPreview(false); }
  }

  async function handleGenerate() {
    setSaving(true);
    try {
      await hrApi.generatePayroll(form);
      toast.success("تم إنشاء كشف الرواتب بنجاح");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "حدث خطأ أثناء الإنشاء");
    } finally { setSaving(false); }
  }

  return (
    <Modal open title="إنشاء كشف رواتب" onClose={onClose}>
      {step === "form" ? (
        <>
          <div className="space-y-4 p-4" dir="rtl">
            <div>
              <label className="text-xs text-gray-500 block mb-1">الشهر (YYYY-MM) *</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="2026-04" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">تاريخ صرف الرواتب *</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.payrollDate} onChange={(e) => setForm((f) => ({ ...f, payrollDate: e.target.value }))} />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              سيتم احتساب رواتب جميع الموظفين النشطين لهذا الشهر مع الحسومات والإضافات المسجلة.
            </div>
          </div>
          <div className="flex justify-end gap-3 px-4 pb-4 border-t pt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">إلغاء</button>
            <button onClick={handlePreview} disabled={loadingPreview} className="px-5 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60">
              {loadingPreview ? "جاري التحميل..." : "معاينة الرواتب"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="p-4" dir="rtl">
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">معاينة الرواتب — {monthLabel(form.month)}</span>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-500">عدد الموظفين النشطين</span>
                  <span className="font-bold text-gray-800">{preview?.employeeCount ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-500">إجمالي الرواتب المقدر</span>
                  <span className="font-bold text-gray-800">{SAR(preview?.totalSalary ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-500">تاريخ الصرف</span>
                  <span className="font-medium text-gray-700">{form.payrollDate}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              الأرقام تقديرية قبل احتساب الحسومات والإضافات الفعلية لهذا الشهر.
            </p>
          </div>
          <div className="flex justify-between gap-3 px-4 pb-4 border-t pt-4">
            <button onClick={() => setStep("form")} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">رجوع</button>
            <button onClick={handleGenerate} disabled={saving} className="px-5 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60">
              {saving ? "جاري الإنشاء..." : "تأكيد الإنشاء"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: EMPLOYEES
// ─────────────────────────────────────────────────────────────

function EmployeesTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const { data: statsRes } = useApi(() => hrApi.employeeStats(), []);
  const stats = statsRes?.data ?? {};

  const { data, loading, error, refetch } = useApi(
    () => hrApi.employees({ search, status: statusFilter }),
    [search, statusFilter]
  );
  const employees: any[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "موظف نشط",            value: stats.active ?? 0,          icon: UserCheck,  color: "bg-emerald-50 text-emerald-700" },
          { label: "في إجازة",             value: stats.onLeave ?? 0,         icon: Clock,      color: "bg-amber-50 text-amber-700" },
          { label: "سعوديون",              value: stats.saudis ?? 0,          icon: BadgeCheck, color: "bg-blue-50 text-blue-700" },
          { label: "إجمالي كتلة الرواتب", value: SAR(stats.totalBasicSalary ?? 0), icon: DollarSign, color: "bg-purple-50 text-purple-700" },
        ].map((k) => (
          <div key={k.label} className={clsx("rounded-2xl p-4 flex items-center gap-3", k.color.split(" ")[0])}>
            <k.icon className={clsx("w-5 h-5 shrink-0", k.color.split(" ")[1])} />
            <div>
              <div className="text-xs text-gray-500">{k.label}</div>
              <div className="text-lg font-bold text-gray-800">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none"
              placeholder="بحث بالاسم أو الرقم..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="on_leave">في إجازة</option>
            <option value="inactive">غير نشط</option>
            <option value="terminated">منتهي</option>
          </select>
        </div>
        <button onClick={() => { setEditTarget(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700">
          <UserPlus className="w-4 h-4" /> إضافة موظف
        </button>
      </div>

      {loading ? <SkeletonRows /> : error ? (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا يوجد موظفون</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">الموظف</th>
                <th className="text-right px-4 py-3 font-medium">الوظيفة / القسم</th>
                <th className="text-right px-4 py-3 font-medium">الراتب الأساسي</th>
                <th className="text-right px-4 py-3 font-medium">تاريخ التعيين</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => {
                const s = STATUS_EMP[emp.status] ?? { label: emp.status, cls: "bg-gray-100 text-gray-500" };
                return (
                  <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/hr/employees/${emp.id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{emp.fullName}</div>
                      <div className="text-xs text-gray-400">{emp.employeeNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{emp.jobTitle || "—"}</div>
                      <div className="text-xs text-gray-400">{emp.department || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{SAR(emp.basicSalary)}</td>
                    <td className="px-4 py-3 text-gray-500">{emp.hireDate}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-xs px-2 py-1 rounded-full font-medium", s.cls)}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/dashboard/hr/employees/${emp.id}`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditTarget(emp); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-amber-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <EmployeeModal initial={editTarget} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch(); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: ATTENDANCE
// ─────────────────────────────────────────────────────────────

function ManualAttendanceModal({ onClose, onSaved, employees }: { onClose: () => void; onSaved: () => void; employees: any[] }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    employeeId: "",
    date: today,
    checkIn: "",
    checkOut: "",
    status: "present",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    if (!form.employeeId || !form.date || !form.status) {
      toast.error("الموظف والتاريخ والحالة مطلوبة"); return;
    }
    setSaving(true);
    try {
      await hrApi.createAttendance({
        employeeId: form.employeeId,
        date: form.date,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        status: form.status,
        notes: form.notes || undefined,
      });
      toast.success("تم تسجيل الحضور بنجاح");
      onSaved();
    } catch { toast.error("حدث خطأ أثناء التسجيل"); } finally { setSaving(false); }
  }

  return (
    <Modal open title="تسجيل حضور يدوي" onClose={onClose}>
      <div className="space-y-4 p-4" dir="rtl">
        <div>
          <label className="text-xs text-gray-500 block mb-1">الموظف *</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.employeeId} onChange={setF("employeeId")}>
            <option value="">-- اختر الموظف --</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">التاريخ *</label>
          <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.date} onChange={setF("date")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">وقت الدخول</label>
            <input type="time" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.checkIn} onChange={setF("checkIn")} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">وقت الخروج (اختياري)</label>
            <input type="time" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.checkOut} onChange={setF("checkOut")} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">الحالة *</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.status} onChange={setF("status")}>
            <option value="present">حاضر</option>
            <option value="absent">غائب</option>
            <option value="late">متأخر</option>
            <option value="on_leave">إجازة</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">ملاحظات (اختياري)</label>
          <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={setF("notes")} />
        </div>
      </div>
      <div className="flex justify-end gap-3 px-4 pb-4 border-t pt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60">
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
      </div>
    </Modal>
  );
}

function AttendanceTab() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [showManualModal, setShowManualModal] = useState(false);

  const { data: empRes } = useApi(() => hrApi.employees({ status: "active" }), []);
  const employees: any[] = empRes?.data ?? [];

  const { data: todayRes, loading: loadingToday, refetch: refetchToday } = useApi(() => hrApi.attendanceToday(), []);
  const todayList: any[] = todayRes?.data ?? [];

  const { data: summaryRes, loading: loadingSummary, refetch: refetchSummary } = useApi(() => hrApi.attendanceSummary(month), [month]);

  function handleAttendanceSaved() {
    setShowManualModal(false);
    refetchToday();
    refetchSummary();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> تسجيل حضور يدوي
        </button>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">الحضور اليوم</h3>
        {loadingToday ? <SkeletonRows /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "حاضر",     value: todayList.filter((a) => a.status === "present").length,   cls: "bg-emerald-50 text-emerald-700" },
              { label: "غائب",     value: todayList.filter((a) => a.status === "absent").length,    cls: "bg-red-50 text-red-600" },
              { label: "متأخر",    value: todayList.filter((a) => a.status === "late").length,      cls: "bg-amber-50 text-amber-700" },
              { label: "في إجازة", value: todayList.filter((a) => a.status === "on_leave").length,  cls: "bg-purple-50 text-purple-700" },
            ].map((k) => (
              <div key={k.label} className={clsx("rounded-2xl p-4 text-center", k.cls.split(" ")[0])}>
                <div className={clsx("text-2xl font-bold", k.cls.split(" ")[1])}>{k.value}</div>
                <div className="text-xs text-gray-500 mt-1">{k.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-medium text-gray-700">ملخص شهري</h3>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm" />
        </div>
        {loadingSummary ? <SkeletonRows /> : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {!summaryRes?.data?.employees?.length ? (
              <div className="text-center py-12 text-gray-400 text-sm">لا توجد بيانات حضور لهذا الشهر</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">الموظف</th>
                    <th className="text-right px-4 py-3 font-medium">أيام الحضور</th>
                    <th className="text-right px-4 py-3 font-medium">أيام الغياب</th>
                    <th className="text-right px-4 py-3 font-medium">دقائق التأخير</th>
                    <th className="text-right px-4 py-3 font-medium">ساعات إضافية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(summaryRes.data.employees as any[]).map((e: any) => (
                    <tr key={e.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{e.fullName}</td>
                      <td className="px-4 py-3 text-emerald-700">{e.presentDays}</td>
                      <td className="px-4 py-3 text-red-600">{e.absentDays}</td>
                      <td className="px-4 py-3 text-amber-700">{e.lateMinutes}</td>
                      <td className="px-4 py-3 text-blue-600">{e.overtimeHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      {/* Next action — go to payroll */}
      <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl">
        <div>
          <p className="text-sm font-semibold text-brand-700">الخطوة التالية: إنشاء كشف الرواتب</p>
          <p className="text-xs text-brand-500 mt-0.5">استخدم بيانات الحضور لاحتساب رواتب الموظفين تلقائياً</p>
        </div>
        <a href="?tab=payroll" className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors whitespace-nowrap">
          كشف الرواتب
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </a>
      </div>

      {showManualModal && (
        <ManualAttendanceModal
          employees={employees}
          onClose={() => setShowManualModal(false)}
          onSaved={handleAttendanceSaved}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: LEAVES
// ─────────────────────────────────────────────────────────────

function LeavesTab() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bulkApproveConfirm, setBulkApproveConfirm] = useState(false);
  const [bulkRejectConfirm, setBulkRejectConfirm] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const { data: empRes } = useApi(() => hrApi.employees({ status: "active" }), []);
  const employees: any[] = empRes?.data ?? [];

  const { data, loading, error, refetch } = useApi(() => hrApi.leaves({ status: statusFilter }), [statusFilter]);
  const leaves: any[] = data?.data ?? [];

  const pendingLeaves = leaves.filter((lv) => lv.status === "pending");
  const allPendingSelected = pendingLeaves.length > 0 && pendingLeaves.every((lv) => selectedIds.has(lv.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingLeaves.map((lv) => lv.id)));
    }
  }

  async function handleApprove(id: string) {
    setApproveTarget(id);
  }
  async function doApprove() {
    if (!approveTarget) return;
    try { await hrApi.approveLeave(approveTarget); toast.success("تمت الموافقة على الإجازة"); refetch(); }
    catch { toast.error("فشل الموافقة على الإجازة"); }
    finally { setApproveTarget(null); }
  }
  async function handleReject(id: string) {
    setRejectTarget(id);
    setRejectReason("");
  }
  async function doReject() {
    if (!rejectTarget) return;
    try { await hrApi.rejectLeave(rejectTarget, { reason: rejectReason }); toast.success("تم رفض الطلب"); refetch(); }
    catch { toast.error("فشل رفض الطلب"); }
    finally { setRejectTarget(null); setRejectReason(""); }
  }

  async function handleBulkApprove() {
    setBulkApproveConfirm(true);
  }
  async function doBulkApprove() {
    setBulkApproveConfirm(false);
    setBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of Array.from(selectedIds)) {
      try { await hrApi.approveLeave(id); successCount++; }
      catch { failCount++; }
    }
    setBulkProcessing(false);
    setSelectedIds(new Set());
    if (successCount > 0) toast.success(`تمت الموافقة على ${successCount} طلب`);
    if (failCount > 0) toast.error(`فشل ${failCount} طلب`);
    refetch();
  }

  async function handleBulkReject() {
    setBulkRejectConfirm(true);
    setBulkRejectReason("");
  }
  async function doBulkReject() {
    setBulkRejectConfirm(false);
    setBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of Array.from(selectedIds)) {
      try { await hrApi.rejectLeave(id, { reason: bulkRejectReason }); successCount++; }
      catch { failCount++; }
    }
    setBulkProcessing(false);
    setSelectedIds(new Set());
    if (successCount > 0) toast.success(`تم رفض ${successCount} طلب`);
    if (failCount > 0) toast.error(`فشل ${failCount} طلب`);
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {["pending", "approved", "rejected", ""].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setSelectedIds(new Set()); }}
              className={clsx("px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
                statusFilter === s ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              {s === "" ? "الكل" : STATUS_LEAVE[s]?.label ?? s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700">
          <Plus className="w-4 h-4" /> طلب إجازة
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <span className="text-sm text-blue-700 font-medium flex-1">تم تحديد {selectedIds.size} طلب</span>
          <button
            onClick={handleBulkApprove}
            disabled={bulkProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle className="w-3.5 h-3.5" /> موافقة على الكل
          </button>
          <button
            onClick={handleBulkReject}
            disabled={bulkProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60"
          >
            <XCircle className="w-3.5 h-3.5" /> رفض الكل
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-blue-100"
          >
            إلغاء التحديد
          </button>
        </div>
      )}

      {loading ? <SkeletonRows /> : error ? (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد إجازات</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                {statusFilter === "pending" && (
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded cursor-pointer"
                      checked={allPendingSelected}
                      onChange={toggleSelectAll}
                      title="تحديد الكل"
                    />
                  </th>
                )}
                <th className="text-right px-4 py-3 font-medium">الموظف</th>
                <th className="text-right px-4 py-3 font-medium">نوع الإجازة</th>
                <th className="text-right px-4 py-3 font-medium">من</th>
                <th className="text-right px-4 py-3 font-medium">إلى</th>
                <th className="text-right px-4 py-3 font-medium">الأيام</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaves.map((lv) => {
                const s = STATUS_LEAVE[lv.status] ?? { label: lv.status, cls: "bg-gray-100 text-gray-500" };
                const isSelected = selectedIds.has(lv.id);
                return (
                  <tr key={lv.id} className={clsx("hover:bg-gray-50", isSelected && "bg-blue-50")}>
                    {statusFilter === "pending" && (
                      <td className="px-4 py-3">
                        {lv.status === "pending" && (
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleSelect(lv.id)}
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-gray-800">{lv.employee?.fullName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{lv.leaveType}</td>
                    <td className="px-4 py-3 text-gray-500">{lv.startDate}</td>
                    <td className="px-4 py-3 text-gray-500">{lv.endDate}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{lv.daysCount} أيام</td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-xs px-2 py-1 rounded-full font-medium", s.cls)}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {lv.status === "pending" && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleApprove(lv.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(lv.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <LeaveModal employees={employees} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch(); }} />}

      {/* Approve single leave */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="الموافقة على الإجازة" size="sm"
        footer={<><Button variant="secondary" onClick={() => setApproveTarget(null)}>تراجع</Button><Button onClick={doApprove}>نعم، وافق</Button></>}>
        <p className="text-sm text-gray-600">سيتم الموافقة على طلب الإجازة. هل أنت متأكد؟</p>
      </Modal>

      {/* Reject single leave */}
      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(""); }} title="رفض طلب الإجازة" size="sm"
        footer={<><Button variant="secondary" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>تراجع</Button><Button variant="danger" onClick={doReject}>رفض الطلب</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">أدخل سبب الرفض (اختياري):</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="مثال: لا يتوفر بديل في هذه الفترة" rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all resize-none" />
        </div>
      </Modal>

      {/* Bulk approve */}
      <Modal open={bulkApproveConfirm} onClose={() => setBulkApproveConfirm(false)} title="الموافقة على طلبات متعددة" size="sm"
        footer={<><Button variant="secondary" onClick={() => setBulkApproveConfirm(false)}>تراجع</Button><Button onClick={doBulkApprove}>نعم، وافق على {selectedIds.size} طلب</Button></>}>
        <p className="text-sm text-gray-600">سيتم الموافقة على {selectedIds.size} طلب إجازة. هل أنت متأكد؟</p>
      </Modal>

      {/* Bulk reject */}
      <Modal open={bulkRejectConfirm} onClose={() => { setBulkRejectConfirm(false); setBulkRejectReason(""); }} title="رفض طلبات متعددة" size="sm"
        footer={<><Button variant="secondary" onClick={() => { setBulkRejectConfirm(false); setBulkRejectReason(""); }}>تراجع</Button><Button variant="danger" onClick={doBulkReject}>رفض {selectedIds.size} طلب</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">أدخل سبب الرفض (سيُطبق على جميع الطلبات المحددة):</p>
          <textarea value={bulkRejectReason} onChange={e => setBulkRejectReason(e.target.value)} placeholder="سبب الرفض..." rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all resize-none" />
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: PAYROLL
// ─────────────────────────────────────────────────────────────

function PayrollTab() {
  const [showGenModal, setShowGenModal] = useState(false);
  const [payslipTarget, setPayslipTarget] = useState<{ payrollId: string; empId: string } | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(() => hrApi.payrolls(), []);
  const payrolls: any[] = data?.data ?? [];

  async function handleApprove(id: string) {
    try { await hrApi.approvePayroll(id); toast.success("تم اعتماد كشف الرواتب"); refetch(); }
    catch { toast.error("فشل اعتماد كشف الرواتب"); }
  }
  async function handleMarkPaid(id: string) {
    setMarkPaidTarget(id);
  }
  async function doMarkPaid() {
    if (!markPaidTarget) return;
    try { await hrApi.markPayrollPaid(markPaidTarget); toast.success("تم تسجيل صرف الرواتب"); refetch(); }
    catch { toast.error("فشل تسجيل صرف الرواتب"); }
    finally { setMarkPaidTarget(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowGenModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700">
          <Plus className="w-4 h-4" /> إنشاء كشف رواتب
        </button>
      </div>

      {loading ? <SkeletonRows /> : error ? (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : payrolls.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد كشوف رواتب بعد</div>
      ) : (
        <div className="space-y-3">
          {payrolls.map((pr) => {
            const s = STATUS_PAYROLL[pr.status] ?? { label: pr.status, cls: "bg-gray-100 text-gray-500" };
            return (
              <div key={pr.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-800">{pr.payrollNumber}</span>
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", s.cls)}>{s.label}</span>
                  </div>
                  <div className="text-xs text-gray-500">شهر {pr.payrollMonth} — {pr._count ?? "?"} موظف</div>
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs text-gray-400">إجمالي الصافي</div>
                  <div className="font-bold text-gray-800">{SAR(pr.totalNet)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {pr.status === "draft" && (
                    <button onClick={() => handleApprove(pr.id)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      اعتماد
                    </button>
                  )}
                  {pr.status === "approved" && (
                    <button onClick={() => handleMarkPaid(pr.id)} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                      تأكيد الصرف
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showGenModal && <PayrollGenerateModal onClose={() => setShowGenModal(false)} onSaved={() => { setShowGenModal(false); refetch(); }} />}
      {payslipTarget && (
        <PayslipModal payrollId={payslipTarget.payrollId} employeeId={payslipTarget.empId} onClose={() => setPayslipTarget(null)} />
      )}

      {/* Mark Paid Confirmation */}
      <Modal open={!!markPaidTarget} onClose={() => setMarkPaidTarget(null)} title="تأكيد صرف الرواتب" size="sm"
        footer={<><Button variant="secondary" onClick={() => setMarkPaidTarget(null)}>تراجع</Button><Button onClick={doMarkPaid}>نعم، سُجّل الصرف</Button></>}>
        <p className="text-sm text-gray-600">سيتم تسجيل صرف الرواتب لهذا الشهر. تأكد من تحويل المبالغ فعلياً قبل التأكيد.</p>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: LOANS
// ─────────────────────────────────────────────────────────────

function LoansTab() {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loanRejectTarget, setLoanRejectTarget] = useState<string | null>(null);
  const [loanRejectReason, setLoanRejectReason] = useState("");

  const { data: empRes } = useApi(() => hrApi.employees({ status: "active" }), []);
  const employees: any[] = empRes?.data ?? [];

  const { data, loading, error, refetch } = useApi(() => hrApi.loans({ status: statusFilter }), [statusFilter]);
  const loans: any[] = data?.data ?? [];

  async function handleApprove(id: string) {
    try { await hrApi.approveLoan(id); toast.success("تمت الموافقة على السلفة"); refetch(); }
    catch { toast.error("فشل الموافقة على السلفة"); }
  }
  async function handleReject(id: string) {
    setLoanRejectTarget(id);
    setLoanRejectReason("");
  }
  async function doRejectLoan() {
    if (!loanRejectTarget) return;
    try { await hrApi.rejectLoan(loanRejectTarget, { reason: loanRejectReason }); toast.success("تم رفض الطلب"); refetch(); }
    catch { toast.error("فشل رفض الطلب"); }
    finally { setLoanRejectTarget(null); setLoanRejectReason(""); }
  }

  function addMonths(ym: string, n: number): string {
    if (!ym) return "";
    const [y, m] = ym.split("-").map(Number);
    const date = new Date(y, m - 1 + n, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {["pending", "active", "settled", ""].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx("px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
                statusFilter === s ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              {s === "" ? "الكل" : STATUS_LOAN[s]?.label ?? s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700">
          <Plus className="w-4 h-4" /> طلب سلفة
        </button>
      </div>

      {loading ? <SkeletonRows /> : error ? (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : loans.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد سلف</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="text-xs text-gray-400 px-4 pt-3 pb-1">انقر على أي صف لعرض جدول الأقساط</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">الموظف</th>
                <th className="text-right px-4 py-3 font-medium">رقم السلفة</th>
                <th className="text-right px-4 py-3 font-medium">المبلغ</th>
                <th className="text-right px-4 py-3 font-medium">الأقساط</th>
                <th className="text-right px-4 py-3 font-medium">الرصيد المتبقي</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loans.map((ln) => {
                const totalInstallments = parseInt(ln.totalInstallments ?? 1);
                const amount = parseFloat(ln.amount ?? 0);
                const monthlyPayment = totalInstallments > 0 ? amount / totalInstallments : amount;
                const remainingAmount = ln.remainingAmount != null
                  ? parseFloat(ln.remainingAmount)
                  : amount - ((ln.paidInstallments ?? 0) / (totalInstallments || 1)) * amount;
                const startMonth = ln.startMonth ?? "";
                const lastMonth = startMonth ? addMonths(startMonth, totalInstallments - 1) : "";
                const s = STATUS_LOAN[ln.approvalStatus] ?? STATUS_LOAN[ln.status] ?? { label: ln.status, cls: "bg-gray-100 text-gray-500" };
                return (
                  <LoanExpandableRow
                    key={ln.id}
                    ln={ln}
                    s={s}
                    remainingAmount={remainingAmount}
                    monthlyPayment={monthlyPayment}
                    startMonth={startMonth}
                    lastMonth={lastMonth}
                    totalInstallments={totalInstallments}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <LoanModal employees={employees} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch(); }} />}

      {/* Reject Loan */}
      <Modal open={!!loanRejectTarget} onClose={() => { setLoanRejectTarget(null); setLoanRejectReason(""); }} title="رفض طلب السلفة" size="sm"
        footer={<><Button variant="secondary" onClick={() => { setLoanRejectTarget(null); setLoanRejectReason(""); }}>تراجع</Button><Button variant="danger" onClick={doRejectLoan}>رفض الطلب</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">أدخل سبب الرفض (اختياري):</p>
          <textarea value={loanRejectReason} onChange={e => setLoanRejectReason(e.target.value)} placeholder="سبب الرفض..." rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all resize-none" />
        </div>
      </Modal>
    </div>
  );
}

function LoanExpandableRow({ ln, s, remainingAmount, monthlyPayment, startMonth, lastMonth, totalInstallments, onApprove, onReject }: {
  ln: any; s: { label: string; cls: string }; remainingAmount: number; monthlyPayment: number;
  startMonth: string; lastMonth: string; totalInstallments: number;
  onApprove: (id: string) => void; onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <td className="px-4 py-3 font-medium text-gray-800">{ln.employee?.fullName ?? "—"}</td>
        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{ln.loanNumber}</td>
        <td className="px-4 py-3 font-bold text-gray-800">{SAR(ln.amount)}</td>
        <td className="px-4 py-3 text-gray-600">{ln.paidInstallments ?? 0} / {ln.totalInstallments}</td>
        <td className="px-4 py-3">
          <span className={clsx("font-semibold text-sm", remainingAmount <= 0 ? "text-emerald-700" : "text-gray-800")}>
            {SAR(Math.max(0, remainingAmount))}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={clsx("text-xs px-2 py-1 rounded-full font-medium", s.cls)}>{s.label}</span>
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {ln.approvalStatus === "pending" && (
            <div className="flex items-center gap-1">
              <button onClick={() => onApprove(ln.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => onReject(ln.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><XCircle className="w-4 h-4" /></button>
            </div>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 pb-3 pt-0 bg-gray-50">
            <div className="border border-gray-200 rounded-xl p-3 text-xs text-gray-600 space-y-1">
              <div className="font-medium text-gray-700 mb-2">جدول الأقساط</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-gray-400">القسط الشهري</span>
                  <div className="font-semibold text-gray-800 mt-0.5">{SAR(monthlyPayment)}</div>
                </div>
                <div>
                  <span className="text-gray-400">عدد الأقساط</span>
                  <div className="font-semibold text-gray-800 mt-0.5">{totalInstallments}</div>
                </div>
                <div>
                  <span className="text-gray-400">أول خصم</span>
                  <div className="font-semibold text-gray-800 mt-0.5">{startMonth || "—"}</div>
                </div>
                <div>
                  <span className="text-gray-400">آخر خصم</span>
                  <div className="font-semibold text-gray-800 mt-0.5">{lastMonth || "—"}</div>
                </div>
              </div>
              {ln.purpose && (
                <div className="mt-2 text-gray-500">الغرض: {ln.purpose}</div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: COMPLIANCE
// ─────────────────────────────────────────────────────────────

function ComplianceTab() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);

  const { data: nitaqatRes, loading: loadingN } = useApi(() => hrApi.nitaqat(), []);
  const nitaqat = nitaqatRes?.data ?? {};

  const { data: wpsRes, loading: loadingW, refetch: refetchWPS } = useApi(() => hrApi.wpsReport(month), [month]);
  const wps = wpsRes?.data ?? {};

  const { data: gosiRes, loading: loadingG, refetch: refetchGOSI } = useApi(() => hrApi.gosiReport(month), [month]);
  const gosi = gosiRes?.data ?? {};

  const [submittingWPS, setSubmittingWPS] = useState(false);
  const [syncingGOSI, setSyncingGOSI]     = useState(false);
  const [showWPSConfirm, setShowWPSConfirm] = useState(false);

  const nitaqatColor = (cat: string) => {
    if (cat === "platinum") return "text-purple-700 bg-purple-50";
    if (cat === "green")    return "text-emerald-700 bg-emerald-50";
    if (cat === "yellow")   return "text-amber-700 bg-amber-50";
    return "text-red-700 bg-red-50";
  };

  const submitWPS = async () => {
    setShowWPSConfirm(true);
  };
  const doSubmitWPS = async () => {
    setShowWPSConfirm(false);
    setSubmittingWPS(true);
    try {
      // hrApi.submitWPS not available — WPS integration requires official MoL API credentials
      toast.info("هذه الخاصية تتطلب ربط واجهة WPS الرسمية");
    } catch {
      toast.error("فشل رفع بيانات WPS");
    } finally {
      setSubmittingWPS(false);
      refetchWPS();
    }
  };

  const syncGOSI = async () => {
    setSyncingGOSI(true);
    try {
      // hrApi.syncGOSI not available — GOSI sync requires official GOSI portal credentials
      toast.info("هذه الخاصية تتطلب ربط واجهة WPS الرسمية");
    } catch {
      toast.error("تعذّر المزامنة مع التأمينات — تحقق من بيانات الاعتماد");
    } finally {
      setSyncingGOSI(false);
      refetchGOSI();
    }
  };

  const needsMoreSaudis =
    (nitaqat.category === "yellow" || nitaqat.category === "red") &&
    typeof nitaqat.minRequired === "number" &&
    typeof nitaqat.saudiCount  === "number" &&
    typeof nitaqat.totalCount  === "number" &&
    nitaqat.totalCount > 0;

  const additionalNeeded = needsMoreSaudis
    ? Math.ceil(
        (nitaqat.minRequired / 100) * nitaqat.totalCount - nitaqat.saudiCount
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Nitaqat */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-600" /> نطاقات (Nitaqat)
        </h3>
        {loadingN ? <SkeletonRows /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">التصنيف الحالي</div>
                <span className={clsx("text-sm font-bold px-3 py-1.5 rounded-full", nitaqatColor(nitaqat.category ?? "red"))}>
                  {nitaqat.category === "platinum" ? "بلاتيني" : nitaqat.category === "green" ? "أخضر" : nitaqat.category === "yellow" ? "أصفر" : "أحمر"}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">نسبة السعودة الفعلية</div>
                <div className="text-lg font-bold text-gray-800">{nitaqat.saudizationRate ?? "—"}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">الحد الأدنى المطلوب</div>
                <div className="text-lg font-bold text-gray-800">{nitaqat.minRequired ?? "—"}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">موظفون سعوديون</div>
                <div className="text-lg font-bold text-gray-800">{nitaqat.saudiCount ?? "—"} / {nitaqat.totalCount ?? "—"}</div>
              </div>
            </div>

            {/* Improvement guidance for yellow */}
            {nitaqat.category === "yellow" && needsMoreSaudis && additionalNeeded > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">كيفية تحسين نطاقاتك:</p>
                <p className="text-xs text-amber-600">
                  أنت بحاجة إلى توظيف {additionalNeeded} موظف سعودي إضافي للوصول للفئة الخضراء.
                </p>
              </div>
            )}

            {/* Improvement guidance for red */}
            {nitaqat.category === "red" && needsMoreSaudis && additionalNeeded > 0 && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">تحذير — تصنيف أحمر:</p>
                <p className="text-xs text-red-600">
                  أنت بحاجة إلى توظيف {additionalNeeded} موظف سعودي إضافي على الأقل للخروج من الفئة الحمراء.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* WPS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-semibold text-gray-800 flex-1">نظام حماية الأجور (WPS)</h3>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm" />
        </div>
        {loadingW ? <SkeletonRows /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">موظفون مستحقون</div>
                <div className="text-lg font-bold text-gray-800">{wps.totalEmployees ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">إجمالي الرواتب</div>
                <div className="text-lg font-bold text-gray-800">{SAR(wps.totalAmount ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">حالة الإرسال</div>
                <span className={clsx("text-xs px-2 py-1 rounded-full font-medium",
                  wps.submitted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                  {wps.submitted ? "مُرسل" : "لم يُرسل بعد"}
                </span>
              </div>
            </div>
            <button
              onClick={submitWPS}
              disabled={submittingWPS || wps.submitted}
              className={clsx("mt-3 w-full py-2 rounded-xl text-sm font-medium transition-colors",
                wps.submitted
                  ? "bg-emerald-50 text-emerald-600 cursor-default"
                  : "bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              )}>
              {wps.submitted ? "تم الرفع مسبقاً" : submittingWPS ? "جاري الرفع..." : "رفع بيانات WPS"}
            </button>
          </>
        )}
      </div>

      {/* GOSI */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-brand-600" /> التأمينات الاجتماعية (GOSI)
        </h3>
        {loadingG ? <SkeletonRows /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">موظفون مسجلون</div>
                <div className="text-lg font-bold text-gray-800">{gosi.totalEmployees ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">حصة المنشأة</div>
                <div className="text-lg font-bold text-gray-800">{SAR(gosi.employerShare ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">حصة الموظفين</div>
                <div className="text-lg font-bold text-gray-800">{SAR(gosi.employeeShare ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">الإجمالي</div>
                <div className="text-lg font-bold text-gray-800">{SAR((gosi.employerShare ?? 0) + (gosi.employeeShare ?? 0))}</div>
              </div>
            </div>
            <button
              onClick={syncGOSI}
              disabled={syncingGOSI}
              className="mt-3 w-full py-2 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors">
              {syncingGOSI ? "جاري المزامنة..." : "مزامنة التأمينات"}
            </button>
          </>
        )}
      </div>

      {/* WPS Confirm */}
      <Modal open={showWPSConfirm} onClose={() => setShowWPSConfirm(false)} title="رفع بيانات الرواتب إلى WPS" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowWPSConfirm(false)}>تراجع</Button><Button onClick={doSubmitWPS}>نعم، ارفع البيانات</Button></>}>
        <p className="text-sm text-gray-600">سيتم رفع بيانات رواتب شهر {month} إلى نظام حماية الأجور (WPS). هل أنت متأكد؟</p>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export function HRPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) ?? "employees";

  function setTab(tab: TabKey) {
    setSearchParams({ tab }, { replace: true });
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      <PageHeader title="الموارد البشرية" description="إدارة الموظفين والرواتب والحضور والامتثال" />

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all",
              activeTab === key ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "employees"  && <EmployeesTab />}
      {activeTab === "attendance" && <AttendanceTab />}
      {activeTab === "leaves"     && <LeavesTab />}
      {activeTab === "payroll"    && <PayrollTab />}
      {activeTab === "loans"      && <LoansTab />}
      {activeTab === "compliance" && <ComplianceTab />}
    </div>
  );
}
