# Flower Master Data Model

نظام بيانات الورد الرئيسية — توثيق كامل للنموذج والمنطق التجاري.

---

## 1. المفهوم الأساسي

كل وردة في النظام تُعرَّف بـ **Variant** (نسخة)، وهي مجموعة فريدة من 6 صفات:

```
flower_type + color + origin + grade + size + bloom_stage
```

هذه المجموعة الستة تُشكّل هوية فريدة (`UNIQUE` constraint في قاعدة البيانات) — لا يمكن تكرار نفس التوليفة مرتين.

---

## 2. الصفات (Attributes)

### 2.1 نوع الوردة (flower_type)
| القيمة | الاسم |
|--------|-------|
| `rose` | ورد |
| `tulip` | توليب |
| `lily` | زنبق |
| `orchid` | أوركيد |
| `carnation` | قرنفل |
| `baby_rose` | ورد صغير |
| `hydrangea` | هيدرانجيا |
| `peony` | فاوانيا |
| `sunflower` | عباد الشمس |
| `gypsophila` | جبسوفيلا |
| `chrysanthemum` | أقحوان |

### 2.2 اللون (color)
`red`, `pink`, `white`, `yellow`, `orange`, `purple`, `lavender`, `peach`, `coral`, `burgundy`, `cream`, `bi_color`, `mixed`, `other`

### 2.3 المنشأ (origin)
| القيمة | المضاعف السعري | تعديل العمر الافتراضي |
|--------|---------------|----------------------|
| `netherlands` | 1.35× | +2 أيام |
| `ecuador` | 1.25× | +1 يوم |
| `kenya` | 1.10× | — |
| `colombia` | 1.20× | — |
| `ethiopia` | 1.05× | — |
| `local_saudi` | 0.85× | −1 يوم |
| `local_uae` | 0.90× | −1 يوم |
| `turkey` | 1.00× | — |
| `other` | 1.00× | — |

### 2.4 الدرجة (grade)
| القيمة | المضاعف السعري |
|--------|---------------|
| `premium_plus` | 1.50× |
| `premium` | 1.20× |
| `grade_a` | 1.00× |
| `grade_b` | 0.80× |
| `grade_c` | 0.65× |

### 2.5 الحجم (size)
`xs`, `small`, `medium`, `large`, `xl`

### 2.6 مرحلة التفتح (bloom_stage)
`bud` (برعم) → `semi_open` (نصف مفتوح) → `open` (مفتوح) → `full_bloom` (تفتح كامل)

---

## 3. جداول قاعدة البيانات

### 3.1 flower_variants (البيانات الرئيسية العالمية)
جدول عالمي (غير مرتبط بمنظمة) يحتوي على تعريف كل نسخة:

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `flower_type` | enum | نوع الوردة |
| `color` | enum | اللون |
| `origin` | enum | المنشأ |
| `grade` | enum | الدرجة |
| `size` | enum | الحجم |
| `bloom_stage` | enum | مرحلة التفتح |
| `display_name_ar` | text | الاسم العربي (يُولَّد تلقائياً) |
| `display_name_en` | text | الاسم الإنجليزي |
| `base_price_per_stem` | numeric | السعر الأساسي للساق |
| `origin_price_multiplier` | numeric | مضاعف المنشأ |
| `grade_price_multiplier` | numeric | مضاعف الدرجة |
| `shelf_life_days` | integer | العمر الافتراضي بالأيام |
| `is_active` | boolean | نشط/غير نشط |

**القيد الفريد:** `UNIQUE(flower_type, color, origin, grade, size, bloom_stage)`

### 3.2 flower_batches (دفعات المخزون)
كل دفعة واردة من مورد:

| الحقل | الوصف |
|-------|-------|
| `variant_id` | ربط بالنسخة |
| `org_id` | المنظمة المالكة |
| `batch_number` | رقم الدفعة |
| `quantity_received` | الكمية المستلمة |
| `quantity_remaining` | الكمية المتبقية (تتناقص عند الاستهلاك) |
| `unit_cost` | التكلفة للساق |
| `received_at` | تاريخ الاستلام |
| `expiry_estimated` | تاريخ الانتهاء المقدر **(أساس FEFO)** |
| `current_bloom_stage` | مرحلة التفتح الحالية |
| `quality_status` | الحالة: `fresh`, `good`, `acceptable`, `expiring`, `expired`, `damaged` |

### 3.3 flower_variant_pricing (تسعير المنظمة)
تسعير خاص بكل منظمة لكل نسخة:

- قيد جزئي فريد: نسعر واحدة نشطة فقط لكل `(org_id, variant_id)`.
- يمكن تجاوز المضاعفات الافتراضية بـ `origin_multiplier_override` و `grade_multiplier_override`.

### 3.4 flower_substitutions (البدائل)
جدول ثنائي الاتجاه يربط نسخة أصلية بنسخة بديلة:

