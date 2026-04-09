import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight, User, CalendarDays, FileText, DollarSign,
  Banknote, Star, Shield, Plus, Trash2, Pencil, ChevronDown, ChevronUp,
} from "lucide-react";
import { useApi, useMutation } from "@/hooks/useApi";
import { hrApi, mediaApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui";
import { toast } from "@/hooks/useToast";
import { PayslipModal } from "@/components/hr/PayslipModal";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function SAR(v: any) {
  return parseFloat(v ?? 0).toLocaleString("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 });
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 font-medium">{value || "—"}</dd>
    </div>
  );
}

const TABS = [
  { key: "profile",     label: "الملف الشخصي",        icon: User },
  { key: "attendance",  label: "الحضور",               icon: CalendarDays },
  { key: "leaves",      label: "الإجازات",             icon: FileText },
  { key: "payslips",    label: "قسائم الراتب",         icon: DollarSign },
  { key: "loans",       label: "السلف",                icon: Banknote },
  { key: "documents",   label: "الوثائق",              icon: FileText },
  { key: "performance", label: "الأداء",               icon: Star },
  { key: "gratuity",    label: "مكافأة نهاية الخدمة", icon: Shield },
] as const;
type TabKey = typeof TABS[number]["key"];

const STATUS_EMP: Record<string, { label: string; cls: string }> = {
  active:     { label: "نشط",       cls: "bg-emerald-50 text-emerald-700" },
  inactive:   { label: "غير نشط",   cls: "bg-gray-100 text-gray-500" },
  on_leave:   { label: "في إجازة",  cls: "bg-amber-50 text-amber-700" },
  terminated: { label: "منتهي",     cls: "bg-red-50 text-red-600" },
};

// ─────────────────────────────────────────────────────────────
// DOC MODAL
// ─────────────────────────────────────────────────────────────

function DocModal({ employeeId, onClose, onSaved }: { employeeId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    documentType: "iqama", documentName: "", documentNumber: "",
    issueDate: "", expiryDate: "", reminderDays: "60",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    if (!form.documentName) { toast.error("اسم الوثيقة مطلوب"); return; }
    setSaving(true);
    try {
      let fileUrl: string | undefined;
      if (docFile) {
        const fd = new FormData();
        fd.append("file", docFile);
        fd.append("category", "hr_documents");
        const uploadRes = await mediaApi.upload(fd);
        fileUrl = uploadRes?.data?.url ?? uploadRes?.data?.fileUrl;
      }
      await hrApi.createDocument(employeeId, { ...form, ...(fileUrl ? { fileUrl } : {}) });
      toast.success("تمت إضافة الوثيقة");
      onSaved();
    } catch { toast.error("تعذّر إضافة الوثيقة — تحقق من البيانات وحاول مجدداً"); } finally { setSaving(false); }
  }

  return (
    <Modal open title="إضافة وثيقة" onClose={onClose}>
      <div className="space-y-4 p-4" dir="rtl">
        <div>
          <label className="text-xs text-gray-500 block mb-1">نوع الوثيقة</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.documentType} onChange={setF("documentType")}>
            <option value="iqama">إقامة</option>
            <option value="passport">جواز سفر</option>
            <option value="national_id">هوية وطنية</option>
            <option value="work_permit">تصريح عمل</option>
            <option value="contract">عقد عمل</option>
            <option value="certificate">شهادة</option>
            <option value="other">أخرى</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">اسم الوثيقة *</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.documentName} onChange={setF("documentName")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">رقم الوثيقة</label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.documentNumber} onChange={setF("documentNumber")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">رفع المستند (PDF أو صورة)</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:text-sm cursor-pointer w-full"
          />
          {docFile && <p className="text-xs text-emerald-600 mt-1">تم اختيار: {docFile.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">تاريخ الإصدار</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.issueDate} onChange={setF("issueDate")} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">تاريخ الانتهاء</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.expiryDate} onChange={setF("expiryDate")} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">تنبيه قبل (أيام)</label>
          <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.reminderDays} onChange={setF("reminderDays")} />
        </div>
      </div>
      <div className="flex justify-end gap-3 px-4 pb-4 border-t pt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60">
          {saving ? "جاري الرفع والحفظ..." : "إضافة"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// PROFILE TAB
// ─────────────────────────────────────────────────────────────

function ProfileTab({ emp, onEdit }: { emp: any; onEdit: () => void }) {
  const totalSalary = parseFloat(emp.basicSalary ?? 0) + parseFloat(emp.housingAllowance ?? 0) + parseFloat(emp.transportAllowance ?? 0);
  const yearsOfService = emp.hireDate
    ? ((Date.now() - new Date(emp.hireDate).getTime()) / (365.25 * 24 * 3600 * 1000)).toFixed(1)
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600"
        >
          <Pencil className="w-4 h-4" />
          تعديل
        </button>
      </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">البيانات الشخصية</h3>
        <dl>
          <InfoRow label="الاسم الكامل" value={emp.fullName} />
          <InfoRow label="الاسم بالإنجليزية" value={emp.fullNameEn} />
          <InfoRow label="رقم الهوية / الإقامة" value={emp.nationalId} />
          <InfoRow label="الجنسية" value={emp.nationality} />
          <InfoRow label="الجنس" value={emp.gender === "male" ? "ذكر" : emp.gender === "female" ? "أنثى" : null} />
          <InfoRow label="تاريخ الميلاد" value={emp.dateOfBirth} />
          <InfoRow label="الجوال" value={emp.phone} />
          <InfoRow label="البريد الإلكتروني" value={emp.email} />
        </dl>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">بيانات التوظيف</h3>
        <dl>
          <InfoRow label="الرقم الوظيفي" value={emp.employeeNumber} />
          <InfoRow label="المسمى الوظيفي" value={emp.jobTitle} />
          <InfoRow label="القسم" value={emp.department} />
          <InfoRow label="نوع التوظيف" value={
            emp.employmentType === "full_time" ? "دوام كامل" :
            emp.employmentType === "part_time" ? "دوام جزئي" :
            emp.employmentType === "contract"  ? "عقد محدد" :
            emp.employmentType === "trainee"   ? "متدرب" : emp.employmentType
          } />
          <InfoRow label="تاريخ التعيين" value={emp.hireDate} />
          <InfoRow label="سنوات الخدمة" value={`${yearsOfService} سنة`} />
          <InfoRow label="مواطن سعودي" value={emp.isSaudi ? "نعم" : "لا"} />
          <InfoRow label="مسجل في التأمينات" value={emp.gosiEligible ? "نعم" : "لا"} />
        </dl>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">الراتب والبنك</h3>
        <dl>
          <InfoRow label="الراتب الأساسي" value={SAR(emp.basicSalary)} />
          <InfoRow label="بدل السكن" value={SAR(emp.housingAllowance)} />
          <InfoRow label="بدل المواصلات" value={SAR(emp.transportAllowance)} />
          <InfoRow label="إجمالي الراتب" value={SAR(totalSalary)} />
          <InfoRow label="اسم البنك" value={emp.bankName} />
          <InfoRow label="رقم الآيبان" value={emp.iban} />
          <InfoRow label="رقم التأمينات" value={emp.gosiNumber} />
        </dl>
      </div>
    </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ATTENDANCE TAB
// ─────────────────────────────────────────────────────────────

function isDateInLeave(date: string, approvedLeaves: any[]): boolean {
  return approvedLeaves.some((lv) => {
    if (lv.status !== "approved") return false;
    return date >= lv.startDate && date <= lv.endDate;
  });
}

function AttendanceTab({ employeeId }: { employeeId: string }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);

  const { data, loading } = useApi(
    () => hrApi.attendance({ employeeId, month }),
    [employeeId, month]
  );
  const records: any[] = data?.data ?? [];

  const { data: leavesRes } = useApi(() => hrApi.leaves({ employeeId }), [employeeId]);
  const approvedLeaves: any[] = (leavesRes?.data ?? []).filter((lv: any) => lv.status === "approved");

  const ATT_STATUS: Record<string, { label: string; cls: string }> = {
    present:  { label: "حاضر",      cls: "bg-emerald-50 text-emerald-700" },
    absent:   { label: "غائب",      cls: "bg-red-50 text-red-600" },
    late:     { label: "متأخر",     cls: "bg-amber-50 text-amber-700" },
    half_day: { label: "نصف يوم",   cls: "bg-blue-50 text-blue-700" },
    on_leave: { label: "في إجازة",  cls: "bg-purple-50 text-purple-700" },
    holiday:  { label: "عطلة",      cls: "bg-gray-100 text-gray-500" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-medium text-gray-700">سجل الحضور</h3>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm" />
      </div>
      {loading ? <SkeletonRows /> : records.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد سجلات لهذا الشهر</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                <th className="text-right px-4 py-3 font-medium">وقت الدخول</th>
                <th className="text-right px-4 py-3 font-medium">وقت الخروج</th>
                <th className="text-right px-4 py-3 font-medium">تأخير</th>
                <th className="text-right px-4 py-3 font-medium">إضافي</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => {
                const onApprovedLeave = r.status === "absent" && isDateInLeave(r.attendanceDate, approvedLeaves);
                const effectiveStatus = onApprovedLeave ? "on_leave" : r.status;
                const s = ATT_STATUS[effectiveStatus] ?? { label: r.status, cls: "bg-gray-100 text-gray-500" };
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{r.attendanceDate}</td>
                    <td className="px-4 py-3 text-gray-600">{r.checkIn ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.checkOut ?? "—"}</td>
                    <td className="px-4 py-3 text-amber-600">{r.lateMinutes ? `${r.lateMinutes} د` : "—"}</td>
                    <td className="px-4 py-3 text-blue-600">{r.overtimeMinutes ? `${r.overtimeMinutes} د` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-xs px-2 py-1 rounded-full font-medium", s.cls)}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LEAVES TAB
// ─────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: "annual",    label: "إجازة سنوية" },
  { value: "sick",      label: "إجازة مرضية" },
  { value: "emergency", label: "إجازة طارئة" },
  { value: "unpaid",    label: "إجازة بدون راتب" },
  { value: "maternity", label: "إجازة أمومة" },
  { value: "paternity", label: "إجازة أبوة" },
  { value: "hajj",      label: "إجازة حج" },
  { value: "other",     label: "أخرى" },
];

function LeavesTab({ employeeId }: { employeeId: string }) {
  const currentYear = new Date().getFullYear();
  const { data: balanceRes } = useApi(() => hrApi.leaveBalance(employeeId, currentYear), [employeeId]);
  const balances: any[] = balanceRes?.data ?? [];

  const { data: leavesRes, loading, refetch } = useApi(() => hrApi.leaves({ employeeId }), [employeeId]);
  const leaves: any[] = leavesRes?.data ?? [];

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const setLF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setLeaveForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmitLeave() {
    if (!leaveForm.startDate || !leaveForm.endDate) { toast.error("تواريخ الإجازة مطلوبة"); return; }
    setSubmitting(true);
    try {
      await hrApi.createLeave({ employeeId, ...leaveForm });
      toast.success("تم إرسال طلب الإجازة");
      setShowLeaveModal(false);
      setLeaveForm({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
      refetch();
    } catch { toast.error("حدث خطأ أثناء إرسال الطلب"); } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      {balances.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">رصيد الإجازات {currentYear}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {balances.map((b) => (
              <div key={b.leaveType} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">{b.leaveType}</div>
                <div className="text-lg font-bold text-gray-800">{b.remainingDays}</div>
                <div className="text-xs text-gray-400">متبقي / {b.entitledDays}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">سجل الإجازات</h3>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
            طلب إجازة
          </button>
        </div>
        {loading ? <SkeletonRows /> : leaves.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">لا توجد إجازات مسجلة</div>
        ) : (
          <div className="space-y-2">
            {leaves.map((lv) => (
              <div key={lv.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium text-gray-800 text-sm">{lv.leaveType}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{lv.startDate} — {lv.endDate} ({lv.daysCount} أيام)</div>
                  {lv.reason && <div className="text-xs text-gray-500 mt-0.5">{lv.reason}</div>}
                </div>
                <span className={clsx("text-xs px-2 py-1 rounded-full font-medium",
                  lv.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                  lv.status === "pending"  ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600")}>
                  {lv.status === "approved" ? "موافق" : lv.status === "pending" ? "بانتظار" : "مرفوض"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLeaveModal && (
        <Modal open title="طلب إجازة جديدة" onClose={() => setShowLeaveModal(false)}>
          <div className="space-y-4 p-4" dir="rtl">
            <div>
              <label className="text-xs text-gray-500 block mb-1">نوع الإجازة</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={leaveForm.leaveType} onChange={setLF("leaveType")}>
                {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">من تاريخ *</label>
                <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={leaveForm.startDate} onChange={setLF("startDate")} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">إلى تاريخ *</label>
                <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={leaveForm.endDate} onChange={setLF("endDate")} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">السبب</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                rows={3}
                value={leaveForm.reason}
                onChange={setLF("reason")}
                placeholder="سبب الإجازة (اختياري)"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-4 pb-4 border-t pt-4">
            <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">إلغاء</button>
            <button onClick={handleSubmitLeave} disabled={submitting} className="px-5 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-60">
              {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAYSLIPS TAB
// ─────────────────────────────────────────────────────────────

function PayslipsTab({ employeeId }: { employeeId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { data, loading } = useApi(() => hrApi.employeePayslips(employeeId), [employeeId]);
  const payslips: any[] = data?.data ?? [];

  return (
    <div className="space-y-3">
      {loading ? <SkeletonRows /> : payslips.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد قسائم راتب بعد</div>
      ) : (
        payslips.map((ps: any) => (
          <div key={ps.payrollId} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{ps.payrollMonth}</div>
              <div className="text-xs text-gray-400 mt-0.5">صافي الراتب: {SAR(ps.netSalary)}</div>
            </div>
            <button onClick={() => setSelected(ps.payrollId)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
              عرض القسيمة
            </button>
          </div>
        ))
      )}
      {selected && (
        <PayslipModal payrollId={selected} employeeId={employeeId} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOANS TAB
// ─────────────────────────────────────────────────────────────

const ARABIC_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function buildInstallmentSchedule(ln: any): { index: number; label: string; amount: number; status: "paid" | "upcoming" | "future" }[] {
  const total = parseInt(ln.totalInstallments ?? 0);
  const paid = parseInt(ln.paidInstallments ?? 0);
  const amount = parseFloat(ln.installmentAmount ?? (parseFloat(ln.amount ?? 0) / (total || 1)));
  const startDate = ln.startDate ?? ln.createdAt ?? new Date().toISOString();
  const start = new Date(startDate);
  const today = new Date();

  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const monthLabel = `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    let status: "paid" | "upcoming" | "future";
    if (i < paid) {
      status = "paid";
    } else if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()) {
      status = "upcoming";
    } else if (d <= today) {
      status = "upcoming";
    } else {
      status = "future";
    }
    return { index: i + 1, label: monthLabel, amount, status };
  });
}

function LoanRow({ ln }: { ln: any }) {
  const [expanded, setExpanded] = useState(false);
  const schedule = buildInstallmentSchedule(ln);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-semibold text-gray-800">{ln.loanNumber}</span>
        <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium",
          ln.status === "settled" ? "bg-gray-100 text-gray-500" :
          ln.approvalStatus === "pending" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
          {ln.status === "settled" ? "مسددة" : ln.approvalStatus === "pending" ? "بانتظار الموافقة" : "جارية"}
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mr-auto flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          جدول الأقساط
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-400">المبلغ</div>
          <div className="font-bold text-gray-800">{SAR(ln.amount)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">الأقساط المدفوعة</div>
          <div className="font-medium text-gray-700">{ln.paidInstallments ?? 0} / {ln.totalInstallments}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">قسط شهري</div>
          <div className="font-medium text-gray-700">{SAR(ln.installmentAmount)}</div>
        </div>
      </div>

      {expanded && schedule.length > 0 && (
        <div className="mt-4 border-t border-gray-50 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-right py-2 px-2 font-medium">الدفعة</th>
                  <th className="text-right py-2 px-2 font-medium">الشهر</th>
                  <th className="text-right py-2 px-2 font-medium">المبلغ</th>
                  <th className="text-right py-2 px-2 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schedule.map((inst) => (
                  <tr key={inst.index} className="hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-600">{inst.index}</td>
                    <td className="py-2 px-2 text-gray-700">{inst.label}</td>
                    <td className="py-2 px-2 text-gray-700">{SAR(inst.amount)}</td>
                    <td className="py-2 px-2">
                      {inst.status === "paid" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">مدفوعة</span>
                      )}
                      {inst.status === "upcoming" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">قادمة</span>
                      )}
                      {inst.status === "future" && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">مستقبلية</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LoansTab({ employeeId }: { employeeId: string }) {
  const { data, loading } = useApi(() => hrApi.employeeLoans(employeeId), [employeeId]);
  const loans: any[] = data?.data ?? [];

  return (
    <div className="space-y-3">
      {loading ? <SkeletonRows /> : loans.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد سلف</div>
      ) : (
        loans.map((ln: any) => <LoanRow key={ln.id} ln={ln} />)
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DOCUMENTS TAB
// ─────────────────────────────────────────────────────────────

function DocumentsTab({ employeeId }: { employeeId: string }) {
  const [showModal, setShowModal] = useState(false);
  const { data, loading, refetch } = useApi(() => hrApi.documents(employeeId), [employeeId]);
  const docs: any[] = data?.data ?? [];
  const { mutate: deleteDoc } = useMutation((id: string) => hrApi.deleteDocument(id));

  async function handleDelete(id: string) {
    if (!confirm("حذف هذه الوثيقة؟")) return;
    try { await deleteDoc(id); toast.success("تم الحذف"); refetch(); }
    catch { toast.error("تعذّر حذف الوثيقة"); }
  }

  function daysLeft(expiry?: string | null) {
    if (!expiry) return null;
    return Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700">
          <Plus className="w-4 h-4" /> إضافة وثيقة
        </button>
      </div>
      {loading ? <SkeletonRows /> : docs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد وثائق</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {docs.map((doc: any) => {
            const days = daysLeft(doc.expiryDate);
            const expClass = days !== null && days <= 30 ? "bg-red-50 border-red-200" :
              days !== null && days <= 90 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100";
            return (
              <div key={doc.id} className={clsx("rounded-2xl border p-4 flex items-start gap-3", expClass)}>
                <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm flex items-center gap-2">
                    {doc.documentName}
                    {doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 text-xs hover:underline">
                        عرض الملف
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{doc.documentType} — {doc.documentNumber || "بدون رقم"}</div>
                  {doc.expiryDate && (
                    <div className={clsx("text-xs mt-1 font-medium",
                      days !== null && days <= 30 ? "text-red-600" :
                      days !== null && days <= 90 ? "text-amber-600" : "text-gray-400")}>
                      تنتهي: {doc.expiryDate}
                      {days !== null && days > 0 && ` (${days} يوم)`}
                      {days !== null && days <= 0 && " — منتهية"}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {showModal && <DocModal employeeId={employeeId} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch(); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PERFORMANCE TAB
// ─────────────────────────────────────────────────────────────

function PerformanceTab({ employeeId }: { employeeId: string }) {
  const { data, loading } = useApi(() => hrApi.employeePerformance(employeeId), [employeeId]);
  const reviews: any[] = data?.data ?? [];

  return (
    <div className="space-y-3">
      {loading ? <SkeletonRows /> : reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد تقييمات</div>
      ) : (
        reviews.map((rv: any) => (
          <div key={rv.id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold text-gray-800">{rv.reviewYear}</span>
                <span className="text-xs text-gray-400 mr-2">{rv.reviewPeriod}</span>
              </div>
              {rv.overallScore && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-gray-800">{rv.overallScore} / 5</span>
                </div>
              )}
            </div>
            {rv.strengths && <p className="text-sm text-gray-600 mb-1"><span className="font-medium">نقاط القوة:</span> {rv.strengths}</p>}
            {rv.improvements && <p className="text-sm text-gray-600"><span className="font-medium">مجالات التحسين:</span> {rv.improvements}</p>}
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GRATUITY TAB
// ─────────────────────────────────────────────────────────────

function GratuityTab({ employeeId }: { employeeId: string }) {
  const [reason, setReason] = useState<"fired" | "resigned" | "end_of_contract">("fired");
  const { data, loading, refetch } = useApi(() => hrApi.gratuityCalc(employeeId, reason), [employeeId, reason]);
  const calc = data?.data ?? null;

  const [showSettle, setShowSettle] = useState(false);
  const [settleForm, setSettleForm] = useState({ terminationDate: "", terminationReason: "", notes: "" });
  const [settling, setSettling] = useState(false);
  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSettleForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSettle() {
    if (!settleForm.terminationDate) { toast.error("تاريخ الإنهاء مطلوب"); return; }
    setSettling(true);
    try {
      await hrApi.settleGratuity(employeeId, { ...settleForm, reason });
      toast.success("تم تسجيل إنهاء الخدمة ومكافأة نهاية الخدمة");
      setShowSettle(false);
      refetch();
    } catch { toast.error("تعذّر تسجيل إنهاء الخدمة — تحقق من البيانات وحاول مجدداً"); } finally { setSettling(false); }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">حساب مكافأة نهاية الخدمة</h3>
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1">سبب إنهاء الخدمة</label>
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            <option value="fired">فصل / إنهاء من صاحب العمل</option>
            <option value="resigned">استقالة</option>
            <option value="end_of_contract">انتهاء العقد</option>
          </select>
        </div>
        {loading ? <div className="text-gray-400 text-sm">جاري الحساب...</div> : !calc ? null : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">سنوات الخدمة</div>
              <div className="text-lg font-bold text-gray-800">{parseFloat(calc.yearsOfService ?? 0).toFixed(1)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">الراتب الأساسي</div>
              <div className="text-lg font-bold text-gray-800">{SAR(calc.basicSalary)}</div>
            </div>
            <div className="bg-brand-50 rounded-xl p-3 text-center col-span-2">
              <div className="text-xs text-gray-500">مكافأة نهاية الخدمة المحسوبة</div>
              <div className="text-2xl font-bold text-brand-700">{SAR(calc.gratuityAmount)}</div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button onClick={() => setShowSettle(true)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700">
          تسجيل إنهاء الخدمة
        </button>
      </div>
      {showSettle && (
        <Modal open title="تسجيل إنهاء الخدمة" onClose={() => setShowSettle(false)}>
          <div className="space-y-4 p-4" dir="rtl">
            <div>
              <label className="text-xs text-gray-500 block mb-1">تاريخ الإنهاء *</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={settleForm.terminationDate} onChange={setF("terminationDate")} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">سبب الإنهاء</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={settleForm.terminationReason} onChange={setF("terminationReason")} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">ملاحظات</label>
              <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2} value={settleForm.notes} onChange={setF("notes")} />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-4 pb-4 border-t pt-4">
            <button onClick={() => setShowSettle(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">إلغاء</button>
            <button onClick={handleSettle} disabled={settling} className="px-5 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60">
              {settling ? "جاري الحفظ..." : "تأكيد الإنهاء"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export function HREmployeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const { data, loading, error } = useApi(() => hrApi.employee(id!), [id]);
  const emp = data?.data ?? null;

  if (loading) return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      <SkeletonRows />
    </div>
  );

  if (error || !emp) return (
    <div className="p-6" dir="rtl">
      <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">{error || "لم يتم العثور على الموظف"}</div>
    </div>
  );

  const s = STATUS_EMP[emp.status] ?? { label: emp.status, cls: "bg-gray-100 text-gray-500" };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      <button onClick={() => navigate("/dashboard/hr")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600">
        <ArrowRight className="w-4 h-4" />
        العودة إلى الموارد البشرية
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xl font-bold shrink-0">
          {emp.fullName?.charAt(0) ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{emp.fullName}</h1>
            <span className={clsx("text-xs px-2 py-1 rounded-full font-medium", s.cls)}>{s.label}</span>
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {emp.jobTitle || "—"}{emp.department ? ` | ${emp.department}` : ""}
            <span className="mx-2 text-gray-300">|</span>
            {emp.employeeNumber}
          </div>
        </div>
        <div className="text-left hidden md:block">
          <div className="text-xs text-gray-400">الراتب الأساسي</div>
          <div className="text-lg font-bold text-gray-800">{SAR(emp.basicSalary)}</div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap",
              activeTab === key ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile"     && <ProfileTab emp={emp} onEdit={() => navigate(`/dashboard/hr?editEmployee=${id}`)} />}
      {activeTab === "attendance"  && <AttendanceTab employeeId={id!} />}
      {activeTab === "leaves"      && <LeavesTab employeeId={id!} />}
      {activeTab === "payslips"    && <PayslipsTab employeeId={id!} />}
      {activeTab === "loans"       && <LoansTab employeeId={id!} />}
      {activeTab === "documents"   && <DocumentsTab employeeId={id!} />}
      {activeTab === "performance" && <PerformanceTab employeeId={id!} />}
      {activeTab === "gratuity"    && <GratuityTab employeeId={id!} />}
    </div>
  );
}
