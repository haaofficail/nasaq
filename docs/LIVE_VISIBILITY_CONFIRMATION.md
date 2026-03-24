# LIVE VISIBILITY CONFIRMATION — نسق
**تاريخ الإعداد:** 2026-03-22
**الغرض:** التحقق الفعلي من الظهور بعد النشر

---

## الحالة الحالية

```
Git commit:  092f8a9 ✅ (محلياً)
Git push:    ❌ لم يُنفَّذ — SSH port 22 blocked من بيئة Claude Code
Deploy:      ❌ مُعلَّق حتى يُشغَّل المستخدم deploy.sh
```

**هذا الملف سيُكتمَل بعد تشغيل الخطوات أدناه من جهاز المستخدم.**

---

## الخطوة 1 — النشر (من terminal المستخدم)

```bash
cd /path/to/nasaq

# تشغيل النشر الكامل
bash deploy.sh "تحديث شامل: نظام مالي كامل + محاسبة + خزينة + تسوية + فنادق + تأجير + زهور"
```

**ما يفعله deploy.sh:**
1. `git add -A && git commit -m "..."` (الـ commit موجود بالفعل — سيُكتشف لا شيء جديد)
2. `git push server main` → يُرسل الكود للسيرفر
3. post-receive hook يُشغِّل: pnpm install + vite build + migrate + pm2 restart

---

## الخطوة 2 — تطبيق Migrations (على السيرفر)

```bash
ssh nasaq-server
cd /var/www/nasaq
export NVM_DIR="/root/.nvm" && . "$NVM_DIR/nvm.sh"

# تطبيق الـ 8 migrations
pnpm --filter @nasaq/db run migrate

# التحقق:
psql -U nasaq_user -d nasaq -c "\dt" | grep -E "chart_of_accounts|journal_entries|treasury_accounts|reconciliation"
```

**النتيجة المتوقعة:**
```
 public | audit_log                 | table | nasaq_user
 public | chart_of_accounts         | table | nasaq_user
 public | journal_entries           | table | nasaq_user
 public | journal_entry_lines       | table | nasaq_user
 public | accounting_periods        | table | nasaq_user
 public | treasury_accounts         | table | nasaq_user
 public | treasury_transactions     | table | nasaq_user
 public | treasury_transfers        | table | nasaq_user
 public | cashier_shifts            | table | nasaq_user
 public | reconciliation_statements | table | nasaq_user
 public | reconciliation_items      | table | nasaq_user
```

---

## الخطوة 3 — Seed Chart of Accounts

```bash
# على السيرفر — لكل منشأة موجودة:
psql -U nasaq_user -d nasaq -c "SELECT id, name FROM organizations;"

# لكل orgId من النتيجة:
pnpm tsx packages/db/seeds/seed-chart-of-accounts.ts <ORG_ID>

# التحقق:
psql -U nasaq_user -d nasaq -c "SELECT COUNT(*) FROM chart_of_accounts WHERE org_id = '<ORG_ID>';"
# النتيجة المتوقعة: 36
```

---

## الخطوة 4 — اختبار نقاط API (بعد النشر)

### الأمر (من أي جهاز):

```bash
# الحالة المتوقعة بعد النشر: 401 (route موجود — يطلب auth)
# قبل النشر: 404 (route غير موجود)

curl -s -o /dev/null -w "%{http_code}" https://nasaqpro.tech/api/v1/accounting/chart-of-accounts
curl -s -o /dev/null -w "%{http_code}" https://nasaqpro.tech/api/v1/treasury/accounts
curl -s -o /dev/null -w "%{http_code}" https://nasaqpro.tech/api/v1/reconciliation
curl -s -o /dev/null -w "%{http_code}" https://nasaqpro.tech/api/v1/audit-log
```

### جدول التحقق:

