import { useState } from "react";
import { DoorOpen, Plus, Users } from "lucide-react";
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

export function SchoolClassesPage() {
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; classId?: string }>({
    open: false,
    mode: "add",
  });
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error, refetch } = useApi(() => schoolApi.listClassRooms(), []);

  const classRooms: any[] = data?.data ?? [];

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {classRooms.map((cr: any) => (
            <button
              key={cr.id}
              onClick={() => openEdit(cr)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-right hover:border-emerald-300 hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <DoorOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs text-gray-400 mt-1">{cr.grade}</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {cr.grade} / {cr.name}
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  {cr.studentCount} طالب
                </div>
              </div>
              <FillIndicator count={cr.studentCount ?? 0} capacity={cr.capacity ?? 0} />
            </button>
          ))}
        </div>
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
