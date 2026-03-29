import { useState, useEffect, useCallback } from "react";
import {
  Bell, MessageCircle, Send, CheckCircle2, XCircle, Loader2,
  ToggleLeft, ToggleRight, FileText, AlertTriangle, UserCheck,
  RefreshCw, Phone, Wifi, WifiOff, QrCode, LogOut,
  Smartphone, Link2, Link2Off, Info,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const EVENT_LABELS: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  violation:          { label: "مخالفة",        icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-100" },
  absence:            { label: "غياب طالب",     icon: XCircle,       color: "text-amber-600 bg-amber-50 border-amber-100" },
  late:               { label: "تأخر طالب",     icon: Bell,          color: "text-purple-600 bg-purple-50 border-purple-100" },
  teacher_absence:    { label: "غياب معلم",     icon: UserCheck,     color: "text-orange-600 bg-orange-50 border-orange-100" },
  teacher_assignment: { label: "إسناد معلم",    icon: UserCheck,     color: "text-blue-600 bg-blue-50 border-blue-100" },
  test:               { label: "اختبار",        icon: Send,          color: "text-gray-500 bg-gray-50 border-gray-100" },
};

const PROVIDER_LABELS: Record<string, string> = {
  meta:     "Meta WhatsApp Cloud",
  unifonic: "Unifonic",
  twilio:   "Twilio",
};

const TPL_VARS: Record<string, { var: string; label: string }[]> = {
  violationMessage: [
    { var: "{school_name}",  label: "اسم المدرسة"  },
    { var: "{student_name}", label: "اسم الطالب"   },
    { var: "{grade}",        label: "الصف"         },
    { var: "{category}",     label: "نوع المخالفة" },
    { var: "{degree}",       label: "الدرجة"       },
    { var: "{date}",         label: "التاريخ"      },
  ],
  absenceMessage: [
    { var: "{school_name}",  label: "اسم المدرسة" },
    { var: "{student_name}", label: "اسم الطالب"  },
    { var: "{grade}",        label: "الصف"        },
    { var: "{date}",         label: "التاريخ"     },
  ],
  lateMessage: [
    { var: "{school_name}",  label: "اسم المدرسة"   },
    { var: "{student_name}", label: "اسم الطالب"    },
    { var: "{grade}",        label: "الصف"          },
    { var: "{date}",         label: "التاريخ"       },
    { var: "{time}",         label: "وقت الحضور"   },
  ],
  teacherAbsenceMessage: [
    { var: "{school_name}",  label: "اسم المدرسة" },
    { var: "{teacher_name}", label: "اسم المعلم"  },
    { var: "{class_name}",   label: "الفصل"       },
    { var: "{date}",         label: "التاريخ"     },
  ],
  teacherAssignMessage: [
    { var: "{school_name}", label: "اسم المدرسة" },
    { var: "{subject}",     label: "المادة"      },
    { var: "{class_name}",  label: "الفصل"       },
  ],
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "sent")
    return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5"><CheckCircle2 className="w-3 h-3" />تم الإرسال</span>;
  if (status === "failed")
    return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5"><XCircle className="w-3 h-3" />فشل</span>;
  return <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">{status}</span>;
}

function SettingToggle({
  label, desc, value, onChange,
}: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={clsx("shrink-0 transition-colors", value ? "text-emerald-600" : "text-gray-300")}
      >
        {value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
      </button>
    </div>
  );
}