| Endpoint | قبل النشر | المتوقع بعد النشر | النتيجة الفعلية |
|---|---|---|---|
| `GET /api/v1/accounting/chart-of-accounts` | 404 | **401** | [ تُملأ بعد التشغيل ] |
| `GET /api/v1/treasury/accounts` | 404 | **401** | [ تُملأ بعد التشغيل ] |
| `GET /api/v1/reconciliation` | 404 | **401** | [ تُملأ بعد التشغيل ] |
| `GET /api/v1/audit-log` | 404 | **401** | [ تُملأ بعد التشغيل ] |
| `GET /api/v1/hotel/dashboard` | 401 | **401** (لا تغيير) | [ تُملأ بعد التشغيل ] |
| `GET /api/v1/finance/invoices` | 401 | **401** (لا تغيير) | [ تُملأ بعد التشغيل ] |

**قاعدة التفسير:**
- `401` = Route موجود في production — النشر نجح
- `404` = Route لا يزال مفقوداً — يجب إعادة المحاولة
- `200` = Route موجود وغير محمي — مشكلة أمنية

---

## الخطوة 5 — التحقق من الـ Dashboard Bundle

```bash
# جلب الـ bundle الجديد والتحقق من وجود routes الجديدة
BUNDLE_URL=$(curl -s https://nasaqpro.tech | grep -o 'index-[^"]*\.js' | head -1)
echo "Bundle: $BUNDLE_URL"

curl -s "https://nasaqpro.tech/assets/$BUNDLE_URL" | grep -c "treasury\|accounting\|reconciliation\|financial-statements"
```

**النتيجة المتوقعة:** عدد ≥ 10 تطابق (route strings + component names)

---

## الخطوة 6 — اختبار الواجهة يدوياً

### خطوات الاختبار:

1. افتح `https://nasaqpro.tech` في نافذة Incognito
2. سجّل الدخول بحساب تجريبي
3. تحقق من ظهور الروابط في الـ Sidebar:

| الرابط | الأيقونة | المتوقع |
|---|---|---|
| الخزينة | Landmark | مرئي لكل أنواع الأعمال |
| المحاسبة | BookOpen | مرئي لكل أنواع الأعمال |
| القوائم المالية | BarChart2 | مرئي لكل أنواع الأعمال |
| التسويات | GitMerge | مرئي لكل أنواع الأعمال |

4. انتقل إلى كل صفحة وتحقق:
   - `/dashboard/treasury` → صفحة الخزينة (KPI cards + جدول الحسابات)
   - `/dashboard/accounting` → صفحة المحاسبة (chart of accounts + journal entries)
   - `/dashboard/financial-statements` → 6 تبويبات (قائمة الدخل، الميزانية، ...)
   - `/dashboard/reconciliation` → قائمة التسويات + زر إنشاء جديد

5. تحقق من صفحة Finance:
   - `/dashboard/finance` → 5 بطاقات quick-link مرئية

---

## الخطوة 7 — اختبار وظيفي (بعد تفعيل المحاسبة)

```sql
-- على السيرفر: تفعيل المحاسبة لمنشأة تجريبية
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'),
  '{financial,enable_full_accounting}',
  'true'
)
WHERE id = '<TEST_ORG_ID>';
```

```bash
# اختبار الترحيل — أنشئ حجزاً جديداً بدفعة نقدية
# ثم تحقق من إنشاء القيد المحاسبي:
curl -s https://nasaqpro.tech/api/v1/accounting/entries \
  -H "Authorization: Bearer <TOKEN>" \
  | jq '.data | length'
# المتوقع: > 0 (قيد واحد على الأقل)
```

---

## ملخص نتائج ما بعد النشر

```
يُملأ بعد تشغيل deploy.sh وإكمال الخطوات أعلاه:

□ git push → نجح
□ vite build → اكتمل في [ وقت ] ثانية
□ migrations → [ 8/8 ] تطبيقت
□ seed → [ X ] منشأة حصلت على chart_of_accounts
□ /accounting  → [ 401 / 404 ]
□ /treasury    → [ 401 / 404 ]
□ /reconciliation → [ 401 / 404 ]
□ /audit-log   → [ 401 / 404 ]
□ Sidebar links → [ ظهرت / لم تظهر ]
□ TreasuryPage → [ تعمل / خطأ ]
□ AccountingPage → [ تعمل / خطأ ]
□ FinancialStatementsPage → [ تعمل / خطأ ]
□ ReconciliationPage → [ تعمل / خطأ ]
```
