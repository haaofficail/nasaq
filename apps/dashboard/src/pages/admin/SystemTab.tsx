import React, { useState } from "react";
import {
  Activity, Users, ClipboardList, AlertTriangle, RefreshCw, Loader2, CheckCircle,
  Server, ShieldCheck, Briefcase, Search, Stethoscope, Lock, ChevronDown, Hash,
} from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner } from "./shared";

function OtpDebugPanel() {
  const [phone, setPhone] = useState("");
  const [otps, setOtps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsEnabled, setSmsEnabled] = useState<boolean | null>(null);

  const fetchOtps = async (q?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.debugOtp(q || undefined) as any;
      setOtps(res.data || []);
      setSmsEnabled(res.smsEnabled);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { fetchOtps(); }, []);

  if (smsEnabled === true) return null;

  return (
    <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-[6px] border-b border-amber-100 bg-amber-50/40">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800">رموز التحقق (OTP)</h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
            SMS غير مفعّل — مؤقت
          </span>
        </div>
        <p className="text-xs text-amber-600">يختفي هذا القسم فور تفعيل SMS_ENABLED=true</p>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text" value={phone} placeholder="ابحث برقم الجوال..."
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchOtps(phone)}
            className="flex-1 border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" dir="ltr"
          />
          <button onClick={() => fetchOtps(phone)} disabled={loading}
            className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
          <button onClick={() => { setPhone(""); fetchOtps(); }}
            className="px-3 py-2 border border-[#eef2f6] rounded-xl text-sm text-gray-500 hover:bg-[#f8fafc]">
            الكل
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        {otps.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لا توجد رموز نشطة حالياً</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#eef2f6]">
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">الجوال</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">الرمز</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">الغرض</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">ينتهي</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">محاولات</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {otps.map((otp: any) => {
                  const expired = new Date(otp.expiresAt) < new Date();
                  const used = !!otp.usedAt;
                  return (
                    <tr key={otp.id} className="border-b border-gray-50 hover:bg-[#f8fafc]/40">
                      <td className="py-2 px-3 font-mono text-xs text-gray-700">{otp.phone}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-1 bg-brand-50 text-brand-700 rounded-lg text-sm font-mono font-bold tracking-widest">
                          {otp.code}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">{otp.purpose === "login" ? "تسجيل دخول" : "تسجيل"}</td>
                      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(otp.expiresAt).toLocaleTimeString("ar-SA")}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        <span className={otp.attempts >= 3 ? "text-red-600 font-semibold" : "text-gray-500"}>
                          {otp.attempts ?? 0}/5
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {used ? (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">مستخدم</span>
                        ) : expired ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs">منتهي</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">نشط</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  database:    { label: "قاعدة البيانات",  icon: Server,        color: "text-blue-600",   bg: "bg-blue-50" },
  integrity:   { label: "سلامة البيانات",  icon: ShieldCheck,   color: "text-purple-600", bg: "bg-purple-50" },
  business:    { label: "منطق الأعمال",    icon: Briefcase,     color: "text-amber-600",  bg: "bg-amber-50" },
  performance: { label: "الأداء",          icon: Activity,      color: "text-emerald-600",bg: "bg-emerald-50" },
  security:    { label: "الأمان",          icon: Lock,          color: "text-red-600",    bg: "bg-red-50" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ok:    { label: "سليم",    color: "text-emerald-700", bg: "bg-emerald-50",  dot: "bg-emerald-400" },
  warn:  { label: "تحذير",   color: "text-amber-700",   bg: "bg-amber-50",    dot: "bg-amber-400" },
  error: { label: "خطأ",     color: "text-red-700",     bg: "bg-red-50",      dot: "bg-red-500" },
  info:  { label: "معلومة",  color: "text-blue-700",    bg: "bg-blue-50",     dot: "bg-blue-400" },
};

function SystemTab() {
  const { data, loading, refetch } = useApi(() => adminApi.system(), []);
  const { data: errData, loading: errLoading, refetch: refetchErrors } = useApi(() => adminApi.systemErrors(50), []);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["security", "integrity"]));
  const sys = data?.data;
  const errors: any[] = errData?.data || [];

  const runDiag = async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await adminApi.diagnostics() as any;
      setDiagResult(res.data);
      const cats = new Set<string>();
      for (const c of res.data?.checks ?? []) {
        if (c.status === "error" || c.status === "warn") cats.add(c.category);
      }
      if (cats.size > 0) setExpandedCategories(cats);
    } catch (e: any) {
      setDiagError(e.message);
    } finally {
      setDiagLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const groupedChecks = diagResult?.checks
    ? (Object.keys(CATEGORY_META) as string[]).map(cat => ({
        cat,
        checks: (diagResult.checks as any[]).filter((c: any) => c.category === cat),
      }))
    : [];

  return (
    <div className="space-y-5">
      <SectionHeader title="صحة النظام" sub="فحص شامل للبنية التحتية والبيانات والأمان"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => { refetch(); refetchErrors(); }} className="flex items-center gap-1.5 text-sm text-gray-500 border border-[#eef2f6] px-3 py-1.5 rounded-xl hover:bg-[#f8fafc]">
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </button>
            <button onClick={runDiag} disabled={diagLoading}
              className="flex items-center gap-1.5 text-sm text-white bg-brand-500 px-4 py-1.5 rounded-xl hover:bg-brand-600 disabled:opacity-50 font-semibold">
              {diagLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5" />}
              {diagLoading ? "جاري الفحص..." : "فحص شامل"}
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "زمن استجابة DB", value: `${sys?.dbLatencyMs ?? "—"} ms`, icon: Activity, bg: sys?.dbLatencyMs < 100 ? "bg-emerald-50" : "bg-orange-50", color: sys?.dbLatencyMs < 100 ? "text-emerald-600" : "text-orange-600" },
            { label: "جلسات نشطة", value: sys?.activeSessions ?? 0, icon: Users, bg: "bg-blue-50", color: "text-blue-600" },
            { label: "سجلات الصحة", value: sys?.history?.length ?? 0, icon: ClipboardList, bg: "bg-purple-50", color: "text-purple-600" },
            { label: "أخطاء الخادم (500)", value: errors.length, icon: AlertTriangle, bg: errors.length > 0 ? "bg-red-50" : "bg-[#f8fafc]", color: errors.length > 0 ? "text-red-600" : "text-gray-400" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-[#eef2f6] p-5 flex items-center gap-4">
              <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", k.bg)}>
                <k.icon className={clsx("w-5 h-5", k.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{k.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diagnostics Panel */}
      {(diagResult || diagLoading || diagError) && (
        <div className="space-y-3">
          {diagResult && (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-5 h-5 text-brand-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">نتائج الفحص الشامل</p>
                    <p className="text-xs text-gray-400">
                      {new Date(diagResult.runAt).toLocaleString("en-US")} — استغرق {diagResult.durationMs}ms
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { key: "error", label: "أخطاء", color: "text-red-600",     bg: "bg-red-50" },
                    { key: "warn",  label: "تحذيرات",color: "text-amber-600",  bg: "bg-amber-50" },
                    { key: "ok",    label: "سليم",   color: "text-emerald-700", bg: "bg-emerald-50" },
                    { key: "info",  label: "معلومات",color: "text-blue-700",   bg: "bg-blue-50" },
                  ].map(s => (
                    <div key={s.key} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold", s.bg, s.color)}>
                      <span className="text-lg font-bold tabular-nums">{(diagResult.summary as any)[s.key]}</span>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                {diagResult.summary.error > 0 && (
                  <div className="bg-red-500 h-full transition-all" style={{ width: `${(diagResult.summary.error / diagResult.summary.total) * 100}%` }} />
                )}
                {diagResult.summary.warn > 0 && (
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${(diagResult.summary.warn / diagResult.summary.total) * 100}%` }} />
                )}
                {diagResult.summary.ok > 0 && (
                  <div className="bg-emerald-400 h-full transition-all" style={{ width: `${(diagResult.summary.ok / diagResult.summary.total) * 100}%` }} />
                )}
                {diagResult.summary.info > 0 && (
                  <div className="bg-blue-300 h-full transition-all" style={{ width: `${(diagResult.summary.info / diagResult.summary.total) * 100}%` }} />
                )}
              </div>
            </div>
          )}

          {diagError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{diagError}</div>
          )}

          {groupedChecks.map(({ cat, checks }) => {
            const meta = CATEGORY_META[cat];
            const hasIssue = checks.some((c: any) => c.status === "error" || c.status === "warn");
            const isOpen = expandedCategories.has(cat);
            const worstStatus = checks.some((c: any) => c.status === "error") ? "error"
              : checks.some((c: any) => c.status === "warn") ? "warn" : "ok";

            return (
              <div key={cat} className={clsx("bg-white rounded-2xl border overflow-hidden", hasIssue ? "border-amber-200" : "border-[#eef2f6]")}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-5 py-[6px] hover:bg-[#f8fafc]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
                      <meta.icon className={clsx("w-4 h-4", meta.color)} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{meta.label}</span>
                    <span className="text-xs text-gray-400">({checks.length} فحص)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {checks.filter((c: any) => c.status === "error").length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                        {checks.filter((c: any) => c.status === "error").length} خطأ
                      </span>
                    )}
                    {checks.filter((c: any) => c.status === "warn").length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                        {checks.filter((c: any) => c.status === "warn").length} تحذير
                      </span>
                    )}
                    <span className={clsx("w-2 h-2 rounded-full", STATUS_META[worstStatus].dot)} />
                    <ChevronDown className={clsx("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-[#eef2f6] divide-y divide-gray-50">
                    {checks.map((check: any) => {
                      const sm = STATUS_META[check.status];
                      return (
                        <div key={check.id} className={clsx("flex items-start gap-3 px-5 py-3", check.status === "error" ? "bg-red-50/30" : check.status === "warn" ? "bg-amber-50/20" : "")}>
                          <span className={clsx("mt-1 w-2 h-2 rounded-full shrink-0", sm.dot)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-gray-700">{check.name}</p>
                              <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold", sm.bg, sm.color)}>
                                {sm.label}
                              </span>
                              {check.threshold && (
                                <span className="text-[10px] text-gray-400 font-mono">الحد: {check.threshold}</span>
                              )}
                              {check.value != null && (
                                <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{check.value}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{check.message}</p>
                            {check.details && check.status !== "info" && (
                              <details className="mt-1">
                                <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">تفاصيل</summary>
                                <pre className="text-[10px] text-gray-500 font-mono bg-[#f8fafc] rounded p-2 mt-1 overflow-auto max-h-24 whitespace-pre-wrap">
                                  {JSON.stringify(check.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <OtpDebugPanel />

      {/* Error Log */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-[6px] border-b border-[#eef2f6]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-700">سجل أخطاء الخادم</h3>
            {errors.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-semibold">{errors.length}</span>
            )}
          </div>
          <p className="text-xs text-gray-400">كل خطأ 500 يُسجَّل هنا مع الكود ومعرّف الطلب</p>
        </div>
        {errLoading ? <Spinner /> : errors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <p className="text-sm">لا توجد أخطاء خادم — النظام يعمل بشكل طبيعي</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-[#eef2f6]">
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الكود</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المسار</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الرسالة</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">Request ID</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-red-50/20">
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-mono font-bold">
                        {(e.details as any)?.code ?? "SRV_INTERNAL"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-mono text-gray-600">
                        {(e.details as any)?.method ?? ""} {(e.details as any)?.path ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 max-w-xs">
                      <p className="text-xs text-gray-500 truncate" title={(e.details as any)?.message}>
                        {(e.details as any)?.message ?? "—"}
                      </p>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-mono text-gray-400">{e.targetId ?? "—"}</span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                      {e.createdAt ? new Date(e.createdAt).toLocaleString("en-US") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Health Snapshots */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-[6px] border-b border-[#eef2f6]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-gray-700">سجل الفحص الدوري</h3>
            <span className="text-xs text-gray-400">كل 5 دقائق</span>
          </div>
        </div>
        {!sys?.history?.length ? (
          <p className="text-xs text-gray-400 text-center py-6">لا توجد snapshots بعد — يبدأ الفحص خلال 5 دقائق</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-[#eef2f6]">
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الوقت</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">DB (ms)</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">جلسات</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">منشآت</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">أخطاء</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {sys.history.map((h: any, i: number) => {
                  const warn = h.dbLatencyMs > 500 || Number(h.errorRate) > 5;
                  return (
                    <tr key={i} className={clsx("border-b border-gray-50", warn ? "bg-amber-50/40" : "hover:bg-[#f8fafc]/40")}>
                      <td className="py-2 px-4 text-xs text-gray-500 font-mono whitespace-nowrap">
                        {h.recordedAt ? new Date(h.recordedAt).toLocaleString("en-US") : "—"}
                      </td>
                      <td className="py-2 px-4 text-xs font-semibold">
                        <span className={h.dbLatencyMs > 500 ? "text-red-600" : h.dbLatencyMs > 200 ? "text-amber-600" : "text-emerald-600"}>
                          {h.dbLatencyMs ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-600">{h.activeSessions ?? "—"}</td>
                      <td className="py-2 px-4 text-xs text-gray-600">{h.activeOrgs ?? "—"}</td>
                      <td className="py-2 px-4 text-xs">
                        <span className={Number(h.errorRate) > 0 ? "text-red-600 font-semibold" : "text-gray-400"}>
                          {h.errorRate ?? "0"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-500 max-w-xs truncate">{h.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemTab;
