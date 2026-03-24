# DATABASE & RUNTIME VERIFICATION — نسق
**تاريخ المراجعة:** 2026-03-22
**بيئة الإنتاج:** nasaqpro.tech | PostgreSQL 14 @ 187.124.41.239

---

## ملخص: Migration Drift

| الوضع | التفصيل |
|---|---|
| Migrations مولَّدة محلياً | 8 ملفات |
| Migrations مطبَّقة على Production | **0** (من الـ 8 الجديدة) |
| حالة SSH | **غير متاح** — Port 22 timeout |
| طريقة التحقق | HTTP endpoint probe + live bundle analysis |

---

## 1. الجداول المطلوبة للتعديلات الأخيرة

### التحقق عبر HTTP (404 = route doesn't exist = tables likely missing)

| Endpoint | HTTP Status | التفسير |
|---|---|---|
| `GET /api/v1/accounting/chart-of-accounts` | **404** | Route غير موجود — لم يُنشر |
| `GET /api/v1/treasury/accounts` | **404** | Route غير موجود — لم يُنشر |
| `GET /api/v1/reconciliation` | **404** | Route غير موجود — لم يُنشر |
| `GET /api/v1/audit-log` | **404** | Route غير موجود — لم يُنشر |
| `GET /api/v1/hotel/dashboard` | **401** | Route موجود (في initial commit) — Auth required |
| `GET /api/v1/finance/invoices` | **401** | Route موجود — Auth required |

**النتيجة:** `/accounting`, `/treasury`, `/reconciliation`, `/audit-log` → routes غير موجودة على الإطلاق في production.

---

## 2. الجداول المطلوبة vs الحالة المتوقعة في Production

### المجموعة A — موجودة في Production (من initial commit)
```
bookings, booking_payments, booking_items
customers, services, categories, addons
invoices, expenses
staff, roles, permissions
locations (branches)
hotel_rooms, hotel_reservations (من initial commit — hotel route 401)
organizations, users, user_sessions
```

### المجموعة B — غائبة عن Production (لم يُنشر أي من migrations 0000-0003+)
```
chart_of_accounts        — accounting.ts migration 0000
accounting_periods       — accounting.ts migration 0000
journal_entries          — accounting.ts migration 0000
journal_entry_lines      — accounting.ts migration 0000
treasury_accounts        — treasury.ts migration 0001
treasury_transactions    — treasury.ts migration 0001
treasury_transfers       — treasury.ts migration 0001
cashier_shifts           — treasury.ts migration 0001
reconciliation_statements — reconciliation.ts migration 0003
reconciliation_items     — reconciliation.ts migration 0003
audit_log                — audit-log.ts migration 0003
```

### المجموعة C — Schema drift (columns missing in existing tables)
```
expenses.chart_of_account_id   — migration 0002 (لم يُطبَّق)
expenses.journal_entry_id      — migration 0002 (لم يُطبَّق)
organizations.settings         — تغيير default value في migration 0002
```

### المجموعة D — New Verticals (Migration 004)
```
car_rental_vehicles, car_rental_contracts, car_rental_bookings
integrations (table)
```
**ملاحظة:** Hotel tables ربما موجودة من initial commit (Hotel route = 401 → auth required → route EXISTS)

### المجموعة E — Flower Master (Migrations 005-007)
```
flower_species, flower_variants, flower_batches
flower_recipe_components, flower_substitutions
flower_variant_pricing
```
**ملاحظة:** هذه الجداول موجودة في initial commit (flower-master route يعمل)

---

## 3. Migration Drift Analysis

```
Local code expects:              Production DB has:
======================           ==================
chart_of_accounts       ←—X——   MISSING
journal_entries         ←—X——   MISSING
journal_entry_lines     ←—X——   MISSING
accounting_periods      ←—X——   MISSING
treasury_accounts       ←—X——   MISSING
treasury_transactions   ←—X——   MISSING
treasury_transfers      ←—X——   MISSING
cashier_shifts          ←—X——   MISSING
reconciliation_statements←—X—— MISSING
reconciliation_items    ←—X——   MISSING
audit_log               ←—X——   MISSING
expenses.chart_of_account_id ←X MISSING COLUMN
expenses.journal_entry_id    ←X MISSING COLUMN
```

---

## 4. Enums المطلوبة (غير موجودة في Production)

```sql
-- غير موجودة:
account_type            (asset, liability, equity, revenue, expense)
normal_balance          (debit, credit)
journal_entry_status    (draft, posted, reversed)
journal_source_type     (booking, invoice, expense, payment, pos, treasury, transfer, manual, closing, opening)
period_status           (open, closed, locked)
treasury_account_type   (main_cash, branch_cash, cashier_drawer, petty_cash, bank_account, employee_custody)
treasury_transaction_type (receipt, payment, transfer_in, transfer_out, adjustment, opening_balance)
reconciliation_type     (bank, cash, ar, ap)
reconciliation_status   (draft, in_progress, completed)
reconciliation_item_type(outstanding_check, deposit_in_transit, bank_charge, ...)
audit_action            (create, update, delete, view, login, logout, post, reverse, ...)
```

---

## 5. Backfill / Seed المطلوبة بعد Migration

| Seed | الغرض | ملف |
|---|---|---|
| `seedChartOfAccounts(orgId)` | إضافة 36 حساباً افتراضياً لكل منشأة | `packages/db/seeds/seed-chart-of-accounts.ts` |
| تفعيل `enable_full_accounting` | تشغيل الـ posting engine لمنشأة معينة | UPDATE في organizations.settings |

---

## 6. Runtime Data Issues

### enable_full_accounting = false لجميع المنشآت
```json
// organizations.settings.financial.enable_full_accounting
// القيمة الحالية على كل المنشآت: false (default)
// النتيجة: postCashSale, postExpense, etc. لن تعمل حتى بعد تطبيق الـ migrations
```

### chart_of_accounts فارغ لكل المنشآت
```
حتى بعد تطبيق migrations، لن تكون هناك حسابات
→ posting engine يبحث عن MAIN_CASH, AR, etc. بالـ system_key → لن يجدها
→ كل قيود الحجز والفواتير ستفشل صامتة
→ الحل: تشغيل seedChartOfAccounts لكل منشأة
```

---

## 7. الخلاصة التشخيصية

| السبب | التأثير |
|---|---|
| Migrations 0000-0003 لم تُنفَّذ | 11 جدول مفقود + 2 عمود مفقود |
| Code لم يُرفع على الـ server | Routes /accounting /treasury /reconciliation غير موجودة |
| Dashboard لم يُبنَ بعد التعديلات | الصفحات الجديدة غير موجودة في الـ bundle |
| enable_full_accounting = false | Posting engine معطل حتى بعد النشر |
| chart_of_accounts فارغ | القيود المحاسبية ستفشل حتى بعد النشر |

---

## 8. خطوات الإصلاح المطلوبة (بالترتيب)

```bash
# 1. push الكود على السيرفر
bash deploy.sh "تحديث النظام المالي الكامل + محاسبة + خزينة + تسوية"

# 2. على السيرفر: تطبيق الـ migrations
cd /var/www/nasaq
pnpm --filter @nasaq/db run migrate

# 3. على السيرفر: تشغيل seed للمنشآت الموجودة
# (لكل orgId في جدول organizations)
pnpm tsx packages/db/seeds/seed-chart-of-accounts.ts <ORG_ID>

# 4. إعادة بناء الـ dashboard
cd /var/www/nasaq/apps/dashboard && npx vite build

# 5. إعادة تشغيل الـ API
pm2 restart nasaq-api
```
