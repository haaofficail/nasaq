import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

type Tab = "general" | "phases" | "logs" | "costs" | "payments" | "change_orders";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "عام" },
  { id: "phases", label: "المراحل" },
  { id: "logs", label: "السجل اليومي" },
  { id: "costs", label: "التكاليف" },
  { id: "payments", label: "المستخلصات" },
  { id: "change_orders", label: "أوامر التغيير" },
];

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: "#5b9bd5" }}
      />
    </div>
  );
}

function GeneralTab({ project }: { project: any }) {
  const budget = Number(project?.budget ?? 0);
  const actual = Number(project?.actualCost ?? 0);
  const progress = Number(project?.progressPercent ?? 0);
  const overrun = actual > budget;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{progress}%</div>
          <div className="text-xs text-blue-600 mt-1">نسبة الإنجاز</div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <div className="text-lg font-bold text-emerald-700">{budget.toLocaleString("en-US")}</div>
          <div className="text-xs text-emerald-600 mt-1">الميزانية (ر.س)</div>
        </div>
        <div className={`${overrun ? "bg-red-50" : "bg-gray-50"} rounded-2xl p-4 text-center`}>
          <div className={`text-lg font-bold ${overrun ? "text-red-700" : "text-gray-700"}`}>
            {actual.toLocaleString("en-US")}
          </div>
          <div className="text-xs text-gray-500 mt-1">الفعلي (ر.س)</div>
        </div>
        <div className="bg-violet-50 rounded-2xl p-4 text-center">
          <div className="text-sm font-bold text-violet-700">
            {project?.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString("ar-SA") : "—"}
          </div>
          <div className="text-xs text-violet-600 mt-1">التاريخ المتوقع</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">نسبة الإنجاز</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">الميزانية مقابل الفعلي</span>
          <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${overrun ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            {overrun ? "تجاوز الميزانية" : "ضمن الميزانية"}
          </span>
        </div>
        <ProgressBar value={budget > 0 ? (actual / budget) * 100 : 0} />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>{budget.toLocaleString("en-US")} ر.س</span>
        </div>
      </div>
    </div>
  );
}

function PhasesTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error, refetch } = useApi(
    () => propertyApi.construction.phases(constructionId),
    [constructionId]
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const phases: any[] = (data as any)?.data ?? [];

  async function updateProgress(phaseId: string, progress: number) {
    setUpdatingId(phaseId);
    try {
      await propertyApi.construction.updatePhase(constructionId, phaseId, { progressPercent: progress });
      toast.success("تم تحديث المرحلة");
      refetch();
    } catch (e: any) {
      toast.error(`فشل التحديث: ${e.message}`);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <SkeletonRows rows={5} />;
  if (error) return <div className="text-red-600 bg-red-50 rounded-xl p-4">{error}</div>;
  if (phases.length === 0) return <div className="text-center py-12 text-gray-400">لا توجد مراحل</div>;

  return (
    <div className="space-y-3">
      {phases.map((phase: any) => (
        <div key={phase.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{phase.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              phase.status === "completed" ? "bg-emerald-100 text-emerald-700" :
              phase.status === "in_progress" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {phase.status === "completed" ? "مكتمل" :
               phase.status === "in_progress" ? "جاري" : "لم يبدأ"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={phase.progressPercent ?? 0} />
            </div>
            <span className="text-sm font-medium text-gray-700 min-w-[40px] text-left">
              {phase.progressPercent ?? 0}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              defaultValue={phase.progressPercent ?? 0}
              onChange={(e) => {
                // local update then save on blur
              }}
              onMouseUp={(e) => updateProgress(phase.id, Number((e.target as HTMLInputElement).value))}
              disabled={updatingId === phase.id}
              className="flex-1 accent-blue-500"
            />
            {updatingId === phase.id && (
              <span className="text-xs text-gray-400">جاري...</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LogsTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error } = useApi(
    () => propertyApi.construction.dailyLogs(constructionId),
    [constructionId]
  );
  const logs: any[] = (data as any)?.data ?? [];

  if (loading) return <SkeletonRows rows={5} />;
  if (error) return <div className="text-red-600 bg-red-50 rounded-xl p-4">{error}</div>;
  if (logs.length === 0) return <div className="text-center py-12 text-gray-400">لا توجد سجلات يومية</div>;

  return (
    <div className="space-y-3">
      {logs.map((log: any) => (
        <div key={log.id} className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">
              {log.logDate ? new Date(log.logDate).toLocaleDateString("ar-SA") : "—"}
            </span>
            <span className="text-xs text-gray-500">{log.reportedBy ?? ""}</span>
          </div>
          {log.notes && <p className="text-sm text-gray-600">{log.notes}</p>}
          {log.weather && (
            <span className="text-xs text-gray-400 mt-1 block">الطقس: {log.weather}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function CostsTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error } = useApi(
    () => propertyApi.construction.costs(constructionId),
    [constructionId]
  );
  const costs: any[] = (data as any)?.data ?? [];

  const summary: Record<string, number> = {};
  costs.forEach((c: any) => {
    summary[c.category ?? "أخرى"] = (summary[c.category ?? "أخرى"] ?? 0) + Number(c.amount ?? 0);
  });

  if (loading) return <SkeletonRows rows={5} />;
  if (error) return <div className="text-red-600 bg-red-50 rounded-xl p-4">{error}</div>;

  return (
    <div className="space-y-4">
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(summary).map(([cat, total]) => (
            <div key={cat} className="bg-blue-50 rounded-2xl p-3 text-center">
              <div className="font-bold text-blue-700">{total.toLocaleString("en-US")}</div>
              <div className="text-xs text-blue-600">{cat}</div>
            </div>
          ))}
        </div>
      )}

      {costs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">لا توجد تكاليف مسجلة</div>
      ) : (
        <table className="w-full text-sm bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الوصف</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الفئة</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">المبلغ</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {costs.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{c.description ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.category ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{Number(c.amount).toLocaleString("en-US")} ر.س</td>
                <td className="px-4 py-3 text-gray-600">
                  {c.date ? new Date(c.date).toLocaleDateString("ar-SA") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PaymentsTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error, refetch } = useApi(
    () => propertyApi.construction.payments(constructionId),
    [constructionId]
  );
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const payments: any[] = (data as any)?.data ?? [];

  async function handleApprove(paymentId: string) {
    setApprovingId(paymentId);
    try {
      await propertyApi.construction.approvePayment(constructionId, paymentId);
      toast.success("تم اعتماد المستخلص");
      refetch();
    } catch (e: any) {
      toast.error(`فشل الاعتماد: ${e.message}`);
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) return <SkeletonRows rows={5} />;
  if (error) return <div className="text-red-600 bg-red-50 rounded-xl p-4">{error}</div>;
  if (payments.length === 0) return <div className="text-center py-12 text-gray-400">لا توجد مستخلصات</div>;

  return (
    <table className="w-full text-sm bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <thead className="bg-gray-50">
        <tr>
          <th className="text-right px-4 py-3 font-medium text-gray-600">المستخلص</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">المبلغ</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">إجراء</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {payments.map((p: any) => (
          <tr key={p.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-900">{p.description ?? `مستخلص #${p.id?.slice(-4)}`}</td>
            <td className="px-4 py-3 font-medium">{Number(p.amount).toLocaleString("en-US")} ر.س</td>
            <td className="px-4 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                p.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {p.status === "approved" ? "معتمد" :
                 p.status === "pending" ? "معلق" : p.status}
              </span>
            </td>
            <td className="px-4 py-3">
              {p.status === "pending" && (
                <button
                  onClick={() => handleApprove(p.id)}
                  disabled={approvingId === p.id}
                  className="text-xs px-3 py-1 text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: "#5b9bd5" }}
                >
                  اعتماد
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChangeOrdersTab({ constructionId }: { constructionId: string }) {
  const { data, loading, error } = useApi(
    () => propertyApi.construction.changeOrders(constructionId),
    [constructionId]
  );
  const orders: any[] = (data as any)?.data ?? [];

  if (loading) return <SkeletonRows rows={5} />;
  if (error) return <div className="text-red-600 bg-red-50 rounded-xl p-4">{error}</div>;
  if (orders.length === 0) return <div className="text-center py-12 text-gray-400">لا توجد أوامر تغيير</div>;

  return (
    <table className="w-full text-sm bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <thead className="bg-gray-50">
        <tr>
          <th className="text-right px-4 py-3 font-medium text-gray-600">الوصف</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">تأثير التكلفة</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">تأثير الوقت (يوم)</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {orders.map((co: any) => (
          <tr key={co.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-900">{co.description ?? "—"}</td>
            <td className={`px-4 py-3 font-medium ${Number(co.costImpact) > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {Number(co.costImpact) > 0 ? "+" : ""}{Number(co.costImpact).toLocaleString("en-US")} ر.س
            </td>
            <td className={`px-4 py-3 font-medium ${Number(co.timeImpactDays) > 0 ? "text-amber-600" : "text-gray-600"}`}>
              {Number(co.timeImpactDays) > 0 ? "+" : ""}{co.timeImpactDays ?? 0}
            </td>
            <td className="px-4 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                co.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                co.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}>
                {co.status === "approved" ? "معتمد" :
                 co.status === "pending" ? "معلق" : "مرفوض"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ConstructionTrackerPage() {
  const { id: constructionId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [selectedId, setSelectedId] = useState<string>(constructionId ?? "");

  const { data: listData, loading: listLoading, error: listError } = useApi(
    () => propertyApi.construction.list(),
    []
  );
  const projects: any[] = (listData as any)?.data ?? [];

  const { data: projectData, loading: projectLoading } = useApi(
    () => selectedId ? propertyApi.construction.get(selectedId) : Promise.resolve(null),
    [selectedId]
  );
  const project = (projectData as any)?.data ?? null;

  if (!selectedId) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">متتبع الإنشاء</h1>
          <p className="text-gray-500 text-sm mt-1">اختر مشروع لعرض تفاصيله</p>
        </div>

        {listLoading ? (
          <SkeletonRows rows={4} />
        ) : listError ? (
          <div className="text-red-600 bg-red-50 rounded-xl p-4">{listError}</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد مشاريع إنشاء</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="bg-white rounded-2xl border border-gray-100 p-5 text-right hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{p.propertyName ?? ""}</p>
                <div className="mt-3">
                  <ProgressBar value={p.progressPercent ?? 0} />
                  <div className="text-xs text-gray-500 mt-1">{p.progressPercent ?? 0}% مكتمل</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedId("")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          المشاريع
        </button>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-900">
          {projectLoading ? "..." : (project?.name ?? "المشروع")}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "general" && (
          projectLoading
            ? <SkeletonRows rows={4} />
            : project
            ? <GeneralTab project={project} />
            : <div className="text-gray-400 text-center py-12">المشروع غير موجود</div>
        )}
        {activeTab === "phases" && <PhasesTab constructionId={selectedId} />}
        {activeTab === "logs" && <LogsTab constructionId={selectedId} />}
        {activeTab === "costs" && <CostsTab constructionId={selectedId} />}
        {activeTab === "payments" && <PaymentsTab constructionId={selectedId} />}
        {activeTab === "change_orders" && <ChangeOrdersTab constructionId={selectedId} />}
      </div>
    </div>
  );
}
