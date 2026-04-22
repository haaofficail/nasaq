# Gap Analysis — Phase 4: Products Management UI

## الحالة الحالية
- جدول `inventory_products` موجود (19 عمود)
- `InventoryPage.tsx` (716 سطر) يدير الأصول والمواد الاستهلاكية
- `inventory.ts` route موجود

## ما ينقص

### 1. حقول إضافية في inventory_products
```sql
-- Migration 152 مقترح
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]';
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS is_store_visible boolean DEFAULT false;
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS store_sort_order integer DEFAULT 0;
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS weight_kg numeric(8,3);
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS delivery_available boolean DEFAULT true;
```
**قبل تنفيذ أي migration: وقف واستشر Bander (CLAUDE.md)**

### 2. تبويب "كتالوج المتجر" في InventoryPage
- قائمة المنتجات مع toggle `is_store_visible`
- رفع صور للمنتج (imageUpload component موجود)
- ترتيب العرض
- معاينة سريعة كما سيظهر للعميل

### 3. Storefront Products API
```
GET /storefront-v2/:orgSlug/products  — منتجات المتجر للزوار
GET /storefront-v2/:orgSlug/products/:productId
```

### 4. ربط Page Builder blocks
- `ProductsGrid.tsx` تجلب من API بدل static data
- `ProductsFeatured.tsx` كذلك

## الأثر
بدون هذا: المتجر لا يعرض منتجات حقيقية

## ملاحظة مهمة
**قبل migration: تحقق من DB الفعلي أولاً** — `psql [db] -c "\d inventory_products"`
