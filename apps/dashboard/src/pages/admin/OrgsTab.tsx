import React, { useState } from "react";
import {
  CheckCheck, AlertTriangle, ChevronRight, RefreshCw, Plus, Search,
  Loader2, Save, LogIn, ToggleLeft, ToggleRight, Users, MapPin,
  Phone, Mail, UserCheck, Package, CreditCard, KeyRound, Trash2, Building2,
} from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { SAUDI_CITIES, ADDONS, PLANS, ADDON_MAP, PLAN_MAP } from "@/lib/constants";
import { useApi, useMutation } from "@/hooks/useApi";
import {
  BUSINESS_TYPES, ALL_CAPABILITIES,
  StatusBadge, PlanBadge, RoleBadge, Spinner, Empty, SectionHeader, Modal, InfoRow, TabPill,
} from "./shared";

// ────────────────────────────────────────────────────────────
// OrgDetail — tabbed detail view
// ────────────────────────────────────────────────────────────

function OrgDetail({ org, onBack }: { org: any; onBack: () => void }) {
  const [tab, setTab] = useState("summary");
  const { data: detailData, refetch: refetchDetail } = useApi(() => adminApi.getOrg(org.id), [org.id]);
  const { data: capData, refetch: refetchCap } = useApi(() => adminApi.getOrgCapabilities(org.id), [org.id]);
  const { data: usersData } = useApi(() => adminApi.getOrgUsers(org.id), [org.id]);
  const { data: staffData } = useApi(() => adminApi.staff(), []);
  const detail = detailData?.data;
  const cap = capData?.data;
  const orgUsers: any[] = usersData?.data || [];
  const staffList: any[] = (staffData?.data || []).filter((s: any) => s.nasaqRole === "account_manager" || s.isSuperAdmin);

  const [activeCaps, setActiveCaps] = useState<string[] | null>(null);
  const [planForm, setPlanForm] = useState({ plan: "", subscriptionStatus: "", trialEndsAt: "", subscriptionEndsAt: "" });
  const [showPlanEdit, setShowPlanEdit] = useState(false);
  const [capEditing, setCapEditing] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [notesVal, setNotesVal] = useState("");
  const [notesEditing, setNotesEditing] = useState(false);

  const { mutate: changePlan, loading: changingPlan } = useMutation((d: any) => adminApi.changePlan(org.id, d));
  const { mutate: setCaps, loading: settingCaps } = useMutation((cs: string[]) => adminApi.setOrgCapabilities(org.id, cs));
  const { mutate: verify } = useMutation(() => adminApi.verifyOrg(org.id));
  const { mutate: suspend } = useMutation((r: string) => adminApi.suspendOrg(org.id, r));
  const { mutate: unsuspend } = useMutation(() => adminApi.unsuspendOrg(org.id));
  const { mutate: impersonate } = useMutation(() => adminApi.impersonate(org.id));
  const { mutate: saveNotes } = useMutation((n: string) => adminApi.updateOrg(org.id, { adminNotes: n }));
  const { mutate: setManager } = useMutation((mid: string | null) => adminApi.setOrgManager(org.id, mid));

  const currentCaps: string[] = activeCaps ?? (cap?.enabledCapabilities ?? []);

  const handleImpersonate = async () => {
    const res: any = await impersonate(org.id);
    if (!res?.data) return;
    localStorage.setItem("nasaq_impersonate_original_token", localStorage.getItem("nasaq_token") || "");
    localStorage.setItem("nasaq_token", res.data.token);
    localStorage.setItem("nasaq_org_id", res.data.org.id);
    localStorage.setItem("nasaq_user_id", res.data.user.id);
    localStorage.setItem("nasaq_user", JSON.stringify({ ...res.data.user, isSuperAdmin: false, isImpersonating: true, impersonateOrgName: res.data.org.name }));
    window.location.href = "/dashboard";
  };

  const tabs = [
    { id: "summary", label: "الملخص" },
    { id: "plan", label: "الباقة" },
    { id: "capabilities", label: "الصلاحيات" },
    { id: "users", label: `الفريق (${orgUsers.length})` },
    { id: "manager", label: "مدير الحساب" },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium">
        <ChevronRight className="w-4 h-4" /> العودة لقائمة المنشآت
      </button>

      {!detail ? <Spinner /> : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xl shrink-0">
                  {detail.name?.[0] || "م"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">{detail.name}</h2>
                    {detail.isVerified && <CheckCheck className="w-4 h-4 text-emerald-500" aria-label="موثقة" />}
                    {detail.suspendedAt && <AlertTriangle className="w-4 h-4 text-red-500" aria-label="موقوفة" />}
                    <StatusBadge status={detail.subscriptionStatus} />
                    <PlanBadge plan={detail.plan} />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{detail.slug} · {BUSINESS_TYPES[detail.businessType] || detail.businessType}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!detail.isVerified && (
                  <button onClick={async () => { await verify(undefined); refetchDetail(); }}
                    className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-1.5 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" /> توثيق
                  </button>
                )}
                <button onClick={handleImpersonate}
                  className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-xl hover:bg-brand-600 flex items-center gap-1.5 font-medium">
                  <LogIn className="w-3.5 h-3.5" /> دخول كمالك
                </button>
                {!detail.suspendedAt ? (
                  <button onClick={() => setSuspendModal(true)}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 font-medium">
                    إيقاف
                  </button>
                ) : (
                  <button onClick={async () => { await unsuspend(undefined); refetchDetail(); }}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium">
                    رفع الإيقاف
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { label: "المستخدمون", value: detail.userCount ?? "—", icon: Users },
                { label: "المدينة", value: detail.city || "—", icon: MapPin },
                { label: "الهاتف", value: detail.phone || "—", icon: Phone },
                { label: "البريد", value: detail.email || "—", icon: Mail },
              ].map((i) => (
                <div key={i.label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                  <i.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">{i.label}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{i.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <TabPill tabs={tabs} active={tab} onChange={setTab} />

            {tab === "summary" && (
              <div>
                <InfoRow label="نوع النشاط" value={BUSINESS_TYPES[detail.businessType] || detail.businessType} />
                <InfoRow label="الـ Slug" value={<span className="font-mono text-xs">{detail.slug}</span>} />
                <InfoRow label="تاريخ الإنشاء" value={detail.createdAt ? new Date(detail.createdAt).toLocaleDateString("ar") : "—"} />
                <InfoRow label="نهاية التجربة" value={detail.trialEndsAt ? new Date(detail.trialEndsAt).toLocaleDateString("ar") : "—"} />
                <InfoRow label="نهاية الاشتراك" value={detail.subscriptionEndsAt ? new Date(detail.subscriptionEndsAt).toLocaleDateString("ar") : "—"} />
                <InfoRow label="موثقة" value={detail.isVerified ? <span className="text-emerald-600">نعم</span> : "لا"} />
                {detail.suspendedAt && <InfoRow label="سبب الإيقاف" value={<span className="text-red-600">{detail.suspendReason || "لم يذكر"}</span>} />}
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 font-medium">ملاحظات الإدارة</p>
                    <button onClick={() => { setNotesEditing(!notesEditing); setNotesVal(detail.adminNotes || ""); }}
                      className="text-xs text-brand-500 hover:text-brand-600">
                      {notesEditing ? "إلغاء" : "تعديل"}
                    </button>
                  </div>
                  {notesEditing ? (
                    <div className="space-y-2">
                      <textarea value={notesVal} onChange={(e) => setNotesVal(e.target.value)}
                        rows={3} className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none" />
                      <button onClick={async () => { await saveNotes(notesVal); setNotesEditing(false); refetchDetail(); }}
                        className="px-4 py-1.5 bg-brand-500 text-white text-xs rounded-xl hover:bg-brand-600 font-medium">
                        حفظ
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{detail.adminNotes || "لا توجد ملاحظات"}</p>
                  )}
                </div>
              </div>
            )}

            {tab === "plan" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">الباقة الحالية</p>
                    <PlanBadge plan={detail.plan} />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">حالة الاشتراك</p>
                    <StatusBadge status={detail.subscriptionStatus} />
                  </div>
                </div>
                {!showPlanEdit ? (
                  <button onClick={() => { setShowPlanEdit(true); setPlanForm({ plan: detail.plan, subscriptionStatus: detail.subscriptionStatus, trialEndsAt: "", subscriptionEndsAt: "" }); }}
                    className="w-full py-2.5 border border-brand-200 text-brand-600 rounded-xl text-sm hover:bg-brand-50 font-medium transition-colors">
                    تعديل الباقة والاشتراك
                  </button>
                ) : (
                  <div className="space-y-3 border border-gray-100 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">الباقة</label>
                        <select value={planForm.plan} onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none">
                          <option value="basic">الأساسي</option>
                          <option value="advanced">المتقدم</option>
                          <option value="pro">الاحترافي</option>
                          <option value="enterprise">المؤسسي</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">حالة الاشتراك</label>
                        <select value={planForm.subscriptionStatus} onChange={(e) => setPlanForm({ ...planForm, subscriptionStatus: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none">
                          <option value="trialing">تجربة</option>
                          <option value="active">نشط</option>
                          <option value="past_due">متأخر</option>
                          <option value="cancelled">ملغي</option>
                          <option value="suspended">موقوف</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">نهاية التجربة</label>
                        <input type="date" value={planForm.trialEndsAt} onChange={(e) => setPlanForm({ ...planForm, trialEndsAt: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">نهاية الاشتراك</label>
                        <input type="date" value={planForm.subscriptionEndsAt} onChange={(e) => setPlanForm({ ...planForm, subscriptionEndsAt: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowPlanEdit(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">إلغاء</button>
                      <button disabled={changingPlan} onClick={async () => {
                        const p: any = {};
                        if (planForm.plan) p.plan = planForm.plan;
                        if (planForm.subscriptionStatus) p.subscriptionStatus = planForm.subscriptionStatus;
                        if (planForm.trialEndsAt) p.trialEndsAt = planForm.trialEndsAt;
                        if (planForm.subscriptionEndsAt) p.subscriptionEndsAt = planForm.subscriptionEndsAt;
                        await changePlan(p); setShowPlanEdit(false); refetchDetail();
                      }} className="flex-1 py-2 bg-brand-500 text-white rounded-xl text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium">
                        {changingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} حفظ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "capabilities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">الوحدات المفعّلة: <strong className="text-gray-800">{currentCaps.length}</strong> / {ALL_CAPABILITIES.length}</p>
                  <div className="flex gap-2">
                    {capEditing && (
                      <button onClick={async () => { await setCaps(currentCaps); setCapEditing(false); refetchCap(); setActiveCaps(null); }}
                        disabled={settingCaps} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded-xl hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1 font-medium">
                        {settingCaps ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} حفظ
                      </button>
                    )}
                    <button onClick={() => { setCapEditing(!capEditing); setActiveCaps(null); }}
                      className="px-3 py-1.5 text-xs text-brand-500 border border-brand-200 rounded-xl hover:bg-brand-50">
                      {capEditing ? "إلغاء" : "تعديل"}
                    </button>
                  </div>
                </div>
                {Object.entries(
                  ALL_CAPABILITIES.reduce<Record<string, typeof ALL_CAPABILITIES>>((acc, c) => { (acc[c.group] = acc[c.group] || []).push(c); return acc; }, {})
                ).map(([group, caps]) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {caps.map((c) => {
                        const enabled = currentCaps.includes(c.key);
                        return (
                          <button key={c.key} onClick={() => {
                            if (!capEditing) return;
                            const base = activeCaps ?? (cap?.enabledCapabilities ?? []);
                            setActiveCaps(enabled ? base.filter((k: string) => k !== c.key) : [...base, c.key]);
                          }}
                            className={clsx("flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-right transition-all",
                              enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-100 bg-gray-50 text-gray-400",
                              capEditing ? "cursor-pointer hover:opacity-80" : "cursor-default"
                            )}>
                            {enabled ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <ToggleLeft className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "users" && (
              <div className="space-y-2">
                {orgUsers.length === 0 ? <Empty icon={Users} text="لا يوجد مستخدمون" /> : orgUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                      {u.name?.[0] || "م"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.phone || u.email || "—"}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{u.type}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "manager" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">اختر مدير حساب من فريق نسق لمتابعة هذه المنشأة.</p>
                {detail.accountManagerId ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {staffList.find((s: any) => s.id === detail.accountManagerId)?.name || "مدير الحساب"}
                      </p>
                      <p className="text-xs text-gray-400">مدير الحساب الحالي</p>
                    </div>
                    <button onClick={async () => { await setManager(null); refetchDetail(); }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium">إلغاء التعيين</button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 text-center">
                    لم يتم تعيين مدير حساب لهذه المنشأة
                  </div>
                )}
                {staffList.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 font-medium">فريق نسق المتاح</p>
                    {staffList.map((s: any) => (
                      <div key={s.id} className={clsx("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        detail.accountManagerId === s.id ? "border-brand-200 bg-brand-50" : "border-gray-100 hover:bg-gray-50"
                      )} onClick={async () => { await setManager(s.id); refetchDetail(); }}>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">{s.name?.[0]}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.phone || s.email || "—"}</p>
                        </div>
                        <RoleBadge role={s.isSuperAdmin ? "super_admin" : s.nasaqRole} />
                        <span className="text-xs text-gray-400">{s.assignedOrgs || 0} منشأة</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={suspendModal} onClose={() => setSuspendModal(false)} title={`إيقاف: ${org.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">سيتم تقييد وصول المنشأة فوراً. أدخل سبب الإيقاف.</p>
          <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="سبب الإيقاف..." rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none" />
          <div className="flex gap-3">
            <button onClick={() => setSuspendModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">إلغاء</button>
            <button onClick={async () => { await suspend(suspendReason); setSuspendModal(false); onBack(); }}
              className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 font-medium">
              تأكيد الإيقاف
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// OrgsTab
// ────────────────────────────────────────────────────────────

function OrgsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", nameEn: "", businessType: "general", plan: "basic",
    phone: "", email: "", city: "", ownerName: "", ownerPhone: "", ownerEmail: "", ownerPassword: "",
  });
  const [resetPwModal, setResetPwModal] = useState<{ orgId: string; orgName: string } | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [credentialsModal, setCredentialsModal] = useState<{ phone: string | null; email: string | null; password: string } | null>(null);
  const [planModal, setPlanModal] = useState<{ orgId: string; orgName: string; currentPlan: string; currentStatus: string } | null>(null);
  const [planForm, setPlanForm] = useState({ plan: "", subscriptionStatus: "", subscriptionEndsAt: "" });
  const [renewModal, setRenewModal] = useState<{ orgId: string; orgName: string; plan: string; subscriptionEndsAt: string | null } | null>(null);
  const [addonsModal, setAddonsModal] = useState<{ orgId: string; orgName: string } | null>(null);
  const { mutate: changePlan, loading: changingPlan } = useMutation((d: any) => adminApi.changePlan(d.orgId, d.data));
  const { mutate: renewSub, loading: renewing } = useMutation((d: any) => adminApi.changePlan(d.orgId, d.data));
  const { data: addonsData, refetch: refetchAddons } = useApi(
    () => addonsModal ? adminApi.getOrgAddons(addonsModal.orgId) : Promise.resolve(null),
    [addonsModal?.orgId]
  );
  const { mutate: addAddon, loading: addingAddon } = useMutation((d: any) => adminApi.addOrgAddon(d.orgId, d.data));
  const { mutate: removeAddon } = useMutation((d: any) => adminApi.removeOrgAddon(d.orgId, d.addonId));
  const [newAddonKey, setNewAddonKey] = useState("");

  const { data, loading, refetch } = useApi(
    () => adminApi.orgs({
      q: search || undefined,
      status: statusFilter || undefined,
      plan: planFilter || undefined,
      businessType: typeFilter || undefined,
      page,
    }),
    [search, statusFilter, planFilter, typeFilter, page]
  );
  const { mutate: createOrg, loading: creating } = useMutation((d: any) => adminApi.createOrg(d));

  const orgs: any[] = data?.data || [];
  const pagination = data?.pagination;

  if (selectedOrg) return <OrgDetail org={selectedOrg} onBack={() => { setSelectedOrg(null); refetch(); }} />;

  return (
    <div className="space-y-5">
      <SectionHeader title="إدارة المنشآت" sub={`${data?.pagination?.total ?? 0} منشأة مسجلة`}
        action={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-4 h-4" /> منشأة جديدة
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو الـ slug..."
            className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="trialing">تجربة</option>
          <option value="past_due">متأخر</option>
          <option value="suspended">موقوف</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الباقات</option>
          <option value="basic">الأساسي</option>
          <option value="advanced">المتقدم</option>
          <option value="pro">الاحترافي</option>
          <option value="enterprise">المؤسسي</option>
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الأنواع</option>
          {Object.entries(BUSINESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : orgs.length === 0 ? <Empty icon={Building2} text="لا توجد منشآت" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">النوع</th>
                <th className="text-right px-4 py-3 font-semibold">الباقة</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">ينتهي في</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">تاريخ الإنشاء</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org: any) => (
                <tr key={org.id} onClick={() => setSelectedOrg(org)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                        {org.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{org.name}</span>
                          {org.isVerified && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                          {org.suspendedAt && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                    {BUSINESS_TYPES[org.businessType] || org.businessType}
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={org.plan} /></td>
                  <td className="px-4 py-3"><StatusBadge status={org.subscriptionStatus} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                    {org.subscriptionEndsAt
                      ? (() => {
                          const d = Math.ceil((new Date(org.subscriptionEndsAt).getTime() - Date.now()) / 86400000);
                          return (
                            <span className={d <= 7 ? "text-red-500 font-medium" : d <= 30 ? "text-amber-500 font-medium" : "text-gray-500"}>
                              {d > 0 ? `${d} يوم` : "منتهي"}
                            </span>
                          );
                        })()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {org.createdAt ? new Date(org.createdAt).toLocaleDateString("ar") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setAddonsModal({ orgId: org.id, orgName: org.name }); }}
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                        title="إدارة الإضافات"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRenewModal({ orgId: org.id, orgName: org.name, plan: org.plan, subscriptionEndsAt: org.subscriptionEndsAt || null })}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                        title="تجديد الاشتراك"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setPlanModal({ orgId: org.id, orgName: org.name, currentPlan: org.plan, currentStatus: org.subscriptionStatus });
                          setPlanForm({ plan: org.plan, subscriptionStatus: org.subscriptionStatus, subscriptionEndsAt: org.subscriptionEndsAt ? new Date(org.subscriptionEndsAt).toISOString().split("T")[0] : "" });
                        }}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                        title="تغيير الباقة"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setResetPwModal({ orgId: org.id, orgName: org.name }); setResetPw(""); }}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                        title="إعادة تعيين كلمة المرور"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{pagination.total} منشأة · صفحة {page} من {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
              السابق
            </button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
              التالي
            </button>
          </div>
        </div>
      )}

      {resetPwModal && (
        <Modal open onClose={() => setResetPwModal(null)} title={`إعادة تعيين كلمة المرور — ${resetPwModal.orgName}`} width="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">كلمة المرور الجديدة</label>
              <input
                type="text"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="أدخل كلمة المرور"
                dir="ltr"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                setResetPw(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
              }}
              className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              توليد كلمة مرور عشوائية
            </button>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setResetPwModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button
                disabled={!resetPw || resetPw.length < 6}
                onClick={async () => {
                  try {
                    await adminApi.resetOrgPassword(resetPwModal.orgId, { password: resetPw });
                    setResetPwModal(null);
                    setResetPw("");
                  } catch {
                    alert("فشل إعادة تعيين كلمة المرور");
                  }
                }}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                حفظ
              </button>
            </div>
          </div>
        </Modal>
      )}

      {renewModal && (
        <Modal open onClose={() => setRenewModal(null)} title={`تجديد اشتراك — ${renewModal.orgName}`} width="max-w-sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">الباقة</span>
                <span className="font-semibold text-gray-800"><PlanBadge plan={renewModal.plan} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">السعر</span>
                <span className="font-semibold text-gray-800">
                  {PLAN_MAP[renewModal.plan]?.price ? `${PLAN_MAP[renewModal.plan].price} ر.س / سنة` : "حسب الطلب"}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-500">تمديد حتى</span>
                <span className="font-semibold text-emerald-700 font-mono">
                  {new Date((renewModal.subscriptionEndsAt ? Math.max(new Date(renewModal.subscriptionEndsAt).getTime(), Date.now()) : Date.now()) + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("ar")}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setRenewModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button
                disabled={renewing}
                onClick={async () => {
                  const base = renewModal.subscriptionEndsAt ? Math.max(new Date(renewModal.subscriptionEndsAt).getTime(), Date.now()) : Date.now();
                  const newEnd = new Date(base + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  await renewSub({ orgId: renewModal.orgId, data: { subscriptionStatus: "active", subscriptionEndsAt: newEnd } });
                  setRenewModal(null);
                  refetch();
                }}
                className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                تجديد سنة
              </button>
            </div>
          </div>
        </Modal>
      )}

      {credentialsModal && (
        <Modal open onClose={() => setCredentialsModal(null)} title="تم إنشاء المنشأة — بيانات دخول المالك" width="max-w-sm">
          <div className="space-y-3">
            <p className="text-xs text-gray-500">احتفظ بهذه البيانات — لن تظهر مجدداً</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 font-mono text-sm">
              {credentialsModal.email && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-sans text-xs">الإيميل</span>
                  <span className="text-gray-900 select-all">{credentialsModal.email}</span>
                </div>
              )}
              {credentialsModal.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-sans text-xs">الجوال</span>
                  <span className="text-gray-900 select-all" dir="ltr">{credentialsModal.phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-400 font-sans text-xs">كلمة المرور</span>
                <span className="text-brand-600 font-bold select-all" dir="ltr">{credentialsModal.password}</span>
              </div>
            </div>
            <button onClick={() => setCredentialsModal(null)}
              className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
              فهمت — إغلاق
            </button>
          </div>
        </Modal>
      )}

      {planModal && (
        <Modal open onClose={() => setPlanModal(null)} title={`تغيير الباقة — ${planModal.orgName}`} width="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">الباقة</label>
              <select value={planForm.plan} onChange={e => setPlanForm(p => ({ ...p, plan: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 bg-white">
                {PLANS.map(p => <option key={p.key} value={p.key}>{p.name} — {p.price > 0 ? `${p.price} ر.س` : "حسب الطلب"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">الحالة</label>
              <select value={planForm.subscriptionStatus} onChange={e => setPlanForm(p => ({ ...p, subscriptionStatus: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 bg-white">
                <option value="trialing">تجربة</option>
                <option value="active">نشط</option>
                <option value="past_due">متأخر</option>
                <option value="cancelled">ملغي</option>
                <option value="suspended">موقوف</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">تاريخ الانتهاء</label>
              <input type="date" value={planForm.subscriptionEndsAt}
                onChange={e => setPlanForm(p => ({ ...p, subscriptionEndsAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setPlanModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button
                disabled={changingPlan}
                onClick={async () => {
                  await changePlan({ orgId: planModal.orgId, data: {
                    plan: planForm.plan || undefined,
                    subscriptionStatus: planForm.subscriptionStatus || undefined,
                    subscriptionEndsAt: planForm.subscriptionEndsAt || undefined,
                  }});
                  setPlanModal(null);
                  refetch();
                }}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingPlan && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ
              </button>
            </div>
          </div>
        </Modal>
      )}

      {addonsModal && (
        <Modal open onClose={() => setAddonsModal(null)} title={`إدارة الإضافات — ${addonsModal.orgName}`} width="max-w-md">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">الإضافات المفعّلة</p>
              {(addonsData?.data ?? []).filter((a: any) => a.isActive).length === 0 ? (
                <p className="text-xs text-gray-400 py-2">لا توجد إضافات مفعّلة</p>
              ) : (
                <div className="space-y-1.5">
                  {(addonsData?.data ?? []).filter((a: any) => a.isActive).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-700">{a.addonName}</span>
                      <button
                        onClick={async () => {
                          await removeAddon({ orgId: addonsModal.orgId, addonId: a.id });
                          refetchAddons();
                        }}
                        className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">إضافة جديدة</p>
              <div className="flex gap-2">
                <select value={newAddonKey} onChange={e => setNewAddonKey(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white">
                  <option value="">اختر الإضافة</option>
                  {ADDONS.map(a => <option key={a.key} value={a.key}>{a.name}</option>)}
                </select>
                <button
                  disabled={!newAddonKey || addingAddon}
                  onClick={async () => {
                    if (!newAddonKey) return;
                    const addon = ADDON_MAP[newAddonKey];
                    await addAddon({ orgId: addonsModal.orgId, data: { addonKey: newAddonKey, addonName: addon?.name ?? newAddonKey, price: addon?.price ?? 0 }});
                    setNewAddonKey("");
                    refetchAddons();
                  }}
                  className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addingAddon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إضافة
                </button>
              </div>
            </div>
            <button onClick={() => setAddonsModal(null)}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              إغلاق
            </button>
          </div>
        </Modal>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="منشأة جديدة" width="max-w-xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">اسم المنشأة *</label>
              <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="مثال: صالون نور" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">الاسم بالإنجليزي (slug)</label>
              <input value={createForm.nameEn} onChange={(e) => setCreateForm({ ...createForm, nameEn: e.target.value })}
                placeholder="salon-noor" dir="ltr" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">المدينة</label>
              <select value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 bg-white">
                <option value="">— اختر المدينة —</option>
                {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">نوع النشاط</label>
              <select value={createForm.businessType} onChange={(e) => setCreateForm({ ...createForm, businessType: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400">
                {Object.entries(BUSINESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">الباقة</label>
              <select value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400">
                <option value="basic">الأساسي — 199 ر.س</option>
                <option value="advanced">المتقدم — 499 ر.س</option>
                <option value="pro">الاحترافي — 999 ر.س</option>
                <option value="enterprise">المؤسسي — حسب الطلب</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">الجوال</label>
              <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="05XXXXXXXX" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">البريد الإلكتروني</label>
              <input value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="info@company.com" dir="ltr" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">بيانات المالك (اختياري — لتفعيل الدخول فوراً)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">اسم المالك</label>
                <input value={createForm.ownerName} onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                  placeholder="أحمد محمد" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">جوال المالك</label>
                <input value={createForm.ownerPhone} onChange={(e) => setCreateForm({ ...createForm, ownerPhone: e.target.value })}
                  placeholder="05XXXXXXXX" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">إيميل المالك <span className="text-brand-500 font-medium">(للدخول)</span></label>
                <input type="email" value={createForm.ownerEmail} onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                  placeholder="owner@company.com" dir="ltr"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">كلمة المرور</label>
                <input type="password" value={createForm.ownerPassword} onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                  placeholder="سيتم إنشاء كلمة مرور تلقائية إذا تُرك فارغاً" dir="ltr"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
            <button disabled={creating || !createForm.name} onClick={async () => {
              const res: any = await createOrg(createForm);
              setShowCreate(false);
              setCreateForm({ name: "", nameEn: "", businessType: "general", plan: "basic", phone: "", email: "", city: "", ownerName: "", ownerPhone: "", ownerEmail: "", ownerPassword: "" });
              refetch();
              if (res?.ownerCredentials) setCredentialsModal(res.ownerCredentials);
            }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إنشاء المنشأة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default OrgsTab;
