import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  User, Phone, Mail, Building2, Star, CalendarCheck,
  Banknote, MessageSquare, Plus, AlertCircle, Clock, FileText,
  CheckCircle2, XCircle, AlertTriangle, Send,
  CalendarDays, Hash, MapPin, Receipt, History, StickyNote, Pencil, Save,
} from "lucide-react";
import { clsx } from "clsx";
import { customersApi, bookingsApi, auditLogApi, financeApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { useBusiness } from "@/hooks/useBusiness";
import { Button, Modal, TextArea, Select, Input, Breadcrumb } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

// ── helpers ─────────────────────────────────────────────────────
const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "معلق",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "مؤكد",   color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "مكتمل",  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "ملغي",   color: "bg-red-50 text-red-600 border-red-200" },
  no_show:   { label: "لم يحضر", color: "bg-gray-100 text-gray-500 border-[#eef2f6]" },
};

const INV_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  draft:          { label: "مسودة",         color: "bg-gray-100 text-gray-600 border-[#eef2f6]",        icon: Clock },
  issued:         { label: "صادرة",          color: "bg-blue-50 text-blue-700 border-blue-200",          icon: FileText },
  sent:           { label: "مُرسلة",         color: "bg-indigo-50 text-indigo-700 border-indigo-200",    icon: FileText },
  paid:           { label: "مدفوعة",         color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  partially_paid: { label: "جزئي",           color: "bg-teal-50 text-teal-700 border-teal-200",          icon: Clock },
  overdue:        { label: "متأخرة",         color: "bg-red-50 text-red-700 border-red-200",             icon: AlertTriangle },
  cancelled:      { label: "ملغاة",          color: "bg-gray-100 text-gray-500 border-[#eef2f6]",         icon: XCircle },
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

// ── component ────────────────────────────────────────────────────
export function CustomerDetailPage() {
  const { id } = useParams();
  const biz = useBusiness();

  const TABS = [
    { key: "profile",      label: "الملف الشخصي",       icon: User },
    { key: "bookings",     label: biz.terminology.bookings, icon: CalendarDays },
    { key: "invoices",     label: "الفواتير",              icon: Receipt },
    { key: "messages",     label: "الرسائل",               icon: MessageSquare },
    { key: "interactions", label: "التفاعلات",             icon: StickyNote },
    { key: "timeline",     label: "السجل",                 icon: History },
  ];
  const [tab, setTab]                   = useState("profile");
  const [showInteraction, setShowInteraction] = useState(false);
  const [interactionType, setInteractionType] = useState("note");
  const [interactionContent, setInteractionContent] = useState("");
  const [sendingInv, setSendingInv]     = useState<string | null>(null);
  const [editOpen, setEditOpen]         = useState(false);
  const [editSaving, setEditSaving]     = useState(false);
  const [editForm, setEditForm]         = useState({
    name: "", phone: "", email: "", city: "",
    type: "individual", companyName: "", notes: "",
    tier: "regular", tagInput: "",
  });
  const [editTags, setEditTags]         = useState<string[]>([]);

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

  const openEdit = () => {
    if (!customer) return;
    setEditForm({
      name:        customer.name        || "",
      phone:       customer.phone       || "",
      email:       customer.email       || "",
      city:        customer.city        || "",
      type:        customer.type        || "individual",
      companyName: customer.companyName || "",
      notes:       customer.notes       || "",
      tier:        customer.tier        || "regular",
      tagInput:    "",
    });
    setEditTags(customer.tags || []);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) return;
    setEditSaving(true);
    try {
      await customersApi.update(id!, {
        name:        editForm.name.trim(),
        phone:       editForm.phone.trim()       || null,
        email:       editForm.email.trim()       || null,
        city:        editForm.city.trim()        || null,
        type:        editForm.type,
        companyName: editForm.companyName.trim() || null,
        notes:       editForm.notes.trim()       || null,
        tier:        editForm.tier,
        tags:        editTags,
      });
      toast.success("تم حفظ بيانات العميل");
      setEditOpen(false);
      refetch();
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setEditSaving(false);
    }
  };

  const sendInvoice = async (invId: string) => {
    if (!confirm("هل تريد إرسال هذه الفاتورة للعميل؟")) return;
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
  if (!customer) return <div className="text-center py-12 text-gray-500">{biz.terminology.client} غير موجود</div>;

  const initials = customer.name?.charAt(0) || "؟";

  return (
    <div className="space-y-5">

      {/* ── breadcrumb ─────────────────────────────────────── */}
      <Breadcrumb items={[
        { label: "العملاء", href: "/dashboard/customers" },
        { label: customer?.name || "تفاصيل العميل" },
      ]} />

      {/* ── customer hero ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#eef2f6]">
        {/* top: avatar + info + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-6 pb-5">
          {/* avatar */}
          <div className={clsx(
            "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0",
            customer.tier === "vip" ? "bg-amber-100 text-amber-700" :
            customer.type === "business" ? "bg-violet-100 text-violet-700" :
            "bg-brand-50 text-brand-600",
          )}>
            {customer.type === "business" ? <Building2 className="w-8 h-8" /> : initials}
          </div>

          {/* info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              {customer.tier === "vip" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                  <Star className="w-3 h-3" fill="currentColor" /> VIP
                </span>
              )}
              {customer.tier === "enterprise" && (
                <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-200">
                  مؤسسة
                </span>
              )}
              {(customer.tags || []).map((t: string) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">{t}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-brand-500 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-gray-300" /><span dir="ltr">{customer.phone}</span>
                </a>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-300" />{customer.email}</span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-300" />{customer.city}</span>
              )}
              {customer.source && (
                <span className="flex items-center gap-1.5 text-gray-400 text-xs">المصدر: {customer.source}</span>
              )}
              <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                <CalendarCheck className="w-3 h-3 text-gray-300" />
                عميل منذ {customer.createdAt ? fmtDate(customer.createdAt) : "—"}
              </span>
            </div>
          </div>

          {/* quick actions */}
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <Link to={`/dashboard/bookings/new?customerId=${id}`}>
              <Button size="sm" variant="primary">
                <Plus className="w-4 h-4 ml-1" /> {biz.terminology.newBooking}
              </Button>
            </Link>
            <button
              onClick={openEdit}
              className="px-3 py-1.5 rounded-lg border border-[#eef2f6] text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" /> تعديل
            </button>
            <button
              onClick={() => { setShowInteraction(true); setInteractionType("note"); }}
              className="px-3 py-1.5 rounded-lg border border-[#eef2f6] text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors flex items-center gap-1.5"
            >
              <StickyNote className="w-4 h-4" /> ملاحظة
            </button>
          </div>
        </div>

        {/* stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-gray-100 border-t border-[#eef2f6]">
          <div className="px-6 py-4 text-center">
            <p className="text-2xl font-bold text-brand-600 tabular-nums">{customer.totalBookings || bookingList.length || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">{biz.terminology.bookings}</p>
          </div>
          <div className="px-6 py-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{fmt(customer.totalSpent || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">إجمالي الإنفاق ر.س</p>
          </div>
          <div className="px-6 py-4 text-center">
            <p className="text-2xl font-bold text-violet-600 tabular-nums">{customer.loyaltyPoints || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">نقاط الولاء</p>
          </div>
          <div className="px-6 py-4 text-center">
            <p className="text-sm font-bold text-gray-700 tabular-nums mt-1">
              {customer.lastBookingAt ? fmtDate(customer.lastBookingAt) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">آخر {biz.terminology.booking}</p>
          </div>
        </div>
      </div>

      {/* ── tab bar — part of the page, not a card ─────────── */}
      <div className="flex overflow-x-auto border-b border-[#eef2f6] bg-white rounded-2xl px-2 gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-[6px] text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
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

      {/* ── tab content — open sections, no outer frame ──── */}
      <div>

          {/* ── TAB: الملف الشخصي ─────────────────────────── */}
          {tab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* contact info */}
              <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">بيانات التواصل</h3>
                <div className="space-y-3">
                  {[
                    { icon: Phone, label: "الجوال", value: customer.phone, dir: "ltr" as const },
                    { icon: Mail,  label: "البريد", value: customer.email },
                    { icon: Building2, label: "الشركة", value: customer.companyName },
                    { icon: MapPin, label: "المدينة", value: customer.city },
                    { icon: MessageSquare, label: "المصدر", value: customer.source },
                    { icon: Hash, label: "رقم الإحالة", value: customer.referralCode },
                  ].filter(r => r.value).map(row => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="flex items-center gap-3 text-sm">
                        <Icon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span className="text-gray-400 w-20 flex-shrink-0 text-xs">{row.label}</span>
                        <span className="text-gray-800 font-medium" dir={row.dir}>{row.value}</span>
                      </div>
                    );
                  })}
                  {customer.notes && (
                    <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-800 leading-relaxed">
                      {customer.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* financial summary */}
              <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">الملخص المالي</h3>
                <div className="space-y-3">
                  {[
                    { label: "إجمالي الإنفاق",   value: `${fmt(customer.totalSpent || 0)} ر.س`,   color: "text-emerald-600" },
                    { label: "متوسط قيمة الطلب", value: `${fmt(customer.avgBookingValue || 0)} ر.س`, color: "text-brand-600" },
                    { label: "رصيد المحفظة",      value: `${fmt(customer.walletBalance || 0)} ر.س`,  color: "text-violet-600" },
                    { label: "نقاط الولاء",        value: `${customer.loyaltyPoints || 0} نقطة`,      color: "text-amber-600" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={clsx("font-bold tabular-nums", row.color)}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* B2B contacts */}
              {customer.contacts?.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 lg:col-span-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">جهات الاتصال</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customer.contacts.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-[#f8fafc] rounded-xl">
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
            <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
              {bookingList.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">{biz.terminology.bookingEmpty} لهذا {biz.terminology.client}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#eef2f6] bg-gray-50/50">
                      {["رقم الحجز", "الخدمة", "تاريخ الحدث", "المبلغ", "الحالة", ""].map(h => (
                        <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookingList.map((b: any) => {
                      const st = BOOKING_STATUS[b.status] || { label: b.status, color: "bg-gray-100 text-gray-500 border-[#eef2f6]" };
                      return (
                        <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/50 transition-colors">
                          <td className="py-[6px] px-[10px] font-mono text-xs text-brand-500">#{b.bookingNumber || b.id?.substring(0, 8)}</td>
                          <td className="py-[6px] px-[10px] text-gray-700 font-medium">{b.serviceName || b.locationName || "—"}</td>
                          <td className="py-[6px] px-[10px] text-gray-500 text-xs">{b.eventDate ? fmtDate(b.eventDate) : "—"}</td>
                          <td className="py-[6px] px-[10px] font-bold text-gray-900 tabular-nums">{fmt(b.totalAmount)} ر.س</td>
                          <td className="py-[6px] px-[10px]">
                            <span className={clsx("text-[11px] px-2 py-0.5 rounded-full font-medium border", st.color)}>{st.label}</span>
                          </td>
                          <td className="py-[6px] px-[10px] text-left">
                            <Link to={`/bookings/${b.id}`} className="text-xs text-brand-500 hover:text-brand-700 font-medium">عرض</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB: الفواتير ─────────────────────────────── */}
          {tab === "invoices" && (
            <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
              {invoiceList.length === 0 ? (
                <div className="text-center py-16">
                  <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد فواتير لهذا العميل</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#eef2f6] bg-gray-50/50">
                      {["رقم الفاتورة", "تاريخ الإصدار", "الإجمالي", "المدفوع", "الحالة", ""].map(h => (
                        <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceList.map((inv: any) => {
                      const st = INV_STATUS[inv.status] || INV_STATUS.draft;
                      const Icon = st.icon;
                      const canSend = ["issued","sent","overdue","partially_paid"].includes(inv.status);
                      return (
                        <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/50 transition-colors">
                          <td className="py-[6px] px-[10px] font-mono text-xs text-brand-500 font-semibold">{inv.invoiceNumber}</td>
                          <td className="py-[6px] px-[10px] text-gray-500 text-xs">{inv.issueDate ? fmtDate(inv.issueDate) : "—"}</td>
                          <td className="py-[6px] px-[10px] font-bold text-gray-900 tabular-nums">{fmt(inv.totalAmount)} ر.س</td>
                          <td className="py-[6px] px-[10px] text-emerald-600 font-semibold tabular-nums">{fmt(inv.paidAmount || 0)} ر.س</td>
                          <td className="py-[6px] px-[10px]">
                            <span className={clsx("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border", st.color)}>
                              <Icon className="w-3 h-3" /> {st.label}
                            </span>
                          </td>
                          <td className="py-[6px] px-[10px] text-left">
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
              )}
            </div>
          )}

          {/* ── TAB: الرسائل ──────────────────────────────── */}
          {tab === "messages" && (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد رسائل مُرسلة لهذا العميل</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg: any) => {
                    const st = MSG_STATUS[msg.status] || { label: msg.status, color: "bg-gray-100 text-gray-500" };
                    return (
                      <div key={msg.id} className="flex gap-3 p-4 bg-[#f8fafc] rounded-xl border border-[#eef2f6]">
                        <div className="w-8 h-8 rounded-lg bg-white border border-[#eef2f6] flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-gray-600">{MSG_CHANNEL[msg.channel] || msg.channel}</span>
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
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 font-medium">{interactions.length} تفاعل مسجّل</p>
                <button
                  onClick={() => setShowInteraction(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 text-sm font-medium hover:bg-brand-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة تفاعل
                </button>
              </div>
              {interactions.length === 0 ? (
                <div className="text-center py-10">
                  <StickyNote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد ملاحظات أو تفاعلات</p>
                  <button onClick={() => setShowInteraction(true)} className="mt-3 text-sm text-brand-500 hover:underline">سجّل أول تفاعل</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {interactions.map((int: any) => (
                    <div key={int.id} className="flex gap-3 p-4 bg-[#f8fafc] rounded-xl border border-[#eef2f6]">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#eef2f6] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <StickyNote className="w-4 h-4 text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">
                            {INT_TYPE[int.type] || int.type}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {int.createdAt ? new Date(int.createdAt).toLocaleString("ar-SA") : ""}
                          </span>
                        </div>
                        {int.subject && <p className="text-sm font-semibold text-gray-800 mb-0.5">{int.subject}</p>}
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
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
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

      {/* ── edit customer modal ─────────────────────────────── */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="تعديل بيانات العميل"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={handleEditSave} loading={editSaving} icon={Save}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الاسم *"
              name="name"
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="الجوال"
              name="phone"
              value={editForm.phone}
              onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="البريد الإلكتروني"
              name="email"
              type="email"
              value={editForm.email}
              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              dir="ltr"
            />
            <Input
              label="المدينة"
              name="city"
              value={editForm.city}
              onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="نوع العميل"
              name="type"
              value={editForm.type}
              onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
              options={[
                { value: "individual", label: "فرد" },
                { value: "business",   label: "مؤسسة" },
              ]}
            />
            <Select
              label="تصنيف العميل"
              name="tier"
              value={editForm.tier}
              onChange={e => setEditForm(f => ({ ...f, tier: e.target.value }))}
              options={[
                { value: "regular",    label: "عادي" },
                { value: "vip",        label: "VIP — عميل مميز" },
                { value: "enterprise", label: "مؤسسة — حساب كبير" },
              ]}
            />
          </div>
          {editForm.type === "business" && (
            <Input
              label="اسم المؤسسة"
              name="companyName"
              value={editForm.companyName}
              onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))}
            />
          )}
          {/* Tags */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">الوسوم (Tags)</label>
            <div className="flex flex-wrap gap-1.5 min-h-[2rem] p-2 border border-[#eef2f6] rounded-xl bg-gray-50">
              {editTags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-[#eef2f6] text-xs text-gray-700">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setEditTags(p => p.filter(t => t !== tag))}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >×</button>
                </span>
              ))}
              <input
                type="text"
                value={editForm.tagInput}
                onChange={e => setEditForm(f => ({ ...f, tagInput: e.target.value }))}
                onKeyDown={e => {
                  if ((e.key === "Enter" || e.key === ",") && editForm.tagInput.trim()) {
                    e.preventDefault();
                    const tag = editForm.tagInput.trim().replace(/,/g, "");
                    if (tag && !editTags.includes(tag)) setEditTags(p => [...p, tag]);
                    setEditForm(f => ({ ...f, tagInput: "" }));
                  }
                }}
                placeholder={editTags.length === 0 ? "اكتب وسم ثم Enter..." : ""}
                className="flex-1 min-w-[120px] bg-transparent text-xs outline-none text-gray-700 placeholder:text-gray-300"
              />
            </div>
            <p className="text-[11px] text-gray-400">اضغط Enter أو فاصلة لإضافة وسم</p>
          </div>
          <TextArea
            label="ملاحظات"
            name="notes"
            value={editForm.notes}
            onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="ملاحظات عن العميل..."
          />
        </div>
      </Modal>

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
