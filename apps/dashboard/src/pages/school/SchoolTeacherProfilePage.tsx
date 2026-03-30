import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight, UserRoundCheck, Phone, Mail, IdCard, BookOpen,
  Calendar, CheckCircle2, XCircle, ChevronLeft, Send, KeyRound,
  X, Copy, Check, MessageSquare, ExternalLink, Loader2,
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
    ? encodeURIComponent(`مرحباً ${result.teacherName}،\nتمت دعوتك كمعلم في ${result.orgName} على منصة نسق.\n\nرابط تفعيل الحساب:\n${result.inviteLink}\n\nكلمة المرور المؤقتة: ${result.tempPassword}`)
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
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

  const { data: assignData, loading: assignLoading, error: assignError } = useApi(
    () => schoolApi.getTeacherAssignments(teacherId!),
    [teacherId]
  );
  const { data: schedData, loading: schedLoading } = useApi(
    () => schoolApi.getTeacherSchedule(teacherId!),
    [teacherId]
  );

  const teacher    = (assignData as any)?.data?.teacher;
  const assignments: any[] = (assignData as any)?.data?.assignments ?? [];
  const schedEntries: any[] = (schedData as any)?.data?.entries ?? [];

  if (assignLoading) {
    return (
      <div dir="rtl" className="p-6 space-y-4 animate-pulse">
        <div className="h-6 w-40 bg-gray-100 rounded-xl" />
        <div className="h-36 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
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
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
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
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">غير نشط</span>
              )}
              {hasAccount ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-brand-50 text-brand-700 border border-brand-100">حساب مفعّل</span>
              ) : hasInvite ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-100">دعوة معلقة</span>
              ) : null}
            </div>
            {teacher.subject && (
              <p className="text-sm text-gray-500 mt-0.5">{teacher.subject}</p>
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
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2", color.split(" ")[0])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[1])} />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Assignments */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">الفصول والمواد المرتبطة</h2>
          <span className="text-xs text-gray-400">{assignments.length} ارتباط</span>
        </div>
        {assignments.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">لا توجد ارتباطات بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {assignments.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {a.subject || "—"}
                    {(a.classRoomGrade || a.grade) && (
                      <span className="text-xs text-gray-400 mr-2">{a.classRoomGrade || a.grade}</span>
                    )}
                  </p>
                  {a.classRoomName && (
                    <p className="text-xs text-gray-400 mt-0.5">{a.classRoomName}</p>
                  )}
                </div>
                {a.classRoomId && (
                  <button
                    onClick={() => navigate(`/school/classes/${a.classRoomId}`)}
                    className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Schedule this week */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
            {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
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
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2">ملاحظات</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{teacher.notes}</p>
        </section>
      )}

      {showInvite && <InviteModal teacher={teacher} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
