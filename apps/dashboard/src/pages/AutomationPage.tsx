import { useState, useRef, useEffect, useCallback } from "react";
import { Zap, Bell, FileText, Loader2, MessageCircle, Plus, Pencil, Trash2, Send, X, ChevronDown, ToggleLeft, ToggleRight, Wifi, WifiOff, QrCode, Key, CheckCircle, AlertCircle, RefreshCw, Phone } from "lucide-react";
import { clsx } from "clsx";
import { automationApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const tabs = ["القواعد", "القوالب", "واتساب", "سجل الإرسال"];

// ── WhatsApp template constants ────────────────────────────────────

const TRIGGER_EVENT_LABELS: Record<string, string> = {
  booking_confirmed:      "تأكيد الحجز",
  booking_reminder_24h:   "تذكير قبل 24 ساعة",
  booking_reminder_1h:    "تذكير قبل ساعة",
  booking_cancelled:      "إلغاء الحجز",
  payment_received:       "استلام الدفعة",
};

const TRIGGER_EVENTS = Object.entries(TRIGGER_EVENT_LABELS);

const TRIGGER_EVENT_COLORS: Record<string, string> = {
  booking_confirmed:    "bg-emerald-50 text-emerald-600",
  booking_reminder_24h: "bg-amber-50 text-amber-600",
  booking_reminder_1h:  "bg-orange-50 text-orange-600",
  booking_cancelled:    "bg-red-50 text-red-500",
  payment_received:     "bg-brand-500/10 text-brand-500",
};

const TEMPLATE_VARIABLES = [
  "{{customer_name}}",
  "{{service_name}}",
  "{{booking_date}}",
  "{{booking_time}}",
  "{{amount}}",
  "{{business_name}}",
];

const SAMPLE_VARS: Record<string, string> = {
  "{{customer_name}}":  "أحمد العمري",
  "{{service_name}}":   "قص الشعر",
  "{{booking_date}}":   "السبت 1 فبراير",
  "{{booking_time}}":   "10:00 ص",
  "{{amount}}":         "120",
  "{{business_name}}":  "صالون ترميز OS",
};

function previewMessage(body: string): string {
  let msg = body;
  for (const [v, val] of Object.entries(SAMPLE_VARS)) {
    msg = msg.split(v).join(val);
  }
  return msg;
}

// ── WhatsApp Template Modal ────────────────────────────────────────
interface TemplateModalProps {
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

function TemplateModal({ initial, onClose, onSave, saving }: TemplateModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [triggerEvent, setTriggerEvent] = useState(initial?.trigger_event ?? "booking_confirmed");
  const [messageBody, setMessageBody] = useState(initial?.message_body ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [language, setLanguage] = useState(initial?.language ?? "ar");
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    const el = textareaRef.current;
    if (!el) { setMessageBody((prev: string) => prev + variable); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = messageBody.slice(0, start) + variable + messageBody.slice(end);
    setMessageBody(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, triggerEvent, messageBody, isActive, language });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6]">
          <h2 className="text-base font-bold text-gray-900">
            {initial ? "تعديل القالب" : "قالب واتساب جديد"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">اسم القالب</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="مثال: تأكيد حجز واتساب"
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Trigger event */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">حدث الإرسال</label>
            <div className="relative">
              <select
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors appearance-none bg-white"
              >
                {TRIGGER_EVENTS.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">اللغة</label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors appearance-none bg-white"
              >
                <option value="ar">عربي</option>
                <option value="en">English</option>
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            </div>
          </div>

          {/* Variable helper chips */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">المتغيرات المتاحة</label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="px-2 py-1 rounded-lg bg-brand-500/10 text-brand-500 text-xs font-mono hover:bg-brand-500/20 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Message body */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">نص الرسالة</label>
            <textarea
              ref={textareaRef}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              required
              rows={5}
              placeholder="مرحبا {{customer_name}}، تم تأكيد حجزك لخدمة {{service_name}} يوم {{booking_date}} الساعة {{booking_time}}"
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Preview toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="text-xs text-brand-500 hover:underline font-medium"
            >
              {showPreview ? "إخفاء المعاينة" : "معاينة الرسالة"}
            </button>
            {showPreview && messageBody && (
              <div className="mt-2 bg-[#dcf8c6] rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-green-100">
                {previewMessage(messageBody)}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 font-medium">تفعيل القالب</span>
            <button
              type="button"
              onClick={() => setIsActive((p: boolean) => !p)}
              className={clsx("transition-colors", isActive ? "text-brand-500" : "text-gray-300")}
            >
              {isActive
                ? <ToggleRight className="w-8 h-8" />
                : <ToggleLeft className="w-8 h-8" />
              }
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#eef2f6] flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-[#eef2f6] text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={(e) => { e.preventDefault(); handleSubmit(e as any); }}
            disabled={saving || !name.trim() || !messageBody.trim()}
            className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Test message modal ─────────────────────────────────────────────
interface TestModalProps {
  templateId: string;
  onClose: () => void;
}

function TestModal({ templateId, onClose }: TestModalProps) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ delivered: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const res = await automationApi.testWhatsappTemplate(templateId, phone.trim());
      setResult((res as any).data);
    } catch {
      setResult({ delivered: false, message: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6]">
          <h2 className="text-base font-bold text-gray-900">إرسال رسالة تجريبية</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">رقم الهاتف (مع كود الدولة)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966501234567"
              dir="ltr"
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          {result && (
            <div className={clsx(
              "px-4 py-3 rounded-xl text-sm",
              result.delivered ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"
            )}>
              {result.delivered ? "تم الإرسال بنجاح" : "فشل الإرسال — تحقق من إعدادات واتساب"}
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={loading || !phone.trim()}
            className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            إرسال تجريبي
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WhatsApp Connection Panel ──────────────────────────────────────
function WhatsappConnectionPanel() {
  const { data: res, loading, refetch } = useApi(() => automationApi.whatsappConnection(), []);
  const conn = (res as any)?.data ?? null;

  const [mode, setMode] = useState<"api" | "qr">("api");
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookVerify, setWebhookVerify] = useState("");
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [startingQr, setStartingQr] = useState(false);

  // Sync mode from DB
  useEffect(() => {
    if (conn?.mode) setMode(conn.mode as "api" | "qr");
    if (conn?.api_phone_id) setPhoneId(conn.api_phone_id);
  }, [conn]);

  // Poll for QR updates when pending
  const polling = conn?.status === "pending_qr";
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(() => refetch(), 3000);
    return () => clearInterval(id);
  }, [polling, refetch]);

  const handleSaveApi = useCallback(async () => {
    if (!phoneId.trim() || !accessToken.trim()) return;
    setSaving(true);
    try {
      await automationApi.saveApiConnection({ phoneId: phoneId.trim(), accessToken: accessToken.trim(), webhookVerify: webhookVerify.trim() || undefined });
      await refetch();
    } finally {
      setSaving(false);
    }
  }, [phoneId, accessToken, webhookVerify, refetch]);

  const handleStartQr = useCallback(async () => {
    setStartingQr(true);
    try {
      await automationApi.startQrSession();
      await refetch();
    } finally {
      setStartingQr(false);
    }
  }, [refetch]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await automationApi.disconnectWhatsapp();
      await refetch();
    } finally {
      setDisconnecting(false);
    }
  }, [refetch]);

  const handleTestSend = useCallback(async () => {
    if (!testPhone.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await automationApi.testSendWhatsapp(testPhone.trim());
      setTestResult((r as any)?.data?.delivered ?? false);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  }, [testPhone]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-40 mb-4" />
        <div className="h-32 bg-[#f1f5f9] rounded-xl" />
      </div>
    );
  }

  const isConnected = conn?.status === "connected";
  const isPendingQr = conn?.status === "pending_qr";

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">إعداد اتصال واتساب</h3>
          <p className="text-xs text-gray-400 mt-0.5">اختر طريقة الإرسال لقوالبك التلقائية</p>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-semibold">
            <Wifi className="w-3.5 h-3.5" />
            متصل
            {conn.phone_number && <span className="text-emerald-500 font-mono mr-1">{conn.phone_number}</span>}
          </div>
        )}
        {isPendingQr && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            في انتظار المسح
          </div>
        )}
        {!isConnected && !isPendingQr && conn && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-xs font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            غير متصل
          </div>
        )}
      </div>

      {/* Mode selector */}
      {!isConnected && (
        <div className="flex gap-3">
          <button
            onClick={() => setMode("api")}
            className={clsx(
              "flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-right",
              mode === "api" ? "border-brand-500 bg-brand-500/5" : "border-[#eef2f6] hover:border-[#eef2f6]"
            )}
          >
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", mode === "api" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400")}>
              <Key className="w-4 h-4" />
            </div>
            <div>
              <p className={clsx("text-sm font-semibold", mode === "api" ? "text-brand-500" : "text-gray-700")}>واتساب API</p>
              <p className="text-xs text-gray-400">Meta Business API الرسمي</p>
            </div>
          </button>
          <button
            onClick={() => setMode("qr")}
            className={clsx(
              "flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-right",
              mode === "qr" ? "border-brand-500 bg-brand-500/5" : "border-[#eef2f6] hover:border-[#eef2f6]"
            )}
          >
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", mode === "qr" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400")}>
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <p className={clsx("text-sm font-semibold", mode === "qr" ? "text-brand-500" : "text-gray-700")}>مسح الباركود</p>
              <p className="text-xs text-gray-400">ربط رقم واتساب مباشرة</p>
            </div>
          </button>
        </div>
      )}

      {/* API Mode form */}
      {mode === "api" && !isConnected && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone Number ID</label>
            <input
              type="text"
              value={phoneId}
              onChange={(e) => setPhoneId(e.target.value)}
              placeholder="من Meta Business Dashboard"
              dir="ltr"
              className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="••••••••••••••••••••"
              dir="ltr"
              className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Webhook Verify Token (اختياري)</label>
            <input
              type="text"
              value={webhookVerify}
              onChange={(e) => setWebhookVerify(e.target.value)}
              placeholder="nasaq_webhook_secret"
              dir="ltr"
              className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <button
            onClick={handleSaveApi}
            disabled={saving || !phoneId.trim() || !accessToken.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            حفظ وتفعيل
          </button>
        </div>
      )}

      {/* QR Mode */}
      {mode === "qr" && !isConnected && (
        <div className="space-y-4">
          {!isPendingQr ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#f8fafc] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 mb-1">اربط رقم واتساب الخاص بمنشأتك</p>
              <p className="text-xs text-gray-400 mb-4">سيظهر باركود تمسحه من تطبيق واتساب</p>
              <button
                onClick={handleStartQr}
                disabled={startingQr}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {startingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                إنشاء باركود الاتصال
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              {conn?.qr_code ? (
                <>
                  <div className="inline-block p-3 bg-white border-2 border-[#eef2f6] rounded-2xl">
                    <img src={conn.qr_code} alt="WhatsApp QR Code" className="w-52 h-52" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">افتح واتساب ← المزيد ← الأجهزة المرتبطة ← ربط جهاز</p>
                  <p className="text-xs text-gray-400">يُحدَّث الباركود تلقائياً — انتظر بعد المسح</p>
                  <div className="flex items-center justify-center gap-1 text-xs text-amber-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    في انتظار المسح...
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">جاري توليد الباركود...</span>
                </div>
              )}
              <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <RefreshCw className="w-3 h-3" /> تحديث الحالة
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connected state */}
      {isConnected && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">{conn.display_name || "واتساب متصل"}</p>
              <p className="text-xs text-emerald-600 font-mono">{conn.phone_number || "—"}</p>
            </div>
            <div className="mr-auto text-right">
              <p className="text-xs text-emerald-600">{conn.messages_sent || 0} رسالة مُرسلة</p>
              <p className="text-xs text-emerald-500">{conn.mode === "api" ? "Meta API" : "QR مرتبط"}</p>
            </div>
          </div>

          {/* Test send */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">إرسال تجريبي</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="9665XXXXXXXX"
                dir="ltr"
                className="flex-1 px-3 py-2 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-500 font-mono"
              />
              <button
                onClick={handleTestSend}
                disabled={testing || !testPhone.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إرسال
              </button>
            </div>
            {testResult !== null && (
              <div className={clsx("flex items-center gap-1.5 mt-2 text-xs", testResult ? "text-emerald-600" : "text-red-500")}>
                {testResult ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testResult ? "تم الإرسال بنجاح" : "فشل الإرسال — تحقق من الإعدادات"}
              </div>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WifiOff className="w-3.5 h-3.5" />}
            قطع الاتصال
          </button>
        </div>
      )}
    </div>
  );
}

// ── WhatsApp Templates Tab ─────────────────────────────────────────
function WhatsappTemplatesTab() {
  const { data: res, loading, error, refetch } = useApi(() => automationApi.whatsappTemplates(), []);
  const templates: any[] = (res as any)?.data ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (tpl: any) => { setEditing(tpl); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      if (editing) {
        await automationApi.updateWhatsappTemplate(editing.id, data);
      } else {
        await automationApi.createWhatsappTemplate(data);
      }
      await refetch();
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا القالب؟")) return;
    setDeletingId(id);
    try {
      await automationApi.deleteWhatsappTemplate(id);
      await refetch();
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (tpl: any) => {
    await automationApi.updateWhatsappTemplate(tpl.id, { isActive: !tpl.is_active });
    await refetch();
  };

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#eef2f6] h-20 animate-pulse" />
      ))}
    </div>
  );

  if (error) return (
    <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-center">
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="mt-2 text-xs text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          قالب جديد
        </button>
      </div>

      {/* Empty state */}
      {templates.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-12 text-center">
          <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">لا توجد قوالب واتساب</p>
          <p className="text-xs text-gray-400 mt-1">أنشئ قوالب لإرسال رسائل تلقائية عند كل حدث</p>
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-500/10 text-brand-500 text-sm font-semibold hover:bg-brand-500/20 transition-colors"
          >
            إنشاء قالب
          </button>
        </div>
      )}

      {/* Template list */}
      {templates.map((tpl) => (
        <div key={tpl.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4 hover:border-[#eef2f6] transition-colors">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              tpl.is_active ? "bg-brand-500/10" : "bg-gray-100"
            )}>
              <MessageCircle className={clsx("w-4 h-4", tpl.is_active ? "text-brand-500" : "text-gray-300")} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{tpl.name}</span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  TRIGGER_EVENT_COLORS[tpl.trigger_event] ?? "bg-gray-100 text-gray-500"
                )}>
                  {TRIGGER_EVENT_LABELS[tpl.trigger_event] ?? tpl.trigger_event}
                </span>
                {!tpl.is_active && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400">
                    معطل
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">{tpl.message_body}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleToggleActive(tpl)}
                className={clsx("p-1.5 rounded-lg transition-colors", tpl.is_active ? "text-brand-500 hover:bg-brand-500/10" : "text-gray-300 hover:bg-gray-100")}
                title={tpl.is_active ? "تعطيل" : "تفعيل"}
              >
                {tpl.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setTestingId(tpl.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="إرسال تجريبي"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={() => openEdit(tpl)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="تعديل"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(tpl.id)}
                disabled={deletingId === tpl.id}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="حذف"
              >
                {deletingId === tpl.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Modals */}
      {modalOpen && (
        <TemplateModal
          initial={editing}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {testingId && (
        <TestModal
          templateId={testingId}
          onClose={() => setTestingId(null)}
        />
      )}
    </div>
  );
}

export function AutomationPage() {
  const [activeTab, setActiveTab] = useState(0);

  const { data: rulesRes, loading: rLoading } = useApi(() => automationApi.rules(), []);
  const { data: templatesRes, loading: tLoading } = useApi(() => automationApi.templates(), []);
  const { data: logsRes } = useApi(() => automationApi.logs(), []);
  const { data: waRes } = useApi(() => automationApi.whatsappTemplates(), []);

  const rules: any[] = rulesRes?.data || [];
  const templates: any[] = templatesRes?.data || [];
  const logs: any[] = logsRes?.data || [];
  const waTemplates: any[] = (waRes as any)?.data || [];

  const activeRules = rules.filter((r) => r.isActive).length;

  if (rLoading || tLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">الأتمتة</h1>
        <p className="text-sm text-gray-400 mt-0.5">قواعد الإرسال التلقائي والقوالب</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "قواعد نشطة",    value: activeRules,       color: "text-brand-600",    bg: "bg-brand-50",    icon: Zap },
          { label: "القوالب",       value: templates.length,  color: "text-violet-600",   bg: "bg-violet-50",   icon: Bell },
          { label: "قوالب واتساب", value: waTemplates.length, color: "text-brand-500",    bg: "bg-brand-500/10", icon: MessageCircle },
          { label: "رسائل مرسلة",  value: logs.length,        color: "text-emerald-600",  bg: "bg-emerald-50",  icon: FileText },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl border border-[#eef2f6] p-1">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={clsx(
              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors",
              activeTab === i ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-[#f8fafc]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Rules tab */}
      {activeTab === 0 && (
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-10 text-center">
              <Zap className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد قواعد أتمتة</p>
            </div>
          ) : (
            rules.map((rule: any) => (
              <div key={rule.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4 flex items-center gap-4 hover:border-[#eef2f6] transition-colors">
                <div className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  rule.isActive ? "bg-emerald-50" : "bg-gray-100"
                )}>
                  <Zap className={clsx("w-4 h-4", rule.isActive ? "text-emerald-600" : "text-gray-300")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{rule.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {rule.event} ← {rule.actions?.length || 0} إجراء
                  </p>
                </div>
                <span className={clsx(
                  "px-2.5 py-1 rounded-full text-[10px] font-semibold",
                  rule.isActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-400"
                )}>
                  {rule.isActive ? "نشطة" : "معطلة"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates tab */}
      {activeTab === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-[#eef2f6] p-10 text-center">
              <Bell className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد قوالب</p>
            </div>
          ) : (
            templates.map((tpl: any) => (
              <div key={tpl.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4 hover:border-[#eef2f6] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-brand-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{tpl.name}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {tpl.channel} — {tpl.event}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* WhatsApp tab */}
      {activeTab === 2 && (
        <div className="space-y-5">
          <WhatsappConnectionPanel />
          <WhatsappTemplatesTab />
        </div>
      )}

      {/* Logs tab */}
      {activeTab === 3 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا يوجد سجل إرسال</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eef2f6] bg-gray-50/50">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">القالب</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">المستلم</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الحالة</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 50).map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-[#f8fafc]/50 transition-colors">
                    <td className="py-3 px-5 font-medium text-gray-900">{log.templateName || "—"}</td>
                    <td className="py-[6px] px-[10px] text-gray-500 text-xs" dir="ltr">
                      {log.recipientPhone || log.recipientEmail || "—"}
                    </td>
                    <td className="py-[6px] px-[10px]">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        log.status === "sent"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-500"
                      )}>
                        {log.status === "sent" ? "مرسل" : "فشل"}
                      </span>
                    </td>
                    <td className="py-[6px] px-[10px] text-xs text-gray-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("en-US") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
