import { useState } from "react";
import { Key, Webhook, Store, Plus, Copy, Trash2, Check, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { platformApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input } from "@/components/ui";

const tabs = ["مفاتيح API", "Webhooks", "متجر الإضافات"];

export function PlatformPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState("");

  const { data: keysRes, loading: kLoading, refetch: refetchKeys } = useApi(() => platformApi.apiKeys(), []);
  const { data: whRes, loading: wLoading } = useApi(() => platformApi.webhooks(), []);
  const { data: appsRes } = useApi(() => platformApi.apps(), []);
  const { data: installedRes, refetch: refetchInstalled } = useApi(() => platformApi.installedApps(), []);
  const { mutate: createKey, loading: creatingKey } = useMutation((data: any) => platformApi.createApiKey(data));
  const { mutate: deleteKey } = useMutation((id: string) => platformApi.deleteApiKey(id));
  const { mutate: installApp } = useMutation((id: string) => platformApi.installApp(id));
  const { mutate: uninstallApp } = useMutation((id: string) => platformApi.uninstallApp(id));

  const keys: any[] = keysRes?.data || [];
  const webhooks: any[] = whRes?.data || [];
  const apps: any[] = appsRes?.data || [];
  const installed: any[] = installedRes?.data || [];
  const installedIds = installed.map((i: any) => i.pluginId);

  const handleCreateKey = async () => {
    const res: any = await createKey({ name: keyName });
    if (res?.data?.key) setNewKey(res.data.key);
    refetchKeys();
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("حذف المفتاح؟")) return;
    await deleteKey(id);
    refetchKeys();
  };

  const handleInstall = async (id: string) => {
    await installApp(id);
    refetchInstalled();
  };

  const handleUninstall = async (id: string) => {
    await uninstallApp(id);
    refetchInstalled();
  };

  if (kLoading || wLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">المنصة والتكاملات</h1>
        <p className="text-sm text-gray-400 mt-0.5">مفاتيح API والـ Webhooks ومتجر الإضافات</p>
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

      {/* API Keys */}
      {activeTab === 0 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button icon={Plus} onClick={() => setShowApiKey(true)}>مفتاح جديد</Button>
          </div>

          {keys.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-10 text-center">
              <Key className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد مفاتيح API</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k: any) => (
                <div key={k.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{k.name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{k.key}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Modal
            open={showApiKey}
            onClose={() => { setShowApiKey(false); setNewKey(""); }}
            title="مفتاح API جديد"
            size="sm"
            footer={
              !newKey
                ? (
                  <>
                    <Button variant="secondary" onClick={() => setShowApiKey(false)}>إلغاء</Button>
                    <Button onClick={handleCreateKey} loading={creatingKey}>إنشاء</Button>
                  </>
                )
                : <Button onClick={() => { setShowApiKey(false); setNewKey(""); }}>تم</Button>
            }
          >
            {!newKey ? (
              <Input
                label="الاسم"
                name="name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="تطبيق الجوال"
                required
              />
            ) : (
              <div className="space-y-3">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-600 mb-2">المفتاح (يظهر مرة واحدة فقط)</p>
                  <p className="font-mono text-sm font-bold text-emerald-800 break-all">{newKey}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(newKey)}
                  className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 mx-auto transition-colors"
                >
                  <Copy className="w-4 h-4" /> نسخ المفتاح
                </button>
              </div>
            )}
          </Modal>
        </div>
      )}

      {/* Webhooks */}
      {activeTab === 1 && (
        <div className="space-y-3">
          {webhooks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-10 text-center">
              <Webhook className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا يوجد Webhooks</p>
            </div>
          ) : (
            webhooks.map((wh: any) => (
              <div key={wh.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Webhook className="w-4 h-4 text-brand-500 shrink-0" />
                  <code className="text-sm text-gray-700 truncate">{wh.url}</code>
                </div>
                <p className="text-xs text-gray-400">
                  {wh.totalDeliveries || 0} تسليم —
                  <span className={wh.totalFailures > 0 ? " text-red-500" : ""}>
                    {" "}{wh.totalFailures || 0} فشل
                  </span>
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* App Store */}
      {activeTab === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-[#eef2f6] p-10 text-center">
              <Store className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد إضافات متاحة</p>
            </div>
          ) : (
            apps.map((app: any) => {
              const isInstalled = installedIds.includes(app.id);
              return (
                <div
                  key={app.id}
                  className={clsx(
                    "bg-white rounded-2xl border p-4 transition-all",
                    isInstalled ? "border-brand-200 bg-brand-50/20" : "border-[#eef2f6] hover:border-[#eef2f6]"
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{app.icon || "🔌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{app.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{app.installCount || 0} مستخدم</p>
                    </div>
                    {isInstalled && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> مثبت
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{app.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      {app.isFree
                        ? <span className="text-emerald-600">مجاني</span>
                        : <span className="text-gray-700 tabular-nums">{app.monthlyPrice} ر.س/شهر</span>
                      }
                    </span>
                    {isInstalled
                      ? (
                        <button
                          onClick={() => handleUninstall(app.id)}
                          className="text-xs text-red-500 hover:text-red-600 transition-colors"
                        >
                          إزالة
                        </button>
                      )
                      : (
                        <button
                          onClick={() => handleInstall(app.id)}
                          className="bg-brand-500 text-white rounded-lg px-3 py-1 text-xs hover:bg-brand-600 transition-colors"
                        >
                          تثبيت
                        </button>
                      )
                    }
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
