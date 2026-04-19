import { useState } from "react";
import {
  ShieldCheck, AlertTriangle, RefreshCw, Loader2, CheckCircle2,
  Play, ChevronDown, Building2, Clock, X,
} from "lucide-react";
import { clsx } from "clsx";
import { guardianApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner } from "./shared";
import { toast } from "@/hooks/useToast";

// ── Meta ──────────────────────────────────────────────────────

const SEVERITY_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: "حرجة",   color: "text-red-700",    bg: "bg-red-50",      border: "border-red-200",    dot: "bg-red-500" },
  high:     { label: "عالية",  color: "text-orange-700", bg: "bg-orange-50",   border: "border-orange-200", dot: "bg-orange-500" },
  medium:   { label: "متوسطة", color: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-200",  dot: "bg-amber-400" },
  low:      { label: "منخفضة", color: "text-blue-700",   bg: "bg-blue-50",     border: "border-blue-200",   dot: "bg-blue-400" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:          { label: "مفتوحة",      color: "text-red-700",    bg: "bg-red-50" },
  investigating: { label: "قيد التحقيق", color: "text-amber-700",  bg: "bg-amber-50" },
  resolved:      { label: "محلولة",      color: "text-emerald-700",bg: "bg-emerald-50" },
  ignored:       { label: "مُتجاهلة",    color: "text-gray-500",   bg: "bg-gray-100" },
};

const MODULE_META: Record<string, string> = {
  menu: "المنيو", booking: "الحجوزات", payment: "المدفوعات",
  tenant: "المنشآت", auth: "المصادقة", system: "النظام",
};

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, bg, color }: {
  label: string; value: number | string; icon: any; bg: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 flex items-center gap-4">
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", bg)}>
        <Icon className={clsx("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Issue Detail Modal ────────────────────────────────────────

function IssueModal({ issue, onClose, onUpdated }: { issue: any; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus]         = useState(issue.status);
  const [note, setNote]             = useState(issue.resolution_note ?? "");
  const [saving, setSaving]         = useState(false);
  const { data: detail, loading }   = useApi(() => guardianApi.getIssue(issue.id), [issue.id]);
  const full = detail?.data;

  const handleSave = async () => {
    setSaving(true);
    try {
      await guardianApi.updateIssue(issue.id, { status, resolution_note: note || undefined });
      toast.success("تم تحديث حالة المشكلة");
      onUpdated();
      onClose();
    } catch {
      toast.error("فشل الحفظ");
    } finally { setSaving(false); }
  };

  const sev = SEVERITY_META[issue.severity] ?? SEVERITY_META.medium;
  const sta = STATUS_META[issue.status]     ?? STATUS_META.open;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold", sev.bg, sev.color, "border", sev.border)}>
              {issue.code}
            </span>
            <h3 className="text-sm font-bold text-gray-900">{issue.title_ar}</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* المعلومات الأساسية */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">الخطورة</p>
              <span className={clsx("font-semibold", sev.color)}>{sev.label}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">الوحدة</p>
              <span className="font-semibold text-gray-700">{MODULE_META[issue.module] ?? issue.module}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">التكرار</p>
              <span className="font-bold text-gray-800 tabular-nums">{issue.occurrences} مرة</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">آخر رصد</p>
              <span className="text-gray-600 text-xs">{timeAgo(issue.last_seen_at)}</span>
            </div>
            {issue.tenant_name && (
              <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">المنشأة</p>
                <span className="font-medium text-gray-700">{issue.tenant_name}</span>
              </div>
            )}
          </div>

          {/* الوصف */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">الوصف</p>
            <p className="text-sm text-gray-700">{issue.description_ar}</p>
          </div>

          {/* التفصيل التقني */}
          {loading ? <Spinner /> : full?.technical_detail && (
            <div className="bg-gray-900 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">التفاصيل التقنية</p>
              <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">{full.technical_detail}</pre>
            </div>
          )}

          {/* الإصلاح التلقائي */}
          {issue.auto_fixed && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-700">تم الإصلاح التلقائي</p>
                <p className="text-xs text-emerald-600 mt-0.5">{issue.fix_description_ar}</p>
              </div>
            </div>
          )}

          {/* تحديث الحالة */}
          <div className="border-t border-[#eef2f6] pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500">تحديث الحالة</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <button key={key} onClick={() => setStatus(key)}
                  className={clsx("py-2 rounded-xl text-xs font-medium border transition-colors",
                    status === key ? `${meta.bg} ${meta.color} border-current` : "border-[#eef2f6] text-gray-500 hover:bg-[#f8fafc]"
                  )}>
                  {meta.label}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ملاحظة الحل (اختياري)"
              rows={2}
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 resize-none"
            />
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-brand-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scans Panel ───────────────────────────────────────────────

function ScansPanel() {
  const { data, loading, refetch } = useApi(() => guardianApi.scans(), []);
  const scans: any[] = data?.data ?? [];

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-[6px] border-b border-[#eef2f6]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-700">سجل الفحوصات</h3>
        </div>
        <button onClick={refetch} className="text-gray-400 hover:text-gray-600">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {loading ? <Spinner /> : scans.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">لا توجد فحوصات بعد — اضغط "تشغيل فحص" أعلاه</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#eef2f6]">
                {["النوع", "البدء", "المدة", "الفحوصات", "المشاكل", "المُصلح", "الحالة"].map(h => (
                  <th key={h} className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scans.map((scan: any) => (
                <tr key={scan.id} className="border-b border-gray-50 hover:bg-[#f8fafc]/40">
                  <td className="py-2 px-4 text-xs text-gray-600">{scan.type === "manual" ? "يدوي" : "دوري"}</td>
                  <td className="py-2 px-4 text-xs text-gray-400 whitespace-nowrap font-mono">
                    {new Date(scan.started_at).toLocaleString("en-US")}
                  </td>
                  <td className="py-2 px-4 text-xs text-gray-500">{scan.duration_ms ? `${scan.duration_ms}ms` : "—"}</td>
                  <td className="py-2 px-4 text-xs text-gray-600 tabular-nums">{scan.total_checks ?? 0}</td>
                  <td className="py-2 px-4">
                    <span className={clsx("text-xs font-bold tabular-nums", scan.issues_found > 0 ? "text-red-600" : "text-emerald-600")}>
                      {scan.issues_found ?? 0}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-xs text-emerald-600 tabular-nums">{scan.auto_fixed ?? 0}</td>
                  <td className="py-2 px-4">
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      scan.status === "completed" ? "bg-emerald-50 text-emerald-700"
                      : scan.status === "running"  ? "bg-blue-50 text-blue-700"
                      : "bg-red-50 text-red-700"
                    )}>
                      {scan.status === "completed" ? "مكتمل" : scan.status === "running" ? "يعمل" : "فشل"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

function GuardianTab() {
  const [statusFilter,   setStatusFilter]   = useState("open");
  const [severityFilter, setSeverityFilter] = useState("");
  const [moduleFilter,   setModuleFilter]   = useState("");
  const [selectedIssue,  setSelectedIssue]  = useState<any>(null);
  const [scanning,       setScanning]       = useState(false);

  const { data: statsData } = useApi(() => guardianApi.stats(), []);
  const stats = statsData?.data;

  const { data, loading, refetch } = useApi(
    () => guardianApi.issues({ status: statusFilter || undefined, severity: severityFilter || undefined, module: moduleFilter || undefined }),
    [statusFilter, severityFilter, moduleFilter],
  );
  const issues: any[] = data?.data ?? [];
  const pagination = data?.pagination;

  const handleRunScan = async () => {
    setScanning(true);
    try {
      await guardianApi.runScan();
      toast.success("بدأ الفحص — راجع سجل الفحوصات خلال لحظات");
      setTimeout(refetch, 5000);
    } catch {
      toast.error("فشل تشغيل الفحص");
    } finally { setScanning(false); }
  };

  const totalOpen = (stats?.byStatus?.["open"] ?? 0) + (stats?.byStatus?.["investigating"] ?? 0);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="الحارس الذكي"
        sub="مراقبة ذاتية وإصلاح تلقائي للمشاكل في النظام"
        action={
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-sm text-gray-500 border border-[#eef2f6] px-3 py-1.5 rounded-xl hover:bg-[#f8fafc]">
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </button>
            <button onClick={handleRunScan} disabled={scanning}
              className="flex items-center gap-1.5 text-sm text-white bg-brand-500 px-4 py-1.5 rounded-xl hover:bg-brand-600 disabled:opacity-50 font-semibold">
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {scanning ? "جاري الفحص..." : "تشغيل فحص"}
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="مشاكل مفتوحة"  value={totalOpen}                         icon={AlertTriangle} bg="bg-red-50"      color="text-red-600" />
        <KpiCard label="حرجة"           value={stats?.bySeverity?.["critical"] ?? 0} icon={AlertTriangle} bg="bg-red-50"      color="text-red-600" />
        <KpiCard label="آخر 24 ساعة"   value={stats?.last24h ?? 0}              icon={Clock}         bg="bg-amber-50"    color="text-amber-600" />
        <KpiCard label="محلولة"         value={stats?.byStatus?.["resolved"] ?? 0} icon={CheckCircle2}  bg="bg-emerald-50" color="text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-white border border-[#eef2f6] rounded-xl px-1 py-1">
          {["", "open", "investigating", "resolved", "ignored"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                statusFilter === s ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-[#f8fafc]"
              )}>
              {s === "" ? "الكل" : STATUS_META[s]?.label ?? s}
            </button>
          ))}
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          className="border border-[#eef2f6] rounded-xl px-3 py-1.5 text-xs text-gray-600 outline-none bg-white">
          <option value="">كل الخطورات</option>
          {Object.entries(SEVERITY_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
          className="border border-[#eef2f6] rounded-xl px-3 py-1.5 text-xs text-gray-600 outline-none bg-white">
          <option value="">كل الوحدات</option>
          {Object.entries(MODULE_META).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Issues List */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-[6px] border-b border-[#eef2f6]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-gray-700">المشاكل المكتشفة</h3>
            {pagination?.total > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{pagination.total}</span>
            )}
          </div>
        </div>

        {loading ? <Spinner /> : issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-sm">لا توجد مشاكل مكتشفة — النظام يعمل بشكل طبيعي</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {issues.map((issue: any) => {
              const sev = SEVERITY_META[issue.severity] ?? SEVERITY_META.medium;
              const sta = STATUS_META[issue.status]     ?? STATUS_META.open;
              return (
                <button key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="w-full flex items-center gap-4 px-5 py-[6px] hover:bg-[#f8fafc]/60 transition-colors text-right">
                  <span className={clsx("w-2.5 h-2.5 rounded-full shrink-0", sev.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-gray-400">{issue.code}</span>
                      <p className="text-sm font-semibold text-gray-800">{issue.title_ar}</p>
                      <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-semibold", sta.bg, sta.color)}>
                        {sta.label}
                      </span>
                      {issue.auto_fixed && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          مُصلح تلقائياً
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{MODULE_META[issue.module] ?? issue.module}</span>
                      {issue.tenant_name && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <Building2 className="w-3 h-3" /> {issue.tenant_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{issue.occurrences} مرة</span>
                      <span className="text-xs text-gray-400">{timeAgo(issue.last_seen_at)}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scans History */}
      <ScansPanel />

      {/* Issue Modal */}
      {selectedIssue && (
        <IssueModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdated={refetch}
        />
      )}
    </div>
  );
}

export default GuardianTab;
