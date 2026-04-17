import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Check, Shield, Phone, Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { clsx } from "clsx";
import { websiteApi } from "@/lib/api";
import { usePublicTheme } from "@/context/ThemeProvider";

const VAT_RATE = 0.15;

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
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"services" | "details" | "questions" | "contact" | "done">("services");
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

  // يجب استدعاء الـ hook قبل أي early return (قواعد الـ hooks)
  usePublicTheme(siteData);

  if (loadingOrg) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
    </div>
  );
  if (orgError || !siteData) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 p-6">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-gray-600 font-medium">{orgError || "الصفحة غير موجودة"}</p>
    </div>
  );
  const org = siteData.org;
  const config = siteData.config || null;
  const services: any[] = siteData.services || [];
  // config.primaryColor (website builder) takes priority over org.primaryColor
  const primaryColor = config?.primaryColor || org?.primaryColor || "#5b9bd5";
  const font = config?.fontFamily || "IBM Plex Sans Arabic";
  const logo = config?.logoUrl || org?.logo;

  const toggleAddon = (id: string) =>
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const svcAddons: any[] = siteData?.addonsByService?.[selectedService?.id] || [];
  const svcPrice = parseFloat(selectedService?.basePrice || selectedService?.price || 0);
  const addonsTotal = selectedAddons.reduce((s: number, addonId: string) => {
    const a = svcAddons.find((x: any) => x.id === addonId);
    return s + parseFloat(a?.price || 0);
  }, 0);
  const subtotal = svcPrice + addonsTotal;
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;
  // depositPercent مأخوذ من بيانات الخدمة (الـ API يُرجعه كرقم مثل 30 أو 50)
  const depositRatio = parseFloat(selectedService?.depositPercent ?? "30") / 100;
  const deposit = total * depositRatio;

  const serviceQuestions: any[] = siteData?.questionsByService?.[selectedService?.id] || [];

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !name || !phone) return;
    setSubmitting(true);
    try {
      const eventDate = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      const answers = Object.entries(questionAnswers)
        .filter(([, v]) => v !== "")
        .map(([questionId, answer]) => ({ questionId, answer }));
      const res = await websiteApi.publicBook(slug!, {
        customerName: name,
        customerPhone: phone,
        serviceId: selectedService.id,
        eventDate,
        selectedAddons,
        customLocation: customLocation || undefined,
        notes: notes || undefined,
        questionAnswers: answers,
        acceptedTerms: true as const,
        policyVersion: "1.0",
      });
      if (res?.data) { setBookingResult(res.data); setStep("done"); }
    } finally {
      setSubmitting(false);
    }
  };

  const setAnswer = (qId: string, val: string) =>
    setQuestionAnswers(prev => ({ ...prev, [qId]: val }));

  const canProceedFromQuestions = serviceQuestions
    .filter(q => q.isRequired)
    .every(q => (questionAnswers[q.id] || "").trim() !== "");

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl" style={{ fontFamily: font }}>
      {/* Header — هوية ترميز OS الثابتة */}
      <header className="py-4 px-6 sticky top-0 z-10" style={{ background: "linear-gradient(135deg, #5b9bd5 0%, #3d84c8 100%)" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden bg-white/20">
              {logo ? <img src={logo} className="w-full h-full object-cover" alt="" /> : (org?.name?.[0] || "ن")}
            </div>
            <span className="font-bold text-white">{org?.name}</span>
          </div>
          {org?.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white"><Phone className="w-4 h-4" />{org.phone}</a>}
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
              <button key={svc.id} onClick={() => { setSelectedService(svc); setStep("details"); setSelectedAddons([]); setQuestionAnswers({}); setCustomLocation(""); setSelectedDate(""); }}
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

            {svcAddons.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <h3 className="font-bold text-gray-900">إضافات (اختياري)</h3>
                {svcAddons.map((addon: any) => {
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
              {selectedAddons.map((addonId: string) => {
                const a = svcAddons.find((x: any) => x.id === addonId);
                return a ? <div key={addonId} className="flex justify-between text-gray-400"><span>+ {a.name}</span><span>{parseFloat(a.price || 0).toLocaleString("en-US")} ر.س</span></div> : null;
              })}
              <div className="flex justify-between text-gray-500 pt-2 border-t border-gray-100"><span>ضريبة القيمة المضافة (15%)</span><span>{Math.round(vat).toLocaleString("en-US")} ر.س</span></div>
              <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200"><span>الإجمالي</span><span>{Math.round(total).toLocaleString("en-US")} ر.س</span></div>
              <div className="flex justify-between text-xs pt-1" style={{ color: primaryColor }}><span>العربون المطلوب ({Math.round(depositRatio * 100)}%)</span><span>{Math.round(deposit).toLocaleString("en-US")} ر.س</span></div>
            </div>

            <button disabled={!selectedDate} onClick={() => setStep(serviceQuestions.length > 0 ? "questions" : "contact")}
              className="w-full py-4 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-colors"
              style={{ background: primaryColor }}>
              {serviceQuestions.length > 0 ? "التالي — أسئلة الحجز" : "التالي — بيانات التواصل"}
            </button>
          </div>
        )}

        {/* Step: Custom questions */}
        {step === "questions" && (
          <div className="space-y-5">
            <button onClick={() => setStep("details")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4 rotate-180" /> السابق
            </button>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
              <div>
                <h2 className="font-bold text-gray-900">أسئلة الحجز</h2>
                <p className="text-xs text-gray-400 mt-0.5">يرجى الإجابة على الأسئلة التالية لإتمام حجزك</p>
              </div>
              {serviceQuestions.map((q: any) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    {q.question}
                    {q.isRequired && <span className="text-red-400 mr-1">*</span>}
                    {q.isPaid && Number(q.price) > 0 && (
                      <span className="text-xs text-green-600 font-normal mr-2">+ {Number(q.price).toLocaleString("en-US")} ر.س</span>
                    )}
                  </label>
                  {(q.type === "text" || q.type === "location") && (
                    <input value={questionAnswers[q.id] || ""} onChange={e => setAnswer(q.id, e.target.value)}
                      placeholder="اكتب إجابتك..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-400" />
                  )}
                  {q.type === "textarea" && (
                    <textarea value={questionAnswers[q.id] || ""} onChange={e => setAnswer(q.id, e.target.value)}
                      rows={3} placeholder="اكتب إجابتك..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-400 resize-none" />
                  )}
                  {q.type === "number" && (
                    <input type="number" value={questionAnswers[q.id] || ""} onChange={e => setAnswer(q.id, e.target.value)}
                      placeholder="0" dir="ltr"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-400" />
                  )}
                  {q.type === "date" && (
                    <input type="date" value={questionAnswers[q.id] || ""} onChange={e => setAnswer(q.id, e.target.value)}
                      dir="ltr"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-400" />
                  )}
                  {(q.type === "select" || q.type === "checkbox") && Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="space-y-2">
                      {q.options.map((opt: string) => {
                        const sel = questionAnswers[q.id] === opt;
                        return (
                          <button key={opt} type="button" onClick={() => setAnswer(q.id, sel ? "" : opt)}
                            className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-right transition-all",
                              sel ? "border-2 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                            )} style={sel ? { borderColor: primaryColor } : {}}>
                            <div className={clsx("w-4 h-4 rounded-full border-2 shrink-0 transition-colors")}
                              style={sel ? { background: primaryColor, borderColor: primaryColor } : { borderColor: "#d1d5db" }}>
                              {sel && <div className="w-full h-full rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                            </div>
                            <span className="text-sm text-gray-800">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {q.type === "multi" && Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="space-y-2">
                      {q.options.map((opt: string) => {
                        const selected = (questionAnswers[q.id] || "").split(",").filter(Boolean).includes(opt);
                        const toggle = () => {
                          const arr = (questionAnswers[q.id] || "").split(",").filter(Boolean);
                          const next = selected ? arr.filter(x => x !== opt) : [...arr, opt];
                          setAnswer(q.id, next.join(","));
                        };
                        return (
                          <button key={opt} type="button" onClick={toggle}
                            className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-right transition-all",
                              selected ? "border-2 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                            )} style={selected ? { borderColor: primaryColor } : {}}>
                            <div className={clsx("w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors")}
                              style={selected ? { background: primaryColor, borderColor: primaryColor } : { borderColor: "#d1d5db" }}>
                              {selected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-sm text-gray-800">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button disabled={!canProceedFromQuestions} onClick={() => setStep("contact")}
              className="w-full py-4 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-colors"
              style={{ background: primaryColor }}>
              التالي — بيانات التواصل
            </button>
          </div>
        )}

        {/* Step: Contact info */}
        {step === "contact" && (
          <div className="space-y-5">
            <button onClick={() => setStep(serviceQuestions.length > 0 ? "questions" : "details")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
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
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-brand-400 cursor-pointer flex-shrink-0"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                أوافق على{" "}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer"
                  className="text-brand-400 underline underline-offset-2">شروط الخدمة</a>
                {" "}و{" "}
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-brand-400 underline underline-offset-2">سياسة الخصوصية</a>
                ، وأقرّ بأن بياناتي ستُعالَج وفق نظام حماية البيانات الشخصية (PDPL)
              </span>
            </label>
            <button disabled={!name || !phone || !agreedToTerms || submitting} onClick={handleSubmit}
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
              <p className="text-sm text-gray-500 mb-4">سيتم التواصل معك قريباً لتأكيد الحجز</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block"></span>
                بانتظار التأكيد
              </div>
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
              <Shield className="w-3 h-3" /> مدعوم بواسطة <span className="font-bold text-brand-500">ترميز OS</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
