import { useState, useEffect } from "react";
import { Modal, Input, Select, TextArea, Button } from "../ui";
import { bookingsApi, customersApi, servicesApi, settingsApi } from "@/lib/api";
import { Plus, Trash2, CalendarCheck } from "lucide-react";
import { clsx } from "clsx";
import { VAT_RATE, DEPOSIT_RATIO } from "@/lib/constants";

type BookingItem = { serviceId: string; quantity: number; addons: { addonId: string; quantity: number }[] };

export function CreateBookingForm({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess?: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("16:00");
  const [locationId, setLocationId] = useState("");
  const [items, setItems] = useState<BookingItem[]>([{ serviceId: "", quantity: 1, addons: [] }]);
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; basePrice: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    customersApi.list({ limit: "100" }).then(r => {
      setCustomers(r.data.map((c: any) => ({
        value: c.id,
        label: `${c.name}${c.phone ? " — " + c.phone : ""}`,
      })));
    }).catch(() => {});
    servicesApi.list({ status: "active", limit: "100" }).then(r => {
      setServices(r.data);
    }).catch(() => {});
    settingsApi.locations().then(r => {
      setLocationOptions(r.data.map((loc: any) => ({
        value: loc.id,
        label: `${loc.name}${loc.city ? " — " + loc.city : ""}`,
      })));
    }).catch(() => {});
  }, [open]);

  const addItem = () => setItems([...items, { serviceId: "", quantity: 1, addons: [] }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  // Calculate totals from real service prices
  const subtotal = items.reduce((sum, item) => {
    const svc = services.find(s => s.id === item.serviceId);
    if (!svc) return sum;
    return sum + parseFloat(svc.basePrice || "0") * item.quantity;
  }, 0);
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;
  const deposit = total * DEPOSIT_RATIO;

  const reset = () => {
    setCustomerId(""); setEventDate(""); setEventTime("16:00");
    setLocationId(""); setItems([{ serviceId: "", quantity: 1, addons: [] }]);
    setCustomerNotes(""); setInternalNotes(""); setError("");
  };

  const submit = async () => {
    if (!customerId || !eventDate) { setError("يرجى اختيار العميل والتاريخ"); return; }
    const validItems = items.filter(i => i.serviceId);
    if (validItems.length === 0) { setError("يرجى اختيار خدمة واحدة على الأقل"); return; }

    setLoading(true);
    setError("");
    try {
      await bookingsApi.create({
        customerId,
        eventDate: `${eventDate}T${eventTime}:00+03:00`,
        locationId: locationId || undefined,
        customerNotes: customerNotes || undefined,
        internalNotes: internalNotes || undefined,
        items: validItems.map(i => ({
          serviceId: i.serviceId,
          quantity: i.quantity,
          addons: i.addons,
        })),
      });
      onSuccess?.();
      onClose();
      reset();
    } catch (err: any) {
      setError(err.message || "حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="حجز جديد" size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} loading={loading} icon={CalendarCheck}>إنشاء الحجز</Button>
        </>
      }
    >
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Booking Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer + Date */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
            <Select
              label="العميل"
              name="customerId"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={customers}
              placeholder={customers.length === 0 ? "جاري التحميل..." : "اختر العميل"}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="تاريخ الحدث" name="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required dir="ltr" />
              <Input label="الوقت" name="eventTime" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} dir="ltr" />
            </div>
            {locationOptions.length > 0 && (
              <Select
                label="الفرع"
                name="locationId"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                options={[{ value: "", label: "بدون فرع محدد" }, ...locationOptions]}
              />
            )}
          </div>

          {/* Services */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">الخدمات</h3>
              <button onClick={addItem} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> إضافة خدمة
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, i) => (
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
                  {item.serviceId && (
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
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextArea label="ملاحظات العميل" name="customerNotes" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="ملاحظات يراها العميل" rows={2} />
            <TextArea label="ملاحظات داخلية" name="internalNotes" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="ملاحظات للفريق فقط" rows={2} />
          </div>
        </div>

        {/* Right: Price Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-gray-50 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">ملخص الأسعار</h3>

            <div className="space-y-2">
              {items.filter(i => i.serviceId).map((item, i) => {
                const svc = services.find(s => s.id === item.serviceId);
                if (!svc) return null;
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-[160px]">{svc.name}</span>
                    <span className="font-medium">{(parseFloat(svc.basePrice) * item.quantity).toLocaleString()} ر.س</span>
                  </div>
                );
              })}
            </div>

            {subtotal > 0 ? (
              <>
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المجموع الفرعي</span>
                    <span>{subtotal.toLocaleString()} ر.س</span>
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
                  <div className="flex justify-between text-xs text-brand-600 mt-1">
                    <span>العربون (30%)</span>
                    <span>{deposit.toLocaleString(undefined, { maximumFractionDigits: 0 })} ر.س</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">اختر خدمة لحساب السعر</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
