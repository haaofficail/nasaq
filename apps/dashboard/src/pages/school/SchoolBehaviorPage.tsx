import { useState, useEffect } from "react";
import {
  ShieldCheck, AlertTriangle, Star, Bell, BarChart2,
  Plus, Trash2, Check, X, ChevronDown, RefreshCw,
  Loader2, TrendingUp, TrendingDown, User,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { fmtHijri } from "@/lib/utils";

// ============================================================
// HELPERS
// ============================================================

const DEGREE_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  "1": { label: "درجة 1", bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100" },
  "2": { label: "درجة 2", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100" },
  "3": { label: "درجة 3", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" },
  "4": { label: "درجة 4", bg: "bg-red-50",    text: "text-red-700",    border: "border-red-100" },
  "5": { label: "درجة 5", bg: "bg-rose-50",   text: "text-rose-800",   border: "border-rose-200" },
};

const INCIDENT_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open:      { label: "مفتوحة",    cls: "bg-amber-50 text-amber-700 border-amber-100" },
  resolved:  { label: "محلولة",    cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  cancelled: { label: "ملغية",     cls: "bg-gray-100 text-gray-500 border-[#eef2f6]" },
};

const NOTIF_TYPE_LABELS: Record<string, string> = {
  sms:     "رسالة نصية",
  call:    "اتصال هاتفي",
  meeting: "اجتماع",
  letter:  "خطاب رسمي",
};

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function scoreLabel(score: number) {
  if (score >= 90) return "ممتاز";
  if (score >= 75) return "جيد جداً";
  if (score >= 60) return "جيد";
  if (score >= 40) return "مقبول";
  return "ضعيف";
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}

// ============================================================
// TABS
// ============================================================

type Tab = "overview" | "incidents" | "compensations" | "attendance" | "scores";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",      label: "نظرة عامة",   icon: BarChart2 },
  { id: "incidents",     label: "الحوادث",      icon: AlertTriangle },
  { id: "compensations", label: "التعويضات",    icon: Star },
  { id: "attendance",    label: "المواظبة",     icon: Check },
  { id: "scores",        label: "درجات السلوك", icon: ShieldCheck },
];

// ============================================================
// OVERVIEW TAB
// ============================================================

function OverviewTab() {
  const { data, loading, refetch } = useApi(() => schoolApi.getBehaviorOverview(), []);
  const overview = (data as any)?.data;

  if (loading) return <LoadingSkeleton />;
  if (!overview) return <EmptyState icon={BarChart2} text="لا توجد بيانات بعد" />;

  const stats = [
    { label: "الحوادث السلوكية", value: overview.incidents,     bg: "bg-red-50",     text: "text-red-700",     border: "border-red-100" },
    { label: "التعويضات",        value: overview.compensations,  bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    { label: "أيام الغياب",      value: overview.absences,       bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100" },
    { label: "إشعارات الأهالي",  value: overview.notifications,  bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className={`text-xs font-medium ${s.text} mt-0.5`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* By Degree + Top Violations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Degree distribution */}
        <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4">
          <p className="text-sm font-bold text-gray-900 mb-3">الحوادث بالدرجة</p>
          <div className="space-y-2">
            {(overview.byDegree ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">لا توجد حوادث</p>
            ) : (overview.byDegree ?? []).map((row: any) => {
              const deg = DEGREE_LABELS[row.degree] ?? DEGREE_LABELS["1"];
              return (
                <div key={row.degree} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${deg.bg} ${deg.text} ${deg.border} w-16 text-center shrink-0`}>
                    {deg.label}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${deg.bg.replace("bg-", "bg-").replace("-50", "-400")}`}
                      style={{ width: `${Math.min(100, (row.cnt / (overview.incidents || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-600 w-6 text-left">{row.cnt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top violations */}
        <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4">
          <p className="text-sm font-bold text-gray-900 mb-3">أكثر المخالفات</p>
          <div className="space-y-2">
            {(overview.topViolations ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">لا توجد بيانات</p>
            ) : (overview.topViolations ?? []).map((v: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-700 truncate flex-1">{v.categoryName ?? "غير محدد"}</span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{v.cnt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INCIDENTS TAB
// ============================================================

function IncidentsTab() {
  const [showForm, setShowForm]   = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [form,     setForm]       = useState({
    studentId: "", categoryId: "", degree: "1", description: "", actionTaken: "", incidentDate: new Date().toISOString().split("T")[0],
  });

  const { data, loading, refetch } = useApi(() => schoolApi.getBehaviorIncidents(), []);
  const incidents: any[] = (data as any)?.data ?? [];

  const { data: catsData }   = useApi(() => schoolApi.listViolationCategories(), []);
  const categories: any[]    = (catsData as any)?.data ?? [];

  const { data: constsData } = useApi(() => schoolApi.getBehaviorConstants(), []);
  const deductions           = (constsData as any)?.data?.deductionByDegree ?? {};

  const handleSubmit = async () => {
    if (!form.studentId) return;
    setSaving(true);
    try {
      await schoolApi.createBehaviorIncident({
        studentId:    form.studentId,
        categoryId:   form.categoryId || null,
        degree:       form.degree,
        description:  form.description || null,
        actionTaken:  form.actionTaken || null,
        incidentDate: form.incidentDate,
      });
      setShowForm(false);
      setForm({ studentId: "", categoryId: "", degree: "1", description: "", actionTaken: "", incidentDate: new Date().toISOString().split("T")[0] });
      refetch();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه الحادثة؟")) return;
    await schoolApi.deleteBehaviorIncident(id);
    refetch();
  };

  const handleResolve = async (id: string) => {
    await schoolApi.updateBehaviorIncident(id, { status: "resolved" });
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">إجمالي {incidents.length} حادثة</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          تسجيل حادثة
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <IncidentForm
          form={form}
          setForm={setForm}
          categories={categories}
          deductions={deductions}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* List */}
      {loading ? <LoadingSkeleton /> : incidents.length === 0 ? (
        <EmptyState icon={AlertTriangle} text="لا توجد حوادث مسجّلة" />
      ) : (
        <div className="space-y-2">
          {incidents.map((inc: any) => {
            const deg    = DEGREE_LABELS[inc.degree] ?? DEGREE_LABELS["1"];
            const status = INCIDENT_STATUS_LABELS[inc.status] ?? INCIDENT_STATUS_LABELS.open;
            return (
              <div key={inc.id} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: inc.categoryColor ? inc.categoryColor + "22" : "#fef3c7", color: inc.categoryColor ?? "#92400e" }}
                  >
                    {inc.degree}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{inc.studentName}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${deg.bg} ${deg.text} ${deg.border}`}>
                        {deg.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.cls}`}>
                        {status.label}
                      </span>
                      {inc.deductionPoints > 0 && (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                          -{inc.deductionPoints} نقطة
                        </span>
                      )}
                    </div>
                    {inc.categoryName && (
                      <p className="text-xs text-gray-500 mt-0.5">{inc.categoryName}</p>
                    )}
                    {inc.description && (
                      <p className="text-xs text-gray-600 mt-1">{inc.description}</p>
                    )}
                    {inc.actionTaken && (
                      <p className="text-xs text-gray-400 mt-0.5">الإجراء: {inc.actionTaken}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">{fmtHijri(inc.incidentDate)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {inc.status === "open" && (
                      <button
                        onClick={() => handleResolve(inc.id)}
                        title="تحديد كمحلولة"
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inc.id)}
                      title="حذف"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// INCIDENT FORM
// ============================================================

function IncidentForm({
  form, setForm, categories, deductions, saving, onSubmit, onCancel,
}: any) {
  const { data: studentsData } = useApi(() => schoolApi.listStudents({}), []);
  const allStudents: any[] = (studentsData as any)?.data ?? [];

  const deductionPreview = deductions[form.degree] ?? 0;

  return (
    <div className="bg-gray-50 rounded-2xl border border-[#eef2f6] p-4 space-y-3">
      <p className="text-sm font-bold text-gray-900">تسجيل حادثة سلوكية</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">الطالب</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm((p: any) => ({ ...p, studentId: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <option value="">اختر الطالب</option>
            {allStudents.map((s: any) => (
              <option key={s.id} value={s.id}>{s.fullName} — {s.classRoomGrade ?? ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">التصنيف</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((p: any) => ({ ...p, categoryId: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <option value="">بدون تصنيف</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">الدرجة — الخصم: {deductionPreview} نقطة</label>
          <select
            value={form.degree}
            onChange={(e) => setForm((p: any) => ({ ...p, degree: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            {["1","2","3","4","5"].map((d) => (
              <option key={d} value={d}>درجة {d} — خصم {deductions[d] ?? 0} نقطة</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">تاريخ الحادثة</label>
          <input
            type="date"
            value={form.incidentDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setForm((p: any) => ({ ...p, incidentDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">الوصف</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
            placeholder="تفاصيل الحادثة..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">الإجراء المتخذ</label>
          <input
            type="text"
            value={form.actionTaken}
            onChange={(e) => setForm((p: any) => ({ ...p, actionTaken: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
            placeholder="ما الإجراء الذي تم اتخاذه؟"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={saving || !form.studentId}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          تسجيل
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[#eef2f6] text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors">
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ============================================================
// COMPENSATIONS TAB
// ============================================================

function CompensationsTab() {
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({
    studentId: "", compensationType: "participation", description: "", pointsAdded: 5,
    compensationDate: new Date().toISOString().split("T")[0],
  });

  const { data, loading, refetch } = useApi(() => schoolApi.getBehaviorCompensations(), []);
  const compensations: any[] = (data as any)?.data ?? [];

  const { data: constsData } = useApi(() => schoolApi.getBehaviorConstants(), []);
  const compTypes: any[]     = (constsData as any)?.data?.compensationTypes ?? [];

  const handleSubmit = async () => {
    if (!form.studentId) return;
    setSaving(true);
    try {
      await schoolApi.createBehaviorCompensation(form);
      setShowForm(false);
      setForm({ studentId: "", compensationType: "participation", description: "", pointsAdded: 5, compensationDate: new Date().toISOString().split("T")[0] });
      refetch();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا التعويض؟")) return;
    await schoolApi.deleteBehaviorCompensation(id);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">إجمالي {compensations.length} تعويض</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة تعويض
        </button>
      </div>

      {showForm && (
        <CompensationForm
          form={form}
          setForm={setForm}
          compTypes={compTypes}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? <LoadingSkeleton /> : compensations.length === 0 ? (
        <EmptyState icon={Star} text="لا توجد تعويضات مسجّلة" />
      ) : (
        <div className="space-y-2">
          {compensations.map((comp: any) => (
            <div key={comp.id} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900">{comp.studentName}</p>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    +{comp.pointsAdded} نقطة
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{comp.compensationType}</p>
                {comp.description && <p className="text-xs text-gray-500 mt-0.5">{comp.description}</p>}
                <p className="text-[10px] text-gray-400 mt-1">{fmtHijri(comp.compensationDate)}</p>
              </div>
              <button
                onClick={() => handleDelete(comp.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompensationForm({ form, setForm, compTypes, saving, onSubmit, onCancel }: any) {
  const { data: studentsData } = useApi(() => schoolApi.listStudents({}), []);
  const allStudents: any[] = (studentsData as any)?.data ?? [];

  return (
    <div className="bg-gray-50 rounded-2xl border border-[#eef2f6] p-4 space-y-3">
      <p className="text-sm font-bold text-gray-900">إضافة تعويض سلوكي</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">الطالب</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm((p: any) => ({ ...p, studentId: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          >
            <option value="">اختر الطالب</option>
            {allStudents.map((s: any) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">نوع التعويض</label>
          <select
            value={form.compensationType}
            onChange={(e) => setForm((p: any) => ({ ...p, compensationType: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          >
            {compTypes.length > 0 ? compTypes.map((t: any) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            )) : (
              <>
                <option value="participation">المشاركة الإيجابية</option>
                <option value="excellence">التميز الأكاديمي</option>
                <option value="behavior_improvement">تحسن ملحوظ في السلوك</option>
                <option value="attendance_perfect">الانتظام والمواظبة</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">النقاط المضافة (1-20)</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.pointsAdded}
            onChange={(e) => setForm((p: any) => ({ ...p, pointsAdded: Number(e.target.value) }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">التاريخ</label>
          <input
            type="date"
            value={form.compensationDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setForm((p: any) => ({ ...p, compensationDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">ملاحظة</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
            placeholder="تفاصيل إضافية..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={saving || !form.studentId}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
          إضافة
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[#eef2f6] text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors">
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ATTENDANCE TAB (غياب مُبرر / غير مُبرر + إشعارات)
// ============================================================

function AttendanceTab() {
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [notifForm,     setNotifForm]     = useState({
    studentId: "", notificationType: "sms", message: "", sentTo: "",
  });

  const { data, loading, refetch } = useApi(() => schoolApi.getGuardianNotifications(), []);
  const notifications: any[] = (data as any)?.data ?? [];

  const { data: constsData } = useApi(() => schoolApi.getBehaviorConstants(), []);
  const escalation: any[]    = (constsData as any)?.data?.absenceEscalation ?? [];

  const handleSendNotif = async () => {
    if (!notifForm.studentId) return;
    setSaving(true);
    try {
      await schoolApi.createGuardianNotification(notifForm);
      setShowNotifForm(false);
      setNotifForm({ studentId: "", notificationType: "sms", message: "", sentTo: "" });
      refetch();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Escalation guide */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4">
        <p className="text-sm font-bold text-gray-900 mb-3">جدول تصعيد الغياب</p>
        <div className="space-y-2">
          {escalation.map((step: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="w-16 text-center font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5 shrink-0">
                {step.days} أيام
              </span>
              <span className="text-gray-600 flex-1">{step.action}</span>
              {step.notifyGuardian && (
                <Bell className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Guardian notifications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900">إشعارات أولياء الأمور ({notifications.length})</p>
          <button
            onClick={() => setShowNotifForm(!showNotifForm)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            إشعار جديد
          </button>
        </div>

        {showNotifForm && (
          <NotifForm
            form={notifForm}
            setForm={setNotifForm}
            saving={saving}
            onSubmit={handleSendNotif}
            onCancel={() => setShowNotifForm(false)}
          />
        )}

        {loading ? <LoadingSkeleton /> : notifications.length === 0 ? (
          <EmptyState icon={Bell} text="لا توجد إشعارات مُسجَّلة" />
        ) : (
          <div className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{n.studentName}</p>
                    <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                      {NOTIF_TYPE_LABELS[n.notificationType] ?? n.notificationType}
                    </span>
                  </div>
                  {n.sentTo && <p className="text-xs text-gray-500 mt-0.5">إلى: {n.sentTo}</p>}
                  {n.message && <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{n.notificationDate}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotifForm({ form, setForm, saving, onSubmit, onCancel }: any) {
  const { data: studentsData } = useApi(() => schoolApi.listStudents({}), []);
  const allStudents: any[] = (studentsData as any)?.data ?? [];

  return (
    <div className="bg-gray-50 rounded-2xl border border-[#eef2f6] p-4 space-y-3 mb-3">
      <p className="text-sm font-bold text-gray-900">إشعار لولي أمر</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">الطالب</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm((p: any) => ({ ...p, studentId: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          >
            <option value="">اختر الطالب</option>
            {allStudents.map((s: any) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">طريقة التواصل</label>
          <select
            value={form.notificationType}
            onChange={(e) => setForm((p: any) => ({ ...p, notificationType: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          >
            <option value="sms">رسالة نصية</option>
            <option value="call">اتصال هاتفي</option>
            <option value="meeting">اجتماع</option>
            <option value="letter">خطاب رسمي</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">المُرسَل إليه</label>
          <input
            type="text"
            value={form.sentTo}
            onChange={(e) => setForm((p: any) => ({ ...p, sentTo: e.target.value }))}
            placeholder="اسم أو رقم ولي الأمر"
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">الرسالة</label>
          <input
            type="text"
            value={form.message}
            onChange={(e) => setForm((p: any) => ({ ...p, message: e.target.value }))}
            placeholder="نص الإشعار..."
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={saving || !form.studentId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          تسجيل الإشعار
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[#eef2f6] text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors">
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SCORES TAB
// ============================================================

function ScoresTab() {
  const [recalculating, setRecalculating] = useState(false);
  const { data, loading, refetch } = useApi(() => schoolApi.getBehaviorScores(), []);
  const scores: any[] = (data as any)?.data ?? [];

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await schoolApi.recalculateBehaviorScores();
      refetch();
    } catch {} finally { setRecalculating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{scores.length} طالب محسوبة نقاطهم</p>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-3 py-2 border border-[#eef2f6] text-gray-600 rounded-xl text-xs font-medium hover:bg-[#f8fafc] disabled:opacity-50 transition-colors"
        >
          {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          إعادة الحساب
        </button>
      </div>

      {loading ? <LoadingSkeleton /> : scores.length === 0 ? (
        <div className="space-y-2">
          <EmptyState icon={ShieldCheck} text="لا توجد نقاط محسوبة بعد" />
          <p className="text-xs text-center text-gray-400">اضغط «إعادة الحساب» لبناء جدول النقاط</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scores.map((s: any, i: number) => (
            <div key={s.id} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-300 font-bold w-5 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.studentName}</p>
                      {s.classGrade && (
                        <p className="text-[11px] text-gray-400">{s.classGrade} / فصل {s.className}</p>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <p className={`text-lg font-bold tabular-nums ${scoreColor(s.totalScore)}`}>{s.totalScore}</p>
                      <p className={`text-[10px] font-medium ${scoreColor(s.totalScore)}`}>{scoreLabel(s.totalScore)}</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-16 shrink-0">السلوك</span>
                      <ScoreBar value={s.behaviorScore} color="bg-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-600 w-8 text-left">{s.behaviorScore}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-16 shrink-0">المواظبة</span>
                      <ScoreBar value={s.attendanceScore} color="bg-blue-400" />
                      <span className="text-[10px] font-bold text-blue-600 w-8 text-left">{s.attendanceScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse bg-[#f1f5f9] rounded-2xl h-20" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] py-16 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-[#f8fafc] flex items-center justify-center">
        <Icon className="w-7 h-7 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-400">{text}</p>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export function SchoolBehaviorPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">السلوك والمواظبة</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          لائحة تنظيم سلوك الطلاب — وزارة التعليم السعودية
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f1f5f9] rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon   = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview"      && <OverviewTab />}
      {activeTab === "incidents"     && <IncidentsTab />}
      {activeTab === "compensations" && <CompensationsTab />}
      {activeTab === "attendance"    && <AttendanceTab />}
      {activeTab === "scores"        && <ScoresTab />}
    </div>
  );
}
