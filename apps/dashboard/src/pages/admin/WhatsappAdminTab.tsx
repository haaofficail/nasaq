import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Wifi, WifiOff, RefreshCw, LogOut, Smartphone } from "lucide-react";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { Spinner } from "./shared";

type WaStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

interface WaState {
  status:    WaStatus;
  phone:     string | null;
  qrBase64:  string | null;
  updatedAt: string;
}

// ── Status badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: WaStatus }) {
  const map: Record<WaStatus, { label: string; cls: string }> = {
    disconnected: { label: "غير متصل",    cls: "bg-gray-100 text-gray-600"  },
    connecting:   { label: "جاري الاتصال", cls: "bg-amber-100 text-amber-700" },
    qr_ready:     { label: "في انتظار المسح", cls: "bg-blue-100 text-blue-700"   },
    connected:    { label: "متصل",         cls: "bg-green-100 text-green-700"  },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ── Main tab ───────────────────────────────────────────────
export default function WhatsappAdminTab() {
  const [state,       setState]       = useState<WaState | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [connecting,  setConnecting]  = useState(false);
  const [acting,      setActing]      = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Poll status ──────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await adminApi.platformWaStatus();
      setState(res.data as WaState);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 4_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      abortRef.current?.abort();
    };
  }, [fetchStatus]);

  // ── Start SSE connect stream ─────────────────────────────
  const startConnect = async () => {
    if (connecting) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setConnecting(true);

    const token =
      localStorage.getItem("nasaq_token") ||
      sessionStorage.getItem("nasaq_token") || "";

    try {
      const res = await fetch("/api/v1/admin/whatsapp/connect", {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal:  ctrl.signal,
      });

      if (!res.ok || !res.body) {
        toast.error("تعذّر بدء الاتصال");
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const msg = JSON.parse(line.slice(5).trim());

            if (msg.type === "qr") {
              setState(prev => prev ? { ...prev, status: "qr_ready", qrBase64: msg.qr } : prev);
            } else if (msg.type === "connected") {
              setState(prev => prev ? { ...prev, status: "connected", qrBase64: null, phone: msg.phone } : prev);
              toast.success("تم الاتصال بواتساب الأدمن");
              setConnecting(false);
              return;
            } else if (msg.type === "error") {
              toast.error(msg.message ?? "فشل الاتصال");
              setConnecting(false);
              return;
            }
          } catch { /* bad JSON line */ }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("انقطع الاتصال");
    } finally {
      setConnecting(false);
    }
  };

  // ── Disconnect ───────────────────────────────────────────
  const disconnect = async () => {
    if (!confirm("هل تريد قطع الاتصال وحذف الجلسة؟")) return;
    setActing(true);
    abortRef.current?.abort();
    try {
      await adminApi.platformWaDisconnect();
      toast.success("تم قطع الاتصال");
      fetchStatus();
    } catch {
      toast.error("فشل قطع الاتصال");
    } finally {
      setActing(false);
    }
  };

  // ── Force reconnect ──────────────────────────────────────
  const reconnect = async () => {
    setActing(true);
    try {
      await adminApi.platformWaReconnect();
      toast.success("جاري إعادة الاتصال...");
      fetchStatus();
    } catch (err: any) {
      toast.error(err?.message ?? "لا توجد جلسة محفوظة");
    } finally {
      setActing(false);
    }
  };

  if (loading) return <Spinner />;

  const status = state?.status ?? "disconnected";

  return (
    <div className="space-y-6 max-w-xl">

      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-900">واتساب الأدمن</h2>
        <p className="text-xs text-gray-400 mt-0.5">الجلسة المستخدمة لإرسال رسائل المنصة للمنشآت</p>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {status === "connected"
              ? <Wifi className="w-4 h-4 text-green-500" />
              : <WifiOff className="w-4 h-4 text-gray-400" />
            }
            <span className="text-sm font-semibold text-gray-800">حالة الاتصال</span>
          </div>
          <StatusBadge status={status} />
        </div>

        {status === "connected" && state?.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 rounded-xl px-4 py-2.5">
            <Smartphone className="w-4 h-4 text-green-600 shrink-0" />
            <span dir="ltr" className="font-mono">{state.phone}</span>
          </div>
        )}

        {/* QR code */}
        {status === "qr_ready" && state?.qrBase64 && (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs text-gray-500">افتح واتساب &rarr; الأجهزة المرتبطة &rarr; ربط جهاز، ثم امسح الكود</p>
            <img
              src={state.qrBase64}
              alt="QR واتساب الأدمن"
              className="w-48 h-48 rounded-2xl border border-[#eef2f6] shadow-sm"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {status !== "connected" && (
            <button
              onClick={startConnect}
              disabled={connecting || acting}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              {status === "qr_ready" ? "في انتظار المسح..." : "اتصال / مسح QR"}
            </button>
          )}

          {status === "connected" && (
            <button
              onClick={reconnect}
              disabled={acting}
              className="flex items-center gap-2 border border-[#eef2f6] hover:border-[#eef2f6] text-gray-700 text-sm font-medium rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              إعادة اتصال
            </button>
          )}

          {status !== "disconnected" && (
            <button
              onClick={disconnect}
              disabled={acting}
              className="flex items-center gap-2 border border-red-200 hover:border-red-300 text-red-600 text-sm font-medium rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              قطع الاتصال
            </button>
          )}

          <button
            onClick={fetchStatus}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 ml-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-xs text-blue-700 leading-relaxed space-y-1">
        <p className="font-semibold text-blue-800">ملاحظات مهمة</p>
        <ul className="list-disc list-inside space-y-1">
          <li>يتم استعادة الاتصال تلقائياً عند إعادة تشغيل الخادم.</li>
          <li>عند قطع الاتصال تُحذف بيانات الجلسة — ستحتاج مسح QR جديد.</li>
          <li>هذه الجلسة مستقلة تماماً عن جلسات واتساب المنشآت.</li>
        </ul>
      </div>
    </div>
  );
}
