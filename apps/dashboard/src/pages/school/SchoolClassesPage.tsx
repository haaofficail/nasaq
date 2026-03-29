import { useState, useCallback } from "react";
import {
  DoorOpen, Plus, Users, Trash2, X, ArrowRightLeft,
  UserPlus, ChevronLeft, Search, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";

// Saudi education system — 3 stages, 12 grades
const GRADE_GROUPS = [
  {
    label: "المرحلة الابتدائية",
    grades: [
      "الأول الابتدائي",
      "الثاني الابتدائي",
      "الثالث الابتدائي",
      "الرابع الابتدائي",
      "الخامس الابتدائي",
      "السادس الابتدائي",
    ],
  },
  {
    label: "المرحلة المتوسطة",
    grades: [
      "الأول المتوسط",
      "الثاني المتوسط",
      "الثالث المتوسط",
    ],
  },
  {
    label: "المرحلة الثانوية",
    grades: [
      "الأول الثانوي",
      "الثاني الثانوي",
      "الثالث الثانوي",
    ],
  },
];

// ── Grade sort order ─────────────────────────────────────
const GRADE_ORDER: Record<string, number> = {};
GRADE_GROUPS.forEach((group, gi) => {
  group.grades.forEach((g, i) => {
    GRADE_ORDER[g] = gi * 100 + i;
  });
});

const STAGE_FOR_GRADE: Record<string, string> = {};
GRADE_GROUPS.forEach((group) => {
  group.grades.forEach((g) => {
    STAGE_FOR_GRADE[g] = group.label;
  });
});

// Arabic letter sort order for classroom names (أ=0, ب=1, ج=2 ...)
const AR_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";
function arabicLetterOrder(name: string): number {
  const ch = name.trim()[0] ?? "";
  const idx = AR_LETTERS.indexOf(ch);
  return idx === -1 ? 999 : idx;
}

function GroupedClassRooms({
  classRooms,
  onEdit,
  onDelete,
  onOpen,
  deleting,
}: {
  classRooms: any[];
  onEdit: (cr: any) => void;
  onDelete: (id: string) => void;
  onOpen: (cr: any) => void;
  deleting: string | null;
}) {
  // Group by grade
  const byGrade = new Map<string, any[]>();
  [...classRooms]
    .sort((a, b) => {
      const gradeDiff = (GRADE_ORDER[a.grade] ?? 9999) - (GRADE_ORDER[b.grade] ?? 9999);
      if (gradeDiff !== 0) return gradeDiff;
      return arabicLetterOrder(a.name) - arabicLetterOrder(b.name);
    })
    .forEach((cr) => {
      if (!byGrade.has(cr.grade)) byGrade.set(cr.grade, []);
      byGrade.get(cr.grade)!.push(cr);
    });

  // Build display sections grouped by stage
  const sections = GRADE_GROUPS.map((group) => ({
    stageLabel: group.label,
    grades: group.grades.filter((g) => byGrade.has(g)).map((g) => ({
      grade: g,
      rooms: byGrade.get(g)!,
    })),
  })).filter((s) => s.grades.length > 0);

  // Grades not in our known structure (custom entries)
  const knownGrades = new Set(GRADE_GROUPS.flatMap((g) => g.grades));
  const unknownRooms = classRooms.filter((cr) => !knownGrades.has(cr.grade));

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.stageLabel}>
          {/* Stage header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              {section.stageLabel}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">
              {section.grades.reduce((n, g) => n + g.rooms.length, 0)} فصل
            </span>
          </div>

          {/* Grades within stage */}
          <div className="space-y-4">
            {section.grades.map(({ grade, rooms }) => (
              <div key={grade}>
                {/* Grade sub-header */}
                <p className="text-xs font-semibold text-gray-500 mb-2 pr-1">{grade}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {rooms.map((cr: any) => (
                    <div
                      key={cr.id}
                      onClick={() => onOpen(cr)}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-right hover:border-emerald-300 hover:shadow-md transition-all space-y-2.5 group relative cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                          <DoorOpen className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-lg font-black text-gray-900">{cr.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3 shrink-0" />
                        <span>{cr.studentCount ?? 0} طالب</span>
                      </div>
                      <FillIndicator count={cr.studentCount ?? 0} capacity={cr.capacity ?? 0} />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-gray-50">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(cr); }}
                          className="flex-1 py-1 text-xs text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(cr.id); }}
                          disabled={deleting === cr.id}
                          className="flex-1 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deleting === cr.id ? "..." : "حذف"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Unknown/custom grades */}
      {unknownRooms.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-black text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1">أخرى</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {unknownRooms.map((cr: any) => (
              <div
                key={cr.id}
                onClick={() => onOpen(cr)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-right hover:border-emerald-300 hover:shadow-md transition-all space-y-2.5 group relative cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                    <DoorOpen className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-lg font-black text-gray-900">{cr.name}</span>
                </div>
                <p className="text-[10px] text-gray-400 truncate">{cr.grade}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3 shrink-0" />
                  <span>{cr.studentCount ?? 0} طالب</span>
                </div>
                <FillIndicator count={cr.studentCount ?? 0} capacity={cr.capacity ?? 0} />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-gray-50">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(cr); }}
                    className="flex-1 py-1 text-xs text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(cr.id); }}
                    disabled={deleting === cr.id}
                    className="flex-1 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting === cr.id ? "..." : "حذف"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Classroom Detail Panel ───────────────────────────────────

function TransferModal({
  open, onClose, student, classRooms, onDone,
}: {
  open: boolean;
  onClose: () => void;
  student: any;
  classRooms: any[];
  onDone: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [reason,   setReason]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [errMsg,   setErrMsg]   = useState("");

  // Only show classrooms in the same grade
  const sameGrade = classRooms.filter(
    (r) => r.grade === student?.classRoomGrade && r.id !== student?.classRoomId
  );
  // If student has no classroom grade, show all
  const available = sameGrade.length > 0 ? sameGrade : classRooms.filter((r) => r.id !== student?.classRoomId);

  const handleTransfer = async () => {
    if (!targetId) return;
    setSaving(true);
    setErrMsg("");
    try {
      await schoolApi.transferStudent(student.id, { classRoomId: targetId, reason: reason || undefined });
      onDone();
      onClose();
    } catch (e: any) {
      setErrMsg(e?.message ?? "حدث خطأ");
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="نقل الطالب إلى فصل آخر">
      <div className="space-y-4 p-4">
        <div className="bg-emerald-50 rounded-xl px-3 py-2 text-sm text-emerald-800">
          <strong>{student?.fullName}</strong>
          {student?.classRoomGrade && (
            <span className="text-emerald-600"> · {student.classRoomGrade} / فصل {student.classRoomName}</span>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">الفصل الجديد (نفس الصف)</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">— اختر الفصل —</option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>فصل {r.name}{r.grade !== student?.classRoomGrade ? ` (${r.grade})` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">سبب النقل (اختياري)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: طلب ولي الأمر، مشكلة تنظيمية..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        {errMsg && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{errMsg}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTransfer}
            disabled={!targetId || saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "جاري النقل..." : "تأكيد النقل"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddStudentModal({
  open, onClose, classRoom, allStudents, onDone,
}: {
  open: boolean;
  onClose: () => void;
  classRoom: any;
  allStudents: any[];
  onDone: () => void;
}) {
  const [tab,     setTab]     = useState<"unassigned" | "new">("unassigned");
  const [query,   setQuery]   = useState("");
  const [newName, setNewName] = useState("");
  const [newNum,  setNewNum]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const unassigned = allStudents.filter(
    (s) => !s.classRoomId && (
      !query || s.fullName?.includes(query) || s.studentNumber?.includes(query)
    )
  );

  const handleAssign = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await schoolApi.updateStudent(selectedId, { classRoomId: classRoom.id });
      onDone();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await schoolApi.createStudent({
        fullName:      newName.trim(),
        studentNumber: newNum.trim() || null,
        classRoomId:   classRoom.id,
      });
      onDone();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`إضافة طالب — فصل ${classRoom?.name} (${classRoom?.grade})`}>
      <div className="space-y-4 p-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTab("unassigned")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === "unassigned" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            )}
          >
            طلاب غير مسجلين في فصل
          </button>
          <button
            onClick={() => setTab("new")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            )}
          >
            طالب جديد
          </button>
        </div>

        {tab === "unassigned" && (
          <>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم الطالب أو رقمه..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-9 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-50">
              {unassigned.length === 0 ? (
                <p className="py-6 text-sm text-gray-400 text-center">
                  {query ? "لا توجد نتائج" : "لا يوجد طلاب غير مسجلين في فصل"}
                </p>
              ) : unassigned.slice(0, 50).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={clsx(
                    "w-full text-right px-3 py-2 text-sm transition-colors flex items-center justify-between",
                    selectedId === s.id
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <span>{s.fullName}</span>
                  <span className="text-xs text-gray-400">{s.studentNumber ?? ""}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleAssign}
              disabled={!selectedId || saving}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "جاري الإضافة..." : "إضافة للفصل"}
            </button>
          </>
        )}

        {tab === "new" && (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">الاسم الكامل <span className="text-red-400">*</span></label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="اسم الطالب"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">رقم الطالب</label>
                <input
                  value={newNum}
                  onChange={(e) => setNewNum(e.target.value)}
                  placeholder="S-001"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || saving}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "جاري الإنشاء..." : "إنشاء الطالب وإضافته للفصل"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function ClassRoomDetailPanel({
  classRoom, allClassRooms, allStudents, onClose, onRefresh,
}: {
  classRoom: any;
  allClassRooms: any[];
  allStudents: any[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [search,         setSearch]         = useState("");
  const [transferring,   setTransferring]   = useState<any | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [removingId,     setRemovingId]     = useState<string | null>(null);

  const { data: stuData, loading: stuLoading, refetch: refetchStudents } = useApi(
    () => schoolApi.listStudents({ classRoomId: classRoom.id }),
    [classRoom.id]
  );
  const students: any[] = stuData?.data ?? [];

  const filtered = students.filter((s) =>
    !search || s.fullName?.includes(search) || s.studentNumber?.includes(search)
  );

  const handleRemove = async (student: any) => {
    if (!confirm(`إلغاء تسجيل "${student.fullName}" من هذا الفصل؟`)) return;
    setRemovingId(student.id);
    try {
      await schoolApi.updateStudent(student.id, { classRoomId: null });
      refetchStudents();
      onRefresh();
    } catch {} finally { setRemovingId(null); }
  };

  const handleDelete = async (student: any) => {
    if (!confirm(`حذف الطالب "${student.fullName}" نهائياً؟`)) return;
    setRemovingId(student.id);
    try {
      await schoolApi.deleteStudent(student.id);
      refetchStudents();
      onRefresh();
    } catch {} finally { setRemovingId(null); }
  };

  return (
    <>
      {/* Full-page overlay — completely replaces background to avoid overlap */}
      <div className="fixed inset-0 z-50 bg-white flex flex-col" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-l from-emerald-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-600 text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              الفصول
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg leading-none">
                {classRoom.grade} — فصل {classRoom.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {students.length} طالب
                {classRoom.capacity ? ` · سعة ${classRoom.capacity}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-50 bg-gray-50/60">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الفصل..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-8 text-xs bg-white focus:outline-none focus:border-emerald-400"
            />
          </div>
          <button
            onClick={() => setShowAddStudent(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            إضافة طالب
          </button>
        </div>

        {/* Student cards */}
        <div className="flex-1 overflow-y-auto p-6">
          {stuLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Users className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-bold text-gray-900">
                {search ? "لا توجد نتائج" : "الفصل فارغ"}
              </p>
              {!search && (
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  إضافة طالب
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filtered.map((s, idx) => (
                <div
                  key={s.id}
                  className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm p-3 hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  {/* Avatar + number */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-base shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-snug truncate">{s.fullName}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {s.studentNumber || s.nationalId || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Guardian */}
                  {s.guardianPhone && (
                    <p className="text-[10px] text-gray-400 truncate mb-2">{s.guardianPhone}</p>
                  )}

                  {/* Actions — appear on hover */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity border-t border-gray-50 pt-2 mt-1">
                    <button
                      onClick={() => setTransferring(s)}
                      title="نقل"
                      className="flex-1 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      نقل
                    </button>
                    <button
                      onClick={() => handleRemove(s)}
                      disabled={removingId === s.id}
                      title="إلغاء التسجيل"
                      className="flex-1 py-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      إلغاء
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      disabled={removingId === s.id}
                      title="حذف"
                      className="flex-1 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>{filtered.length} طالب{search ? " (نتائج البحث)" : ""}</span>
          {classRoom.capacity > 0 && (
            <span>متاح: {Math.max(0, classRoom.capacity - students.length)} من {classRoom.capacity}</span>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {transferring && (
        <TransferModal
          open={!!transferring}
          onClose={() => setTransferring(null)}
          student={transferring}
          classRooms={allClassRooms}
          onDone={() => { refetchStudents(); onRefresh(); }}
        />
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <AddStudentModal
          open={showAddStudent}
          onClose={() => setShowAddStudent(false)}
          classRoom={classRoom}
          allStudents={allStudents}
          onDone={() => { refetchStudents(); onRefresh(); }}
        />
      )}
    </>
  );
}

const emptyForm = { grade: "", name: "", capacity: "" };

function FillIndicator({ count, capacity }: { count: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {count} / {capacity}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Unassigned Students Repair Panel ─────────────────────────

function UnassignedStudentsPanel({
  unassigned,
  classRooms,
  onDone,
}: {
  unassigned: any[];
  classRooms: any[];
  onDone: () => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [targetRoom, setTargetRoom] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [done,       setDone]       = useState(false);

  const toggleAll = () => {
    if (selected.size === unassigned.length) setSelected(new Set());
    else setSelected(new Set(unassigned.map((s) => s.id)));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!targetRoom || selected.size === 0) return;
    setSaving(true);
    try {
      await schoolApi.assignStudentsToClassroom({ studentIds: [...selected], classRoomId: targetRoom });
      setDone(true);
      setSelected(new Set());
      setTargetRoom("");
      onDone();
    } catch {} finally { setSaving(false); }
  };

  if (unassigned.length === 0) return null;

  return (
    <div className={`rounded-2xl border ${done ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {done ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
          <span className="text-sm font-semibold text-gray-800">
            {done
              ? `تم توزيع الطلاب بنجاح`
              : `${unassigned.length} طالب غير مسند لفصل`}
          </span>
        </div>
        {!done && (
          <button
            onClick={() => setOpen(!open)}
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            {open ? "إخفاء" : "توزيع الآن"}
          </button>
        )}
      </div>

      {open && !done && (
        <div className="space-y-3">
          {/* Target classroom selector */}
          <div className="flex items-center gap-3">
            <select
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400"
            >
              <option value="">— اختر الفصل المستهدف —</option>
              {classRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.grade} / فصل {r.name}</option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!targetRoom || selected.size === 0 || saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? "جاري الإسناد..." : `إسناد (${selected.size})`}
            </button>
          </div>

          {/* Student list with checkboxes */}
          <div className="bg-white rounded-xl border border-gray-100 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <input
                type="checkbox"
                checked={selected.size === unassigned.length}
                onChange={toggleAll}
                className="rounded"
              />
              <span className="text-xs font-semibold text-gray-600">تحديد الكل ({unassigned.length})</span>
            </div>
            {unassigned.map((s) => (
              <label key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="rounded shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
                  <p className="text-xs text-gray-400">{s.grade || "الصف غير محدد"} · {s.studentNumber || s.nationalId || ""}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SchoolClassesPage() {
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; classId?: string }>({
    open: false,
    mode: "add",
  });
  const [form,              setForm]              = useState({ ...emptyForm });
  const [submitting,        setSubmitting]        = useState(false);
  const [deleting,          setDeleting]          = useState<string | null>(null);
  const [selectedClassRoom, setSelectedClassRoom] = useState<any | null>(null);

  const { data, loading, error, refetch } = useApi(() => schoolApi.listClassRooms(), []);
  const { data: allStudentsData }          = useApi(() => schoolApi.listStudents({}), []);
  const { data: unassignedData, refetch: refetchUnassigned } = useApi(() => schoolApi.listUnassignedStudents(), []);

  const classRooms: any[]    = data?.data ?? [];
  const allStudents: any[]   = allStudentsData?.data ?? [];
  const unassigned: any[]    = unassignedData?.data ?? [];

  const handleRepairDone = useCallback(() => {
    refetch();
    refetchUnassigned();
  }, [refetch, refetchUnassigned]);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setModal({ open: true, mode: "add" });
  };

  const openEdit = (cr: any) => {
    setForm({
      grade: cr.grade ?? "",
      name: cr.name ?? "",
      capacity: String(cr.capacity ?? ""),
    });
    setModal({ open: true, mode: "edit", classId: cr.id });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity) || 0 };
      if (modal.mode === "add") {
        await schoolApi.createClassRoom(payload);
      } else if (modal.classId) {
        await schoolApi.updateClassRoom(modal.classId, payload);
      }
      setModal({ open: false, mode: "add" });
      refetch();
    } catch {
      // handled by api layer
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الفصل؟ سيتم إلغاء ربط الطلاب المرتبطين به.")) return;
    setDeleting(id);
    try {
      await schoolApi.deleteClassRoom(id);
      refetch();
    } catch {}
    finally { setDeleting(null); }
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الفصول الدراسية</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة فصول المدرسة وطاقاتها الاستيعابية</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة فصل
        </button>
      </div>

      {/* Unassigned students repair panel */}
      {unassigned.length > 0 && (
        <UnassignedStudentsPanel
          unassigned={unassigned}
          classRooms={classRooms}
          onDone={handleRepairDone}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-36 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : classRooms.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
          <DoorOpen className="w-12 h-12" />
          <p className="text-sm">لا توجد فصول مضافة بعد</p>
          <button
            onClick={openAdd}
            className="mt-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700"
          >
            إضافة أول فصل
          </button>
        </div>
      ) : (
        <GroupedClassRooms classRooms={classRooms} onEdit={openEdit} onDelete={handleDelete} onOpen={setSelectedClassRoom} deleting={deleting} />
      )}

      {/* Classroom Detail Panel */}
      {selectedClassRoom && (
        <ClassRoomDetailPanel
          classRoom={selectedClassRoom}
          allClassRooms={classRooms}
          allStudents={allStudents}
          onClose={() => setSelectedClassRoom(null)}
          onRefresh={refetch}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: "add" })}
        title={modal.mode === "add" ? "إضافة فصل جديد" : "تعديل الفصل"}
        size="sm"
        footer={
          <>
            <button
              onClick={() => setModal({ open: false, mode: "add" })}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "جاري الحفظ..." : modal.mode === "add" ? "إضافة" : "حفظ"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الصف الدراسي</label>
            <select
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
            >
              <option value="">اختر الصف الدراسي</option>
              {GRADE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفصل</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="مثال: أ، ب، ج"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الطاقة الاستيعابية</label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="30"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
