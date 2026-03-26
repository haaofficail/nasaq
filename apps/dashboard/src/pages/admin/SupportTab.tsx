import React, { useState } from "react";
import { Building2, RefreshCw, Search, MessageSquare, ChevronLeft, Send, Loader2, X, Headphones } from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";

const TICKET_CATEGORIES: Record<string, { label: string; color: string }> = {
  general:    { label: "استفسار عام",    color: "bg-gray-100 text-gray-600"    },
  billing:    { label: "فواتير",         color: "bg-amber-50 text-amber-700"   },
  technical:  { label: "مشكلة تقنية",   color: "bg-red-50 text-red-600"       },
  onboarding: { label: "مساعدة بدء",    color: "bg-emerald-50 text-emerald-700" },
};
const TICKET_PRIORITIES: Record<string, { label: string; color: string }> = {
  low:    { label: "منخفض", color: "bg-gray-100 text-gray-500"    },
  normal: { label: "عادي",  color: "bg-blue-50 text-blue-600"     },
  high:   { label: "مرتفع", color: "bg-orange-50 text-orange-700" },
  urgent: { label: "عاجل",  color: "bg-red-50 text-red-600"       },
};

function AdminTicketDetail({ ticketId, onClose, onRefresh }: { ticketId: string; onClose: () => void; onRefresh: () => void }) {
  const { data, loading, refetch } = useApi(() => adminApi.getTicket(ticketId), [ticketId]);
  const ticket  = data?.data;
  const [reply, setReply]     = useState("");
  const [sending, setSending] = useState(false);

  const fmtDate = (d: string) => d ? new Date(d).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await adminApi.replyTicket(ticketId, reply.trim());
      setReply(""); refetch(); onRefresh();
    } finally { setSending(false); }
  };

  const changeStatus = async (status: string) => {
    await adminApi.updateTicket(ticketId, { status });
    refetch(); onRefresh();
  };

  const messages: any[] = ticket?.messages || [];

  return (
    <div className="fixed inset-0 z-[60] flex" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mr-auto w-full max-w-xl bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 ml-3">
            {loading ? (
              <div className="space-y-2"><div className="h-4 w-40 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-24 bg-gray-100 rounded animate-pulse" /></div>
            ) : ticket ? (
              <>
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {ticket.orgName && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      <Building2 className="w-3 h-3" />{ticket.orgName}
                    </span>
                  )}
                  <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    ticket.status === "open"        ? "bg-blue-50 text-blue-600"
                  : ticket.status === "in_progress" ? "bg-amber-50 text-amber-600"
                  : ticket.status === "resolved"    ? "bg-emerald-50 text-emerald-600"
                  :                                   "bg-gray-100 text-gray-500"
                  )}>
                    {ticket.status === "open" ? "مفتوحة" : ticket.status === "in_progress" ? "قيد المعالجة" : ticket.status === "resolved" ? "محلولة" : "مغلقة"}
                  </span>
                  {TICKET_PRIORITIES[ticket.priority] && (
                    <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", TICKET_PRIORITIES[ticket.priority].color)}>
                      {TICKET_PRIORITIES[ticket.priority].label}
                    </span>
                  )}
                  {TICKET_CATEGORIES[ticket.category] && (
                    <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", TICKET_CATEGORIES[ticket.category].color)}>
                      {TICKET_CATEGORIES[ticket.category].label}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-bold text-gray-900 leading-snug">{ticket.subject}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(ticket.createdAt)}</p>
              </>
            ) : null}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status actions */}
        {ticket && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 bg-gray-50/60 shrink-0 flex-wrap">
            <span className="text-[11px] text-gray-500 font-medium">تغيير الحالة:</span>
            {ticket.status !== "in_progress" && (
              <button onClick={() => changeStatus("in_progress")} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 font-medium transition-colors">قيد المعالجة</button>
            )}
            {ticket.status !== "resolved" && (
              <button onClick={() => changeStatus("resolved")} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-medium transition-colors">محلولة</button>
            )}
            {ticket.status !== "open" && (
              <button onClick={() => changeStatus("open")} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-100 font-medium transition-colors">إعادة فتح</button>
            )}
            {ticket.status !== "closed" && (
              <button onClick={() => changeStatus("closed")} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 font-medium transition-colors">إغلاق</button>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/30">
          {loading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
          ) : (
            <>
              {ticket && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">
                    {ticket.orgName?.[0] ?? "م"}
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-semibold text-gray-500 mb-1">{ticket.orgName ?? "المنشأة"}</p>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{ticket.body}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 mr-1">{fmtDate(ticket.createdAt)}</p>
                  </div>
                </div>
              )}
              {messages.map((msg: any) => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div key={msg.id} className={clsx("flex gap-3", isAdmin && "flex-row-reverse")}>
                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                      isAdmin ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-600"
                    )}>
                      {isAdmin ? "ن" : ticket?.orgName?.[0] ?? "م"}
                    </div>
                    <div className={clsx("flex-1", isAdmin && "flex flex-col items-end")}>
                      <div className={clsx("border rounded-2xl px-4 py-3 shadow-sm max-w-[85%]",
                        isAdmin ? "bg-brand-500 border-brand-500 rounded-tl-sm" : "bg-white border-gray-100 rounded-tr-sm"
                      )}>
                        {isAdmin && <p className="text-[10px] font-semibold text-brand-200 mb-1">{msg.senderName || "فريق نسق"}</p>}
                        <p className={clsx("text-sm leading-relaxed whitespace-pre-wrap", isAdmin ? "text-white" : "text-gray-800")}>{msg.message}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 mx-1">{fmtDate(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && ticket && (
                <div className="flex flex-col items-center py-4 text-center">
                  <MessageSquare className="w-7 h-7 text-gray-200 mb-1.5" />
                  <p className="text-xs text-gray-400">لا توجد ردود بعد</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Reply */}
        <div className="border-t border-gray-100 p-4 bg-white shrink-0">
          <div className="space-y-2.5">
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
              placeholder="اكتب ردّك على التذكرة... (Ctrl+Enter للإرسال)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50/60 bg-white placeholder:text-gray-300 transition-all" />
            <div className="flex justify-end">
              <button onClick={sendReply} disabled={sending || !reply.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                إرسال الرد للتاجر
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportTab() {
  const [statusFilter, setStatusFilter]     = useState("open");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch]                 = useState("");
  const [activeTicket, setActiveTicket]     = useState<string | null>(null);
  const { data, loading, refetch } = useApi(
    () => adminApi.tickets({ status: statusFilter || undefined, category: categoryFilter || undefined }),
    [statusFilter, categoryFilter]
  );

  const tickets: any[] = data?.data || [];
  const stats: Record<string, number> = data?.stats || {};

  const filtered = search.trim()
    ? tickets.filter((t: any) =>
        t.subject?.toLowerCase().includes(search.toLowerCase()) ||
        t.body?.toLowerCase().includes(search.toLowerCase()) ||
        t.orgName?.toLowerCase().includes(search.toLowerCase())
      )
    : tickets;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionHeader title="الدعم الفني" sub="تذاكر الدعم الواردة من التجار" />
        <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-500 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "مفتوحة",       val: stats["open"]        ?? 0, color: "text-blue-600",    bg: "bg-blue-50"    },
          { label: "قيد المعالجة", val: stats["in_progress"] ?? 0, color: "text-amber-600",   bg: "bg-amber-50"   },
          { label: "محلولة",       val: stats["resolved"]    ?? 0, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "مغلقة",        val: stats["closed"]      ?? 0, color: "text-gray-500",    bg: "bg-gray-50"    },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <p className={clsx("text-xl font-bold", s.color)}>{s.val}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {[["open", "مفتوحة"], ["in_progress", "قيد المعالجة"], ["resolved", "محلولة"], ["closed", "مغلقة"], ["", "الكل"]].map(([s, l]) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px] border border-gray-200 rounded-xl px-3 h-9 bg-white focus-within:border-brand-300 transition-all">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالموضوع أو المنشأة..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-300" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="h-9 border border-gray-200 rounded-xl px-3 text-xs text-gray-600 outline-none bg-white focus:border-brand-300">
          <option value="">كل التصنيفات</option>
          {Object.entries(TICKET_CATEGORIES).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon={Headphones} text="لا توجد تذاكر" /> : (
        <div className="space-y-2">
          {filtered.map((t: any) => (
            <div key={t.id}
              onClick={() => setActiveTicket(t.id)}
              className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:border-brand-200 hover:shadow-sm transition-all group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {t.orgName && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                        <Building2 className="w-3 h-3" />{t.orgName}
                      </span>
                    )}
                    <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      t.status === "open"        ? "bg-blue-50 text-blue-600"
                    : t.status === "in_progress" ? "bg-amber-50 text-amber-600"
                    : t.status === "resolved"    ? "bg-emerald-50 text-emerald-600"
                    :                              "bg-gray-100 text-gray-500"
                    )}>
                      {t.status === "open" ? "مفتوحة" : t.status === "in_progress" ? "قيد المعالجة" : t.status === "resolved" ? "محلولة" : "مغلقة"}
                    </span>
                    {TICKET_PRIORITIES[t.priority] && (
                      <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", TICKET_PRIORITIES[t.priority].color)}>
                        {TICKET_PRIORITIES[t.priority].label}
                      </span>
                    )}
                    {TICKET_CATEGORIES[t.category] && (
                      <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", TICKET_CATEGORIES[t.category].color)}>
                        {TICKET_CATEGORIES[t.category].label}
                      </span>
                    )}
                    {Array.isArray(t.messages) && t.messages.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        <MessageSquare className="w-3 h-3" />{t.messages.length} رد
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{t.body}</p>
                  <p className="text-[10px] text-gray-300 mt-1.5">
                    {t.updatedAt ? new Date(t.updatedAt).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTicket && (
        <AdminTicketDetail
          ticketId={activeTicket}
          onClose={() => setActiveTicket(null)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}

export default SupportTab;
