import { useState, useEffect, useRef } from "react";
import { Search, X, CheckCircle, AlertCircle, Circle, ChevronDown, Loader2, Plug, Clock, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { integrationsApi } from "../lib/api";
import { clsx } from "clsx";

// ============================================================
// Constants
// ============================================================

const CATEGORY_AR: Record<string, string> = {
  payment:      "الدفع",
  e_invoicing:  "الفوترة الإلكترونية",
  shipping:     "الشحن",
  delivery:     "توصيل الطعام",
  pos:          "نقاط البيع",
  messaging:    "المراسلة",
  accounting:   "المحاسبة",
  crm:          "CRM",
  calendar:     "التقويم",
  storage:      "التخزين",
  maps:         "الخرائط",
  analytics:    "التحليلات",
  automation:   "الأتمتة",
  ecommerce:    "التجارة الإلكترونية",
  hr:           "الموارد البشرية",
  gov:          "الخدمات الحكومية",
  hospitality:  "الضيافة والإقامة",
};

const REGION_AR: Record<string, string> = {
  local:  "محلي",
  global: "عالمي",
  both:   "محلي وعالمي",
};

const REGION_COLORS: Record<string, string> = {
  local:  "bg-emerald-50 text-emerald-700",
  global: "bg-blue-50 text-blue-700",
  both:   "bg-purple-50 text-purple-700",
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  active:   { label: "مفعّل",     icon: CheckCircle,   color: "text-emerald-500" },
  inactive: { label: "غير مفعّل", icon: Circle,         color: "text-gray-300" },
  error:    { label: "خطأ",       icon: AlertCircle,    color: "text-red-500" },
};

// ============================================================
// Types
// ============================================================

interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password" | "select";
  required: boolean;
  options?: { value: string; label: string }[];
}

interface AvailableIntegration {
  provider: string;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  region: "local" | "global" | "both";
  logo: string;
  fields: IntegrationField[];
  features: string[];
  id: string | null;
  status: string;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

// ============================================================
// Skeleton
// ============================================================

function CardSkeleton() {
  return (
    <div className="bg-white border border-[#eef2f6] rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-4/5" />
      <div className="h-8 bg-[#f1f5f9] rounded-xl w-full" />
    </div>
  );
}

// ============================================================
// Provider logo / initials
// ============================================================

const LOGO_COLORS: string[] = [
  "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-cyan-500", "bg-amber-500", "bg-indigo-500",
];

function ProviderLogo({ provider, name }: { provider: string; name: string }) {
  const colorIdx = provider.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % LOGO_COLORS.length;
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-sm font-bold shrink-0", LOGO_COLORS[colorIdx])}>
      {initials}
    </div>
  );
}

// ============================================================
// Connect Modal
// ============================================================

