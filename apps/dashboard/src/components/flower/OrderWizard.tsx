/**
 * OrderWizard — Event Project Request Flow
 *
 * 4-step wizard for creating field service orders:
 *   1. Type      — kind of event (kiosk, newborn, etc.)
 *   2. Service   — pick from services catalog (field_service type)
 *   3. Details   — customer lookup + event date/location
 *   4. Confirm   — pricing calculator + summary + create
 */

import { useState } from "react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";
import { useApi, useMutation } from "@/hooks/useApi";
import { servicesApi, serviceOrdersApi, customersApi } from "@/lib/api";
import { Modal, Input, Button } from "@/components/ui";
import {
  Search, Loader2, CheckCircle2, Calendar,
  Users, Wallet, ImageOff, ChevronRight, Package,
  Flower2, Plus, ExternalLink, AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";

// ─── Event types ──────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  {
    value: "kiosk",
    orderType: "kiosk",
    label: "كوشة",
    desc: "كوشة زفاف أو حفل — تشمل أصولاً ميدانية وتنسيقاً شاملاً",
    color: "border-violet-200 bg-violet-50",
    active: "border-violet-500 bg-violet-50",
    icon: "border-violet-300 text-violet-600",
  },
  {
    value: "newborn",
    orderType: "newborn_reception",
    label: "استقبال مولود",
    desc: "تنسيق طبيعي وصناعي لاستقبال المولود",
    color: "border-pink-200 bg-pink-50",
    active: "border-pink-500 bg-pink-50",
    icon: "border-pink-300 text-pink-600",
  },
  {
    value: "reception_table",
    orderType: "custom_decor",
    label: "طاولة استقبال",
    desc: "تنسيق طاولات الاستقبال والمداخل",
    color: "border-amber-200 bg-amber-50",
    active: "border-amber-500 bg-amber-50",
    icon: "border-amber-300 text-amber-600",
  },
  {
    value: "entrance",
    orderType: "field_execution",
    label: "مدخل ترحيبي",
    desc: "تنسيق المداخل والمسارات الزهرية",
    color: "border-emerald-200 bg-emerald-50",
    active: "border-emerald-500 bg-emerald-50",
    icon: "border-emerald-300 text-emerald-600",
  },
  {
    value: "custom",
    orderType: "custom_arrangement",
    label: "تنسيق مخصص",
    desc: "تنسيق حسب طلب العميل — بدون قيود",
    color: "border-[#eef2f6] bg-gray-50",
    active: "border-gray-500 bg-gray-50",
    icon: "border-[#eef2f6] text-gray-500",
  },
] as const;

// ─── Service classification ───────────────────────────────────────────────────

const EXECUTION_SERVICE_TYPES = new Set(["execution", "field_service", "project"]);

type ItemKind = "execution" | "booking";

function getItemKind(svc: any): ItemKind {
  return EXECUTION_SERVICE_TYPES.has(svc.serviceType) ? "execution" : "booking";
}

const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  execution: "تنفيذ",
  booking: "حجز",
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

type Step = "type" | "service" | "details" | "confirm";
const STEP_LABELS: Record<Step, string> = {
  type: "نوع الطلب", service: "الخدمة", details: "التفاصيل", confirm: "التأكيد",
};
const STEPS: Step[] = ["type", "service", "details", "confirm"];

