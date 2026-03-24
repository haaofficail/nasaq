import { useState } from "react";
import { Zap, Bell, FileText, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { automationApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const tabs = ["القواعد", "القوالب", "سجل الإرسال"];

export function AutomationPage() {
  const [activeTab, setActiveTab] = useState(0);

  const { data: rulesRes, loading: rLoading } = useApi(() => automationApi.rules(), []);
  const { data: templatesRes, loading: tLoading } = useApi(() => automationApi.templates(), []);
  const { data: logsRes } = useApi(() => automationApi.logs(), []);

  const rules: any[] = rulesRes?.data || [];
  const templates: any[] = templatesRes?.data || [];
  const logs: any[] = logsRes?.data || [];

  const activeRules = rules.filter((r) => r.isActive).length;

  if (rLoading || tLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">الأتمتة</h1>
        <p className="text-sm text-gray-400 mt-0.5">قواعد الإرسال التلقائي والقوالب</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "قواعد نشطة", value: activeRules, color: "text-brand-600", bg: "bg-brand-50", icon: Zap },
          { label: "القوالب", value: templates.length, color: "text-violet-600", bg: "bg-violet-50", icon: Bell },
          { label: "رسائل مرسلة", value: logs.length, color: "text-emerald-600", bg: "bg-emerald-50", icon: FileText },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={clsx(
              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors",
              activeTab === i ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Rules tab */}
      {activeTab === 0 && (
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Zap className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد قواعد أتمتة</p>
            </div>
          ) : (
            rules.map((rule: any) => (
              <div key={rule.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">
                <div className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  rule.isActive ? "bg-emerald-50" : "bg-gray-100"
                )}>
                  <Zap className={clsx("w-4 h-4", rule.isActive ? "text-emerald-600" : "text-gray-300")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{rule.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {rule.event} ← {rule.actions?.length || 0} إجراء
                  </p>
                </div>
                <span className={clsx(
                  "px-2.5 py-1 rounded-full text-[10px] font-semibold",
                  rule.isActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-400"
                )}>
                  {rule.isActive ? "نشطة" : "معطلة"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates tab */}
      {activeTab === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Bell className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد قوالب</p>
            </div>
          ) : (
            templates.map((tpl: any) => (
              <div key={tpl.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-brand-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{tpl.name}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {tpl.channel} — {tpl.event}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Logs tab */}
      {activeTab === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا يوجد سجل إرسال</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">القالب</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">المستلم</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الحالة</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 50).map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-5 font-medium text-gray-900">{log.templateName || "—"}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs" dir="ltr">
                      {log.recipientPhone || log.recipientEmail || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        log.status === "sent"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-500"
                      )}>
                        {log.status === "sent" ? "مرسل" : "فشل"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("ar-SA") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
