# Gap Analysis — Phase 3: Checkout Flow للمتجر

## الحالة الحالية
- `PublicPaymentPage.tsx` موجودة لكن مخصصة للحجوزات
- `payments/initiate` يقبل `invoiceId` أو `bookingId` فقط
- لا توجد صفحة checkout للمنتجات

## ما ينقص

### 1. تعديل `payments/initiate`
```typescript
// إضافة دعم orderId
body: {
  invoiceId?: string;
  bookingId?: string;
  orderId?: string;  // ← جديد
  amount: number;
  description: string;
}
```

### 2. Checkout flow في PublicStorefrontPage.tsx
- زر "إتمام الطلب" في السلة
- نموذج بيانات العميل (اسم، هاتف، عنوان التوصيل)
- POST إلى cart checkout endpoint
- redirect إلى رابط Moyasar
- معالجة callback (redirect_url تشير لـ /store/:slug/order-success)

### 3. صفحة تأكيد الطلب
- `/store/:slug/order/:orderId` — تأكيد بعد الدفع
- تحقق من status عبر `payments/callback`

## الأثر
بدون هذا: المتجر لا يولّد أي إيراد

## المتطلبات الأولى
Phase 2 (Cart API) يجب أن يكتمل أولاً
