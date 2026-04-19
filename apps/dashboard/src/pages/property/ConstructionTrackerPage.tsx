import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import {
  Plus, X, ChevronRight, TrendingUp, Banknote, Calendar,
  Wrench, FileText, Building, HardHat, User, ClipboardCheck,
  ArrowUpRight, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
type Tab = "general" | "phases" | "logs" | "costs" | "payments" | "change_orders" | "inspections";
type StatusFilter = "all" | "planning" | "in_progress" | "completed" | "on_hold";

const TABS: { id: Tab; label: string }[] = [
  { id: "general",       label: "ملف المشروع" },
  { id: "phases",        label: "المراحل" },
  { id: "inspections",   label: "المعاينات" },
  { id: "logs",          label: "السجل اليومي" },
  { id: "costs",         label: "التكاليف" },
  { id: "payments",      label: "المستخلصات" },
  { id: "change_orders", label: "أوامر التغيير" },
];

const STATUS_FILTER_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all",         label: "الكل" },
  { id: "planning",    label: "تخطيط" },
  { id: "in_progress", label: "تنفيذ" },
  { id: "completed",   label: "مكتمل" },
  { id: "on_hold",     label: "موقوف" },
];

const PROJECT_TYPES = [
  { value: "new_build",   label: "بناء جديد" },
  { value: "renovation",  label: "ترميم" },
  { value: "expansion",   label: "توسعة" },
  { value: "finishing",   label: "تشطيب" },
  { value: "maintenance", label: "صيانة كبرى" },
];

const PROJECT_STATUS_AR: Record<string, string> = {
  planning:    "تخطيط",
  in_progress: "تنفيذ",
  completed:   "مكتمل",
  on_hold:     "موقوف",
};

const PROJECT_STATUS_CLS: Record<string, string> = {
  planning:    "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-emerald-100 text-emerald-700",
  on_hold:     "bg-gray-100 text-gray-600",
};

const COST_CATEGORIES = ["مواد البناء", "عمالة", "معدات", "مشاورات هندسية", "تراخيص", "أخرى"];
const WEATHER_OPTIONS = ["صافٍ", "غائم جزئياً", "غائم", "ممطر", "عاصف", "شديد الحرارة"];
const INSPECTION_TYPES = ["معاينة بنيوية", "معاينة كهربائية", "معاينة سباكة", "معاينة إطفاء", "معاينة إجمالية", "تسليم ابتدائي", "تسليم نهائي"];
const INSPECTION_STATUS = [
  { value: "scheduled", label: "مجدول" },
  { value: "passed",    label: "اجتاز" },
  { value: "failed",    label: "رُفض" },
  { value: "pending",   label: "معلق" },
];

// ── Helpers ────────────────────────────────────────────────
const inputCls = "w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 bg-white";

function fmt(n: any) {
  return Number(n ?? 0).toLocaleString("en-US");
}

function ProgressBar({ value, color = "bg-brand-500" }: { value: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", PROJECT_STATUS_CLS[status] ?? "bg-gray-100 text-gray-600")}>
      {PROJECT_STATUS_AR[status] ?? status}
    </span>
  );
}

// ── Modal wrapper ──────────────────────────────────────────
function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eef2f6] shrink-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">{children}</div>
        <div className="flex gap-3 px-6 py-4 border-t border-[#eef2f6] shrink-0">{footer}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PROJECT LIST
// ══════════════════════════════════════════════════════════

