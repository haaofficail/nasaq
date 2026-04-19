import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  DoorOpen, Users, UserPlus, ArrowRightLeft, Trash2,
  Search, ChevronLeft, X,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";

// ── Transfer Modal ─────────────────────────────────────────────────────────

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

  const sameGrade = classRooms.filter(
    (r) => r.grade === student?.classRoomGrade && r.id !== student?.classRoomId,
  );
  const available = sameGrade.length > 0
    ? sameGrade
    : classRooms.filter((r) => r.id !== student?.classRoomId);

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
            className="w-full rounded-xl border border-[#eef2f6] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">— اختر الفصل —</option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                فصل {r.name}{r.grade !== student?.classRoomGrade ? ` (${r.grade})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">سبب النقل (اختياري)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: طلب ولي الأمر، مشكلة تنظيمية..."
            className="w-full rounded-xl border border-[#eef2f6] px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#eef2f6] text-gray-600 text-sm hover:bg-[#f8fafc] transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Student Modal ──────────────────────────────────────────────────────

function AddStudentModal({
  open, onClose, classRoom, allStudents, onDone,
}: {
  open: boolean;
  onClose: () => void;
  classRoom: any;
  allStudents: any[];
  onDone: () => void;
}) {
  const [tab,        setTab]        = useState<"unassigned" | "new">("unassigned");
  const [query,      setQuery]      = useState("");
  const [newName,    setNewName]    = useState("");
  const [newNum,     setNewNum]     = useState("");
  const [saving,     setSaving]     = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const unassigned = allStudents.filter(
    (s) => !s.classRoomId && (!query || s.fullName?.includes(query) || s.studentNumber?.includes(query)),
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
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTab("unassigned")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === "unassigned" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
            )}
          >
            طلاب غير مسجلين في فصل
          </button>
          <button
            onClick={() => setTab("new")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
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
                className="w-full rounded-xl border border-[#eef2f6] px-3 py-2 pr-9 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-[#eef2f6] divide-y divide-gray-50">
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
                    selectedId === s.id ? "bg-emerald-50 text-emerald-700 font-semibold" : "hover:bg-[#f8fafc] text-gray-700",
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
                  className="w-full rounded-xl border border-[#eef2f6] px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">رقم الطالب</label>
                <input
                  value={newNum}
                  onChange={(e) => setNewNum(e.target.value)}
                  placeholder="S-001"
                  className="w-full rounded-xl border border-[#eef2f6] px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
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

// ── Fill Indicator ─────────────────────────────────────────────────────────

function FillBar({ count, capacity }: { count: number; capacity: number }) {
  const pct   = capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums shrink-0">{count} / {capacity || "—"}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function SchoolClassRoomDetailPage() {
  const { classRoomId } = useParams<{ classRoomId: string }>();
  const navigate        = useNavigate();

  const [search,         setSearch]         = useState("");
  const [transferring,   setTransferring]   = useState<any | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [removingId,     setRemovingId]     = useState<string | null>(null);

  // Load classroom info (from class list, reuse listClassRooms)
  const { data: crData, loading: crLoading } = useApi(
    () => schoolApi.listClassRooms(),
    [],
  );
  const allClassRooms: any[] = crData?.data ?? [];
  const classRoom = allClassRooms.find((r: any) => r.id === classRoomId) ?? null;

  // Load students in this classroom
  const { data: stuData, loading: stuLoading, refetch: refetchStudents } = useApi(
    () => schoolApi.listStudents({ classRoomId }),
    [classRoomId],
  );
  const students: any[] = stuData?.data ?? [];

  // All students (for add modal)
  const { data: allStuData } = useApi(() => schoolApi.listStudents({}), []);
  const allStudents: any[]   = allStuData?.data ?? [];

  const filtered = students.filter(
    (s) => !search || s.fullName?.includes(search) || s.studentNumber?.includes(search),
  );

  const handleRemove = async (student: any) => {
    if (!confirm(`إلغاء تسجيل "${student.fullName}" من هذا الفصل؟`)) return;
    setRemovingId(student.id);
    try {
      await schoolApi.updateStudent(student.id, { classRoomId: null });
      refetchStudents();
    } catch {} finally { setRemovingId(null); }
  };

  const handleDelete = async (student: any) => {
    if (!confirm(`حذف الطالب "${student.fullName}" نهائياً؟`)) return;
    setRemovingId(student.id);
    try {
      await schoolApi.deleteStudent(student.id);
      refetchStudents();
    } catch {} finally { setRemovingId(null); }
  };

  const loading = crLoading || stuLoading;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] flex flex-col">

      {/* ── Header ── */}
      <div className="bg-white border-b border-[#eef2f6] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/school/classes"
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            الفصول
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-emerald-100 flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              {crLoading ? (
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
              ) : classRoom ? (
                <>
                  <p className="text-lg font-black text-gray-900 leading-none">
                    {classRoom.grade} — فصل {classRoom.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {students.length} طالب
                    {classRoom.capacity ? ` · سعة ${classRoom.capacity}` : ""}
                    {classRoom.capacity > 0 && ` · متاح ${Math.max(0, classRoom.capacity - students.length)}`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">الفصل غير موجود</p>
              )}
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        {classRoom?.capacity > 0 && !crLoading && (
          <div className="hidden md:block w-48">
            <FillBar count={students.length} capacity={classRoom.capacity} />
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-gray-50 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الطالب أو رقمه..."
            className="w-full rounded-xl border border-[#eef2f6] px-3 py-2 pr-9 text-sm bg-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAddStudent(true)}
          disabled={!classRoom}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          إضافة طالب
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !classRoom ? (
          <div className="py-24 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <DoorOpen className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-700">الفصل غير موجود</p>
            <button
              onClick={() => navigate("/school/classes")}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
            >
              العودة للفصول
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-900 text-lg">
              {search ? "لا توجد نتائج" : "الفصل فارغ"}
            </p>
            {!search && (
              <button
                onClick={() => setShowAddStudent(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                إضافة أول طالب
              </button>
            )}
          </div>
        ) : (
          <>
            {search && (
              <p className="text-sm text-gray-500 mb-4">
                {filtered.length} نتيجة لـ &ldquo;{search}&rdquo;
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map((s, idx) => (
                <div
                  key={s.id}
                  className="group relative bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4 hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  {/* Avatar + number */}
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-[10px] bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-base shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-snug break-words">{s.fullName}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {s.studentNumber || s.nationalId || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Guardian phone */}
                  {s.guardianPhone && (
                    <p className="text-[11px] text-gray-400 truncate mb-2 pr-0.5">{s.guardianPhone}</p>
                  )}

                  {/* Student profile link */}
                  <Link
                    to={`/school/students/${s.id}`}
                    className="block w-full text-center py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors mb-1"
                  >
                    عرض الملف
                  </Link>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity border-t border-gray-50 pt-2 mt-1">
                    <button
                      onClick={() => setTransferring({ ...s, classRoomId: classRoomId, classRoomGrade: classRoom?.grade, classRoomName: classRoom?.name })}
                      title="نقل"
                      className="flex-1 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-0.5"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      نقل
                    </button>
                    <button
                      onClick={() => handleRemove(s)}
                      disabled={removingId === s.id}
                      title="إلغاء التسجيل"
                      className="flex-1 py-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-0.5"
                    >
                      <X className="w-3 h-3" />
                      إلغاء
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      disabled={removingId === s.id}
                      title="حذف"
                      className="flex-1 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      {!loading && classRoom && (
        <div className="bg-white border-t border-[#eef2f6] px-6 py-3 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>
            {filtered.length} طالب
            {search && ` (نتائج البحث من ${students.length})`}
          </span>
          {classRoom.capacity > 0 && (
            <span>
              متاح: {Math.max(0, classRoom.capacity - students.length)} من {classRoom.capacity}
            </span>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {transferring && (
        <TransferModal
          open={!!transferring}
          onClose={() => setTransferring(null)}
          student={transferring}
          classRooms={allClassRooms}
          onDone={() => { refetchStudents(); }}
        />
      )}

      {showAddStudent && classRoom && (
        <AddStudentModal
          open={showAddStudent}
          onClose={() => setShowAddStudent(false)}
          classRoom={classRoom}
          allStudents={allStudents}
          onDone={() => { refetchStudents(); }}
        />
      )}
    </div>
  );
}