export function OrderWizard({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  // Step
  const [step, setStep] = useState<Step>("type");

  // Type
  const [selectedType, setSelectedType] = useState<typeof EVENT_TYPES[number] | null>(null);

  // Service
  const [selectedService, setSelectedService] = useState<any>(null);
  const [serviceSearch, setServiceSearch] = useState("");

  // Customer
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // Event
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [teamSize, setTeamSize] = useState(2);
  const [notes, setNotes] = useState("");

  // Pricing
  const [total, setTotal] = useState("");
  const [depositMode, setDepositMode] = useState<"25" | "30" | "50" | "custom">("30");
  const [customDeposit, setCustomDeposit] = useState("");

  // API
  const { data: svcRes, loading: loadingSvcs } = useApi(
    () => servicesApi.list({ status: "active" }),
    [open]
  );
  const fieldServices: any[] = svcRes?.data ?? [];

  const { mutate: createOrder, loading: creating } = useMutation(
    (data: any) => serviceOrdersApi.create(data)
  );

  // Computed
  const totalNum = parseFloat(total) || 0;
  const depositNum =
    depositMode !== "custom"
      ? Math.round(totalNum * parseInt(depositMode) / 100)
      : parseFloat(customDeposit) || 0;
  const balance = Math.max(0, totalNum - depositNum);

  const filteredServices = fieldServices.filter(
    s => !serviceSearch ||
      s.name?.toLowerCase().includes(serviceSearch) ||
      s.shortDescription?.includes(serviceSearch)
  );

  // Derive order type from selected service (project > booking > sale)
  const derivedOrderType: "sale" | "booking" | "project" = !selectedService
    ? "sale"
    : getItemKind(selectedService) === "execution"
      ? "project"
      : "booking";

  const dayLabel = eventDate ? (() => {
    const d = new Date(eventDate);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
    const name = d.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" });
    if (diff <= 0) return name;
    if (diff === 1) return `${name} — غداً`;
    return `${name} — بعد ${diff} يوم`;
  })() : null;

  // Customer phone lookup
  const handlePhoneBlur = async (p: string) => {
    if (!p || p.length < 9) { setFoundCustomer(null); return; }
    setSearching(true);
    try {
      const r = await customersApi.list({ phone: p, limit: "1" } as any);
      const c = (r as any)?.data?.[0] ?? null;
      setFoundCustomer(c);
      if (c && !customerName) setCustomerName(c.name ?? "");
    } catch { setFoundCustomer(null); }
    finally { setSearching(false); }
  };

  // Select service and pull smart defaults
  const handleSelectService = (svc: any) => {
    setSelectedService(svc);
    if (svc.basePrice)     setTotal(String(svc.basePrice));
    if (svc.workerCount)   setTeamSize(Number(svc.workerCount));
    if (svc.depositPercent) {
      const p = String(Math.round(Number(svc.depositPercent)));
      if (["25", "30", "50"].includes(p)) setDepositMode(p as any);
    }
    setStep("details");
  };

  // Create order
  const handleCreate = async () => {
    if (!customerName.trim()) { toast.error("اسم العميل مطلوب"); return; }
    if (!eventDate)            { toast.error("تاريخ الفعالية مطلوب"); return; }

    await createOrder({
      type: selectedType?.orderType ?? "custom_arrangement",
      order_kind: derivedOrderType,
      service_id: selectedService?.id ?? undefined,
      customer_name: customerName.trim(),
      customer_phone: phone || undefined,
      event_date: eventDate,
      event_time: eventTime || undefined,
      event_location: location || undefined,
      description: notes || undefined,
      total_amount: totalNum > 0 ? totalNum : undefined,
      deposit_amount: depositNum > 0 ? depositNum : undefined,
      team_size: teamSize,
    });

    toast.success("تم إنشاء الطلب");
    onCreated();
    handleClose();
  };

  const handleClose = () => {
    setStep("type"); setSelectedType(null); setSelectedService(null);
    setServiceSearch(""); setPhone(""); setCustomerName(""); setFoundCustomer(null);
    setEventDate(""); setEventTime(""); setLocation(""); setTeamSize(2); setNotes("");
    setTotal(""); setCustomDeposit(""); setDepositMode("30");
    onClose();
  };

  const canNext = (): boolean => {
    if (step === "type")    return !!selectedType;
    if (step === "service") return true; // can skip service selection
    if (step === "details") return !!customerName.trim() && !!eventDate;
    return true;
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const stepIdx = STEPS.indexOf(step);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`طلب ميداني جديد — ${STEP_LABELS[step]}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          {stepIdx > 0 ? (
            <Button variant="secondary" onClick={goBack}>رجوع</Button>
          ) : (
            <span />
          )}
          {step !== "confirm" ? (
            <Button onClick={goNext} disabled={!canNext()} icon={ChevronRight}>
              التالي
            </Button>
          ) : (
            <Button onClick={handleCreate} loading={creating}>
              إنشاء الطلب
            </Button>
          )}
        </div>
      }
    >
      {/* ── Step indicators ── */}
      <div className="flex items-center gap-1 mb-5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
            <div className={clsx(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
              i < stepIdx  ? "bg-emerald-500 text-white" :
              i === stepIdx ? "bg-brand-500 text-white" :
              "bg-gray-100 text-gray-400"
            )}>
              {i < stepIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={clsx(
              "text-xs truncate",
              i === stepIdx ? "text-brand-600 font-medium" : "text-gray-400"
            )}>{STEP_LABELS[s]}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-1 min-w-[8px]" />}
          </div>
        ))}
      </div>

      {/* ─── Step 1: Type ─────────────────────────────────────────────────── */}
      {step === "type" && (
        <div className="grid grid-cols-1 gap-2.5">
          {EVENT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t)}
              className={clsx(
                "w-full text-right rounded-2xl border-2 p-4 transition-all flex items-center gap-4",
                selectedType?.value === t.value ? t.active + " ring-1 ring-brand-300" : t.color + " hover:border-[#eef2f6]"
              )}
            >
              <div className={clsx("w-9 h-9 rounded-[10px] border-2 flex items-center justify-center shrink-0", t.icon)}>
                <Flower2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
              </div>
              {selectedType?.value === t.value && (
                <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ─── Step 2: Service selection ────────────────────────────────────── */}
      {step === "service" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              اختر خدمة من الكتالوج
            </p>
            <span className="text-xs text-gray-400">
              {filteredServices.filter((s: any) => getItemKind(s) === "execution").length} تنفيذ
              {" · "}
              {filteredServices.filter((s: any) => getItemKind(s) === "booking").length} حجز
              {filteredServices.some((s: any) => s.executionReady === false) && (
                <span className="text-amber-500 mr-1"> · {filteredServices.filter((s: any) => s.executionReady === false).length} ناقصة</span>
              )}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              value={serviceSearch}
              onChange={e => setServiceSearch(e.target.value)}
              placeholder="ابحث في الخدمات..."
              className="w-full rounded-xl border border-[#eef2f6] px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 pr-9"
            />
            <Search className="w-4 h-4 text-gray-300 absolute top-3 right-2.5" />
          </div>

          {loadingSvcs ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-1 font-medium">لا توجد خدمات نشطة</p>
              <p className="text-xs text-gray-400 mb-4">
                أضف خدمات في كتالوج الخدمات وفعّلها أولاً
              </p>
              <Link
                to="/dashboard/flower-catalog"
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                اذهب إلى كتالوج الخدمات
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {/* No-service option */}
              <button
                onClick={() => { setSelectedService(null); setStep("details"); }}
                className={clsx(
                  "w-full text-right rounded-xl border-2 px-4 py-3 transition-all text-sm",
                  !selectedService
                    ? "border-brand-400 bg-brand-50 text-brand-700 font-medium"
                    : "border-[#eef2f6] text-gray-400 hover:border-[#eef2f6]"
                )}
              >
                <Plus className="w-4 h-4 inline ml-1.5" />
                بدون خدمة محددة — سأضيف التفاصيل يدوياً
              </button>

              {filteredServices.map((svc: any) => (
                <ServiceCard
                  key={svc.id}
                  svc={svc}
                  selected={selectedService?.id === svc.id}
                  onSelect={() => handleSelectService(svc)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Step 3: Details ──────────────────────────────────────────────── */}
      {step === "details" && (
        <div className="space-y-5">
          {/* Customer */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> بيانات العميل
            </p>
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  جوال العميل
                  <span className="text-xs text-gray-400 font-normal mr-1">(للبحث عن عميل موجود)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onBlur={e => handlePhoneBlur(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full rounded-xl border border-[#eef2f6] px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 pr-9"
                  dir="ltr"
                />
                {searching
                  ? <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute bottom-2.5 right-2.5" />
                  : <Search className="w-4 h-4 text-gray-300 absolute bottom-2.5 right-2.5" />
                }
              </div>

              {/* Customer result */}
              {foundCustomer ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{foundCustomer.name}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-emerald-600">{foundCustomer.total_bookings ?? 0} طلب سابق</span>
                      {foundCustomer.total_spent > 0 && (
                        <span className="text-xs text-emerald-600">
                          {Number(foundCustomer.total_spent).toLocaleString("ar-SA")} ر.س إجمالي
                        </span>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                </div>
              ) : phone && !searching && phone.length >= 9 ? (
                <div className="bg-gray-50 border border-[#eef2f6] rounded-xl px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> عميل جديد
                </div>
              ) : null}

              <Input
                name="customer_name"
                label="اسم العميل"
                required
                value={customerName}
                onChange={(e: any) => setCustomerName(e.target.value)}
                placeholder="اسم العميل الكامل"
              />
            </div>
          </div>

          <div className="border-t border-[#eef2f6]" />

          {/* Event */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> تفاصيل الفعالية
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    name="event_date"
                    label="التاريخ"
                    type="date"
                    value={eventDate}
                    onChange={(e: any) => setEventDate(e.target.value)}
                  />
                  {dayLabel && <p className="text-xs text-brand-500 mt-1">{dayLabel}</p>}
                </div>
                <Input name="event_time" label="الوقت" type="time" value={eventTime}
                  onChange={(e: any) => setEventTime(e.target.value)} />
              </div>

              <Input name="location" label="موقع الفعالية" value={location}
                onChange={(e: any) => setLocation(e.target.value)}
                placeholder="اسم القاعة، المدينة والحي" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  عدد أفراد الفريق
                </label>
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setTeamSize(v => Math.max(1, v - 1))}
                    className="w-9 h-9 rounded-xl border border-[#eef2f6] flex items-center justify-center text-gray-500 hover:bg-[#f8fafc] text-lg font-medium">
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-gray-800">{teamSize}</span>
                  <button type="button"
                    onClick={() => setTeamSize(v => v + 1)}
                    className="w-9 h-9 rounded-xl border border-[#eef2f6] flex items-center justify-center text-gray-500 hover:bg-[#f8fafc] text-lg font-medium">
                    +
                  </button>
                  <span className="text-xs text-gray-400">أشخاص</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="ألوان، أي طلبات خاصة..."
                  className="w-full rounded-xl border border-[#eef2f6] px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-400 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 4: Pricing + Confirm ────────────────────────────────────── */}
      {step === "confirm" && (
        <div className="space-y-5">
          {/* Service summary card */}
          {selectedService && (
            <div className="bg-gray-50 rounded-2xl overflow-hidden flex gap-4 p-3">
              {selectedService.coverImage ? (
                <img
                  src={selectedService.coverImage}
                  alt={selectedService.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center shrink-0">
                  <Flower2 className="w-8 h-8 text-brand-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{selectedService.name}</p>
                {selectedService.shortDescription && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{selectedService.shortDescription}</p>
                )}
                <p className="text-xs text-brand-600 font-medium mt-1.5">
                  {Number(selectedService.basePrice ?? 0).toLocaleString("ar-SA")} ر.س
                </p>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> التسعير
            </p>
            <div className="space-y-3">
              <Input name="total" label="الإجمالي (ر.س)" type="number" value={total}
                onChange={(e: any) => {
                  setTotal(e.target.value);
                  if (depositMode !== "custom") {
                    const t = parseFloat(e.target.value) || 0;
                    setCustomDeposit(String(Math.round(t * parseInt(depositMode) / 100)));
                  }
                }} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نسبة العربون</label>
                <div className="flex gap-2">
                  {(["25", "30", "50", "custom"] as const).map(pct => (
                    <button key={pct} type="button"
                      onClick={() => {
                        setDepositMode(pct);
                        if (pct !== "custom") {
                          const t = parseFloat(total) || 0;
                          setCustomDeposit(String(Math.round(t * parseInt(pct) / 100)));
                        }
                      }}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        depositMode === pct
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}>
                      {pct === "custom" ? "ثابت" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    العربون (ر.س)
                    {depositMode !== "custom" && totalNum > 0 && (
                      <span className="text-xs text-gray-400 mr-1">({depositMode}%)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={depositMode !== "custom" ? String(depositNum) : customDeposit}
                    onChange={e => { setDepositMode("custom"); setCustomDeposit(e.target.value); }}
                    className="w-full rounded-xl border border-[#eef2f6] px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">الباقي للتحصيل</label>
                  <div className={clsx(
                    "rounded-xl px-3 py-2.5 text-sm font-semibold",
                    balance > 0 ? "bg-amber-50 text-amber-700" :
                    totalNum > 0 ? "bg-emerald-50 text-emerald-700" :
                    "bg-gray-50 text-gray-400"
                  )}>
                    {balance > 0 ? `${balance.toLocaleString("ar-SA")} ر.س` :
                     totalNum > 0 ? "مسدَّد بالكامل" : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-[#eef2f6] pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">ملخص الطلب</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <SummaryRow label="النوع"     value={selectedType?.label ?? "—"} />
              {selectedService && <SummaryRow label="الخدمة"   value={selectedService.name} accent />}
              <SummaryRow label="تصنيف الطلب" value={
                derivedOrderType === "project" ? "مشروع تنفيذي" :
                derivedOrderType === "booking" ? "طلب حجز" : "طلب مبيعات"
              } />
              <SummaryRow label="العميل"    value={customerName || "—"} />
              {phone && <SummaryRow label="الجوال"   value={phone} />}
              <SummaryRow label="الفعالية"  value={eventDate ? new Date(eventDate).toLocaleDateString("ar-SA") + (eventTime ? ` — ${eventTime}` : "") : "—"} />
              {location && <SummaryRow label="الموقع"  value={location} />}
              <SummaryRow label="الفريق"   value={`${teamSize} أشخاص`} />
              {totalNum > 0 && (
                <>
                  <div className="border-t border-[#eef2f6] pt-2 mt-1" />
                  <SummaryRow label="الإجمالي"  value={`${totalNum.toLocaleString("ar-SA")} ر.س`} accent />
                  {depositNum > 0 && <SummaryRow label="العربون"  value={`${depositNum.toLocaleString("ar-SA")} ر.س`} />}
                  {balance > 0    && <SummaryRow label="الباقي"   value={`${balance.toLocaleString("ar-SA")} ر.س`} warn />}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ServiceCard({ svc, selected, onSelect }: { svc: any; selected: boolean; onSelect: () => void }) {
  // executionReady: block only when explicitly false (API field)
  const notReady = svc.executionReady === false;
  const kind = getItemKind(svc);
  return (
    <button
      onClick={notReady ? undefined : onSelect}
      disabled={notReady}
      title={notReady ? "هذه الخدمة غير مكتملة — أضف مكوناتها وتكاليفها أولاً" : undefined}
      className={clsx(
        "w-full text-right rounded-xl border-2 p-3 transition-all flex items-center gap-3",
        notReady
          ? "border-amber-200 bg-amber-50/50 opacity-70 cursor-not-allowed"
          : selected
            ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200"
            : "border-[#eef2f6] hover:border-[#eef2f6] bg-white"
      )}
    >
      {/* Cover image */}
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
        {svc.coverImage ? (
          <img src={svc.coverImage} alt={svc.name} className="w-full h-full object-cover" />
        ) : (
          <ImageOff className="w-5 h-5 text-brand-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-800 truncate">{svc.name}</p>
          {/* Type badge */}
          <span className={clsx(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
            kind === "execution"
              ? "bg-violet-100 text-violet-700"
              : "bg-sky-100 text-sky-700"
          )}>
            {ITEM_KIND_LABELS[kind]}
          </span>
          {notReady && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" />ناقصة
            </span>
          )}
        </div>
        {svc.shortDescription && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{svc.shortDescription}</p>
        )}
        {notReady ? (
          <p className="text-xs text-amber-600 mt-1">أكمل إعداد الخدمة قبل استخدامها</p>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            {svc.basePrice && (
              <span className="text-xs text-brand-600 font-medium">
                {Number(svc.basePrice).toLocaleString("ar-SA")} ر.س
              </span>
            )}
            {svc.workerCount && (
              <span className="text-xs text-gray-400">
                {svc.workerCount} أشخاص
              </span>
            )}
          </div>
        )}
      </div>

      {selected && !notReady && <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0" />}
    </button>
  );
}

function SummaryRow({ label, value, accent, warn }: {
  label: string; value: string; accent?: boolean; warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={clsx(
        "font-medium",
        accent ? "text-brand-700" : warn ? "text-amber-700" : "text-gray-700"
      )}>{value}</span>
    </div>
  );
}
