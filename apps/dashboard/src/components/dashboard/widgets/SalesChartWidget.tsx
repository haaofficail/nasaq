import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { orgStatsApi } from "@/lib/api";

type Period = "today" | "week";

function formatAmount(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}ك`;
  return String(v);
}

export function SalesChartWidget() {
  const [period, setPeriod] = useState<Period>("week");
  const { data, loading } = useApi(() => orgStatsApi.sales(period), [period]);
  const rows: { date: string; label: string; amount: number }[] = data?.data ?? [];

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-400" />
          المبيعات
          {total > 0 && (
            <span className="text-xs font-normal text-gray-400">
              — {total.toLocaleString("ar-SA")} ر.س
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5">
          {(["today", "week"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                period === p
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p === "today" ? "اليوم" : "هذا الأسبوع"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-3 py-4">
        {loading ? (
          <div className="h-[180px] bg-gray-50 rounded-xl animate-pulse" />
        ) : rows.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
            لا توجد مبيعات بعد
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rows} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatAmount}
                tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString("ar-SA")} ر.س`, "المبيعات"]}
                labelStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", fontSize: 11 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  fontSize: 11,
                  fontFamily: "IBM Plex Sans Arabic, sans-serif",
                }}
              />
              <Bar dataKey="amount" fill="#5b9bd5" radius={[5, 5, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
