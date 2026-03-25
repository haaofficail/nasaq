# Nasaq System Constitution v1

## القسم 1: الهدف
نسق هو نظام تشغيل أعمال متعدد الأنشطة (Multi-Vertical Business OS)، هدفه:
- توحيد البنية
- تخصيص التجربة
- دعم البسيط والمتقدم
- منع الفوضى والتكرار
- بناء نظام قابل للتوسع

---

## القسم 2: تعريف المنشأة (إلزامي)
كل منشأة في نسق يجب أن تُعرّف عبر:

```
business_type
operating_profile
service_delivery_modes
enabled_capabilities
```

### 1) Business Type
```
flowers | salon | restaurant | hotel | car_rental | retail
```

### 2) Operating Profile
```
florist_retail | florist_kosha | florist_contract_supply
salon_in_branch | salon_home_service | salon_spa
restaurant_dine_in | restaurant_delivery | restaurant_cloud_kitchen
...
```

### 3) Service Delivery Modes
```
on_site | delivery | pickup | at_customer_location
reservation_based | recurring_service | walk_in
```

### 4) Capabilities
```
inventory | assets | bookings | accounting | delivery
contracts | attendance | schedules | floral | kosha | pos
```

---

## القسم 3: نواة النظام (Core)
كل الأنشطة تشترك في Core واحد:
- المؤسسات والفروع
- المستخدمين والصلاحيات
- العملاء
- الفواتير والمدفوعات
- التقارير
- الإشعارات
- الإعدادات
- السجلات (Audit Logs)

**القاعدة:** Core يُبنى مرة واحدة فقط ولا يُكرر

---

## القسم 4: العزل بين الأنشطة (Business Isolation)
**القاعدة الأساسية:** ما لا يخص النشاط لا يظهر له نهائيًا

كل عنصر في النظام يجب أن يحمل:
```
allowed_business_types
allowed_operating_profiles
required_capabilities
required_permissions
```

ينطبق على: الصفحات، القوائم، الداشبورد، الحقول، النماذج، التقارير، الإعدادات، التكاملات، البحث

---

## القسم 5: نماذج التشغيل (Operating Models)
**النشاط الواحد ≠ تجربة واحدة**

| النشاط | نماذج التشغيل |
|---|---|
| الورد | florist_retail, florist_kosha, florist_contract_supply, florist_hybrid |
| الصالون | salon_in_branch, salon_home_service, salon_spa, salon_hybrid |
| المطاعم | restaurant_dine_in, restaurant_takeaway, restaurant_delivery, restaurant_cloud_kitchen, restaurant_catering |

---

## القسم 6: التحكم في الواجهة (UI Governance)
كل نشاط يجب أن يملك:
- Dashboard Profile
- Sidebar Profile
- Quick Actions
- Widgets
- Vocabulary

**ممنوع:**
- Dashboard واحد للجميع
- Sidebar واحد للجميع

---

## القسم 7: النماذج الذكية (Forms)
تعتمد على **Progressive Disclosure**:
- عرض الأساسي دائمًا
- إخفاء المتقدم خلف زر

**Context-Aware:** تظهر الحقول حسب النشاط + نموذج التشغيل + القدرات

---

## القسم 8: نموذج العناصر (Offerings Model)
```
offering_type: product | service | package | booking | rental | add_on
```
كل عنصر يُعرّف عبر: `business_type + offering_type + category`

---

## القسم 9: المخزون والأصول
كل عنصر يجب أن يحدد:
```
stock_tracked | asset_linked | reusable | perishable | optional_tracking
```

أمثلة:
- ورد طبيعي → مخزون + تلف
- ورد صناعي → مخزون أو أصل
- مزهرية → أصل أو منتج

---

## القسم 10: المحاسبة (Financial Core)
يشمل: Chart of Accounts, Journal Entries, Ledger, Treasury, AR/AP, Invoices, Payments, Closings, Reconciliation

**Basic Mode:** صندوق، قبض وصرف، تقارير بسيطة

**Advanced Mode:** قيود، أستاذ، ضرائب، تسويات، فترات مالية

---

## القسم 11: الربط بين الأنظمة
كل عملية تنعكس على: المحاسبة، الصندوق، العملاء/الموردين، التقارير، المخزون، الأصول

---

## القسم 12: المرونة (Flexibility)
**القاعدة:** النظام يدعم التعقيد لكنه لا يفرضه

كل خاصية يجب أن تكون: **Supported + Optional + Configurable**

---

## القسم 13: الإعدادات
الإعدادات يجب أن تغيّر: السلوك، الواجهة، الصلاحيات، التقارير، الربط

وليس فقط: نصوص أو أسماء

---

## القسم 14: التكاملات
كل تكامل يجب أن يكون: **Provider-based + Capability-aware + Business-aware**

لا يعمل إلا إذا: النشاط مناسب + القدرات مفعلة

---

## القسم 15: البحث والتنقل
أي بحث أو اقتراح أو زر سريع يجب أن يحترم:
- النشاط
- نموذج التشغيل
- القدرات
- الصلاحيات

---

## القسم 16: الأنشطة الهجينة
لا يتم دعمها تلقائيًا، بل عبر:
- `operating_profile = hybrid`
- capabilities مفعلة
- إعدادات واضحة

---

## القسم 17: دورة التطوير (Development Rules)
**أي Feature يجب أن يشمل:**

```
✅ DB Schema
✅ Services / Business Logic
✅ API Routes
✅ UI / Pages
✅ Permissions
✅ Settings
✅ Reports
✅ Tests
✅ Docs
```

غير ذلك = **غير مكتمل**

---

## القسم 18: منع التكرار
**ممنوع:** بناء نفس النظام مرتين

**الصحيح:** Core + Extension

---

## القسم 19: الترتيب المنطقي للقرار
عند أي ظهور لعنصر:
1. هل النشاط صحيح؟
2. هل نموذج التشغيل صحيح؟
3. هل القدرات مفعلة؟
4. هل الصلاحيات تسمح؟
5. هل الإعدادات تسمح؟

---

## القسم 20: القاعدة الذهبية 🔥

> **ما لا يخص النشاط لا يظهر له**
> **وما يخصه لا يظهر إلا إذا كان مناسبًا لنموذج تشغيله وقدراته**

---

## الصياغة المختصرة للمطور

**التعريف الرباعي الإلزامي:**
```
business_type + operating_profile + service_delivery_modes + capabilities
```

**شروط ظهور أي عنصر:**
```
allowed_business_types ✓
allowed_operating_profiles ✓
required_capabilities ✓
required_permissions ✓
```

**كل شيء يجب أن يكون:**
```
context-aware
capability-driven
business-isolated
```

**التطوير الناجح يجب أن يكون:**
- ✅ محترم للعزل
- ✅ داعم للمرونة
- ✅ end-to-end
- ✅ غير مكرر
- ✅ قابل للتشغيل الفعلي