| الحقل | الوصف |
|-------|-------|
| `primary_variant_id` | النسخة الأصلية |
| `substitute_variant_id` | البديل |
| `grade_direction` | `up` / `same` / `down` — هل البديل أعلى أو أقل درجة؟ |
| `compatibility_score` | درجة التوافق من 1-10 |
| `price_adjustment_percent` | فرق السعر المقبول |
| `is_auto_allowed` | هل يُسمح بالاستبدال التلقائي؟ |

### 3.5 flower_recipe_components (مكونات الوصفة)
يربط نسخة وردة بخدمة أو تنسيق:

| الحقل | الوصف |
|-------|-------|
| `variant_id` | النسخة المستخدمة |
| `service_id` | الخدمة أو التنسيق |
| `quantity` | الكمية بالسيقان |
| `is_optional` | مكون اختياري؟ |
| `show_to_customer` | يظهر للعميل؟ |

---

## 4. منطق FEFO

**First Expired, First Out** — أقدم انتهاء يُستهلك أولاً.

### الفهرس الحرج:
```sql
CREATE INDEX flower_batches_fefo_idx
  ON flower_batches(org_id, variant_id, expiry_estimated ASC)
  WHERE is_active = TRUE AND quantity_remaining > 0;
```

### مسار الاستهلاك (`POST /flower-master/batches/consume`):
1. جلب الدفعات مرتبة بـ `expiry_estimated ASC` (الأقدم أولاً).
2. خصم الكمية المطلوبة من كل دفعة بالترتيب.
3. إذا لم تكفِ الكمية الإجمالية → إرجاع `422 Insufficient stock`.

---

## 5. منطق التسعير

السعر النهائي للساق:

```
effective_price = base_price_per_stem × origin_multiplier × grade_multiplier
```

- إذا وجد `flower_variant_pricing` للمنظمة → يُستخدم `price_per_stem` منه مباشرة.
- إذا وجدت تجاوزات للمضاعفات في جدول التسعير → تحل محل القيم الافتراضية.

---

## 6. أوضاع العرض

### Detailed (تفصيلي — للتاجر)
يُعيد جميع الحقول: الدرجة، المنشأ، المضاعفات، التكلفة، العمر الافتراضي.

### Simplified (مبسط — للعميل)
يُعيد `display_name_ar` فقط مع السعر النهائي — بدون تفاصيل تقنية.

```
GET /flower-master/variants?mode=simplified
```

---

## 7. نقاط النهاية (API Endpoints)

### Variants
| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/flower-master/variants` | قائمة مع فلترة وبحث |
| GET | `/flower-master/variants/:id` | تفاصيل نسخة |
| POST | `/flower-master/variants` | إنشاء نسخة جديدة |
| PUT | `/flower-master/variants/:id` | تحديث |
| PATCH | `/flower-master/variants/:id/toggle` | تفعيل/تعطيل |
| GET | `/flower-master/enums` | قوائم الصفات للـ dropdowns |

### Batches
| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/flower-master/batches` | كل الدفعات (مرتبة FEFO) |
| GET | `/flower-master/batches/expiring` | الدفعات المنتهية قريباً |
| GET | `/flower-master/batches/fefo/:variantId` | FEFO لنسخة محددة |
| POST | `/flower-master/batches` | استلام دفعة جديدة |
| PATCH | `/flower-master/batches/:id` | تحديث الجودة/مرحلة التفتح |
| POST | `/flower-master/batches/consume` | استهلاك بمنطق FEFO |

### Pricing
| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/flower-master/pricing` | أسعار المنظمة |
| POST | `/flower-master/pricing` | تعيين سعر |
| DELETE | `/flower-master/pricing/:id` | حذف سعر |

### Substitutions
| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/flower-master/substitutions` | كل البدائل |
| POST | `/flower-master/substitutions` | إضافة بديل |
| DELETE | `/flower-master/substitutions/:id` | حذف |

### Recipes
| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/flower-master/recipes` | مكونات الوصفات |
| POST | `/flower-master/recipes` | إضافة مكون |
| DELETE | `/flower-master/recipes/:id` | حذف |

### Reports
| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/flower-master/reports/stock` | المخزون الحالي لكل نسخة |
| GET | `/flower-master/reports/origins` | تحليل حسب المنشأ |
| GET | `/flower-master/reports/grades` | تحليل حسب الدرجة |
| GET | `/flower-master/reports/consumption` | الاستهلاك مقابل الوارد |

---

## 8. التكامل مع باقي النظام

| الموديول | نقطة التكامل |
|---------|--------------|
| **الخدمات/التنسيقات** | `flower_recipe_components.service_id` |
| **المخزون** | `flower_batches` هو مصدر حقيقة المخزون |
| **الموردين** | `flower_batches.supplier_id` |
| **التقارير المالية** | `unit_cost` و `price_per_stem` من جداول الورد |
| **الطلبات العامة** | `mode=simplified` للعرض على صفحة العميل |

---

## 9. تشغيل Migration

```bash
PGPASSWORD=Nasaq_DB_2026@secure psql -h 127.0.0.1 -U nasaq_user -d nasaq \
  -f packages/db/migrations/005_flower_master.sql
```

الملف آمن للتشغيل أكثر من مرة (`IF NOT EXISTS` + `EXCEPTION WHEN duplicate_object`).
