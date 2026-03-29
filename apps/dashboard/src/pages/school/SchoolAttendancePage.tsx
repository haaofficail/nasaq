import { useState, useEffect } from "react";
import {
  UserCheck, CheckCircle2, XCircle, Clock, BookOpen,
  Save, Loader2, ChevronRight, ChevronLeft, RefreshCw,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "present", label: "حاضر",   icon: CheckCircle2, bg: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { value: "absent",  label: "غائب",   icon: XCircle,      bg: "bg-red-50 border-red-200 text-red-700" },
  { value: "late",    label: "متأخر",  icon: Clock,        bg: "bg-amber-50 border-amber-200 text-amber-700" },
  { value: "excused", label: "مستأذن", icon: BookOpen,     bg: "bg-blue-50 border-blue-200 text-blue-700" },
];

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function prevDay(d: string) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - 1);
  return formatDate(dt);
}

function nextDay(d: string) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + 1);
  return formatDate(dt);
}

export function SchoolAttendancePage() {
  const [date,        setDate]        = useState(formatDate(new Date()));
  const [classRoomId, setClassRoomId] = useState("");
  const [records,     setRecords]     = useState<Record<string, string>>({});
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  const { data: classRoomsData }  = useApi(() => schoolApi.listClassRooms(), []);
  const classRooms: any[] = classRoomsData?.data ?? [];

  const { data: attendanceData, loading, refetch } = useApi(
    () => classRoomId ? schoolApi.getAttendance(classRoomId, date) : Promise.resolve(null),
    [classRoomId, date]
  );

  const studentRows: any[] = (attendanceData as any)?.data ?? [];

  // When data loads, initialize records from existing attendance
  useEffect(() => {
    if (!studentRows.length) return;
    const initial: Record<string, string> = {};
    for (const row of studentRows) {
      initial[row.id] = row.attendance?.status ?? "present";
    }
    setRecords(initial);
    setSaved(false);
  }, [attendanceData]);

  const setStatus = (studentId: string, status: string) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const markAll = (status: string) => {
    const updated: Record<string, string> = {};
    for (const s of studentRows) updated[s.id] = status;
    setRecords(updated);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!classRoomId || !studentRows.length) return;
    setSaving(true);
    try {
      const recordsArr = studentRows.map(s => ({
        studentId: s.id,
        status:    records[s.id] ?? "present",
      }));
      await schoolApi.saveAttendance({ classRoomId, date, records: recordsArr });
      setSaved(true);
      refetch();
    } catch {} finally { setSaving(false); }
  };

  const stats = {
    present: studentRows.filter(s => (records[s.id] ?? "present") === "present").length,
    absent:  studentRows.filter(s => records[s.id] === "absent").length,
    late:    studentRows.filter(s => records[s.id] === "late").length,
    excused: studentRows.filter(s => records[s.id] === "excused").length,
  };

  const today = formatDate(new Date());

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الحضور والغياب</h1>
          <p className="text-sm text-gray-500 mt-0.5">تسجيل الحضور اليومي للطلاب</p>
        </div>
        {classRoomId && studentRows.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? "تم الحفظ" : "حفظ الحضور"}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date picker with prev/next */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1">
          <button
            onClick={() => setDate(prevDay(date))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm text-gray-700 border-none outline-none bg-transparent px-1 tabular-nums"
          />
          <button
            onClick={() => { if (date < today) setDate(nextDay(date)); }}
            disabled={date >= today}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {date !== today && (
            <button
              onClick={() => setDate(today)}
              className="text-xs text-emerald-600 hover:text-emerald-700 px-2 border-r border-gray-200 mr-1"
            >
              اليوم
            </button>
          )}
        </div>

        {/* Classroom selector */}
        <select
          value={classRoomId}
          onChange={(e) => setClassRoomId(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="">اختر الفصل</option>
          {classRooms.map((cr: any) => (
            <option key={cr.id} value={cr.id}>{cr.grade} / فصل {cr.name}</option>
          ))}
        </select>

        {classRoomId && studentRows.length > 0 && (
          <>
            <button
              onClick={() => markAll("present")}
              className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              كل حاضر
            </button>
            <button
              onClick={() => markAll("absent")}
              className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
            >
              كل غائب
            </button>
          </>
        )}
      </div>

      {/* Stats bar */}
      {classRoomId && studentRows.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { key: "present", label: "حاضر",   cls: "bg-emerald-50 border-emerald-100 text-emerald-700" },
            { key: "absent",  label: "غائب",   cls: "bg-red-50 border-red-100 text-red-700" },
            { key: "late",    label: "متأخر",  cls: "bg-amber-50 border-amber-100 text-amber-700" },
            { key: "excused", label: "مستأذن", cls: "bg-blue-50 border-blue-100 text-blue-700" },
          ].map(({ key, label, cls }) => (
            <div key={key} className={`${cls} border rounded-2xl p-3 text-center`}>
              <p className="text-xl font-bold">{stats[key as keyof typeof stats]}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Student list */}
      {!classRoomId ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <UserCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600">اختر الفصل لبدء التسجيل</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-20" />
          ))}
        </div>
      ) : studentRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-sm text-gray-400">لا يوجد طلاب في هذا الفصل</p>
        </div>
      ) : (
        <div className="space-y-2">
          {studentRows.map((s: any, idx: number) => {
            const currentStatus = records[s.id] ?? "present";
            const activeOption  = STATUS_OPTIONS.find(o => o.value === currentStatus);
            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 hover:border-gray-200 transition-colors"
              >
                {/* Number + name */}
                <span className="text-xs text-gray-300 font-bold w-6 text-center shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{s.fullName}</p>
                  <p className="text-[11px] text-gray-400 tabular-nums">{s.studentNumber || s.nationalId || ""}</p>
                </div>

                {/* Status buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon    = opt.icon;
                    const active  = currentStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(s.id, opt.value)}
                        title={opt.label}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          active
                            ? opt.bg + " shadow-sm"
                            : "border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save footer */}
      {classRoomId && studentRows.length > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg transition-all ${
              saved
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "جاري الحفظ..." : saved ? "تم حفظ الحضور" : `حفظ حضور ${studentRows.length} طالب`}
          </button>
        </div>
      )}
    </div>
  );
}
