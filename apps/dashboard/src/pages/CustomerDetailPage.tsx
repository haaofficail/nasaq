import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, User, Phone, Mail, Building2, Star, CalendarCheck, Banknote, MessageSquare, Plus, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { customersApi, bookingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, TextArea, Select } from "@/components/ui";

export function CustomerDetailPage() {
  const { id } = useParams();
  const [showInteraction, setShowInteraction] = useState(false);
  const [interactionType, setInteractionType] = useState("note");
  const [interactionContent, setInteractionContent] = useState("");

  const { data: res, loading, error, refetch } = useApi(() => customersApi.get(id!), [id]);
  const { mutate: addInteraction, loading: addingInteraction } = useMutation((data: any) => customersApi.addInteraction(id!, data));

  const customer = res?.data?.customer || res?.data;
  const customerBookings = res?.data?.bookings || [];
  const interactions = res?.data?.interactions || [];
  const stats = res?.data?.stats || {};

  const handleAddInteraction = async () => {
    if (!interactionContent.trim()) return;
    await addInteraction({ type: interactionType, content: interactionContent });
    setShowInteraction(false);
    setInteractionContent("");
    refetch();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /><span className="mr-3 text-gray-500">جاري التحميل...</span></div>;
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-3"><AlertCircle className="w-10 h-10 text-red-400" /><p className="text-red-500">{error}</p><button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button></div>;
  if (!customer) return <div className="text-center py-12 text-gray-500">العميل غير موجود</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/customers" className="p-2 rounded-lg hover:bg-gray-100"><ArrowRight className="w-5 h-5 text-gray-400" /></Link>
        <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold", customer.isVip ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-600")}>
          {customer.type === "corporate" ? <Building2 className="w-6 h-6" /> : customer.name?.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{customer.name} {customer.isVip && <Star className="w-5 h-5 text-amber-400" fill="currentColor" />}</h1>
          <p className="text-sm text-gray-500">{customer.type === "corporate" ? "مؤسسة" : "فرد"}{customer.companyName ? " — " + customer.companyName : ""}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400">الحجوزات</p><p className="text-xl font-bold text-brand-600">{customer.totalBookings || stats.totalBookings || 0}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400">الإنفاق</p><p className="text-xl font-bold text-green-600">{Number(customer.totalSpent || stats.totalSpent || 0).toLocaleString()}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400">متوسط الحجز</p><p className="text-xl font-bold">{Number(customer.avgBookingValue || stats.avgBookingValue || 0).toLocaleString()}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400">آخر حجز</p><p className="text-sm font-bold mt-1">{customer.lastBookingDate ? new Date(customer.lastBookingDate).toLocaleDateString("ar-SA") : "—"}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400">نقاط الولاء</p><p className="text-xl font-bold text-purple-600">{customer.loyaltyPoints || 0}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">بيانات التواصل</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-400" /><span dir="ltr">{customer.phone}</span></div>
              {customer.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-400" /><span dir="ltr">{customer.email}</span></div>}
              {customer.city && <div className="flex items-center gap-3"><Building2 className="w-4 h-4 text-gray-400" />{customer.city}</div>}
              {customer.source && <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4 text-gray-400" />مصدر: {customer.source}</div>}
            </div>
          </div>

          {/* Bookings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">الحجوزات ({customerBookings.length})</h2>
            {customerBookings.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">لا توجد حجوزات</p> : (
              <div className="space-y-2">
                {customerBookings.map((b: any) => (
                  <Link key={b.id} to={"/bookings/" + b.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div><p className="text-sm font-medium">#{b.bookingNumber || b.id?.substring(0, 8)}</p><p className="text-xs text-gray-400">{b.eventDate ? new Date(b.eventDate).toLocaleDateString("ar-SA") : "—"}</p></div>
                    <span className="font-bold text-sm">{Number(b.totalAmount || 0).toLocaleString()} ر.س</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">سجل التفاعلات</h3>
              <button onClick={() => setShowInteraction(true)} className="text-sm text-brand-500 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> إضافة</button>
            </div>
            {interactions.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">لا توجد تفاعلات</p> : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {interactions.map((int: any) => (
                  <div key={int.id} className="border-b border-gray-50 pb-2 last:border-0">
                    <p className="text-xs text-gray-400">{int.createdAt ? new Date(int.createdAt).toLocaleDateString("ar-SA") : ""} — {int.type === "note" ? "ملاحظة" : int.type === "call" ? "اتصال" : int.type}</p>
                    <p className="text-sm text-gray-700 mt-1">{int.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={showInteraction} onClose={() => setShowInteraction(false)} title="إضافة تفاعل" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowInteraction(false)}>إلغاء</Button><Button onClick={handleAddInteraction} loading={addingInteraction}>حفظ</Button></>}>
        <div className="space-y-4">
          <Select label="النوع" name="type" value={interactionType} onChange={e => setInteractionType(e.target.value)} options={[
            { value: "note", label: "ملاحظة" }, { value: "call", label: "اتصال" }, { value: "whatsapp", label: "واتساب" }, { value: "email", label: "بريد" }, { value: "meeting", label: "اجتماع" },
          ]} />
          <TextArea label="المحتوى" name="content" value={interactionContent} onChange={e => setInteractionContent(e.target.value)} rows={3} required placeholder="اكتب تفاصيل التفاعل..." />
        </div>
      </Modal>
    </div>
  );
}
