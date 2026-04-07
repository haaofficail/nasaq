import { useState } from "react";
import { toast } from "@/hooks/useToast";
import {
  ClipboardCheck, UserCheck, UserX, Clock, AlertTriangle, RefreshCw,
  LogIn, LogOut, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  CalendarDays, Settings, FileText, CheckCircle2, XCircle, Coffee,
  TrendingUp, Zap, MapPin, User, AlarmClock,
} from "lucide-react";
import { clsx } from "clsx";
import { attendanceEngineApi, staffApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select } from "@/components/ui";

// ============================================================
// STATUS CONFIG
// ============================================================

const STATUS: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  present:        { label: "حاضر",         color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-500" },
  late:           { label: "متأخر",        color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   dot: "bg-amber-500"   },
  absent:         { label: "غائب",         color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     dot: "bg-red-500"     },
  on_leave:       { label: "إجازة",        color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",    dot: "bg-blue-500"    },
  week_off:       { label: "عطلة",         color: "text-gray-500",    bg: "bg-gray-50",     border: "border-gray-200",    dot: "bg-gray-300"    },
  not_started:    { label: "لم يبدأ بعد", color: "text-gray-400",    bg: "bg-gray-50",     border: "border-gray-100",    dot: "bg-gray-200"    },
  not_checked_in: { label: "لم يسجل",     color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200",  dot: "bg-orange-500"  },
  incomplete:     { label: "ناقص",         color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200",  dot: "bg-orange-400"  },
  early_leave:    { label: "خروج مبكر",   color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200",  dot: "bg-purple-500"  },
  overtime:       { label: "إضافي",        color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200",  dot: "bg-indigo-500"  },
  on_mission:     { label: "في مهمة",     color: "text-teal-700",    bg: "bg-teal-50",     border: "border-teal-200",    dot: "bg-teal-500"    },
  holiday:        { label: "إجازة رسمية", color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200",  dot: "bg-violet-500"  },
};

const DAYS_AR = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.not_started;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border", s.color, s.bg, s.border)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

function today() { return new Date().toISOString().split("T")[0]; }

type Tab = "daily" | "schedules" | "policies" | "adjustments" | "reports";

// ============================================================
// DAILY TAB
// ============================================================

function DailyTab({ onTabChange }: { onTabChange: (t: Tab) => void }) {
  const [date, setDate] = useState(today());
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ userId: "", checkIn: "", checkOut: "", notes: "" });

  const { data: dailyRes, loading, refetch } = useApi(() => attendanceEngineApi.daily(date), [date]);
  const { data: summaryRes, refetch: refetchSummary } = useApi(() => attendanceEngineApi.summary(date), [date]);
  const { data: staffRes } = useApi(() => staffApi.list(), []);
  const { data: assignRes } = useApi(() => attendanceEngineApi.assignments(), []);

  const records: any[] = dailyRes?.data || [];
  const summary: any = summaryRes?.data || {};
  const allStaff: any[] = staffRes?.data || [];

  // Build a set of user IDs who have a schedule assigned
  const assignedUserIds = new Set<string>(
    (assignRes?.data || []).filter((a: any) => a.schedule_name).map((a: any) => a.id)
  );
  const unassignedWeekOff = records.filter(
    (r: any) => (r.status === "week_off" || r.status === "holiday") && !r.scheduledStart && !assignedUserIds.has(r.userId)
  );
  const hasUnassigned = unassignedWeekOff.length > 0;

  const { mutate: doCheckIn } = useMutation((d: any) => attendanceEngineApi.checkIn(d));
  const { mutate: doCheckout } = useMutation(({ id, data }: any) => attendanceEngineApi.checkout(id, data));
  const { mutate: doManual } = useMutation((d: any) => attendanceEngineApi.manual(d));

  const refresh = () => { refetch(); refetchSummary(); };
  const t = today();

  const handleCheckIn = async (userId: string) => {
    setCheckingIn(userId);
    try {
      await doCheckIn({ userId });
      toast.success("تم تسجيل الحضور"); refresh();
    } catch { toast.error("فشل تسجيل الحضور"); }
    finally { setCheckingIn(null); }
  };

  const handleCheckout = async (shiftId: string) => {
    try {
      await doCheckout({ id: shiftId, data: {} });
      toast.success("تم تسجيل الانصراف"); refresh();
    } catch { toast.error("فشل تسجيل الانصراف"); }
  };

  const handleManual = async () => {
    if (!manualForm.userId) return;
    try {
      await doManual({
        userId: manualForm.userId, date,
        checkIn: manualForm.checkIn ? `${date}T${manualForm.checkIn}:00+03:00` : undefined,
        checkOut: manualForm.checkOut ? `${date}T${manualForm.checkOut}:00+03:00` : undefined,
        notes: manualForm.notes,
      });
      toast.success("تم حفظ السجل اليدوي");
      setShowManual(false); setManualForm({ userId: "", checkIn: "", checkOut: "", notes: "" }); refresh();
    } catch { toast.error("فشل الحفظ"); }
  };

  const STAT_CARDS = [
    { key: "total",          label: "المجدولون",   icon: User,         color: "text-brand-600",   bg: "bg-brand-50"   },
    { key: "present",        label: "حاضر",        icon: UserCheck,    color: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "late",           label: "متأخر",       icon: AlarmClock,   color: "text-amber-600",   bg: "bg-amber-50"   },
    { key: "not_checked_in", label: "لم يسجل",     icon: Clock,        color: "text-orange-600",  bg: "bg-orange-50"  },
    { key: "absent",         label: "غائب",        icon: UserX,        color: "text-red-600",     bg: "bg-red-50"     },
    { key: "on_leave",       label: "إجازة",       icon: CalendarDays, color: "text-blue-600",    bg: "bg-blue-50"    },
    { key: "incomplete",     label: "ناقص",        icon: AlertTriangle,color: "text-orange-600",  bg: "bg-orange-50"  },
    { key: "early_leave",    label: "خروج مبكر",  icon: LogOut,       color: "text-purple-600",  bg: "bg-purple-50"  },
    { key: "overtime",       label: "إضافي",       icon: TrendingUp,   color: "text-indigo-600",  bg: "bg-indigo-50"  },
    { key: "week_off",       label: "عطلة",        icon: Coffee,       color: "text-gray-500",    bg: "bg-gray-50"    },
  ];

  return (
    <div className="space-y-5">
      {/* Date Nav */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d.toISOString().split("T")[0]); }} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-300" dir="ltr" />
        <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d.toISOString().split("T")[0]); }} disabled={date >= t} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
        {date !== t && <button onClick={() => setDate(t)} className="px-3 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">اليوم</button>}
        <div className="mr-auto flex gap-2">
          <button onClick={refresh} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <Button variant="secondary" icon={Plus} onClick={() => setShowManual(true)}>إدخال يدوي</Button>
        </div>
      </div>

      {/* Unassigned employees banner */}
      {!loading && hasUnassigned && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {unassignedWeekOff.length} موظف بدون جدول دوام معين
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              الموظفون بدون جدول يظهرون دائماً كـ "عطلة". عيّن لهم جدولاً لتتبع حضورهم.
            </p>
          </div>
          <button
            onClick={() => onTabChange("schedules")}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap border border-amber-300 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors"
          >
            تعيين الجداول
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", bg)}>
              <Icon className={clsx("w-4 h-4", color)} />
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", color)}>{summary[key] ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">سجلات الحضور</h2>
          <span className="text-xs text-gray-400">{records.length} موظف</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5"><div className="h-3.5 w-32 bg-gray-100 rounded" /><div className="h-3 w-20 bg-gray-100 rounded" /></div>
                <div className="h-6 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">لا توجد سجلات لهذا اليوم</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/40">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">الموظف</th>
                  <th className="text-right py-3 px-3 text-xs text-gray-400 font-semibold">الشفت</th>
                  <th className="text-right py-3 px-3 text-xs text-gray-400 font-semibold">الدخول</th>
                  <th className="text-right py-3 px-3 text-xs text-gray-400 font-semibold">الخروج</th>
                  <th className="text-right py-3 px-3 text-xs text-gray-400 font-semibold">الساعات</th>
                  <th className="text-right py-3 px-3 text-xs text-gray-400 font-semibold">التأخير</th>
                  <th className="text-right py-3 px-3 text-xs text-gray-400 font-semibold">الإضافي</th>
                  <th className="text-right py-3 px-3 text-xs text-gray-400 font-semibold">الحالة</th>
                  <th className="py-3 px-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.userId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center shrink-0">{r.name?.[0]}</div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{r.name}</p>
                          {r.jobTitle && <p className="text-xs text-gray-400">{r.jobTitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 tabular-nums">
                      {r.scheduledStart
                        ? `${r.scheduledStart} - ${r.scheduledEnd}`
                        : (r.status === "week_off" || r.status === "holiday")
                          ? assignedUserIds.has(r.userId)
                            ? <span className="text-gray-400">يوم راحة</span>
                            : <span className="text-amber-500 font-medium">بدون جدول</span>
                          : "—"}
                    </td>
                    <td className="py-3 px-3 text-xs tabular-nums font-medium">
                      <span className={r.actualStart ? (r.lateMinutes > 0 ? "text-amber-600" : "text-emerald-600") : "text-gray-300"}>
                        {fmt(r.actualStart)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs tabular-nums text-gray-500">{fmt(r.actualEnd)}</td>
                    <td className="py-3 px-3 text-xs text-gray-600 tabular-nums">{r.workedMinutesFmt}</td>
                    <td className="py-3 px-3 text-xs tabular-nums">
                      {r.lateMinutes > 0 ? <span className="text-amber-600 font-medium">{r.lateMinutesFmt}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-3 text-xs tabular-nums">
                      {r.overtimeMinutes > 0 ? <span className="text-indigo-600 font-medium">{r.overtimeMinutesFmt}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-3">
                      {date === t && r.status === "not_checked_in" && (
                        <button onClick={() => handleCheckIn(r.userId)} disabled={checkingIn === r.userId}
                          className="flex items-center gap-1 px-2.5 py-1 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">
                          <LogIn className="w-3 h-3" /> حضور
                        </button>
                      )}
                      {date === t && r.shiftId && r.actualStart && !r.actualEnd && (
                        <button onClick={() => handleCheckout(r.shiftId)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                          <LogOut className="w-3 h-3" /> انصراف
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <Modal open={showManual} onClose={() => setShowManual(false)} title="إدخال حضور يدوي" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowManual(false)}>إلغاء</Button><Button onClick={handleManual}>حفظ</Button></>}>
        <div className="space-y-4">
          <Select label="الموظف" name="userId" value={manualForm.userId}
            onChange={e => setManualForm(p => ({ ...p, userId: e.target.value }))}
            options={[{ value: "", label: "اختر موظفاً" }, ...allStaff.map(s => ({ value: s.id, label: s.name }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="وقت الدخول" name="checkIn" type="time" value={manualForm.checkIn}
              onChange={e => setManualForm(p => ({ ...p, checkIn: e.target.value }))} dir="ltr" />
            <Input label="وقت الخروج" name="checkOut" type="time" value={manualForm.checkOut}
              onChange={e => setManualForm(p => ({ ...p, checkOut: e.target.value }))} dir="ltr" />
          </div>
          <Input label="ملاحظات" name="notes" value={manualForm.notes}
            onChange={e => setManualForm(p => ({ ...p, notes: e.target.value }))} placeholder="سبب الإدخال اليدوي..." />
        </div>
      </Modal>    </div>
  );
}

// ============================================================
// SCHEDULES TAB
// ============================================================

const EMPTY_SCHED = { name: "", description: "", graceMinutes: 15, absentThresholdMinutes: 90, breakMinutes: 60, isDefault: false };
const DEFAULT_DAYS = [
  { dayOfWeek: 0, startTime: "09:00", endTime: "18:00", active: true },
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", active: true },
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", active: true },
  { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", active: true },
  { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", active: true },
  { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", active: false },
  { dayOfWeek: 6, startTime: "09:00", endTime: "18:00", active: true },
];

function SchedulesTab() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_SCHED });
  const [days, setDays] = useState(DEFAULT_DAYS.map(d => ({ ...d })));
  const [saving, setSaving] = useState(false);
  const [showAssign, setShowAssign] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: schedsRes, loading, refetch } = useApi(() => attendanceEngineApi.schedules(), []);
  const { data: assignRes, refetch: refetchAssign } = useApi(() => attendanceEngineApi.assignments(), []);
  const { data: staffRes } = useApi(() => staffApi.list(), []);
  const { mutate: createSched } = useMutation((d: any) => attendanceEngineApi.createSchedule(d));
  const { mutate: updateSched } = useMutation(({ id, data }: any) => attendanceEngineApi.updateSchedule(id, data));
  const { mutate: deleteSched } = useMutation((id: string) => attendanceEngineApi.deleteSchedule(id));
  const { mutate: assignSched } = useMutation(({ id, data }: any) => attendanceEngineApi.assignSchedule(id, data));

  const schedules: any[] = schedsRes?.data || [];
  const assignments: any[] = assignRes?.data || [];
  const allStaff: any[] = staffRes?.data || [];

  // Employees who exist in staff list but have no schedule assigned
  const assignedStaffIds = new Set<string>(assignments.filter((a: any) => a.schedule_name).map((a: any) => a.id));
  const unassignedStaff = allStaff.filter((s: any) => !assignedStaffIds.has(s.id));

  const openCreate = () => {
    setEditing(null); setForm({ ...EMPTY_SCHED });
    setDays(DEFAULT_DAYS.map(d => ({ ...d }))); setShowModal(true);
  };
  const openEdit = (s: any) => {
    setEditing(s); setForm({ name: s.name, description: s.description || "", graceMinutes: s.grace_minutes, absentThresholdMinutes: s.absent_threshold_minutes, breakMinutes: s.break_minutes, isDefault: s.is_default });
    const existDays = s.days || [];
    setDays(DEFAULT_DAYS.map(d => {
      const ex = existDays.find((ed: any) => ed.day_of_week === d.dayOfWeek);
      return ex ? { dayOfWeek: d.dayOfWeek, startTime: ex.start_time, endTime: ex.end_time, active: ex.is_active } : { ...d };
    }));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, days: days.filter(d => d.active).map(d => ({ dayOfWeek: d.dayOfWeek, startTime: d.startTime, endTime: d.endTime })) };
      if (editing) await updateSched({ id: editing.id, data: payload });
      else await createSched(payload);
      toast.success(editing ? "تم تحديث الجدول" : "تم إنشاء الجدول");
      setShowModal(false); refetch();
    } catch { toast.error("فشل الحفظ"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الجدول؟")) return;
    try { await deleteSched(id); toast.success("تم الحذف"); refetch(); }
    catch (e: any) { toast.error(e?.message || "فشل الحذف"); }
  };

  const handleAssign = async () => {
    if (!selectedUsers.length || !showAssign) return;
    try {
      await assignSched({ id: showAssign.id, data: { userIds: selectedUsers } });
      toast.success(`تم تعيين ${selectedUsers.length} موظف`);
      setShowAssign(null); setSelectedUsers([]); refetchAssign();
    } catch { toast.error("فشل التعيين"); }
  };

  const setDay = (i: number, field: string, val: any) => setDays(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{schedules.length} جدول دوام</p>
        <Button icon={Plus} onClick={openCreate}>جدول جديد</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد جداول دوام</h3>
          <p className="text-sm text-gray-400 mb-4">أنشئ جدول دوام أسبوعي وعيّنه للموظفين</p>
          <Button icon={Plus} onClick={openCreate}>جدول جديد</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((s: any) => {
            const activeDays = (s.days || []).filter((d: any) => d.is_active);
            const dayNames = activeDays.map((d: any) => DAYS_AR[d.day_of_week]?.slice(0, 3)).join("، ");
            const assignedCount = parseInt(s.assigned_count) || 0;
            const times = activeDays[0] ? `${activeDays[0].start_time} — ${activeDays[0].end_time}` : "—";
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900">{s.name}</h3>
                      {s.is_default && <span className="text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">افتراضي</span>}
                    </div>
                    <p className="text-xs text-gray-400" dir="ltr">{times}</p>
                  </div>
                  <div className="flex gap-1 mr-2">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors"><Pencil className="w-3.5 h-3.5 text-brand-400" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">{dayNames || "لا أيام محددة"}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span><Clock className="w-3 h-3 inline ml-1" />{s.grace_minutes}د سماحية</span>
                    <span>{assignedCount} موظف</span>
                  </div>
                  <button onClick={() => { setShowAssign(s); setSelectedUsers([]); }}
                    className="text-xs text-brand-600 hover:underline">تعيين موظفين</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignments list */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">تعيينات الموظفين</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/40">
                <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">الموظف</th>
                <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الجدول المعين</th>
                <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">من تاريخ</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any) => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                  <td className="py-3 px-5">
                    <p className="font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.job_title}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {a.schedule_name ? <span>{a.schedule_name}</span> : <span className="text-gray-300">غير محدد</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500" dir="ltr">{a.effective_from || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unassigned staff warning */}
      {unassignedStaff.length > 0 && schedules.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-amber-800 text-sm">{unassignedStaff.length} موظف بدون جدول معين</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {unassignedStaff.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 font-bold text-sm flex items-center justify-center shrink-0">{s.name?.[0]}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.jobTitle || s.job_title}</p>
                  </div>
                </div>
                <button onClick={() => { setShowAssign(schedules[0]); setSelectedUsers([s.id]); }}
                  className="text-xs text-brand-600 font-medium hover:underline">
                  تعيين جدول
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "تعديل جدول الدوام" : "جدول دوام جديد"} size="md"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button><Button onClick={handleSave} loading={saving}>حفظ</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="اسم الجدول" name="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: الدوام الصباحي" required />
            </div>
            <Input label="سماحية التأخير (دقيقة)" name="grace" type="number" value={String(form.graceMinutes)} onChange={e => setForm(p => ({ ...p, graceMinutes: parseInt(e.target.value) || 0 }))} dir="ltr" />
            <Input label="حد الغياب (دقيقة)" name="absent" type="number" value={String(form.absentThresholdMinutes)} onChange={e => setForm(p => ({ ...p, absentThresholdMinutes: parseInt(e.target.value) || 0 }))} dir="ltr" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">أيام العمل وأوقاتها</p>
            <div className="space-y-2">
              {days.map((d, i) => (
                <div key={d.dayOfWeek} className={clsx("flex items-center gap-3 p-2.5 rounded-xl border transition-colors", d.active ? "border-brand-100 bg-brand-50/30" : "border-gray-100 bg-gray-50/30")}>
                  <label className="flex items-center gap-2 w-20 shrink-0 cursor-pointer">
                    <input type="checkbox" checked={d.active} onChange={e => setDay(i, "active", e.target.checked)} className="rounded" />
                    <span className="text-sm font-medium text-gray-700">{DAYS_AR[d.dayOfWeek]}</span>
                  </label>
                  {d.active && (
                    <>
                      <input type="time" value={d.startTime} onChange={e => setDay(i, "startTime", e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-300 w-24" dir="ltr" />
                      <span className="text-gray-400 text-xs">—</span>
                      <input type="time" value={d.endTime} onChange={e => setDay(i, "endTime", e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-300 w-24" dir="ltr" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!showAssign} onClose={() => setShowAssign(null)} title={`تعيين موظفين — ${showAssign?.name}`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowAssign(null)}>إلغاء</Button><Button onClick={handleAssign} disabled={!selectedUsers.length}>تعيين ({selectedUsers.length})</Button></>}>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {allStaff.map((s: any) => (
            <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selectedUsers.includes(s.id)} onChange={e => setSelectedUsers(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} className="rounded" />
              <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0">{s.name?.[0]}</div>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                <p className="text-xs text-gray-400">{s.jobTitle || s.job_title}</p>
              </div>
            </label>
          ))}
        </div>
      </Modal>    </div>
  );
}

// ============================================================
// POLICIES TAB
// ============================================================

function PoliciesTab() {
  const { data: policyRes, loading, refetch } = useApi(() => attendanceEngineApi.policy(), []);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { mutate: savePolicy } = useMutation((d: any) => attendanceEngineApi.updatePolicy(d));

  const policy = policyRes?.data;
  if (policy && !form) setForm({ ...policy });

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await savePolicy({
        graceMinutes: form.grace_minutes, absentThresholdMinutes: form.absent_threshold_minutes,
        roundingMinutes: form.rounding_minutes, allowSelfCheckin: form.allow_self_checkin,
        allowManualEntries: form.allow_manual_entries, requireApproval: form.require_approval,
        autoCloseOpenRecords: form.auto_close_open_records, autoCloseHour: form.auto_close_hour,
        requireGps: form.require_gps, requireQr: form.require_qr,
      });
      toast.success("تم حفظ السياسات"); refetch();
    } catch { toast.error("فشل الحفظ"); }
    finally { setSaving(false); }
  };

  const f = (key: string) => form?.[key];
  const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  if (loading || !form) return <div className="p-8 text-center text-gray-400 animate-pulse">جاري التحميل...</div>;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 text-sm border-b border-gray-50 pb-3">أوقات الحضور</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">سماحية التأخير (دقيقة)</label>
            <input type="number" value={f("grace_minutes") || 0} onChange={e => set("grace_minutes", parseInt(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-300" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">حد الغياب (دقيقة)</label>
            <input type="number" value={f("absent_threshold_minutes") || 0} onChange={e => set("absent_threshold_minutes", parseInt(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-300" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">تقريب الوقت (دقيقة)</label>
            <input type="number" value={f("rounding_minutes") || 0} onChange={e => set("rounding_minutes", parseInt(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-300" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">إغلاق تلقائي الساعة</label>
            <input type="time" value={f("auto_close_hour") || "23:59"} onChange={e => set("auto_close_hour", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-300" dir="ltr" />
          </div>
        </div>

        <h2 className="font-semibold text-gray-900 text-sm border-b border-gray-50 pb-3 mt-2">الصلاحيات والإعدادات</h2>
        <div className="space-y-3">
          {[
            { key: "allow_self_checkin",      label: "السماح بالتسجيل الذاتي (Self Check-in)" },
            { key: "allow_manual_entries",     label: "السماح بالإدخال اليدوي من المدير"       },
            { key: "require_approval",         label: "طلب موافقة على تسجيلات الحضور"         },
            { key: "auto_close_open_records",  label: "إغلاق السجلات المفتوحة تلقائياً"        },
            { key: "require_gps",              label: "اشتراط تحديد الموقع (GPS)"              },
            { key: "require_qr",               label: "اشتراط مسح QR للتسجيل"                },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-700">{label}</span>
              <div className={clsx("w-10 h-5 rounded-full transition-colors cursor-pointer relative", f(key) ? "bg-brand-500" : "bg-gray-200")}
                onClick={() => set(key, !f(key))}>
                <div className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", f(key) ? "right-0.5" : "left-0.5")} />
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>حفظ السياسات</Button>
      </div>    </div>
  );
}

// ============================================================
// ADJUSTMENTS TAB
// ============================================================

const ADJ_TYPES: Record<string, string> = {
  check_in_adjustment:  "تعديل وقت الدخول",
  check_out_adjustment: "تعديل وقت الخروج",
  approve_late:         "اعتماد تأخير",
  excuse_absence:       "تبرير غياب",
  exit_permit:          "إذن خروج",
  overtime_approval:    "اعتماد إضافي",
  convert_to_leave:     "تحويل إلى إجازة",
  convert_to_mission:   "تحويل إلى مهمة",
};

function AdjustmentsTab() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ userId: "", type: "approve_late", workDate: today(), reason: "" });
  const [reviewNote, setReviewNote] = useState("");

  const { data: adjRes, loading, refetch } = useApi(() => attendanceEngineApi.adjustments(statusFilter), [statusFilter]);
  const { data: staffRes } = useApi(() => staffApi.list(), []);
  const { mutate: approve } = useMutation(({ id, note }: any) => attendanceEngineApi.approveAdjustment(id, note));
  const { mutate: reject } = useMutation(({ id, note }: any) => attendanceEngineApi.rejectAdjustment(id, note));
  const { mutate: createAdj } = useMutation((d: any) => attendanceEngineApi.createAdjustment(d));

  const adjustments: any[] = adjRes?.data || [];
  const allStaff: any[] = staffRes?.data || [];

  const handleApprove = async (id: string) => {
    try { await approve({ id, note: reviewNote }); toast.success("تمت الموافقة"); refetch(); }
    catch { toast.error("فشل"); }
  };
  const handleReject = async (id: string) => {
    try { await reject({ id, note: reviewNote }); toast.success("تم الرفض"); refetch(); }
    catch { toast.error("فشل"); }
  };
  const handleCreate = async () => {
    if (!createForm.userId || !createForm.reason) return;
    try {
      await createAdj({ ...createForm });
      toast.success("تم إرسال الطلب");
      setShowCreate(false); refetch();
    } catch { toast.error("فشل"); }
  };

  const STATUS_BADGE: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {["pending", "approved", "rejected"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition-colors", statusFilter === s ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
              {s === "pending" ? "بانتظار الموافقة" : s === "approved" ? "مقبولة" : "مرفوضة"}
            </button>
          ))}
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>طلب تصحيح</Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">جاري التحميل...</div>
        ) : adjustments.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">لا توجد طلبات {statusFilter === "pending" ? "بانتظار الموافقة" : ""}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {adjustments.map((r: any) => (
              <div key={r.id} className="px-5 py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center shrink-0">
                  {r.user_name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-gray-900 text-sm">{r.user_name}</p>
                    <span className="text-xs text-gray-400">{r.job_title}</span>
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_BADGE[r.status] || "bg-gray-50 text-gray-500 border-gray-200")}>
                      {r.status === "pending" ? "معلق" : r.status === "approved" ? "مقبول" : "مرفوض"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-700 mb-0.5">{ADJ_TYPES[r.type] || r.type}</p>
                  <p className="text-xs text-gray-500">{r.reason}</p>
                  {r.work_date && <p className="text-xs text-gray-400 mt-1" dir="ltr">{r.work_date}</p>}
                  {r.review_note && <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-2 py-1">ملاحظة المراجع: {r.review_note}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(r.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-medium hover:bg-emerald-600 transition-colors">
                      <CheckCircle2 className="w-3 h-3" /> قبول
                    </button>
                    <button onClick={() => handleReject(r.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors">
                      <XCircle className="w-3 h-3" /> رفض
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="طلب تصحيح حضور" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>إلغاء</Button><Button onClick={handleCreate}>إرسال</Button></>}>
        <div className="space-y-4">
          <Select label="الموظف" name="userId" value={createForm.userId}
            onChange={e => setCreateForm(p => ({ ...p, userId: e.target.value }))}
            options={[{ value: "", label: "اختر موظفاً" }, ...allStaff.map(s => ({ value: s.id, label: s.name }))]} />
          <Select label="نوع الطلب" name="type" value={createForm.type}
            onChange={e => setCreateForm(p => ({ ...p, type: e.target.value }))}
            options={Object.entries(ADJ_TYPES).map(([k, v]) => ({ value: k, label: v }))} />
          <Input label="تاريخ الدوام" name="workDate" type="date" value={createForm.workDate}
            onChange={e => setCreateForm(p => ({ ...p, workDate: e.target.value }))} dir="ltr" />
          <Input label="السبب" name="reason" value={createForm.reason}
            onChange={e => setCreateForm(p => ({ ...p, reason: e.target.value }))} placeholder="اشرح سبب الطلب..." required />
        </div>
      </Modal>    </div>
  );
}

// ============================================================
// REPORTS TAB
// ============================================================

function ReportsTab() {
  const [reportType, setReportType] = useState<"daily" | "monthly" | "employee">("daily");
  const [date, setDate] = useState(today());
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [empId, setEmpId] = useState("");

  const { data: staffRes } = useApi(() => staffApi.list(), []);
  const { data: dailyRes, loading: dLoad } = useApi(() => reportType === "daily" ? attendanceEngineApi.reportDaily(date) : Promise.resolve(null), [date, reportType]);
  const { data: monthlyRes, loading: mLoad } = useApi(() => reportType === "monthly" ? attendanceEngineApi.reportMonthly(year, month) : Promise.resolve(null), [year, month, reportType]);
  const { data: empRes, loading: eLoad } = useApi(() => reportType === "employee" && empId ? attendanceEngineApi.reportEmployee(empId) : Promise.resolve(null), [empId, reportType]);

  const allStaff: any[] = staffRes?.data || [];
  const loading = dLoad || mLoad || eLoad;

  const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  return (
    <div className="space-y-5">
      {/* Report type selector */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "daily", label: "تقرير يومي" },
          { key: "monthly", label: "تقرير شهري" },
          { key: "employee", label: "تقرير موظف" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setReportType(key as any)}
            className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition-colors", reportType === key ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        {reportType === "daily" && (
          <Input label="التاريخ" name="date" type="date" value={date} onChange={e => setDate(e.target.value)} dir="ltr" />
        )}
        {reportType === "monthly" && (
          <>
            <Select label="الشهر" name="month" value={String(month)} onChange={e => setMonth(parseInt(e.target.value))}
              options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))} />
            <Select label="السنة" name="year" value={String(year)} onChange={e => setYear(parseInt(e.target.value))}
              options={[2024, 2025, 2026].map(y => ({ value: String(y), label: String(y) }))} />
          </>
        )}
        {reportType === "employee" && (
          <Select label="الموظف" name="empId" value={empId} onChange={e => setEmpId(e.target.value)}
            options={[{ value: "", label: "اختر موظفاً" }, ...allStaff.map(s => ({ value: s.id, label: s.name }))]} />
        )}
      </div>

      {/* Report data */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 animate-pulse">جاري إنشاء التقرير...</div>
      ) : (
        <>
          {reportType === "daily" && dailyRes?.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(dailyRes.data.summary || {}).filter(([k]) => ["present","late","absent","on_leave"].includes(k)).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <p className={clsx("text-2xl font-bold", STATUS[k]?.color || "text-gray-700")}>{String(v)}</p>
                    <p className="text-xs text-gray-400 mt-1">{STATUS[k]?.label || k}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-50 bg-gray-50/40">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">الموظف</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الدخول</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الخروج</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الساعات</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                  </tr></thead>
                  <tbody>
                    {(dailyRes.data.rows || []).map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                        <td className="py-3 px-5 font-medium text-gray-900">{r.name}<p className="text-xs text-gray-400">{r.jobTitle}</p></td>
                        <td className="py-3 px-4 text-xs tabular-nums text-gray-600">{fmt(r.actualStart)}</td>
                        <td className="py-3 px-4 text-xs tabular-nums text-gray-600">{fmt(r.actualEnd)}</td>
                        <td className="py-3 px-4 text-xs text-gray-600">{r.workedMinutesFmt || "—"}</td>
                        <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportType === "monthly" && monthlyRes?.data && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-50 bg-gray-50/40">
                  <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">الموظف</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">أيام الحضور</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">أيام الغياب</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">ناقصة</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">ساعات العمل</th>
                </tr></thead>
                <tbody>
                  {(monthlyRes.data.rows || []).map((r: any, i: number) => {
                    const hrs = Math.floor((r.total_worked_minutes || 0) / 60);
                    const mins = (r.total_worked_minutes || 0) % 60;
                    return (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                        <td className="py-3 px-5 font-medium text-gray-900">{r.name}<p className="text-xs text-gray-400">{r.job_title}</p></td>
                        <td className="py-3 px-4 text-sm text-emerald-600 font-medium">{r.present_days}</td>
                        <td className="py-3 px-4 text-sm text-red-500 font-medium">{r.absent_days}</td>
                        <td className="py-3 px-4 text-sm text-orange-600">{r.incomplete_days}</td>
                        <td className="py-3 px-4 text-xs text-gray-600 tabular-nums">{hrs}س {mins}د</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {reportType === "employee" && empRes?.data && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-50 bg-gray-50/40">
                  <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">التاريخ</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الدخول</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الخروج</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                </tr></thead>
                <tbody>
                  {(empRes.data as any[]).map((r: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                      <td className="py-3 px-5 text-sm text-gray-700" dir="ltr">{r.date}</td>
                      <td className="py-3 px-4 text-xs tabular-nums text-gray-600">{fmt(r.actual_start_time)}</td>
                      <td className="py-3 px-4 text-xs tabular-nums text-gray-600">{fmt(r.actual_end_time)}</td>
                      <td className="py-3 px-4"><span className={clsx("text-xs px-2 py-0.5 rounded-full", r.status === "completed" ? "bg-emerald-50 text-emerald-700" : r.status === "no_show" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{r.status === "completed" ? "مكتمل" : r.status === "no_show" ? "غياب" : r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export function AttendancePage() {
  const [tab, setTab] = useState<Tab>("daily");

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "daily",       label: "لوحة اليوم",      icon: ClipboardCheck },
    { key: "schedules",   label: "جداول العمل",      icon: CalendarDays   },
    { key: "adjustments", label: "طلبات التصحيح",   icon: FileText       },
    { key: "policies",    label: "السياسات",         icon: Settings       },
    { key: "reports",     label: "التقارير",         icon: TrendingUp     },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-brand-500" /> الحضور والانصراف
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">إدارة جداول الدوام وتسجيلات الحضور والتقارير</p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-gray-50 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              tab === key ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "daily"       && <DailyTab onTabChange={setTab} />}
      {tab === "schedules"   && <SchedulesTab />}
      {tab === "adjustments" && <AdjustmentsTab />}
      {tab === "policies"    && <PoliciesTab />}
      {tab === "reports"     && <ReportsTab />}
    </div>
  );
}
