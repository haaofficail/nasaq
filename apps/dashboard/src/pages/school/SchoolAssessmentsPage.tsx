import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, Plus, ChevronRight, BookOpen, Users,
  CheckCircle2, Trash2, Edit3, Loader2, Save, Star,
  BarChart3, Search, X, FileText, Award, BookMarked,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

const CATEGORY_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  exam:        { label: "اختبار",         bg: "bg-red-50",     text: "text-red-700",     border: "border-red-100" },
  quiz:        { label: "اختبار قصير",    bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-100" },
  homework:    { label: "واجب منزلي",     bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100" },
  classwork:   { label: "أعمال صفية",     bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
  project:     { label: "مشروع/تكليف",   bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
  portfolio:   { label: "ملف الإنجاز",   bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-100" },
  oral:        { label: "تقييم شفهي",    bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-100" },
  performance: { label: "تقييم أدائي",   bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-100" },
  attendance:  { label: "انضباط/حضور",   bg: "bg-green-50",   text: "text-green-700",   border: "border-green-100" },
  other:       { label: "أخرى",           bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-200" },
};

const CATEGORY_OPTIONS = [
  { value: "exam",        label: "اختبار رسمي" },
  { value: "quiz",        label: "اختبار قصير" },
  { value: "homework",    label: "واجب منزلي" },
  { value: "classwork",   label: "أعمال صفية / مشاركة" },
  { value: "project",     label: "مشروع / تكليف" },
  { value: "portfolio",   label: "ملف الإنجاز" },
  { value: "oral",        label: "تقييم شفهي" },
  { value: "performance", label: "تقييم أدائي" },
  { value: "attendance",  label: "الانضباط والحضور" },
  { value: "other",       label: "أخرى" },
];

const GRADE_SCALE_OPTIONS = [
  { value: "numeric",    label: "رقمي (0–100)" },
  { value: "letter",     label: "حرفي (أ+، أ، ب+...)" },
  { value: "qualitative", label: "نوعي (ممتاز، جيد جداً...)" },
];

const EMPTY_FORM = {
  name: "", code: "", category: "exam", maxScore: 100,
  weightPct: "", gradeScale: "numeric", dueDate: "",
  notes: "", sortOrder: 0,
};

export function SchoolAssessmentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState("");

  const { data: typesData, loading, refetch } = useApi(
    () => schoolApi.listAssessmentTypes(),
    []
  );
  const { data: templatesData } = useApi(
    () => schoolApi.getStandardAssessmentTemplates(),
    []
  );

  const types: any[] = (typesData as any)?.data ?? [];
  const templates: any[] = (templatesData as any)?.data ?? [];

  const filtered = useMemo(() => {
    let list = types;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t: any) => t.name.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q));
    }
    if (filterCategory !== "all") list = list.filter((t: any) => t.category === filterCategory);
    return list;
  }, [types, search, filterCategory]);

  const grouped: Record<string, any[]> = {};
  for (const t of filtered) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  const openAdd = () => {
    setForm({ ...EMPTY_FORM }); setEditId(null); setMsg(""); setShowForm(true);
  };
  const openEdit = (t: any) => {
    setForm({
      name: t.name, code: t.code ?? "", category: t.category,
      maxScore: parseFloat(t.maxScore) ?? 100,
      weightPct: t.weightPct ?? "",
      gradeScale: t.gradeScale ?? "numeric",
      dueDate: t.dueDate ?? "",
      notes: t.notes ?? "",
      sortOrder: t.sortOrder ?? 0,
    });
    setEditId(t.id); setMsg(""); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setMsg("");
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        category: form.category,
        maxScore: Number(form.maxScore) || 100,
        weightPct: form.weightPct !== "" ? Number(form.weightPct) : null,
        gradeScale: form.gradeScale,
        dueDate: form.dueDate || null,
        notes: form.notes.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editId) {
        await schoolApi.updateAssessmentType(editId, payload);
      } else {
        await schoolApi.createAssessmentType(payload);
      }
      setMsg("تم الحفظ");
      setShowForm(false); setEditId(null);
      refetch();
    } catch (e: any) {
      setMsg(e?.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا التقييم وجميع درجاته؟")) return;
    try {
      await schoolApi.deleteAssessmentType(id);
      refetch();
    } catch { /* ignore */ }
  };

  const handleSeedStandard = async () => {
    if (!confirm("إضافة جميع التقييمات النموذجية المعتمدة من وزارة التعليم؟")) return;
    setSeeding(true);
    try {
      const res = await schoolApi.seedStandardAssessments({});
      refetch();
      setMsg(`تمت إضافة ${(res as any).count} تقييم نموذجي`);
    } catch (e: any) {
      setMsg(e?.message ?? "حدث خطأ");
    } finally {
      setSeeding(false);
    }
  };

  const stats = {
    total:  types.length,
    exams:  types.filter(t => t.category === "exam").length,
    active: types.filter(t => t.isActive).length,
    cats:   new Set(types.map(t => t.category)).size,
  };

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقييمات</h1>
          <p className="text-sm text-gray-500 mt-0.5">أنواع التقييمات النموذجية المعتمدة ورصد الدرجات</p>
        </div>
        <div className="flex items-center gap-2">
          {types.length === 0 && (
            <button
              onClick={handleSeedStandard}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium transition-colors"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              إضافة التقييمات النموذجية
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> تقييم جديد
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm ${msg.includes("خطأ") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      {types.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "إجمالي التقييمات", value: stats.total,  icon: ClipboardList, cls: "bg-brand-50 text-brand-600" },
            { label: "الاختبارات الرسمية", value: stats.exams, icon: FileText,       cls: "bg-red-50 text-red-600" },
            { label: "نشط",               value: stats.active, icon: CheckCircle2,  cls: "bg-emerald-50 text-emerald-600" },
            { label: "أنواع مختلفة",      value: stats.cats,   icon: BookMarked,    cls: "bg-purple-50 text-purple-600" },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls.split(" ")[0]}`}>
                <Icon className={`w-5 h-5 ${cls.split(" ")[1]}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {types.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم..."
              className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none"
          >
            <option value="all">كل الأنواع</option>
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-brand-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">لم تُضَف تقييمات بعد</p>
            <p className="text-xs text-gray-400 mt-1">ابدأ بإضافة التقييمات النموذجية المعتمدة أو أنشئ تقييماً مخصصاً</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={handleSeedStandard}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              إضافة التقييمات النموذجية (وزارة التعليم)
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> تقييم مخصص
            </button>
          </div>

          {/* Preview of standard templates */}
          {templates.length > 0 && (
            <div className="w-full max-w-2xl mt-4 border border-amber-100 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-xs font-semibold text-amber-700">التقييمات النموذجية المعتمدة — وزارة التعليم السعودية</p>
              </div>
              <div className="divide-y divide-gray-50">
                {templates.map((t: any) => {
                  const cat = CATEGORY_MAP[t.category];
                  return (
                    <div key={t.code} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-lg text-xs border ${cat.bg} ${cat.text} ${cat.border}`}>{cat.label}</span>
                      <span className="text-sm text-gray-800 flex-1">{t.name}</span>
                      <span className="text-xs text-gray-400 tabular-nums">{t.maxScore} نقطة</span>
                      {t.weightPct && (
                        <span className="text-xs text-brand-600 font-medium">{t.weightPct}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-10 text-center">
          <p className="text-sm text-gray-400">لا توجد نتائج</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => {
            const catInfo = CATEGORY_MAP[cat] ?? CATEGORY_MAP.other;
            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className={`px-5 py-3 border-b border-gray-50 flex items-center gap-2`}>
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${catInfo.bg} ${catInfo.text} ${catInfo.border}`}>
                    {catInfo.label}
                  </span>
                  <span className="text-xs text-gray-400">{items.length} تقييم</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                          {t.code && (
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{t.code}</span>
                          )}
                          {!t.isActive && (
                            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-lg">غير نشط</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          <span>الدرجة: <strong className="text-gray-700">{parseFloat(t.maxScore)}</strong></span>
                          {t.weightPct && <span>الوزن: <strong className="text-brand-600">{t.weightPct}%</strong></span>}
                          {t.dueDate && <span>الموعد: {t.dueDate}</span>}
                        </div>
                        {t.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{t.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => navigate(`/school/assessments/${t.id}/grades`)}
                          className="p-2 rounded-xl hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                          title="رصد الدرجات"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(t)}
                          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">{editId ? "تعديل التقييم" : "تقييم جديد"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">اسم التقييم *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="مثال: اختبار نهاية الفصل الأول"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">رمز مختصر</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="FINAL1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">النوع *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">الدرجة الكاملة</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={form.maxScore}
                    onChange={e => setForm(f => ({ ...f, maxScore: parseFloat(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">الوزن النسبي %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.weightPct}
                    onChange={e => setForm(f => ({ ...f, weightPct: e.target.value }))}
                    placeholder="مثال: 60"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">طريقة التقييم</label>
                  <select
                    value={form.gradeScale}
                    onChange={e => setForm(f => ({ ...f, gradeScale: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                  >
                    {GRADE_SCALE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none"
                  />
                </div>
              </div>
              {msg && (
                <p className={`text-xs ${msg.includes("خطأ") ? "text-red-600" : "text-emerald-600"}`}>{msg}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">إلغاء</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
