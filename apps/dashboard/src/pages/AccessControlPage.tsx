import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { accessControlApi, customersApi } from "@/lib/api";
import {
  ShieldCheck, ShieldX, Plus, X, Loader2, AlertCircle,
  RefreshCw, Users, CheckCircle2, XCircle, Search,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const iCls = "w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white";
const selCls = iCls + " appearance-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AccessControlPage() {
  const [filterGranted, setFilterGranted] = useState<"" | "true" | "false">("");
  const [filterDate,    setFilterDate]    = useState("");
  const [search,        setSearch]        = useState("");
  const [modal, setModal] = useState<"manual" | null>(null);
  const [manualForm, setManualForm] = useState({
    customerId:   "",
    customerName: "",
    granted:      true,
    denyReason:   "",
  });
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState("");

  const params = useMemo(() => ({
    ...(filterGranted ? { granted: filterGranted === "true" } : {}),
    ...(filterDate    ? { date: filterDate }                  : {}),
  }), [filterGranted, filterDate]);

  const { data: listRes, loading, error, refetch } = useApi(
    () => accessControlApi.list(params), [filterGranted, filterDate],
  );
  const { data: statsRes, refetch: refetchStats } = useApi(() => accessControlApi.stats(), []);
  const { data: customersRes } = useApi(() => customersApi.list({ limit: "200" }), []);

  const logs      = listRes?.data     ?? [];
  const stats     = statsRes?.data;
  const customers = customersRes?.data ?? [];

  // filter by search client-side
  const filtered = search.trim()
    ? logs.filter((l: any) =>
        (l.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.accessToken  || "").toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  const mf = (k: keyof typeof manualForm, v: any) =>
    setManualForm(prev => ({ ...prev, [k]: v }));

  const openManual = () => {
    setManualForm({ customerId: "", customerName: "", granted: true, denyReason: "" });
    setFormErr("");
    setModal("manual");
  };

  const handleManual = async () => {
    if (!manualForm.customerId && !manualForm.customerName.trim())
      return setFormErr("حدد العميل أو اكتب اسمه");
    setSaving(true);
    setFormErr("");
    try {
      await accessControlApi.manual({
        customerId:   manualForm.customerId   || undefined,
        customerName: manualForm.customerName || undefined,
        granted:      manualForm.granted,
        denyReason:   manualForm.denyReason   || undefined,
      });
      refetch();
      refetchStats();
      setModal(null);
    } catch { setFormErr("فشل تسجيل الدخول"); }
    finally { setSaving(false); }
  };

  // ── Stat cards ───────────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">التحكم في الدخول</h1>
          <p className="text-sm text-gray-500 mt-0.5">سجل دخول الأعضاء والمشتركين</p>
        </div>
        <button
          onClick={openManual}
          className="inline-flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 h-9 rounded-xl hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          تسجيل دخول يدوي
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{stats?.todayGranted ?? 0}</p>
            <p className="text-xs text-gray-400">دخول مسموح اليوم</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{stats?.todayDenied ?? 0}</p>
            <p className="text-xs text-gray-400">دخول مرفوض اليوم</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{stats?.totalLogs ?? 0}</p>
            <p className="text-xs text-gray-400">إجمالي السجلات</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم العميل..."
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 h-9 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 bg-white"
          />
        </div>
        <select value={filterGranted} onChange={e => setFilterGranted(e.target.value as any)}
          className="border border-gray-200 rounded-xl px-3 h-9 text-sm bg-white appearance-none min-w-32">
          <option value="">كل الحالات</option>
          <option value="true">مسموح</option>
          <option value="false">مرفوض</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 h-9 text-sm bg-white"
          dir="ltr"
        />
        <button onClick={() => { refetch(); refetchStats(); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><SkeletonRows rows={8} /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-400">فشل تحميل البيانات</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">لا توجد سجلات دخول</p>
            <p className="text-xs text-gray-400">ستظهر هنا بعد أول عملية دخول</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 bg-gray-50/50">
                  <th className="text-right font-medium px-4 py-3">الحالة</th>
                  <th className="text-right font-medium px-4 py-3">العميل</th>
                  <th className="text-right font-medium px-4 py-3">الطريقة</th>
                  <th className="text-right font-medium px-4 py-3">سبب الرفض</th>
                  <th className="text-right font-medium px-4 py-3">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((l: any) => (
                  <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      {l.granted ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> مسموح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-0.5 rounded-lg">
                          <XCircle className="w-3.5 h-3.5" /> مرفوض
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{l.customerName || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {l.method === "qr" ? "QR" : l.method === "card" ? "بطاقة" : "يدوي"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{l.denyReason || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">{fmtDate(l.accessedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {modal === "manual" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">تسجيل دخول يدوي</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <Field label="العميل">
              <select
                value={manualForm.customerId}
                onChange={e => {
                  const cid = e.target.value;
                  const c = customers.find((x: any) => x.id === cid);
                  mf("customerId", cid);
                  if (c) mf("customerName", (c as any).name);
                  else   mf("customerName", "");
                }}
                className={selCls}
              >
                <option value="">— اختر عميل مسجل —</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {!manualForm.customerId && (
              <Field label="أو اكتب الاسم يدوياً">
                <input value={manualForm.customerName} onChange={e => mf("customerName", e.target.value)} className={iCls} placeholder="اسم الزائر" />
              </Field>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">القرار</p>
              <div className="flex gap-2">
                <button
                  onClick={() => mf("granted", true)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-colors",
                    manualForm.granted
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50",
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" /> سماح
                </button>
                <button
                  onClick={() => mf("granted", false)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-colors",
                    !manualForm.granted
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50",
                  )}
                >
                  <XCircle className="w-4 h-4" /> رفض
                </button>
              </div>
            </div>
            {!manualForm.granted && (
              <Field label="سبب الرفض">
                <input value={manualForm.denyReason} onChange={e => mf("denyReason", e.target.value)} className={iCls} placeholder="انتهى الاشتراك، دخول غير مصرح..." />
              </Field>
            )}
            {formErr && <p className="text-xs text-red-500">{formErr}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleManual}
                disabled={saving}
                className="flex-1 bg-brand-500 text-white text-sm font-medium h-10 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                تسجيل
              </button>
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-sm text-gray-600 h-10 rounded-xl hover:bg-gray-50 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
