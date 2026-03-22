import { Link } from "react-router-dom";
import { BedDouble, DoorOpen, Sparkles } from "lucide-react";
import { hotelApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export function RoomStatusWidget() {
  const { data, loading } = useApi(() => hotelApi.dashboardStats(), []);
  const stats = data?.data || {};

  const items = [
    { label: "غرف متاحة",      value: stats.availableRooms  ?? "—", icon: BedDouble,  bg: "bg-emerald-50", color: "text-emerald-600" },
    { label: "غرف مشغولة",      value: stats.occupiedRooms   ?? "—", icon: BedDouble,  bg: "bg-blue-50",    color: "text-blue-600" },
    { label: "تسجيل دخول اليوم", value: stats.checkinsToday   ?? "—", icon: DoorOpen,   bg: "bg-violet-50",  color: "text-violet-600" },
    { label: "طلبات تنظيف",     value: stats.pendingCleaning ?? stats.cleaningRequests ?? "—", icon: Sparkles, bg: "bg-amber-50", color: "text-amber-600" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">حالة الغرف</h2>
          <p className="text-xs text-gray-400 mt-0.5">نظرة عامة على الإشغال</p>
        </div>
        <Link to="/dashboard/hotel" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
          التفاصيل
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div key={i} className={`rounded-xl p-3 ${item.bg}`}>
            <item.icon className={`w-4 h-4 mb-2 ${item.color}`} />
            <p className={`text-2xl font-bold tabular-nums ${loading ? "opacity-30" : ""} ${item.color}`}>
              {loading ? "—" : item.value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
