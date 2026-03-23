import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { eventsApi } from "@/lib/api";
import {
  PartyPopper, Plus, X, Calendar, MapPin, Users, Package,
  Ticket, CheckCircle2, ChevronRight, BarChart2, Tag,
} from "lucide-react";
import { clsx } from "clsx";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:     { label: "مسودة",    cls: "bg-gray-100 text-gray-500" },
  published: { label: "منشورة",   cls: "bg-blue-50 text-blue-600" },
  ongoing:   { label: "جارية",    cls: "bg-green-50 text-green-700" },
  sold_out:  { label: "نفذت",     cls: "bg-orange-50 text-orange-600" },
  completed: { label: "منتهية",   cls: "bg-gray-100 text-gray-400" },
  cancelled: { label: "ملغاة",    cls: "bg-red-50 text-red-500" },
};

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300";

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-y-auto", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const EMPTY_EVENT = { name: "", description: "", startsAt: "", endsAt: "", venueName: "", venueCity: "", totalCapacity: "" };
const EMPTY_TT = { name: "", price: "", totalQuantity: "", description: "" };

export function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [createModal, setCreateModal]     = useState(false);
  const [ttModal, setTtModal]             = useState(false);
  const [form, setForm]                   = useState({ ...EMPTY_EVENT });
  const [ttForm, setTtForm]               = useState({ ...EMPTY_TT });

  const { data, loading, refetch } = useApi(() => eventsApi.list(), []);
  const { data: detailData, refetch: refetchDetail } = useApi(
    () => selectedEvent ? eventsApi.get(selectedEvent.id) : Promise.resolve(null),
    [selectedEvent?.id],
  );

  const createEvent   = useMutation((d: any) => eventsApi.create(d));
  const publishEvent  = useMutation((id: string) => eventsApi.updateStatus(id, "published"));
  const createTT      = useMutation((d: any) => eventsApi.createTicketType(selectedEvent!.id, d));

  const events: any[] = data?.data || [];
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startsAt) >= now).length;
  const ongoing  = events.filter(e => e.status === "ongoing").length;
  const totalSold = events.reduce((s: number, e: any) => s + (e.soldTickets ?? 0), 0);

  const ticketTypes: any[] = detailData?.data?.ticketTypes || [];

  const saveEvent = async () => {
    if (!form.name.trim() || !form.startsAt || !form.endsAt) return;
    await createEvent.mutate({
      ...form,
      totalCapacity: form.totalCapacity ? parseInt(form.totalCapacity) : null,
    });
    setCreateModal(false);
    setForm({ ...EMPTY_EVENT });
    refetch();
  };

  const saveTT = async () => {
    if (!ttForm.name.trim() || !ttForm.price || !ttForm.totalQuantity) return;
    await createTT.mutate({
      name: ttForm.name,
      description: ttForm.description || null,
      price: parseFloat(ttForm.price),
      totalQuantity: parseInt(ttForm.totalQuantity),
    });
    setTtModal(false);
    setTtForm({ ...EMPTY_TT });
    refetchDetail();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-brand-500" /> الفعاليات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{events.length} فعالية</p>
        </div>
        <button onClick={() => setCreateModal(true)}
          className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" /> فعالية جديدة
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي",     value: events.length, icon: PartyPopper, color: "text-brand-500 bg-brand-50" },
          { label: "قادمة",      value: upcoming,       icon: Calendar,    color: "text-blue-600 bg-blue-50" },
          { label: "جارية الآن", value: ongoing,        icon: BarChart2,   color: "text-green-600 bg-green-50" },
          { label: "تذاكر مبيعة",value: totalSold,      icon: Ticket,      color: "text-purple-600 bg-purple-50" },
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

      {/* Two-pane layout */}
      <div className="flex gap-4">
        {/* Events list */}
        <div className="flex-1 min-w-0 space-y-2">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <PartyPopper className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد فعاليات</p>
              <button onClick={() => setCreateModal(true)} className="mt-2 text-sm text-brand-500 hover:underline">أضف أول فعالية</button>
            </div>
          ) : events.map((e: any) => {
            const s = STATUS_MAP[e.status] ?? { label: e.status, cls: "bg-gray-100 text-gray-500" };
            const isSelected = selectedEvent?.id === e.id;
            return (
              <button key={e.id} onClick={() => setSelectedEvent(isSelected ? null : e)}
                className={clsx("w-full text-right bg-white rounded-2xl border p-4 transition-colors",
                  isSelected ? "border-brand-300 bg-brand-50/30" : "border-gray-100 hover:border-gray-200")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{e.name}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(e.startsAt).toLocaleDateString("ar-SA", { dateStyle: "medium" })}</span>
                      {e.venueName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.venueName}</span>}
                      {e.totalCapacity && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.soldTickets ?? 0}/{e.totalCapacity}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx("px-2 py-0.5 rounded-lg text-xs font-medium", s.cls)}>{s.label}</span>
                    <ChevronRight className={clsx("w-4 h-4 text-gray-300 transition-transform", isSelected && "rotate-90")} />
                  </div>
                </div>
                {/* Capacity bar */}
                {e.totalCapacity > 0 && (
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((e.soldTickets ?? 0) / e.totalCapacity) * 100)}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedEvent && (
          <div className="w-80 shrink-0 space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900 text-sm">{selectedEvent.name}</p>
                {selectedEvent.status === "draft" && (
                  <button
                    onClick={async () => { await publishEvent.mutate(selectedEvent.id); refetch(); setSelectedEvent((p: any) => ({ ...p, status: "published" })); }}
                    disabled={publishEvent.loading}
                    className="text-xs bg-brand-500 text-white px-3 py-1 rounded-lg hover:bg-brand-600 disabled:opacity-60">
                    نشر
                  </button>
                )}
              </div>
              {selectedEvent.description && (
                <p className="text-xs text-gray-400">{selectedEvent.description}</p>
              )}
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0" />
                  {new Date(selectedEvent.startsAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                {selectedEvent.venueName && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{selectedEvent.venueName}{selectedEvent.venueCity ? ` — ${selectedEvent.venueCity}` : ""}</div>}
                {selectedEvent.totalCapacity && (
                  <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 shrink-0" />
                    {selectedEvent.soldTickets ?? 0} من {selectedEvent.totalCapacity} تذكرة
                  </div>
                )}
              </div>
            </div>

            {/* Ticket types */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> أنواع التذاكر</p>
                <button onClick={() => setTtModal(true)}
                  className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> إضافة
                </button>
              </div>
              {ticketTypes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">لا توجد أنواع تذاكر بعد</p>
              ) : (
                <div className="space-y-2">
                  {ticketTypes.map((tt: any) => (
                    <div key={tt.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="font-medium text-gray-800">{tt.name}</p>
                        <p className="text-xs text-gray-400">{tt.soldQuantity ?? 0} / {tt.totalQuantity} تذكرة</p>
                      </div>
                      <p className="font-semibold text-gray-900 tabular-nums">{parseFloat(tt.price).toFixed(0)} ر.س</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <EventStats eventId={selectedEvent.id} />
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {createModal && (
        <Modal title="فعالية جديدة" onClose={() => setCreateModal(false)} wide>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم الفعالية *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inp} placeholder="مثال: حفل موسيقي، معرض فني" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الوصف</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={clsx(inp, "resize-none")} rows={2} placeholder="تفاصيل الفعالية..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">بداية الفعالية *</label>
                <input type="datetime-local" value={form.startsAt} onChange={e => setForm(p => ({ ...p, startsAt: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">نهاية الفعالية *</label>
                <input type="datetime-local" value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم المكان</label>
                <input value={form.venueName} onChange={e => setForm(p => ({ ...p, venueName: e.target.value }))}
                  className={inp} placeholder="قاعة الأفراح، المسرح الوطني..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">المدينة</label>
                <input value={form.venueCity} onChange={e => setForm(p => ({ ...p, venueCity: e.target.value }))}
                  className={inp} placeholder="الرياض" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الطاقة الاستيعابية</label>
              <input type="number" value={form.totalCapacity} onChange={e => setForm(p => ({ ...p, totalCapacity: e.target.value }))}
                className={inp} placeholder="اتركه فارغاً لعدم تحديد سقف" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveEvent} disabled={createEvent.loading}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                {createEvent.loading ? "جاري الحفظ..." : "إنشاء الفعالية"}
              </button>
              <button onClick={() => setCreateModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Ticket Type Modal */}
      {ttModal && selectedEvent && (
        <Modal title="نوع تذكرة جديد" onClose={() => setTtModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم النوع *</label>
              <input value={ttForm.name} onChange={e => setTtForm(p => ({ ...p, name: e.target.value }))}
                className={inp} placeholder="مثال: VIP، عام، مجاني" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الوصف</label>
              <input value={ttForm.description} onChange={e => setTtForm(p => ({ ...p, description: e.target.value }))}
                className={inp} placeholder="مزايا هذا النوع..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">السعر (ر.س) *</label>
                <input type="number" value={ttForm.price} onChange={e => setTtForm(p => ({ ...p, price: e.target.value }))}
                  className={inp} placeholder="0 للمجاني" min="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الكمية *</label>
                <input type="number" value={ttForm.totalQuantity} onChange={e => setTtForm(p => ({ ...p, totalQuantity: e.target.value }))}
                  className={inp} placeholder="عدد التذاكر" min="1" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveTT} disabled={createTT.loading}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                {createTT.loading ? "جاري الحفظ..." : "إضافة"}
              </button>
              <button onClick={() => setTtModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EventStats({ eventId }: { eventId: string }) {
  const { data } = useApi(() => eventsApi.stats(eventId), [eventId]);
  if (!data) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
      <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> إحصائيات</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-gray-900 tabular-nums">{data.checkedIn ?? 0}</p>
          <p className="text-gray-400">حضروا</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-gray-900 tabular-nums">{Math.round((data.occupancyRate ?? 0) * 100)}%</p>
          <p className="text-gray-400">إشغال</p>
        </div>
      </div>
      {(data.revenueByType ?? []).map((rt: any) => (
        <div key={rt.ticketTypeId} className="flex items-center justify-between text-xs">
          <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" />{rt.name}</span>
          <span className="font-semibold text-gray-800">{parseFloat(rt.revenue ?? 0).toFixed(0)} ر.س</span>
        </div>
      ))}
    </div>
  );
}
