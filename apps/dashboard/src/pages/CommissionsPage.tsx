import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { staffApi, bookingsApi, financeApi } from "@/lib/api";
import { Percent, TrendingUp, DollarSign, Users, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function CommissionsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: staffData, loading: staffLoading } = useApi(() => staffApi.list ? staffApi.list() : Promise.resolve({ data: [] }));
  const { data: bookData, loading: bookLoading } = useApi(
    () => {
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
      return bookingsApi.list({ from, to, limit: "500" });
    },
    [year, month]
  );

  const staffList: any[] = staffData?.data || [];
  const bookings: any[] = bookData?.data || [];

  // Build commission summary per staff
  const commissions = staffList.map(staff => {
    const staffBookings = bookings.filter((b: any) =>
      (b.staffId === staff.id || b.providerId === staff.id) && b.status === "completed"
    );
    const totalRevenue = staffBookings.reduce((sum: number, b: any) => sum + (parseFloat(b.totalAmount || b.price || 0)), 0);
    const commissionRate = staff.commissionRate || staff.commission_rate || 10;
    const commission = (totalRevenue * commissionRate) / 100;
    return { ...staff, bookingsCount: staffBookings.length, totalRevenue, commissionRate, commission, bookings: staffBookings };
  });

  const totalRevenue = commissions.reduce((s, c) => s + c.totalRevenue, 0);
  const totalCommission = commissions.reduce((s, c) => s + c.commission, 0);
  const totalBookings = commissions.reduce((s, c) => s + c.bookingsCount, 0);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-5 h-5 text-brand-500" /> العمولات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">ملخص عمولات الموظفين</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "إجمالي الإيرادات", value: `${totalRevenue.toFixed(0)} ر.س`, icon: DollarSign, color: "text-brand-500 bg-brand-50" },
          { label: "إجمالي العمولات", value: `${totalCommission.toFixed(0)} ر.س`, icon: TrendingUp, color: "text-green-600 bg-green-50" },
          { label: "إجمالي الحجوزات", value: totalBookings, icon: Users, color: "text-purple-600 bg-purple-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-5 h-5", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Commissions */}
      {(staffLoading || bookLoading) ? (
        <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <div className="space-y-2">
          {commissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا يوجد موظفون</p>
            </div>
          ) : (
            commissions.map(staff => (
              <div key={staff.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === staff.id ? null : staff.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                      {staff.name?.[0] || "م"}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{staff.name}</p>
                      <p className="text-xs text-gray-400">{staff.role || staff.position || "موظف"} · {staff.bookingsCount} حجز</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">الإيرادات</p>
                      <p className="font-semibold text-gray-900 tabular-nums">{staff.totalRevenue.toFixed(0)} ر.س</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">نسبة العمولة</p>
                      <p className="font-semibold text-brand-600 tabular-nums">{staff.commissionRate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">العمولة</p>
                      <p className="font-bold text-green-600 tabular-nums">{staff.commission.toFixed(0)} ر.س</p>
                    </div>
                    {expanded === staff.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {expanded === staff.id && staff.bookings.length > 0 && (
                  <div className="border-t border-gray-50 px-5 pb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide py-3">الحجوزات المكتملة</p>
                    <div className="space-y-2">
                      {staff.bookings.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl text-sm">
                          <div>
                            <span className="font-medium text-gray-800">{b.customerName || b.customer?.name || "عميل"}</span>
                            <span className="text-gray-400 text-xs mr-2">
                              {b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString("ar-SA") : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 tabular-nums">{parseFloat(b.totalAmount || b.price || 0).toFixed(0)} ر.س</span>
                            <span className="text-green-600 font-medium tabular-nums">
                              +{((parseFloat(b.totalAmount || b.price || 0) * staff.commissionRate) / 100).toFixed(0)} ر.س
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
