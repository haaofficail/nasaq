import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight, User, Phone, Mail, Building2, Star, CalendarCheck,
  Banknote, MessageSquare, Plus, AlertCircle, Clock, FileText,
  CheckCircle2, XCircle, AlertTriangle, Send, ChevronLeft,
  CalendarDays, Hash, MapPin, Receipt, History, StickyNote,
} from "lucide-react";
import { clsx } from "clsx";
import { customersApi, bookingsApi, auditLogApi, financeApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, TextArea, Select } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

// ── helpers ─────────────────────────────────────────────────────
const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "معلق",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "مؤكد",   color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "مكتمل",  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "ملغي",   color: "bg-red-50 text-red-600 border-red-200" },
  no_show:   { label: "لم يحضر", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const INV_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  draft:          { label: "مسودة",         color: "bg-gray-100 text-gray-600 border-gray-200",        icon: Clock },
  issued:         { label: "صادرة",          color: "bg-blue-50 text-blue-700 border-blue-200",          icon: FileText },
  sent:           { label: "مُرسلة",         color: "bg-indigo-50 text-indigo-700 border-indigo-200",    icon: FileText },
  paid:           { label: "مدفوعة",         color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  partially_paid: { label: "جزئي",           color: "bg-teal-50 text-teal-700 border-teal-200",          icon: Clock },
  overdue:        { label: "متأخرة",         color: "bg-red-50 text-red-700 border-red-200",             icon: AlertTriangle },
  cancelled:      { label: "ملغاة",          color: "bg-gray-100 text-gray-500 border-gray-200",         icon: XCircle },
};

const MSG_STATUS: Record<string, { label: string; color: string }> = {
  sent:   { label: "مُرسلة", color: "bg-emerald-50 text-emerald-700" },
  failed: { label: "فشل",    color: "bg-red-50 text-red-600" },
  queued: { label: "في الانتظار", color: "bg-amber-50 text-amber-700" },
};

const MSG_CHANNEL: Record<string, string> = {
  whatsapp: "واتساب",
  sms:      "SMS",
  email:    "بريد",
  dashboard:"النظام",
};

const INT_TYPE: Record<string, string> = {
  note:     "ملاحظة",
  call:     "اتصال",
  whatsapp: "واتساب",
  email:    "بريد",
  meeting:  "اجتماع",
};

function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TABS = [
  { key: "profile",      label: "الملف الشخصي",  icon: User },
  { key: "bookings",     label: "الحجوزات",       icon: CalendarDays },
  { key: "invoices",     label: "الفواتير",        icon: Receipt },
  { key: "messages",     label: "الرسائل",         icon: MessageSquare },
  { key: "interactions", label: "التفاعلات",       icon: StickyNote },
  { key: "timeline",     label: "السجل",           icon: History },
];

// ── component ────────────────────────────────────────────────────
export function CustomerDetailPage() {
  const { id } = useParams();
  const [tab, setTab]                   = useState("profile");
  const [showInteraction, setShowInteraction] = useState(false);
  const [interactionType, setInteractionType] = useState("note");
  const [interactionContent, setInteractionContent] = useState("");
  const [sendingInv, setSendingInv]     = useState<string | null>(null);

  const { data: res, loading, error, refetch } = useApi(() => customersApi.get(id!), [id]);
  const { data: bookingsRes }  = useApi(() => bookingsApi.list({ customerId: id!, limit: "50" }), [id]);
  const { data: invoicesRes }  = useApi(() => financeApi.invoices({ customerId: id! }), [id]);
  const { data: timelineRes }  = useApi(() => auditLogApi.list({ resourceId: id!, limit: "50" }), [id]);

  const customer     = res?.data;
  const interactions = customer?.recentInteractions || [];
  const bookingList: any[] = bookingsRes?.data || [];
  const invoiceList: any[] = invoicesRes?.data || [];
  const timeline: any[]   = timelineRes?.data || [];

  // load messages lazily when messages tab is selected
  const { data: msgRes } = useApi(
    () => customer?.phone ? customersApi.messageLogs(customer.phone) : Promise.resolve({ data: [] }),
    [customer?.phone, tab === "messages"],
  );
  const messages: any[] = msgRes?.data || [];

  const { mutate: addInteraction, loading: addingInteraction } = useMutation(
    (data: any) => customersApi.addInteraction(id!, data),
  );

  const handleAddInteraction = async () => {
    if (!interactionContent.trim()) return;
    await addInteraction({ type: interactionType, content: interactionContent });
    setShowInteraction(false);
    setInteractionContent("");
    refetch();
  };

  const sendInvoice = async (invId: string) => {
    setSendingInv(invId);
    try {
      await financeApi.sendInvoice(invId);
      toast.success("تم إرسال الفاتورة");
    } catch { toast.error("فشل الإرسال"); }
    finally { setSendingInv(null); }
  };

  if (loading) return <PageSkeleton />;
  if (error)   return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );
  if (!customer) return <div className="text-center py-12 text-gray-500">العميل غير موجود</div>;

  const initials = customer.name?.charAt(0) || "؟";

  return (
    <div className="space-y-5">

      {/* ── breadcrumb ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/customers" className="hover:text-brand-500 transition-colors flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> العملاء
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">{customer.name}</span>
      </div>

      {/* ── customer header card ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* avatar */}
          <div className={clsx(
            "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0",
            customer.isVip ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-600",
          )}>
            {customer.type === "corporate" ? <Building2 className="w-8 h-8" /> : initials}
          </div>

          {/* info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              {customer.isVip && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                  <Star className="w-3 h-3" fill="currentColor" /> VIP
                </span>
              )}
              {customer.tier && customer.tier !== "regular" && (
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-200">
                  {customer.tier === "silver" ? "فضي" : customer.tier === "gold" ? "ذهبي" : customer.tier === "platinum" ? "بلاتيني" : customer.tier}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500 mt-2">
              {customer.phone && (
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-300" /><span dir="ltr">{customer.phone}</span></span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-300" />{customer.email}</span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-300" />{customer.city}</span>
              )}
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-300" />
                <span className="font-mono text-xs">{id?.substring(0, 8).toUpperCase()}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-gray-300" />
                {customer.createdAt ? fmtDate(customer.createdAt) : "—"}
              </span>
            </div>
          </div>

          {/* quick actions */}
          <div className="flex gap-2 flex-shrink-0">
            <Link to={`/bookings/new?customerId=${id}`}>
              <Button size="sm" variant="primary">
                <Plus className="w-4 h-4 ml-1" /> حجز جديد
              </Button>
            </Link>
            <button
              onClick={() => { setShowInteraction(true); setInteractionType("note"); }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <StickyNote className="w-4 h-4" /> ملاحظة
            </button>
          </div>
        </div>

        {/* stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-600">{customer.totalBookings || bookingList.length || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">إجمالي الحجوزات</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{fmt(customer.totalSpent || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">إجمالي الإنفاق ر.س</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{customer.loyaltyPoints || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">نقاط الولاء</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-700 mt-1">{customer.lastBookingDate ? fmtDate(customer.lastBookingDate) : "—"}</p>
            <p className="text-xs text-gray-400 mt-0.5">آخر حجز</p>
          </div>
        </div>
      </div>

      {/* ── tabs ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  tab === t.key
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700",
                )}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">

          {/* ── TAB: الملف الشخصي ─────────────────────────── */}
          {tab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* contact info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">بيانات التواصل</h3>
                <div className="space-y-2.5">
                  {[
                    { icon: Phone, label: "الجوال", value: customer.phone, dir: "ltr" as const },
                    { icon: Mail,  label: "البريد", value: customer.email },
                    { icon: Building2, label: "الشركة", value: customer.companyName },
                    { icon: MapPin, label: "المدينة", value: customer.city },
                    { icon: MessageSquare, label: "المصدر", value: customer.source },
                  ].filter(r => r.value).map(row => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="flex items-center gap-3 text-sm">
                        <Icon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span className="text-gray-400 w-16 flex-shrink-0">{row.label}</span>
                        <span className="text-gray-700 font-medium" dir={row.dir}>{row.value}</span>
                      </div>
                    );
                  })}
                  {customer.notes && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-800">
                      {customer.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* B2B contacts */}
              {customer.contacts?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">جهات الاتصال</h3>
                  <div className="space-y-2">
                    {customer.contacts.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.name}</p>
                          {c.role && <p className="text-xs text-gray-400">{c.role}</p>}
                        </div>
                        <span className="text-sm text-gray-500 font-mono" dir="ltr">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: الحجوزات ─────────────────────────────── */}
          {tab === "bookings" && (
            <div>
              {bookingList.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد حجوزات لهذا العميل</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["رقم الحجز", "الخدمة", "تاريخ الحدث", "المبلغ", "الحالة", ""].map(h => (
                          <th key={h} className="text-right pb-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookingList.map((b: any) => {
                        const st = BOOKING_STATUS[b.status] || { label: b.status, color: "bg-gray-100 text-gray-500 border-gray-200" };
                        return (
                          <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-2 font-mono text-xs text-brand-500">#{b.bookingNumber || b.id?.substring(0, 8)}</td>
                            <td className="py-3 px-2 text-gray-700">{b.serviceName || b.locationName || "—"}</td>
                            <td className="py-3 px-2 text-gray-500">{b.eventDate ? fmtDate(b.eventDate) : "—"}</td>
                            <td className="py-3 px-2 font-bold text-gray-800">{fmt(b.totalAmount)} ر.س</td>
                            <td className="py-3 px-2">
                              <span className={clsx("text-[11px] px-2 py-0.5 rounded-full font-medium border", st.color)}>{st.label}</span>
                            </td>
                            <td className="py-3 px-2 text-left">
                              <Link to={`/bookings/${b.id}`} className="text-xs text-brand-500 hover:underline">عرض</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: الفواتير ─────────────────────────────── */}
          {tab === "invoices" && (
            <div>
              {invoiceList.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد فواتير لهذا العميل</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["رقم الفاتورة", "تاريخ الإصدار", "الإجمالي", "المدفوع", "الحالة", ""].map(h => (
                          <th key={h} className="text-right pb-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceList.map((inv: any) => {
                        const st = INV_STATUS[inv.status] || INV_STATUS.draft;
                        const Icon = st.icon;
                        const canSend = ["issued","sent","overdue","partially_paid"].includes(inv.status);
                        return (
                          <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-2 font-mono text-xs text-brand-500">{inv.invoiceNumber}</td>
                            <td className="py-3 px-2 text-gray-500">{inv.issueDate ? fmtDate(inv.issueDate) : "—"}</td>
                            <td className="py-3 px-2 font-bold text-gray-800">{fmt(inv.totalAmount)} ر.س</td>
                            <td className="py-3 px-2 text-emerald-600 font-medium">{fmt(inv.paidAmount || 0)} ر.س</td>
                            <td className="py-3 px-2">
                              <span className={clsx("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border", st.color)}>
                                <Icon className="w-3 h-3" /> {st.label}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-left">
                              {canSend && (
                                <button
                                  onClick={() => sendInvoice(inv.id)}
                                  disabled={sendingInv === inv.id}
                                  className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-40 transition-colors"
                                >
                                  <Send className="w-3 h-3" /> إرسال
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: الرسائل ──────────────────────────────── */}
          {tab === "messages" && (
            <div>
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد رسائل مُرسلة لهذا العميل</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((msg: any) => {
                    const st = MSG_STATUS[msg.status] || { label: msg.status, color: "bg-gray-100 text-gray-500" };
                    return (
                      <div key={msg.id} className="flex gap-3 p-3.5 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-gray-500">{MSG_CHANNEL[msg.channel] || msg.channel}</span>
                            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full font-medium", st.color)}>{st.label}</span>
                            {msg.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{msg.category}</span>
                            )}
                            <span className="text-[10px] text-gray-400 mr-auto">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleString("ar-SA") : ""}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{msg.messageText}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: التفاعلات ────────────────────────────── */}
          {tab === "interactions" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{interactions.length} تفاعل مسجّل</p>
                <button
                  onClick={() => setShowInteraction(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 text-sm font-medium hover:bg-brand-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </button>
              </div>

              {interactions.length === 0 ? (
                <div className="text-center py-10">
                  <StickyNote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد ملاحظات أو تفاعلات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interactions.map((int: any) => (
                    <div key={int.id} className="flex gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                        <StickyNote className="w-4 h-4 text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">
                            {INT_TYPE[int.type] || int.type}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {int.createdAt ? new Date(int.createdAt).toLocaleString("ar-SA") : ""}
                          </span>
                        </div>
                        {int.subject && <p className="text-sm font-medium text-gray-700 mb-0.5">{int.subject}</p>}
                        <p className="text-sm text-gray-600 leading-relaxed">{int.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: السجل ────────────────────────────────── */}
          {tab === "timeline" && (
            <div>
              {timeline.length === 0 ? (
                <div className="text-center py-10">
                  <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد أحداث مسجّلة</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute right-[15px] top-0 bottom-0 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {timeline.map((entry: any) => {
                      const actionColors: Record<string, string> = {
                        created:  "bg-emerald-100 text-emerald-700",
                        updated:  "bg-blue-100 text-blue-700",
                        deleted:  "bg-red-100 text-red-700",
                        approved: "bg-violet-100 text-violet-700",
                        rejected: "bg-amber-100 text-amber-700",
                      };
                      const actionLabels: Record<string, string> = {
                        created: "تم الإنشاء", updated: "تم التعديل", deleted: "تم الحذف",
                        approved: "تمت الموافقة", rejected: "تم الرفض",
                      };
                      const resourceLabels: Record<string, string> = {
                        booking: "حجز", payment: "دفعة", customer: "العميل",
                        invoice: "فاتورة", service: "خدمة",
                      };
                      return (
                        <div key={entry.id} className="flex items-start gap-4 pr-8 relative">
                          <div className="absolute right-2.5 top-2 w-3.5 h-3.5 rounded-full border-2 border-white bg-gray-200 z-10" />
                          <div className="flex-1 min-w-0 pb-3 border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", actionColors[entry.action] || "bg-gray-100 text-gray-600")}>
                                {actionLabels[entry.action] || entry.action}
                              </span>
                              <span className="text-sm text-gray-600">{resourceLabels[entry.resource] || entry.resource}</span>
                              {entry.performedBy && (
                                <span className="text-xs text-gray-400">بواسطة: {entry.performedBy}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {entry.createdAt ? new Date(entry.createdAt).toLocaleString("ar-SA") : "—"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── add interaction modal ────────────────────────────── */}
      <Modal
        open={showInteraction}
        onClose={() => setShowInteraction(false)}
        title="إضافة تفاعل"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInteraction(false)}>إلغاء</Button>
            <Button onClick={handleAddInteraction} loading={addingInteraction}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="النوع"
            name="type"
            value={interactionType}
            onChange={e => setInteractionType(e.target.value)}
            options={[
              { value: "note",     label: "ملاحظة" },
              { value: "call",     label: "اتصال" },
              { value: "whatsapp", label: "واتساب" },
              { value: "email",    label: "بريد إلكتروني" },
              { value: "meeting",  label: "اجتماع" },
            ]}
          />
          <TextArea
            label="التفاصيل"
            name="content"
            value={interactionContent}
            onChange={e => setInteractionContent(e.target.value)}
            rows={4}
            required
            placeholder="اكتب تفاصيل التفاعل..."
          />
        </div>
      </Modal>

    </div>
  );
}
