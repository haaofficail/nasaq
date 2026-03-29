import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, Search, Plus, Pencil, Phone, User, Upload,
  Trash2, Loader2, ChevronRight, ChevronLeft, AlertTriangle, IdCard,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";

const GRADE_GROUPS = [
  { label: "المرحلة الابتدائية", grades: ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"] },
  { label: "المرحلة المتوسطة",  grades: ["الأول المتوسط","الثاني المتوسط","الثالث المتوسط"] },
  { label: "المرحلة الثانوية",  grades: ["الأول الثانوي","الثاني الثانوي","الثالث الثانوي"] },
];

const GUARDIAN_RELATIONS = [
  { value: "father",   label: "الأب" },
  { value: "mother",   label: "الأم" },
  { value: "brother",  label: "الأخ" },
  { value: "sister",   label: "الأخت" },
  { value: "guardian", label: "ولي أمر" },
];

const emptyForm = {
  fullName: "",
  studentNumber: "",
  nationalId: "",
  classRoomId: "",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "",
};

export function SchoolStudentsPage() {
  const navigate = useNavigate();

  const [search,        setSearch]        = useState("");
  const [classRoomFilter, setClassRoomFilter] = useState("");
  const [gradeFilter,   setGradeFilter]   = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [page,          setPage]          = useState(1);
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; studentId?: string }>({
    open: false, mode: "add",
  });
  const [form,       setForm]       = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const filters: Record<string, string> = { page: String(page), limit: "50" };
  if (search)          filters.search      = search;
  if (classRoomFilter) filters.classRoomId = classRoomFilter;
  if (gradeFilter)     filters.grade       = gradeFilter;
  if (unassignedOnly)  filters.unassigned  = "true";

  const { data: studentsResp, loading, error, refetch } = useApi(
    () => schoolApi.listStudents(filters),
    [search, classRoomFilter, gradeFilter, unassignedOnly, page]
  );
  const { data: classRoomsData } = useApi(() => schoolApi.listClassRooms(), []);

  const students: any[]  = (studentsResp as any)?.data  ?? [];
  const total: number    = (studentsResp as any)?.total ?? 0;
  const pages: number    = (studentsResp as any)?.pages ?? 1;
  const classRooms: any[] = classRoomsData?.data ?? [];

  const resetFilters = () => {
    setSearch(""); setClassRoomFilter(""); setGradeFilter(""); setUnassignedOnly(false); setPage(1);
  };

  const openAdd = () => {
    setForm({ ...emptyForm });
    setModal({ open: true, mode: "add" });
  };

  const openEdit = (s: any) => {
    setForm({
      fullName:          s.fullName          ?? "",
      studentNumber:     s.studentNumber     ?? "",
      nationalId:        s.nationalId        ?? "",
      classRoomId:       s.classRoomId       ?? "",
      guardianName:      s.guardianName      ?? "",
      guardianPhone:     s.guardianPhone     ?? "",
      guardianRelation:  s.guardianRelation  ?? "",
    });
    setModal({ open: true, mode: "edit", studentId: s.id });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (modal.mode === "add") {
        await schoolApi.createStudent(form);
      } else if (modal.studentId) {
        await schoolApi.updateStudent(modal.studentId, form);
      }
      setModal({ open: false, mode: "add" });
      refetch();
    } catch {} finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`حذف الطالب "${name}"؟ لا يمكن التراجع.`)) return;
    setDeleting(id);
    try {
      await schoolApi.deleteStudent(id);
      refetch();
    } catch {} finally { setDeleting(null); }
  };

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الطلاب</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total} طالب مسجّل` : "إدارة بيانات الطلاب وأولياء الأمور"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/school/import")}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">استيراد</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة طالب
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالاسم، الرقم، أو الهوية..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        {/* Grade filter */}
        <select
          value={gradeFilter}
          onChange={(e) => { setGradeFilter(e.target.value); setClassRoomFilter(""); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="">كل الصفوف</option>
          {GRADE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Classroom filter */}
        <select
          value={classRoomFilter}
          onChange={(e) => { setClassRoomFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="">كل الفصول</option>
          {classRooms
            .filter((cr) => !gradeFilter || cr.grade === gradeFilter)
            .map((cr: any) => (
              <option key={cr.id} value={cr.id}>{cr.grade} / فصل {cr.name}</option>
            ))}
        </select>

        {/* Unassigned toggle */}
        <button
          onClick={() => { setUnassignedOnly(!unassignedOnly); setPage(1); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors ${
            unassignedOnly
              ? "bg-amber-50 border-amber-300 text-amber-700 font-semibold"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          بدون فصل
        </button>

        {(search || classRoomFilter || gradeFilter || unassignedOnly) && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-100 h-36" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-100 py-12 text-center text-red-400 text-sm">{error}</div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {unassignedOnly ? "لا يوجد طلاب بدون فصل" : "لا يوجد طلاب مطابقون"}
          </p>
          {!search && !classRoomFilter && !gradeFilter && !unassignedOnly && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => navigate("/school/import")}
                className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-50"
              >
                <Upload className="w-4 h-4" />
                استيراد Excel
              </button>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                إضافة طالب
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((s: any, idx: number) => {
              const hasClass    = !!s.classRoomId;
              const gradeLabel  = s.classRoomGrade ?? s.grade ?? null;
              const roomLabel   = s.classRoomName  ?? null;
              const initials    = s.fullName?.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("") ?? "؟";
              const rowNum      = (page - 1) * 50 + idx + 1;

              return (
                <div
                  key={s.id}
                  className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  {/* Number badge */}
                  <span className="absolute top-3 left-3 text-[10px] font-bold text-gray-300 tabular-nums">
                    #{rowNum}
                  </span>

                  {/* Top row: avatar + name + grade badge */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-sm select-none">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate leading-tight">{s.fullName}</p>
                      <div className="mt-1">
                        {hasClass ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                            {gradeLabel} · فصل {roomLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {gradeLabel ?? "غير مسند"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                      <IdCard className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="truncate tabular-nums">{s.nationalId || s.studentNumber || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="truncate tabular-nums">{s.guardianPhone || "—"}</span>
                    </div>
                    {s.guardianName && (
                      <div className="col-span-2 flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                        <User className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <span className="truncate">{s.guardianName}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions — show on hover */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`/school/students/${s.id}`)}
                      className="p-1.5 rounded-lg bg-white border border-gray-100 shadow-sm hover:bg-blue-50 hover:border-blue-200 text-gray-400 hover:text-blue-600 transition-colors"
                      title="ملف الطالب"
                    >
                      <IdCard className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 rounded-lg bg-white border border-gray-100 shadow-sm hover:bg-emerald-50 hover:border-emerald-200 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.fullName)}
                      disabled={deleting === s.id}
                      className="p-1.5 rounded-lg bg-white border border-gray-100 shadow-sm hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting === s.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3">
              <span className="text-xs text-gray-500">
                صفحة {page} من {pages} · {total} طالب
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  const pg = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                        pg === page ? "bg-emerald-600 text-white" : "hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: "add" })}
        title={modal.mode === "add" ? "إضافة طالب جديد" : "تعديل بيانات الطالب"}
        size="md"
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
              {submitting ? "جاري الحفظ..." : modal.mode === "add" ? "إضافة" : "حفظ التعديل"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب الكامل</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="الاسم الرباعي"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطالب</label>
              <input
                value={form.studentNumber}
                onChange={(e) => setForm((f) => ({ ...f, studentNumber: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="مثال: 2024001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهوية</label>
              <input
                value={form.nationalId}
                onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="10 أرقام"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">الفصل الدراسي</label>
              <select
                value={form.classRoomId}
                onChange={(e) => setForm((f) => ({ ...f, classRoomId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">اختر الفصل (اختياري)</option>
                {GRADE_GROUPS.map((group) => {
                  const groupRooms = classRooms.filter((cr) => group.grades.includes(cr.grade));
                  if (!groupRooms.length) return null;
                  return (
                    <optgroup key={group.label} label={group.label}>
                      {groupRooms
                        .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name))
                        .map((cr: any) => (
                          <option key={cr.id} value={cr.id}>{cr.grade} / فصل {cr.name}</option>
                        ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">بيانات ولي الأمر</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم ولي الأمر</label>
                <input
                  value={form.guardianName}
                  onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجوال</label>
                <input
                  value={form.guardianPhone}
                  onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="05xxxxxxxx"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">صلة القرابة</label>
                <select
                  value={form.guardianRelation}
                  onChange={(e) => setForm((f) => ({ ...f, guardianRelation: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                >
                  <option value="">اختر الصلة</option>
                  {GUARDIAN_RELATIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
