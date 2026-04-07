import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Search, Pencil, Trash2, X, Loader2, CheckCircle2, UserCheck, Calendar,
         Send, Copy, Check, Mail, MessageSquare, KeyRound, ExternalLink } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { PageFAQ } from "@/components/school/PageFAQ";

// ── Invite Modal ──────────────────────────────────────────────

interface InviteResult {
  inviteLink: string;
  tempPassword: string;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  sentEmail: boolean;
  teacherName: string;
  orgName: string;
}

function InviteModal({ teacher, onClose }: { teacher: any; onClose: () => void }) {
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<InviteResult | null>(null);
  const [error,    setError]    = useState("");
  const [copied,   setCopied]   = useState<string | null>(null);

  const copyText = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async () => {
    setLoading(true); setError("");
    try {
      const res = await schoolApi.inviteTeacher(teacher.id);
      setResult(res.data);
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ");
    } finally { setLoading(false); }
  };

  const whatsappMsg = result
    ? encodeURIComponent(
        `مرحباً ${result.teacherName}،\nتمت دعوتك كمعلم في ${result.orgName} على منصة ترميز OS.\n\nرابط تفعيل الحساب:\n${result.inviteLink}\n\nكلمة المرور المؤقتة: ${result.tempPassword}`
      )
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">إرسال بيانات الدخول</h2>
              <p className="text-[11px] text-gray-400">{teacher.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              {/* Pre-generate info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                {teacher.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>جوال: <span dir="ltr" className="font-mono">{teacher.phone}</span></span>
                  </div>
                )}
                {teacher.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span>بريد: {teacher.email}</span>
                  </div>
                )}
                {!teacher.phone && !teacher.email && (
                  <p className="text-amber-600 text-xs">يجب إضافة رقم الجوال أو البريد الإلكتروني للمعلم أولاً.</p>
                )}
              </div>

              <p className="text-xs text-gray-500">
                سيتم إنشاء حساب للمعلم وإرسال رابط التفعيل وكلمة مرور مؤقتة.
                {teacher.email && " سيُرسل بريد إلكتروني تلقائياً."}
              </p>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || (!teacher.phone && !teacher.email)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-10 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إنشاء وإرسال بيانات الدخول
              </button>
            </>
          ) : (
            <>
              {/* Success — show all channels */}
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                تم إنشاء الحساب بنجاح
                {result.sentEmail && " • تم إرسال بريد إلكتروني"}
              </div>

              {/* Invite link */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">رابط التفعيل (صالح 7 أيام)</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="flex-1 text-xs text-gray-600 font-mono truncate" dir="ltr">{result.inviteLink}</span>
                  <button
                    onClick={() => copyText(result.inviteLink, "link")}
                    className="shrink-0 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    {copied === "link" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === "link" ? "تم" : "نسخ"}
                  </button>
                </div>
              </div>

              {/* Temp credentials */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">بيانات الدخول المؤقتة</p>
                <div className="grid grid-cols-2 gap-2">
                  {result.phone && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 mb-0.5">رقم الجوال</p>
                      <p className="text-xs font-mono font-bold text-gray-800" dir="ltr">{result.phone}</p>
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-amber-600 mb-0.5">كلمة المرور المؤقتة</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-mono font-bold text-amber-800 flex-1">{result.tempPassword}</p>
                      <button onClick={() => copyText(result.tempPassword, "pw")} className="text-amber-600 hover:text-amber-700">
                        {copied === "pw" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Send channels */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">إرسال عبر</p>
                <div className="grid grid-cols-2 gap-2">
                  {result.whatsappPhone && (
                    <a
                      href={`https://wa.me/${result.whatsappPhone}?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold h-10 rounded-xl transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      واتساب
                    </a>
                  )}
                  {result.email && (
                    <div className={`flex items-center justify-center gap-2 text-xs font-bold h-10 rounded-xl border ${
                      result.sentEmail
                        ? "bg-brand-50 border-brand-200 text-brand-700"
                        : "bg-gray-100 border-gray-200 text-gray-400"
                    }`}>
                      <Mail className="w-3.5 h-3.5" />
                      {result.sentEmail ? "أُرسل بريد" : "لا يوجد SMTP"}
                    </div>
                  )}
                  <button
                    onClick={() => copyText(`${result.inviteLink}\nكلمة المرور: ${result.tempPassword}`, "all")}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold h-10 rounded-xl transition-colors col-span-full"
                  >
                    {copied === "all" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === "all" ? "تم النسخ" : "نسخ الرابط + كلمة المرور"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────
interface Teacher {
  id: string;
  fullName: string;
  employeeNumber?: string | null;
  subject?: string | null;
  subjects?: string[] | null;
  phone?: string | null;
  email?: string | null;
  nationalId?: string | null;
  gender?: "ذكر" | "أنثى" | null;
  qualification?: string | null;
  notes?: string | null;
  isActive: boolean;
}

const EMPTY_FORM = {
  fullName: "",
  employeeNumber: "",
  subjects: [] as string[],
  phone: "",
  email: "",
  nationalId: "",
  gender: "" as "" | "ذكر" | "أنثى",
  qualification: "",
  notes: "",
  isActive: true,
};

type FormState = typeof EMPTY_FORM;

// ── Page ──────────────────────────────────────────────────
export function SchoolTeachersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [invitingTeacher, setInvitingTeacher] = useState<Teacher | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => schoolApi.listTeachers(),
    []
  );
  const refresh = refetch;

  const { data: setupData } = useApi(() => schoolApi.getSetupStatus(), []);
  const schoolStage: string = setupData?.data?.stage ?? "متوسط";
  const { data: gradesData } = useApi(() => schoolApi.getSetupGrades(schoolStage), [schoolStage]);
  const subjectOptions: string[] = gradesData?.data?.subjects ?? [];

  const teachers: Teacher[] = (data as any)?.data ?? [];

  const filtered = teachers.filter((t) => {
    const matchesSearch =
      !search ||
      t.fullName.includes(search) ||
      t.subject?.includes(search) ||
      t.subjects?.some(s => s.includes(search)) ||
      t.employeeNumber?.includes(search);
    const matchesActive =
      activeFilter === "all" ||
      (activeFilter === "active" && t.isActive) ||
      (activeFilter === "inactive" && !t.isActive);
    return matchesSearch && matchesActive;
  });

  const openNew = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (t: Teacher) => {
    setEditTarget(t);
    const initialSubjects = t.subjects?.length
      ? t.subjects
      : t.subject ? [t.subject] : [];
    setForm({
      fullName: t.fullName,
      employeeNumber: t.employeeNumber ?? "",
      subjects: initialSubjects,
      phone: t.phone ?? "",
      email: t.email ?? "",
      nationalId: t.nationalId ?? "",
      gender: (t.gender as "" | "ذكر" | "أنثى") ?? "",
      qualification: t.qualification ?? "",
      notes: t.notes ?? "",
      isActive: t.isActive,
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormError("");
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) { setFormError("اسم المعلم مطلوب"); return; }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        fullName: form.fullName.trim(),
        employeeNumber: form.employeeNumber || null,
        subject: form.subjects[0] || null,
        phone: form.phone || null,
        email: form.email || null,
        nationalId: form.nationalId || null,
        gender: form.gender || null,
        qualification: form.qualification || null,
        notes: form.notes || null,
        isActive: form.isActive,
      };
      if (editTarget) {
        await schoolApi.updateTeacher(editTarget.id, payload);
      } else {
        await schoolApi.createTeacher(payload);
      }
      closeForm();
      refresh();
    } catch (err: any) {
      setFormError(err.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Teacher) => {
    if (!confirm(`حذف المعلم "${t.fullName}"؟`)) return;
    setDeleting(t.id);
    try {
      await schoolApi.deleteTeacher(t.id);
      refresh();
    } catch {}
    finally { setDeleting(null); }
  };

  const set = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // ── Stats ────────────────────────────────────────────────
  const total  = teachers.length;
  const active = teachers.filter((t) => t.isActive).length;

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Header banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 p-6 text-white">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">المعلمون</h1>
            <p className="text-sm text-gray-400 mt-0.5">إدارة هيئة التدريس وبياناتهم</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/40"
          >
            <Plus className="w-4 h-4" />
            إضافة معلم
          </button>
        </div>
        {/* KPI strip */}
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">إجمالي المعلمين</p>
            <p className="text-2xl font-black mt-0.5">{total}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">نشطون</p>
            <p className="text-2xl font-black mt-0.5 text-emerald-400">{active}</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث باسم المعلم أو المادة أو الرقم الوظيفي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "all" ? "الكل" : f === "active" ? "نشط" : "غير نشط"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <X className="w-4 h-4 shrink-0" />
          {(error as any)?.message ?? "حدث خطأ في تحميل البيانات"}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="font-semibold text-gray-700">
            {search ? "لا توجد نتائج" : "لا يوجد معلمون بعد"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? "جرّب كلمة بحث أخرى" : "أضف أول معلم الآن"}
          </p>
          {!search && (
            <button
              onClick={openNew}
              className="mt-4 flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة معلم
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black text-base shrink-0">
                    {t.fullName[0]}
                  </div>
                  <div>
                    <button
                      onClick={() => navigate(`/school/teachers/${t.id}`)}
                      className="text-sm font-bold text-gray-900 leading-tight hover:text-emerald-700 transition-colors text-right"
                    >{t.fullName}</button>
                    {(t.subjects?.length ? t.subjects : t.subject ? [t.subject] : []).length > 0 && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5 leading-relaxed">
                        {(t.subjects?.length ? t.subjects : [t.subject!]).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.isActive
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}>
                  {t.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500">
                {t.employeeNumber && (
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span>رقم وظيفي: {t.employeeNumber}</span>
                  </div>
                )}
                {t.phone && (
                  <div className="flex items-center gap-2" dir="ltr">
                    <span className="text-gray-300 font-bold">☎</span>
                    <span>{t.phone}</span>
                  </div>
                )}
                {t.gender && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">●</span>
                    <span>{t.gender}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setInvitingTeacher(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 py-1.5 rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  دعوة
                </button>
                <button
                  onClick={() => navigate(`/school/teachers/${t.id}/schedule`)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 py-1.5 rounded-lg transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  الجدول
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 py-1.5 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  disabled={deleting === t.id}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PageFAQ pageId="teachers" />

      {/* ── Invite Modal ── */}
      {invitingTeacher && (
        <InviteModal
          teacher={invitingTeacher}
          onClose={() => setInvitingTeacher(null)}
        />
      )}

      {/* ── Form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={closeForm}>
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden modal-content-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900">
                {editTarget ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}
              </h2>
              <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* الاسم */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    الاسم الكامل <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="أحمد محمد العتيبي"
                    autoFocus
                  />
                </div>

                {/* الرقم الوظيفي */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">الرقم الوظيفي</label>
                  <input
                    type="text"
                    value={form.employeeNumber}
                    onChange={(e) => set("employeeNumber", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="EMP-001"
                    dir="ltr"
                  />
                </div>

                {/* المواد */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    المواد الدراسية
                    {form.subjects.length > 0 && (
                      <span className="mr-1.5 text-emerald-600">({form.subjects.length} محدد)</span>
                    )}
                  </label>
                  {subjectOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {subjectOptions.map((s) => {
                        const checked = form.subjects.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const cur = form.subjects;
                              set("subjects", checked ? cur.filter(x => x !== s) : [...cur, s]);
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                              checked
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={form.subjects[0] ?? ""}
                      onChange={(e) => set("subjects", e.target.value ? [e.target.value] : [])}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                      placeholder="الرياضيات"
                    />
                  )}
                </div>

                {/* الجنس */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">الجنس</label>
                  <select
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors bg-white"
                  >
                    <option value="">اختر...</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                {/* المؤهل */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">المؤهل العلمي</label>
                  <input
                    type="text"
                    value={form.qualification}
                    onChange={(e) => set("qualification", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="بكالوريوس تربية"
                  />
                </div>

                {/* الجوال */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">الجوال</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="05XXXXXXXX"
                  />
                </div>

                {/* الإيميل */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="teacher@school.edu.sa"
                  />
                </div>

                {/* رقم الهوية */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">رقم الهوية</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.nationalId}
                    onChange={(e) => set("nationalId", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="1XXXXXXXXX"
                  />
                </div>

                {/* ملاحظات */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors resize-none"
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>

                {/* نشط */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => set("isActive", e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                    />
                    <span className="text-sm font-medium text-gray-700">معلم نشط</span>
                  </label>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
              <button
                onClick={closeForm}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {editTarget ? "حفظ التعديلات" : "إضافة المعلم"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
