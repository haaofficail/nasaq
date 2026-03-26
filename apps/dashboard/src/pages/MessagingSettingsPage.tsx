import { useState, useEffect, useRef } from "react";
import {
  MessageCircle, Wifi, WifiOff, Send, RefreshCw, CheckCircle,
  XCircle, Clock, Loader2, ChevronDown, ChevronUp, Eye, RotateCcw,
  Settings, FileText, List, BarChart2, Phone, Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { messagingApi, settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input } from "@/components/ui";

const TABS = [
  { key: "connection", label: "الاتصال", icon: Wifi },
  { key: "templates", label: "القوالب", icon: FileText },
  { key: "settings", label: "الإعدادات", icon: Settings },
  { key: "logs", label: "السجل", icon: List },
];

const CATEGORY_LABELS: Record<string, string> = {
  bookings: "الحجوزات",
  payments: "المدفوعات",
  customers: "العملاء",
  staff: "الموظفون",
  inventory: "المخزون",
  general: "عام",
};

const CATEGORY_COLORS: Record<string, string> = {
  bookings: "bg-blue-500",
  payments: "bg-emerald-500",
  customers: "bg-violet-500",
  staff: "bg-amber-500",
  inventory: "bg-orange-500",
  general: "bg-gray-400",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  sent: { label: "مرسل", cls: "bg-emerald-50 text-emerald-600" },
  failed: { label: "فشل", cls: "bg-red-50 text-red-600" },
  pending: { label: "قيد الانتظار", cls: "bg-amber-50 text-amber-600" },
  scheduled: { label: "مجدول", cls: "bg-blue-50 text-blue-600" },
};

const SEND_TO_OPTIONS = [
  { value: "customer", label: "العميل" },
  { value: "owner", label: "المالك" },
  { value: "provider", label: "مزود الخدمة" },
  { value: "all", label: "الجميع" },
];

// ─── Connection Tab ────────────────────────────────────────────────
function ConnectionTab() {
  const { data: statusRes, loading, refetch } = useApi(() => messagingApi.status(), []);
  const { data: profileRes } = useApi(() => settingsApi.profile(), []);
  const status: any = statusRes?.data || {};
  const org: any = profileRes?.data || {};

  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("مرحباً! هذه رسالة تجريبية من نسق.");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const { mutate: sendTest, loading: testing } = useMutation(({ phone, message }: any) =>
    messagingApi.test(phone, message)
  );
  const { mutate: disconnect, loading: disconnecting } = useMutation(() =>
    messagingApi.disconnect()
  );
  const sseRef = useRef<AbortController | null>(null);

  const handleConnect = async () => {
    setShowQR(true);
    setConnecting(true);
    setQrData("");
    setConnectMsg("جارٍ الاتصال...");

    sseRef.current = new AbortController();
    try {
      const res = await messagingApi.connect();
      if (!res.body) { setConnectMsg("فشل الاتصال"); setConnecting(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.type === "qr") {
              setQrData(payload.qr);
              setConnectMsg("امسح الرمز بواتساب");
              setConnecting(false);
            } else if (payload.type === "connected") {
              setQrData("");
              setConnectMsg(`تم الاتصال — ${payload.phone || ""}`);
              setConnecting(false);
              setTimeout(() => { setShowQR(false); refetch(); }, 1500);
            } else if (payload.type === "error") {
              setConnectMsg(`خطأ: ${payload.message}`);
              setConnecting(false);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setConnectMsg("انقطع الاتصال");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("فصل واتساب؟")) return;
    await disconnect(null);
    refetch();
  };

  const handleTest = async () => {
    if (!testPhone || !testMsg) return;
    await sendTest({ phone: testPhone, message: testMsg });
  };

  useEffect(() => () => { sseRef.current?.abort(); }, []);

  const isConnected = status.status === "connected";

  return (
    <div className="space-y-4">

      {/* Org identity card */}
      <div className="bg-gradient-to-br from-[#5b9bd5]/8 to-[#5b9bd5]/3 border border-[#5b9bd5]/20 rounded-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#5b9bd5] flex items-center justify-center shrink-0 shadow-sm">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{org.name || "—"}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {org.phone && (
              <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                <Phone className="w-3 h-3" /> {org.phone}
              </span>
            )}
            {org.vatNumber && (
              <span className="text-xs text-gray-400 font-mono">
                الرقم الضريبي: {org.vatNumber}
              </span>
            )}
            {org.businessType && (
              <span className="text-xs bg-[#5b9bd5]/10 text-[#5b9bd5] px-2.5 py-0.5 rounded-full font-medium">
                {org.businessType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Safety notice — collapsible */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setNoticeOpen((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-100/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <XCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-800">تنبيهات هامة قبل الربط</p>
          </div>
          {noticeOpen ? (
            <ChevronUp className="w-4 h-4 text-amber-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-500" />
          )}
        </button>
        {noticeOpen && (
          <div className="px-5 pb-4 space-y-3">
            <ul className="space-y-2.5 text-xs text-amber-800 leading-relaxed">
              {[
                "استخدم رقماً مخصصاً للأعمال فقط — لا تستخدم رقمك الشخصي لتجنب الحظر.",
                "لا ترسل رسائل جماعية غير مرغوب فيها (Spam) — قد يؤدي ذلك إلى حظر الرقم نهائياً.",
                "تأكد أن المستلمين وافقوا على تلقي الرسائل منك مسبقاً.",
                "لا تتجاوز الحد اليومي للرسائل — نوصي بـ 100 رسالة يومياً كحد أقصى للحسابات الجديدة.",
                "أبقِ الهاتف متصلاً بالإنترنت واستخدمه بشكل طبيعي مع واتساب لتجنب الاشتباه.",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="border-t border-amber-200 pt-3">
              <p className="text-[11px] text-amber-600 leading-relaxed">
                <span className="font-semibold">إخلاء المسؤولية:</span> نسق يوفر أداة إرسال تقنية فقط. أي حظر أو تقييد يطرأ على حسابك في واتساب يقع على عاتق المستخدم كاملاً، ولا تتحمل نسق أي مسؤولية قانونية أو مالية ناتجة عن سوء الاستخدام أو انتهاك سياسات واتساب.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Card — premium */}
      <div className={clsx(
        "bg-white rounded-2xl border p-6 transition-all",
        isConnected
          ? "border-emerald-200 shadow-sm shadow-emerald-100"
          : "border-gray-100"
      )}>
        <div className="flex items-center gap-5">
          <div className={clsx(
            "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
            isConnected ? "bg-emerald-50" : "bg-gray-50"
          )}>
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : isConnected ? (
              <Wifi className="w-6 h-6 text-emerald-500" />
            ) : (
              <WifiOff className="w-6 h-6 text-gray-300" />
            )}
          </div>
          <div className="flex-1">
            {isConnected ? (
              <>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  متصل
                </span>
                <p className="text-base font-bold text-gray-900">مربوط بواتساب بنجاح</p>
                {status.phoneNumber && (
                  <p className="text-sm text-gray-400 mt-0.5 font-mono">{status.phoneNumber}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-base font-bold text-gray-700">غير متصل</p>
                <p className="text-sm text-gray-400 mt-0.5">اربط حساب واتساب للبدء في إرسال الرسائل التلقائية</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isConnected ? (
              <Button variant="secondary" onClick={handleDisconnect} loading={disconnecting}>
                فصل
              </Button>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-[#5b9bd5]/20"
              >
                <MessageCircle className="w-4 h-4" />
                ربط واتساب
              </button>
            )}
            <button
              onClick={refetch}
              className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      <Modal
        open={showQR}
        onClose={() => { setShowQR(false); sseRef.current?.abort(); }}
        title="ربط واتساب"
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => { setShowQR(false); sseRef.current?.abort(); }}>
            إغلاق
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-5 py-4">
          {connecting ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-2xl bg-[#5b9bd5]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#5b9bd5]" />
              </div>
              <p className="text-sm text-gray-500">{connectMsg}</p>
            </div>
          ) : qrData ? (
            <>
              <div className="bg-white p-4 rounded-2xl border-2 border-[#5b9bd5]/20 shadow-md shadow-[#5b9bd5]/5">
                <img
                  src={qrData}
                  alt="QR واتساب"
                  className="w-56 h-56 block"
                />
              </div>
              <p className="text-sm font-semibold text-gray-700 text-center">{connectMsg}</p>
              <div className="w-full space-y-2.5">
                {[
                  "افتح واتساب على هاتفك",
                  "اذهب إلى الإعدادات ← الأجهزة المقترنة",
                  "اضغط «اقتران جهاز» وامسح الرمز",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#5b9bd5]/10 text-[#5b9bd5] text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-xs text-gray-500">{step}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 py-6">{connectMsg}</p>
          )}
        </div>
      </Modal>

      {/* Test Send */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#5b9bd5]/10 flex items-center justify-center">
            <Send className="w-4 h-4 text-[#5b9bd5]" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">إرسال تجريبي</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="رقم الجوال"
            name="phone"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="05xxxxxxxx"
            dir="ltr"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">الرسالة</label>
            <input
              type="text"
              value={testMsg}
              onChange={(e) => setTestMsg(e.target.value)}
              className="border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          {!isConnected && (
            <p className="text-xs text-amber-500">يجب الاتصال بواتساب أولاً</p>
          )}
          <div className="flex-1" />
          <Button
            icon={Send}
            onClick={handleTest}
            loading={testing}
            disabled={!isConnected || !testPhone}
          >
            إرسال
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────
function TemplatesTab() {
  const { data: tplRes, loading, refetch } = useApi(() => messagingApi.templates(), []);
  const { data: varRes } = useApi(() => messagingApi.variables(), []);
  const grouped: Record<string, any[]> = tplRes?.data || {};
  const standardVars: any[] = varRes?.data?.standard || [];

  const { mutate: updateTemplate } = useMutation(({ id, data }: any) =>
    messagingApi.updateTemplate(id, data)
  );
  const { mutate: resetTemplate } = useMutation((eventType: string) =>
    messagingApi.resetTemplate(eventType)
  );

  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [delayUnits, setDelayUnits] = useState<Record<string, "minutes" | "hours" | "days">>({});

  const getDelayUnit = (id: string) => delayUnits[id] || "minutes";
  const DELAY_UNIT_OPTIONS = [
    { value: "minutes", label: "دقائق", factor: 1 },
    { value: "hours",   label: "ساعات",  factor: 60 },
    { value: "days",    label: "أيام",   factor: 1440 },
  ];
  const getDelayDisplay = (id: string, minutes: number) => {
    const unit = getDelayUnit(id);
    const factor = DELAY_UNIT_OPTIONS.find(u => u.value === unit)!.factor;
    return Math.round(minutes / factor) || 0;
  };

  const toggleCat = (cat: string) =>
    setOpenCats((p) => ({ ...p, [cat]: !p[cat] }));

  const getEdit = (tpl: any) => editing[tpl.id] ?? {
    message_ar: tpl.message_ar || tpl.body || "",
    is_active: tpl.is_active ?? true,
    send_to: tpl.send_to || "customer",
    delay_minutes: tpl.delay_minutes || 0,
  };

  const setField = (id: string, field: string, value: any) =>
    setEditing((p) => ({ ...p, [id]: { ...getEditById(p, id), [field]: value } }));

  const getEditById = (p: Record<string, any>, id: string) => p[id] ?? {};

  const handleSave = async (tpl: any) => {
    setSaving(tpl.id);
    try {
      await updateTemplate({ id: tpl.id, data: getEdit(tpl) });
      refetch();
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (tpl: any) => {
    if (!confirm("إرجاع القالب للنص الافتراضي؟")) return;
    await resetTemplate(tpl.event_type);
    refetch();
  };

  const renderPreview = (msg: string) => {
    let preview = msg;
    standardVars.forEach((v: any) => {
      preview = preview.split(`{${v.key}}`).join(`[${v.label}]`);
    });
    return preview;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-[#5b9bd5]" />
      <p className="text-sm text-gray-400">جارٍ التحميل...</p>
    </div>
  );

  const categories = Object.keys(grouped);

  return (
    <div className="space-y-3">
      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-gray-200" />
          </div>
          <p className="text-sm font-medium text-gray-400">لا توجد قوالب</p>
        </div>
      ) : (
        categories.map((cat) => {
          const templates = grouped[cat] || [];
          const isOpen = openCats[cat] !== false;
          const accentColor = CATEGORY_COLORS[cat] || "bg-gray-400";
          return (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={clsx("w-1 h-6 rounded-full shrink-0", accentColor)} />
                  <span className="text-sm font-semibold text-gray-900">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                    {templates.length}
                  </span>
                  <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
                    {templates.filter((t) => t.is_active).length} مفعّل
                  </span>
                </div>
                <div className={clsx(
                  "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                  isOpen ? "bg-gray-100" : "hover:bg-gray-100"
                )}>
                  {isOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="divide-y divide-gray-50 border-t border-gray-50">
                  {templates.map((tpl: any) => {
                    const ed = getEdit(tpl);
                    const isPreviewing = showPreview === tpl.id;
                    const charCount = ed.message_ar?.length || 0;
                    return (
                      <div key={tpl.id} className="p-5 space-y-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">
                              {tpl.title || tpl.event_type}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 tracking-wide">
                              {tpl.event_type}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Active toggle */}
                            <button
                              onClick={() => setField(tpl.id, "is_active", !ed.is_active)}
                              className={clsx(
                                "relative w-11 h-6 rounded-full transition-colors shrink-0",
                                ed.is_active ? "bg-[#5b9bd5]" : "bg-gray-200"
                              )}
                            >
                              <span className={clsx(
                                "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                                ed.is_active ? "right-1" : "left-1"
                              )} />
                            </button>
                            <button
                              onClick={() => setShowPreview(isPreviewing ? null : tpl.id)}
                              className={clsx(
                                "p-1.5 rounded-lg transition-colors",
                                isPreviewing
                                  ? "bg-[#5b9bd5]/10 text-[#5b9bd5]"
                                  : "hover:bg-gray-100 text-gray-400"
                              )}
                              title="معاينة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReset(tpl)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                              title="إرجاع للافتراضي"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Send to + delay */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">إرسال إلى</label>
                            <select
                              value={ed.send_to}
                              onChange={(e) => setField(tpl.id, "send_to", e.target.value)}
                              className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 bg-white transition-all"
                            >
                              {SEND_TO_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">تأخير الإرسال</label>
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={getDelayDisplay(tpl.id, ed.delay_minutes)}
                                onChange={(e) => {
                                  const unit = getDelayUnit(tpl.id);
                                  const factor = DELAY_UNIT_OPTIONS.find(u => u.value === unit)!.factor;
                                  setField(tpl.id, "delay_minutes", Number(e.target.value) * factor);
                                }}
                                className="w-20 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
                                dir="ltr"
                              />
                              <select
                                value={getDelayUnit(tpl.id)}
                                onChange={(e) => setDelayUnits(p => ({ ...p, [tpl.id]: e.target.value as any }))}
                                className="flex-1 border border-gray-100 rounded-xl px-2 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 bg-white transition-all"
                              >
                                {DELAY_UNIT_OPTIONS.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Message textarea or preview */}
                        {!isPreviewing ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs text-gray-400 font-medium">نص الرسالة</label>
                              <span className={clsx(
                                "text-[10px] tabular-nums",
                                charCount > 1000 ? "text-red-400" : "text-gray-300"
                              )}>
                                {charCount} حرف
                              </span>
                            </div>
                            <textarea
                              rows={3}
                              value={ed.message_ar}
                              onChange={(e) => setField(tpl.id, "message_ar", e.target.value)}
                              className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all resize-none font-mono leading-relaxed"
                              dir="rtl"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">معاينة الرسالة</label>
                            <div className="bg-gray-50 rounded-xl p-3.5 text-sm text-gray-700 whitespace-pre-wrap font-mono border border-gray-100 leading-relaxed">
                              {renderPreview(ed.message_ar)}
                            </div>
                          </div>
                        )}

                        {/* Variables chips */}
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium mb-2">متغيرات متاحة — انقر للإدراج</p>
                          <div className="flex flex-wrap gap-1.5">
                            {standardVars.slice(0, 8).map((v: any) => (
                              <button
                                key={v.key}
                                onClick={() => setField(tpl.id, "message_ar", ed.message_ar + `{${v.key}}`)}
                                className="text-[10px] bg-[#5b9bd5]/8 text-[#5b9bd5] border border-[#5b9bd5]/20 px-2 py-0.5 rounded-full hover:bg-[#5b9bd5]/15 transition-colors font-mono"
                                title={v.description}
                              >
                                {v.label || v.key} <span className="opacity-60 font-mono">{`{${v.key}}`}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <Button
                            onClick={() => handleSave(tpl)}
                            loading={saving === tpl.id}
                          >
                            حفظ التغييرات
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────
function SettingsTab() {
  const { data: settingsRes, loading } = useApi(() => messagingApi.settings(), []);
  const [form, setForm] = useState<any>(null);
  const { mutate: save, loading: saving } = useMutation((data: any) =>
    messagingApi.updateSettings(data)
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsRes?.data) setForm(settingsRes.data);
  }, [settingsRes]);

  if (loading || !form) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-[#5b9bd5]" />
      <p className="text-sm text-gray-400">جارٍ التحميل...</p>
    </div>
  );

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    await save(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ field, label }: { field: string; label: string }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => set(field, !form[field])}
        className={clsx(
          "relative w-12 h-6 rounded-full transition-colors shrink-0",
          form[field] ? "bg-[#5b9bd5]" : "bg-gray-200"
        )}
      >
        <span className={clsx(
          "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
          form[field] ? "right-1" : "left-1"
        )} />
      </button>
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
      <span className="border-r-2 border-[#5b9bd5] pr-2 text-gray-500">{children}</span>
    </h3>
  );

  const DAYS = [
    { key: "sunday", label: "أحد" },
    { key: "monday", label: "اثنين" },
    { key: "tuesday", label: "ثلاثاء" },
    { key: "wednesday", label: "أربعاء" },
    { key: "thursday", label: "خميس" },
    { key: "friday", label: "جمعة" },
    { key: "saturday", label: "سبت" },
  ];

  return (
    <div className="space-y-4">

      {/* General */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-1">
        <SectionTitle>إعدادات عامة</SectionTitle>
        <div className="divide-y divide-gray-50">
          <Toggle field="is_enabled" label="تفعيل الرسائل التلقائية" />
          <Toggle field="use_business_hours" label="إرسال خلال ساعات العمل فقط" />
        </div>
        {form.use_business_hours && (
          <div className="pt-3 space-y-3 border-t border-gray-50">
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => set(`wh_${d.key}`, !form[`wh_${d.key}`])}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border",
                    form[`wh_${d.key}`]
                      ? "bg-[#5b9bd5] text-white border-[#5b9bd5]"
                      : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">من</label>
                <input
                  type="time"
                  value={form.business_hours_start || "09:00"}
                  onChange={(e) => set("business_hours_start", e.target.value)}
                  className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">إلى</label>
                <input
                  type="time"
                  value={form.business_hours_end || "22:00"}
                  onChange={(e) => set("business_hours_end", e.target.value)}
                  className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Limits */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <SectionTitle>الحدود اليومية</SectionTitle>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">حد الرسائل اليومية</label>
            <input
              type="number"
              min={1}
              value={form.daily_limit || 100}
              onChange={(e) => set("daily_limit", Number(e.target.value))}
              className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">انتظار بين الرسائل (ثانية)</label>
            <input
              type="number"
              min={0}
              value={form.min_delay_seconds || 3}
              onChange={(e) => set("min_delay_seconds", Number(e.target.value))}
              className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Booking reminders */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-1">
        <SectionTitle>تذكيرات الحجز</SectionTitle>
        <div className="divide-y divide-gray-50">
          <Toggle field="booking_reminder_enabled" label="تفعيل تذكيرات الحجز" />
        </div>
        {form.booking_reminder_enabled && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50">
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">قبل الحجز بـ (ساعة)</label>
              <input
                type="number"
                min={1}
                value={form.reminder_hours_before || 24}
                onChange={(e) => set("reminder_hours_before", Number(e.target.value))}
                className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">تذكير ثانٍ قبل (ساعة)</label>
              <input
                type="number"
                min={0}
                value={form.second_reminder_hours || 2}
                onChange={(e) => set("second_reminder_hours", Number(e.target.value))}
                className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
                dir="ltr"
              />
            </div>
          </div>
        )}
      </div>

      {/* Follow-up */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-1">
        <SectionTitle>رسائل المتابعة</SectionTitle>
        <div className="divide-y divide-gray-50">
          <Toggle field="followup_enabled" label="تفعيل رسائل المتابعة" />
        </div>
        {form.followup_enabled && (
          <div className="pt-3 border-t border-gray-50">
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">بعد اكتمال الحجز بـ (ساعة)</label>
            <input
              type="number"
              min={1}
              value={form.followup_hours_after || 24}
              onChange={(e) => set("followup_hours_after", Number(e.target.value))}
              className="border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all max-w-[180px]"
              dir="ltr"
            />
          </div>
        )}
      </div>

      {/* Owner notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-1">
        <SectionTitle>إشعارات المالك</SectionTitle>
        <div className="divide-y divide-gray-50">
          <Toggle field="notify_owner_new_booking" label="حجز جديد" />
          <Toggle field="notify_owner_cancellation" label="إلغاء حجز" />
          <Toggle field="notify_owner_payment" label="استلام دفعة" />
          <Toggle field="notify_owner_low_stock" label="نفاد مخزون" />
        </div>
      </div>

      {/* Staff notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-1">
        <SectionTitle>إشعارات الموظفين</SectionTitle>
        <div className="divide-y divide-gray-50">
          <Toggle field="notify_staff_assignment" label="تكليف بمهمة جديدة" />
          <Toggle field="notify_staff_schedule_change" label="تغيير في الجدول" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} variant={saved ? "secondary" : "primary"}>
          {saved ? "تم الحفظ" : "حفظ الإعدادات"}
        </Button>
      </div>
    </div>
  );
}

// ─── Logs Tab ────────────────────────────────────────────────
function LogsTab() {
  const { data: statsRes } = useApi(() => messagingApi.stats(), []);
  const stats: any = statsRes?.data || {};

  const [filters, setFilters] = useState({ status: "", category: "", date: "" });
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  const { data: logsRes, loading } = useApi(
    () => messagingApi.logs({ ...filters, limit: PER_PAGE, offset: page * PER_PAGE }),
    [filters, page]
  );
  const logs: any[] = logsRes?.data || [];
  const total: number = logsRes?.total || 0;

  const setFilter = (key: string, val: string) => {
    setFilters((p) => ({ ...p, [key]: val }));
    setPage(0);
  };

  const statCards = [
    {
      label: "مرسل",
      value: stats.sent || 0,
      numCls: "text-emerald-600",
      iconBg: "bg-emerald-50",
      iconCls: "text-emerald-500",
      icon: CheckCircle,
    },
    {
      label: "فشل",
      value: stats.failed || 0,
      numCls: "text-red-500",
      iconBg: "bg-red-50",
      iconCls: "text-red-400",
      icon: XCircle,
    },
    {
      label: "اليوم",
      value: stats.today || 0,
      numCls: "text-[#5b9bd5]",
      iconBg: "bg-[#5b9bd5]/10",
      iconCls: "text-[#5b9bd5]",
      icon: Send,
    },
    {
      label: "هذا الشهر",
      value: stats.month || 0,
      numCls: "text-violet-600",
      iconBg: "bg-violet-50",
      iconCls: "text-violet-500",
      icon: BarChart2,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", s.iconBg)}>
                <Icon className={clsx("w-5 h-5", s.iconCls)} />
              </div>
              <p className={clsx("text-3xl font-bold tabular-nums leading-none", s.numCls)}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium shrink-0">
          <List className="w-3.5 h-3.5" />
          فلترة:
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
          className="border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 bg-white transition-all"
        >
          <option value="">كل الحالات</option>
          <option value="sent">مرسل</option>
          <option value="failed">فشل</option>
          <option value="pending">قيد الانتظار</option>
          <option value="scheduled">مجدول</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilter("category", e.target.value)}
          className="border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 bg-white transition-all"
        >
          <option value="">كل الفئات</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilter("date", e.target.value)}
          className="border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#5b9bd5]/40 focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all"
          dir="ltr"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#5b9bd5]" />
            <p className="text-sm text-gray-400">جارٍ التحميل...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-7 h-7 text-gray-200" />
            </div>
            <p className="text-sm font-medium text-gray-400">لا توجد رسائل</p>
            <p className="text-xs text-gray-300 mt-1">جرّب تغيير الفلاتر</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-right py-3 px-5 text-[10px] text-gray-400 font-semibold uppercase tracking-widest">التاريخ</th>
                  <th className="text-right py-3 px-4 text-[10px] text-gray-400 font-semibold uppercase tracking-widest">المستلم</th>
                  <th className="text-right py-3 px-4 text-[10px] text-gray-400 font-semibold uppercase tracking-widest">الحدث</th>
                  <th className="text-right py-3 px-4 text-[10px] text-gray-400 font-semibold uppercase tracking-widest">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, idx: number) => {
                  const badge = STATUS_BADGE[log.status] || { label: log.status, cls: "bg-gray-100 text-gray-500" };
                  return (
                    <tr
                      key={log.id}
                      className={clsx(
                        "border-b border-gray-50 hover:bg-[#5b9bd5]/3 transition-colors",
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      )}
                    >
                      <td className="py-3.5 px-5 text-gray-400 tabular-nums text-xs">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString("en-US") : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-gray-800 text-xs">{log.recipient_name || "—"}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{log.phone_number}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-gray-600 font-medium">{log.event_type || log.template_id}</p>
                        {log.error_message && (
                          <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[200px]">{log.error_message}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-semibold", badge.cls)}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {total > PER_PAGE && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50">
                <p className="text-xs text-gray-400 tabular-nums">
                  {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, total)} من {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3.5 py-1.5 rounded-xl text-xs border border-gray-100 hover:bg-gray-50 hover:border-gray-200 disabled:opacity-40 transition-colors font-medium text-gray-600"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * PER_PAGE >= total}
                    className="px-3.5 py-1.5 rounded-xl text-xs border border-gray-100 hover:bg-gray-50 hover:border-gray-200 disabled:opacity-40 transition-colors font-medium text-gray-600"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function MessagingSettingsPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">رسائل واتساب</h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة الاتصال والقوالب وإعدادات الإرسال التلقائي</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5b9bd5]/20 to-[#5b9bd5]/5 border border-[#5b9bd5]/15 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-[#5b9bd5]" />
        </div>
      </div>

      {/* Tabs — underline style */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(i)}
                className={clsx(
                  "flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap",
                  activeTab === i
                    ? "border-[#5b9bd5] text-[#5b9bd5]"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 0 && <ConnectionTab />}
          {activeTab === 1 && <TemplatesTab />}
          {activeTab === 2 && <SettingsTab />}
          {activeTab === 3 && <LogsTab />}
        </div>
      </div>
    </div>
  );
}
