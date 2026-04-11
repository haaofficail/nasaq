import { useState, useEffect, useMemo } from "react";
import { Modal, Input, Select, TextArea, Button } from "../ui";
import { bookingsApi, customersApi, servicesApi, settingsApi } from "@/lib/api";
import { Plus, Trash2, CalendarCheck, MapPin, Package, Truck, Users, Home, Tent, Moon, CreditCard, Banknote, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { VAT_RATE } from "@/lib/constants";

// ── Payment methods ────────────────────────────────────────────────────────
const PAY_METHODS = [
  { value: "cash",          label: "نقد" },
  { value: "mada",          label: "مدى" },
  { value: "visa_master",   label: "فيزا / ماستر" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "apple_pay",     label: "Apple Pay" },
  { value: "payment_link",  label: "رابط دفع" },
];

// ── Service type groups ────────────────────────────────────────────────────
const IMMEDIATE_TYPES  = new Set(["product", "product_shipping", "food_order", "package", "add_on"]);
const RENTAL_TYPES     = new Set(["rental", "event_rental"]);
const FIELD_SVC_TYPES  = new Set(["field_service"]);

// Accommodation = rental service that has capacity (chalets, camps, apartments, rooms)
function isAccommodationService(s: ServiceRecord) {
  return RENTAL_TYPES.has(s.serviceType) && (s.maxCapacity ?? 0) > 0;
}

// Duration label: accommodation uses "ليالي", equipment uses "أيام"
function durationLabel(svc: ServiceRecord | null) {
  if (!svc) return "أيام";
  if (isAccommodationService(svc)) return "ليالي";
  return "أيام";
}

// Service type display badge
const SERVICE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  appointment:       { label: "موعد",       color: "bg-blue-50 text-blue-600" },
  execution:         { label: "تنفيذ",       color: "bg-violet-50 text-violet-600" },
  field_service:     { label: "ميداني",      color: "bg-orange-50 text-orange-600" },
  rental:            { label: "إيجار",       color: "bg-emerald-50 text-emerald-600" },
  event_rental:      { label: "إيجار فعالية", color: "bg-teal-50 text-teal-600" },
  product:           { label: "منتج",        color: "bg-gray-100 text-gray-600" },
  product_shipping:  { label: "شحن",         color: "bg-amber-50 text-amber-600" },
  food_order:        { label: "طلب طعام",    color: "bg-red-50 text-red-600" },
  package:           { label: "حزمة",        color: "bg-indigo-50 text-indigo-600" },
  project:           { label: "مشروع",       color: "bg-cyan-50 text-cyan-600" },
};

// ── Types ──────────────────────────────────────────────────────────────────
type ServiceRecord = {
  id: string; name: string; basePrice: string;
  serviceType: string;
  hasDelivery: boolean; allowsPickup: boolean; allowsInVenue: boolean;
  maxCapacity: number; minCapacity: number; capacityLabel: string | null;
  durationMinutes: number;
};
type BookingItem = { serviceId: string; quantity: number; addons: { addonId: string; quantity: number }[] };
type FulfillmentMode = "in_venue" | "pickup" | "delivery";

