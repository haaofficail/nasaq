import { useState, useRef, useEffect } from "react";
import {
  Headphones, Plus, X, Send, ChevronLeft, Clock, CheckCircle2,
  AlertCircle, Circle, Search, Filter, Archive, RefreshCw,
  MessageSquare, Zap, ShieldCheck, HelpCircle, CreditCard, LifeBuoy,
  ArrowRight, Loader2, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { supportApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "general",    label: "استفسار عام",   icon: HelpCircle,   color: "text-gray-500 bg-gray-50"     },
  { value: "billing",    label: "فواتير ومدفوعات", icon: CreditCard,   color: "text-amber-600 bg-amber-50"  },
  { value: "technical",  label: "مشكلة تقنية",   icon: Zap,          color: "text-red-600 bg-red-50"      },
  { value: "onboarding", label: "مساعدة بدء",    icon: ShieldCheck,  color: "text-emerald-600 bg-emerald-50" },
];

const PRIORITIES = [
  { value: "low",    label: "منخفض", color: "bg-gray-100 text-gray-500"    },
  { value: "normal", label: "عادي",  color: "bg-blue-50 text-blue-600"     },
  { value: "high",   label: "مرتفع", color: "bg-orange-50 text-orange-700" },
  { value: "urgent", label: "عاجل",  color: "bg-red-50 text-red-600"       },
];

const STATUSES = [
  { value: "",            label: "الكل",        icon: Circle,       color: "text-gray-400" },
  { value: "open",        label: "مفتوحة",      icon: Circle,       color: "text-blue-500" },
  { value: "in_progress", label: "قيد المعالجة", icon: RefreshCw,    color: "text-amber-500" },
  { value: "resolved",    label: "محلولة",      icon: CheckCircle2, color: "text-emerald-500" },
  { value: "closed",      label: "مغلقة",       icon: Archive,      color: "text-gray-400" },
];

function getCat(v: string)  { return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[0]; }
function getPri(v: string)  { return PRIORITIES.find(p => p.value === v) ?? PRIORITIES[1]; }
function getStat(v: string) { return STATUSES.find(s => s.value === v) ?? STATUSES[1]; }
function fmtDate(d: string) {
  return new Date(d).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

// ─── Create Ticket Modal ──────────────────────────────────────────────────────

interface CreateModalProps { onClose: () => void; onCreated: () => void; }

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({ subject: "", body: "", category: "general", priority: "normal" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim() || form.subject.trim().length < 3) e.subject = "العنوان مطلوب (3 أحرف على الأقل)";
    if (!form.body.trim() || form.body.trim().length < 10)      e.body    = "وصف المشكلة مطلوب (10 أحرف على الأقل)";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await supportApi.create(form as any);
      toast.success("تم فتح تذكرة الدعم بنجاح");
      onCreated();
    } catch {
      toast.error("حدث خطأ، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">فتح تذكرة دعم جديدة</h2>
              <p className="text-[11px] text-gray-400">سيرد فريق الدعم خلال 24 ساعة</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">نوع الطلب</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                  className={clsx("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-right",
                    form.category === cat.value
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}>
                  <cat.icon className={clsx("w-3.5 h-3.5 shrink-0", form.category === cat.value ? "text-brand-500" : "text-gray-400")} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              عنوان المشكلة <span className="text-red-400">*</span>
            </label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="مثال: لا يمكنني إضافة خدمة جديدة"
              className={clsx("w-full border rounded-xl px-3 h-10 text-sm outline-none transition-all bg-white placeholder:text-gray-300",
                errors.subject ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50/60"
              )} />
            {errors.subject && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.subject}</p>}
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              وصف المشكلة بالتفصيل <span className="text-red-400">*</span>
            </label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4}
              placeholder="اشرح المشكلة بالتفصيل، وضّح ما حدث وما الذي توقعت حدوثه..."
              className={clsx("w-full border rounded-xl px-3 py-2.5 text-sm outline-none resize-none transition-all bg-white placeholder:text-gray-300",
                errors.body ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50/60"
              )} />
            {errors.body && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.body}</p>}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">الأولوية</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  className={clsx("flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    form.priority === p.value
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">إلغاء</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            إرسال التذكرة
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Detail Panel ──────────────────────────────────────────────────────

interface DetailPanelProps { ticketId: string; onClose: () => void; onRefresh: () => void; }