function TemplateEditor({
  label, field, value, onChange, vars,
}: { label: string; field: string; value: string; onChange: (f: string, v: string) => void; vars: { var: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-700">{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={e => onChange(field, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5] focus:ring-2 focus:ring-[#5b9bd5]/10 resize-none font-mono"
        dir="rtl"
      />
      <div className="flex flex-wrap gap-1">
        {vars.map(v => (
          <button
            key={v.var}
            onClick={() => onChange(field, value + v.var)}
            className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-[#5b9bd5]/10 hover:text-[#5b9bd5] rounded-lg border border-gray-200 transition-colors"
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WhatsApp Connection Card (QR + API status)
// ─────────────────────────────────────────────

function WhatsAppConnectCard() {
  const [sessionData, setSessionData] = useState<{
    baileys: { status: string; qrBase64: string | null; phone: string | null; hasSaved: boolean };
    api:     { configured: boolean; provider: string | null };
  } | null>(null);

  const [starting,    setStarting]  = useState(false);
  const [loggingOut,  setLoggingOut] = useState(false);
  const [pollActive,  setPollActive] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await schoolApi.getWhatsAppSession();
      setSessionData(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchSession(); }, [fetchSession]);

  // Polling when connecting or qr_ready
  useEffect(() => {
    const status = sessionData?.baileys.status;
    if (status === "connecting" || status === "qr_ready") {
      setPollActive(true);
    } else {
      setPollActive(false);
    }
  }, [sessionData?.baileys.status]);

  useEffect(() => {
    if (!pollActive) return;
    const iv = setInterval(fetchSession, 3000);
    return () => clearInterval(iv);
  }, [pollActive, fetchSession]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await schoolApi.startWhatsAppSession();
      await fetchSession();
    } finally {
      setStarting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await schoolApi.logoutWhatsApp();
      await fetchSession();
    } finally {
      setLoggingOut(false);
    }
  };

  const baileys = sessionData?.baileys;
  const api     = sessionData?.api;

  // ── Connected via QR ──────────────────────────────────────
  if (baileys?.status === "connected") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-emerald-800">واتساب متصل</p>
            <p className="text-xs text-emerald-600 mt-0.5 font-mono" dir="ltr">
              +{baileys.phone}
            </p>
            <p className="text-[10px] text-emerald-500 mt-0.5">الرسائل تُرسَل مباشرة من هذا الرقم</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-white text-sm text-red-600 font-semibold hover:bg-red-50 transition-colors"
        >
          {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          قطع الاتصال
        </button>
      </div>
    );
  }

  // ── QR ready to scan ──────────────────────────────────────
  if (baileys?.status === "qr_ready" && baileys.qrBase64) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <img
              src={baileys.qrBase64}
              alt="WhatsApp QR"
              className="w-48 h-48 rounded-xl border border-gray-200 shadow-sm"
            />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-black text-gray-900">امسح الباركود بهاتفك</h3>
              <p className="text-xs text-gray-500 mt-1">للربط برقم واتساب المدرسة</p>
            </div>
            <ol className="space-y-2">
              {[
                "افتح واتساب على هاتفك",
                "اضغط ⋮ ثم اختر الأجهزة المرتبطة",
                "اضغط ربط جهاز",
                "وجّه الكاميرا نحو الباركود",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-[#5b9bd5] text-white flex items-center justify-center text-[9px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                في انتظار المسح...
              </div>
              <button
                onClick={fetchSession}
                className="text-[11px] text-gray-400 hover:text-gray-600 underline"
              >
                تحديث
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Connecting (generating QR) ────────────────────────────
  if (baileys?.status === "connecting") {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <Loader2 className="w-5 h-5 text-[#5b9bd5] animate-spin" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">جاري إنشاء الباركود...</p>
          <p className="text-xs text-gray-400 mt-0.5">سيظهر الباركود بعد لحظات</p>
        </div>
      </div>
    );
  }

  // ── Disconnected ──────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">ربط واتساب بالباركود</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {api?.configured
                  ? `حالياً يُستخدم: ${PROVIDER_LABELS[api.provider ?? ""] ?? api.provider}`
                  : "لا يوجد اتصال نشط"}
              </p>
            </div>
          </div>
          {api?.configured && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1">
              <Wifi className="w-3 h-3" />API نشط
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          اربط رقم واتساب المدرسة مباشرةً — ستُرسَل الرسائل من رقمك الخاص بدلاً من رقم خارجي.
          المسح مرة واحدة فقط، يبقى متصلاً تلقائياً.
        </p>

        <button
          onClick={handleStart}
          disabled={starting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#1da851] disabled:opacity-50 transition-colors"
        >
          {starting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <QrCode className="w-4 h-4" />
          }
          {starting ? "جاري التحضير..." : "ربط واتساب"}
        </button>

        {api?.configured && (
          <div className="flex items-start gap-2 text-[11px] text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            إذا ربطت الباركود، ستُعطى الأولوية على إعدادات الـ API.
          </div>
        )}

        {!api?.configured && !baileys?.hasSaved && (
          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-600">إعداد API خارجي بدلاً من ذلك</summary>
            <div className="mt-2 space-y-1 pr-3 border-r border-gray-100">
              <p><strong>Meta Cloud (مجاني):</strong> META_WA_TOKEN + META_WA_PHONE_ID</p>
              <p><strong>Unifonic:</strong> UNIFONIC_APP_SID + UNIFONIC_WHATSAPP_SENDER</p>
              <p><strong>Twilio:</strong> TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM</p>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export function SchoolNotificationsPage() {
  const [activeTab,    setActiveTab]    = useState<"settings" | "log">("settings");
  const [filterEvent,  setFilterEvent]  = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState("");

  // Test panel
  const [testPhone,   setTestPhone]   = useState("");
  const [testMessage, setTestMessage] = useState("رسالة اختبار من نسق للمدارس");
  const [testing,     setTesting]     = useState(false);
  const [testResult,  setTestResult]  = useState<boolean | null>(null);

  const { data: settingsData, refetch: refetchSettings } = useApi(
    () => schoolApi.getNotificationSettings(), []
  );
  const settings = settingsData?.data ?? {};

  const [localSettings, setLocalSettings] = useState<Record<string, any> | null>(null);
  const merged = localSettings ?? settings;

  const setProp = (key: string, value: any) =>
    setLocalSettings(prev => ({ ...(prev ?? settings), [key]: value }));

  const { data: logsData, loading: logsLoading, refetch: refetchLogs } = useApi(
    () => schoolApi.getNotificationLogs({
      eventType: filterEvent  || undefined,
      status:    filterStatus || undefined,
      limit:     100,
    }),
    [filterEvent, filterStatus]
  );
  const logs: any[]   = logsData?.data ?? [];
  const total: number = logsData?.total ?? 0;

  const handleSave = async () => {
    if (!localSettings) return;
    setSaving(true); setSaveMsg("");
    try {
      await schoolApi.updateNotificationSettings(localSettings);
      setSaveMsg("تم الحفظ");
      refetchSettings();
      setLocalSettings(null);
    } catch { setSaveMsg("خطأ في الحفظ"); }
    finally  { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testPhone) return;
    setTesting(true); setTestResult(null);
    try {
      const res = await schoolApi.testNotification(testPhone, testMessage);
      setTestResult(res.data?.sent ?? false);
    } catch { setTestResult(false); }
    finally  { setTesting(false); }
  };

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إشعارات واتساب</h1>
        <p className="text-sm text-gray-500 mt-1">إشعارات تلقائية لأولياء الأمور والمعلمين</p>
      </div>

      {/* WhatsApp QR Connection */}
      <WhatsAppConnectCard />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: "settings", label: "الإعدادات",   icon: Bell },
          { id: "log",      label: "سجل الإرسال", icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "settings" | "log")}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Settings tab ── */}
      {activeTab === "settings" && (
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Toggles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-black text-gray-800 mb-1">تفعيل الإشعارات</h2>
            <p className="text-xs text-gray-400 mb-4">اختر ما يُرسَل تلقائياً عبر واتساب</p>

            <SettingToggle
              label="إشعار مخالفة الطالب"
              desc="إشعار ولي الأمر فور تسجيل مخالفة لابنه"
              value={!!merged.notifyGuardianOnViolation}
              onChange={v => setProp("notifyGuardianOnViolation", v)}
            />
            <SettingToggle
              label="إشعار غياب الطالب"
              desc="إشعار ولي الأمر عند تسجيل غياب ابنه"
              value={!!merged.notifyGuardianOnAbsence}
              onChange={v => setProp("notifyGuardianOnAbsence", v)}
            />
            <SettingToggle
              label="إشعار تأخر الطالب"
              desc="إشعار ولي الأمر عند تسجيل تأخر ابنه"
              value={!!merged.notifyGuardianOnLate}
              onChange={v => setProp("notifyGuardianOnLate", v)}
            />
            <SettingToggle
              label="إشعار غياب المعلم"
              desc="إشعار المعلم تلقائياً عند تسجيل الوكيل غيابه"
              value={!!merged.notifyTeacherOnAbsence}
              onChange={v => setProp("notifyTeacherOnAbsence", v)}
            />
            <SettingToggle
              label="إشعار إسناد المعلم"
              desc="إشعار المعلم عند إسناد مادة أو فصل له"
              value={!!merged.notifyTeacherOnAssignment}
              onChange={v => setProp("notifyTeacherOnAssignment", v)}
            />

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving || !localSettings}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                حفظ
              </button>
              {saveMsg && <span className="text-xs text-emerald-600 font-semibold">{saveMsg}</span>}
            </div>
          </div>

          {/* Test panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-black text-gray-800 mb-1">اختبار الإرسال</h2>
            <p className="text-xs text-gray-400 mb-4">تحقق من عمل الواتساب قبل تفعيل الإشعارات</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">رقم الجوال</label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="9665xxxxxxxx"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5] focus:ring-2 focus:ring-[#5b9bd5]/10"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">نص الرسالة</label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5] focus:ring-2 focus:ring-[#5b9bd5]/10 resize-none"
                />
              </div>
              <button
                onClick={handleTest}
                disabled={testing || !testPhone}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إرسال تجريبي
              </button>
              {testResult !== null && (
                <div className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold",
                  testResult ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                )}>
                  {testResult ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {testResult ? "تم الإرسال بنجاح" : "فشل الإرسال — تحقق من إعداد الواتساب"}
                </div>
              )}
            </div>
          </div>

          {/* Message Templates */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-black text-gray-800 mb-1">قوالب الرسائل</h2>
            <p className="text-xs text-gray-400 mb-5">خصص نص كل إشعار — اضغط على المتغير لإدراجه</p>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
              <TemplateEditor
                label="رسالة المخالفة (لولي الأمر)"
                field="violationMessage"
                value={merged.violationMessage ?? ""}
                onChange={setProp}
                vars={TPL_VARS.violationMessage}
              />
              <TemplateEditor
                label="رسالة غياب الطالب (لولي الأمر)"
                field="absenceMessage"
                value={merged.absenceMessage ?? ""}
                onChange={setProp}
                vars={TPL_VARS.absenceMessage}
              />
              <TemplateEditor
                label="رسالة تأخر الطالب (لولي الأمر)"
                field="lateMessage"
                value={merged.lateMessage ?? ""}
                onChange={setProp}
                vars={TPL_VARS.lateMessage}
              />
              <TemplateEditor
                label="رسالة غياب المعلم (للمعلم)"
                field="teacherAbsenceMessage"
                value={merged.teacherAbsenceMessage ?? ""}
                onChange={setProp}
                vars={TPL_VARS.teacherAbsenceMessage}
              />
              <TemplateEditor
                label="رسالة الإسناد (للمعلم)"
                field="teacherAssignMessage"
                value={merged.teacherAssignMessage ?? ""}
                onChange={setProp}
                vars={TPL_VARS.teacherAssignMessage}
              />
            </div>

            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving || !localSettings}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                حفظ القوالب
              </button>
              {localSettings && (
                <button
                  onClick={() => setLocalSettings(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              )}
              {saveMsg && <span className="text-xs text-emerald-600 font-semibold">{saveMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Log tab ── */}
      {activeTab === "log" && (
        <div className="space-y-4">

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filterEvent}
              onChange={e => setFilterEvent(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/30 bg-white"
            >
              <option value="">كل الأحداث</option>
              <option value="violation">مخالفة</option>
              <option value="absence">غياب طالب</option>
              <option value="late">تأخر طالب</option>
              <option value="teacher_absence">غياب معلم</option>
              <option value="teacher_assignment">إسناد معلم</option>
              <option value="test">اختبار</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/30 bg-white"
            >
              <option value="">كل الحالات</option>
              <option value="sent">تم الإرسال</option>
              <option value="failed">فشل</option>
            </select>
            <button onClick={refetchLogs} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 mr-auto">{total} رسالة</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {logsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">لا توجد رسائل بعد</p>
                <p className="text-xs text-gray-300 mt-1">ستظهر هنا عند تسجيل مخالفة أو غياب</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {logs.map((log: any) => {
                  const ev = EVENT_LABELS[log.eventType] ?? EVENT_LABELS.test;
                  return (
                    <div key={log.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={clsx("mt-0.5 shrink-0 p-1.5 rounded-lg border", ev.color)}>
                            <ev.icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-800">
                                {log.studentName ?? log.teacherName ?? "—"}
                              </span>
                              {log.studentGrade && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 rounded-lg px-1.5 py-0.5">
                                  {log.studentGrade}
                                </span>
                              )}
                              <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border", ev.color)}>
                                {ev.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 font-mono" dir="ltr">{log.recipient}</p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2 whitespace-pre-line">{log.message}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <StatusBadge status={log.status} />
                          <span className="text-[10px] text-gray-400">
                            {new Date(log.createdAt).toLocaleDateString("ar-SA", {
                              day: "numeric", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
