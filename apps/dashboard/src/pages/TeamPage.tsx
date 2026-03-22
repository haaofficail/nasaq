import { useState } from "react";
import { Users, CalendarCheck, Clock, CheckCircle, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { teamApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";

const taskStatusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: "معلقة",      bg: "bg-gray-50",    text: "text-gray-600",  dot: "bg-gray-400" },
  in_progress: { label: "قيد التنفيذ", bg: "bg-blue-50",   text: "text-blue-600",  dot: "bg-blue-500" },
  completed:   { label: "مكتملة",     bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

export function TeamPage() {
  const today = new Date().toISOString().split("T")[0];

  const { data: tasksRes, loading, refetch }   = useApi(() => teamApi.tasks(today), []);
  const { data: availRes }                      = useApi(() => teamApi.availability(today), []);
  const { mutate: updateTask }                  = useMutation(({ id, data }: any) => teamApi.updateTask(id, data));

  const tasks: any[]       = tasksRes?.data || [];
  const availability: any[] = availRes?.data || [];

  const completed   = tasks.filter((t) => t.status === "completed").length;
  const inProgress  = tasks.filter((t) => t.status === "in_progress").length;
  const pending     = tasks.filter((t) => t.status === "pending").length;

  const handleComplete = async (id: string) => {
    await updateTask({ id, data: { status: "completed" } });
    refetch();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الفريق</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          <span className="text-sm text-gray-600 font-medium">اليوم</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "مهام اليوم",  value: tasks.length,         color: "text-brand-600",   bg: "bg-brand-50",   icon: CalendarCheck },
          { label: "مكتملة",     value: completed,             color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
          { label: "قيد التنفيذ", value: inProgress,           color: "text-blue-600",    bg: "bg-blue-50",    icon: Clock },
          { label: "متاح اليوم", value: availability.length,  color: "text-violet-600",  bg: "bg-violet-50",  icon: Users },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center", s.bg)}>
                <s.icon className={clsx("w-4 h-4", s.color)} />
              </div>
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">تقدم المهام</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-700"
              style={{ width: tasks.length > 0 ? `${Math.round((completed / tasks.length) * 100)}%` : "0%" }}
            />
          </div>
          <div className="flex items-center gap-4 mt-3">
            {[
              { label: "مكتملة",     value: completed, dot: "bg-emerald-500" },
              { label: "قيد التنفيذ", value: inProgress, dot: "bg-blue-500" },
              { label: "معلقة",      value: pending, dot: "bg-gray-400" },
            ].map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={clsx("w-2 h-2 rounded-full", s.dot)} />
                {s.label}: <span className="font-semibold text-gray-700">{s.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tasks list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">مهام اليوم</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-44" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد مهام لليوم</p>
            </div>
          ) : (
            tasks.map((task: any, idx: number) => {
              const sc = taskStatusConfig[task.status] || taskStatusConfig.pending;
              return (
                <div
                  key={task.id}
                  className={clsx(
                    "flex items-center gap-4 px-5 py-4 transition-colors",
                    idx < tasks.length - 1 && "border-b border-gray-50",
                    task.status === "completed" ? "opacity-60" : "hover:bg-gray-50/60"
                  )}
                >
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", sc.bg)}>
                    {task.status === "completed"
                      ? <CheckCircle2 className={clsx("w-5 h-5", sc.text)} />
                      : <Clock className={clsx("w-5 h-5", sc.text)} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-sm font-medium truncate", task.status === "completed" ? "text-gray-400 line-through" : "text-gray-900")}>
                      {task.title || task.taskType}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {task.assigneeName || "غير معيّن"}
                      {task.bookingNumber && ` — #${task.bookingNumber}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx("flex items-center gap-1 text-xs font-medium")}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full", sc.dot)} />
                      {sc.label}
                    </span>
                    {task.status !== "completed" && (
                      <button
                        onClick={() => handleComplete(task.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium border border-emerald-200 hover:border-emerald-300 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        إكمال
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Availability panel */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">متاح اليوم</h2>
          </div>
          {availability.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">لا يوجد أحد متاح</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {availability.map((person: any) => (
                <div key={person.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center shrink-0">
                    {person.name?.[0] || "م"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{person.name}</p>
                    <p className="text-xs text-gray-400">{person.specialty || person.role || "—"}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
