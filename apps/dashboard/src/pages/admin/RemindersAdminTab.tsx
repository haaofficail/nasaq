import React, { useState } from "react";
import { Bell, AlertTriangle, Plus, BookOpen, Activity, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { fmtDate } from "@/lib/utils";
import { SectionHeader, Spinner, Empty, TabPill, Modal } from "./shared";

function RemindersAdminTab() {
  const [subTab, setSubTab] = useState("all");
  const [showTplModal, setShowTplModal] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", description: "", defaultDaysOffset: "30", defaultPriority: "medium", categoryId: "" });
  const { data: allRes,  loading: aLoading, refetch: refetchAll }     = useApi(() => adminApi.allReminders(), []);
  const { data: catRes                                               } = useApi(() => adminApi.reminderCategories(), []);
  const { data: tplRes,  loading: tLoading, refetch: refetchTpl    } = useApi(() => adminApi.reminderTemplates(), []);
  const { mutate: createTpl, loading: crTpl } = useMutation((d: any) => adminApi.createReminderTpl(d));
  const { mutate: deleteTpl                 } = useMutation((id: string) => adminApi.deleteReminderTpl(id));

  const all: any[]  = allRes?.data  || [];
  const cats: any[] = catRes?.data  || [];
  const tpls: any[] = tplRes?.data  || [];

  const overdueCount  = all.filter(r => r.status === "active" && new Date(r.dueDate) < new Date()).length;
  const activeCount   = all.filter(r => r.status === "active").length;

  const handleCreateTpl = async () => {
    await createTpl({ ...tplForm, defaultDaysOffset: Number(tplForm.defaultDaysOffset) });
    setShowTplModal(false);
    setTplForm({ name: "", description: "", defaultDaysOffset: "30", defaultPriority: "medium", categoryId: "" });
    refetchTpl();
  };

  const PRIORITY_COLORS: Record<string, string> = {
    low: "bg-gray-100 text-gray-600", medium: "bg-blue-50 text-blue-700",
    high: "bg-amber-50 text-amber-700", urgent: "bg-red-50 text-red-600",
  };
  const PRIORITY_LABELS: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية", urgent: "عاجلة" };

  return (
    <div className="space-y-6">
      <SectionHeader title="التذكيرات" sub="إدارة تذكيرات جميع المنشآت والقوالب والتصنيفات" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "إجمالي التذكيرات", value: all.length,  color: "text-brand-600",   bg: "bg-brand-50",   icon: Bell },
          { label: "نشطة",            value: activeCount,  color: "text-blue-700",    bg: "bg-blue-50",    icon: Activity },
          { label: "متأخرة",          value: overdueCount, color: "text-red-600",     bg: "bg-red-50",     icon: AlertTriangle },
          { label: "قوالب النظام",    value: tpls.length,  color: "text-purple-700",  bg: "bg-purple-50",  icon: BookOpen },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <TabPill
        tabs={[{ id: "all", label: "كل التذكيرات" }, { id: "templates", label: "القوالب" }, { id: "categories", label: "التصنيفات" }]}
        active={subTab} onChange={setSubTab}
      />

      {subTab === "all" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {aLoading ? <Spinner /> : all.length === 0 ? <Empty icon={Bell} text="لا توجد تذكيرات" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">العنوان</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المنشأة</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الأولوية</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الموعد</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {all.map((r: any) => {
                  const overdue = r.status === "active" && new Date(r.dueDate) < new Date();
                  return (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-medium text-gray-900">{r.title}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{r.orgName}</td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold", PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium)}>
                          {PRIORITY_LABELS[r.priority] || r.priority}
                        </span>
                      </td>
                      <td className={clsx("py-3 px-4 text-xs tabular-nums", overdue ? "text-red-600 font-semibold" : "text-gray-400")}>
                        {r.dueDate ? fmtDate(r.dueDate) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          r.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                          overdue ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
                        )}>
                          {r.status === "completed" ? "مكتملة" : overdue ? "متأخرة" : "نشطة"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowTplModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> قالب جديد
            </button>
          </div>
          {tLoading ? <Spinner /> : tpls.length === 0 ? <Empty icon={BookOpen} text="لا توجد قوالب" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tpls.map((t: any) => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    {t.isSystem && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 font-medium shrink-0">نظام</span>}
                  </div>
                  {t.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{t.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{t.defaultDaysOffset} يوم قبل</span>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold", PRIORITY_COLORS[t.defaultPriority] || PRIORITY_COLORS.medium)}>
                      {PRIORITY_LABELS[t.defaultPriority] || t.defaultPriority}
                    </span>
                  </div>
                  {!t.isSystem && (
                    <button onClick={() => deleteTpl(t.id).then(() => refetchTpl())} className="mt-3 text-xs text-red-500 hover:underline">حذف</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "categories" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cats.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${c.color || "#5b9bd5"}20` }}>
                {c.icon || "📋"}
              </div>
              <p className="text-sm font-medium text-gray-800">{c.name}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={showTplModal} onClose={() => setShowTplModal(false)} title="قالب تذكير جديد">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">اسم القالب *</label>
            <input value={tplForm.name} onChange={e => setTplForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="مثال: تجديد السجل التجاري" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">الوصف</label>
            <textarea value={tplForm.description} onChange={e => setTplForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none" placeholder="وصف مختصر..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">عدد الأيام قبل</label>
              <input type="number" value={tplForm.defaultDaysOffset} onChange={e => setTplForm(p => ({ ...p, defaultDaysOffset: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الأولوية</label>
              <select value={tplForm.defaultPriority} onChange={e => setTplForm(p => ({ ...p, defaultPriority: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">التصنيف</label>
            <select value={tplForm.categoryId} onChange={e => setTplForm(p => ({ ...p, categoryId: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
              <option value="">— بدون تصنيف —</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowTplModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button onClick={handleCreateTpl} disabled={!tplForm.name.trim() || crTpl} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crTpl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              إضافة القالب
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default RemindersAdminTab;
