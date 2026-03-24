import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { salonApi } from "@/lib/api";
import { Users, Phone, MessageCircle, Clock, Send } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

const INTERVALS = [
  { weeks: 4,  label: "4 أسابيع", desc: "قصة شعر" },
  { weeks: 6,  label: "6 أسابيع", desc: "صبغة جذور" },
  { weeks: 8,  label: "8 أسابيع", desc: "هايلايت" },
  { weeks: 12, label: "12 أسبوع", desc: "علاج متخصص" },
];

const WA_TEMPLATE = (name: string) =>
  `مرحباً ${name}،\nلاحظنا أنه مضى وقت منذ زيارتك الأخيرة لنا 💇\nنود دعوتك لحجز موعدك القادم — فريقنا مستعد لخدمتك!\nاحجزي الآن عبر الرابط: `;

export function RecallPage() {
  const [weeks, setWeeks] = useState(6);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customMsg, setCustomMsg] = useState("");
  const [showMsgPanel, setShowMsgPanel] = useState(false);

  const { data, loading, refetch } = useApi(
    () => salonApi.recall(weeks),
    [weeks]
  );

  const clients: any[] = data?.data || [];
  const allSelected = clients.length > 0 && selected.size === clients.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(clients.map(c => c.id)));
  };

  const buildWaLink = (phone: string, msg: string) => {
    const clean = phone.replace(/\D/g, "");
    const intl = clean.startsWith("0") ? "966" + clean.slice(1) : clean;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  };

  const selectedClients = clients.filter(c => selected.has(c.id));
  const msgToSend = customMsg.trim() || "مرحباً! نود تذكيرك بموعدك القادم معنا. احجزي الآن.";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-500" /> استرجاع العملاء
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">عملاء حان موعدهم للزيارة</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => setShowMsgPanel(true)}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600"
          >
            <MessageCircle className="w-4 h-4" />
            تواصل مع {selected.size} عميل
          </button>
        )}
      </div>

      {/* Interval selector */}
      <div className="flex gap-2 flex-wrap">
        {INTERVALS.map(i => (
          <button
            key={i.weeks}
            onClick={() => { setWeeks(i.weeks); setSelected(new Set()); }}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
              weeks === i.weeks
                ? "bg-brand-500 text-white border-brand-500"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {i.label}
            <span className="block text-xs opacity-70">{i.desc}</span>
          </button>
        ))}
      </div>

      {/* Stats banner */}
      {!loading && clients.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 flex items-center gap-3">
          <Users className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            {clients.length} عميل لم يزوروا منذ أكثر من {weeks} أسبوع
          </p>
          <button onClick={toggleAll} className="mr-auto text-xs text-amber-600 hover:underline">
            {allSelected ? "إلغاء الكل" : "تحديد الكل"}
          </button>
        </div>
      )}

      {/* Clients list */}
      {loading ? (
        <SkeletonRows />
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">جميع العملاء زاروا خلال {weeks} أسبوع الأخيرة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(c => {
            const isSelected = selected.has(c.id);
            const days = c.days_since_last_visit;
            const urgency = days > weeks * 14 ? "high" : days > weeks * 7 ? "mid" : "low";

            return (
              <div
                key={c.id}
                onClick={() => {
                  const s = new Set(selected);
                  isSelected ? s.delete(c.id) : s.add(c.id);
                  setSelected(s);
                }}
                className={clsx(
                  "bg-white rounded-2xl border px-5 py-3 flex items-center gap-3 cursor-pointer transition-all",
                  isSelected ? "border-brand-300 ring-1 ring-brand-200" : "border-gray-100 hover:border-gray-200"
                )}
              >
                {/* Checkbox */}
                <div className={clsx(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  isSelected ? "border-brand-500 bg-brand-500" : "border-gray-300"
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                  {c.name?.[0] || "ع"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1" dir="ltr">
                    <Phone className="w-3 h-3" /> {c.phone}
                  </p>
                </div>

                {/* Days badge */}
                <div className={clsx(
                  "text-right shrink-0 px-3 py-1 rounded-xl text-xs font-bold",
                  urgency === "high" ? "bg-red-50 text-red-500" : urgency === "mid" ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-500"
                )}>
                  {days} يوم
                </div>

                {/* Quick WA link */}
                <a
                  href={buildWaLink(c.phone, WA_TEMPLATE(c.name))}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center hover:bg-green-100 shrink-0"
                  title="واتساب"
                >
                  <MessageCircle className="w-4 h-4 text-green-500" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk message panel */}
      {showMsgPanel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">رسالة لـ {selectedClients.length} عميل</h3>
            </div>
            <div className="p-5 space-y-3">
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                rows={4}
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                placeholder={WA_TEMPLATE("العميلة")}
              />
              <p className="text-xs text-gray-400">
                سيُفتح واتساب لكل عميل على حدة — {selectedClients.length} نافذة
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button
                onClick={() => setShowMsgPanel(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  for (const c of selectedClients) {
                    window.open(buildWaLink(c.phone, customMsg.trim() || WA_TEMPLATE(c.name)), "_blank");
                  }
                  setShowMsgPanel(false);
                  setSelected(new Set());
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600"
              >
                <Send className="w-4 h-4" /> إرسال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