function DetailPanel({ ticketId, onClose, onRefresh }: DetailPanelProps) {
  const { data, loading, refetch } = useApi(() => supportApi.get(ticketId), [ticketId]);
  const ticket = data?.data;
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await supportApi.reply(ticketId, reply.trim());
      setReply("");
      refetch();
      onRefresh();
      toast.success("تم إرسال ردّك");
    } catch {
      toast.error("تعذّر إرسال الرد");
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!confirm("هل تريد إغلاق هذه التذكرة؟")) return;
    setClosing(true);
    try {
      await supportApi.close(ticketId);
      refetch();
      onRefresh();
      toast.success("تم إغلاق التذكرة");
    } catch {
      toast.error("تعذّر إغلاق التذكرة");
    } finally {
      setClosing(false);
    }
  };

  const cat  = ticket ? getCat(ticket.category)  : null;
  const pri  = ticket ? getPri(ticket.priority)  : null;
  const stat = ticket ? getStat(ticket.status)   : null;
  const messages: any[] = ticket?.messages || [];
  const isClosed = ticket?.status === "closed" || ticket?.status === "resolved";

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mr-auto w-full max-w-xl bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex-1 min-w-0 ml-3">
            {loading ? (
              <><Skel className="h-4 w-48 mb-2" /><Skel className="h-3 w-32" /></>
            ) : ticket ? (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {cat && (
                    <span className={clsx("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", cat.color)}>
                      <cat.icon className="w-3 h-3" />{cat.label}
                    </span>
                  )}
                  {pri && <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", pri.color)}>{pri.label}</span>}
                  {stat && (
                    <span className={clsx("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      ticket.status === "open"        ? "bg-blue-50 text-blue-600"
                    : ticket.status === "in_progress" ? "bg-amber-50 text-amber-600"
                    : ticket.status === "resolved"    ? "bg-emerald-50 text-emerald-600"
                    :                                   "bg-gray-100 text-gray-500"
                    )}>
                      <stat.icon className="w-3 h-3" />{stat.label}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-bold text-gray-900 leading-snug">{ticket.subject}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{ticket.createdAt ? fmtDate(ticket.createdAt) : ""}</p>
              </>
            ) : null}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/40">
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <Skel key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <>
              {/* Original message */}
              {ticket && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">أ</div>
                  <div className="flex-1">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{ticket.body}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 mr-1">{ticket.createdAt ? fmtDate(ticket.createdAt) : ""} · رسالتك الأولى</p>
                  </div>
                </div>
              )}
              {/* Thread messages */}
              {messages.map((msg: any) => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div key={msg.id} className={clsx("flex gap-3", isAdmin && "flex-row-reverse")}>
                    <div className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                      isAdmin ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-600"
                    )}>
                      {isAdmin ? "ن" : "أ"}
                    </div>
                    <div className={clsx("flex-1", isAdmin && "flex flex-col items-end")}>
                      <div className={clsx(
                        "border rounded-2xl px-4 py-3 shadow-sm max-w-[85%]",
                        isAdmin ? "bg-brand-500 border-brand-500 rounded-tl-sm" : "bg-white border-gray-100 rounded-tr-sm"
                      )}>
                        {isAdmin && <p className="text-[10px] font-semibold text-brand-200 mb-1">{msg.senderName || "فريق الدعم"}</p>}
                        <p className={clsx("text-sm leading-relaxed whitespace-pre-wrap", isAdmin ? "text-white" : "text-gray-800")}>{msg.message}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 mx-1">{msg.createdAt ? fmtDate(msg.createdAt) : ""}</p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && !loading && ticket && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400">تذكرتك قيد المراجعة — سيرد فريق الدعم قريباً</p>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Reply / Actions */}
        <div className="border-t border-gray-100 p-4 bg-white shrink-0">
          {isClosed ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400">
              <Archive className="w-4 h-4" />
              <span>هذه التذكرة {ticket?.status === "resolved" ? "محلولة" : "مغلقة"}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
                placeholder="اكتب ردّك هنا... (Ctrl+Enter للإرسال)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50/60 bg-white placeholder:text-gray-300 transition-all" />
              <div className="flex items-center justify-between">
                <button onClick={closeTicket} disabled={closing}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                  {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  إغلاق التذكرة
                </button>
                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  إرسال الرد
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, onClick }: { ticket: any; onClick: () => void }) {
  const cat  = getCat(ticket.category);
  const pri  = getPri(ticket.priority);
  const stat = getStat(ticket.status);
  const msgCount = Array.isArray(ticket.messages) ? ticket.messages.length : 0;

  return (
    <button onClick={onClick} className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-right hover:border-brand-200 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors", cat.color)}>
          <cat.icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full",
              ticket.status === "open"        ? "bg-blue-50 text-blue-600"
            : ticket.status === "in_progress" ? "bg-amber-50 text-amber-600"
            : ticket.status === "resolved"    ? "bg-emerald-50 text-emerald-600"
            :                                   "bg-gray-100 text-gray-400"
            )}>
              {stat.label}
            </span>
            <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", pri.color)}>{pri.label}</span>
            {msgCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                <MessageSquare className="w-3 h-3" />{msgCount} رد
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">{ticket.subject}</p>
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{ticket.body}</p>
          <p className="text-[10px] text-gray-300 mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {ticket.updatedAt ? fmtDate(ticket.updatedAt) : ""}
          </p>
        </div>
        <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SupportPage() {
  const [statusFilter, setStatusFilter]     = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch]                 = useState("");
  const [showCreate, setShowCreate]         = useState(false);
  const [activeTicket, setActiveTicket]     = useState<string | null>(null);
  const [showFilters, setShowFilters]       = useState(false);
  const [page, setPage]                     = useState(1);

  const { data, loading, refetch } = useApi(
    () => supportApi.list({ status: statusFilter || undefined, category: categoryFilter || undefined, page }),
    [statusFilter, categoryFilter, page]
  );

  const tickets: any[]            = data?.data || [];
  const stats: Record<string,number> = data?.stats || {};
  const pagination                = data?.pagination;

  const filtered = search.trim()
    ? tickets.filter(t =>
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.body.toLowerCase().includes(search.toLowerCase())
      )
    : tickets;

  const totalOpen       = (stats["open"] || 0);
  const totalInProgress = (stats["in_progress"] || 0);
  const totalResolved   = (stats["resolved"] || 0);
  const totalClosed     = (stats["closed"] || 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">بوابة الدعم الفني</h1>
          <p className="text-sm text-gray-400 mt-0.5">تواصل مع فريق نسق وتتبّع طلباتك</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20">
          <Plus className="w-4 h-4" />
          تذكرة جديدة
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "مفتوحة",       val: totalOpen,       icon: Circle,       bg: "bg-blue-50",     color: "text-blue-600",    ring: "ring-blue-100"    },
          { label: "قيد المعالجة", val: totalInProgress, icon: RefreshCw,    bg: "bg-amber-50",    color: "text-amber-600",   ring: "ring-amber-100"   },
          { label: "محلولة",       val: totalResolved,   icon: CheckCircle2, bg: "bg-emerald-50",  color: "text-emerald-600", ring: "ring-emerald-100" },
          { label: "مغلقة",        val: totalClosed,     icon: Archive,      bg: "bg-gray-50",     color: "text-gray-500",    ring: "ring-gray-100"    },
        ].map(s => (
          <button key={s.label} onClick={() => { setStatusFilter(STATUSES.find(x => x.label === s.label)?.value ?? ""); setPage(1); }}
            className="bg-white border border-gray-100 rounded-2xl p-4 text-right hover:border-brand-100 hover:shadow-sm transition-all">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            {loading ? <Skel className="h-6 w-10 mb-1" /> : (
              <p className={clsx("text-2xl font-bold", s.color)}>{s.val}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status tabs */}
          <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1); }}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  statusFilter === s.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center gap-2 min-w-[180px]">
            <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 h-9 bg-gray-50 focus-within:border-brand-300 focus-within:bg-white transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في التذاكر..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-300" />
            </div>

            <button onClick={() => setShowFilters(!showFilters)}
              className={clsx("flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium transition-all",
                showFilters ? "border-brand-300 bg-brand-50 text-brand-600" : "border-gray-200 text-gray-500 hover:border-gray-300"
              )}>
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تصفية</span>
              {categoryFilter && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
            </button>

            <button onClick={() => { refetch(); toast.success("تم تحديث القائمة"); }}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-brand-500 hover:border-brand-200 transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category filter */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">التصنيف:</span>
            <button onClick={() => setCategoryFilter("")}
              className={clsx("px-3 py-1 rounded-xl text-xs font-medium border transition-all",
                !categoryFilter ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
              )}>الكل</button>
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setCategoryFilter(cat.value === categoryFilter ? "" : cat.value)}
                className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-all",
                  categoryFilter === cat.value ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                )}>
                <cat.icon className="w-3 h-3" />{cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skel key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <Headphones className="w-7 h-7 text-brand-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {statusFilter || categoryFilter || search ? "لا توجد نتائج" : "لا توجد تذاكر بعد"}
          </h3>
          <p className="text-sm text-gray-400 mb-5 max-w-xs">
            {statusFilter || categoryFilter || search
              ? "جرّب تغيير معايير البحث أو التصفية"
              : "فريق الدعم موجود دائماً. افتح تذكرة وسنرد عليك في أقرب وقت."
            }
          </p>
          {!statusFilter && !categoryFilter && !search && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" />
              فتح أول تذكرة
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <TicketCard key={t.id} ticket={t} onClick={() => setActiveTicket(t.id)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 font-medium">
            صفحة {page} من {pagination.totalPages}
          </span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        </div>
      )}

      {/* Help banner */}
      <div className="bg-gradient-to-l from-brand-500 to-brand-600 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <LifeBuoy className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">هل تحتاج مساعدة فورية؟</p>
          <p className="text-xs text-brand-100 mt-0.5">فريق الدعم متاح الأحد–الخميس 9ص–6م. أوقات الاستجابة: عادي 24 ساعة، عاجل 4 ساعات</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-brand-600 rounded-xl text-xs font-bold hover:bg-brand-50 transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
          تذكرة جديدة
        </button>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refetch(); }} />
      )}
      {activeTicket && (
        <DetailPanel ticketId={activeTicket} onClose={() => setActiveTicket(null)} onRefresh={refetch} />
      )}
    </div>
  );
}
