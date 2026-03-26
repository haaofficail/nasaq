import React, { useState } from "react";
import {
  Layers, BarChart2, Package, Tag, Gift, Zap, Plus, Save,
  Loader2, CheckCircle, Lock, X, Search,
} from "lucide-react";
import { clsx } from "clsx";
import { adminApi, commercialApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { fmtDate } from "@/lib/utils";
import { Spinner, Empty, SectionHeader, TabPill, Modal } from "./shared";

// ────────────────────────────────────────────────────────────
// PackageBuilder — plan × features checkbox matrix
// ────────────────────────────────────────────────────────────

function PackageBuilder({ plans, features, groups }: { plans: any[]; features: any[]; groups: any[] }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planFeats, setPlanFeats] = useState<Record<string, boolean>>({});
  const [planQuotaVals, setPlanQuotaVals] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data: quotasRes } = useApi(() => commercialApi.quotas(), []);
  const quotas: any[] = quotasRes?.data || [];

  React.useEffect(() => {
    if (!selectedPlan) return;
    commercialApi.planFeatures(selectedPlan).then((r: any) => {
      const m: Record<string, boolean> = {};
      for (const f of (r?.data || [])) m[f.id] = f.enabled !== false;
      setPlanFeats(m);
    });
    commercialApi.planQuotas(selectedPlan).then((r: any) => {
      const m: Record<string, number> = {};
      for (const q of (r?.data || [])) m[q.quotaId] = q.value;
      setPlanQuotaVals(m);
    });
  }, [selectedPlan]);

  const handleSave = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    setSaveError(null);
    try {
      await commercialApi.setPlanFeatures(selectedPlan, { features: Object.entries(planFeats).map(([featureId, enabled]) => ({ featureId, enabled })) });
      await commercialApi.setPlanQuotas(selectedPlan, { quotas: Object.entries(planQuotaVals).map(([quotaId, value]) => ({ quotaId, value })) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setSaveError(err?.message || "فشل الحفظ، حاول مرة أخرى");
    } finally { setSaving(false); }
  };

  const grouped = groups.length > 0
    ? groups.map(g => ({ group: g, items: features.filter((f: any) => f.groupId === g.id) })).filter(g => g.items.length > 0)
    : [{ group: { id: "all", nameAr: "الميزات" }, items: features }];
  const ungrouped = features.filter((f: any) => !f.groupId && groups.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[{ id: "basic", nameAr: "الأساسي" }, { id: "advanced", nameAr: "المتقدم" }, { id: "pro", nameAr: "الاحترافي" }, { id: "enterprise", nameAr: "المؤسسي" }, ...plans.filter(p => !["basic","advanced","pro","enterprise"].includes(p.id))].map((pl: any) => (
          <button key={pl.id} onClick={() => setSelectedPlan(pl.id)}
            className={clsx("px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
              selectedPlan === pl.id ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600")}>
            {pl.nameAr || pl.name || pl.id}
          </button>
        ))}
      </div>

      {!selectedPlan && (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">اختر باقة أعلاه لعرض وتعديل ميزاتها وحصصها</p>
        </div>
      )}

      {selectedPlan && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">الميزات</p>
              <div className="flex gap-2 text-xs text-gray-400">
                <button onClick={() => { const m: any = {}; features.forEach((f: any) => { m[f.id] = true; }); setPlanFeats(m); }} className="hover:text-brand-600">تفعيل الكل</button>
                <span>·</span>
                <button onClick={() => setPlanFeats({})} className="hover:text-red-500">إلغاء الكل</button>
              </div>
            </div>
            {features.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">لا توجد ميزات في الكتالوج بعد</div>
            ) : (
              <div className="p-4 space-y-4">
                {grouped.map(({ group, items }) => (
                  <div key={group.id}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{group.nameAr}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {items.map((f: any) => (
                        <label key={f.id} className={clsx("flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                          planFeats[f.id] ? "border-brand-200 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                          <input type="checkbox" checked={!!planFeats[f.id]} onChange={e => setPlanFeats(p => ({ ...p, [f.id]: e.target.checked }))}
                            className="w-4 h-4 rounded accent-brand-500" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{f.nameAr}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{f.id}</p>
                          </div>
                          {f.isPremium && <span className="mr-auto text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">PRO</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {ungrouped.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">أخرى</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ungrouped.map((f: any) => (
                        <label key={f.id} className={clsx("flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                          planFeats[f.id] ? "border-brand-200 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                          <input type="checkbox" checked={!!planFeats[f.id]} onChange={e => setPlanFeats(p => ({ ...p, [f.id]: e.target.checked }))}
                            className="w-4 h-4 rounded accent-brand-500" />
                          <p className="text-xs font-medium text-gray-800 truncate">{f.nameAr}</p>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {quotas.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">الحصص والحدود</p>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {quotas.map((q: any) => (
                  <div key={q.id} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">{q.nameAr}</p>
                    <div className="flex items-center gap-2">
                      <input type="number" value={planQuotaVals[q.id] ?? q.defaultValue ?? 0}
                        onChange={e => setPlanQuotaVals(p => ({ ...p, [q.id]: Number(e.target.value) }))}
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-brand-400" dir="ltr" />
                      <span className="text-xs text-gray-400">{q.unitAr || ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "تم الحفظ!" : "حفظ الباقة"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TenantOverrideCenter
// ────────────────────────────────────────────────────────────

function TenantOverrideCenter({ orgs, features, quotas, addons }: { orgs: any[]; features: any[]; quotas: any[]; addons: any[] }) {
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [orgSearch, setOrgSearch] = useState("");
  const [overrideTab, setOverrideTab] = useState("entitlements");

  const { data: entRes, loading: entLoading, refetch: refetchEnt } = useApi(
    () => selectedOrg ? commercialApi.orgEntitlements(selectedOrg.id) : Promise.resolve(null), [selectedOrg?.id]);
  const { data: grantsRes, refetch: refetchGrants } = useApi(
    () => selectedOrg ? commercialApi.orgGrants(selectedOrg.id) : Promise.resolve(null), [selectedOrg?.id]);
  const { data: billingRes, refetch: refetchBilling } = useApi(
    () => selectedOrg ? commercialApi.billingOverride(selectedOrg.id) : Promise.resolve(null), [selectedOrg?.id]);
  const { data: orgAddonsRes, refetch: refetchOrgAddons } = useApi(
    () => selectedOrg ? commercialApi.orgAddons(selectedOrg.id) : Promise.resolve(null), [selectedOrg?.id]);

  const [grantForm, setGrantForm] = useState({ type: "feature", targetId: "", nameAr: "", reason: "", isPermanent: true, endsAt: "" });
  const [billingForm, setBillingForm] = useState({ billingMode: "standard", customPriceMonthly: "", reason: "", isBillingPaused: false });
  const [addonGrantForm, setAddonGrantForm] = useState({ addOnId: "", quantity: "1", isFree: true, notes: "" });
  const [quotaOverrideForm, setQuotaOverrideForm] = useState({ quotaId: "", value: "", reason: "", isPermanent: true });
  const [grantOpen, setGrantOpen] = useState(false);
  const [addonGrantOpen, setAddonGrantOpen] = useState(false);
  const [quotaOverrideOpen, setQuotaOverrideOpen] = useState(false);

  const { mutate: addGrant,       loading: addingGrant      } = useMutation((d: any) => commercialApi.addOrgGrant(selectedOrg!.id, d));
  const { mutate: deleteGrant                               } = useMutation((id: string) => commercialApi.deleteOrgGrant(selectedOrg!.id, id));
  const { mutate: saveBilling,    loading: savingBilling    } = useMutation((d: any) => commercialApi.setBillingOverride(selectedOrg!.id, d));
  const { mutate: toggleFeature                             } = useMutation(({ fId, enabled }: any) => commercialApi.orgFeatureOverride(selectedOrg!.id, fId, { enabled }));
  const { mutate: grantAddon,     loading: grantingAddon    } = useMutation((d: any) => commercialApi.grantOrgAddon(selectedOrg!.id, d));
  const { mutate: setQuotaOvr,    loading: settingQuotaOvr  } = useMutation((d: any) => commercialApi.setOrgQuotaOverride(selectedOrg!.id, d.quotaId, { value: d.value, reason: d.reason, isPermanent: d.isPermanent, endsAt: d.endsAt || null }));

  const filteredOrgs = orgSearch ? orgs.filter(o => o.name?.includes(orgSearch) || o.slug?.includes(orgSearch)) : orgs;
  const entitlements = entRes?.data || null;
  const grants: any[] = grantsRes?.data || [];
  const billing = billingRes?.data || null;
  const orgAddons: any[] = orgAddonsRes?.data || [];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">اختر منشأة للتحكم في صلاحياتها التجارية</p>
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 mb-3">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={orgSearch} onChange={e => setOrgSearch(e.target.value)} placeholder="بحث بالاسم..." className="flex-1 text-sm outline-none" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
          {filteredOrgs.map((org: any) => (
            <button key={org.id} onClick={() => { setSelectedOrg(org); setOverrideTab("entitlements"); }}
              className={clsx("flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all",
                selectedOrg?.id === org.id ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                {org.name?.[0] || "م"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{org.name}</p>
                <p className="text-[10px] text-gray-400">{org.plan || "—"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedOrg && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold">{selectedOrg.name?.[0]}</div>
            <div>
              <p className="font-semibold text-gray-900">{selectedOrg.name}</p>
              <p className="text-xs text-gray-400">{selectedOrg.businessType} · {selectedOrg.plan} · {selectedOrg.subscriptionStatus}</p>
            </div>
            <button onClick={() => setSelectedOrg(null)} className="mr-auto p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
          </div>

          <TabPill tabs={[
            { id: "entitlements", label: "الصلاحيات الفعلية" },
            { id: "features",     label: "تجاوزات الميزات" },
            { id: "quotas",       label: "تجاوزات الحصص" },
            { id: "grants",       label: "المنح المجانية" },
            { id: "addons",       label: "الإضافات" },
            { id: "billing",      label: "الفوترة" },
          ]} active={overrideTab} onChange={setOverrideTab} />

          {overrideTab === "entitlements" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              {entLoading ? <Spinner /> : !entitlements ? <Empty icon={Lock} text="لا توجد بيانات صلاحيات" /> : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span className={clsx("px-3 py-1 rounded-full text-xs font-bold",
                      entitlements.accessState === "active" ? "bg-emerald-100 text-emerald-700"
                      : entitlements.accessState === "trial" ? "bg-blue-100 text-blue-700"
                      : entitlements.accessState === "free_tier" ? "bg-purple-100 text-purple-700"
                      : "bg-red-100 text-red-700")}>
                      {entitlements.accessState}
                    </span>
                    <span className="text-xs text-gray-400">الباقة: <strong>{entitlements.plan}</strong></span>
                    {entitlements.billingOverride && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">تجاوز فوترة نشط</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      الميزات المفعّلة ({(entitlements.enabledFeatures || []).length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(entitlements.enabledFeatures || []).map((f: any) => (
                        <span key={f.featureId} className={clsx("px-2 py-0.5 rounded-lg text-[11px] font-mono",
                          f.source === "override" ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : f.source === "grant"   ? "bg-purple-50 text-purple-700"
                          : f.source === "addon"   ? "bg-sky-50 text-sky-700"
                          : "bg-brand-50 text-brand-700")}>
                          {f.featureId}
                          <span className="mr-1 opacity-60 text-[9px]">({f.source})</span>
                        </span>
                      ))}
                      {(entitlements.enabledFeatures || []).length === 0 && <span className="text-xs text-gray-400">لا توجد ميزات مفعّلة</span>}
                    </div>
                  </div>
                  {(entitlements.effectiveQuotas || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">الحصص الفعلية</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(entitlements.effectiveQuotas || []).map((q: any) => (
                          <div key={q.quotaId} className={clsx("rounded-xl p-3 border",
                            q.source === "override" ? "bg-amber-50 border-amber-200"
                            : q.source === "addon"  ? "bg-sky-50 border-sky-200"
                            : "bg-gray-50 border-gray-100")}>
                            <p className="text-[10px] text-gray-400 font-mono mb-0.5">{q.quotaId}</p>
                            <p className="text-lg font-bold text-gray-800 tabular-nums">{q.unlimited ? "∞" : q.value}</p>
                            <p className="text-[9px] text-gray-400">{q.source}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(entitlements.activeAddOns || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">الإضافات النشطة</p>
                      <div className="flex flex-wrap gap-2">
                        {(entitlements.activeAddOns || []).map((a: any) => (
                          <span key={a.key} className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium">
                            {a.nameAr} ×{a.quantity} {a.isFree && "(مجاني)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {overrideTab === "features" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-4">تجاوز ميزات الباقة لهذه المنشأة فقط — الأصفر = تجاوز يدوي نشط</p>
              {features.length === 0 ? <Empty icon={Layers} text="لا توجد ميزات في الكتالوج" /> : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {features.map((f: any) => {
                    const enabledEntry = entitlements?.enabledFeatures?.find((ef: any) => ef.featureId === f.id);
                    const effective = !!enabledEntry;
                    const isOverride = enabledEntry?.source === "override";
                    const isDisabledOverride = entitlements?.disabledFeatures?.includes(f.id);
                    const hasManualOverride = isOverride || isDisabledOverride;
                    return (
                      <div key={f.id} className={clsx("flex items-center justify-between p-3 rounded-xl border transition-all",
                        hasManualOverride ? "border-amber-200 bg-amber-50" : "border-gray-100")}>
                        <div className="min-w-0 mr-2">
                          <p className="text-xs font-medium text-gray-800 truncate">{f.nameAr}</p>
                          <p className="text-[9px] font-mono text-gray-400">{f.id}</p>
                          {hasManualOverride && <p className="text-[10px] text-amber-600 font-medium">تجاوز يدوي</p>}
                        </div>
                        <button onClick={async () => {
                          await toggleFeature({ fId: f.id, enabled: !effective });
                          refetchEnt();
                        }} className={clsx("shrink-0 w-9 h-5 rounded-full transition-colors relative",
                          effective ? "bg-brand-500" : "bg-gray-200")}>
                          <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                            effective ? "right-0.5" : "left-0.5")} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {overrideTab === "quotas" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setQuotaOverrideOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
                  <Plus className="w-4 h-4" /> تجاوز حصة
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                {!(entitlements?.effectiveQuotas || []).length
                  ? <Empty icon={BarChart2} text="لا توجد تجاوزات حصص نشطة" />
                  : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(entitlements?.effectiveQuotas || []).map((q: any) => {
                      const catalogQ = quotas.find((cq: any) => cq.id === q.quotaId);
                      return (
                        <div key={q.quotaId} className={clsx("rounded-xl p-3 border",
                          q.source === "override" ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100")}>
                          <p className="text-xs text-gray-500 font-medium mb-0.5">{catalogQ?.nameAr || q.quotaId}</p>
                          <p className="text-2xl font-bold text-gray-800 tabular-nums">{q.unlimited ? "∞" : q.value}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{catalogQ?.unitAr || ""} · {q.source}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <Modal open={quotaOverrideOpen} onClose={() => setQuotaOverrideOpen(false)} title="تجاوز حصة للمنشأة">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">الحصة *</label>
                    <select value={quotaOverrideForm.quotaId} onChange={e => setQuotaOverrideForm(p => ({ ...p, quotaId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                      <option value="">— اختر حصة —</option>
                      {quotas.map((q: any) => {
                        const current = entitlements?.effectiveQuotas?.find((eq: any) => eq.quotaId === q.id);
                        return (
                          <option key={q.id} value={q.id}>
                            {q.nameAr} — الحالي: {current ? (current.unlimited ? "∞" : current.value) : (q.defaultValue ?? 0)} {q.unitAr || ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">القيمة الجديدة * (-1 = لانهاية)</label>
                      <input type="number" min="-1" value={quotaOverrideForm.value} onChange={e => setQuotaOverrideForm(p => ({ ...p, value: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" dir="ltr" />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={quotaOverrideForm.isPermanent} onChange={e => setQuotaOverrideForm(p => ({ ...p, isPermanent: e.target.checked }))} className="accent-brand-500" />
                        <span className="text-sm text-gray-700">دائم</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">السبب *</label>
                    <input value={quotaOverrideForm.reason} onChange={e => setQuotaOverrideForm(p => ({ ...p, reason: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="سبب تعديل الحصة" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setQuotaOverrideOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
                    <button disabled={!quotaOverrideForm.quotaId || quotaOverrideForm.value === "" || !quotaOverrideForm.reason || settingQuotaOvr}
                      onClick={async () => {
                        await setQuotaOvr({ quotaId: quotaOverrideForm.quotaId, value: Number(quotaOverrideForm.value), reason: quotaOverrideForm.reason, isPermanent: quotaOverrideForm.isPermanent });
                        setQuotaOverrideOpen(false); setQuotaOverrideForm({ quotaId: "", value: "", reason: "", isPermanent: true }); refetchEnt();
                      }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                      {settingQuotaOvr ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "حفظ التجاوز"}
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          )}

          {overrideTab === "grants" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setGrantOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
                  <Plus className="w-4 h-4" /> منحة جديدة
                </button>
              </div>
              {grants.length === 0 ? <Empty icon={Gift} text="لا توجد منح مجانية" /> : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
                      <th className="text-right px-4 py-3">الاسم</th>
                      <th className="text-right px-4 py-3">النوع</th>
                      <th className="text-right px-4 py-3">السبب</th>
                      <th className="text-right px-4 py-3">الانتهاء</th>
                      <th className="px-4 py-3"></th>
                    </tr></thead>
                    <tbody>
                      {grants.map((g: any) => (
                        <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 text-xs">{g.nameAr}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-medium">{g.type}</span></td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{g.reason || "—"}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{g.isPermanent ? "دائم" : g.endsAt ? new Date(g.endsAt).toLocaleDateString("ar") : "—"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteGrant(g.id).then(() => refetchGrants())} className="text-xs text-red-400 hover:text-red-600">حذف</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Modal open={grantOpen} onClose={() => setGrantOpen(false)} title="منحة مجانية جديدة">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">نوع المنحة</label>
                      <select value={grantForm.type} onChange={e => setGrantForm(p => ({ ...p, type: e.target.value, targetId: "" }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                        <option value="feature">ميزة</option>
                        <option value="quota">حصة</option>
                        <option value="addon">إضافة</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        {grantForm.type === "feature" ? "الميزة" : grantForm.type === "quota" ? "الحصة" : "الإضافة"} *
                      </label>
                      <select value={grantForm.targetId} onChange={e => {
                        const val = e.target.value;
                        const label = grantForm.type === "feature"
                          ? features.find(f => f.id === val)?.nameAr
                          : grantForm.type === "quota"
                          ? quotas.find(q => q.id === val)?.nameAr
                          : addons.find(a => a.id === val)?.nameAr;
                        setGrantForm(p => ({ ...p, targetId: val, nameAr: label || p.nameAr }));
                      }} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                        <option value="">— اختر —</option>
                        {grantForm.type === "feature" && features.map((f: any) => (
                          <option key={f.id} value={f.id}>{f.nameAr} ({f.id})</option>
                        ))}
                        {grantForm.type === "quota" && quotas.map((q: any) => (
                          <option key={q.id} value={q.id}>{q.nameAr} ({q.id})</option>
                        ))}
                        {grantForm.type === "addon" && addons.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.nameAr} ({a.key})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">وصف المنحة *</label>
                    <input value={grantForm.nameAr} onChange={e => setGrantForm(p => ({ ...p, nameAr: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="مثال: تقارير مجانية لمؤسس" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">السبب *</label>
                    <input value={grantForm.reason} onChange={e => setGrantForm(p => ({ ...p, reason: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="سبب المنحة" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={grantForm.isPermanent} onChange={e => setGrantForm(p => ({ ...p, isPermanent: e.target.checked }))} className="accent-brand-500" />
                      <span className="text-sm text-gray-700">دائم</span>
                    </label>
                    {!grantForm.isPermanent && (
                      <input type="date" value={grantForm.endsAt} onChange={e => setGrantForm(p => ({ ...p, endsAt: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" dir="ltr" />
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setGrantOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
                    <button disabled={addingGrant || !grantForm.nameAr || !grantForm.reason || !grantForm.targetId} onClick={async () => {
                      await addGrant({ ...grantForm, endsAt: grantForm.isPermanent ? null : grantForm.endsAt || null });
                      setGrantOpen(false); setGrantForm({ type: "feature", targetId: "", nameAr: "", reason: "", isPermanent: true, endsAt: "" }); refetchGrants(); refetchEnt();
                    }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                      {addingGrant ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إضافة المنحة"}
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          )}

          {overrideTab === "addons" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setAddonGrantOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
                  <Plus className="w-4 h-4" /> منح إضافة
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                {orgAddons.length === 0 ? <Empty icon={Package} text="لا توجد إضافات مفعّلة لهذه المنشأة" /> : (
                  <div className="space-y-2">
                    {orgAddons.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.addOn?.nameAr || a.addOnId}</p>
                          <p className="text-xs text-gray-400 font-mono">{a.addOn?.key} · x{a.quantity} · {a.isFree ? "مجاني" : `${Number(a.addOn?.priceMonthly || 0).toLocaleString()} ر.س/شهر`}</p>
                        </div>
                        <button onClick={() => commercialApi.revokeOrgAddon(selectedOrg!.id, a.id).then(() => { refetchOrgAddons(); refetchEnt(); })}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">إلغاء</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Modal open={addonGrantOpen} onClose={() => setAddonGrantOpen(false)} title="منح إضافة للمنشأة">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">الإضافة *</label>
                    <select value={addonGrantForm.addOnId} onChange={e => setAddonGrantForm(p => ({ ...p, addOnId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                      <option value="">— اختر إضافة من الكتالوج —</option>
                      {addons.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.nameAr} — {a.key} ({a.isFree ? "مجاني" : `${Number(a.priceMonthly || 0).toLocaleString()} ر.س/شهر`})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">الكمية</label>
                      <input type="number" min="1" value={addonGrantForm.quantity} onChange={e => setAddonGrantForm(p => ({ ...p, quantity: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" dir="ltr" />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={addonGrantForm.isFree} onChange={e => setAddonGrantForm(p => ({ ...p, isFree: e.target.checked }))} className="accent-brand-500" />
                        <span className="text-sm text-gray-700">مجاناً (بدون فوترة)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">ملاحظات</label>
                    <input value={addonGrantForm.notes} onChange={e => setAddonGrantForm(p => ({ ...p, notes: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="سبب المنح أو ملاحظات" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setAddonGrantOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
                    <button disabled={!addonGrantForm.addOnId || grantingAddon} onClick={async () => {
                      await grantAddon({ addOnId: addonGrantForm.addOnId, quantity: Number(addonGrantForm.quantity) || 1, isFree: addonGrantForm.isFree, notes: addonGrantForm.notes || null, isPermanent: true });
                      setAddonGrantOpen(false); setAddonGrantForm({ addOnId: "", quantity: "1", isFree: true, notes: "" }); refetchOrgAddons(); refetchEnt();
                    }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                      {grantingAddon ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "منح الإضافة"}
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          )}

          {overrideTab === "billing" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              {billing && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  تجاوز فوترة نشط · {billing.billingMode} · {billing.customPriceMonthly ? `${billing.customPriceMonthly} ر.س/شهر` : ""}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">نمط الفوترة</label>
                  <select value={billingForm.billingMode} onChange={e => setBillingForm(p => ({ ...p, billingMode: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                    <option value="standard">قياسي</option><option value="custom">مخصص</option>
                    <option value="enterprise">مؤسسي</option><option value="manual">يدوي</option>
                    <option value="free">مجاني</option><option value="paused">موقوف</option>
                  </select>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">سعر مخصص (ر.س/شهر)</label>
                  <input type="number" value={billingForm.customPriceMonthly} onChange={e => setBillingForm(p => ({ ...p, customPriceMonthly: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" dir="ltr" />
                </div>
              </div>
              <div><label className="text-xs text-gray-500 block mb-1">السبب (إلزامي) *</label>
                <input value={billingForm.reason} onChange={e => setBillingForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="سبب تعديل الفوترة" />
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={billingForm.isBillingPaused} onChange={e => setBillingForm(p => ({ ...p, isBillingPaused: e.target.checked }))} className="accent-brand-500" />
                  <span className="text-sm text-gray-700">إيقاف الفوترة مؤقتاً</span>
                </label>
              </div>
              <button disabled={savingBilling || !billingForm.reason} onClick={async () => {
                await saveBilling({ billingMode: billingForm.billingMode, customPriceMonthly: billingForm.customPriceMonthly || null, isBillingPaused: billingForm.isBillingPaused, reason: billingForm.reason });
                refetchBilling();
              }} className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {savingBilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ إعدادات الفوترة
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// CommercialTab
// ────────────────────────────────────────────────────────────

function CommercialTab() {
  const [subTab, setSubTab] = useState("packages");

  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showQuotaModal,   setShowQuotaModal]   = useState(false);
  const [showAddonModal,   setShowAddonModal]   = useState(false);
  const [showDiscModal,    setShowDiscModal]     = useState(false);
  const [showPromoModal,   setShowPromoModal]    = useState(false);
  const [showRuleModal,    setShowRuleModal]     = useState(false);

  const [featureForm, setFeatureForm] = useState({ id: "", nameAr: "", nameEn: "", groupId: "", isCore: false, isPremium: false, isEnterprise: false });
  const [quotaForm,   setQuotaForm]   = useState({ id: "", nameAr: "", unitAr: "", defaultValue: "0", overagePolicy: "block" });
  const [addonForm,   setAddonForm]   = useState({ key: "", nameAr: "", type: "feature", priceMonthly: "", billingCycle: "monthly" });
  const [discForm,    setDiscForm]    = useState({ name: "", type: "percentage", value: "", reason: "", endsAt: "" });
  const [promoForm,   setPromoForm]   = useState({ name: "", type: "percentage", value: "", couponCode: "", endsAt: "" });
  const [ruleForm,    setRuleForm]    = useState({ name: "", trigger: "", scope: "global", isActive: true });

  const { data: featRes,   loading: fLoading,  refetch: refetchFeat  } = useApi(() => commercialApi.features(), []);
  const { data: groupsRes                                              } = useApi(() => commercialApi.featureGroups(), []);
  const { data: quotasRes, loading: qLoading,  refetch: refetchQuota } = useApi(() => commercialApi.quotas(), []);
  const { data: addRes,    loading: aLoading,  refetch: refetchAddons } = useApi(() => commercialApi.addons(), []);
  const { data: discRes,   loading: dLoading,  refetch: refetchDisc  } = useApi(() => commercialApi.discounts(), []);
  const { data: promoRes,  loading: pLoading,  refetch: refetchPromo } = useApi(() => commercialApi.promotions(), []);
  const { data: rulesRes,  loading: rLoading,  refetch: refetchRules } = useApi(() => commercialApi.rules(), []);
  const { data: plansRes                                               } = useApi(() => adminApi.plans(), []);
  const { data: orgsRes                                                } = useApi(() => adminApi.orgs({ page: 1, limit: 200 }), []);

  const { mutate: createFeature, loading: crFeat  } = useMutation((d: any) => commercialApi.createFeature(d));
  const { mutate: createQuota,   loading: crQuota } = useMutation((d: any) => commercialApi.createQuota(d));
  const { mutate: createAddon,   loading: crAddon } = useMutation((d: any) => commercialApi.createAddon(d));
  const { mutate: createDisc,    loading: crDisc  } = useMutation((d: any) => commercialApi.createDiscount(d));
  const { mutate: createPromo,   loading: crPromo } = useMutation((d: any) => commercialApi.createPromotion(d));
  const { mutate: createRule,    loading: crRule  } = useMutation((d: any) => commercialApi.createRule(d));
  const { mutate: deleteDisc                       } = useMutation((id: string) => commercialApi.deleteDiscount(id));

  const features: any[] = featRes?.data   || [];
  const groups:   any[] = groupsRes?.data || [];
  const quotas:   any[] = quotasRes?.data || [];
  const addons:   any[] = addRes?.data    || [];
  const discounts:any[] = discRes?.data   || [];
  const promos:   any[] = promoRes?.data  || [];
  const rules:    any[] = rulesRes?.data  || [];
  const plans:    any[] = plansRes?.data  || [];
  const orgs:     any[] = orgsRes?.data   || [];

  const BILLING_LABELS: Record<string, string> = { monthly: "شهري", yearly: "سنوي", once: "مرة واحدة" };
  const DISC_TYPE_LABELS: Record<string, string> = { percentage: "نسبة مئوية %", fixed: "مبلغ ثابت ر.س" };

  return (
    <div className="space-y-6">
      <SectionHeader title="المحرك التجاري" sub="إدارة الباقات والميزات والحصص والإضافات والخصومات والعروض والمستأجرين والقواعد" />

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "الميزات",  value: features.length,  color: "text-brand-600",   bg: "bg-brand-50",   icon: Layers  },
          { label: "الحصص",    value: quotas.length,    color: "text-sky-700",     bg: "bg-sky-50",     icon: BarChart2 },
          { label: "الإضافات", value: addons.length,    color: "text-purple-700",  bg: "bg-purple-50",  icon: Package },
          { label: "الخصومات", value: discounts.length, color: "text-amber-700",   bg: "bg-amber-50",   icon: Tag     },
          { label: "العروض",   value: promos.length,    color: "text-emerald-700", bg: "bg-emerald-50", icon: Gift    },
          { label: "القواعد",  value: rules.length,     color: "text-rose-700",    bg: "bg-rose-50",    icon: Zap     },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3">
            <div className={clsx("w-7 h-7 rounded-xl flex items-center justify-center mb-1.5", s.bg)}>
              <s.icon className={clsx("w-3.5 h-3.5", s.color)} />
            </div>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <TabPill
        tabs={[
          { id: "packages",  label: "الباقات" },
          { id: "features",  label: "الميزات" },
          { id: "quotas",    label: "الحصص" },
          { id: "addons",    label: "الإضافات" },
          { id: "discounts", label: "الخصومات" },
          { id: "promos",    label: "العروض" },
          { id: "tenants",   label: "المستأجرون" },
          { id: "rules",     label: "القواعد" },
        ]}
        active={subTab} onChange={setSubTab}
      />

      {subTab === "packages" && (
        <PackageBuilder plans={plans} features={features} groups={groups} />
      )}

      {subTab === "features" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowFeatureModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> ميزة جديدة
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {fLoading ? <Spinner /> : features.length === 0 ? <Empty icon={Layers} text="لا توجد ميزات مسجلة — أضف ميزتك الأولى" /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">المفتاح</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الاسم</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المجموعة</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الباقة</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f: any) => (
                    <tr key={f.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-mono text-xs text-gray-600">{f.id}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{f.nameAr || f.name}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{groups.find((g: any) => g.id === f.groupId)?.nameAr || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {f.isCore      && <span className="px-1.5 py-0.5 bg-blue-50   text-blue-700   rounded text-[9px] font-bold">أساسي</span>}
                          {f.isPremium   && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-bold">PRO</span>}
                          {f.isEnterprise && <span className="px-1.5 py-0.5 bg-amber-50  text-amber-700  rounded text-[9px] font-bold">ENT</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold", f.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                          {f.isActive !== false ? "مفعّلة" : "معطّلة"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {subTab === "quotas" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowQuotaModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> حصة جديدة
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {qLoading ? <Spinner /> : quotas.length === 0 ? <Empty icon={BarChart2} text="لا توجد حصص مسجلة — أضف حصتك الأولى" /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">المفتاح</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الاسم</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الوحدة</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الافتراضي</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">سياسة التجاوز</th>
                  </tr>
                </thead>
                <tbody>
                  {quotas.map((q: any) => (
                    <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-mono text-xs text-gray-600">{q.id}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{q.nameAr || q.name}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{q.unitAr || "—"}</td>
                      <td className="py-3 px-4 font-bold text-gray-700 tabular-nums">{q.defaultValue ?? "—"}</td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          q.overagePolicy === "block" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
                          {q.overagePolicy === "block" ? "حظر" : "تحذير"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {subTab === "addons" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddonModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> إضافة جديدة
            </button>
          </div>
          {aLoading ? <Spinner /> : addons.length === 0 ? <Empty icon={Package} text="لا توجد إضافات" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {addons.map((a: any) => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold text-gray-900">{a.nameAr}</p>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">{a.key}</span>
                  </div>
                  {a.descriptionAr && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{a.descriptionAr}</p>}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-base font-bold text-brand-600 tabular-nums">{Number(a.priceMonthly || 0).toLocaleString()} ر.س</span>
                    <span className="text-xs text-gray-400">{BILLING_LABELS[a.billingCycle] || a.billingCycle || "شهري"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "discounts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowDiscModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> خصم جديد
            </button>
          </div>
          {dLoading ? <Spinner /> : discounts.length === 0 ? <Empty icon={Tag} text="لا توجد خصومات" /> : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">الاسم</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">النوع</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">القيمة</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">النطاق</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الانتهاء</th>
                    <th className="py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((d: any) => (
                    <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-medium text-gray-900">{d.name}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{DISC_TYPE_LABELS[d.type] || d.type}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{d.value}{d.type === "percentage" ? "%" : " ر.س"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{d.targetScope || "global"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{d.endsAt ? fmtDate(d.endsAt) : "بلا انتهاء"}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => deleteDisc(d.id).then(() => refetchDisc())} className="text-xs text-red-500 hover:underline">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === "promos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowPromoModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> عرض جديد
            </button>
          </div>
          {pLoading ? <Spinner /> : promos.length === 0 ? <Empty icon={Gift} text="لا توجد عروض ترويجية" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {promos.map((p: any) => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <p className="text-sm font-bold text-gray-900 mb-1">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-700">{p.value}{p.type === "percentage" ? "%" : " ر.س"} خصم</span>
                    {p.endsAt && <span className="text-xs text-gray-400">{fmtDate(p.endsAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "tenants" && (
        <TenantOverrideCenter orgs={orgs} features={features} quotas={quotas} addons={addons} />
      )}

      {subTab === "rules" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowRuleModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> قاعدة جديدة
            </button>
          </div>
          {rLoading ? <Spinner /> : rules.length === 0 ? <Empty icon={Zap} text="لا توجد قواعد مسجلة" /> : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">الاسم</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المحفّز</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">النطاق</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-medium text-gray-900">{r.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">{r.trigger}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{r.scope}</td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                          {r.isActive ? "نشطة" : "موقوفة"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Feature modal */}
      <Modal open={showFeatureModal} onClose={() => setShowFeatureModal(false)} title="ميزة جديدة">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">المعرّف (ID) *</label>
              <input value={featureForm.id} onChange={e => setFeatureForm(p => ({ ...p, id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="feature_bookings" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">المجموعة</label>
              <select value={featureForm.groupId} onChange={e => setFeatureForm(p => ({ ...p, groupId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="">— بدون مجموعة —</option>
                {groups.map((g: any) => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الاسم (عربي) *</label>
              <input value={featureForm.nameAr} onChange={e => setFeatureForm(p => ({ ...p, nameAr: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الاسم (إنجليزي)</label>
              <input value={featureForm.nameEn} onChange={e => setFeatureForm(p => ({ ...p, nameEn: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
          </div>
          <div className="flex items-center gap-6 pt-1">
            {[["isCore","أساسي"],["isPremium","PRO"],["isEnterprise","مؤسسي"]].map(([k, lbl]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(featureForm as any)[k]} onChange={e => setFeatureForm(p => ({ ...p, [k]: e.target.checked }))} className="accent-brand-500" />
                <span className="text-sm text-gray-700">{lbl}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowFeatureModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!featureForm.id.trim() || !featureForm.nameAr.trim() || crFeat}
              onClick={() => createFeature({ id: featureForm.id, nameAr: featureForm.nameAr, nameEn: featureForm.nameEn || null, groupId: featureForm.groupId || null, isCore: featureForm.isCore, isPremium: featureForm.isPremium, isEnterprise: featureForm.isEnterprise })
                .then(() => { setShowFeatureModal(false); setFeatureForm({ id: "", nameAr: "", nameEn: "", groupId: "", isCore: false, isPremium: false, isEnterprise: false }); refetchFeat(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crFeat && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إضافة الميزة
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Quota modal */}
      <Modal open={showQuotaModal} onClose={() => setShowQuotaModal(false)} title="حصة جديدة">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">المعرّف (ID) *</label>
              <input value={quotaForm.id} onChange={e => setQuotaForm(p => ({ ...p, id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="quota_users" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الاسم (عربي) *</label>
              <input value={quotaForm.nameAr} onChange={e => setQuotaForm(p => ({ ...p, nameAr: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الوحدة</label>
              <input value={quotaForm.unitAr} onChange={e => setQuotaForm(p => ({ ...p, unitAr: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="مثال: موظف" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الافتراضي</label>
              <input type="number" value={quotaForm.defaultValue} onChange={e => setQuotaForm(p => ({ ...p, defaultValue: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">التجاوز</label>
              <select value={quotaForm.overagePolicy} onChange={e => setQuotaForm(p => ({ ...p, overagePolicy: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="block">حظر</option>
                <option value="warn">تحذير</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowQuotaModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!quotaForm.id.trim() || !quotaForm.nameAr.trim() || crQuota}
              onClick={() => createQuota({ id: quotaForm.id, nameAr: quotaForm.nameAr, unitAr: quotaForm.unitAr || null, defaultValue: Number(quotaForm.defaultValue) || 0, overagePolicy: quotaForm.overagePolicy })
                .then(() => { setShowQuotaModal(false); setQuotaForm({ id: "", nameAr: "", unitAr: "", defaultValue: "0", overagePolicy: "block" }); refetchQuota(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crQuota && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إضافة الحصة
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Addon modal */}
      <Modal open={showAddonModal} onClose={() => setShowAddonModal(false)} title="إضافة جديدة">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">المفتاح (key) *</label>
              <input value={addonForm.key} onChange={e => setAddonForm(p => ({ ...p, key: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="addon_extra_users" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">النوع *</label>
              <select value={addonForm.type} onChange={e => setAddonForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="feature">ميزة</option>
                <option value="quota">حصة</option>
                <option value="bundle">حزمة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">الاسم (عربي) *</label>
            <input value={addonForm.nameAr} onChange={e => setAddonForm(p => ({ ...p, nameAr: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="مثال: موظفون إضافيون" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">السعر الشهري (ر.س)</label>
              <input type="number" value={addonForm.priceMonthly} onChange={e => setAddonForm(p => ({ ...p, priceMonthly: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">دورة الفوترة</label>
              <select value={addonForm.billingCycle} onChange={e => setAddonForm(p => ({ ...p, billingCycle: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="monthly">شهري</option><option value="yearly">سنوي</option><option value="once">مرة واحدة</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddonModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!addonForm.key.trim() || !addonForm.nameAr.trim() || crAddon}
              onClick={() => createAddon({ key: addonForm.key, nameAr: addonForm.nameAr, type: addonForm.type, priceMonthly: addonForm.priceMonthly || null, billingCycle: addonForm.billingCycle })
                .then(() => { setShowAddonModal(false); setAddonForm({ key: "", nameAr: "", type: "feature", priceMonthly: "", billingCycle: "monthly" }); refetchAddons(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crAddon && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إضافة
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Discount modal */}
      <Modal open={showDiscModal} onClose={() => setShowDiscModal(false)} title="خصم جديد">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">اسم الخصم *</label>
              <input value={discForm.name} onChange={e => setDiscForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="خصم الصيف" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">النوع</label>
              <select value={discForm.type} onChange={e => setDiscForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="percentage">نسبة %</option><option value="fixed">ثابت ر.س</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">القيمة *</label>
              <input type="number" value={discForm.value} onChange={e => setDiscForm(p => ({ ...p, value: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">تاريخ الانتهاء</label>
              <input type="date" value={discForm.endsAt} onChange={e => setDiscForm(p => ({ ...p, endsAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">السبب *</label>
            <input value={discForm.reason} onChange={e => setDiscForm(p => ({ ...p, reason: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="سبب إنشاء الخصم" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowDiscModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!discForm.name.trim() || !discForm.value || !discForm.reason.trim() || crDisc}
              onClick={() => createDisc({ name: discForm.name, type: discForm.type, value: Number(discForm.value), reason: discForm.reason, endsAt: discForm.endsAt || null, targetScope: "global" })
                .then(() => { setShowDiscModal(false); setDiscForm({ name: "", type: "percentage", value: "", reason: "", endsAt: "" }); refetchDisc(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crDisc && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إنشاء الخصم
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Promotion modal */}
      <Modal open={showPromoModal} onClose={() => setShowPromoModal(false)} title="عرض ترويجي جديد">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">اسم العرض *</label>
            <input value={promoForm.name} onChange={e => setPromoForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">النوع *</label>
              <select value={promoForm.type} onChange={e => setPromoForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="percentage">نسبة %</option>
                <option value="fixed">ثابت ر.س</option>
                <option value="free_period">فترة مجانية</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">القيمة</label>
              <input type="number" value={promoForm.value} onChange={e => setPromoForm(p => ({ ...p, value: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">ينتهي في</label>
              <input type="date" value={promoForm.endsAt} onChange={e => setPromoForm(p => ({ ...p, endsAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">كود الكوبون</label>
            <input value={promoForm.couponCode} onChange={e => setPromoForm(p => ({ ...p, couponCode: e.target.value.toUpperCase() }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="PROMO2026 (اختياري)" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowPromoModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!promoForm.name.trim() || crPromo}
              onClick={() => createPromo({ name: promoForm.name, type: promoForm.type, value: promoForm.value ? Number(promoForm.value) : undefined, couponCode: promoForm.couponCode || null, endsAt: promoForm.endsAt || null })
                .then(() => { setShowPromoModal(false); setPromoForm({ name: "", type: "percentage", value: "", couponCode: "", endsAt: "" }); refetchPromo(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crPromo && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إنشاء العرض
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Rule modal */}
      <Modal open={showRuleModal} onClose={() => setShowRuleModal(false)} title="قاعدة جديدة">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">اسم القاعدة *</label>
            <input value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">المحفّز (trigger) *</label>
            <input value={ruleForm.trigger} onChange={e => setRuleForm(p => ({ ...p, trigger: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="e.g. on_subscription_renewed" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">النطاق</label>
              <select value={ruleForm.scope} onChange={e => setRuleForm(p => ({ ...p, scope: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="global">عام</option>
                <option value="plan">باقة</option>
                <option value="org">منشأة</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ruleForm.isActive} onChange={e => setRuleForm(p => ({ ...p, isActive: e.target.checked }))} className="accent-brand-500" />
                <span className="text-sm text-gray-700">نشطة فوراً</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowRuleModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!ruleForm.name.trim() || !ruleForm.trigger.trim() || crRule}
              onClick={() => createRule({ name: ruleForm.name, trigger: ruleForm.trigger, scope: ruleForm.scope, isActive: ruleForm.isActive })
                .then(() => { setShowRuleModal(false); setRuleForm({ name: "", trigger: "", scope: "global", isActive: true }); refetchRules(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crRule && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إنشاء القاعدة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CommercialTab;
