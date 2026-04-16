import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, MapPin, Phone, User, Banknote, Clock, CheckCircle, XCircle, Plus, Loader2, AlertCircle, CalendarClock, FileText, Sparkles, History, Link2, PlusCircle, RefreshCw, RotateCcw, UserCheck, UserCircle } from "lucide-react";
import { clsx } from "clsx";
import { bookingsApi, salonApi, settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { useBusiness } from "@/hooks/useBusiness";
import { success as hapticSuccess } from "@/lib/haptics";
import { Button, Modal, Input, Select, confirmDialog } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import { getMatrixForBusiness } from "@/lib/businessViewMatrix";

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

const PAY_METHODS = [
  { value: "cash",          label: "نقداً" },
  { value: "mada",          label: "مدى" },
  { value: "visa_master",   label: "فيزا / ماستر" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "apple_pay",     label: "Apple Pay" },
  { value: "payment_link",  label: "رابط دفع" },
];

export function BookingDetailPage() {
  const { id } = useParams();
  const biz = useBusiness();
  const matrix = getMatrixForBusiness(biz.key);
  const { data: orgProfileRes } = useApi(() => settingsApi.profile(), []);
  const orgSettings = orgProfileRes?.data?.settings || {};
  const customBookingFields = orgSettings.bookingFields || [];
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Complete booking modal — payment step before completion
  const [showComplete,       setShowComplete]       = useState(false);
  const [completePayAmount,  setCompletePayAmount]  = useState("");
  const [completePayMethod,  setCompletePayMethod]  = useState("cash");
  const [completing,         setCompleting]         = useState(false);

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("customer_request");
  const [rescheduleNotes, setRescheduleNotes] = useState("");

  const [showVisitNote, setShowVisitNote] = useState(false);
  const [vn, setVn] = useState<Record<string, string>>({});
  const [generatingLink, setGeneratingLink] = useState(false);

  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: res, loading, error, refetch } = useApi(() => bookingsApi.get(id!), [id]);
  const { data: eventsRes, refetch: refetchEvents } = useApi(() => bookingsApi.events(id!), [id]);
  const { data: timelineRes, refetch: refetchTimeline } = useApi(() => bookingsApi.timeline(id!), [id]);
  const { mutate: updateStatus } = useMutation((opts: { status: string; reason?: string; force?: boolean }) =>
    bookingsApi.updateStatus(id!, opts.status, { reason: opts.reason, force: opts.force }));
  const { mutate: addPayment, loading: paymentLoading } = useMutation((data: any) => bookingsApi.addPayment(id!, data));
  const { mutate: reschedule, loading: rescheduling } = useMutation((data: any) => bookingsApi.reschedule(id!, data));
  const { mutate: saveVisitNote, loading: savingNote } = useMutation((data: any) => salonApi.saveVisitNote(id!, data));

  const { data: existingNoteRes } = useApi(() => salonApi.visitNotes(id!), [id]);

  const booking = res?.data;
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleStatusChange = async (status: string) => {
    if (status === "cancelled") { setShowCancelConfirm(true); return; }
    setStatusError(null);
    try {
      await updateStatus({ status });
      if (status === "confirmed" || status === "completed") hapticSuccess();
      refetch();
      refetchEvents();
      refetchTimeline();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "حدث خطأ في تغيير الحالة";
      setStatusError(msg);
      toast.error(msg);
    }
  };

  const doCancelBooking = async () => {
    setShowCancelConfirm(false);
    setStatusError(null);
    try {
      await updateStatus({ status: "cancelled" });
      refetch();
      refetchEvents();
      refetchTimeline();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "حدث خطأ في الإلغاء";
      setStatusError(msg);
      toast.error(msg);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount) return;
    await addPayment({ amount: parseFloat(paymentAmount), method: paymentMethod });
    setShowPayment(false);
    setPaymentAmount("");
    refetch();
  };

  const handleCompleteBooking = async () => {
    setCompleting(true);
    setStatusError(null);
    try {
      if (completePayAmount && parseFloat(completePayAmount) > 0) {
        await addPayment({ amount: parseFloat(completePayAmount), method: completePayMethod, type: "payment" });
      }
      await updateStatus({ status: "completed" });
      hapticSuccess();
      setShowComplete(false);
      refetch();
      refetchEvents();
      refetchTimeline();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "حدث خطأ في إكمال الحجز";
      setStatusError(msg);
      toast.error(msg);
    } finally {
      setCompleting(false);
    }
  };

  const openVisitNote = () => {
    const existing = existingNoteRes?.data?.[0];
    const newVn: any = {};
    matrix.visitNoteFields.forEach(f => {
      newVn[f.key] = existing?.[f.key] || existing?.customFields?.[f.key] || "";
    });
    newVn.nextVisitIn = existing?.nextVisitIn ? String(existing.nextVisitIn) : "";
    newVn.privateNotes = existing?.privateNotes || "";
    setVn(newVn);
    setShowVisitNote(true);
  };

  const handleSaveVisitNote = async () => {
    if (!booking) return;
    const payload: any = {
      customerId: booking.customerId,
      nextVisitIn: vn.nextVisitIn ? parseInt(vn.nextVisitIn) : null,
      privateNotes: vn.privateNotes || null,
      customFields: {}
    };
    matrix.visitNoteFields.forEach(f => {
      if (['formula', 'productsUsed', 'technique', 'resultNotes', 'privateNotes'].includes(f.key)) {
         payload[f.key] = vn[f.key] || null;
      } else {
         payload.customFields[f.key] = vn[f.key] || null;
      }
    });
    
    await saveVisitNote(payload);
    setShowVisitNote(false);
    refetch();
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    await reschedule({ eventDate: new Date(rescheduleDate).toISOString(), reason: rescheduleReason, notes: rescheduleNotes || undefined });
    setShowReschedule(false);
    setRescheduleDate("");
    setRescheduleNotes("");
    refetch();
  };

  if (loading) return <PageSkeleton />;
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-3"><AlertCircle className="w-10 h-10 text-red-400" /><p className="text-red-500">{error}</p><button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button></div>;
  if (!booking) return <div className="text-center py-12 text-gray-500">{biz.terminology.booking} غير موجود</div>;

  const sc = statusConfig[booking.status] || statusConfig.pending;
  const paid = Number(booking.paidAmount || 0);
  const total = Number(booking.totalAmount || 0);
  const remaining = total - paid;

  const sla        = timelineRes?.sla;
  const timeline   = timelineRes?.data ?? [];
  const isStale    = sla?.isStale === true;
  const workflowMode = timeline.find((e: any) => e.workflowMode)?.workflowMode ?? null;

  // آخر سبب حجب (أحدث status_blocked event)
  const lastBlocked = [...timeline].reverse().find((e: any) => e.eventType === "status_blocked");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/bookings" className="p-2 rounded-lg hover:bg-gray-100"><ArrowRight className="w-5 h-5 text-gray-400" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{biz.terminology.booking} #{booking.bookingNumber || id?.substring(0, 8)}</h1>
          <p className="text-sm text-gray-500">{booking.customerName || booking.customer?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {isStale && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-3 h-3" /> متأخر
            </span>
          )}
          {workflowMode && workflowMode !== "legacy" && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-50 text-gray-400 border border-gray-100">
              {workflowMode}
            </span>
          )}
          <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", sc.cls)}>{sc.label}</span>
        </div>
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
              {booking.assignedUserName && (
                <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-gray-400" /><span className="text-gray-500">الموظف</span><span className="font-medium mr-auto">{booking.assignedUserName}</span></div>
              )}
              {!booking.assignedUserName && booking.guestCount > 0 && (
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="text-gray-500">عدد الأشخاص</span><span className="font-medium mr-auto">{booking.guestCount}</span></div>
              )}
            </div>
            {booking.customerNotes && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs font-medium text-gray-400 mb-1">ملاحظات العميل</p><p className="text-sm text-gray-700">{booking.customerNotes}</p></div>}
            {booking.notes && !booking.customerNotes && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-sm text-gray-500">ملاحظات: {booking.notes}</p></div>}
            {booking.questionAnswers && Array.isArray(booking.questionAnswers) && booking.questionAnswers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">إجابات أسئلة الحجز</p>
                {(booking.questionAnswers as any[]).map((qa: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">{qa.question || qa.questionId}</p>
                    <p className="text-sm text-gray-800 font-medium">{qa.answer}</p>
                  </div>
                ))}
              </div>
            )}
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
              {remaining > 0 && (
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowPayment(true)} className="flex items-center gap-1 text-sm text-brand-500 hover:underline"><Plus className="w-4 h-4" /> تسجيل دفعة</button>
                  <button
                    disabled={generatingLink}
                    onClick={async () => {
                      if (!id) return;
                      setGeneratingLink(true);
                      try {
                        const res: any = await bookingsApi.createPaymentLink(id);
                        if (res?.data?.transactionUrl) {
                          await navigator.clipboard.writeText(res.data.transactionUrl);
                          toast.success("تم نسخ رابط الدفع — أرسله للعميل عبر واتساب");
                        } else {
                          toast.error("فشل إنشاء رابط الدفع. تأكد من إعداد بوابة الدفع في صفحة الإعدادات.");
                        }
                      } finally {
                        setGeneratingLink(false);
                      }
                    }}
                    className="flex items-center gap-1 text-sm text-emerald-600 hover:underline disabled:opacity-50"
                  >
                    {generatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    رابط دفع إلكتروني
                  </button>
                </div>
              )}
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
                  const EVENT_ICON: Record<string, { Icon: React.ElementType; cls: string }> = {
                    created:         { Icon: PlusCircle,  cls: "text-emerald-500" },
                    status_changed:  { Icon: RefreshCw,   cls: "text-blue-500" },
                    payment_received:{ Icon: Banknote,    cls: "text-green-600" },
                    rescheduled:     { Icon: Clock,       cls: "text-amber-500" },
                    cancelled:       { Icon: XCircle,     cls: "text-red-500" },
                    assigned:        { Icon: UserCheck,   cls: "text-violet-500" },
                    refunded:        { Icon: RotateCcw,   cls: "text-gray-500" },
                  };
                  const eventIcon = EVENT_ICON[ev.eventType] ?? { Icon: RefreshCw, cls: "text-gray-400" };
                  const isLast = i === eventsRes.data!.length - 1;
                  return (
                    <div key={ev.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <eventIcon.Icon className={clsx("w-4 h-4 mt-0.5 shrink-0", eventIcon.cls)} />
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
                        {ev.performedByName && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <UserCircle className="w-3 h-3" />
                            بواسطة: {ev.performedByName}
                          </p>
                        )}
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
            {statusError && (
              <div className="flex items-start gap-2 p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{statusError}</span>
              </div>
            )}
            <div className="space-y-2">
              {booking.status === "pending" && <button onClick={() => handleStatusChange("confirmed")} className="w-full bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-600">تأكيد الحجز</button>}
              {booking.status === "confirmed" && <button onClick={() => handleStatusChange("in_progress")} className="w-full bg-purple-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-purple-600">بدء التنفيذ</button>}
              {booking.status === "in_progress" && (
                <button
                  onClick={() => { setCompletePayAmount(remaining > 0 ? String(remaining) : ""); setShowComplete(true); }}
                  className="w-full bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-600"
                >
                  إكمال الحجز وتسجيل الدفع
                </button>
              )}
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
            {booking.customerId && ["salon","barber","spa","fitness"].includes(biz.key) && (
              <a href={`/dashboard/customers/${booking.customerId}/beauty-card`}
                className="mt-3 flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                <Sparkles className="w-3.5 h-3.5" /> بطاقة الجمال
              </a>
            )}
          </div>

          {/* Operational Panel: SLA + Last Block + Timeline */}
          {timeline.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                السجل التشغيلي
              </h3>

              {/* SLA strip */}
              {sla && !sla.isStale && sla.thresholdSource !== "no_threshold" && (
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>وقت الحالة: {Math.round(sla.timeInCurrentStatusMs / 3600000)} ساعة من أصل {Math.round(sla.stalenessThresholdMs / 3600000)}</span>
                </div>
              )}
              {sla?.isStale && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-600">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>الحجز في هذه الحالة أطول من المتوقع ({Math.round(sla.timeInCurrentStatusMs / 3600000)} ساعة)</span>
                </div>
              )}

              {/* Last block warning */}
              {lastBlocked && (
                <div className="mb-3 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>آخر حجب: {(lastBlocked.metadata as any)?.blockReason ?? lastBlocked.reason ?? "انتهاك قواعد الـ workflow"}</span>
                </div>
              )}

              {/* Compact timeline — last 6 events, newest first */}
              <div className="space-y-2">
                {[...timeline].reverse().slice(0, 6).map((ev: any) => {
                  const typeLabel: Record<string, string> = {
                    status_changed:       "تغيير الحالة",
                    forced_transition:    "تجاوز إداري",
                    status_blocked:       "حجب الانتقال",
                    automation_triggered: "تشغيل تلقائي",
                    payment_received:     "دفعة مسجّلة",
                    rescheduled:          "تأجيل",
                    assigned:             "تعيين موظف",
                    created:              "إنشاء الحجز",
                    note_added:           "ملاحظة",
                    refunded:             "استرداد",
                    warning_emitted:      "تحذير",
                    cancelled:            "إلغاء",
                  };
                  const dotColor: Record<string, string> = {
                    forced_transition: "bg-red-400",
                    status_blocked:    "bg-amber-400",
                    automation_triggered: "bg-brand-400",
                    payment_received:  "bg-green-400",
                  };
                  return (
                    <div key={ev.id} className="flex items-start gap-2 text-xs">
                      <span className={clsx("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", dotColor[ev.eventType] ?? "bg-gray-300")} />
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700">{typeLabel[ev.eventType] ?? ev.eventType}</span>
                        {ev.toStatus && ev.eventType === "status_changed" && (
                          <span className="text-gray-400"> → {statusConfig[ev.toStatus]?.label ?? ev.toStatus}</span>
                        )}
                        {ev.forced && <span className="mr-1 text-red-400">(مُجاز)</span>}
                        {ev.actorName && <span className="text-gray-400"> — {ev.actorName}</span>}
                      </div>
                      <span className="text-gray-300 shrink-0">{new Date(ev.createdAt).toLocaleString("ar", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Booking Fields Display */}
          {customBookingFields.length > 0 && booking.customFields && Object.keys(booking.customFields).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                تفاصيل إضافية
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customBookingFields.map((f: any) => {
                  const val = booking.customFields[f.key];
                  if (val === undefined || val === null || val === "") return null;
                  return (
                    <div key={f.key}>
                      <span className="text-[11px] font-medium text-gray-400 block mb-0.5">{f.label}</span>
                      <span className="text-[13px] font-semibold text-gray-900">{typeof val === "boolean" ? (val ? "نعم" : "لا") : val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visit Note — Dynamic Engine */}
          {matrix.visitNoteFields.length > 0 && (booking.status === "completed" || booking.status === "in_progress") && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">التفاصيل والتنفيذ</h3>
                <button onClick={openVisitNote} className="text-xs text-brand-500 hover:underline flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> {existingNoteRes?.data?.[0] ? "تعديل" : "إضافة تقرير"}
                </button>
              </div>
              {existingNoteRes?.data?.[0]?.formula || existingNoteRes?.data?.[0]?.customFields?.formula || existingNoteRes?.data?.[0]?.customFields?.focusAreas || existingNoteRes?.data?.[0]?.customFields?.styleUsed ? (
                <p className="text-xs font-mono bg-gray-50 rounded-lg px-2 py-1.5 text-gray-700">
                  {existingNoteRes.data[0].formula || existingNoteRes.data[0].customFields?.formula || existingNoteRes.data[0].customFields?.focusAreas || existingNoteRes.data[0].customFields?.styleUsed}
                </p>
              ) : (
                <p className="text-xs text-gray-300">لم تُسجَّل التقارير بعد</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visit Note Modal Dynamic */}
      <Modal open={showVisitNote} onClose={() => setShowVisitNote(false)} title="تقرير التنفيذ" size="md"
        footer={<><Button variant="secondary" onClick={() => setShowVisitNote(false)}>إلغاء</Button><Button onClick={handleSaveVisitNote} loading={savingNote}>حفظ</Button></>}>
        <div className="space-y-4">
          {matrix.visitNoteFields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-gray-500 block mb-1">{f.label}</label>
              {f.type === "textarea" ? (
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2}
                  value={vn[f.key] || ""} onChange={e => setVn(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} />
              ) : f.type === "select" ? (
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                  value={vn[f.key] || ""} onChange={e => setVn(v => ({ ...v, [f.key]: e.target.value }))}>
                  <option value="">—</option>
                  {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
                  value={vn[f.key] || ""} onChange={e => setVn(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} />
              )}
            </div>
          ))}

          <div className="pt-3 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-500 block mb-1">توصيات إضافية - الزيارة القادمة بعد (أسابيع)</label>
            <input type="number" min="1" max="52" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={vn.nextVisitIn || ""} onChange={e => setVn(v => ({ ...v, nextVisitIn: e.target.value }))}
              placeholder="6" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">ملاحظات داخلية للطاقم (لا تظهر للعميل)</label>
            <input type="text" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={vn.privateNotes || ""} onChange={e => setVn(v => ({ ...v, privateNotes: e.target.value }))}
              placeholder="ملاحظات تشغيلية" />
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

      {/* Cancel Confirmation */}
      <Modal open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title="إلغاء الحجز" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowCancelConfirm(false)}>تراجع</Button><Button variant="danger" onClick={doCancelBooking}>نعم، ألغِ الحجز</Button></>}>
        <p className="text-sm text-gray-600">سيتم إلغاء الحجز ولا يمكن التراجع عن ذلك. هل أنت متأكد؟</p>
      </Modal>

      {/* Complete Booking — Payment Step */}
      <Modal
        open={showComplete}
        onClose={() => setShowComplete(false)}
        title="إكمال الحجز"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowComplete(false)}>تراجع</Button>
            <Button onClick={handleCompleteBooking} loading={completing} className="bg-green-600 hover:bg-green-700">
              تأكيد الإكمال
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Payment summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-green-600 mb-0.5">مدفوع</p>
              <p className="text-base font-bold text-green-700">{paid.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs text-red-500 mb-0.5">المتبقي</p>
              <p className="text-base font-bold text-red-600">{remaining.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">الإجمالي</p>
              <p className="text-base font-bold text-gray-700">{total.toLocaleString()} ر.س</p>
            </div>
          </div>

          {remaining > 0 && (
            <>
              <p className="text-sm font-medium text-gray-700">تسجيل الدفعة الأخيرة</p>
              <Input
                label="المبلغ المستلم"
                name="completeAmount"
                type="number"
                value={completePayAmount}
                onChange={e => setCompletePayAmount(e.target.value)}
                suffix="ر.س"
                dir="ltr"
                placeholder="0"
              />
              <Select
                label="طريقة الدفع"
                name="completeMethod"
                value={completePayMethod}
                onChange={e => setCompletePayMethod(e.target.value)}
                options={PAY_METHODS}
              />
              <p className="text-xs text-gray-400">اتركه فارغاً إذا لم تستلم دفعة الآن</p>
            </>
          )}

          {remaining === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 text-center font-medium">
              المبلغ مسدد بالكامل
            </div>
          )}

          <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            سيتم إرسال ملخص الحجز والفاتورة للعميل على واتساب تلقائياً بعد الإكمال.
          </p>
        </div>
      </Modal>
    </div>
  );
}
