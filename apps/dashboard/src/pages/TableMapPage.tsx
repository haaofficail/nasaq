import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { restaurantApi, customersApi } from "@/lib/api";
import { Armchair, Users, Plus, X, Check, Clock, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { confirmDialog } from "@/components/ui";
import { toast } from "@/hooks/useToast";

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  available: { label: "متاحة",    color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200" },
  occupied:  { label: "مشغولة",   color: "text-red-600",     bg: "bg-red-50",      border: "border-red-200" },
  reserved:  { label: "محجوزة",   color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-200" },
  cleaning:  { label: "تنظيف",    color: "text-blue-600",    bg: "bg-blue-50",     border: "border-blue-200" },
};

type Table = {
  id: string; number: string; section?: string; capacity: number;
  status: string; session_id?: string; guests?: number; seated_at?: string;
};

function TableCard({ table, onAction }: { table: Table; onAction: (t: Table) => void }) {
  const meta = STATUS_META[table.status] || STATUS_META.available;
  const elapsed = table.seated_at
    ? Math.floor((Date.now() - new Date(table.seated_at).getTime()) / 60000)
    : null;

  return (
    <button
      onClick={() => onAction(table)}
      className={clsx(
        "relative flex flex-col items-center justify-between p-4 rounded-2xl border-2 w-full aspect-square transition-all hover:shadow-md",
        meta.bg, meta.border
      )}
    >
      <div className="flex items-center justify-between w-full">
        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", meta.bg, meta.color, "border", meta.border)}>
          {meta.label}
        </span>
        <span className="text-xs text-gray-400">{table.capacity} <Users className="w-3 h-3 inline" /></span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <Armchair className={clsx("w-8 h-8", meta.color)} />
        <p className="font-bold text-gray-900 text-lg">{table.number}</p>
        {table.section && <p className="text-xs text-gray-400">{table.section}</p>}
      </div>

      <div className="h-5">
        {table.status === "occupied" && elapsed !== null && (
          <span className={clsx("text-xs font-semibold flex items-center gap-1",
            elapsed >= 90 ? "text-red-500" : elapsed >= 45 ? "text-amber-500" : "text-emerald-600"
          )}>
            <Clock className="w-3 h-3" /> {elapsed} د
          </span>
        )}
        {table.status === "occupied" && table.guests && (
          <span className="text-xs text-gray-500">{table.guests} ضيف</span>
        )}
      </div>
    </button>
  );
}

export function TableMapPage() {
  const { data, refetch } = useApi(() => restaurantApi.tables(), []);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [activeTable, setActiveTable] = useState<Table | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [seatGuests, setSeatGuests] = useState(2);
  const [newTable, setNewTable] = useState({ number: "", section: "", capacity: 4 });

  const seatMut    = useMutation(({ tableId, guests }: any) => restaurantApi.seatGuests(tableId, { guests }));
  const closeMut   = useMutation((sessionId: string) => restaurantApi.closeSession(sessionId));
  const statusMut  = useMutation(({ id, status }: any) => restaurantApi.setTableStatus(id, status));
  const createMut  = useMutation((data: any) => restaurantApi.createTable(data));
  const deleteMut  = useMutation((id: string) => restaurantApi.deleteTable(id));

  const tables: Table[] = data?.data || [];
  const sections = ["all", ...Array.from(new Set(tables.map(t => t.section).filter(Boolean) as string[]))];
  const filtered = sectionFilter === "all" ? tables : tables.filter(t => t.section === sectionFilter);

  const counts = {
    available: tables.filter(t => t.status === "available").length,
    occupied:  tables.filter(t => t.status === "occupied").length,
    reserved:  tables.filter(t => t.status === "reserved").length,
    cleaning:  tables.filter(t => t.status === "cleaning").length,
  };

  const handleTableAction = (table: Table) => setActiveTable(table);

  const handleSeat = async () => {
    if (!activeTable) return;
    await seatMut.mutate({ tableId: activeTable.id, guests: seatGuests });
    toast.success(`تم تسكين ${seatGuests} ضيف على طاولة ${activeTable.number}`);
    setActiveTable(null);
    refetch();
  };

  const handleClose = async () => {
    if (!activeTable?.session_id) return;
    await closeMut.mutate(activeTable.session_id);
    toast.info(`تم تفريغ طاولة ${activeTable.number}`);
    setActiveTable(null);
    refetch();
  };

  const handleStatusChange = async (status: string) => {
    if (!activeTable) return;
    await statusMut.mutate({ id: activeTable.id, status });
    toast.success(`تم تغيير حالة الطاولة`);
    setActiveTable(null);
    refetch();
  };

  const handleCreate = async () => {
    if (!newTable.number.trim()) return;
    const result = await createMut.mutate({ number: newTable.number.trim(), section: newTable.section || null, capacity: newTable.capacity });
    if (!result) return; // mutation failed — error toast already shown by useMutation
    toast.success(`تمت إضافة طاولة ${newTable.number}`);
    setNewTable({ number: "", section: "", capacity: 4 });
    setShowAddModal(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!activeTable) return;
    const ok = await confirmDialog({ title: `حذف طاولة ${activeTable.number}؟`, message: "سيتم حذف الطاولة نهائياً", danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    await deleteMut.mutate(activeTable.id);
    toast.success("تم حذف الطاولة");
    setActiveTable(null);
    refetch();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Armchair className="w-5 h-5 text-brand-500" /> خريطة الطاولات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{tables.length} طاولة</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600"
        >
          <Plus className="w-4 h-4" /> إضافة طاولة
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(counts).map(([status, count]) => {
          const meta = STATUS_META[status];
          return (
            <div key={status} className={clsx("rounded-2xl border p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all", meta.bg, meta.border)}>
              <Armchair className={clsx("w-5 h-5", meta.color)} />
              <div>
                <p className={clsx("text-lg font-bold tabular-nums", meta.color)}>{count}</p>
                <p className="text-xs text-gray-500">{meta.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section filter */}
      {sections.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sections.map(s => (
            <button
              key={s}
              onClick={() => setSectionFilter(s)}
              className={clsx("px-4 py-1.5 rounded-xl text-sm font-medium border transition-colors",
                sectionFilter === s ? "bg-brand-500 text-white border-brand-500" : "border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]"
              )}
            >
              {s === "all" ? "الكل" : s}
            </button>
          ))}
        </div>
      )}

      {/* Table grid */}
      {tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#eef2f6] text-center py-16">
          <Armchair className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">لا توجد طاولات — أضف طاولة للبدء</p>
          <button onClick={() => setShowAddModal(true)} className="bg-brand-500 text-white px-4 py-2 rounded-xl text-sm">
            إضافة طاولة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filtered.map(t => (
            <TableCard key={t.id} table={t} onAction={handleTableAction} />
          ))}
        </div>
      )}

      {/* Table action modal */}
      {activeTable && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6]">
              <h3 className="font-bold text-gray-900">طاولة {activeTable.number}</h3>
              <button onClick={() => setActiveTable(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {activeTable.status === "available" && (
                <>
                  <label className="text-sm text-gray-600">عدد الضيوف</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSeatGuests(g => Math.max(1, g - 1))} className="w-9 h-9 rounded-xl border border-[#eef2f6] text-gray-700 font-bold text-lg">−</button>
                    <span className="text-lg font-bold tabular-nums w-8 text-center">{seatGuests}</span>
                    <button onClick={() => setSeatGuests(g => Math.min(activeTable.capacity, g + 1))} className="w-9 h-9 rounded-xl border border-[#eef2f6] text-gray-700 font-bold text-lg">+</button>
                  </div>
                  <button onClick={handleSeat} disabled={seatMut.loading} className="w-full bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-600 disabled:opacity-60">
                    تسكين الضيوف
                  </button>
                </>
              )}
              {activeTable.status === "occupied" && (
                <button onClick={handleClose} disabled={closeMut.loading} className="w-full bg-gray-800 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-gray-900 disabled:opacity-60">
                  إغلاق الطاولة / تفريغها
                </button>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {["reserved", "cleaning", "available"].filter(s => s !== activeTable.status).map(s => (
                  <button key={s} onClick={() => handleStatusChange(s)} disabled={statusMut.loading}
                    className={clsx("py-2 rounded-xl text-sm font-medium border", STATUS_META[s].bg, STATUS_META[s].border, STATUS_META[s].color)}>
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
              <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 text-red-500 text-sm py-2 hover:bg-red-50 rounded-xl">
                <Trash2 className="w-4 h-4" /> حذف الطاولة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add table modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6]">
              <h3 className="font-bold text-gray-900">إضافة طاولة</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">رقم / اسم الطاولة *</label>
                <input
                  type="text"
                  value={newTable.number}
                  onChange={e => setNewTable(t => ({ ...t, number: e.target.value }))}
                  placeholder="مثال: 1 أو A3 أو VIP-1"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">القسم (اختياري)</label>
                <input
                  type="text"
                  value={newTable.section}
                  onChange={e => setNewTable(t => ({ ...t, section: e.target.value }))}
                  placeholder="اختر أو اكتب اسم القسم"
                  list="section-presets"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"
                />
                <datalist id="section-presets">
                  <option value="داخلي" />
                  <option value="خارجي" />
                  <option value="تراس" />
                  <option value="قسم العائلات" />
                  <option value="قسم الرجال" />
                  <option value="VIP" />
                  <option value="الطابق الأول" />
                  <option value="الطابق الثاني" />
                  <option value="خاص" />
                </datalist>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">السعة (عدد الأشخاص)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newTable.capacity}
                  onChange={e => setNewTable(t => ({ ...t, capacity: parseInt(e.target.value) || 4 }))}
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl border border-[#eef2f6] text-sm text-gray-600">إلغاء</button>
              <button onClick={handleCreate} disabled={createMut.loading || !newTable.number.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium disabled:opacity-60">
                <Check className="w-4 h-4" /> إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
