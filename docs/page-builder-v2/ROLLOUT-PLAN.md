# خطة الإطلاق التدريجي — Page Builder v2

## الوضع الحالي

- الميزة: `page_builder_v2`
- الإطلاق التدريجي عبر جدول `capability_registry`
- المرحلة الحالية: 10%

## المراحل

| المرحلة | النسبة | المدة | شرط المتابعة |
|---------|--------|-------|-------------|
| 1 | 10% | 24 ساعة | معدل خطأ < 1%، response time < 500ms |
| 2 | 50% | 24 ساعة | لا مشاكل حرجة، رضا المستخدمين مستقر |
| 3 | 100% | دائم | — |

## الانتقال للمرحلة التالية

### من 10% إلى 50%:
```sql
UPDATE capability_registry
SET rollout_percentage = 50, updated_at = NOW()
WHERE key = 'page_builder_v2';
```

### من 50% إلى 100%:
```sql
UPDATE capability_registry
SET rollout_percentage = 100, updated_at = NOW()
WHERE key = 'page_builder_v2';
```

## Kill Switch — التراجع الطارئ

في حال وجود مشكلة حرجة، أوقف الميزة فوراً:

```sql
UPDATE capability_registry
SET rollout_percentage = 0, updated_at = NOW()
WHERE key = 'page_builder_v2';
```

ثم:
```bash
ssh -o StrictHostKeyChecking=no root@tarmizos.com "pm2 restart nasaq-api"
```

## معايير الخروج (Exit Criteria)

للانتقال لكل مرحلة، يجب استيفاء:

- معدل الخطأ < 1% (نسبة طلبات 5xx)
- Response time < 500ms (median)
- لا بلاغات حرجة من المستخدمين خلال 12 ساعة
- معدل الاستخدام ضمن التوقعات

## مراقبة الأداء

```bash
# تحقق من حالة الـ capability
ssh -o StrictHostKeyChecking=no root@tarmizos.com "psql 'postgresql://nasaq_user:Nasaq_DB_2026%40secure@127.0.0.1:5432/nasaq' -c \"SELECT key, rollout_percentage, updated_at FROM capability_registry WHERE key = 'page_builder_v2';\""

# سجلات الأخطاء
ssh -o StrictHostKeyChecking=no root@tarmizos.com "pm2 logs nasaq-api --lines 100 | grep -i 'page_builder\|page-templates\|pages-v2'"
```

## سجل التغييرات

| التاريخ | المرحلة | الملاحظات |
|---------|---------|-----------|
| 2026-04-20 | 10% | Day 25 — إطلاق تدريجي أولي |

## التواصل مع الفريق

عند تغيير أي مرحلة، وثّق في هذا الجدول مع التاريخ والملاحظات.
