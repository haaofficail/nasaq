import { useState } from "react";
import {
  Plus, ShieldAlert, Settings2, Pencil, Trash2, CheckCircle2,
  XCircle, AlertTriangle, ChevronLeft, Circle,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";
import { fmtHijri } from "@/lib/utils";

// ── Severity config ──────────────────────────────────────────

const SEVERITIES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: "منخفضة", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  medium: { label: "متوسطة", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  high:   { label: "مرتفعة", color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
};

const STATUSES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open:       { label: "مفتوحة",   color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  resolved:   { label: "محلولة",   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  cancelled:  { label: "ملغاة",    color: "text-gray-600",    bg: "bg-gray-100",   border: "border-gray-200" },
};

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
];

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITIES[severity] ?? SEVERITIES.medium;
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", s.color, s.bg, s.border)}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status] ?? STATUSES.open;
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", s.color, s.bg, s.border)}>
      {s.label}
    </span>
  );
}

// ── Category Modal ───────────────────────────────────────────

function CategoryModal({
  open, onClose, editing, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: any | null;
  onSaved: () => void;
}) {
  const [name,        setName]        = useState(editing?.name        ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [severity,    setSeverity]    = useState(editing?.severity    ?? "medium");
  const [color,       setColor]       = useState(editing?.color       ?? "#f59e0b");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError("اسم التصنيف مطلوب"); return; }
    setSaving(true); setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim() || null, severity, color };
      if (editing) {
        await schoolApi.updateViolationCategory(editing.id, payload);
      } else {
        await schoolApi.createViolationCategory(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "تعديل التصنيف" : "تصنيف جديد"}>
      <div className="space-y-4 p-4">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <XCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم التصنيف <span className="text-red-400">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: غياب متكرر"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="وصف اختياري للتصنيف"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">درجة الخطورة</label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverity(sev)}
                className={clsx(
                  "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                  severity === sev
                    ? `${SEVERITIES[sev].bg} ${SEVERITIES[sev].color} ${SEVERITIES[sev].border}`
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {SEVERITIES[sev].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">اللون</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={clsx(
                  "w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-gray-800 scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer"
              title="لون مخصص"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء التصنيف"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Violation Modal ──────────────────────────────────────────

function ViolationModal({
  open, onClose, editing, categories, students: studentList, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: any | null;
  categories: any[];
  students: any[];
  onSaved: () => void;
}) {
  const [studentId,   setStudentId]   = useState(editing?.studentId    ?? "");
  const [categoryId,  setCategoryId]  = useState(editing?.categoryId   ?? "");
  const [description, setDescription] = useState(editing?.description  ?? "");
  const [date,        setDate]        = useState(editing?.violationDate ?? new Date().toISOString().split("T")[0]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [query,       setQuery]       = useState("");

  const filtered = studentList.filter((s) =>
    !query || s.fullName?.includes(query) || s.studentNumber?.includes(query)
  );

  const handleSave = async () => {
    if (!studentId) { setError("اختر الطالب"); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        studentId,
        categoryId:    categoryId || null,
        description:   description.trim() || null,
        violationDate: date,
      };
      if (editing) {
        await schoolApi.updateViolation(editing.id, payload);
      } else {
        await schoolApi.createViolation(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "تعديل المخالفة" : "تسجيل مخالفة"}>
      <div className="space-y-4 p-4">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <XCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Student picker */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">الطالب <span className="text-red-400">*</span></label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الطالب أو رقمه..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 mb-2"
          />
          <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-50">
            {filtered.slice(0, 30).map((s) => (
              <button
                key={s.id}
                onClick={() => { setStudentId(s.id); setQuery(s.fullName); }}
                className={clsx(
                  "w-full text-right px-3 py-2 text-sm transition-colors flex items-center justify-between",
                  studentId === s.id
                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                <span>{s.fullName}</span>
                <span className="text-xs text-gray-400">{s.studentNumber ?? ""}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">لا توجد نتائج</p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع المخالفة</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
          >
            <option value="">— بدون تصنيف —</option>
            {categories.filter((c) => c.isActive !== false).map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">تاريخ المخالفة</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="تفاصيل المخالفة (اختياري)"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "تسجيل المخالفة"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Resolve Modal ────────────────────────────────────────────

function ResolveModal({
  open, onClose, violation, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  violation: any | null;
  onSaved: () => void;
}) {
  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);

  const handleResolve = async () => {
    if (!violation) return;
    setSaving(true);
    try {
      await schoolApi.updateViolation(violation.id, {
        status: "resolved",
        resolutionNotes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="إغلاق المخالفة">
      <div className="space-y-4 p-4">
        <p className="text-sm text-gray-600">
          إغلاق مخالفة{" "}
          <strong>{violation?.studentName}</strong>
          {violation?.categoryName && ` — ${violation.categoryName}`}
        </p>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات الحل (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="ما الإجراء المتخذ؟"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResolve}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "جاري الحفظ..." : "تأكيد الإغلاق"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────

export function SchoolViolationsPage() {
  const [tab,           setTab]           = useState<"violations" | "categories">("violations");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterCatId,   setFilterCatId]   = useState("");
  const [showAddViolation, setShowAddViolation] = useState(false);
  const [editingViolation, setEditingViolation] = useState<any | null>(null);
  const [resolvingV,    setResolvingV]    = useState<any | null>(null);
  const [showAddCat,    setShowAddCat]    = useState(false);
  const [editingCat,    setEditingCat]    = useState<any | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [seeding,       setSeeding]       = useState(false);

  const { data: catData,  loading: catLoading,  refetch: refetchCats }       = useApi(() => schoolApi.listViolationCategories(), []);
  const { data: vData,    loading: vLoading,    refetch: refetchViolations } = useApi(
    () => schoolApi.listViolations({ status: filterStatus || undefined, categoryId: filterCatId || undefined }),
    [filterStatus, filterCatId]
  );
  const { data: stuData } = useApi(() => schoolApi.listStudents({}), []);

  const categories: any[]  = catData?.data  ?? [];
  const violations: any[]  = vData?.data    ?? [];
  const studentList: any[] = stuData?.data  ?? [];

  const handleDeleteViolation = async (id: string) => {
    if (!confirm("حذف هذه المخالفة نهائياً؟")) return;
    setDeletingId(id);
    try {
      await schoolApi.deleteViolation(id);
      refetchViolations();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      await schoolApi.seedDefaultViolationCategories();
      refetchCats();
    } catch {} finally {
      setSeeding(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("حذف هذا التصنيف؟ ستبقى المخالفات المرتبطة به بدون تصنيف.")) return;
    setDeletingId(id);
    try {
      await schoolApi.deleteViolationCategory(id);
      refetchCats();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div dir="rtl" className="space-y-0">

      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900 px-6 pt-8 pb-10">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/40">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-2 py-0.5">
                مخالفات الطلاب
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">المخالفات والتصنيفات</h1>
            <p className="text-sm text-gray-400 mt-1">رصد وإدارة مخالفات الطلاب بتصنيفات مرنة</p>
          </div>
          <button
            onClick={() => setShowAddViolation(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/40 hover:shadow-rose-900/60 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            تسجيل مخالفة
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5 bg-gray-50 min-h-full -mt-0">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1 w-fit -mt-5 relative z-10 shadow-sm">
          <button
            onClick={() => setTab("violations")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              tab === "violations" ? "bg-rose-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              المخالفات
              {violations.filter((v) => v.status === "open").length > 0 && (
                <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {violations.filter((v) => v.status === "open").length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setTab("categories")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              tab === "categories" ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              التصنيفات
            </span>
          </button>
        </div>

        {/* ── Violations Tab ─────────────────────────────────────── */}
        {tab === "violations" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400"
              >
                <option value="">كل الحالات</option>
                <option value="open">مفتوحة</option>
                <option value="resolved">محلولة</option>
                <option value="cancelled">ملغاة</option>
              </select>
              <select
                value={filterCatId}
                onChange={(e) => setFilterCatId(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400"
              >
                <option value="">كل الأنواع</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {vLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : violations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-rose-400" />
                </div>
                <p className="font-bold text-gray-900">لا توجد مخالفات</p>
                <p className="text-sm text-gray-400">استخدم زر "تسجيل مخالفة" لإضافة أول مخالفة</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">الطالب</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">نوع المخالفة</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">التاريخ</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">الحالة</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">الوصف</th>
                        <th className="px-4 py-3 w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {violations.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-sm">{v.studentName}</p>
                            {v.studentNumber && (
                              <p className="text-xs text-gray-400">{v.studentNumber}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {v.categoryName ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Circle className="w-2.5 h-2.5 shrink-0" style={{ color: v.categoryColor, fill: v.categoryColor }} />
                                <span className="text-sm text-gray-700">{v.categoryName}</span>
                                {v.categorySeverity && <SeverityBadge severity={v.categorySeverity} />}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 tabular-nums whitespace-nowrap">
                            {fmtHijri(v.violationDate)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={v.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                            {v.description ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {v.status === "open" && (
                                <button
                                  onClick={() => setResolvingV(v)}
                                  title="إغلاق المخالفة"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => { setEditingViolation(v); setShowAddViolation(true); }}
                                title="تعديل"
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteViolation(v.id)}
                                disabled={deletingId === v.id}
                                title="حذف"
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Categories Tab ─────────────────────────────────────── */}
        {tab === "categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-500">
                {categories.length} تصنيف — يمكنك إضافة وتعديل وحذف التصنيفات بحرية
              </p>
              <div className="flex items-center gap-2">
                {categories.length === 0 && (
                  <button
                    onClick={handleSeedDefaults}
                    disabled={seeding}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {seeding ? "جاري التحميل..." : "استيراد التصنيفات الافتراضية (وزارة التعليم)"}
                  </button>
                )}
                <button
                  onClick={() => { setEditingCat(null); setShowAddCat(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  تصنيف جديد
                </button>
              </div>
            </div>

            {catLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Settings2 className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-bold text-gray-900">لا توجد تصنيفات بعد</p>
                <p className="text-sm text-gray-400">أنشئ تصنيفاتك الخاصة لتنظيم المخالفات</p>
                <button
                  onClick={() => { setEditingCat(null); setShowAddCat(true); }}
                  className="mt-1 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  إنشاء أول تصنيف
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={clsx(
                      "bg-white rounded-2xl border p-4 hover:shadow-sm transition-all",
                      cat.isActive === false ? "opacity-60 border-gray-100" : "border-gray-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}20`, border: `2px solid ${cat.color}40` }}
                        >
                          <Circle className="w-4 h-4" style={{ color: cat.color, fill: cat.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{cat.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingCat(cat); setShowAddCat(true); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          disabled={deletingId === cat.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <SeverityBadge severity={cat.severity} />
                      {cat.isActive === false && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">غير نشط</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddViolation && (
        <ViolationModal
          open={showAddViolation}
          onClose={() => { setShowAddViolation(false); setEditingViolation(null); }}
          editing={editingViolation}
          categories={categories}
          students={studentList}
          onSaved={refetchViolations}
        />
      )}
      {showAddCat && (
        <CategoryModal
          open={showAddCat}
          onClose={() => { setShowAddCat(false); setEditingCat(null); }}
          editing={editingCat}
          onSaved={refetchCats}
        />
      )}
      {resolvingV && (
        <ResolveModal
          open={!!resolvingV}
          onClose={() => setResolvingV(null)}
          violation={resolvingV}
          onSaved={refetchViolations}
        />
      )}
    </div>
  );
}
