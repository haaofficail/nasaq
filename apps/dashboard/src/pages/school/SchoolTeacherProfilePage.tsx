import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight, UserRoundCheck, Phone, Mail, IdCard, BookOpen,
  Calendar, CheckCircle2, XCircle, ChevronLeft, Send, KeyRound,
  X, Copy, Check, MessageSquare, ExternalLink, Loader2, Save, ClipboardList,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

const DAY_LABELS: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

const SCHOOL_DAYS = [0, 1, 2, 3, 4]; // الأحد – الخميس

// ── Invite Modal (same as SchoolTeachersPage but standalone) ───────────
interface InviteResult {
  inviteLink: string; tempPassword: string; phone: string | null;
  whatsappPhone: string | null; email: string | null;
  sentEmail: boolean; teacherName: string; orgName: string;
}

function InviteModal({ teacher, onClose }: { teacher: any; onClose: () => void }) {
  const [loading, setLoading]   = useState(false);
  const [result,  setResult]    = useState<InviteResult | null>(null);
  const [error,   setError]     = useState("");
  const [copied,  setCopied]    = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async () => {
    setLoading(true); setError("");
    try { const res = await schoolApi.inviteTeacher(teacher.id); setResult(res.data); }
    catch (e: any) { setError(e.message ?? "حدث خطأ"); }
    finally { setLoading(false); }
  };

  const wa = result
    ? encodeURIComponent(`مرحباً ${result.teacherName}،\nتمت دعوتك كمعلم في ${result.orgName} على منصة ترميز OS.\n\nرابط تفعيل الحساب:\n${result.inviteLink}\n\nكلمة المرور المؤقتة: ${result.tempPassword}`)
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6]">
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
                    <span dir="ltr" className="font-mono text-xs">{teacher.email}</span>
                  </div>
                )}
                {!teacher.phone && !teacher.email && (
                  <p className="text-amber-600 text-xs">لا يوجد جوال أو بريد إلكتروني مسجّل</p>
                )}
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
              <button
                onClick={handleGenerate} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11 rounded-xl transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إنشاء رابط الدعوة
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[11px] text-gray-400 mb-1.5">رابط التفعيل</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs font-mono text-gray-700 break-all">{result.inviteLink}</p>
                  <button onClick={() => copy(result.inviteLink, "link")} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 shrink-0">
                    {copied === "link" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[11px] text-amber-600 mb-1">كلمة المرور المؤقتة</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-bold text-amber-800" dir="ltr">{result.tempPassword}</code>
                  <button onClick={() => copy(result.tempPassword, "pass")} className="p-1.5 rounded-lg hover:bg-amber-200 text-amber-600 shrink-0">
                    {copied === "pass" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {result.sentEmail && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> تم إرسال البيانات عبر البريد الإلكتروني
                </p>
              )}
              {result.whatsappPhone && (
                <a
                  href={`https://wa.me/${result.whatsappPhone}?text=${wa}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-sm h-10 rounded-xl transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> إرسال عبر واتساب
                </a>
              )}
              <button onClick={() => copy(`رابط: ${result.inviteLink}\nكلمة المرور: ${result.tempPassword}`, "all")}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm h-9 rounded-xl transition-colors">
                {copied === "all" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                نسخ الكل
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export function SchoolTeacherProfilePage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncMsg,    setSyncMsg]    = useState("");

  const { data: assignData, loading: assignLoading, error: assignError, refetch: refetchAssign } = useApi(
    () => schoolApi.getTeacherAssignments(teacherId!),
    [teacherId]
  );
  const { data: schedData, loading: schedLoading } = useApi(
    () => schoolApi.getTeacherSchedule(teacherId!),
    [teacherId]
  );
  const { data: subjectsData } = useApi(() => schoolApi.listSubjects(), []);
  const { data: classesData  } = useApi(() => schoolApi.listClassRooms(), []);
  const { data: dailyLogsData, loading: logsLoading } = useApi(
    () => schoolApi.getTeacherDailyLogs({ teacherId: teacherId! }),
    [teacherId]
  );

  const teacher    = (assignData as any)?.data?.teacher;
  const dailyLogs: any[] = (dailyLogsData as any)?.data ?? [];
  const assignments: any[] = (assignData as any)?.data?.assignments ?? [];
  const allSubjects: any[] = (subjectsData as any)?.data ?? [];
  const allClasses:  any[] = (classesData as any)?.data  ?? [];

  // Derive checked state from assignments
  const assignedSubjects  = new Set<string>(assignments.map((a: any) => a.subject).filter(Boolean));
  const assignedClassIds  = new Set<string>(assignments.map((a: any) => a.classRoomId).filter(Boolean));

  // Also include subjects from teacher profile (teacher.subjects array)
  const profileSubjects: string[] = teacher?.subjects ?? [];
  profileSubjects.forEach(s => assignedSubjects.add(s));

  // المصدر الموحد للمواد: subjects table + مواد الارتباطات الموجودة (لضمان عدم فقدان بيانات قديمة)
  const subjectNamesFromDB = allSubjects.map((s: any) => s.name as string);
  const mergedSubjectNames = [...new Set([...subjectNamesFromDB, ...Array.from(assignedSubjects)])].sort();

  const [checkedSubjects,  setCheckedSubjects]  = useState<Set<string>>(new Set());
  const [checkedClassIds,  setCheckedClassIds]   = useState<Set<string>>(new Set());
  const [syncInit, setSyncInit] = useState(false);

  useEffect(() => {
    if (!syncInit && teacher) {
      setCheckedSubjects(new Set(profileSubjects.length > 0 ? profileSubjects : Array.from(assignedSubjects)));
      setCheckedClassIds(new Set(assignedClassIds));
      setSyncInit(true);
    }
  }, [teacher, assignments]);

  const toggleSubject = (s: string) => setCheckedSubjects(prev => {
    const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n;
  });
  const toggleClass = (id: string) => setCheckedClassIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const handleSyncAssignments = async () => {
    setSyncSaving(true); setSyncMsg("");
    try {
      await schoolApi.syncTeacherAssignments(teacherId!, {
        subjects:     Array.from(checkedSubjects),
        classRoomIds: Array.from(checkedClassIds),
      });
      setSyncMsg("تم الحفظ");
      refetchAssign();
    } catch (e: any) {
      setSyncMsg(e?.message ?? "حدث خطأ");
    } finally {
      setSyncSaving(false);
    }
  };
  const schedEntries: any[] = (schedData as any)?.data?.entries ?? [];

  if (assignLoading) {
    return (
      <div dir="rtl" className="p-6 space-y-4 animate-pulse">
        <div className="h-6 w-40 bg-[#f1f5f9] rounded-xl" />
        <div className="h-36 bg-[#f1f5f9] rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#f1f5f9] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (assignError || !teacher) {
    return (
      <div dir="rtl" className="p-6">
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
          <p className="text-red-500 text-sm">{assignError ?? "المعلم غير موجود"}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline">العودة</button>
        </div>
      </div>
    );
  }

  const initials = teacher.fullName?.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("") ?? "م";
  const hasAccount = !!teacher.userId;
  const hasInvite  = !!teacher.inviteToken;

  // Group schedule entries by day
  const byDay: Record<number, any[]> = {};
  for (const e of schedEntries) {
    if (!byDay[e.dayOfWeek]) byDay[e.dayOfWeek] = [];
    byDay[e.dayOfWeek].push(e);
  }

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowRight className="w-4 h-4" /> المعلمون
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-xl">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">{teacher.fullName}</h1>
              {teacher.isActive ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">نشط</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-[#eef2f6]">غير نشط</span>
              )}
              {hasAccount ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-brand-50 text-brand-700 border border-brand-100">حساب مفعّل</span>
              ) : hasInvite ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-100">دعوة معلقة</span>
              ) : null}
            </div>
            {(teacher.subjects?.length ? teacher.subjects : teacher.subject ? [teacher.subject] : []).length > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                {(teacher.subjects?.length ? teacher.subjects : [teacher.subject]).join(" · ")}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {teacher.phone && (
                <a href={`tel:${teacher.phone}`} className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  <span dir="ltr" className="font-mono">{teacher.phone}</span>
                </a>
              )}
              {teacher.email && (
                <a href={`mailto:${teacher.email}`} className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                  <Mail className="w-3.5 h-3.5" />
                  <span dir="ltr">{teacher.email}</span>
                </a>
              )}
              {teacher.employeeNumber && (
                <span className="flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5" />
                  {teacher.employeeNumber}
                </span>
              )}
              {teacher.qualification && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {teacher.qualification}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> دعوة
            </button>
            <button
              onClick={() => navigate(`/school/teachers/${teacherId}/schedule`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-medium transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" /> الجدول
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "الفصول المرتبطة", value: assignments.length, icon: BookOpen, color: "bg-brand-50 text-brand-600" },
          { label: "الحصص هذا الأسبوع", value: schedEntries.filter(e => !e.isBreak).length, icon: Calendar, color: "bg-violet-50 text-violet-600" },
          { label: "أيام التدريس", value: Object.keys(byDay).length, icon: UserRoundCheck, color: "bg-emerald-50 text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#eef2f6] p-4 text-center">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2", color.split(" ")[0])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[1])} />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* المواد والفصول — checkboxes */}
      <section className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#eef2f6] flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">المواد والفصول</h2>
          <div className="flex items-center gap-2">
            {syncMsg && (
              <span className={clsx(
                "text-xs font-semibold",
                syncMsg === "تم الحفظ" ? "text-emerald-600" : "text-red-500"
              )}>{syncMsg}</span>
            )}
            <button
              onClick={handleSyncAssignments}
              disabled={syncSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              {syncSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              حفظ
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* المواد */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500">المواد التي يدرّسها</p>
              {mergedSubjectNames.length > 0 && (
                <button
                  onClick={() =>
                    checkedSubjects.size === mergedSubjectNames.length
                      ? setCheckedSubjects(new Set())
                      : setCheckedSubjects(new Set(mergedSubjectNames))
                  }
                  className="text-[11px] text-brand-500 hover:text-brand-700 font-medium"
                >
                  {checkedSubjects.size === mergedSubjectNames.length ? "إلغاء الكل" : "تحديد الكل"}
                </button>
              )}
            </div>
            {mergedSubjectNames.length === 0 ? (
              <p className="text-xs text-gray-400">
                لا توجد مواد —{" "}
                <button
                  onClick={() => navigate("/school/subjects")}
                  className="text-emerald-600 hover:underline"
                >
                  أضف من صفحة المواد
                </button>
              </p>
            ) : (
              <div className="space-y-2">
                {mergedSubjectNames.map((name) => (
                  <label key={name} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checkedSubjects.has(name)}
                      onChange={() => toggleSubject(name)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* الفصول */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500">الفصول المخصصة له</p>
              {allClasses.length > 0 && (
                <button
                  onClick={() =>
                    checkedClassIds.size === allClasses.length
                      ? setCheckedClassIds(new Set())
                      : setCheckedClassIds(new Set(allClasses.map((cr: any) => cr.id)))
                  }
                  className="text-[11px] text-brand-500 hover:text-brand-700 font-medium"
                >
                  {checkedClassIds.size === allClasses.length ? "إلغاء الكل" : "تحديد الكل"}
                </button>
              )}
            </div>
            {allClasses.length === 0 ? (
              <p className="text-xs text-gray-400">لا توجد فصول — أضف فصولاً أولاً</p>
            ) : (
              <div className="space-y-2">
                {allClasses.map((cr: any) => (
                  <label key={cr.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checkedClassIds.has(cr.id)}
                      onChange={() => toggleClass(cr.id)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {cr.grade} — فصل {cr.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {checkedSubjects.size > 0 && checkedClassIds.size > 0 && (
          <div className="px-5 pb-4">
            <p className="text-xs text-gray-400">
              سيتم إنشاء <strong className="text-gray-700">{checkedSubjects.size * checkedClassIds.size}</strong> ارتباط ({checkedSubjects.size} {checkedSubjects.size === 1 ? "مادة" : "مواد"} × {checkedClassIds.size} {checkedClassIds.size === 1 ? "فصل" : "فصول"})
            </p>
          </div>
        )}
      </section>

      {/* Schedule this week */}
      <section className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">جدول الأسبوع الحالي</h2>
          <button
            onClick={() => navigate(`/school/teachers/${teacherId}/schedule`)}
            className="text-xs text-brand-500 hover:underline flex items-center gap-1"
          >
            الجدول الكامل <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        {schedLoading ? (
          <div className="p-6 space-y-2 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-[#f1f5f9] rounded-xl" />)}
          </div>
        ) : schedEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">لا يوجد جدول للأسبوع الحالي</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {SCHOOL_DAYS.filter(d => byDay[d]).map(day => (
              <div key={day} className="px-5 py-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">{DAY_LABELS[day]}</p>
                <div className="flex flex-wrap gap-2">
                  {byDay[day].filter((e: any) => !e.isBreak).map((e: any) => (
                    <div key={e.id} className="flex items-center gap-1.5 bg-brand-50 border border-brand-100 rounded-xl px-3 py-1.5">
                      <span className="text-xs text-brand-600 font-medium">
                        {e.periodNumber ? `ح${e.periodNumber}` : e.label || "—"}
                      </span>
                      {e.startTime && e.endTime && (
                        <span className="text-[10px] text-brand-400" dir="ltr">{e.startTime}–{e.endTime}</span>
                      )}
                      {e.subject && (
                        <span className="text-xs text-gray-700">{e.subject}</span>
                      )}
                      {e.className && (
                        <span className="text-[10px] bg-white border border-brand-100 rounded-lg px-1.5 text-brand-500">{e.className}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      {teacher.notes && (
        <section className="bg-white rounded-2xl border border-[#eef2f6] p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2">ملاحظات</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{teacher.notes}</p>
        </section>
      )}

      {/* السجل اليومي */}
      <section className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-bold text-gray-900">السجل اليومي</h2>
          </div>
          {dailyLogs.length > 0 && (
            <span className="text-xs text-gray-400">{dailyLogs.length} يومية</span>
          )}
        </div>
        {logsLoading ? (
          <div className="p-5 space-y-2 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-[#f1f5f9] rounded-xl" />)}
          </div>
        ) : dailyLogs.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">لم يُسجَّل أي يومية بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {dailyLogs.slice(0, 15).map((log: any) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700">{log.date}</span>
                    {log.subjectName && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[10px] bg-brand-50 text-brand-600 border border-brand-100">{log.subjectName}</span>
                    )}
                    {log.studentEngagement && (
                      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] border ${
                        log.studentEngagement === "high"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : log.studentEngagement === "low"
                          ? "bg-red-50 text-red-600 border-red-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      }`}>
                        {log.studentEngagement === "high" ? "تفاعل عالٍ" : log.studentEngagement === "low" ? "تفاعل منخفض" : "تفاعل متوسط"}
                      </span>
                    )}
                    {log.studentsAbsent?.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[10px] bg-red-50 text-red-600 border border-red-100">
                        {log.studentsAbsent.length} غائب
                      </span>
                    )}
                  </div>
                  {log.topicCovered && (
                    <p className="text-sm text-gray-800 mt-0.5 font-medium">{log.topicCovered}</p>
                  )}
                  {log.notes && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{log.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showInvite && <InviteModal teacher={teacher} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
