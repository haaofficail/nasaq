import { useState } from "react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";
import { useSearchParams } from "react-router-dom";
import { Users, AlertCircle, UserCheck, UserX, Trash2, Save, Phone, Briefcase, Plus, UserPlus } from "lucide-react";
import { membersApi, jobTitlesApi, staffApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Modal, Input, ModernInput, ModernSelect, PageHeader, Button } from "@/components/ui";
import { RolesPage } from "./RolesPage";
import { AttendancePage } from "./AttendancePage";
import { CommissionsPage } from "./CommissionsPage";

const MEMBER_STATUS_BADGE: Record<string, { badge: string; dot: string; label: string }> = {
  active:    { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "نشط" },
  inactive:  { badge: "bg-gray-100 text-gray-500",     dot: "bg-gray-400",    label: "غير نشط" },
  suspended: { badge: "bg-red-50 text-red-700",        dot: "bg-red-500",     label: "موقوف" },
  pending:   { badge: "bg-amber-50 text-amber-700",    dot: "bg-amber-500",   label: "معلق" },
};

const ROLE_BADGE: Record<string, string> = {
  owner:     "bg-purple-50 text-purple-700",
  manager:   "bg-blue-50 text-blue-700",
  provider:  "bg-teal-50 text-teal-700",
  employee:  "bg-gray-100 text-gray-600",
  reception: "bg-sky-50 text-sky-700",
};

const EMP_BADGE: Record<string, { badge: string; label: string }> = {
  internal:   { badge: "bg-brand-50 text-brand-600",   label: "موظف داخلي" },
  freelance:  { badge: "bg-violet-50 text-violet-700", label: "مستقل" },
  outsourced: { badge: "bg-amber-50 text-amber-700",   label: "جهة خارجية" },
};

const SYSTEM_ROLE_LABELS: Record<string, string> = {
  owner:     "المالك",
  manager:   "المدير",
  provider:  "مقدم الخدمة",
  employee:  "الموظف",
  reception: "الاستقبال",
};

// ============================================================
// MEMBER MODAL
// ============================================================

function MemberModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: jtRes } = useApi(() => jobTitlesApi.list(), []);
  const jobTitles = jtRes?.data || [];

  const member = initial?.member;
  const [form, setForm] = useState({
    jobTitleId:     member?.jobTitleId || "",
    employmentType: member?.employmentType || "internal",
    status:         member?.status || "active",
    salary:         member?.salary || "",
    commissionRate: member?.commissionRate || "",
    phone:          member?.phone || "",
    notes:          member?.notes || "",
    hiredAt:        member?.hiredAt ? member.hiredAt.split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary: form.salary ? Number(form.salary) : null,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : null,
        jobTitleId: form.jobTitleId || null,
        hiredAt: form.hiredAt ? new Date(form.hiredAt).toISOString() : null,
      };
      if (initial) await membersApi.update(member.id, payload);
      onSaved();
      onClose();
    } catch {
      setError("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `تعديل: ${initial.user?.name}` : "عضو جديد"}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} loading={saving} icon={Save}>حفظ</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <ModernSelect
          label="المسمى الوظيفي"
          value={form.jobTitleId}
          onChange={v => setForm(f => ({ ...f, jobTitleId: v }))}
          options={[{ value: "", label: "— بدون مسمى —" }, ...jobTitles.map((jt: any) => ({ value: jt.id, label: jt.name }))]}
        />

        <div className="grid grid-cols-2 gap-3">
          <ModernSelect
            label="نوع التوظيف"
            value={form.employmentType}
            onChange={v => setForm(f => ({ ...f, employmentType: v }))}
            options={[
              { value: "internal",   label: "موظف داخلي" },
              { value: "freelance",  label: "مستقل" },
              { value: "outsourced", label: "جهة خارجية" },
            ]}
          />
          <ModernSelect
            label="الحالة"
            value={form.status}
            onChange={v => setForm(f => ({ ...f, status: v }))}
            options={[
              { value: "active",    label: "نشط" },
              { value: "inactive",  label: "غير نشط" },
              { value: "suspended", label: "موقوف" },
              { value: "pending",   label: "معلق" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="الراتب (ر.س)" name="salary" type="number" value={form.salary} onChange={set("salary")} dir="ltr" />
          <Input label="نسبة العمولة (%)" name="commissionRate" type="number" value={form.commissionRate} onChange={set("commissionRate")} dir="ltr" />
        </div>

        <Input label="رقم الهاتف (اختياري)" name="phone" value={form.phone} onChange={set("phone")} dir="ltr" />
        <Input label="تاريخ الانضمام" name="hiredAt" type="date" value={form.hiredAt} onChange={set("hiredAt")} dir="ltr" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
          <textarea
            value={form.notes}
            onChange={set("notes")}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none outline-none focus:border-brand-400 transition-colors"
          />
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// CREATE MEMBER MODAL
// ============================================================

function CreateMemberModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data: jtRes } = useApi(() => jobTitlesApi.list(), []);
  const jobTitles = jtRes?.data || [];

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    jobTitleId: "", employmentType: "internal", status: "active",
    salary: "", commissionRate: "", hiredAt: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) { setError("الاسم والجوال مطلوبان"); return; }
    setSaving(true);
    setError("");
    try {
      // 1. Create user account
      const userRes: any = await staffApi.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        type: "employee",
        status: "active",
      });
      const userId = userRes?.data?.id;
      if (!userId) throw new Error("فشل إنشاء الحساب");

      // 2. Create org member record
      await membersApi.create({
        userId,
        jobTitleId: form.jobTitleId || null,
        employmentType: form.employmentType,
        status: form.status,
        salary: form.salary ? Number(form.salary) : null,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : null,
        hiredAt: form.hiredAt ? new Date(form.hiredAt).toISOString() : null,
        notes: form.notes || null,
      });

      toast.success("تمت إضافة العضو");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || "فشلت الإضافة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="إضافة عضو جديد" size="md"
      footer={<><Button variant="secondary" onClick={onClose}>إلغاء</Button><Button onClick={handleSave} loading={saving} icon={Save}>إضافة</Button></>}
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Input label="الاسم *" name="name" value={form.name} onChange={set("name")} />
          <Input label="الجوال *" name="phone" value={form.phone} onChange={set("phone")} dir="ltr" />
        </div>
        <Input label="الإيميل (اختياري)" name="email" type="email" value={form.email} onChange={set("email")} dir="ltr" />

        <ModernSelect label="المسمى الوظيفي" value={form.jobTitleId}
          onChange={v => setForm(f => ({ ...f, jobTitleId: v }))}
          options={[{ value: "", label: "— بدون مسمى —" }, ...jobTitles.map((jt: any) => ({ value: jt.id, label: jt.name }))]}
        />

        <div className="grid grid-cols-2 gap-3">
          <ModernSelect label="نوع التوظيف" value={form.employmentType}
            onChange={v => setForm(f => ({ ...f, employmentType: v }))}
            options={[{ value: "internal", label: "موظف داخلي" }, { value: "freelance", label: "مستقل" }, { value: "outsourced", label: "جهة خارجية" }]}
          />
          <ModernSelect label="الحالة" value={form.status}
            onChange={v => setForm(f => ({ ...f, status: v }))}
            options={[{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }, { value: "pending", label: "معلق" }]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="الراتب (ر.س)" name="salary" type="number" value={form.salary} onChange={set("salary")} dir="ltr" />
          <Input label="نسبة العمولة (%)" name="commissionRate" type="number" value={form.commissionRate} onChange={set("commissionRate")} dir="ltr" />
        </div>

        <Input label="تاريخ الانضمام" name="hiredAt" type="date" value={form.hiredAt} onChange={set("hiredAt")} dir="ltr" />
      </div>
    </Modal>
  );
}

// ============================================================
// MEMBERS TAB (was: main page content)
// ============================================================

function MembersTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editTarget, setEditTarget] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: res, loading, error, refetch } = useApi(
    () => membersApi.list({ ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) }),
    [search, statusFilter]
  );
  const members: any[] = res?.data || [];

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await membersApi.changeStatus(id, status);
      refetch();
    } catch {
      toast.error("فشل تغيير الحالة");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل تريد إزالة "${name}" من الفريق؟`)) return;
    try {
      await membersApi.delete(id);
      toast.success("تمت الإزالة");
      refetch();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  return (
    <div dir="rtl" className="space-y-5">

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <ModernInput
            placeholder="بحث باسم أو هاتف..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <Button icon={UserPlus} onClick={() => setShowCreate(true)}>إضافة عضو</Button>
        <ModernSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "",          label: "كل الحالات" },
            { value: "active",    label: "نشط" },
            { value: "inactive",  label: "غير نشط" },
            { value: "suspended", label: "موقوف" },
            { value: "pending",   label: "معلق" },
          ]}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={refetch} className="text-xs text-red-600 underline">إعادة المحاولة</button>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium mb-1">لا يوجد أعضاء</p>
          <p className="text-xs text-gray-400 mb-4">أضف أول عضو في فريقك</p>
          <Button icon={UserPlus} onClick={() => setShowCreate(true)}>إضافة عضو</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["العضو", "المسمى الوظيفي", "نوع التوظيف", "الحالة", ""].map((h, i) => (
                  <th key={i} className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((row: any) => {
                const st        = MEMBER_STATUS_BADGE[row.member.status] || MEMBER_STATUS_BADGE.active;
                const roleBadge = ROLE_BADGE[row.jobTitle?.systemRole];
                const empBadge  = EMP_BADGE[row.member.employmentType];
                return (
                  <tr key={row.member.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    {/* Member */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-brand-500">{row.user.name?.[0] || "؟"}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{row.user.name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5" dir="ltr">
                            <Phone className="w-2.5 h-2.5" />{row.user.phone || row.member.phone || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Job title */}
                    <td className="py-3.5 px-5">
                      {row.jobTitle ? (
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{row.jobTitle.name}</span>
                          {roleBadge && (
                            <span className={clsx("px-2 py-0.5 rounded-full text-[11px] font-medium", roleBadge)}>
                              {SYSTEM_ROLE_LABELS[row.jobTitle.systemRole]}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                    {/* Employment type */}
                    <td className="py-3.5 px-5">
                      {empBadge ? (
                        <span className={clsx("px-2 py-0.5 rounded-full text-[11px] font-medium", empBadge.badge)}>
                          {empBadge.label}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">{row.member.employmentType}</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="py-3.5 px-5">
                      <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium", st.badge)}>
                        <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", st.dot)} />
                        {st.label}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditTarget(row)} className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-500 transition-colors" title="تعديل">
                          <Briefcase className="w-3.5 h-3.5" />
                        </button>
                        {row.member.status === "active" ? (
                          <button onClick={() => handleStatusChange(row.member.id, "inactive")} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors" title="تعطيل">
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => handleStatusChange(row.member.id, "active")} className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 transition-colors" title="تفعيل">
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(row.member.id, row.user.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="إزالة">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editTarget && (
        <MemberModal initial={editTarget} onClose={() => setEditTarget(null)} onSaved={refetch} />
      )}
      {showCreate && (
        <CreateMemberModal onClose={() => setShowCreate(false)} onSaved={refetch} />
      )}
    </div>
  );
}

// ============================================================
// UNIFIED TEAM PAGE — 4 tabs
// ============================================================

const TEAM_TABS = [
  { id: "members",     label: "الأعضاء" },
  { id: "roles",       label: "الأدوار والمسميات" },
  { id: "schedule",    label: "الجداول والحضور" },
  { id: "commissions", label: "العمولات" },
];

export function TeamPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "members";

  return (
    <div dir="rtl">
      <PageHeader
        title="الفريق"
        description="الأعضاء، الأدوار، الجداول، والعمولات — كل شيء في مكان واحد"
        tabs={TEAM_TABS}
        activeTab={tab}
        onTabChange={(id) => setSearchParams({ tab: id })}
      />
      {tab === "members"     && <MembersTab />}
      {tab === "roles"       && <RolesPage />}
      {tab === "schedule"    && <AttendancePage />}
      {tab === "commissions" && <CommissionsPage />}
    </div>
  );
}
