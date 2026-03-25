import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Check, Shield, Phone, Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { clsx } from "clsx";
import { websiteApi } from "@/lib/api";

const VAT_RATE = 0.15;
const DEPOSIT_RATIO = 0.30;

export function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();

  // Org + services data
  const [siteData, setSiteData] = useState<any>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Booking flow
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("16:00");
  const [customLocation, setCustomLocation] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"services" | "details" | "contact" | "done">("services");
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    websiteApi.publicSite(slug)
      .then((res: any) => {
        if (res?.error) setOrgError(res.error);
        else setSiteData(res?.data || null);
      })
      .catch(() => setOrgError("تعذّر تحميل بيانات الصفحة"))
      .finally(() => setLoadingOrg(false));
  }, [slug]);

  if (loadingOrg) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );
  if (orgError || !siteData) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 p-6">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-gray-600 font-medium">{orgError || "الصفحة غير موجودة"}</p>
    </div>
  );

  const org = siteData.org;
  const services: any[] = siteData.services || [];
  const primaryColor = org?.primaryColor || "#1A56DB";

  const toggleAddon = (id: string) =>
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const svcPrice = parseFloat(selectedService?.basePrice || selectedService?.price || 0);
  const addonsTotal = selectedAddons.reduce((s: number, id: string) => {
    const a = siteData.addons?.find((x: any) => x.id === id);
    return s + parseFloat(a?.price || 0);
  }, 0);
  const subtotal = svcPrice + addonsTotal;
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;
  const deposit = total * DEPOSIT_RATIO;

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !name || !phone) return;
    setSubmitting(true);
    try {
      const eventDate = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      const res = await websiteApi.publicBook(slug!, {
        customerName: name,
        customerPhone: phone,
        serviceId: selectedService.id,
        eventDate,
        selectedAddons,
        customLocation: customLocation || undefined,
        notes: notes || undefined,
      });
      if (res?.data) { setBookingResult(res.data); setStep("done"); }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden" style={{ background: primaryColor }}>
              {org?.logo ? <img src={org.logo} className="w-full h-full object-cover" alt="" /> : (org?.name?.[0] || "ن")}
            </div>
            <span className="font-bold text-gray-900">{org?.name}</span>
          </div>
          {org?.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"><Phone className="w-4 h-4" />{org.phone}</a>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-16">

        {/* Step: Services list */}
        {step === "services" && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900 mt-2">احجز الآن</h1>
            {services.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
                <p>لا توجد خدمات متاحة حالياً</p>
              </div>
            ) : services.map((svc: any) => (
              <button key={svc.id} onClick={() => { setSelectedService(svc); setStep("details"); }}
                className="w-full bg-white rounded-2xl border border-gray-200 p-5 text-right hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-4">
                {svc.imageUrl ? (
                  <img src={svc.imageUrl} className="w-20 h-20 rounded-xl object-cover shrink-0" alt={svc.name} />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center text-3xl">🎪</div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 text-base leading-snug">{svc.name}</h2>
                  {svc.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{svc.description}</p>}
                  <p className="text-lg font-black mt-2" style={{ color: primaryColor }}>
                    {parseFloat(svc.basePrice || svc.price || 0).toLocaleString("en-US")} <span className="text-sm font-normal text-gray-400">ر.س</span>
                  </p>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Step: Date + Addons */}
        {step === "details" && selectedService && (
          <div className="space-y-5">
            <button onClick={() => setStep("services")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4 rotate-180" /> العودة للخدمات
            </button>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-1">{selectedService.name}</h2>
              <p className="text-xl font-black" style={{ color: primaryColor }}>
                {svcPrice.toLocaleString("en-US")} ر.س
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-bold text-gray-900">التاريخ والوقت</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">التاريخ *</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} dir="ltr"
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">الوقت</label>
                  <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} dir="ltr"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">الموقع (اختياري)</label>
                <input value={customLocation} onChange={e => setCustomLocation(e.target.value)} placeholder="أدخل الموقع أو العنوان"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
              </div>
            </div>

            {siteData.addons?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <h3 className="font-bold text-gray-900">إضافات (اختياري)</h3>
                {siteData.addons.map((addon: any) => {
                  const sel = selectedAddons.includes(addon.id);
                  return (
                    <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                      className={clsx("w-full flex items-center justify-between p-3.5 rounded-xl border text-right transition-all",
                        sel ? "border-2 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      )} style={sel ? { borderColor: primaryColor } : {}}>
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          sel ? "text-white" : "border-gray-300"
                        )} style={sel ? { background: primaryColor, borderColor: primaryColor } : {}}>
                          {sel && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{addon.name}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: primaryColor }}>+{parseFloat(addon.price || 0).toLocaleString("en-US")} ر.س</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Price summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2 text-sm">
              <h3 className="font-bold text-gray-900 mb-3">ملخص السعر</h3>
              <div className="flex justify-between"><span className="text-gray-500">{selectedService.name}</span><span>{svcPrice.toLocaleString("en-US")} ر.س</span></div>
              {selectedAddons.map((id: string) => {
                const a = siteData.addons?.find((x: any) => x.id === id);
                return a ? <div key={id} className="flex justify-between text-gray-400"><span>+ {a.name}</span><span>{parseFloat(a.price || 0).toLocaleString("en-US")} ر.س</span></div> : null;
              })}
              <div className="flex justify-between text-gray-500 pt-2 border-t border-gray-100"><span>ضريبة القيمة المضافة (15%)</span><span>{Math.round(vat).toLocaleString("en-US")} ر.س</span></div>
              <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200"><span>الإجمالي</span><span>{Math.round(total).toLocaleString("en-US")} ر.س</span></div>
              <div className="flex justify-between text-xs pt-1" style={{ color: primaryColor }}><span>العربون المطلوب (30%)</span><span>{Math.round(deposit).toLocaleString("en-US")} ر.س</span></div>
            </div>

            <button disabled={!selectedDate} onClick={() => setStep("contact")}
              className="w-full py-4 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-colors"
              style={{ background: primaryColor }}>
              التالي — بيانات التواصل
            </button>
          </div>
        )}

        {/* Step: Contact info */}
        {step === "contact" && (
          <div className="space-y-5">
            <button onClick={() => setStep("details")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4 rotate-180" /> السابق
            </button>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900">بيانات التواصل</h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">الاسم الكامل *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">رقم الجوال *</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">ملاحظات (اختياري)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="أي ملاحظات..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-400 resize-none" />
              </div>
            </div>
            <button disabled={!name || !phone || submitting} onClick={handleSubmit}
              className="w-full py-4 rounded-xl text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: primaryColor }}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : "تأكيد الحجز"}
            </button>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && bookingResult && (
          <div className="space-y-5 text-center">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">تم استلام طلبك!</h2>
              <p className="text-sm text-gray-500 mb-5">سيتم التواصل معك قريباً لتأكيد الحجز</p>
              <div className="bg-gray-50 rounded-xl p-4 text-right space-y-2 text-sm mb-5">
                <div className="flex justify-between"><span className="text-gray-500">رقم الحجز</span><span className="font-bold font-mono">{bookingResult.bookingNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الإجمالي</span><span className="font-bold">{parseFloat(bookingResult.totalAmount || 0).toLocaleString("en-US")} ر.س</span></div>
                <div className="flex justify-between"><span className="text-gray-500">العربون</span><span className="font-bold" style={{ color: primaryColor }}>{parseFloat(bookingResult.depositAmount || 0).toLocaleString("en-US")} ر.س</span></div>
              </div>
              {bookingResult.trackingToken && (
                <Link to={`/track/${bookingResult.trackingToken}`}
                  className="inline-block w-full py-3 rounded-xl text-white font-bold text-sm"
                  style={{ background: primaryColor }}>
                  تتبع حجزك
                </Link>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="w-3 h-3" /> مدعوم بواسطة <span className="font-bold text-brand-500">نسق</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
