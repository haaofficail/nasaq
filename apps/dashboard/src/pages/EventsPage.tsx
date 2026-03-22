import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { PartyPopper, Plus, X, Calendar, MapPin, Users, Package } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";

const eventsApi = {
  list: () => api.get<{ data: any[] }>("/tickets/events"),
  create: (data: any) => api.post<{ data: any }>("/tickets/events", data),
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EventsPage() {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", venue: "", eventDate: "", maxCapacity: "" });

  const { data, loading, refetch } = useApi(() => eventsApi.list(), []);
  const createEvent = useMutation((d: any) => eventsApi.create(d));

  const events: any[] = data?.data || [];
  const upcoming = events.filter(e => new Date(e.event_date) >= new Date()).length;
  const past = events.filter(e => new Date(e.event_date) < new Date()).length;

  const save = async () => {
    if (!form.name.trim() || !form.eventDate) return;
    await createEvent.mutate({ ...form, maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : null });
    setModal(false);
    setForm({ name: "", description: "", venue: "", eventDate: "", maxCapacity: "" });
    refetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-brand-500" /> الفعاليات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{events.length} فعالية</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" /> فعالية جديدة
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "إجمالي", value: events.length, icon: PartyPopper, color: "text-brand-500 bg-brand-50" },
          { label: "قادمة", value: upcoming, icon: Calendar, color: "text-blue-600 bg-blue-50" },
          { label: "منتهية", value: past, icon: Package, color: "text-gray-500 bg-gray-100" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {events.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 text-center py-16">
              <PartyPopper className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد فعاليات</p>
              <button onClick={() => setModal(true)} className="mt-2 text-sm text-brand-500 hover:underline">أضف أول فعالية</button>
            </div>
          ) : (
            events.map((e: any) => {
              const isPast = new Date(e.event_date) < new Date();
              return (
                <div key={e.id} className={clsx("bg-white rounded-2xl border p-4 space-y-3", isPast ? "border-gray-100 opacity-75" : "border-brand-100")}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{e.name}</p>
                      {e.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{e.description}</p>}
                    </div>
                    <span className={clsx("px-2 py-0.5 rounded-lg text-xs font-medium shrink-0", isPast ? "bg-gray-100 text-gray-500" : "bg-brand-50 text-brand-600")}>
                      {isPast ? "منتهية" : "قادمة"}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {new Date(e.event_date).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                    {e.venue && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> {e.venue}</div>}
                    {e.max_capacity && <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 shrink-0" /> الطاقة: {e.max_capacity}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {modal && (
        <Modal title="فعالية جديدة" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم الفعالية *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: حفل موسيقي، معرض" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">التاريخ والوقت *</label>
                <input type="datetime-local" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الطاقة</label>
                <input type="number" value={form.maxCapacity} onChange={e => setForm(p => ({ ...p, maxCapacity: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="عدد التذاكر" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">المكان</label>
              <input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="اسم القاعة أو المكان" />
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={createEvent.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">حفظ</button>
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
