# TENANT RUNTIME CONFIGURATION AUDIT — نسق
**تاريخ المراجعة:** 2026-03-22

---

## 1. ملخص: أسباب عدم الظهور (مرتبة بالأولوية)

| السبب | الأولوية | التأثير |
|---|---|---|
| **الكود لم يُحفظ في git ولم يُنشر** | 🔴 الأول والأهم | 100% من التعديلات غير ظاهرة |
| **Migrations لم تُطبَّق على Production** | 🔴 ثانياً | API سيفشل عند أي طلب لـ /accounting أو /treasury |
| **enable_full_accounting = false** | 🟡 ثالثاً | Posting engine معطل لكل المنشآت |
| **chart_of_accounts فارغ لكل المنشآت** | 🟡 رابعاً | القيود المحاسبية ستفشل صامتة |

---

## 2. Runtime Configuration المطلوبة لكل Feature

### الخزينة (Treasury)
```json
// متطلبات الظهور:
{
  "deployment": "✅ كود منشور + build جديد",
  "db_tables": "treasury_accounts, treasury_transactions, treasury_transfers, cashier_shifts",
  "db_status": "❌ مفقودة — migration 0001 لم يُطبَّق",
  "flag_required": "لا يوجد — الخزينة مفعلة لكل المنشآت"
}
```

### المحاسبة (Accounting)
```json
{
  "deployment": "✅ كود منشور + build جديد",
  "db_tables": "chart_of_accounts, journal_entries, journal_entry_lines, accounting_periods",
  "db_status": "❌ مفقودة — migration 0000 لم يُطبَّق",
  "seed_required": "seedChartOfAccounts(orgId) — بدونه لن تعمل القيود",
  "flag_required": {
    "enable_full_accounting": true,
    "current_value": false,
    "effect_if_false": "الـ posting engine لن يعمل — لكن الواجهة ستظهر"
  }
}
```

### قائمة الدخل / الميزانية العمومية (Financial Statements)
```json
{
  "deployment": "✅ كود منشور + build جديد",
  "db_tables": "chart_of_accounts, journal_entries, journal_entry_lines",
  "db_status": "❌ مفقودة",
  "data_required": "يجب وجود قيود مرحَّلة لإظهار أرقام حقيقية",
  "empty_state": "ستظهر الصفحة بأرقام صفر — لا مشكلة"
}
```

### التسوية (Reconciliation)
```json
{
  "deployment": "✅ كود منشور + build جديد",
  "db_tables": "reconciliation_statements, reconciliation_items",
  "db_status": "❌ مفقودة — migration 0003 لم يُطبَّق",
  "flag_required": "لا يوجد"
}
```

### سجل المراجعة (Audit Log)
```json
{
  "deployment": "✅ كود منشور + build جديد",
  "db_tables": "audit_log",
  "db_status": "❌ مفقودة — migration 0003 لم يُطبَّق",
  "auto_populated": "يُملَأ تلقائياً عند أي post/reverse/close عملية"
}
```

---

## 3. Tenant Record المطلوب بعد الإصلاح

### لكل منشأة في جدول organizations:

```sql
-- التحقق من الحالة الحالية (بعد SSH):
SELECT id, name, settings->'financial' as financial_settings
FROM organizations;

-- المطلوب:
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{financial,enable_full_accounting}',
  'true'
)
WHERE id = '<ORG_ID>';
-- تشغيله فقط للمنشآت التي تريد المحاسبة الكاملة
```

### Dashboard Profile (localStorage):
```javascript
// يُخزَّن في localStorage عند login
localStorage.setItem("nasaq_user", JSON.stringify({
  businessType: "salon",    // أو flower_shop, hotel, etc.
  role: "owner",
  orgId: "...",
}));
// هذا يحدد أي dashboard profile يظهر
// لا يحتاج DB — runtime config فقط
```

---

## 4. Feature Flags الحالية

| Flag | القيمة الافتراضية | التأثير |
|---|---|---|
| `enable_full_accounting` | `false` | Posting engine معطل |
| `enable_manual_journal_entries` | `false` | إنشاء قيود يدوية معطل |
| `enable_bank_reconciliation` | `false` | (UI لا يتحقق من هذا حالياً) |
| `enable_cashier_shift_closing` | `true` | ورديات الكاشير مفعلة |
| `enable_tax_management` | `true` | VAT حساب مفعل |
| `auto_post_bookings` | `false` | Posting engine لن يعمل تلقائياً على الحجوزات |
| `auto_post_expenses` | `false` | Posting engine لن يعمل تلقائياً على المصروفات |

---

## 5. الخلاصة — ما الذي يمنع الظهور بالضبط

```
عدم الظهور سببه مزيج من 4 مشاكل:

1. DEPLOY ISSUE (الأكبر)
   ← الكود غير موجود على السيرفر أصلاً
   ← Fix: git commit + git push + build + pm2 restart

2. DB SCHEMA ISSUE (الثاني)
   ← الجداول المطلوبة غير موجودة في production DB
   ← Fix: pnpm --filter @nasaq/db run migrate

3. RUNTIME DATA ISSUE (الثالث)
   ← chart_of_accounts فارغ لكل المنشآت
   ← Fix: pnpm tsx packages/db/seeds/seed-chart-of-accounts.ts <ORG_ID>

4. FEATURE FLAG ISSUE (الرابع — اختياري)
   ← enable_full_accounting = false يعطل الـ posting engine
   ← Fix: UPDATE organizations SET settings = jsonb_set(...)
   ← لكن الواجهة ستظهر حتى بدون هذا
```
