import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Search, Plus, Pencil, Phone, User, Upload } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";

const GUARDIAN_RELATIONS = [
  { value: "father", label: "الأب" },
  { value: "mother", label: "الأم" },
  { value: "brother", label: "الأخ" },
  { value: "sister", label: "الأخت" },
  { value: "guardian", label: "ولي أمر" },
];

const emptyForm = {
  full_name: "",
  student_number: "",
  class_room_id: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",
};

export function SchoolStudentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [classRoomFilter, setClassRoomFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; studentId?: string }>({
    open: false,
    mode: "add",
  });
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const filters: Record<string, string> = {};
  if (search) filters.search = search;
  if (classRoomFilter) filters.classRoomId = classRoomFilter;

  const { data: studentsData, loading, error, refetch } = useApi(
    () => schoolApi.listStudents(filters),
    [search, classRoomFilter]
  );
  const { data: classRoomsData } = useApi(() => schoolApi.listClassRooms(), []);

  const students: any[] = studentsData?.data ?? [];
  const classRooms: any[] = classRoomsData?.data ?? [];

  const openAdd = () => {
    setForm({ ...emptyForm });
    setModal({ open: true, mode: "add" });
  };

  const openEdit = (student: any) => {
    setForm({
      full_name: student.fullName ?? "",
      student_number: student.studentNumber ?? "",
      class_room_id: student.classRoomId ?? "",
      guardian_name: student.guardianName ?? "",
      guardian_phone: student.guardianPhone ?? "",
      guardian_relation: student.guardianRelation ?? "",
    });
    setModal({ open: true, mode: "edit", studentId: student.id });
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
    } catch {
      // handled by api layer
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الطلاب</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة بيانات الطلاب وأولياء الأمور</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/school/import")}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            title="استيراد طلاب من CSV"
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرقم..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <select
          value={classRoomFilter}
          onChange={(e) => setClassRoomFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
        >
          <option value="">كل الفصول</option>
          {classRooms.map((cr: any) => (
            <option key={cr.id} value={cr.id}>
              {cr.grade} / {cr.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : students.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-1">
              <GraduationCap className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">لا يوجد طلاب مسجلون</p>
            <p className="text-xs text-gray-400">أضف طلاباً يدوياً أو استورد ملف CSV لتعبئة سريعة</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => navigate("/school/import")}
                className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                استيراد CSV
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-right px-4 py-3 font-medium">اسم الطالب</th>
                  <th className="text-right px-4 py-3 font-medium">الرقم</th>
                  <th className="text-right px-4 py-3 font-medium">الفصل</th>
                  <th className="text-right px-4 py-3 font-medium">ولي الأمر</th>
                  <th className="text-right px-4 py-3 font-medium">الجوال</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600/10 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        {s.fullName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">{s.studentNumber}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.classRoomGrade} / {s.classRoomName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{s.guardianName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {s.guardianPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="الاسم الرباعي"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطالب</label>
              <input
                value={form.student_number}
                onChange={(e) => setForm((f) => ({ ...f, student_number: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="مثال: 2024001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفصل</label>
              <select
                value={form.class_room_id}
                onChange={(e) => setForm((f) => ({ ...f, class_room_id: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">اختر الفصل</option>
                {classRooms.map((cr: any) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.grade} / {cr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">بيانات ولي الأمر</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم ولي الأمر</label>
                <input
                  value={form.guardian_name}
                  onChange={(e) => setForm((f) => ({ ...f, guardian_name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجوال</label>
                <input
                  value={form.guardian_phone}
                  onChange={(e) => setForm((f) => ({ ...f, guardian_phone: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="05xxxxxxxx"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">صلة القرابة</label>
                <select
                  value={form.guardian_relation}
                  onChange={(e) => setForm((f) => ({ ...f, guardian_relation: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                >
                  <option value="">اختر الصلة</option>
                  {GUARDIAN_RELATIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
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
