# Gap Analysis — Phase 2: Cart API للـ Storefront العام

## الحالة الحالية
- جدول `abandoned_carts` موجود (16 عمود)
- `AbandonedCartsPage.tsx` موجود في dashboard (إدارة السلال المتروكة)
- `storefront-v2.ts` لا يحتوي أي cart endpoints

## ما ينقص

### API (storefront-v2.ts)
```
POST   /:orgSlug/cart              — إنشاء/تحديث سلة
GET    /:orgSlug/cart/:sessionId   — جلب سلة الجلسة
DELETE /:orgSlug/cart/:sessionId/item/:productId
POST   /:orgSlug/cart/:sessionId/apply-coupon
POST   /:orgSlug/cart/:sessionId/checkout  — تحويل السلة إلى order + رابط Moyasar
```

### قاعدة البيانات
- لا يحتاج migration جديد — `abandoned_carts` يكفي كـ session cart
- عند إتمام الدفع: نقل السلة إلى `online_orders` + تحديث `recovered_at`

## الأثر
بدون هذا: المتجر الإلكتروني يعرض منتجات لكن لا يمكن الشراء

## الأولوية
عالية جداً — blocking for Phase 3
