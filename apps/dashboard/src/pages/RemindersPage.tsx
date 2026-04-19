import { useState, useEffect } from "react";
import {
  Bell, Plus, Check, Clock, AlertCircle, ChevronDown, Filter, Search,
  FileText, Users, DollarSign, FileSignature, RefreshCw, Wrench, Loader2,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { remindersApi } from "@/lib/api";
import { PageHeader, EmptyState, Modal, Button, Toggle } from "@/components/ui";
import { clsx } from "clsx";

// ──────────────────────────────────────────────────────────────
// Priority + Status maps
// ──────────────────────────────────────────────────────────────

const PRIORITY_MAP: Record<string, { label: string; bg: string; color: string }> = {
  high:   { label: "عالية",  bg: "#fef2f2", color: "#dc2626" },
  medium: { label: "متوسطة", bg: "#fffbeb", color: "#d97706" },
  low:    { label: "منخفضة", bg: "#f0f9ff", color: "#0284c7" },
};

const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
  upcoming:   { label: "قادم",    icon: Clock,         color: "#5b9bd5" },
  overdue:    { label: "متأخر",   icon: AlertCircle,   color: "#dc2626" },
  completed:  { label: "مكتمل",   icon: Check,         color: "#059669" },
  snoozed:    { label: "مؤجل",    icon: Clock,         color: "#d97706" },
};

const CATEGORY_ICONS: Record<string, any> = {
  "وثائق وتراخيص": FileText,
  "عمالة وموظفين":  Users,
  "مالية وضرائب":  DollarSign,
  "عقود وإيجارات": FileSignature,
  "اشتراكات وأنظمة": RefreshCw,
  "صيانة ومعدات":  Wrench,
  "أخرى":          Bell,
};

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dateStr);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

// ──────────────────────────────────────────────────────────────
// Add Reminder Modal
// ──────────────────────────────────────────────────────────────

function AddReminderModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"template"|"custom">("template");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  const { data: tplData, loading: tplLoading, refetch: refetchTpl } = useApi(() => remindersApi.templates(), []);
  const { data: catData, loading: catLoading, refetch: refetchCat } = useApi(() => remindersApi.categories(), []);

  useEffect(() => {
    if (open) { refetchTpl(); refetchCat(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const templates: any[] = tplData?.data || [];
  const categories: any[] = catData?.data || [];
  const loadingData = tplLoading || catLoading;

  const grouped = categories.map((cat) => ({
    ...cat,
    templates: templates.filter((t) => t.categoryId === cat.id),
  })).filter((c) => c.templates.length > 0);

  const handleSave = async () => {
    if (!dueDate) return;
    setSaving(true);
    try {
      if (mode === "template" && selectedTemplate) {
        await remindersApi.fromTemplate(selectedTemplate, dueDate);
      } else {
        await remindersApi.create({ title, dueDate, priority });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="اضافة تذكير" size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-[#f1f5f9] rounded-lg">الغاء</button>
          <button
            onClick={handleSave}
            disabled={saving || !dueDate || (mode === "custom" && !title)}
            className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            حفظ التذكير
          </button>
        </>
      }
    >
      {/* Mode toggle */}
      <div className="flex gap-2 mb-5 p-1 bg-[#f1f5f9] rounded-xl">
        {[
          { id: "template", label: "من قالب جاهز" },
          { id: "custom",   label: "تذكير مخصص" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as any)}
            className={clsx(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
              mode === m.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "template" ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">اختر قالب وادخل التاريخ — سيُكمل الباقي تلقائياً</p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
              </div>
            ) : grouped.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد قوالب متاحة</p>
            ) : null}
            {!loadingData && grouped.map((cat) => (
              <div key={cat.id}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat.name}</p>
                <div className="space-y-1">
                  {cat.templates.map((tpl: any) => (
                    <label key={tpl.id} className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                      selectedTemplate === tpl.id ? "border-brand-500 bg-brand-500/5" : "border-[#eef2f6] hover:border-[#eef2f6] bg-gray-50"
                    )}>
                      <input type="radio" name="template" value={tpl.id} checked={selectedTemplate === tpl.id}
                        onChange={() => setSelectedTemplate(tpl.id)} className="hidden" />
                      <div className={clsx(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        selectedTemplate === tpl.id ? "border-brand-500 bg-brand-500" : "border-[#eef2f6]"
                      )}>
                        {selectedTemplate === tpl.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="text-sm text-gray-800">{tpl.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">التاريخ <span className="text-red-400">*</span></label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-[#eef2f6] px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">العنوان <span className="text-red-400">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تجديد السجل التجاري"
              className="w-full rounded-lg border border-[#eef2f6] px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">التاريخ <span className="text-red-400">*</span></label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-[#eef2f6] px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">الأولوية</label>
            <div className="flex gap-2">
              {[
                { id: "high", label: "عالية", color: "#dc2626", bg: "#fef2f2" },
                { id: "medium", label: "متوسطة", color: "#d97706", bg: "#fffbeb" },
                { id: "low", label: "منخفضة", color: "#0284c7", bg: "#f0f9ff" },
              ].map((p) => (
                <button key={p.id} onClick={() => setPriority(p.id)}
                  style={{ borderColor: priority === p.id ? p.color : "#e2e8f0", background: priority === p.id ? p.bg : "white", color: priority === p.id ? p.color : "#94a3b8" }}
                  className="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// Reminder Card
// ──────────────────────────────────────────────────────────────

function ReminderCard({ reminder, onComplete, onRefresh }: { reminder: any; onComplete: (id: string) => void; onRefresh: () => void }) {
  const days  = daysUntil(reminder.due_date || reminder.dueDate);
  const status = days < 0 ? "overdue" : (reminder.status || "upcoming");
  const smap  = STATUS_MAP[status] || STATUS_MAP.upcoming;
  const pmap  = PRIORITY_MAP[reminder.priority] || PRIORITY_MAP.medium;
  const done  = status === "completed";

  return (
    <div className={clsx(
      "flex items-center gap-4 p-4 rounded-xl border transition-all",
      done ? "bg-gray-50 border-[#eef2f6] opacity-60" : status === "overdue" ? "bg-red-50 border-red-100" : "bg-white border-[#eef2f6] hover:border-[#eef2f6]",
    )}>
      <button
        onClick={() => !done && onComplete(reminder.id)}
        className={clsx(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          done ? "border-green-500 bg-green-500" : status === "overdue" ? "border-red-400 hover:bg-red-100" : "border-[#eef2f6] hover:border-brand-500"
        )}
      >
        {done && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={clsx("text-sm font-medium truncate", done && "line-through text-gray-400")}>{reminder.title}</p>
        {reminder.description && <p className="text-xs text-gray-400 truncate mt-0.5">{reminder.description}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: pmap.bg, color: pmap.color }}>{pmap.label}</span>
        <span className="text-xs font-medium" style={{ color: smap.color }}>
          {done ? "مكتمل" : days < 0 ? `متأخر ${Math.abs(days)} يوم` : days === 0 ? "اليوم" : `${days} يوم`}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(reminder.due_date || reminder.dueDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "all",       label: "الكل" },
  { id: "overdue",   label: "متأخرة" },
  { id: "upcoming",  label: "قريبة" },
  { id: "completed", label: "مكتملة" },
];

export function RemindersPage() {
  const [tab, setTab]           = useState("all");
  const [search, setSearch]     = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [key, setKey]           = useState(0);

  const refresh = () => setKey((k) => k + 1);

  const { data, loading } = useApi(
    () => remindersApi.list(tab !== "all" && tab !== "overdue" ? { status: tab } : undefined),
    [tab, key]
  );

  const allReminders: any[] = data?.data || [];

  const filtered = allReminders.filter((r) => {
    const days = daysUntil(r.due_date || r.dueDate);
    if (tab === "overdue" && days >= 0) return false;
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const overdue  = allReminders.filter((r) => daysUntil(r.due_date || r.dueDate) < 0 && r.status !== "completed");
  const upcoming = allReminders.filter((r) => { const d = daysUntil(r.due_date || r.dueDate); return d >= 0 && d <= 30 && r.status !== "completed"; });

  const handleComplete = async (id: string) => {
    setCompleting(id);
    try {
      await remindersApi.complete(id);
      refresh();
    } finally {
      setCompleting(null);
    }
  };

  return (
    <div dir="rtl">
      <PageHeader
        title="التذكيرات"
        description="تتبع تجديداتك وواجباتك والتزاماتك في مكان واحد"
        tabs={TABS.map((t) => ({
          ...t,
          count: t.id === "overdue" ? overdue.length : t.id === "upcoming" ? upcoming.length : undefined,
        }))}
        activeTab={tab}
        onTabChange={setTab}
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            اضافة تذكير
          </button>
        }
      />

      {/* Stats row */}
      {overdue.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            لديك <strong>{overdue.length}</strong> تذكير متأخر يحتاج اهتمامك
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#eef2f6] rounded-xl px-3 py-2.5 focus-within:border-brand-500 transition-colors">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="بحث في التذكيرات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder-gray-400"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={tab === "overdue" ? "لا يوجد تذكيرات متأخرة" : "لا يوجد تذكيرات"}
          description="اضف تذكيرات لمتابعة تجديداتك وواجباتك بشكل منظم"
          action={
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600">
              <Plus className="w-4 h-4" />
              اضافة تذكير
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <ReminderCard
              key={r.id}
              reminder={r}
              onComplete={handleComplete}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      <AddReminderModal open={showAdd} onClose={() => setShowAdd(false)} onSaved={refresh} />
    </div>
  );
}
