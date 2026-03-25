import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, MapPin, Phone, User, Banknote, Clock, CheckCircle, XCircle, Plus, Loader2, AlertCircle, CalendarClock, FileText, Sparkles, History } from "lucide-react";
import { clsx } from "clsx";
import { bookingsApi, salonApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "بانتظار التأكيد", cls: "bg-amber-50 text-amber-600" },
  confirmed: { label: "مؤكد", cls: "bg-blue-50 text-blue-600" },
  in_progress: { label: "قيد التنفيذ", cls: "bg-purple-50 text-purple-600" },
  completed: { label: "مكتمل", cls: "bg-green-50 text-green-600" },
  cancelled: { label: "ملغي", cls: "bg-red-50 text-red-500" },
};

const RESCHEDULE_REASONS = [
  { value: "customer_request",  label: "بطلب العميل" },
  { value: "staff_unavailable", label: "الموظف غير متاح" },
  { value: "emergency",         label: "طارئ" },
  { value: "double_booking",    label: "تعارض مواعيد" },
  { value: "other",             label: "أخرى" },
];

export function BookingDetailPage() {
  const { id } = useParams();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("customer_request");
  const [rescheduleNotes, setRescheduleNotes] = useState("");

  const [showVisitNote, setShowVisitNote] = useState(false);
  const [vn, setVn] = useState<Record<string, string>>({});

  const { data: res, loading, error, refetch } = useApi(() => bookingsApi.get(id!), [id]);
  const { data: eventsRes, refetch: refetchEvents } = useApi(() => bookingsApi.events(id!), [id]);
  const { mutate: updateStatus } = useMutation(({ status, reason }: any) => bookingsApi.updateStatus(id!, status, reason));
  const { mutate: addPayment, loading: paymentLoading } = useMutation((data: any) => bookingsApi.addPayment(id!, data));
  const { mutate: reschedule, loading: rescheduling } = useMutation((data: any) => bookingsApi.reschedule(id!, data));
  const { mutate: saveVisitNote, loading: savingNote } = useMutation((data: any) => salonApi.saveVisitNote(id!, data));

  const { data: existingNoteRes } = useApi(() => salonApi.visitNotes(id!), [id]);

  const booking = res?.data;

  const handleStatusChange = async (status: string) => {
    if (status === "cancelled" && !confirm("هل أنت متأكد من إلغاء الحجز؟")) return;
    await updateStatus({ status });
    refetch();
    refetchEvents();
  };

  const handleAddPayment = async () => {
    if (!paymentAmount) return;
    await addPayment({ amount: parseFloat(paymentAmount), method: paymentMethod });
    setShowPayment(false);
    setPaymentAmount("");
    refetch();
  };

  const openVisitNote = () => {
    const existing = existingNoteRes?.data?.[0];
    setVn({
      formula:        existing?.formula        || "",
      productsUsed:   existing?.productsUsed   || "",
      technique:      existing?.technique      || "",
      resultNotes:    existing?.resultNotes    || "",
      privateNotes:   existing?.privateNotes   || "",
      nextVisitIn:    existing?.nextVisitIn    ? String(existing.nextVisitIn) : "",
    });
    setShowVisitNote(true);
  };

  const handleSaveVisitNote = async () => {
    if (!booking) return;
    await saveVisitNote({
      customerId:   booking.customerId,
      formula:      vn.formula || null,
      productsUsed: vn.productsUsed || null,
      technique:    vn.technique || null,
      resultNotes:  vn.resultNotes || null,
      privateNotes: vn.privateNotes || null,
      nextVisitIn:  vn.nextVisitIn ? parseInt(vn.nextVisitIn) : null,
    });
    setShowVisitNote(false);
    refetch();
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    await reschedule({ eventDate: rescheduleDate, reason: rescheduleReason, notes: rescheduleNotes || undefined });
    setShowReschedule(false);
    setRescheduleDate("");
    setRescheduleNotes("");
    refetch();
  };

  if (loading) return <PageSkeleton />;
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-3"><AlertCircle className="w-10 h-10 text-red-400" /><p className="text-red-500">{error}</p><button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button></div>;
  if (!booking) return <div className="text-center py-12 text-gray-500">الحجز غير موجود</div>;

  const sc = statusConfig[booking.status] || statusConfig.pending;
  const paid = Number(booking.paidAmount || 0);
  const total = Number(booking.totalAmount || 0);
  const remaining = total - paid;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/bookings" className="p-2 rounded-lg hover:bg-gray-100"><ArrowRight className="w-5 h-5 text-gray-400" /></Link>
        <div className="flex-1"><h1 className="text-2xl font-bold text-gray-900">حجز #{booking.bookingNumber || id?.substring(0, 8)}</h1><p className="text-sm text-gray-500">{booking.customerName || booking.customer?.name}</p></div>
        <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", sc.cls)}>{sc.label}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">تفاصيل الحجز</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-gray-400" /><span className="text-gray-500">تاريخ الحدث</span><span className="font-medium mr-auto">{booking.eventDate ? fmtDate(booking.eventDate) : "—"}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><span className="text-gray-500">المدة</span><span className="font-medium mr-auto">{booking.eventDuration || "—"} ساعة</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /><span className="text-gray-500">الفرع</span><span className="font-medium mr-auto">{booking.locationName || "—"}</span></div>
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="text-gray-500">عدد الضيوف</span><span className="font-medium mr-auto">{booking.guestCount || "—"}</span></div>
            </div>
            {booking.notes && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-sm text-gray-500">ملاحظات: {booking.notes}</p></div>}
          </div>

          {/* Items */}
          {booking.items?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">بنود الحجز</h2>
              <div className="space-y-3">
                {booking.items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div><p className="text-sm font-medium text-gray-900">{item.serviceName || item.service?.name}</p><p className="text-xs text-gray-400">الكمية: {item.quantity}</p></div>
                    <span className="text-sm font-bold">{Number(item.totalPrice || item.unitPrice * item.quantity || 0).toLocaleString()} ر.س</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200"><span className="font-semibold">الإجمالي</span><span className="text-lg font-bold text-brand-600">{total.toLocaleString()} ر.س</span></div>
              </div>
            </div>
          )}

          {/* Payments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">المدفوعات</h2>
              {remaining > 0 && <button onClick={() => setShowPayment(true)} className="flex items-center gap-1 text-sm text-brand-500 hover:underline"><Plus className="w-4 h-4" /> تسجيل دفعة</button>}
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-green-600">المدفوع</p><p className="text-lg font-bold text-green-700">{paid.toLocaleString()}</p></div>
              <div className="bg-red-50 rounded-lg p-3 text-center"><p className="text-xs text-red-500">المتبقي</p><p className="text-lg font-bold text-red-600">{remaining.toLocaleString()}</p></div>
              <div className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-xs text-blue-600">الإجمالي</p><p className="text-lg font-bold text-blue-700">{total.toLocaleString()}</p></div>
            </div>
            {booking.payments?.length > 0 && booking.payments.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-500">{p.createdAt ? fmtDate(p.createdAt) : "—"} — {p.method === "cash" ? "نقداً" : p.method === "bank_transfer" ? "تحويل بنكي" : p.method}</span>
                <span className="font-bold text-green-600">+{Number(p.amount).toLocaleString()} ر.س</span>
              </div>
            ))}
          </div>
          {/* Audit Trail */}
          {eventsRes?.data && eventsRes.data.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-gray-400" />
                <h2 className="font-semibold text-gray-900">سجل الأحداث</h2>
              </div>
              <div className="relative space-y-0">
                {(eventsRes.data as any[]).map((ev: any, i: number) => {
                  const EVENT_LABELS: Record<string, string> = {
                    created: "تم إنشاء الحجز",
                    status_changed: "تغيير الحالة",
                    payment_received: "تم تسجيل دفعة",
                    rescheduled: "تم التأجيل",
                    assigned: "تم التعيين",
                    cancelled: "تم الإلغاء",
                    refunded: "تم الاسترداد",
                  };
                  const STATUS_LABELS: Record<string, string> = {
                    pending: "بانتظار التأكيد", confirmed: "مؤكد",
                    in_progress: "قيد التنفيذ", completed: "مكتمل",
                    cancelled: "ملغي", deposit_paid: "عربون مدفوع",
                    fully_confirmed: "مؤكد نهائياً",
                  };
                  const isLast = i === eventsRes.data!.length - 1;
                  return (
                    <div key={ev.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                        {!isLast && <div className="w-px flex-1 bg-gray-100 my-1" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {EVENT_LABELS[ev.eventType] || ev.eventType}
                          {ev.fromStatus && ev.toStatus && (
                            <span className="text-gray-400 font-normal"> — {STATUS_LABELS[ev.fromStatus] || ev.fromStatus} ← {STATUS_LABELS[ev.toStatus] || ev.toStatus}</span>
                          )}
                          {ev.eventType === "payment_received" && ev.metadata?.amount && (
                            <span className="text-green-600 font-normal"> — {Number(ev.metadata.amount).toLocaleString()} ر.س</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(ev.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        {ev.metadata?.reason && (
                          <p className="text-xs text-gray-500 mt-0.5">السبب: {ev.metadata.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">إجراءات</h3>
            <div className="space-y-2">
              {booking.status === "pending" && <button onClick={() => handleStatusChange("confirmed")} className="w-full bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-600">تأكيد الحجز</button>}
              {booking.status === "confirmed" && <button onClick={() => handleStatusChange("in_progress")} className="w-full bg-purple-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-purple-600">بدء التنفيذ</button>}
              {booking.status === "in_progress" && <button onClick={() => handleStatusChange("completed")} className="w-full bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-600">إكمال الحجز</button>}
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <button
                  onClick={() => {
                    const d = booking.eventDate ? new Date(booking.eventDate).toISOString().slice(0, 16) : "";
                    setRescheduleDate(d);
                    setShowReschedule(true);
                  }}
                  className="w-full bg-white border border-amber-200 text-amber-600 rounded-xl py-2.5 text-sm font-medium hover:bg-amber-50 flex items-center justify-center gap-2"
                >
                  <CalendarClock className="w-4 h-4" /> تأجيل / تحويل
                </button>
              )}
              {booking.status !== "cancelled" && booking.status !== "completed" && <button onClick={() => handleStatusChange("cancelled")} className="w-full bg-white border border-red-200 text-red-500 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50">إلغاء الحجز</button>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">العميل</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />{booking.customerName || booking.customer?.name}</div>
              {(booking.customerPhone || booking.customer?.phone) && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span dir="ltr">{booking.customerPhone || booking.customer?.phone}</span></div>}
            </div>
            {booking.customerId && (
              <a href={`/dashboard/customers/${booking.customerId}/beauty-card`}
                className="mt-3 flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                <Sparkles className="w-3.5 h-3.5" /> بطاقة الجمال
              </a>
            )}
          </div>

          {/* Visit Note (salon only) */}
          {(booking.status === "completed" || booking.status === "in_progress") && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">ملاحظات الزيارة</h3>
                <button onClick={openVisitNote} className="text-xs text-brand-500 hover:underline flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> {existingNoteRes?.data?.[0] ? "تعديل" : "إضافة"}
                </button>
              </div>
              {existingNoteRes?.data?.[0]?.formula ? (
                <p className="text-xs font-mono bg-gray-50 rounded-lg px-2 py-1.5 text-gray-700">
                  {existingNoteRes.data[0].formula}
                </p>
              ) : (
                <p className="text-xs text-gray-300">لم تُسجَّل ملاحظات بعد</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visit Note Modal */}
      <Modal open={showVisitNote} onClose={() => setShowVisitNote(false)} title="ملاحظات الزيارة" size="md"
        footer={<><Button variant="secondary" onClick={() => setShowVisitNote(false)}>إلغاء</Button><Button onClick={handleSaveVisitNote} loading={savingNote}>حفظ</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">الفورمولا (صبغة، علاج، إلخ)</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
              value={vn.formula || ""} onChange={e => setVn(v => ({ ...v, formula: e.target.value }))}
              placeholder="لوريال 7.1 + أوكسيجين 20 | 1:1 | 35 دقيقة" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">المنتجات المستخدمة</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={vn.productsUsed || ""} onChange={e => setVn(v => ({ ...v, productsUsed: e.target.value }))}
              placeholder="لوريال 7.1، أوكسيجين 20، ماسك البروتين" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">الأسلوب المستخدم</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={vn.technique || ""} onChange={e => setVn(v => ({ ...v, technique: e.target.value }))}
              placeholder="بالياج من المنتصف، قصة لاير" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">ملاحظات النتيجة</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2}
              value={vn.resultNotes || ""} onChange={e => setVn(v => ({ ...v, resultNotes: e.target.value }))}
              placeholder="النتيجة رائعة، العميلة سعيدة جداً" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">ملاحظات داخلية</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={vn.privateNotes || ""} onChange={e => setVn(v => ({ ...v, privateNotes: e.target.value }))}
              placeholder="لا تظهر للعميل" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">الزيارة القادمة بعد (أسابيع)</label>
            <input type="number" min="1" max="52" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={vn.nextVisitIn || ""} onChange={e => setVn(v => ({ ...v, nextVisitIn: e.target.value }))}
              placeholder="6" />
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal open={showReschedule} onClose={() => setShowReschedule(false)} title="تأجيل / تحويل الحجز" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowReschedule(false)}>إلغاء</Button><Button onClick={handleReschedule} loading={rescheduling} disabled={!rescheduleDate}>تأكيد</Button></>}>
        <div className="space-y-4">
          <Input
            label="الموعد الجديد"
            name="eventDate"
            type="datetime-local"
            value={rescheduleDate}
            onChange={e => setRescheduleDate(e.target.value)}
            required
          />
          <Select
            label="السبب"
            name="reason"
            value={rescheduleReason}
            onChange={e => setRescheduleReason(e.target.value)}
            options={RESCHEDULE_REASONS}
          />
          <Input
            label="ملاحظات إضافية"
            name="notes"
            value={rescheduleNotes}
            onChange={e => setRescheduleNotes(e.target.value)}
            placeholder="اختياري"
          />
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="تسجيل دفعة جديدة" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowPayment(false)}>إلغاء</Button><Button onClick={handleAddPayment} loading={paymentLoading}>تسجيل الدفعة</Button></>}>
        <div className="space-y-4">
          <Input label="المبلغ" name="amount" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} suffix="ر.س" dir="ltr" required placeholder={remaining.toString()} />
          <Select label="طريقة الدفع" name="method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} options={[
            { value: "cash", label: "نقداً" }, { value: "bank_transfer", label: "تحويل بنكي" }, { value: "mada", label: "مدى" }, { value: "credit_card", label: "بطاقة ائتمان" },
          ]} />
        </div>
      </Modal>
    </div>
  );
}
