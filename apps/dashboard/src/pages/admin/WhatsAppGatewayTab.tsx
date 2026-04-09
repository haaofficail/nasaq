import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle, Send, FileText, Plus, Pencil, Trash2,
  Loader2, CheckCircle2, XCircle, RefreshCw,
  Signal, AlertTriangle, QrCode, Smartphone,
  Key, Unplug, Link2,
} from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { SectionHeader, Modal, Empty, Spinner, TabPill } from "./shared";

const TEMPLATE_CATEGORIES: Record<string, string> = {
  general: "عام",
  credentials: "بيانات الدخول",
  offer: "عروض",
  notice: "إشعارات",
  renewal: "تجديد",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  sent:    { label: "تم الإرسال", color: "bg-emerald-50 text-emerald-700" },
  failed:  { label: "فشل", color: "bg-red-50 text-red-700" },
  pending: { label: "قيد الإرسال", color: "bg-amber-50 text-amber-700" },
};

export default function WhatsAppGatewayTab() {
  const [tab, setTab] = useState<"qr" | "credentials" | "send" | "templates" | "log">("qr");

  const { data: statusData, loading: statusLoading, refetch: refetchStatus } = useApi(() => adminApi.waStatus(), []);
  const status = statusData?.data;

  const isNotConfigured = status && !status.whatsappConfigured && !status.baileysConnected;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="بوابة واتساب"
        sub="أرسل رسائل واتساب للمنشآت — بيانات الدخول، العروض، الملاحظات، والإشعارات"
      />

      {/* Connection Status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Signal className="w-4 h-4 text-brand-500" />
            حالة الاتصال
          </h3>
          <button onClick={() => refetchStatus()} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> تحديث
          </button>
        </div>
        {statusLoading ? <Spinner /> : status ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">حالة الواتساب</p>
              <span className={clsx("inline-flex px-2.5 py-1 rounded-full text-xs font-semibold",
                status.whatsappConfigured ? "bg-emerald-50 text-emerald-700" :
                status.baileysConnected ? "bg-emerald-50 text-emerald-700" :
                "bg-red-50 text-red-600"
              )}>
                {status.baileysConnected ? "متصل (QR)" : status.whatsappConfigured ? "متصل (API)" : "غير متصل"}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">المزود</p>
              <p className="text-sm font-semibold text-gray-700">{status.provider || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">رسائل مرسلة</p>
              <p className="text-sm font-bold text-emerald-600">{status.stats?.sent ?? 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">فشل</p>
              <p className="text-sm font-bold text-red-500">{status.stats?.failed ?? 0}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">لا يمكن تحميل حالة الاتصال</p>
        )}
      </div>

      {/* Not Configured Banner */}
      {isNotConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-amber-800">الواتساب غير مُعد</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                لإرسال الرسائل، اربط رقم واتساب المنصة عبر مسح باركود QR من تبويب
                {" "}<strong>&quot;ربط بـ QR&quot;</strong> أدناه.
                أو يمكنك تعيين متغيرات البيئة:
                {" "}<code className="bg-amber-100 px-1 py-0.5 rounded text-[11px] font-mono">META_WA_TOKEN</code> و
                {" "}<code className="bg-amber-100 px-1 py-0.5 rounded text-[11px] font-mono">META_WA_PHONE_ID</code> أو
                أحد المزودين الآخرين (Unifonic / Twilio).
              </p>
              <button
                onClick={() => setTab("qr")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-medium hover:bg-brand-600 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                ربط واتساب بباركود QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <TabPill
        tabs={[
          { id: "qr", label: "ربط بـ QR" },
          { id: "credentials", label: "بيانات الدخول" },
          { id: "send", label: "إرسال رسالة" },
          { id: "templates", label: "القوالب" },
          { id: "log", label: "سجل الرسائل" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {tab === "qr" && <QrConnectionSection onStatusChange={() => refetchStatus()} />}
      {tab === "credentials" && <CredentialsSendSection />}
      {tab === "send" && <SendMessageSection />}
      {tab === "templates" && <TemplatesSection />}
      {tab === "log" && <MessageLogSection />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// QR CONNECTION SECTION
// ══════════════════════════════════════════════════════════════

function QrConnectionSection({ onStatusChange }: { onStatusChange?: () => void }) {
  const { data: qrData, loading, refetch } = useApi(() => adminApi.waQrStatus(), []);
  const qrState = qrData?.data;
  const [starting, setStarting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Auto-poll when waiting for QR or scan
  useEffect(() => {
    if (qrState?.status === "qr_ready" || qrState?.status === "connecting" || starting) {
      pollRef.current = setInterval(() => refetch(), 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrState?.status, starting, refetch]);

  // Stop polling once connected + notify parent
  useEffect(() => {
    if (qrState?.status === "connected") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setStarting(false);
      if (prevStatusRef.current !== null && prevStatusRef.current !== "connected") {
        toast.success("تم ربط واتساب بنجاح");
        onStatusChange?.();
      }
    }
    prevStatusRef.current = qrState?.status ?? null;
  }, [qrState?.status, onStatusChange]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await adminApi.waQrStart();
      toast.success("جارٍ بدء جلسة QR...");
      setTimeout(() => refetch(), 1500);
    } catch {
      toast.error("فشل بدء الجلسة");
      setStarting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await adminApi.waQrLogout();
      toast.success("تم فصل الاتصال");
      refetch();
      onStatusChange?.();
    } catch {
      toast.error("فشل فصل الاتصال");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <QrCode className="w-4 h-4 text-brand-500" />
        ربط واتساب بباركود QR
      </h3>

      <p className="text-xs text-gray-500 leading-relaxed">
        اربط رقم واتساب المنصة عبر مسح باركود QR مباشرة — بديل عن إعداد API.
        بعد المسح، يمكنك إرسال بيانات الدخول وإشعارات الوثائق مباشرة من هنا.
      </p>

      {loading ? <Spinner /> : (
        <>
          {/* Status Display */}
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-3 h-3 rounded-full shrink-0",
              qrState?.status === "connected" ? "bg-emerald-500" :
              qrState?.status === "qr_ready" ? "bg-amber-500 animate-pulse" :
              qrState?.status === "connecting" ? "bg-blue-400 animate-pulse" :
              "bg-gray-300"
            )} />
            <span className="text-sm font-medium text-gray-700">
              {qrState?.status === "connected" ? `متصل — ${qrState.phone || ""}` :
               qrState?.status === "qr_ready" ? "في انتظار مسح الباركود..." :
               qrState?.status === "connecting" ? "جارٍ الاتصال..." :
               "غير متصل"}
            </span>
          </div>

          {/* Disconnected — Guide to start */}
          {(!qrState?.status || qrState?.status === "disconnected") && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-48 h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3">
                <QrCode className="w-12 h-12 text-gray-300" />
                <p className="text-xs text-gray-400 text-center px-4">
                  اضغط على &quot;بدء جلسة QR&quot; لإنشاء باركود
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 max-w-sm">
                <p className="text-xs text-blue-700 leading-relaxed text-center">
                  <Smartphone className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />
                  افتح واتساب على هاتفك &gt; <strong>الأجهزة المرتبطة</strong> &gt; <strong>ربط جهاز</strong> &gt; امسح الباركود
                </p>
              </div>
            </div>
          )}

          {/* QR Code Display */}
          {qrState?.status === "qr_ready" && qrState.qrBase64 && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-2xl border-2 border-brand-200 shadow-lg relative">
                <img
                  src={qrState.qrBase64.startsWith("data:") ? qrState.qrBase64 : `data:image/png;base64,${qrState.qrBase64}`}
                  alt="QR Code"
                  className="w-64 h-64 object-contain"
                />
                <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  امسح الآن
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 max-w-sm">
                <p className="text-xs text-blue-700 leading-relaxed text-center">
                  <Smartphone className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />
                  افتح واتساب على هاتفك &gt; <strong>الأجهزة المرتبطة</strong> &gt; <strong>ربط جهاز</strong> &gt; امسح الباركود بالكاميرا
                </p>
              </div>
            </div>
          )}

          {/* Connecting state */}
          {qrState?.status === "connecting" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
              <p className="text-xs text-gray-500">جارٍ إنشاء باركود QR...</p>
            </div>
          )}

          {/* Connected State */}
          {qrState?.status === "connected" && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">متصل بنجاح</p>
                {qrState.phone && <p className="text-xs text-emerald-600 mt-0.5">الرقم: {qrState.phone}</p>}
                <p className="text-xs text-emerald-500 mt-1">يمكنك الآن إرسال الرسائل عبر واتساب مباشرة</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {qrState?.status !== "connected" && (
              <button
                onClick={handleStart}
                disabled={starting || qrState?.status === "qr_ready" || qrState?.status === "connecting"}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {starting || qrState?.status === "connecting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                {starting || qrState?.status === "connecting" ? "جارٍ البدء..." :
                 qrState?.status === "qr_ready" ? "في انتظار المسح..." : "بدء جلسة QR"}
              </button>
            )}
            {qrState?.status === "connected" && (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                فصل الاتصال
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث الحالة
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CREDENTIALS SEND SECTION
// ══════════════════════════════════════════════════════════════

function CredentialsSendSection() {
  const [form, setForm] = useState({
    phone: "", orgName: "", email: "", password: "",
    loginUrl: "", channel: "whatsapp", orgId: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: boolean; error?: string } | null>(null);

  const handleSend = async () => {
    if (!form.phone || !form.orgName || !form.password) return;
    setSending(true);
    setResult(null);
    try {
      const res = await adminApi.sendCredentials({
        phone: form.phone,
        orgName: form.orgName,
        email: form.email || undefined,
        password: form.password,
        loginUrl: form.loginUrl || undefined,
        channel: form.channel,
        orgId: form.orgId || undefined,
      });
      setResult({ sent: res.data?.sent, error: res.data?.error });
      if (res.data?.sent) {
        toast.success("تم إرسال بيانات الدخول بنجاح");
        setForm(f => ({ ...f, phone: "", orgName: "", email: "", password: "", orgId: "" }));
      }
    } catch (err: any) {
      setResult({ sent: false, error: err?.message || "خطأ في الإرسال" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <Key className="w-4 h-4 text-brand-500" />
        إرسال بيانات الدخول للمنشأة
      </h3>
      <p className="text-xs text-gray-500">
        أرسل بيانات الدخول (البريد/الجوال + كلمة المرور + رابط الدخول) مباشرة عبر واتساب أو SMS.
      </p>

      {result && (
        <div className={clsx("rounded-xl p-3 text-xs font-medium flex items-center gap-2",
          result.sent ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
        )}>
          {result.sent ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {result.sent ? "تم إرسال بيانات الدخول بنجاح" : `فشل الإرسال: ${result.error}`}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">اسم المنشأة *</label>
          <input value={form.orgName} onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
            placeholder="مثال: شركة النور"
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">رقم الجوال *</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="05XXXXXXXX"
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">البريد الإلكتروني</label>
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="email@example.com"
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">كلمة المرور *</label>
          <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="كلمة المرور المؤقتة"
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400 font-mono" dir="ltr" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">رابط الدخول</label>
          <input value={form.loginUrl} onChange={e => setForm(f => ({ ...f, loginUrl: e.target.value }))}
            placeholder="https://app.tarmiz.os/login (افتراضي)"
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400" dir="ltr" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">قناة الإرسال</label>
          <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400 bg-white">
            <option value="whatsapp">واتساب</option>
            <option value="sms">رسالة نصية SMS</option>
          </select>
        </div>
      </div>

      <button
        disabled={!form.phone || !form.orgName || !form.password || sending}
        onClick={handleSend}
        className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
        إرسال بيانات الدخول
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SEND MESSAGE
// ══════════════════════════════════════════════════════════════

function SendMessageSection() {
  const { data: tplData } = useApi(() => adminApi.waTemplates(), []);
  const templates = (tplData?.data ?? []).filter((t: any) => t.isActive);

  const [form, setForm] = useState({ phone: "", recipientName: "", message: "", channel: "whatsapp", templateId: "", orgId: "" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: boolean; error?: string } | null>(null);

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find((t: any) => t.id === tplId);
    if (tpl) {
      setForm(f => ({ ...f, templateId: tplId, message: tpl.body }));
    }
  };

  const handleSend = async () => {
    if (!form.phone || !form.message) return;
    setSending(true);
    setResult(null);
    try {
      const res = await adminApi.sendWaMessage({
        phone: form.phone,
        message: form.message,
        recipientName: form.recipientName || undefined,
        orgId: form.orgId || undefined,
        templateId: form.templateId || undefined,
        channel: form.channel,
      });
      setResult({ sent: res.data?.sent, error: res.data?.error });
      if (res.data?.sent) {
        setForm(f => ({ ...f, phone: "", recipientName: "", message: "", templateId: "" }));
      }
    } catch (err: any) {
      setResult({ sent: false, error: err?.message || "خطأ في الإرسال" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <Send className="w-4 h-4 text-brand-500" />
        إرسال رسالة جديدة
      </h3>

      {result && (
        <div className={clsx("rounded-xl p-3 text-xs font-medium flex items-center gap-2",
          result.sent ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
        )}>
          {result.sent ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {result.sent ? "تم إرسال الرسالة بنجاح" : `فشل الإرسال: ${result.error}`}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">رقم الجوال *</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="05XXXXXXXX أو +966XXXXXXXXX"
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">اسم المستلم</label>
          <input value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))}
            placeholder="اختياري"
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">القالب</label>
          <select value={form.templateId} onChange={e => applyTemplate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400 bg-white">
            <option value="">— بدون قالب (رسالة حرة) —</option>
            {templates.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} — {TEMPLATE_CATEGORIES[t.category] || t.category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">قناة الإرسال</label>
          <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400 bg-white">
            <option value="whatsapp">واتساب</option>
            <option value="sms">رسالة نصية SMS</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">نص الرسالة *</label>
        <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          rows={6} placeholder="اكتب نص الرسالة هنا... يمكنك استخدام المتغيرات مثل {{owner_name}} و {{org_name}}"
          className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 resize-none leading-relaxed" />
        <p className="text-[10px] text-gray-400 mt-1">المتغيرات المتاحة: {"{{owner_name}}"} {"{{org_name}}"} {"{{login_url}}"} {"{{username}}"} {"{{password}}"} {"{{plan_name}}"} {"{{expiry_date}}"} {"{{message}}"}</p>
      </div>

      <button
        disabled={!form.phone || !form.message || sending}
        onClick={handleSend}
        className="w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {form.channel === "whatsapp" ? "إرسال عبر واتساب" : "إرسال SMS"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════════════════════════

function TemplatesSection() {
  const { data: tplData, loading, refetch } = useApi(() => adminApi.waTemplates(), []);
  const templates = tplData?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", category: "general", body: "", variables: "" as string, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", slug: "", category: "general", body: "", variables: "", sortOrder: 0 });
    setShowForm(true);
  };

  const openEdit = (tpl: any) => {
    setEditId(tpl.id);
    setForm({
      name: tpl.name,
      slug: tpl.slug,
      category: tpl.category,
      body: tpl.body,
      variables: Array.isArray(tpl.variables) ? tpl.variables.join(", ") : "",
      sortOrder: tpl.sortOrder || 0,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        category: form.category,
        body: form.body,
        variables: form.variables.split(",").map(v => v.trim()).filter(Boolean),
        sortOrder: form.sortOrder,
      };
      if (editId) {
        await adminApi.updateWaTemplate(editId, payload);
      } else {
        await adminApi.createWaTemplate(payload);
      }
      setShowForm(false);
      refetch();
    } catch {
      alert("فشل حفظ القالب");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا القالب؟")) return;
    setDeleting(id);
    try {
      await adminApi.deleteWaTemplate(id);
      refetch();
    } catch {
      alert("فشل الحذف");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (tpl: any) => {
    try {
      await adminApi.updateWaTemplate(tpl.id, { isActive: !tpl.isActive });
      refetch();
    } catch { /* silent */ }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{templates.length} قالب</p>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 text-xs bg-brand-500 text-white px-3 py-2 rounded-xl hover:bg-brand-600 font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> قالب جديد
        </button>
      </div>

      {templates.length === 0 ? <Empty icon={FileText} text="لا توجد قوالب" /> : (
        <div className="space-y-3">
          {templates.map((tpl: any) => (
            <div key={tpl.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-gray-800">{tpl.name}</h4>
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium",
                      tpl.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {tpl.isActive ? "مفعّل" : "معطّل"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                      {TEMPLATE_CATEGORIES[tpl.category] || tpl.category}
                    </span>
                  </div>
                  <pre className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3 mt-2 font-sans max-h-32 overflow-y-auto">
                    {tpl.body}
                  </pre>
                  {Array.isArray(tpl.variables) && tpl.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.variables.map((v: string) => (
                        <span key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(tpl)}
                    className={clsx("p-1.5 rounded-lg transition-colors", tpl.isActive ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-300 hover:bg-gray-50")}
                    title={tpl.isActive ? "تعطيل" : "تفعيل"}>
                    {tpl.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(tpl)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors" title="تعديل">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} disabled={deleting === tpl.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="حذف">
                    {deleting === tpl.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title={editId ? "تعديل القالب" : "قالب جديد"} width="max-w-lg">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">اسم القالب *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">المعرف (slug) *</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                  dir="ltr" placeholder="welcome_credentials" disabled={!!editId}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400 font-mono disabled:bg-gray-100" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">التصنيف</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400 bg-white">
                {Object.entries(TEMPLATE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">نص القالب *</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={8} placeholder="مرحباً {{owner_name}}،&#10;&#10;تم إنشاء حسابك..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 resize-none leading-relaxed" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">المتغيرات (مفصولة بفاصلة)</label>
              <input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))}
                placeholder="owner_name, org_name, login_url, password"
                dir="ltr" className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-400 font-mono" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button disabled={!form.name || !form.slug || !form.body || saving} onClick={handleSave}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editId ? "حفظ التعديلات" : "إنشاء القالب"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MESSAGE LOG
// ══════════════════════════════════════════════════════════════

function MessageLogSection() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, loading, refetch } = useApi(() => adminApi.waMessages({ status: statusFilter || undefined, page }), [page, statusFilter]);
  const messages = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setStatusFilter(""); setPage(1); }}
          className={clsx("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors", !statusFilter ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
          الكل
        </button>
        {Object.entries(STATUS_MAP).map(([k, v]) => (
          <button key={k} onClick={() => { setStatusFilter(k); setPage(1); }}
            className={clsx("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors", statusFilter === k ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
            {v.label}
          </button>
        ))}
        <button onClick={() => refetch()} className="mr-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> تحديث
        </button>
      </div>

      {loading ? <Spinner /> : messages.length === 0 ? <Empty icon={MessageCircle} text="لا توجد رسائل" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المستلم</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">القناة</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الرسالة</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg: any) => (
                <tr key={msg.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{msg.recipientName || "—"}</p>
                    <p className="text-xs text-gray-400 font-mono" dir="ltr">{msg.recipientPhone}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium",
                      msg.channel === "whatsapp" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                    )}>
                      {msg.channel === "whatsapp" ? "واتساب" : "SMS"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell max-w-xs">
                    <p className="text-xs text-gray-500 truncate">{msg.messageText}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                      STATUS_MAP[msg.status]?.color || "bg-gray-100 text-gray-500"
                    )}>
                      {STATUS_MAP[msg.status]?.label || msg.status}
                    </span>
                    {msg.errorMessage && msg.status === "failed" && (
                      <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[120px]">{msg.errorMessage}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString("ar") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
            السابق
          </button>
          <span className="text-xs text-gray-400">{page} / {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
