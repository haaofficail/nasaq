import { useState, useEffect } from "react";
import { integrationsApi } from "../lib/api";
import { Button } from "../components/ui";
import { SkeletonRows } from "@/components/ui/Skeleton";

const TYPE_AR: Record<string, string> = {
  booking_channel: "قناة حجز",
  food_delivery: "توصيل طلبات",
  last_mile: "شحن",
  messaging: "مراسلة",
  payments: "دفع",
  calendar: "تقويم",
  automation: "أتمتة",
  ota: "فندقي (OTA)",
  analytics: "تحليلات",
  custom_webhook: "Webhook مخصص",
};

const STATUS_AR: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  error: "خطأ",
  pending_setup: "يحتاج إعداد",
  expired: "منتهي",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
  error: "bg-red-100 text-red-800",
  pending_setup: "bg-yellow-100 text-yellow-800",
  expired: "bg-orange-100 text-orange-800",
};

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"integrations" | "logs" | "jobs">("integrations");
  const [filterType, setFilterType] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [providersRes, configsRes, logsRes, jobsRes] = await Promise.all([
        integrationsApi.providers().catch(() => ({ data: [] })),
        integrationsApi.configs().catch(() => ({ data: [] })),
        integrationsApi.webhookLogs().catch(() => ({ data: [], total: 0 })),
        integrationsApi.syncJobs().catch(() => ({ data: [], total: 0 })),
      ]);
      setProviders((providersRes as any).data ?? []);
      setConfigs((configsRes as any).data ?? []);
      setWebhookLogs((logsRes as any).data ?? []);
      setSyncJobs((jobsRes as any).data ?? []);
    } finally {
      setLoading(false);
    }
  }

  const configuredProviderIds = new Set(configs.map((c) => c.providerId));
  const filteredProviders = filterType
    ? providers.filter((p) => p.type === filterType)
    : providers;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">التكاملات الخارجية</h1>
        <p className="text-sm text-gray-500 mt-1">ربط منصات الحجز، التوصيل، الدفع، والمراسلة</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {[
            { id: "integrations", label: "التكاملات" },
            { id: "logs", label: "سجل Webhooks" },
            { id: "jobs", label: "مهام المزامنة" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : (
        <>
          {/* ── Integrations ── */}
          {tab === "integrations" && (
            <div className="space-y-6">
              {/* Active Configs */}
              {configs.length > 0 && (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-3">
                    التكاملات المفعّلة ({configs.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {configs.map((config) => {
                      const provider = providers.find((p) => p.id === config.providerId);
                      return (
                        <div key={config.id} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {config.integrationName || provider?.name || config.providerId}
                              </div>
                              <div className="text-sm text-gray-500 mt-0.5">
                                {TYPE_AR[config.integrationType] ?? config.integrationType}
                              </div>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                STATUS_COLORS[config.status] ?? "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {STATUS_AR[config.status] ?? config.status}
                            </span>
                          </div>

                          {config.lastSyncAt && (
                            <div className="text-xs text-gray-400 mt-2">
                              آخر مزامنة: {new Date(config.lastSyncAt).toLocaleString("ar-SA")}
                            </div>
                          )}
                          {config.lastError && (
                            <div className="text-xs text-red-500 mt-1 truncate">{config.lastError}</div>
                          )}

                          <div className="flex gap-2 mt-3">
                            {config.status === "active" ? (
                              <button
                                className="text-xs text-gray-500 hover:underline"
                                onClick={async () => {
                                  await integrationsApi.updateConfigStatus(config.id, "inactive");
                                  loadAll();
                                }}
                              >
                                تعطيل
                              </button>
                            ) : (
                              <button
                                className="text-xs text-green-600 hover:underline"
                                onClick={async () => {
                                  await integrationsApi.updateConfigStatus(config.id, "active");
                                  loadAll();
                                }}
                              >
                                تفعيل
                              </button>
                            )}
                            <button
                              className="text-xs text-red-500 hover:underline"
                              onClick={async () => {
                                if (confirm("حذف هذا التكامل؟")) {
                                  await integrationsApi.deleteConfig(config.id);
                                  loadAll();
                                }
                              }}
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Provider Marketplace */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-semibold text-gray-900">المزودون المتاحون</h2>
                </div>

                {/* Type Filter */}
                <div className="flex gap-2 flex-wrap mb-4">
                  <button
                    onClick={() => setFilterType("")}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      filterType === ""
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    الكل
                  </button>
                  {Object.entries(TYPE_AR).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setFilterType(k)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        filterType === k
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {filteredProviders.map((provider) => {
                    const isConnected = configuredProviderIds.has(provider.id);
                    return (
                      <div
                        key={provider.id}
                        className={`bg-white border rounded-xl p-4 flex flex-col gap-3 ${
                          isConnected ? "border-green-300" : "border-gray-200"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{provider.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {TYPE_AR[provider.type] ?? provider.type}
                          </div>
                          {provider.region !== "GLOBAL" && (
                            <div className="text-xs text-blue-500 mt-0.5">{provider.region}</div>
                          )}
                        </div>
                        {isConnected ? (
                          <span className="text-xs text-green-600 font-medium">✓ مربوط</span>
                        ) : (
                          <button
                            className="text-xs text-blue-600 hover:underline text-right"
                            onClick={() => {
                              setSelectedProvider(provider);
                              setShowAddForm(true);
                            }}
                          >
                            + ربط
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Webhook Logs ── */}
          {tab === "logs" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">سجل Webhooks ({webhookLogs.length})</h2>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المزود</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الاتجاه</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحدث</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {webhookLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{log.providerId || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            log.direction === "inbound"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}>
                            {log.direction === "inbound" ? "وارد" : "صادر"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{log.eventType || "—"}</td>
                        <td className="px-4 py-3">
                          {log.processed ? (
                            <span className="text-xs text-green-600">معالج</span>
                          ) : (
                            <span className="text-xs text-yellow-600">معلق</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(log.createdAt).toLocaleString("ar-SA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {webhookLogs.length === 0 && (
                  <div className="text-center py-12 text-gray-400">لا توجد سجلات</div>
                )}
              </div>
            </div>
          )}

          {/* ── Sync Jobs ── */}
          {tab === "jobs" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">مهام المزامنة</h2>
                <Button
                  size="sm"
                  onClick={async () => {
                    const configId = configs.find((c) => c.status === "active")?.id;
                    await integrationsApi.triggerSync({
                      integrationConfigId: configId,
                      jobType: "sync_catalog",
                    });
                    loadAll();
                  }}
                  disabled={configs.filter((c) => c.status === "active").length === 0}
                >
                  + مزامنة يدوية
                </Button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">نوع المهمة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">السجلات</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المنبّه</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {syncJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{job.jobType}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            job.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : job.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : job.status === "running"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {{
                              queued: "في الانتظار",
                              running: "جاري",
                              completed: "مكتمل",
                              failed: "فشل",
                              cancelled: "ملغي",
                            }[job.status as string] ?? job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {job.recordsProcessed > 0 ? (
                            <span>
                              {job.recordsProcessed} ({job.recordsCreated} جديد، {job.recordsUpdated} محدّث
                              {job.recordsFailed > 0 ? `، ${job.recordsFailed} فشل` : ""})
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {{ scheduler: "تلقائي", manual: "يدوي", webhook: "webhook" }[job.triggeredBy as string] ?? job.triggeredBy}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(job.createdAt).toLocaleString("ar-SA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {syncJobs.length === 0 && (
                  <div className="text-center py-12 text-gray-400">لا توجد مهام مزامنة</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Integration Modal */}
      {showAddForm && selectedProvider && (
        <AddIntegrationModal
          provider={selectedProvider}
          onSave={async (data) => {
            await integrationsApi.createConfig({
              ...data,
              providerId: selectedProvider.id,
              integrationType: selectedProvider.type,
            });
            setShowAddForm(false);
            setSelectedProvider(null);
            loadAll();
          }}
          onClose={() => {
            setShowAddForm(false);
            setSelectedProvider(null);
          }}
        />
      )}
    </div>
  );
}

function AddIntegrationModal({
  provider,
  onSave,
  onClose,
}: {
  provider: any;
  onSave: (d: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    integrationName: provider.name,
    apiKey: "",
    webhookSecret: "",
    settings: {} as Record<string, any>,
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">ربط {provider.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم المخصص</label>
            <input
              className="input w-full"
              value={form.integrationName}
              onChange={(e) => setForm({ ...form, integrationName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">مفتاح API</label>
            <input
              type="password"
              className="input w-full"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="أدخل مفتاح API..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook Secret (اختياري)
            </label>
            <input
              type="password"
              className="input w-full"
              value={form.webhookSecret}
              onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
            />
          </div>

          <p className="text-xs text-gray-400">
            بيانات الاعتماد محمية ولا تُعرض بعد الحفظ.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>إلغاء</Button>
            <Button
              onClick={() =>
                onSave({
                  integrationName: form.integrationName,
                  credentials: {
                    api_key: form.apiKey,
                    ...(form.webhookSecret ? { webhook_secret: form.webhookSecret } : {}),
                  },
                })
              }
            >
              حفظ وربط
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
