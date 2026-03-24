import { useState } from "react";
import { Globe, FileText, Palette, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { websiteApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const tabs = ["الصفحات", "المدونة", "إعدادات الموقع"];

export function SiteBuilderPage() {
  const [activeTab, setActiveTab] = useState(0);

  const { data: pagesRes, loading: pgLoading } = useApi(() => websiteApi.pages(), []);
  const { data: blogRes, loading: blLoading } = useApi(() => websiteApi.blog(), []);
  const { data: configRes } = useApi(() => websiteApi.config(), []);

  const pages: any[] = pagesRes?.data || [];
  const posts: any[] = blogRes?.data || [];
  const config: any = configRes?.data || {};

  if (pgLoading || blLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">منشئ الموقع</h1>
        <p className="text-sm text-gray-400 mt-0.5">الصفحات والمدونة وإعدادات الموقع</p>
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

      {/* Pages */}
      {activeTab === 0 && (
        <div className="space-y-3">
          {pages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <FileText className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد صفحات — أنشئ أول صفحة</p>
            </div>
          ) : (
            pages.map((p: any) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">/{p.slug}</p>
                </div>
                <span className={clsx(
                  "px-2.5 py-1 rounded-full text-[10px] font-semibold",
                  p.isPublished
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-400"
                )}>
                  {p.isPublished ? "منشورة" : "مسودة"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Blog */}
      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {posts.length === 0 ? (
            <div className="p-10 text-center">
              <Globe className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد مقالات</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">العنوان</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الحالة</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">المشاهدات</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-5 font-medium text-gray-900">{p.title}</td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        p.status === "published"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-400"
                      )}>
                        {p.status === "published" ? "منشور" : "مسودة"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 tabular-nums">{p.views || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Site config */}
      {activeTab === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-900">الهوية البصرية</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">اللون الأساسي</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full border border-gray-200"
                  style={{ background: config.primaryColor || "#1A56DB" }}
                />
                <span className="text-sm font-mono font-medium text-gray-700">
                  {config.primaryColor || "#1A56DB"}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">القالب</p>
              <p className="text-sm font-medium text-gray-700">{config.templateId || "default"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">النطاق المخصص</p>
              <p className="text-sm font-medium text-gray-700">{config.customDomain || "غير محدد"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