// ── Helpers ────────────────────────────────────────────────────────────────
function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function fmtDuration(days: number, label: string) {
  if (days <= 0) return null;
  return `${days} ${label}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export function CreateBookingForm({ open, onClose, onSuccess, initialDate, defaultServiceId, defaultCustomerId }: {
  open: boolean; onClose: () => void; onSuccess?: () => void; initialDate?: string; defaultServiceId?: string; defaultCustomerId?: string;
}) {
  // Core booking state
  const [customerId,    setCustomerId]    = useState(defaultCustomerId ?? "");
  const [eventDate,     setEventDate]     = useState(initialDate ?? "");
  const [eventTime,     setEventTime]     = useState("15:00");
  const [eventEndDate,  setEventEndDate]  = useState("");
  const [eventEndTime,  setEventEndTime]  = useState("12:00");
  const [locationId,    setLocationId]    = useState("");
  const [items, setItems] = useState<BookingItem[]>([{ serviceId: defaultServiceId ?? "", quantity: 1, addons: [] }]);
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Rental-specific state
  const [adultsCount,   setAdultsCount]   = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);

  // Fulfillment
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>("in_venue");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // UI state
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [step,     setStep]     = useState<"form" | "payment">("form");

  // Payment step state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  // Reference data
  const [customers,        setCustomers]        = useState<{ value: string; label: string }[]>([]);
  const [services,         setServices]         = useState<ServiceRecord[]>([]);
  const [locationOptions,  setLocationOptions]  = useState<{ value: string; label: string }[]>([]);

  // ── Load reference data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    customersApi.list({ limit: "200" }).then(r => {
      setCustomers(r.data.map((c: any) => ({
        value: c.id,
        label: `${c.name}${c.phone ? " — " + c.phone : ""}`,
      })));
    }).catch(() => {});
    servicesApi.list({ status: "active", limit: "200" }).then(r => {
      setServices(r.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        basePrice: s.basePrice ?? "0",
        serviceType: s.serviceType || "appointment",
        hasDelivery: s.hasDelivery ?? false,
        allowsPickup: s.allowsPickup ?? false,
        allowsInVenue: s.allowsInVenue ?? true,
        maxCapacity: s.maxCapacity ?? 0,
        minCapacity: s.minCapacity ?? 1,
        capacityLabel: s.capacityLabel ?? null,
        durationMinutes: s.durationMinutes ?? 0,
      })));
    }).catch(() => {});
    settingsApi.locations().then(r => {
      setLocationOptions(r.data.map((loc: any) => ({
        value: loc.id,
        label: `${loc.name}${loc.city ? " — " + loc.city : ""}`,
      })));
    }).catch(() => {});
  }, [open]);

  // ── Derive behaviour flags from selected services ─────────────────────────
  const selectedServices = useMemo(() =>
    items.map(i => services.find(s => s.id === i.serviceId)).filter(Boolean) as ServiceRecord[],
    [items, services]
  );

  const isImmediate     = selectedServices.length > 0 && selectedServices.every(s => IMMEDIATE_TYPES.has(s.serviceType));
  const isRental        = selectedServices.some(s => RENTAL_TYPES.has(s.serviceType));
  const isAccommodation = selectedServices.some(isAccommodationService);
  const isFieldService  = selectedServices.some(s => FIELD_SVC_TYPES.has(s.serviceType));
  const needsEndDate    = isRental;
  const hasDelivery     = selectedServices.some(s => s.hasDelivery);
  const hasPickup       = selectedServices.some(s => s.allowsPickup);
  const showFulfillment = hasDelivery || hasPickup;

  // Max capacity across accommodation services (most restrictive)
  const maxCapacity = useMemo(() => {
    const caps = selectedServices.filter(isAccommodationService).map(s => s.maxCapacity).filter(c => c > 0);
    return caps.length > 0 ? Math.min(...caps) : 0;
  }, [selectedServices]);

  // Duration calculation (for rental pricing display)
  const rentalDays = (isRental && eventDate && eventEndDate) ? calcDays(eventDate, eventEndDate) : 0;
  const durLabel   = durationLabel(selectedServices.find(s => RENTAL_TYPES.has(s.serviceType)) ?? null);
  const durBadge   = fmtDuration(rentalDays, durLabel);

  // Check-in/out time labels
  const checkinLabel  = isAccommodation ? "وقت الوصول"    : "وقت البداية";
  const checkoutLabel = isAccommodation ? "وقت المغادرة"  : "وقت الانتهاء";
  const startLabel    = isAccommodation ? "تاريخ الوصول"  : isRental ? "تاريخ البداية" : "تاريخ الحدث";
  const endLabel      = isAccommodation ? "تاريخ المغادرة" : "تاريخ الانتهاء";

  // Capacity label
  const capLabel = selectedServices.find(isAccommodationService)?.capacityLabel ?? "ضيف";

  // ── Price calculation ────────────────────────────────────────────────────
  const lineItems = useMemo(() => {
    return items.map(item => {
      const svc = services.find(s => s.id === item.serviceId);
      if (!svc) return null;
      const daysMultiplier = RENTAL_TYPES.has(svc.serviceType) ? Math.max(1, rentalDays) : 1;
      const unitPrice = parseFloat(svc.basePrice || "0");
      const lineTotal = unitPrice * item.quantity * daysMultiplier;
      return { svc, item, unitPrice, daysMultiplier, lineTotal };
    }).filter(Boolean) as { svc: ServiceRecord; item: BookingItem; unitPrice: number; daysMultiplier: number; lineTotal: number }[];
  }, [items, services, rentalDays]);

  const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);
  const vat      = subtotal * VAT_RATE;
  const total    = subtotal + vat;

  // ── Item helpers ──────────────────────────────────────────────────────────
  const addItem    = () => setItems([...items, { serviceId: "", quantity: 1, addons: [] }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setCustomerId(""); setEventDate(initialDate ?? ""); setEventTime("15:00");
    setEventEndDate(""); setEventEndTime("12:00");
    setLocationId(""); setFulfillmentMode("in_venue"); setDeliveryAddress("");
    setItems([{ serviceId: "", quantity: 1, addons: [] }]);
    setCustomerNotes(""); setInternalNotes(""); setError("");
    setAdultsCount(1); setChildrenCount(0);
    setStep("form"); setPayAmount(""); setPayMethod("cash");
  };

  // Sync eventDate when initialDate changes (e.g. clicking a different calendar day)
  useEffect(() => {
    if (open && initialDate) setEventDate(initialDate);
  }, [open, initialDate]);

  // Pre-fill customer when defaultCustomerId is provided (e.g. from customer profile link)
  useEffect(() => {
    if (open && defaultCustomerId) setCustomerId(defaultCustomerId);
  }, [open, defaultCustomerId]);

  // ── Build questionAnswers (rental metadata) ───────────────────────────────
  function buildQuestionAnswers() {
    const qa: { key: string; label: string; value: string | number | boolean }[] = [];
    if (isAccommodation) {
      qa.push({ key: "adults",   label: "البالغون",     value: adultsCount });
      qa.push({ key: "children", label: "الأطفال",      value: childrenCount });
    }
    if (isRental && rentalDays > 0) {
      qa.push({ key: "rentalDays", label: `عدد ${durLabel}`, value: rentalDays });
    }
    if (fulfillmentMode !== "in_venue") {
      qa.push({ key: "fulfillment", label: "طريقة التسليم", value: fulfillmentMode });
    }
    return qa;
  }

  // ── Step 1: validate then go to payment ──────────────────────────────────
  const goToPayment = () => {
    const validItems = items.filter(i => i.serviceId);
    if (!customerId)                                   { setError("يرجى اختيار العميل"); return; }
    if (!isImmediate && !eventDate)                    { setError("يرجى تحديد تاريخ البداية"); return; }
    if (needsEndDate && !eventEndDate)                 { setError("يرجى تحديد تاريخ الانتهاء"); return; }
    if (needsEndDate && eventEndDate <= eventDate)     { setError("تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية"); return; }
    if (isFieldService && !deliveryAddress.trim() && !locationId) { setError("الخدمة الميدانية تتطلب تحديد موقع العميل"); return; }
    if (fulfillmentMode === "delivery" && !deliveryAddress.trim()) { setError("يرجى إدخال عنوان التوصيل"); return; }
    if (validItems.length === 0)                       { setError("يرجى اختيار خدمة واحدة على الأقل"); return; }
    if (isAccommodation && adultsCount < 1)            { setError("يجب أن يكون عدد البالغين 1 على الأقل"); return; }
    if (isAccommodation && maxCapacity > 0 && (adultsCount + childrenCount) > maxCapacity) {
      setError(`الحد الأقصى للوحدة ${maxCapacity} ${capLabel}`); return;
    }
    setError("");
    // Pre-fill pay amount with total if services selected
    if (total > 0 && !payAmount) setPayAmount(total.toFixed(2));
    setStep("payment");
  };

  // ── Step 2: create booking + optional payment ─────────────────────────────
  const confirmBooking = async () => {
    const validItems = items.filter(i => i.serviceId);
    setLoading(true); setError("");
    try {
      const res = await bookingsApi.create({
        customerId,
        eventDate:    isImmediate ? undefined : new Date(`${eventDate}T${eventTime}:00`).toISOString(),
        eventEndDate: needsEndDate && eventEndDate ? new Date(`${eventEndDate}T${eventEndTime}:00`).toISOString() : undefined,
        locationId:   locationId || undefined,
        customLocation: (fulfillmentMode === "delivery" || isFieldService) ? deliveryAddress || undefined : undefined,
        locationNotes:  fulfillmentMode === "pickup" ? "استلام من الفرع" : undefined,
        customerNotes:  customerNotes || undefined,
        internalNotes:  internalNotes || undefined,
        questionAnswers: buildQuestionAnswers(),
        items: validItems.map(i => ({ serviceId: i.serviceId, quantity: i.quantity, addons: i.addons })),
      });
      // Add payment if not "later" and amount > 0
      const paid = parseFloat(payAmount);
      if (payMethod !== "later" && paid > 0 && res?.data?.id) {
        await bookingsApi.addPayment(res.data.id, { amount: paid, method: payMethod, type: "payment" }).catch(() => {});
      }
      onSuccess?.();
      onClose();
      reset();
    } catch (err: any) {
      setError(err.message || "حدث خطأ، يرجى المحاولة مرة أخرى");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      open={open} onClose={onClose}
      title={step === "form" ? "حجز جديد" : "خطوة الدفع"}
      size="xl"
      footer={
        step === "form" ? (
          <>
            <Button variant="secondary" onClick={onClose}>إلغاء</Button>
            <Button onClick={goToPayment} icon={ChevronRight}>التالي — الدفع</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep("form")}>رجوع</Button>
            <Button onClick={confirmBooking} loading={loading} icon={CalendarCheck}>تأكيد الحجز</Button>
          </>
        )
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Payment Step ── */}
      {step === "payment" && (
        <div className="space-y-5">

          {/* الإجمالي المستحق */}
          <div className="bg-gray-50 rounded-2xl p-5 text-center">
            <p className="text-xs text-gray-400 mb-1">المبلغ المستحق</p>
            <p className="text-4xl font-bold text-gray-900 tabular-nums">
              {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-base font-normal text-gray-500 mr-1">ر.س</span>
            </p>
          </div>

          {/* طريقة الدفع */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">طريقة الدفع</p>
            <div className="grid grid-cols-3 gap-2">
              {/* دفع لاحقاً */}
              <button type="button" onClick={() => { setPayMethod("later"); setPayAmount("0"); }}
                className={clsx("col-span-3 py-3 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                  payMethod === "later" ? "border-gray-400 bg-gray-100 text-gray-700" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                الدفع لاحقاً
              </button>
              {PAY_METHODS.map(m => (
                <button key={m.value} type="button" onClick={() => { setPayMethod(m.value); if (!payAmount || parseFloat(payAmount) === 0) setPayAmount(total.toFixed(2)); }}
                  className={clsx("py-3 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-1.5",
                    payMethod === m.value ? "border-[#5b9bd5] bg-blue-50 text-[#5b9bd5]" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
                  {m.value === "cash" ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* المبلغ المستلم — يظهر فقط إذا لم يكن "دفع لاحقاً" */}
          {payMethod !== "later" && (
            <div className="space-y-3">
              {/* اختصارات المبلغ */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "كامل المبلغ", val: total },
                  { label: "نصف المبلغ",  val: total / 2 },
                  { label: "ربع المبلغ",  val: total / 4 },
                ].map(({ label, val }) => (
                  <button key={label} type="button" onClick={() => setPayAmount(val.toFixed(2))}
                    className={clsx("py-2 rounded-xl border text-xs font-semibold transition-colors",
                      parseFloat(payAmount) === parseFloat(val.toFixed(2)) ? "border-[#5b9bd5] bg-blue-50 text-[#5b9bd5]" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
                    {label}
                  </button>
                ))}
              </div>

              <Input
                label="المبلغ المستلم"
                name="payAmount"
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0.00"
              />

              {/* ملخص الدين */}
              {total > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">المدفوع</p>
                    <p className="text-base font-bold text-[#5b9bd5] tabular-nums">
                      {(parseFloat(payAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">الدين المتبقي</p>
                    <p className="text-base font-bold text-amber-600 tabular-nums">
                      {Math.max(0, total - (parseFloat(payAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Booking Form ── */}
      {step !== "payment" && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* 1. Customer */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <Select
              label="العميل"
              name="customerId"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={customers}
              placeholder={customers.length === 0 ? "جاري التحميل..." : "اختر العميل"}
              required
            />
          </div>

          {/* 2. Services */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">الخدمات</h3>
              <button onClick={addItem} className="text-xs text-[#5b9bd5] hover:text-blue-700 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> إضافة خدمة
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => {
                const svc = services.find(s => s.id === item.serviceId);
                const typeMeta = svc ? (SERVICE_TYPE_LABELS[svc.serviceType] ?? null) : null;
                const isRentalItem = svc && RENTAL_TYPES.has(svc.serviceType);
                return (
                  <div key={i} className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <Select
                          name={`service-${i}`}
                          value={item.serviceId}
                          onChange={(e) => updateItem(i, "serviceId", e.target.value)}
                          options={services.map(s => ({
                            value: s.id,
                            label: `${s.name} — ${Number(s.basePrice).toLocaleString()} ر.س`,
                          }))}
                          placeholder={services.length === 0 ? "جاري التحميل..." : "اختر الخدمة"}
                        />
                      </div>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg mt-0.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {svc && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {typeMeta && (
                          <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium border border-transparent", typeMeta.color)}>
                            {typeMeta.label}
                          </span>
                        )}
                        {svc.maxCapacity > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium flex items-center gap-1">
                            <Users className="w-3 h-3" /> حتى {svc.maxCapacity} {svc.capacityLabel ?? "ضيف"}
                          </span>
                        )}
                        {isRentalItem && rentalDays > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium flex items-center gap-1">
                            <Moon className="w-3 h-3" /> {rentalDays} {durLabel}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quantity (hidden for accommodation — guests are separate) */}
                    {item.serviceId && !isAccommodationService(svc!) && (
                      <Input
                        label="الكمية"
                        name={`qty-${i}`}
                        type="number"
                        value={String(item.quantity)}
                        onChange={(e) => updateItem(i, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                        dir="ltr"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Date / Duration */}
          {!isImmediate && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">
                  {isAccommodation ? "مدة الإقامة" : isRental ? "فترة الإيجار" : "التاريخ والوقت"}
                </h4>
                {durBadge && (
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5" /> {durBadge}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label={startLabel}  name="eventDate"    type="date" value={eventDate}    onChange={(e) => setEventDate(e.target.value)}    required dir="ltr" />
                <Input label={checkinLabel} name="eventTime"   type="time" value={eventTime}    onChange={(e) => setEventTime(e.target.value)}    dir="ltr" />
              </div>

              {needsEndDate && (
                <div className="grid grid-cols-2 gap-4">
                  <Input label={endLabel}       name="eventEndDate" type="date" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)}  required dir="ltr" />
                  <Input label={checkoutLabel}  name="eventEndTime" type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)}  dir="ltr" />
                </div>
              )}
            </div>
          )}

          {/* 4. Guest count — accommodation only */}
          {isAccommodation && (
            <div className="p-4 bg-blue-50 rounded-xl space-y-4 border border-blue-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5b9bd5]" />
                <h4 className="text-sm font-semibold text-gray-800">
                  الضيوف
                  {maxCapacity > 0 && <span className="text-xs text-gray-400 font-normal mr-1">— الحد الأقصى {maxCapacity} {capLabel}</span>}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">البالغون <span className="text-red-400">*</span></label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">−</button>
                    <span className="w-10 text-center font-bold text-gray-900">{adultsCount}</span>
                    <button type="button"
                      onClick={() => setAdultsCount(maxCapacity > 0 ? Math.min(maxCapacity, adultsCount + 1) : adultsCount + 1)}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">الأطفال</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">−</button>
                    <span className="w-10 text-center font-bold text-gray-900">{childrenCount}</span>
                    <button type="button"
                      onClick={() => setChildrenCount(maxCapacity > 0 ? Math.min(Math.max(0, maxCapacity - adultsCount), childrenCount + 1) : childrenCount + 1)}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">+</button>
                  </div>
                </div>
              </div>
              {maxCapacity > 0 && (
                <div className={clsx(
                  "text-xs px-3 py-1.5 rounded-lg font-medium",
                  (adultsCount + childrenCount) > maxCapacity
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "bg-white text-gray-500 border border-blue-100"
                )}>
                  الإجمالي: {adultsCount + childrenCount} / {maxCapacity} {capLabel}
                </div>
              )}
            </div>
          )}

          {/* 5. Fulfillment mode */}
          {(showFulfillment || isFieldService) && (
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">طريقة التسليم</h4>
              <div className="flex gap-2">
                {!isFieldService && selectedServices.some(s => s.allowsInVenue !== false) && (
                  <button type="button" onClick={() => setFulfillmentMode("in_venue")}
                    className={clsx("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      fulfillmentMode === "in_venue"
                        ? "border-[#5b9bd5] bg-blue-50 text-[#5b9bd5]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}>
                    <MapPin className="w-4 h-4" /> في المنشأة
                  </button>
                )}
                {hasPickup && (
                  <button type="button" onClick={() => setFulfillmentMode("pickup")}
                    className={clsx("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      fulfillmentMode === "pickup"
                        ? "border-[#5b9bd5] bg-blue-50 text-[#5b9bd5]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}>
                    <Package className="w-4 h-4" /> استلام
                  </button>
                )}
                {(hasDelivery || isFieldService) && (
                  <button type="button" onClick={() => setFulfillmentMode("delivery")}
                    className={clsx("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      fulfillmentMode === "delivery"
                        ? "border-[#5b9bd5] bg-blue-50 text-[#5b9bd5]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}>
                    <Truck className="w-4 h-4" /> {isFieldService ? "موقع العميل" : "توصيل"}
                  </button>
                )}
              </div>

              {(fulfillmentMode === "delivery" || isFieldService) && (
                <Input
                  label={isFieldService ? "موقع العميل / العنوان" : "عنوان التوصيل"}
                  name="deliveryAddress"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="الحي، الشارع، رقم المبنى"
                  required
                />
              )}
            </div>
          )}

          {/* 6. Branch */}
          {locationOptions.length > 0 && fulfillmentMode !== "delivery" && !isFieldService && (
            <Select
              label="الفرع"
              name="locationId"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              options={[{ value: "", label: "بدون فرع محدد" }, ...locationOptions]}
            />
          )}

          {/* 7. Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextArea
              label={isAccommodation ? "طلبات خاصة" : "ملاحظات العميل"}
              name="customerNotes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder={isAccommodation ? "نوع السرير، طوابق، احتياجات خاصة..." : "ملاحظات يراها العميل"}
              rows={2}
            />
            <TextArea
              label="ملاحظات داخلية"
              name="internalNotes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="ملاحظات للفريق فقط"
              rows={2}
            />
          </div>
        </div>

        {/* ── Right column: Price Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-gray-50 rounded-xl p-5 space-y-4">

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">ملخص الأسعار</h3>
              {isImmediate && (
                <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  بيع فوري
                </span>
              )}
              {isAccommodation && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Home className="w-3 h-3" /> إقامة
                </span>
              )}
              {isRental && !isAccommodation && (
                <span className="text-[10px] bg-teal-50 text-teal-600 border border-teal-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Tent className="w-3 h-3" /> إيجار
                </span>
              )}
            </div>

            {/* Duration summary */}
            {isRental && rentalDays > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs text-emerald-700 font-medium">
                {durBadge}
                {isAccommodation && adultsCount > 0 && (
                  <span className="mr-2 text-emerald-600">· {adultsCount} بالغ{childrenCount > 0 ? `، ${childrenCount} طفل` : ""}</span>
                )}
              </div>
            )}

            {/* Line items */}
            <div className="space-y-2">
              {lineItems.map((l, i) => (
                <div key={i} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 truncate max-w-[160px]">{l.svc.name}</span>
                    <span className="font-medium">{l.lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</span>
                  </div>
                  {RENTAL_TYPES.has(l.svc.serviceType) && rentalDays > 0 && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {l.unitPrice.toLocaleString()} ر.س × {l.daysMultiplier} {durLabel}
                      {l.item.quantity > 1 && ` × ${l.item.quantity}`}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {subtotal > 0 ? (
              <>
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المجموع الفرعي</span>
                    <span>{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">ضريبة القيمة المضافة (15%)</span>
                    <span>{vat.toLocaleString(undefined, { maximumFractionDigits: 0 })} ر.س</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>الإجمالي</span>
                    <span>{total.toLocaleString(undefined, { maximumFractionDigits: 0 })} ر.س</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">اختر خدمة لحساب السعر</p>
            )}
          </div>
        </div>

      </div>}
    </Modal>
  );
}
