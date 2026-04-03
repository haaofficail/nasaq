import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { adminApi } from "@/lib/api";
import { ToggleLeft, AlertTriangle, Plus, Trash2, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface KillSwitch {
  id: string;
  isDisabled: boolean;
  reason: string | null;
  disabledBy: string | null;
  disabledAt: string | null;
  updatedAt: string;
}

export default function KillSwitchesTab() {
  const { data, loading, error, refetch } = useApi(() => adminApi.killSwitches(), []);

  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [formId, setFormId]       = useState("");
  const [formReason, setFormReason] = useState("");

  const rows: KillSwitch[] = (data as any)?.data ?? [];

  const toggleSwitch = async (ks: KillSwitch) => {
    setSaving(true);
    try {
      await adminApi.upsertKillSwitch({ id: ks.id, isDisabled: !ks.isDisabled, reason: ks.reason ?? undefined });
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const addSwitch = async () => {
    if (!formId.trim()) return;
    setSaving(true);
    try {
      await adminApi.upsertKillSwitch({ id: formId.trim(), isDisabled: true, reason: formReason.trim() || undefined });
      setFormId(""); setFormReason(""); setShowForm(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteSwitch = async (id: string) => {
    if (!confirm("حذف هذا المفتاح؟")) return;
    setSaving(true);
    try {
      await adminApi.deleteKillSwitch(id);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">مفاتيح الإيقاف الفوري</h3>
          <p className="text-sm text-gray-500 mt-0.5">إيقاف أي ميزة لجميع المنشآت فوراً</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          مفتاح جديد
        </button>
      </div>

      {showForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            إضافة مفتاح إيقاف جديد (سيُفعّل فوراً)
          </p>
          <input
            value={formId}
            onChange={e => setFormId(e.target.value)}
            placeholder="مفتاح الميزة مثل: flower_master"
            dir="ltr"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
          />
          <input
            value={formReason}
            onChange={e => setFormReason(e.target.value)}
            placeholder="السبب (يُعرض للمستخدمين)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <div className="flex gap-2">
            <button
              onClick={addSwitch}
              disabled={saving || !formId.trim()}
              className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              إيقاف الميزة
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-500 text-sm hover:text-gray-700">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ToggleLeft className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد مفاتيح إيقاف — جميع الميزات تعمل بشكل طبيعي</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {rows.map((ks) => (
            <div key={ks.id} className={clsx(
              "flex items-center justify-between p-4 bg-white",
              ks.isDisabled && "bg-red-50",
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={clsx(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  ks.isDisabled ? "bg-red-500" : "bg-green-500",
                )} />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-gray-900">{ks.id}</p>
                  {ks.reason && (
                    <p className="text-xs text-gray-500 mt-0.5">{ks.reason}</p>
                  )}
                  {ks.isDisabled && ks.disabledBy && (
                    <p className="text-xs text-red-500 mt-0.5">
                      أوقفه: {ks.disabledBy} — {ks.disabledAt ? new Date(ks.disabledAt).toLocaleString("ar-SA") : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleSwitch(ks)}
                  disabled={saving}
                  className={clsx(
                    "text-xs font-medium rounded-lg px-3 py-1.5 transition-colors",
                    ks.isDisabled
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-100 text-red-700 hover:bg-red-200",
                  )}
                >
                  {ks.isDisabled ? "تفعيل" : "إيقاف"}
                </button>
                <button
                  onClick={() => deleteSwitch(ks.id)}
                  disabled={saving}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
