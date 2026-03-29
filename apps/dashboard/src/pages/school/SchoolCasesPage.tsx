import { useState } from "react";
import {
  FolderOpen, Plus, ChevronLeft, Send, Circle,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";
import { fmtHijri } from "@/lib/utils";
import { PageFAQ } from "@/components/school/PageFAQ";

// ── Constants ────────────────────────────────────────────────

const CATEGORIES = [
  { value: "سلوكية", label: "سلوكي" },
  { value: "أكاديمية", label: "أكاديمي" },
  { value: "صحية", label: "صحي" },
  { value: "اجتماعية", label: "اجتماعي" },
  { value: "إدارية", label: "إداري" },
  { value: "أخرى", label: "أخرى" },
];

const PRIORITIES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: "عاجل",   color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  high:   { label: "مرتفع",  color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  normal: { label: "عادي",   color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  low:    { label: "منخفض",  color: "text-gray-600",   bg: "bg-gray-100",  border: "border-gray-200" },
};

const STATUSES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open:        { label: "مفتوح",     color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  in_progress: { label: "قيد المتابعة", color: "text-blue-700", bg: "bg-blue-50",   border: "border-blue-200" },
  resolved:    { label: "محلول",     color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  closed:      { label: "مغلق",      color: "text-gray-600",   bg: "bg-gray-100",  border: "border-gray-200" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITIES[priority] ?? PRIORITIES.normal;
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", p.color, p.bg, p.border)}>
      {p.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status] ?? STATUSES.open;
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", s.color, s.bg, s.border)}>
      {s.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────

const emptyForm = {
  title: "",
  category: "",
  priority: "normal",
  student_id: "",
  description: "",
};

export function SchoolCasesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const [detailModal, setDetailModal] = useState<{ open: boolean; caseId: string | null }>({
    open: false,
    caseId: null,
  });
  const [stepText, setStepText] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [formError, setFormError] = useState("");
  const [createError, setCreateError] = useState("");

  const filters: Record<string, string> = {};
  if (statusFilter) filters.status = statusFilter;
  if (categoryFilter) filters.category = categoryFilter;

  const { data: casesData, loading, error, refetch } = useApi(
    () => schoolApi.listCases(filters),
    [statusFilter, categoryFilter]
  );

  const { data: detailData, loading: detailLoading, refetch: refetchDetail } = useApi(
    () => (detailModal.caseId ? schoolApi.getCase(detailModal.caseId) : Promise.resolve(null)),
    [detailModal.caseId]
  );

  const { data: studentsData } = useApi(() => schoolApi.listStudents({}), []);

  const cases: any[] = casesData?.data ?? [];
  const students: any[] = studentsData?.data ?? [];
  const caseDetail: any = detailData?.data ?? null;
  const steps: any[] = detailData?.data?.steps ?? [];

  const handleAddCase = async () => {
    if (!form.title.trim()) { setCreateError("عنوان الحالة مطلوب"); return; }
    if (!form.category) { setCreateError("الفئة مطلوبة"); return; }
    setSubmitting(true);
    setCreateError("");
    try {
      const payload: Record<string, any> = {
        title: form.title.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description || null,
        studentId: form.student_id || null,
      };
      await schoolApi.createCase(payload);
      setAddModal(false);
      setForm({ ...emptyForm });
      refetch();
    } catch (err: any) {
      setCreateError(err.message ?? "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStep = async () => {
    if (!stepText.trim() || !detailModal.caseId) return;
    setAddingStep(true);
    try {
      await schoolApi.addCaseStep(detailModal.caseId, { description: stepText });
      setStepText("");
      refetchDetail();
    } catch {
      // handled
    } finally {
      setAddingStep(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!detailModal.caseId) return;
    setUpdatingStatus(true);
    try {
      await schoolApi.updateCase(detailModal.caseId, { status: newStatus });
      refetchDetail();
      refetch();
    } catch {}
    finally { setUpdatingStatus(false); }
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الحالات</h1>
          <p className="text-sm text-gray-500 mt-1">متابعة حالات الطلاب والتدخلات</p>
        </div>
        <button
          onClick={() => { setForm({ ...emptyForm }); setAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          حالة جديدة
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
        >
          <option value="">كل الفئات</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : cases.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <FolderOpen className="w-12 h-12" />
            <p className="text-sm">لا توجد حالات مسجلة</p>
            <button
              onClick={() => { setForm({ ...emptyForm }); setAddModal(true); }}
              className="mt-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700"
            >
              إضافة أول حالة
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-right px-4 py-3 font-medium">العنوان</th>
                  <th className="text-right px-4 py-3 font-medium">الطالب</th>
                  <th className="text-right px-4 py-3 font-medium">الفصل</th>
                  <th className="text-right px-4 py-3 font-medium">الفئة</th>
                  <th className="text-right px-4 py-3 font-medium">الأولوية</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cases.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-48 truncate">{c.title}</td>
                    <td className="px-4 py-3 text-gray-700">{c.studentName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.classRoomGrade && c.classRoomName ? `${c.classRoomGrade} / ${c.classRoomName}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {CATEGORIES.find((x) => x.value === c.category)?.label ?? c.category}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">
                      {fmtHijri(c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailModal({ open: true, caseId: c.id })}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PageFAQ pageId="cases" />

      {/* Add Case Modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="إضافة حالة جديدة"
        size="md"
        footer={
          <>
            <button
              onClick={() => setAddModal(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleAddCase}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "جاري الحفظ..." : "إضافة"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الحالة</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">اختر الفئة</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                {Object.entries(PRIORITIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الطالب (اختياري)</label>
            <select
              value={form.student_id}
              onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
            >
              <option value="">بدون طالب محدد</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} — {s.studentNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
            />
          </div>
          {createError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{createError}</p>}
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, caseId: null })}
        title="تفاصيل الحالة"
        size="lg"
      >
        {detailLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />
            ))}
          </div>
        ) : !caseDetail ? null : (
          <div className="space-y-5">
            {/* Case meta */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-900 text-base">{caseDetail.title}</p>
              <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={caseDetail.priority} />
                <StatusBadge status={caseDetail.status} />
              </div>
              {caseDetail.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{caseDetail.description}</p>
              )}
            </div>

            {/* Status actions */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUSES).map(([k, v]) => (
                <button
                  key={k}
                  disabled={updatingStatus || caseDetail.status === k}
                  onClick={() => handleUpdateStatus(k)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40",
                    caseDetail.status === k ? `${v.bg} ${v.color} ${v.border}` : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Steps */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">الخطوات والإجراءات</p>
              {steps.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">لا توجد خطوات بعد</p>
              ) : (
                <div className="space-y-2">
                  {steps.map((step: any, idx: number) => (
                    <div key={step.id ?? idx} className="flex gap-3 items-start">
                      <Circle className="w-3 h-3 mt-1 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{step.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fmtHijri(step.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add step */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">إضافة خطوة جديدة</p>
              <div className="flex gap-2">
                <input
                  value={stepText}
                  onChange={(e) => setStepText(e.target.value)}
                  placeholder="وصف الخطوة أو الإجراء..."
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddStep(); }}
                />
                <button
                  onClick={handleAddStep}
                  disabled={addingStep || !stepText.trim()}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
