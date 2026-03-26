import React, { useState } from "react";
import { Edit3, Save, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { PlanBadge, SectionHeader, Spinner } from "./shared";

function PlansTab() {
  const { data, loading, refetch } = useApi(() => adminApi.plans(), []);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const { mutate: savePlan, loading: saving } = useMutation(({ id, ...d }: any) => adminApi.updatePlan(id, d));

  const plans: any[] = data?.data || [];

  const startEdit = (p: any) => {
    setEditId(p.id);
    setEditForm({
      nameAr: p.nameAr, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly,
      trialDays: p.trialDays, maxUsers: p.maxUsers, maxLocations: p.maxLocations,
      features: Array.isArray(p.features) ? p.features.join("\n") : "",
    });
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <SectionHeader title="الباقات والأسعار" sub="تحكم كامل في التسعير والمميزات" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{plan.nameAr}</h3>
                  <PlanBadge plan={plan.id} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{plan.orgCount ?? 0} منشأة مشتركة</p>
              </div>
              <button onClick={() => editId === plan.id ? setEditId(null) : startEdit(plan)}
                className="text-xs text-brand-500 border border-brand-200 px-3 py-1 rounded-xl hover:bg-brand-50">
                {editId === plan.id ? "إلغاء" : <><Edit3 className="w-3 h-3 inline ml-1" />تعديل</>}
              </button>
            </div>

            {editId === plan.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">الاسم العربي</label>
                    <input value={editForm.nameAr} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">أيام التجربة</label>
                    <input type="number" value={editForm.trialDays} onChange={(e) => setEditForm({ ...editForm, trialDays: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">السعر الشهري (ر.س)</label>
                    <input type="number" value={editForm.priceMonthly} onChange={(e) => setEditForm({ ...editForm, priceMonthly: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">السعر السنوي (ر.س)</label>
                    <input type="number" value={editForm.priceYearly} onChange={(e) => setEditForm({ ...editForm, priceYearly: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">أقصى مستخدمين</label>
                    <input type="number" value={editForm.maxUsers} onChange={(e) => setEditForm({ ...editForm, maxUsers: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">أقصى فروع</label>
                    <input type="number" value={editForm.maxLocations} onChange={(e) => setEditForm({ ...editForm, maxLocations: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">المميزات (كل ميزة في سطر)</label>
                  <textarea value={editForm.features} onChange={(e) => setEditForm({ ...editForm, features: e.target.value })}
                    rows={4} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none resize-none" />
                </div>
                <button disabled={saving} onClick={async () => {
                  await savePlan({ id: plan.id, nameAr: editForm.nameAr, priceMonthly: parseFloat(editForm.priceMonthly), priceYearly: parseFloat(editForm.priceYearly), trialDays: parseInt(editForm.trialDays), maxUsers: parseInt(editForm.maxUsers), maxLocations: parseInt(editForm.maxLocations), features: editForm.features.split("\n").filter(Boolean) });
                  setEditId(null); refetch();
                }} className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ التغييرات
                </button>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                  {[
                    { label: "شهري", val: `${plan.priceMonthly} ر.س` },
                    { label: "سنوي", val: `${plan.priceYearly} ر.س` },
                    { label: "مستخدمون", val: plan.maxUsers >= 999 ? "غير محدود" : `حتى ${plan.maxUsers}` },
                    { label: "التجربة", val: `${plan.trialDays} يوم` },
                  ].map((i) => (
                    <div key={i.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 mb-1">{i.label}</p>
                      <p className="font-bold text-gray-800 text-sm">{i.val}</p>
                    </div>
                  ))}
                </div>
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {plan.features.map((f: string) => (
                      <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlansTab;