function ProjectList({ onSelect }: { onSelect: (id: string) => void }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreate, setShowCreate]     = useState(false);

  const { data: listData, loading, error, refetch } = useApi(
    () => propertyApi.construction.list(),
    []
  );
  const { data: propertiesData } = useApi(() => propertyApi.properties.list(), []);
  const properties: any[] = (propertiesData as any)?.data ?? [];

  const allProjects: any[] = (listData as any)?.data ?? [];
  const projects = statusFilter === "all"
    ? allProjects
    : allProjects.filter((p) => p.status === statusFilter);

  // Create project form
  const [form, setForm] = useState({
    propertyId: "", projectName: "", projectType: "new_build", status: "planning",
    mainContractor: "", engineeringOffice: "", budget: "", startDate: "", expectedEndDate: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!form.propertyId || !form.projectName) {
      toast.error("يرجى اختيار العقار وكتابة اسم المشروع");
      return;
    }
    setSaving(true);
    try {
      const res = await propertyApi.construction.create({
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
      });
      const newId = (res as any)?.data?.id;
      toast.success("تم إنشاء المشروع");
      setShowCreate(false);
      setForm({ propertyId: "", projectName: "", projectType: "new_build", status: "planning",
        mainContractor: "", engineeringOffice: "", budget: "", startDate: "", expectedEndDate: "", notes: "" });
      refetch();
      if (newId) {
        // Optionally generate default phases
        try { await propertyApi.construction.phasesTemplate(newId); } catch {}
        onSelect(newId);
      }
    } catch (e: any) {
      toast.error(`فشل الإنشاء: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">متتبع الإنشاء</h1>
          <p className="text-sm text-gray-400 mt-0.5">متابعة مشاريع البناء والتشطيب والترميم</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          مشروع جديد
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 w-fit overflow-x-auto">
        {STATUS_FILTER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
              statusFilter === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
            {t.id !== "all" && (
              <span className="mr-1 text-gray-400">
                ({allProjects.filter((p) => p.status === t.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Projects grid */}
      {loading ? (
        <SkeletonRows rows={4} />
      ) : error ? (
        <div className="p-4 text-red-600 bg-red-50 rounded-xl text-sm">{error}</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#eef2f6]">
          <div className="w-14 h-14 rounded-2xl bg-[#f8fafc] flex items-center justify-center mb-3">
            <HardHat className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">
            {statusFilter === "all" ? "لا توجد مشاريع إنشاء" : `لا توجد مشاريع في حالة "${STATUS_FILTER_TABS.find(t=>t.id===statusFilter)?.label}"`}
          </p>
          {statusFilter === "all" && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-semibold"
            >
              <Plus className="w-4 h-4" />
              إنشاء مشروع جديد
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p: any) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="group bg-white rounded-2xl border border-[#eef2f6] p-5 text-right hover:border-brand-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{p.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                    <Building className="w-3 h-3 shrink-0" />
                    {p.propertyName ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={p.status} />
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>الإنجاز</span>
                  <span className="font-semibold text-gray-700">{p.progressPercent ?? 0}%</span>
                </div>
                <ProgressBar
                  value={p.progressPercent ?? 0}
                  color={p.status === "completed" ? "bg-emerald-500" : p.status === "on_hold" ? "bg-gray-400" : "bg-brand-500"}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                {p.mainContractor ? (
                  <span className="flex items-center gap-1 truncate"><HardHat className="w-3 h-3 shrink-0" />{p.mainContractor}</span>
                ) : <span />}
                {p.budget ? (
                  <span className="font-semibold text-gray-600">{fmt(p.budget)} ر.س</span>
                ) : <span />}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal
          title="مشروع إنشاء جديد"
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {saving ? "جاري الإنشاء..." : "إنشاء المشروع"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 border border-[#eef2f6] text-gray-700 rounded-xl text-sm font-medium hover:bg-[#f8fafc] transition-colors"
              >
                إلغاء
              </button>
            </>
          }
        >
          <Field label="العقار" required>
            <select className={inputCls} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">اختر العقار</option>
              {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          <Field label="اسم المشروع" required>
            <input className={inputCls} value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="مثال: تشطيب برج الياسمين" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع المشروع">
              <select className={inputCls} value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })}>
                {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="الحالة الابتدائية">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="planning">تخطيط</option>
                <option value="in_progress">تنفيذ</option>
              </select>
            </Field>
          </div>

          <Field label="المقاول الرئيسي">
            <input className={inputCls} value={form.mainContractor} onChange={(e) => setForm({ ...form, mainContractor: e.target.value })} placeholder="اسم المقاول أو الشركة" />
          </Field>

          <Field label="المكتب الهندسي">
            <input className={inputCls} value={form.engineeringOffice} onChange={(e) => setForm({ ...form, engineeringOffice: e.target.value })} placeholder="اسم مكتب الاستشارات الهندسية" />
          </Field>

          <Field label="الميزانية الإجمالية (ر.س)">
            <input type="number" className={inputCls} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="0" min={0} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ البدء">
              <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="تاريخ الانتهاء المتوقع">
              <input type="date" className={inputCls} value={form.expectedEndDate} onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })} />
            </Field>
          </div>

          <Field label="ملاحظات">
            <textarea className={inputCls + " resize-none h-20"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="وصف المشروع أو ملاحظات..." />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// GENERAL TAB (ملف المشروع)
// ══════════════════════════════════════════════════════════

function GeneralTab({ project, constructionId, onRefetch }: { project: any; constructionId: string; onRefetch: () => void }) {
  const budget   = Number(project?.budget ?? 0);
  const actual   = Number(project?.actualCost ?? 0);
  const progress = Number(project?.progressPercent ?? 0);
  const overrun  = budget > 0 && actual > budget;

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-brand-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{progress}%</p>
          <p className="text-xs text-brand-600 mt-1">نسبة الإنجاز</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-lg font-bold text-emerald-700">{fmt(budget)}</p>
          <p className="text-xs text-emerald-600 mt-1">الميزانية ر.س</p>
        </div>
        <div className={clsx("rounded-2xl p-4 text-center", overrun ? "bg-red-50" : "bg-[#f8fafc]")}>
          <p className={clsx("text-lg font-bold", overrun ? "text-red-700" : "text-gray-700")}>{fmt(actual)}</p>
          <p className="text-xs text-gray-500 mt-1">الفعلي ر.س</p>
        </div>
        <div className="bg-violet-50 rounded-2xl p-4 text-center">
          <p className="text-sm font-bold text-violet-700">
            {project?.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : "—"}
          </p>
          <p className="text-xs text-violet-600 mt-1">تاريخ الانتهاء</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-gray-700">نسبة الإنجاز الكلية</span>
          <span className="font-bold text-brand-600">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Construction file */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-500" />
          ملف المشروع
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Building,    label: "العقار",             value: project?.propertyName },
            { icon: HardHat,     label: "نوع المشروع",        value: PROJECT_TYPES.find(t => t.value === project?.projectType)?.label ?? project?.projectType },
            { icon: User,        label: "المقاول الرئيسي",    value: project?.mainContractor },
            { icon: ClipboardCheck, label: "المكتب الهندسي",  value: project?.engineeringOffice },
            { icon: Calendar,    label: "تاريخ البدء",        value: project?.startDate ? new Date(project.startDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : null },
            { icon: TrendingUp,  label: "التاريخ المتوقع",    value: project?.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : null },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#f8fafc] flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
        {project?.notes && (
          <div className="pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
            <p className="text-sm text-gray-700">{project.notes}</p>
          </div>
        )}
      </div>

      {/* Budget vs actual */}
      {budget > 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4 space-y-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-semibold text-gray-700">الميزانية مقابل الفعلي</span>
            <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", overrun ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
              {overrun ? "تجاوز الميزانية" : "ضمن الميزانية"}
            </span>
          </div>
          <ProgressBar value={(actual / budget) * 100} color={overrun ? "bg-red-500" : "bg-emerald-500"} />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>{fmt(budget)} ر.س</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PHASES TAB
// ══════════════════════════════════════════════════════════

function PhasesTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error, refetch } = useApi(() => propertyApi.construction.phases(constructionId), [constructionId]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState({ name: "", specialty: "", startDate: "", endDate: "" });
  const [saving, setSaving]         = useState(false);
  const phases: any[] = (data as any)?.data ?? [];

  async function updateProgress(phaseId: string, progress: number) {
    setUpdatingId(phaseId);
    try {
      await propertyApi.construction.updatePhase(constructionId, phaseId, { progressPercent: progress });
      refetch();
    } catch (e: any) { toast.error(`فشل التحديث: ${e.message}`); }
    finally { setUpdatingId(null); }
  }

  async function addPhase() {
    if (!form.name) { toast.error("يرجى كتابة اسم المرحلة"); return; }
    setSaving(true);
    try {
      await propertyApi.construction.addPhase(constructionId, form);
      toast.success("تمت إضافة المرحلة");
      setShowAdd(false);
      setForm({ name: "", specialty: "", startDate: "", endDate: "" });
      refetch();
    } catch (e: any) { toast.error(`فشل الإضافة: ${e.message}`); }
    finally { setSaving(false); }
  }

  if (loading) return <SkeletonRows rows={5} />;
  if (error)   return <div className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-semibold">
          <Plus className="w-4 h-4" /> إضافة مرحلة
        </button>
      </div>

      {phases.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد مراحل — يمكنك إضافتها يدوياً</div>
      ) : phases.map((phase: any) => (
        <div key={phase.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-900 text-sm">{phase.name}</span>
              {phase.specialty && <span className="text-xs text-gray-400 mr-2">· {phase.specialty}</span>}
            </div>
            <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold",
              phase.status === "completed"  ? "bg-emerald-100 text-emerald-700" :
              phase.status === "in_progress"? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-600"
            )}>
              {phase.status === "completed" ? "مكتمل" : phase.status === "in_progress" ? "جاري" : "لم يبدأ"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ProgressBar value={phase.progressPercent ?? 0} />
            <span className="text-xs font-bold text-gray-700 min-w-[36px]">{phase.progressPercent ?? 0}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            defaultValue={phase.progressPercent ?? 0}
            onMouseUp={(e) => updateProgress(phase.id, Number((e.target as HTMLInputElement).value))}
            disabled={updatingId === phase.id}
            className="w-full accent-brand-500"
          />
        </div>
      ))}

      {showAdd && (
        <Modal title="إضافة مرحلة" onClose={() => setShowAdd(false)} footer={
          <>
            <button onClick={addPhase} disabled={saving} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
              {saving ? "جاري..." : "إضافة"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-[#eef2f6] text-gray-700 rounded-xl text-sm hover:bg-[#f8fafc]">إلغاء</button>
          </>
        }>
          <Field label="اسم المرحلة" required>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: حفر الأساسات" />
          </Field>
          <Field label="التخصص">
            <input className={inputCls} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="مثال: مدني، كهربائي، سباكة..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ البدء">
              <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="تاريخ الانتهاء">
              <input type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// INSPECTIONS TAB (مواعيد المعاينة)
// ══════════════════════════════════════════════════════════

function InspectionsTab({ constructionId }: { constructionId: string }) {
  // Store inspections as daily logs with type = "inspection"
  const { data, loading, error, refetch } = useApi(
    () => propertyApi.construction.dailyLogs(constructionId),
    [constructionId]
  );
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    logDate: "", inspectionType: "معاينة إجمالية",
    inspectionStatus: "scheduled", inspector: "", engineeringOffice: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const allLogs: any[] = (data as any)?.data ?? [];
  const inspections = allLogs.filter((l: any) => l.type === "inspection");

  async function addInspection() {
    if (!form.logDate) { toast.error("يرجى تحديد تاريخ المعاينة"); return; }
    setSaving(true);
    try {
      await propertyApi.construction.addDailyLog(constructionId, {
        logDate: form.logDate,
        notes: form.notes,
        type: "inspection",
        inspectionType: form.inspectionType,
        inspectionStatus: form.inspectionStatus,
        reportedBy: form.inspector,
        engineeringOffice: form.engineeringOffice,
      });
      toast.success("تمت إضافة المعاينة");
      setShowAdd(false);
      setForm({ logDate: "", inspectionType: "معاينة إجمالية", inspectionStatus: "scheduled", inspector: "", engineeringOffice: "", notes: "" });
      refetch();
    } catch (e: any) { toast.error(`فشل الإضافة: ${e.message}`); }
    finally { setSaving(false); }
  }

  const statusIcon = (s: string) => {
    if (s === "passed")  return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === "failed")  return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (s === "scheduled") return <Clock className="w-4 h-4 text-brand-500" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  if (loading) return <SkeletonRows rows={4} />;
  if (error)   return <div className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-semibold">
          <Plus className="w-4 h-4" /> جدول معاينة
        </button>
      </div>

      {inspections.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد مواعيد معاينة مجدولة</div>
      ) : (
        <div className="space-y-3">
          {inspections.map((ins: any) => (
            <div key={ins.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  {statusIcon(ins.inspectionStatus ?? "scheduled")}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ins.inspectionType ?? "معاينة"}</p>
                    <p className="text-xs text-gray-400">
                      {ins.logDate ? new Date(ins.logDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : "—"}
                    </p>
                  </div>
                </div>
                <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  ins.inspectionStatus === "passed"    ? "bg-emerald-100 text-emerald-700" :
                  ins.inspectionStatus === "failed"    ? "bg-red-100 text-red-700" :
                  ins.inspectionStatus === "scheduled" ? "bg-brand-100 text-brand-700" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {INSPECTION_STATUS.find(s => s.value === ins.inspectionStatus)?.label ?? ins.inspectionStatus}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                {ins.reportedBy && <span className="flex items-center gap-1"><User className="w-3 h-3" />{ins.reportedBy}</span>}
                {ins.engineeringOffice && <span className="flex items-center gap-1"><ClipboardCheck className="w-3 h-3" />{ins.engineeringOffice}</span>}
              </div>
              {ins.notes && <p className="text-xs text-gray-500 mt-2">{ins.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="جدولة معاينة" onClose={() => setShowAdd(false)} footer={
          <>
            <button onClick={addInspection} disabled={saving} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
              {saving ? "جاري..." : "إضافة المعاينة"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-[#eef2f6] text-gray-700 rounded-xl text-sm hover:bg-[#f8fafc]">إلغاء</button>
          </>
        }>
          <Field label="تاريخ المعاينة" required>
            <input type="date" className={inputCls} value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع المعاينة">
              <select className={inputCls} value={form.inspectionType} onChange={(e) => setForm({ ...form, inspectionType: e.target.value })}>
                {INSPECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="الحالة">
              <select className={inputCls} value={form.inspectionStatus} onChange={(e) => setForm({ ...form, inspectionStatus: e.target.value })}>
                {INSPECTION_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="اسم المفتش">
            <input className={inputCls} value={form.inspector} onChange={(e) => setForm({ ...form, inspector: e.target.value })} placeholder="اسم المهندس أو الجهة المعاينة" />
          </Field>
          <Field label="المكتب الهندسي">
            <input className={inputCls} value={form.engineeringOffice} onChange={(e) => setForm({ ...form, engineeringOffice: e.target.value })} placeholder="اسم مكتب الاستشارات" />
          </Field>
          <Field label="ملاحظات المعاينة">
            <textarea className={inputCls + " resize-none h-20"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="نتائج المعاينة، الملاحظات..." />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// LOGS TAB
// ══════════════════════════════════════════════════════════

function LogsTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error, refetch } = useApi(() => propertyApi.construction.dailyLogs(constructionId), [constructionId]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ logDate: "", notes: "", weather: "", reportedBy: "", workersCount: "" });
  const [saving, setSaving] = useState(false);

  const allLogs: any[] = (data as any)?.data ?? [];
  const logs = allLogs.filter((l: any) => l.type !== "inspection");

  async function addLog() {
    if (!form.logDate || !form.notes) { toast.error("يرجى تحديد التاريخ وكتابة الملاحظات"); return; }
    setSaving(true);
    try {
      await propertyApi.construction.addDailyLog(constructionId, { ...form, type: "log" });
      toast.success("تمت إضافة السجل");
      setShowAdd(false);
      setForm({ logDate: "", notes: "", weather: "", reportedBy: "", workersCount: "" });
      refetch();
    } catch (e: any) { toast.error(`فشل الإضافة: ${e.message}`); }
    finally { setSaving(false); }
  }

  if (loading) return <SkeletonRows rows={5} />;
  if (error)   return <div className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-semibold">
          <Plus className="w-4 h-4" /> سجل يومي
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد سجلات يومية</div>
      ) : logs.map((log: any) => (
        <div key={log.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-900 text-sm">
              {log.logDate ? new Date(log.logDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : "—"}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {log.weather && <span>{log.weather}</span>}
              {log.reportedBy && <span>· {log.reportedBy}</span>}
            </div>
          </div>
          {log.notes && <p className="text-sm text-gray-600">{log.notes}</p>}
        </div>
      ))}

      {showAdd && (
        <Modal title="سجل يومي جديد" onClose={() => setShowAdd(false)} footer={
          <>
            <button onClick={addLog} disabled={saving} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
              {saving ? "جاري..." : "إضافة السجل"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-[#eef2f6] text-gray-700 rounded-xl text-sm hover:bg-[#f8fafc]">إلغاء</button>
          </>
        }>
          <Field label="التاريخ" required>
            <input type="date" className={inputCls} value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الطقس">
              <select className={inputCls} value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })}>
                <option value="">اختر</option>
                {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="عدد العمال">
              <input type="number" className={inputCls} value={form.workersCount} onChange={(e) => setForm({ ...form, workersCount: e.target.value })} min={0} placeholder="0" />
            </Field>
          </div>
          <Field label="المُبلِّغ">
            <input className={inputCls} value={form.reportedBy} onChange={(e) => setForm({ ...form, reportedBy: e.target.value })} placeholder="اسم المشرف" />
          </Field>
          <Field label="ملاحظات اليوم" required>
            <textarea className={inputCls + " resize-none h-24"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ما تم إنجازه اليوم، المشكلات، التعليمات..." />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COSTS TAB
// ══════════════════════════════════════════════════════════

function CostsTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error, refetch } = useApi(() => propertyApi.construction.costs(constructionId), [constructionId]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: "", category: "مواد البناء", amount: "", date: "" });
  const [saving, setSaving] = useState(false);
  const costs: any[] = (data as any)?.data ?? [];

  const total = costs.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const byCat: Record<string, number> = {};
  costs.forEach((c) => { byCat[c.category ?? "أخرى"] = (byCat[c.category ?? "أخرى"] ?? 0) + Number(c.amount ?? 0); });

  async function addCost() {
    if (!form.description || !form.amount) { toast.error("يرجى ملء الوصف والمبلغ"); return; }
    setSaving(true);
    try {
      await propertyApi.construction.addCost(constructionId, { ...form, amount: Number(form.amount) });
      toast.success("تمت إضافة التكلفة");
      setShowAdd(false);
      setForm({ description: "", category: "مواد البناء", amount: "", date: "" });
      refetch();
    } catch (e: any) { toast.error(`فشل الإضافة: ${e.message}`); }
    finally { setSaving(false); }
  }

  if (loading) return <SkeletonRows rows={5} />;
  if (error)   return <div className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gray-800">
          الإجمالي: <span className="text-brand-600">{fmt(total)} ر.س</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-semibold">
          <Plus className="w-4 h-4" /> تكلفة جديدة
        </button>
      </div>

      {Object.keys(byCat).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(byCat).map(([cat, val]) => (
            <div key={cat} className="bg-brand-50 rounded-xl p-3 text-center">
              <p className="font-bold text-brand-700 text-sm">{fmt(val)}</p>
              <p className="text-xs text-brand-500 mt-0.5">{cat}</p>
            </div>
          ))}
        </div>
      )}

      {costs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد تكاليف مسجلة</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[#eef2f6]">
              <tr>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">الوصف</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">الفئة</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">المبلغ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {costs.map((c: any) => (
                <tr key={c.id} className="hover:bg-[#f8fafc]/60">
                  <td className="px-[10px] py-[6px] text-gray-800 font-medium">{c.description ?? "—"}</td>
                  <td className="px-[10px] py-[6px] text-gray-500 text-xs">{c.category ?? "—"}</td>
                  <td className="px-[10px] py-[6px] font-semibold text-gray-900">{fmt(c.amount)} ر.س</td>
                  <td className="px-[10px] py-[6px] text-gray-400 text-xs">{c.date ? new Date(c.date).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="إضافة تكلفة" onClose={() => setShowAdd(false)} footer={
          <>
            <button onClick={addCost} disabled={saving} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
              {saving ? "جاري..." : "إضافة"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-[#eef2f6] text-gray-700 rounded-xl text-sm hover:bg-[#f8fafc]">إلغاء</button>
          </>
        }>
          <Field label="الوصف" required>
            <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف التكلفة" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الفئة">
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="المبلغ (ر.س)" required>
              <input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min={0} placeholder="0" />
            </Field>
          </div>
          <Field label="التاريخ">
            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PAYMENTS TAB
// ══════════════════════════════════════════════════════════

function PaymentsTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error, refetch } = useApi(() => propertyApi.construction.payments(constructionId), [constructionId]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", contractor: "" });
  const [saving, setSaving] = useState(false);
  const payments: any[] = (data as any)?.data ?? [];

  async function approve(paymentId: string) {
    setApprovingId(paymentId);
    try { await propertyApi.construction.approvePayment(constructionId, paymentId); toast.success("تم اعتماد المستخلص"); refetch(); }
    catch (e: any) { toast.error(`فشل الاعتماد: ${e.message}`); }
    finally { setApprovingId(null); }
  }

  async function addPayment() {
    if (!form.description || !form.amount) { toast.error("يرجى ملء الوصف والمبلغ"); return; }
    setSaving(true);
    try {
      await propertyApi.construction.addPayment(constructionId, { ...form, amount: Number(form.amount) });
      toast.success("تمت إضافة المستخلص");
      setShowAdd(false);
      setForm({ description: "", amount: "", contractor: "" });
      refetch();
    } catch (e: any) { toast.error(`فشل الإضافة: ${e.message}`); }
    finally { setSaving(false); }
  }

  if (loading) return <SkeletonRows rows={4} />;
  if (error)   return <div className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-semibold">
          <Plus className="w-4 h-4" /> مستخلص جديد
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد مستخلصات</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[#eef2f6]">
              <tr>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">المستخلص</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">المبلغ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">الحالة</th>
                <th className="px-[10px] py-[6px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-[#f8fafc]/60">
                  <td className="px-[10px] py-[6px] font-medium text-gray-800">{p.description ?? `مستخلص #${p.id?.slice(-4)}`}</td>
                  <td className="px-[10px] py-[6px] font-semibold">{fmt(p.amount)} ر.س</td>
                  <td className="px-[10px] py-[6px]">
                    <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      p.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      p.status === "pending"  ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {p.status === "approved" ? "معتمد" : p.status === "pending" ? "معلق" : p.status}
                    </span>
                  </td>
                  <td className="px-[10px] py-[6px]">
                    {p.status === "pending" && (
                      <button onClick={() => approve(p.id)} disabled={approvingId === p.id}
                        className="text-xs px-3 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors">
                        اعتماد
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="مستخلص جديد" onClose={() => setShowAdd(false)} footer={
          <>
            <button onClick={addPayment} disabled={saving} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
              {saving ? "جاري..." : "إضافة"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-[#eef2f6] text-gray-700 rounded-xl text-sm hover:bg-[#f8fafc]">إلغاء</button>
          </>
        }>
          <Field label="الوصف" required>
            <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="مثال: مستخلص أعمال الهيكل الخرساني" />
          </Field>
          <Field label="الجهة / المقاول">
            <input className={inputCls} value={form.contractor} onChange={(e) => setForm({ ...form, contractor: e.target.value })} placeholder="اسم المقاول" />
          </Field>
          <Field label="المبلغ (ر.س)" required>
            <input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min={0} placeholder="0" />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CHANGE ORDERS TAB
// ══════════════════════════════════════════════════════════

function ChangeOrdersTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error, refetch } = useApi(() => propertyApi.construction.changeOrders(constructionId), [constructionId]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: "", costImpact: "", timeImpactDays: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const orders: any[] = (data as any)?.data ?? [];

  const totalCost = orders.reduce((s, o) => s + Number(o.costImpact ?? 0), 0);
  const totalDays = orders.reduce((s, o) => s + Number(o.timeImpactDays ?? 0), 0);

  async function addOrder() {
    if (!form.description) { toast.error("يرجى كتابة وصف أمر التغيير"); return; }
    setSaving(true);
    try {
      await propertyApi.construction.addChangeOrder(constructionId, {
        description: form.description,
        reason: form.reason,
        costImpact: form.costImpact ? Number(form.costImpact) : 0,
        timeImpactDays: form.timeImpactDays ? Number(form.timeImpactDays) : 0,
      });
      toast.success("تمت إضافة أمر التغيير");
      setShowAdd(false);
      setForm({ description: "", costImpact: "", timeImpactDays: "", reason: "" });
      refetch();
    } catch (e: any) { toast.error(`فشل الإضافة: ${e.message}`); }
    finally { setSaving(false); }
  }

  if (loading) return <SkeletonRows rows={4} />;
  if (error)   return <div className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {orders.length > 0 && (
          <div className="flex gap-4 text-xs">
            <span className="text-red-600 font-semibold">تأثير مالي: +{fmt(totalCost)} ر.س</span>
            <span className="text-amber-600 font-semibold">تأثير زمني: +{totalDays} يوم</span>
          </div>
        )}
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-semibold mr-auto">
          <Plus className="w-4 h-4" /> أمر تغيير
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">لا توجد أوامر تغيير</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[#eef2f6]">
              <tr>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">الوصف</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">تكلفة</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">أيام</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((co: any) => (
                <tr key={co.id} className="hover:bg-[#f8fafc]/60">
                  <td className="px-[10px] py-[6px] font-medium text-gray-800">{co.description ?? "—"}</td>
                  <td className={clsx("px-4 py-3 font-semibold text-xs", Number(co.costImpact) > 0 ? "text-red-600" : "text-emerald-600")}>
                    {Number(co.costImpact) > 0 ? "+" : ""}{fmt(co.costImpact)} ر.س
                  </td>
                  <td className={clsx("px-4 py-3 font-semibold text-xs", Number(co.timeImpactDays) > 0 ? "text-amber-600" : "text-gray-400")}>
                    {Number(co.timeImpactDays) > 0 ? "+" : ""}{co.timeImpactDays ?? 0}
                  </td>
                  <td className="px-[10px] py-[6px]">
                    <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      co.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      co.status === "pending"  ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {co.status === "approved" ? "معتمد" : co.status === "pending" ? "معلق" : "مرفوض"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="أمر تغيير جديد" onClose={() => setShowAdd(false)} footer={
          <>
            <button onClick={addOrder} disabled={saving} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
              {saving ? "جاري..." : "إضافة"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-[#eef2f6] text-gray-700 rounded-xl text-sm hover:bg-[#f8fafc]">إلغاء</button>
          </>
        }>
          <Field label="وصف التغيير" required>
            <textarea className={inputCls + " resize-none h-20"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ما الذي تغير وسبب التغيير..." />
          </Field>
          <Field label="السبب">
            <input className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="سبب التغيير" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تأثير مالي (ر.س)">
              <input type="number" className={inputCls} value={form.costImpact} onChange={(e) => setForm({ ...form, costImpact: e.target.value })} placeholder="0" />
            </Field>
            <Field label="تأثير زمني (يوم)">
              <input type="number" className={inputCls} value={form.timeImpactDays} onChange={(e) => setForm({ ...form, timeImpactDays: e.target.value })} placeholder="0" />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════

export function ConstructionTrackerPage() {
  const { id: urlId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab]   = useState<Tab>("general");
  const [selectedId, setSelectedId] = useState<string>(urlId ?? "");

  const { data: projectData, loading, refetch } = useApi(
    () => selectedId ? propertyApi.construction.get(selectedId) : Promise.resolve(null),
    [selectedId]
  );
  const project = (projectData as any)?.data ?? null;

  if (!selectedId) {
    return (
      <div className="p-6">
        <ProjectList onSelect={(id) => { setSelectedId(id); setActiveTab("general"); }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <button onClick={() => setSelectedId("")} className="text-brand-500 hover:text-brand-700 font-medium transition-colors">
          المشاريع
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-bold text-gray-900">{loading ? "..." : (project?.name ?? "المشروع")}</span>
        {project?.status && (
          <StatusBadge status={project.status} />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
              activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "general" && (
          loading
            ? <SkeletonRows rows={4} />
            : project
            ? <GeneralTab project={project} constructionId={selectedId} onRefetch={refetch} />
            : <div className="text-gray-400 text-center py-12">المشروع غير موجود</div>
        )}
        {activeTab === "phases"        && <PhasesTab       constructionId={selectedId} />}
        {activeTab === "inspections"   && <InspectionsTab  constructionId={selectedId} />}
        {activeTab === "logs"          && <LogsTab         constructionId={selectedId} />}
        {activeTab === "costs"         && <CostsTab        constructionId={selectedId} />}
        {activeTab === "payments"      && <PaymentsTab     constructionId={selectedId} />}
        {activeTab === "change_orders" && <ChangeOrdersTab constructionId={selectedId} />}
      </div>
    </div>
  );
}
