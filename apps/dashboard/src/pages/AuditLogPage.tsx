import { useState } from "react";
import { ClipboardList, Search, Loader2, RefreshCw, User, Calendar, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import { auditLogApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Pagination } from "@/components/ui/Pagination";

const RESOURCES = [
  { value: "", label: "الكل" },
  { value: "booking", label: "حجوزات" },
  { value: "service", label: "خدمات" },
  { value: "customer", label: "عملاء" },
  { value: "invoice", label: "فواتير" },
  { value: "expense", label: "مصروفات" },
  { value: "staff", label: "فريق" },
  { value: "settings", label: "إعدادات" },
];

const ACTION_STYLES: Record<string, { cls: string; label: string; dot: string }> = {
  created:          { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "إنشاء",        dot: "bg-emerald-500" },
  create:           { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "إنشاء",        dot: "bg-emerald-500" },
  updated:          { cls: "bg-blue-50 text-blue-700 border-blue-200",          label: "تعديل",        dot: "bg-blue-500"    },
  update:           { cls: "bg-blue-50 text-blue-700 border-blue-200",          label: "تعديل",        dot: "bg-blue-500"    },
  edit:             { cls: "bg-blue-50 text-blue-700 border-blue-200",          label: "تعديل",        dot: "bg-blue-500"    },
  deleted:          { cls: "bg-red-50 text-red-700 border-red-200",             label: "حذف",          dot: "bg-red-500"     },
  delete:           { cls: "bg-red-50 text-red-700 border-red-200",             label: "حذف",          dot: "bg-red-500"     },
  approved:         { cls: "bg-violet-50 text-violet-700 border-violet-200",    label: "موافقة",       dot: "bg-violet-500"  },
  rejected:         { cls: "bg-amber-50 text-amber-700 border-amber-200",       label: "رفض",          dot: "bg-amber-500"   },
  payment_recorded: { cls: "bg-teal-50 text-teal-700 border-teal-200",          label: "دفعة",         dot: "bg-teal-500"    },
  post:             { cls: "bg-indigo-50 text-indigo-700 border-indigo-200",    label: "ترحيل",        dot: "bg-indigo-500"  },
  reverse:          { cls: "bg-orange-50 text-orange-700 border-orange-200",    label: "عكس",          dot: "bg-orange-500"  },
  login:            { cls: "bg-sky-50 text-sky-700 border-sky-200",             label: "دخول",         dot: "bg-sky-500"     },
  logout:           { cls: "bg-gray-50 text-gray-600 border-[#eef2f6]",          label: "خروج",         dot: "bg-gray-400"    },
  completed:        { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "اكتمل",        dot: "bg-emerald-500" },
  adjusted:         { cls: "bg-yellow-50 text-yellow-700 border-yellow-200",    label: "تسوية",        dot: "bg-yellow-500"  },
  moved:            { cls: "bg-purple-50 text-purple-700 border-purple-200",    label: "نقل",          dot: "bg-purple-500"  },
  returned:         { cls: "bg-rose-50 text-rose-700 border-rose-200",          label: "إرجاع",        dot: "bg-rose-500"    },
  send:             { cls: "bg-cyan-50 text-cyan-700 border-cyan-200",          label: "إرسال",        dot: "bg-cyan-500"    },
  view:             { cls: "bg-gray-50 text-gray-500 border-[#eef2f6]",          label: "عرض",          dot: "bg-gray-300"    },
  settle_gratuity:  { cls: "bg-teal-50 text-teal-700 border-teal-200",          label: "تسوية مكافأة", dot: "bg-teal-500"    },
};

const RESOURCE_LABELS: Record<string, string> = {
  // نظام
  auth: "تسجيل الدخول", access_log: "سجل الوصول", api_key: "مفتاح API",
  onboarding: "تهيئة الحساب", settings: "إعدادات",
  // حجوزات وخدمات
  booking: "حجز", service: "خدمة", addon: "إضافة", category: "تصنيف",
  pricing_rule: "قاعدة تسعير", approval_rule: "قاعدة موافقة",
  // عملاء
  customer: "عميل", customer_segment: "شريحة عملاء", beauty_profile: "ملف جمالي",
  visit_note: "ملاحظة زيارة",
  // مالية
  invoice: "فاتورة", expense: "مصروف", payment: "دفعة",
  journal_entry: "قيد محاسبي", chart_of_accounts: "حساب", treasury_account: "حساب خزينة",
  reconciliation_statement: "كشف تسوية", reconciliation_item: "بند تسوية",
  supplier_invoice: "فاتورة مورد", pos_sale: "بيع نقطة بيع", pos_split_sale: "بيع مشترك",
  // فريق وموارد بشرية
  team: "فريق", staff: "موظف", vendor_profile: "مستقل",
  // ورد ومخزون
  flower_order: "طلب ورد", arrangement: "تنسيق", bundle: "باقة",
  supplier: "مورد", purchase_order: "أمر شراء", salon_supply: "مستلزمات",
  // فندقة وسيارات
  room_type: "نوع غرفة", room_unit: "وحدة غرفة",
  vehicle: "مركبة", vehicle_category: "فئة مركبة", rental_contract: "عقد إيجار",
  // عقارات
  property: "عقار", property_expense: "مصروف عقار",
  // مطعم
  menu_item: "صنف قائمة", menu_category: "تصنيف قائمة",
  restaurant_table: "طاولة", restaurant_booking_config: "إعداد حجز",
  online_order: "طلب إلكتروني",
  // تسويق وتواصل
  campaign: "حملة تسويقية", coupon: "كوبون", message_template: "قالب رسائل",
  messaging_settings: "إعدادات المراسلة", automation_rule: "أتمتة",
  payment_link: "رابط دفع", booking_payment_link: "رابط دفع حجز",
  // مواد وأصول
  asset: "أصل", asset_type: "نوع أصل", work_order: "أمر عمل",
  // موقع وتسويق
  blog_post: "مقال", site_page: "صفحة الموقع", media_asset: "وسائط",
  media_gallery: "معرض", service_media: "وسائط الخدمة",
  // أخرى
  role: "دور", capability_override: "تجاوز صلاحية",
  payment_gateway: "بوابة دفع", payment_gateway_credentials: "بيانات بوابة",
  ticket_issuance: "إصدار تذكرة", event: "مناسبة", event_quotation: "عرض سعر مناسبة",
  service_recipe: "وصفة خدمة", delivery_partner: "شريك توصيل",
  message_templates_reseeded: "إعادة قوالب الرسائل",
  performance_review: "تقييم أداء",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك", admin: "مدير", manager: "مشرف",
  staff: "موظف", operator: "مشغّل", branch_manager: "مدير فرع",
};

function fmtDateTime(ts: string) {
  const d = new Date(ts);
  const date = d.toLocaleDateString("ar-SA", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const day = Math.floor(h / 24);
  if (day < 30) return `منذ ${day} يوم`;
  return fmtDateTime(ts).date;
}

const PAGE_SIZE = 50;

function LogRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const style = ACTION_STYLES[log.action] || { cls: "bg-gray-50 text-gray-600 border-[#eef2f6]", label: log.action, dot: "bg-gray-400" };
  const { date, time } = log.createdAt ? fmtDateTime(log.createdAt) : { date: "—", time: "—" };
  const hasDetails = log.metadata || log.newValue || log.oldValue;

  return (
    <>
      <tr
        className={clsx("border-b border-gray-50 transition-colors", expanded ? "bg-brand-50/30" : "hover:bg-[#f8fafc]/40")}
        onClick={() => hasDetails && setExpanded(e => !e)}
        style={{ cursor: hasDetails ? "pointer" : "default" }}
      >
        {/* Action */}
        <td className="py-[6px] px-[10px]">
          <div className="flex items-center gap-2">
            <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
            <span className={clsx("px-2.5 py-1 rounded-lg border text-xs font-semibold", style.cls)}>
              {style.label}
            </span>
          </div>
        </td>

        {/* Where — resource */}
        <td className="py-[6px] px-[10px]">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            <span className="text-gray-700 font-medium text-sm">
              {RESOURCE_LABELS[log.resource] || log.resource || "—"}
            </span>
            {log.resourceId && (
              <span className="text-gray-300 font-mono text-[10px]">#{log.resourceId.slice(0, 6)}</span>
            )}
          </div>
        </td>

        {/* Who — user */}
        <td className="py-[6px] px-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-gray-800 font-medium leading-tight">
                {log.userName || <span className="text-gray-400 font-normal">نظام</span>}
              </p>
              {log.userRole && (
                <p className="text-[10px] text-gray-400">{ROLE_LABELS[log.userRole] || log.userRole}</p>
              )}
            </div>
          </div>
        </td>

        {/* When */}
        <td className="py-[6px] px-[10px]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            <div>
              <p className="text-xs text-gray-700">{date}</p>
              <p className="text-[10px] text-gray-400">{time} · {log.createdAt ? timeAgo(log.createdAt) : ""}</p>
            </div>
          </div>
        </td>

        {/* IP */}
        <td className="py-[6px] px-[10px] text-xs text-gray-400 font-mono">{log.ip || "—"}</td>

        {/* Expand arrow */}
        <td className="py-3 px-3 text-gray-300">
          {hasDetails && (expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
        </td>
      </tr>

      {/* Detail row */}
      {expanded && hasDetails && (
        <tr className="bg-brand-50/20 border-b border-brand-100">
          <td colSpan={6} className="px-6 pb-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {log.metadata?.description && (
                <div className="col-span-2 p-3 bg-white rounded-2xl border border-[#eef2f6]">
                  <p className="text-gray-400 mb-1 font-medium">الوصف</p>
                  <p className="text-gray-700">{String(log.metadata.description)}</p>
                </div>
              )}
              {log.newValue && (
                <div className="p-3 bg-white rounded-2xl border border-[#eef2f6]">
                  <p className="text-gray-400 mb-1 font-medium">البيانات الجديدة</p>
                  <pre className="text-gray-600 whitespace-pre-wrap break-all font-mono text-[10px] max-h-28 overflow-auto">
                    {typeof log.newValue === "string" ? log.newValue : JSON.stringify(log.newValue, null, 2)}
                  </pre>
                </div>
              )}
              {log.oldValue && (
                <div className="p-3 bg-white rounded-2xl border border-[#eef2f6]">
                  <p className="text-gray-400 mb-1 font-medium">البيانات السابقة</p>
                  <pre className="text-gray-600 whitespace-pre-wrap break-all font-mono text-[10px] max-h-28 overflow-auto">
                    {typeof log.oldValue === "string" ? log.oldValue : JSON.stringify(log.oldValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditLogPage() {
  const [search, setSearch]     = useState("");
  const [resource, setResource] = useState("");
  const [page, setPage]         = useState(1);

  const { data: res, loading, refetch } = useApi(
    () => auditLogApi.list({ resource: resource || undefined, search: search || undefined, page: String(page), limit: String(PAGE_SIZE) }),
    [resource, page]
  );
  const logs = res?.data || [];

  const filtered = search
    ? logs.filter((l: any) =>
        l.action?.includes(search) || l.resource?.includes(search) ||
        l.userName?.includes(search) || l.resourceId?.includes(search))
    : logs;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleResource = (v: string) => { setResource(v); setPage(1); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-500" /> سجل الأحداث
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            كل إجراء مسجّل بـ <span className="font-semibold text-gray-600">من</span> قام به،
            <span className="font-semibold text-gray-600"> متى</span>، و
            <span className="font-semibold text-gray-600"> أين</span> في النظام
          </p>
        </div>
        <button onClick={refetch}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="بحث بالإجراء أو المورد أو المستخدم..."
            className="w-full bg-white border border-[#eef2f6] rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {RESOURCES.map(r => (
            <button key={r.value} onClick={() => handleResource(r.value)}
              className={clsx("px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                resource === r.value
                  ? "bg-brand-500 border-brand-500 text-white shadow-sm"
                  : "border-[#eef2f6] text-gray-600 hover:border-[#eef2f6] bg-white")}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium">لا توجد أحداث مسجّلة</p>
            <p className="text-xs text-gray-300 mt-1">ستظهر هنا جميع التغييرات والعمليات تلقائياً</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eef2f6] bg-gray-50/60">
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">الإجراء</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> أين</span>
                </th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> من</span>
                </th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> متى</span>
                </th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">IP</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any) => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={res?.pagination?.total ?? filtered.length}
            onPage={setPage}
            label="سجل"
          />
        )}
      </div>
    </div>
  );
}
