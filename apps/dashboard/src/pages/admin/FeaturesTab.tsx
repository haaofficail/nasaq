import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { adminApi } from "@/lib/api";
import {
  ToggleLeft, ToggleRight, ChevronLeft, Users, BarChart2, Shield,
  Loader2, AlertTriangle, Plus, Trash2, Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { SectionHeader, Spinner, Empty, Modal, TabPill } from "./shared";

// ── Types ──────────────────────────────────────────────────

interface FeatureFlag {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
  description: string | null;
  category: string;
  killSwitch: boolean;
  defaultForNewOrgs: boolean;
  rolloutPercentage: number;
  updatedAt: string;
  orgsWithAccessCount: number;
}

interface Override {
  id: string;
  orgId: string;
  orgName: string | null;
  enabled: boolean;
  reason: string | null;
  setBy: string | null;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  capabilityKey: string;
  action: string;
  targetOrgId: string | null;
  orgName: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  changedBy: string | null;
  changedAt: string;
}

// ── Helpers ────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  kill_switch_on: "تفعيل مفتاح الإيقاف",
  kill_switch_off: "إلغاء مفتاح الإيقاف",
  rollout_changed: "تغيير نسبة الإطلاق",
  default_changed: "تغيير الإعداد الافتراضي",
  override_added: "إضافة استثناء منشأة",
  override_updated: "تحديث استثناء منشأة",
  override_removed: "حذف استثناء منشأة",
};