function ConnectModal({
  integration,
  onClose,
  onSave,
}: {
  integration: AvailableIntegration;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const handleSave = async () => {
    setError(null);
    const missing = integration.fields
      .filter((f) => f.required && !form[f.key]?.trim())
      .map((f) => f.label);
    if (missing.length > 0) {
      setError(`الحقول المطلوبة ناقصة: ${missing.join("، ")}`);
      return;
    }

    setSaving(true);
    try {
      await integrationsApi.connect({
        provider: integration.provider,
        credentials: form,
      });
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الربط");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!integration.id) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await integrationsApi.test(integration.id);
      setTestResult(res);
    } catch {
      setTestResult({ ok: false, message: "فشل الاتصال" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#eef2f6]">
          <div className="flex items-center gap-3">
            <ProviderLogo provider={integration.provider} name={integration.name} />
            <div>
              <h3 className="text-base font-bold text-gray-900">{integration.name}</h3>
              <p className="text-xs text-gray-500">{CATEGORY_AR[integration.category] ?? integration.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">{integration.description}</p>

          {integration.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {integration.features.map((f) => (
                <span key={f} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-lg">{f}</span>
              ))}
            </div>
          )}

          <div className="border-t border-[#eef2f6] pt-4 space-y-4">
            {integration.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 mr-1">*</span>}
                </label>
                {field.type === "select" && field.options ? (
                  <div className="relative">
                    <select
                      value={form[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm bg-white appearance-none focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                    >
                      <option value="">اختر...</option>
                      {field.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type={field.type}
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.type === "password" ? "••••••••••••" : `أدخل ${field.label}...`}
                    className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                    dir={field.type === "password" ? "ltr" : undefined}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {testResult && (
            <div className={clsx(
              "border rounded-xl px-4 py-3 text-sm",
              testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
            )}>
              {testResult.ok ? "الاتصال ناجح" : (testResult.message ?? "فشل الاتصال")}
            </div>
          )}

          <p className="text-xs text-gray-400">بيانات الاعتماد مشفرة ولا تُعرض بعد الحفظ.</p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {integration.id && (
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#eef2f6] text-sm font-medium text-gray-600 hover:bg-[#f8fafc] transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                اختبار
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#eef2f6] text-sm font-medium text-gray-600 hover:bg-[#f8fafc] transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ وربط
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Integration Card
// ============================================================

function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
}: {
  integration: AvailableIntegration;
  onConnect: (i: AvailableIntegration) => void;
  onDisconnect: (i: AvailableIntegration) => void;
}) {
  const navigate = useNavigate();
  const isActive = integration.status === "active";
  const isError = integration.status === "error";
  const status = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG.inactive;
  const StatusIcon = status.icon;

  return (
    <div className={clsx(
      "bg-white border rounded-2xl p-5 flex flex-col gap-3 transition-all hover:shadow-md hover:border-[#eef2f6]",
      isActive ? "border-emerald-200" : isError ? "border-red-200" : "border-[#eef2f6]"
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <ProviderLogo provider={integration.provider} name={integration.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 truncate">{integration.name}</span>
            <StatusIcon className={clsx("w-3.5 h-3.5 shrink-0", status.color)} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400">{CATEGORY_AR[integration.category] ?? integration.category}</span>
            <span className="text-gray-200">·</span>
            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", REGION_COLORS[integration.region])}>
              {REGION_AR[integration.region]}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{integration.description}</p>

      {/* Last synced */}
      {integration.lastSyncedAt && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Clock className="w-3 h-3" />
          <span>آخر مزامنة: {new Date(integration.lastSyncedAt).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      )}

      {/* Error */}
      {isError && integration.errorMessage && (
        <div className="text-[11px] text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 truncate">
          {integration.errorMessage}
        </div>
      )}

      {/* Action button */}
      {isActive ? (
        <div className="flex gap-2">
          <button
            onClick={() => onConnect(integration)}
            className="flex-1 py-2 rounded-xl border border-[#eef2f6] text-xs font-medium text-gray-600 hover:bg-[#f8fafc] transition-colors"
          >
            إعدادات
          </button>
          {integration.id && (
            <button
              onClick={() => navigate(`/dashboard/integrations/${integration.id}/logs`)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#eef2f6] text-xs font-medium text-gray-500 hover:bg-[#f8fafc] transition-colors"
              title="سجل الطلبات"
            >
              <ScrollText className="w-3.5 h-3.5" />
              السجل
            </button>
          )}
          <button
            onClick={() => onDisconnect(integration)}
            className="flex-1 py-2 rounded-xl border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            فصل
          </button>
        </div>
      ) : (
        <button
          onClick={() => onConnect(integration)}
          className="w-full py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
        >
          ربط
        </button>
      )}
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

const ALL_CATEGORIES = Object.keys(CATEGORY_AR);

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<AvailableIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<AvailableIntegration | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await integrationsApi.available();
      setIntegrations((res as any).data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطأ في تحميل التكاملات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDisconnect = async (integration: AvailableIntegration) => {
    if (!integration.id) return;
    if (!confirm(`فصل تكامل ${integration.name}؟`)) return;
    setDisconnecting(integration.id);
    try {
      await integrationsApi.disconnect(integration.id);
      await load();
    } catch {
      // silent
    } finally {
      setDisconnecting(null);
    }
  };

  // Filter
  const filtered = integrations.filter((i) => {
    const matchCat = category === "all" || i.category === category;
    const matchSearch =
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      i.description.includes(search);
    return matchCat && matchSearch;
  });

  const activeCount = integrations.filter((i) => i.status === "active").length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التكاملات</h1>
          <p className="text-sm text-gray-500 mt-1">
            ربط ترميز OS بمنصات الدفع والشحن والمراسلة والتحليلات وأكثر من ذلك
          </p>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">{activeCount} تكامل نشط</span>
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setCategory("all")}
          className={clsx(
            "px-3 py-1.5 text-xs font-medium rounded-xl border transition-all",
            category === "all"
              ? "bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/20"
              : "bg-white text-gray-600 border-[#eef2f6] hover:border-brand-300 hover:text-brand-600"
          )}
        >
          الكل ({integrations.length})
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const count = integrations.filter((i) => i.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-xl border transition-all",
                category === cat
                  ? "bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/20"
                  : "bg-white text-gray-600 border-[#eef2f6] hover:border-brand-300 hover:text-brand-600"
              )}
            >
              {CATEGORY_AR[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-[#eef2f6] rounded-xl px-3 py-2.5 w-full max-w-xs focus-within:border-brand-300 transition-colors">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في التكاملات..."
          className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 w-full"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mb-3" />
          <p className="text-sm font-medium text-gray-700">خطأ في تحميل البيانات</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-4 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Plug className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-700">لا توجد تكاملات مطابقة</p>
          <p className="text-xs text-gray-400 mt-1">جرّب تغيير الفئة أو مسح البحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((integration) => (
            <div key={integration.provider} className={clsx(disconnecting !== null && disconnecting === integration.id && "opacity-50 pointer-events-none")}>
              <IntegrationCard
                integration={integration}
                onConnect={setModal}
                onDisconnect={handleDisconnect}
              />
            </div>
          ))}
        </div>
      )}

      {/* Connect modal */}
      {modal && (
        <ConnectModal
          integration={modal}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
