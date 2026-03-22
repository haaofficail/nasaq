# LAST CHANGES AUDIT — نسق
**تاريخ المراجعة:** 2026-03-22
**المراجع:** Production Verification Lead

---

## ملخص تنفيذي

**السبب الجذري:** جميع التعديلات منذ آخر commit موجودة محلياً فقط. لم تُضف إلى git، ولم تُنشر على الإنتاج قط.

---

## 1. التعديلات الأخيرة بالتفصيل

### أ. نظام القوائم المالية والمحاسبة

| الملف | النوع | ما يفترض أن يظهر | مُرتبط بالواجهة؟ | يعتمد على DB؟ |
|---|---|---|---|---|
| `packages/db/schema/accounting.ts` | جديد (untracked) | جداول: chart_of_accounts, journal_entries, journal_entry_lines, accounting_periods | ✅ | ✅ — Migration مطلوب |
| `packages/api/src/lib/posting-engine.ts` | جديد (untracked) | كل عملية تولد قيد محاسبي مزدوج | ✅ ربط في bookings + finance routes | ✅ |
| `packages/api/src/routes/accounting.ts` | جديد (untracked) | /accounting/* (14 endpoint) | ✅ مسجل في index.ts | ✅ |
| `apps/dashboard/src/pages/AccountingPage.tsx` | جديد (untracked) | صفحة /dashboard/accounting | ✅ في App.tsx | ✅ |
| `apps/dashboard/src/pages/JournalEntriesPage.tsx` | جديد (untracked) | صفحة /dashboard/accounting/journal-entries | ✅ في App.tsx | ✅ |
| `apps/dashboard/src/pages/FinancialStatementsPage.tsx` | جديد (untracked) | صفحة /dashboard/financial-statements | ✅ في App.tsx | ✅ |

### ب. نظام الخزينة

| الملف | النوع | ما يفترض أن يظهر | مُرتبط؟ | DB؟ |
|---|---|---|---|---|
| `packages/db/schema/treasury.ts` | جديد (untracked) | جداول: treasury_accounts, treasury_transactions, treasury_transfers, cashier_shifts | ✅ | ✅ — Migration مطلوب |
| `packages/api/src/routes/treasury.ts` | جديد (untracked) | /treasury/* (16 endpoint) | ✅ مسجل في index.ts | ✅ |
| `apps/dashboard/src/pages/TreasuryPage.tsx` | جديد (untracked) | صفحة /dashboard/treasury | ✅ في App.tsx + Layout | ✅ |

### ج. نظام التسوية

| الملف | النوع | ما يفترض أن يظهر | مُرتبط؟ | DB؟ |
|---|---|---|---|---|
| `packages/db/schema/reconciliation.ts` | جديد (untracked) | جداول: reconciliation_statements, reconciliation_items | ✅ | ✅ — Migration مطلوب |
| `packages/api/src/routes/reconciliation.ts` | جديد (untracked) | /reconciliation/* (9 endpoint) | ✅ مسجل في index.ts | ✅ |
| `apps/dashboard/src/pages/ReconciliationPage.tsx` | جديد (untracked) | صفحة /dashboard/reconciliation | ✅ في App.tsx + Layout | ✅ |

### د. سجل المراجعة (Audit Log)

| الملف | النوع | ما يفترض أن يظهر | مُرتبط؟ | DB؟ |
|---|---|---|---|---|
| `packages/db/schema/audit-log.ts` | جديد (untracked) | جدول: audit_log | ✅ | ✅ — Migration مطلوب |
| `packages/api/src/routes/audit-log.ts` | جديد (untracked) | /audit-log/* (2 endpoint) | ✅ مسجل في index.ts | ✅ |

### هـ. الفنادق وتأجير السيارات والتكاملات

| الملف | النوع | ما يفترض أن يظهر | مُرتبط؟ | DB؟ |
|---|---|---|---|---|
| `packages/db/schema/hotel.ts` | جديد (untracked) | جداول الفندق | ✅ | ✅ — Migration 004 |
| `packages/db/schema/car-rental.ts` | جديد (untracked) | جداول تأجير السيارات | ✅ | ✅ — Migration 004 |
| `packages/api/src/routes/hotel.ts` | جديد (untracked) | /hotel/* | ✅ في index.ts | ✅ |
| `packages/api/src/routes/car-rental.ts` | جديد (untracked) | /car-rental/* | ✅ في index.ts | ✅ |
| `apps/dashboard/src/pages/HotelPage.tsx` | جديد (untracked) | صفحة /dashboard/hotel | ✅ في App.tsx | ✅ |
| `apps/dashboard/src/pages/CarRentalPage.tsx` | جديد (untracked) | صفحة /dashboard/car-rental | ✅ في App.tsx | ✅ |

### و. نظام الزهور المتقدم

| الملف | النوع | ما يفترض أن يظهر | مُرتبط؟ | DB؟ |
|---|---|---|---|---|
| `packages/db/schema/flowers.ts` | جديد (untracked) | جداول الزهور المتقدمة | ✅ | ✅ — Migration 005-007 |
| `packages/api/src/routes/flower-master.ts` | جديد (untracked) | /flower-master/* | ✅ في index.ts | ✅ |
| `apps/dashboard/src/pages/FlowerMasterPage.tsx` | جديد (untracked) | صفحة /dashboard/flower-master | ✅ في App.tsx | ✅ |

### ز. Dashboard Profiles System

| الملف | النوع | ما يفترض أن يظهر | مُرتبط؟ | DB؟ |
|---|---|---|---|---|
| `apps/dashboard/src/lib/dashboardProfiles.ts` | جديد (untracked) | لوحة تحكم مخصصة لكل نوع عمل | ✅ في DashboardPage | لا — runtime only |
| `apps/dashboard/src/components/dashboard/` | جديد (untracked) | مكونات KPI cards, widgets | ✅ في ProfileDashboard | ✅ via API |
| `apps/dashboard/src/hooks/useDashboardPrefs.ts` | جديد (untracked) | تخصيص لوحة التحكم per-org | ✅ | لا — localStorage |

### ح. ملفات معدّلة (لم تُضمَّن في أي commit)

| الملف | التعديل | هل مرتبط؟ |
|---|---|---|
| `apps/dashboard/src/App.tsx` | إضافة 7+ routes جديدة | ✅ |
| `apps/dashboard/src/components/layout/Layout.tsx` | إضافة روابط Sidebar للصفحات الجديدة | ✅ |
| `apps/dashboard/src/lib/api.ts` | إضافة treasuryApi, accountingApi, reconciliationApi, auditLogApi | ✅ |
| `packages/api/src/index.ts` | تسجيل كل الـ routers الجديدة | ✅ |
| `packages/api/src/routes/bookings.ts` | ربط posting engine بعمليات الحجز | ✅ |
| `packages/api/src/routes/finance.ts` | ربط posting engine بالفواتير والمصروفات | ✅ |
| `packages/db/schema/index.ts` | تصدير كل الـ schemas الجديدة | ✅ |
| `packages/db/schema/organizations.ts` | إضافة financial settings flags | ✅ |
| `packages/db/schema/finance.ts` | إضافة chartOfAccountId و journalEntryId على expenses | ✅ |
| `apps/dashboard/src/pages/FinancePage.tsx` | إضافة 5 quick-link cards للصفحات المالية الجديدة | ✅ |
| `apps/dashboard/src/pages/DashboardPage.tsx` | تحديث ليستخدم ProfileDashboard | ✅ |

---

## 2. ما لا يزال غير مربوط

| البند | السبب |
|---|---|
| AuditLogPage في sidebar | الصفحة الأصلية موجودة لكن لا تستخدم auditLogApi الجديد — تستخدم endpoint مختلف |
| Flower master seed | `pnpm tsx packages/db/seeds/seed-chart-of-accounts.ts <orgId>` لم يُنفَّذ لأي منشأة |
| enable_full_accounting flag | false بشكل افتراضي لكل المنشآت — الـ posting engine لن يعمل حتى تفعيله |

---

## 3. الـ Migrations المطلوبة للتعديلات الجديدة

| Migration | محتواه | حالته |
|---|---|---|
| `0000_icy_diamondback.sql` | accounting tables (4 جداول) | موجود محلياً، لم يُنفَّذ على Production |
| `0001_purple_ozymandias.sql` | treasury tables (4 جداول) | موجود محلياً، لم يُنفَّذ على Production |
| `0002_motionless_prodigy.sql` | org settings + expense columns | موجود محلياً، لم يُنفَّذ على Production |
| `0003_parched_husk.sql` | reconciliation + audit_log tables | موجود محلياً، لم يُنفَّذ على Production |
| `004_new_verticals.sql` | hotel + car_rental + integrations tables | موجود محلياً، لم يُنفَّذ على Production |
| `005_flower_master.sql` | flower master data tables | موجود محلياً، لم يُنفَّذ على Production |
| `006_flower_enums_expand.sql` | flower enums expansion | موجود محلياً، لم يُنفَّذ على Production |
| `007_flower_origins_expand.sql` | flower origins expansion | موجود محلياً، لم يُنفَّذ على Production |

**الإجمالي: 8 migrations لم تُنفَّذ على Production**

---

## 4. الخلاصة

- **43 ملف جديد** غير مُضاف إلى git
- **20 ملف معدَّل** غير مُحفوظ في git
- **0 commit** منذ آخر deployment
- **0 migration** من الـ 8 الجديدة طُبِّق على Production
- **0 صفحة جديدة** من الـ 8+ الجديدة موجودة في live bundle