const CATEGORY_LABELS: Record<string, string> = {
  core: "أساسي",
  vertical: "تخصصي",
  financial: "مالي",
  marketing: "تسويق",
  operational: "تشغيلي",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

// ── Global Controls Tab ────────────────────────────────────

function GlobalControlsTab({ feature, onSaved }: { feature: FeatureFlag; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [rollout, setRollout] = useState(feature.rolloutPercentage);
  const [defaultNew, setDefaultNew] = useState(feature.defaultForNewOrgs);
  const [dirty, setDirty] = useState(false);

  const toggleKillSwitch = async () => {
    setSaving(true);
    try {
      await adminApi.updateFeatureFlag(feature.key, { killSwitch: !feature.killSwitch });
      onSaved();
    } finally { setSaving(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await adminApi.updateFeatureFlag(feature.key, {
        rolloutPercentage: rollout,
        defaultForNewOrgs: defaultNew,
      });
      setDirty(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Kill switch */}
      <div className={clsx(
        "rounded-2xl border p-5 transition-colors",
        feature.killSwitch
          ? "border-red-200 bg-red-50"
          : "border-[#eef2f6] bg-white",
      )}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className={clsx("w-4 h-4", feature.killSwitch ? "text-red-500" : "text-gray-400")} />
              <p className="text-sm font-semibold text-gray-900">مفتاح الإيقاف الفوري</p>
            </div>
            <p className="text-xs text-gray-500">
              {feature.killSwitch
                ? "الميزة موقوفة لجميع المنشآت بغض النظر عن أي إعداد آخر"
                : "الميزة تعمل وفق إعدادات الإطلاق"}
            </p>
          </div>
          <button
            onClick={toggleKillSwitch}
            disabled={saving}
            className={clsx(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors shrink-0",
              feature.killSwitch
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-red-100 text-red-700 hover:bg-red-200",
            )}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : feature.killSwitch
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />}
            {feature.killSwitch ? "تفعيل الميزة" : "إيقاف الميزة"}
          </button>
        </div>
      </div>

      {/* Rollout */}
      <div className="rounded-2xl border border-[#eef2f6] bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-brand-500" />
          <p className="text-sm font-semibold text-gray-900">إعدادات الإطلاق</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">نسبة الإطلاق التلقائي</label>
            <span className="text-sm font-bold text-brand-600">{rollout}%</span>
          </div>
          <input
            type="range"
            min={0} max={100} step={5}
            value={rollout}
            onChange={e => { setRollout(Number(e.target.value)); setDirty(true); }}
            className="w-full h-2 rounded-full accent-brand-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>0% — لا أحد</span>
            <span>50% — نصف المنشآت</span>
            <span>100% — الجميع</span>
          </div>
          <p className="text-[11px] text-gray-400">
            تستخدم خوارزمية FNV-1a الحتمية — نفس المنشأة تحصل دائماً على نفس النتيجة
          </p>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-[#f1f5f9]">
          <div>
            <p className="text-xs font-medium text-gray-700">مفعّل تلقائياً للمنشآت الجديدة</p>
            <p className="text-[11px] text-gray-400 mt-0.5">يتجاوز نسبة الإطلاق للمنشآت التي تنشأ بعد تفعيل هذا الخيار</p>
          </div>
          <button
            onClick={() => { setDefaultNew(v => !v); setDirty(true); }}
            className={clsx(
              "w-10 h-5.5 rounded-full transition-colors relative shrink-0",
              defaultNew ? "bg-brand-500" : "bg-gray-200",
            )}
            style={{ width: 40, height: 22 }}
          >
            <span className={clsx(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
              defaultNew ? "left-[calc(100%-18px)]" : "left-0.5",
            )} />
          </button>
        </div>

        {dirty && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              حفظ الإعدادات
            </button>
            <button
              onClick={() => { setRollout(feature.rolloutPercentage); setDefaultNew(feature.defaultForNewOrgs); setDirty(false); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Org Overrides Tab ──────────────────────────────────────

function OrgOverridesTab({ featureKey, onChanged }: { featureKey: string; onChanged: () => void }) {
  const { data, loading, error, refetch } = useApi(
    () => adminApi.featureFlagOverrides(featureKey),
    [featureKey],
  );
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ orgId: "", enabled: true, reason: "" });
  const [deleting, setDeleting] = useState<string | null>(null);

  const overrides: Override[] = (data as any)?.data ?? [];

  const handleAdd = async () => {
    if (!form.orgId.trim() || !form.reason.trim()) return;
    setSaving(true);
    try {
      await adminApi.setFeatureFlagOverride(featureKey, form);
      setForm({ orgId: "", enabled: true, reason: "" });
      setShowAdd(false);
      refetch();
      onChanged();
    } finally { setSaving(false); }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm("حذف هذا الاستثناء؟")) return;
    setDeleting(orgId);
    try {
      await adminApi.deleteFeatureFlagOverride(featureKey, orgId);
      refetch();
      onChanged();
    } finally { setDeleting(null); }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{overrides.length} استثناء مسجّل</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-3 py-1.5 text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          استثناء جديد
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-800">إضافة استثناء لمنشأة</p>
          <input
            value={form.orgId}
            onChange={e => setForm(v => ({ ...v, orgId: e.target.value }))}
            placeholder="UUID المنشأة"
            dir="ltr"
            className="w-full rounded-lg border border-[#eef2f6] px-3 py-2 text-sm font-mono outline-none focus:border-brand-500"
          />
          <input
            value={form.reason}
            onChange={e => setForm(v => ({ ...v, reason: e.target.value }))}
            placeholder="سبب الاستثناء"
            className="w-full rounded-lg border border-[#eef2f6] px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={e => setForm(v => ({ ...v, enabled: e.target.checked }))}
                className="rounded accent-brand-500"
              />
              تفعيل الميزة لهذه المنشأة
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !form.orgId.trim() || !form.reason.trim()}
              className="flex items-center gap-2 bg-brand-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              حفظ
            </button>
            <button onClick={() => setShowAdd(false)} className="text-gray-500 text-sm hover:text-gray-700">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {overrides.length === 0 ? (
        <Empty icon={Users} text="لا توجد استثناءات — جميع المنشآت تخضع لإعدادات الإطلاق العامة" />
      ) : (
        <div className="divide-y divide-gray-100 border border-[#eef2f6] rounded-xl overflow-hidden">
          {overrides.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 bg-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={clsx(
                    "w-2 h-2 rounded-full shrink-0",
                    o.enabled ? "bg-green-500" : "bg-red-400",
                  )} />
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {o.orgName ?? o.orgId}
                  </p>
                  <span className={clsx(
                    "text-[10px] font-semibold rounded-full px-2 py-0.5",
                    o.enabled ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600",
                  )}>
                    {o.enabled ? "مفعّل" : "موقوف"}
                  </span>
                </div>
                {o.reason && <p className="text-xs text-gray-400 mr-4">{o.reason}</p>}
                <p className="text-[10px] text-gray-300 mr-4">{timeAgo(o.createdAt)}</p>
              </div>
              <button
                onClick={() => handleDelete(o.orgId)}
                disabled={deleting === o.orgId}
                className="p-1.5 text-gray-300 hover:text-red-400 transition-colors shrink-0"
              >
                {deleting === o.orgId
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Audit Log Tab ──────────────────────────────────────────

function AuditLogTab({ featureKey }: { featureKey: string }) {
  const { data, loading, error } = useApi(
    () => adminApi.featureFlagAudit(featureKey, 100),
    [featureKey],
  );

  const logs: AuditEntry[] = (data as any)?.data ?? [];

  if (loading) return <Spinner />;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>;

  return (
    <div>
      {logs.length === 0 ? (
        <Empty icon={Clock} text="لا توجد سجلات تدقيق بعد" />
      ) : (
        <div className="divide-y divide-gray-100 border border-[#eef2f6] rounded-xl overflow-hidden">
          {logs.map((log) => (
            <div key={log.id} className="p-4 bg-white space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-800">
                  {ACTION_LABELS[log.action] ?? log.action}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(log.changedAt)}</span>
              </div>
              {log.orgName && (
                <p className="text-xs text-gray-500">المنشأة: {log.orgName}</p>
              )}
              {log.oldValue && log.newValue && (
                <div className="flex gap-3 text-[10px]">
                  <span className="text-red-400">
                    قبل: {JSON.stringify(log.oldValue)}
                  </span>
                  <span className="text-green-600">
                    بعد: {JSON.stringify(log.newValue)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Feature Detail View ────────────────────────────────────

function FeatureDetailView({
  featureKey,
  onBack,
}: {
  featureKey: string;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState("controls");
  const { data, loading, error, refetch } = useApi(
    () => adminApi.getFeatureFlag(featureKey),
    [featureKey],
  );

  const feature: FeatureFlag | null = (data as any)?.data ?? null;

  if (loading) return <Spinner />;
  if (error || !feature) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
      {error ?? "الميزة غير موجودة"}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          العودة
        </button>
        <span className="text-gray-300">/</span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{feature.labelAr}</h2>
          <p className="text-xs text-gray-400 font-mono">{feature.key}</p>
        </div>
        {feature.killSwitch && (
          <span className="bg-red-100 text-red-700 text-xs font-semibold rounded-full px-2.5 py-0.5">
            موقوف
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#eef2f6] bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{feature.rolloutPercentage}%</p>
          <p className="text-xs text-gray-400 mt-0.5">نسبة الإطلاق</p>
        </div>
        <div className="rounded-2xl border border-[#eef2f6] bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{feature.orgsWithAccessCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">منشأة بوصول مباشر</p>
        </div>
        <div className="rounded-2xl border border-[#eef2f6] bg-white p-4 text-center">
          <p className={clsx(
            "text-2xl font-bold",
            feature.defaultForNewOrgs ? "text-green-600" : "text-gray-300",
          )}>
            {feature.defaultForNewOrgs ? "نعم" : "لا"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">افتراضي للجديد</p>
        </div>
      </div>

      {/* Tabs */}
      <TabPill
        tabs={[
          { id: "controls", label: "التحكم العام" },
          { id: "overrides", label: "استثناءات المنشآت" },
          { id: "audit", label: "سجل التعديلات" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "controls" && (
        <GlobalControlsTab feature={feature} onSaved={refetch} />
      )}
      {activeTab === "overrides" && (
        <OrgOverridesTab featureKey={featureKey} onChanged={refetch} />
      )}
      {activeTab === "audit" && (
        <AuditLogTab featureKey={featureKey} />
      )}
    </div>
  );
}

// ── Main FeaturesTab ───────────────────────────────────────

export default function FeaturesTab() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { data, loading, error, refetch } = useApi(() => adminApi.featureFlags(), []);

  const features: FeatureFlag[] = (data as any)?.data ?? [];

  if (selectedKey) {
    return (
      <FeatureDetailView
        featureKey={selectedKey}
        onBack={() => { setSelectedKey(null); refetch(); }}
      />
    );
  }

  if (loading) return <Spinner />;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Feature Flags"
        sub="التحكم في إطلاق الميزات عبر المنشآت — إيقاف فوري، نسبة إطلاق تدريجي، استثناءات فردية"
      />

      {features.length === 0 ? (
        <Empty icon={ToggleLeft} text="لا توجد ميزات مسجّلة في السجل بعد" />
      ) : (
        <div className="divide-y divide-gray-100 border border-[#eef2f6] rounded-2xl overflow-hidden bg-white">
          {features.map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedKey(f.key)}
              className="w-full flex items-center justify-between p-4 text-right hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={clsx(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  f.killSwitch
                    ? "bg-red-500"
                    : f.rolloutPercentage === 100
                    ? "bg-green-500"
                    : f.rolloutPercentage === 0 && !f.defaultForNewOrgs
                    ? "bg-gray-300"
                    : "bg-amber-400",
                )} />
                <div className="min-w-0 text-right">
                  <p className="text-sm font-medium text-gray-900">{f.labelAr}</p>
                  <p className="text-xs text-gray-400 font-mono">{f.key}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-right">
                {f.killSwitch && (
                  <span className="bg-red-100 text-red-700 text-[10px] font-semibold rounded-full px-2 py-0.5">
                    موقوف
                  </span>
                )}
                {!f.killSwitch && (
                  <span className="text-xs text-gray-500">
                    {f.rolloutPercentage}%
                  </span>
                )}
                {f.orgsWithAccessCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-brand-600">
                    <Users className="w-3 h-3" />
                    {f.orgsWithAccessCount}
                  </span>
                )}
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
