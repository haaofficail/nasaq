# تقرير نظام محل الورد — نسق ERP
**تاريخ التسليم:** 2026-04-04
**الخادم:** 187.124.41.239
**الحالة:** مكتمل ومنشور

---

## ما تم بناؤه

### قاعدة البيانات (Migration 095)
- جدول `flower_disposal_rules` — قواعد التصريف الذكي (فئات عمرية → خصومات تلقائية)
- أعمدة جديدة على `flower_batches`: `disposal_discount_pct`, `disposal_label_ar`, `disposal_applied_at`, `supplier_id`
- أعمدة جديدة على `flower_orders`: `recipient_name`, `recipient_phone`, `is_surprise`, `delivery_fee`, `delivery_time`, `driver_name`, `driver_phone`, `order_type`, `payment_method`, `preparing_at`, `ready_at`, `dispatched_at`, `delivered_at`
- جدول `flower_today_bundles` — باقة اليوم المحفوظة
- أعمدة على `suppliers`: `flower_specialty`, `flower_origin`, `quality_score`, `last_delivery_at`, `total_purchases`

### API Routes

#### flower-master (ملحق على الموجود)
| Endpoint | الوصف |
|---|---|
| `GET /flower-master/disposal/rules` | قواعد التصريف |
| `POST /flower-master/disposal/rules` | إضافة قاعدة |
| `PUT /flower-master/disposal/rules/:id` | تعديل قاعدة |
| `DELETE /flower-master/disposal/rules/:id` | حذف قاعدة |
| `POST /flower-master/disposal/apply` | تطبيق التصريف الذكي على كل الدفعات |
| `GET /flower-master/today-bundle` | توليد باقة اليوم تلقائياً من الدفعات القاربة |
| `POST /flower-master/today-bundle/publish` | نشر باقة اليوم |
| `GET /flower-master/freshness-board` | لوحة الطازجية (عمر الدفعة، السعر الفعلي، نسبة العمر) |

#### flower-builder (ملحق على الموجود)
| Endpoint | الوصف |
|---|---|
| `GET /flower-builder/delivery` | قائمة توصيلات اليوم + إحصاءات |
| `PATCH /flower-builder/orders/:id/driver` | تعيين سائق وتحديث الحالة |
| `POST /flower-builder/orders` | محدّث بـ 8 حقول إضافية للتوصيل والهدايا |

#### flower-suppliers (جديد كلياً)
| Endpoint | الوصف |
|---|---|
| `GET /flower-suppliers` | قائمة الموردين مع جودة محسوبة |
| `GET /flower-suppliers/:id` | مورد بتاريخ الدفعات وتقييم الجودة |
| `POST /flower-suppliers` | إضافة مورد |
| `PUT /flower-suppliers/:id` | تعديل |
| `DELETE /flower-suppliers/:id` | حذف |
| `GET /flower-suppliers/quality/ranking` | تصنيف الموردين بالجودة |

### صفحات الداشبورد (9 صفحات)
| الصفحة | المسار |
|---|---|
| الطلبات | `/dashboard/flower-orders` |
| الكاشير | `/dashboard/flower-pos` |
| مخزون الورد | `/dashboard/flower-inventory` |
| التنسيقات والباقات | `/dashboard/arrangements` |
| العروض والتصريف | `/dashboard/flower-disposal` |
| التوصيل | `/dashboard/flower-delivery` |
| الموردون | `/dashboard/flower-suppliers` |
| بيانات الورد | `/dashboard/flower-master` |
| التقارير | `/dashboard/flower-reports` |
| التحليلات | `/dashboard/flower-analytics` |

### الـ Sidebar
`specialty_flower` section محدّث بـ 10 عناصر بترتيب منطقي للعمل اليومي.

### API Client
`flowerDisposalApi` + `flowerSuppliersApi` + إضافات `flowerBuilderApi` في `api.ts`.

---

## الميزات الذكية المميزة

### محرك التصريف الذكي
- يقرأ عمر كل دفعة في المخزن
- يطابق مع قواعد التصريف (0-3 أيام → 10%، 4-6 أيام → 30%، إلخ)
- يحدّث السعر الفعلي تلقائياً
- العميل يرى "عرض خاص" وليس "ورد قارب من الانتهاء"

### باقة اليوم التلقائية
- تختار الدفعات التي تبقّى لها 1-6 أيام
- تبني تركيبة الباقة مع خصم 30%
- تحسب هامش الربح المتوقع
- تعرض تنبيهاً عند وجود فرص غير منشورة

### لوحة الطازجية (Freshness Board)
- كل دفعة تظهر: عمرها، أيام المتبقية، نسبة العمر (progress bar)، السعر الفعلي بعد الخصم

### إدارة التوصيل
- قائمة توصيلات اليوم مع إحصاءات (معلق، جاهز، في الطريق، مُسلَّم، إيراد)
- تعيين سائق مع رقم جوال وتحديث حالة "في الطريق" تلقائياً

### إدارة الموردين بالجودة
- تقييم 0-10 لكل مورد محسوب من نسبة الدفعات الجيدة
- تاريخ آخر توصيل وإجمالي المشتريات
- تصنيف الموردين الأفضل أداءً

### القيد المحاسبي التلقائي
- عند تغيير حالة الطلب إلى "مُسلَّم" → يُسجَّل قيد مبيعات نقدية تلقائياً

---

## الحالة التقنية
- `tsc --noEmit`: صفر أخطاء
- `pnpm build dashboard`: ناجح
- قاعدة البيانات: migration مطبّق
- PM2: `nasaq-api` online (restart ناجح)
- كل queries فيها `org_id` filter
- `requireCapability("floral")` على كل routes الورد
