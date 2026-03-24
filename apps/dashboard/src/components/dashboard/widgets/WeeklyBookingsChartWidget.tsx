export function WeeklyBookingsChartWidget() {
  const weekDays = ["سب", "أح", "إث", "ثل", "أر", "خم", "جم"];
  const weekValues = [4, 7, 5, 9, 6, 11, 8];
  const maxWeek = Math.max(...weekValues);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">الحجوزات الأسبوعية</h2>
          <p className="text-xs text-gray-400 mt-0.5">هذا الأسبوع</p>
        </div>
        <span className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-lg font-medium">
          {weekValues.reduce((a, b) => a + b, 0)} حجز
        </span>
      </div>
      <div className="flex items-end gap-2 h-28">
        {weekValues.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-lg bg-brand-100 relative overflow-hidden transition-all duration-500"
              style={{ height: `${(v / maxWeek) * 100}%` }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-brand-400 rounded-t-lg"
                style={{ height: "60%" }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{weekDays[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
