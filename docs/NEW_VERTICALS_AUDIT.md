# New Verticals Audit — الفنادق وتأجير السيارات

## الوضع الحالي

### `hotel` business type
- **لا يوجد** في أي مكان في النظام
- لا جداول DB، لا routes، لا UI pages، لا nav groups
- `room_booking` كـ offering type غير موجود
- لا توجد حالات حجز فندقية (checked_in, checked_out, no_show)
- لا توجد غرف أو وحدات أو أنواع غرف

### `car_rental` business type
- **لا يوجد** في أي مكان في النظام
- `rental` موجود لكنه خاص بإيجار المعدات للفعاليات (event equipment rental)
- `vehicle_rental` كـ offering type غير موجود
- لا توجد مركبات أو فئات أو سجلات فحص
- لا توجد سياسات إيداع أو تأمين أو وقود

---

## ما يجب بناؤه: Hotel Vertical

### DB Schema الجديد: `packages/db/schema/hotel.ts`

```
roomTypes          — أنواع الغرف (standard, deluxe, suite)
roomUnits          — الغرف الفعلية كوحدات (101, 102, ...)
hotelReservations  — حجوزات الضيوف
housekeepingLogs   — سجل التنظيف والصيانة
```

### API Routes الجديدة: `/hotel/*`
```
GET/POST/PUT/DELETE /hotel/room-types
GET/POST/PUT/DELETE /hotel/rooms
GET/POST/PUT/DELETE /hotel/reservations
PATCH /hotel/reservations/:id/checkin
PATCH /hotel/reservations/:id/checkout
GET/POST /hotel/housekeeping
GET /hotel/availability
GET /hotel/dashboard-stats
```

### Dashboard Pages الجديدة:
- `HotelPage.tsx` — لوحة تحكم شاملة بتبويبات متعددة

---

## ما يجب بناؤه: Car Rental Vertical

### DB Schema الجديد: `packages/db/schema/car-rental.ts`

```
vehicleCategories   — فئات السيارات (economy, SUV, luxury)
vehicleUnits        — السيارات كوحدات فعلية
carRentalReservations — حجوزات التأجير
vehicleInspections  — سجلات الفحص
```

### API Routes الجديدة: `/car-rental/*`
```
GET/POST/PUT/DELETE /car-rental/categories
GET/POST/PUT/DELETE /car-rental/vehicles
GET/POST/PUT/DELETE /car-rental/reservations
PATCH /car-rental/reservations/:id/pickup
PATCH /car-rental/reservations/:id/return
POST /car-rental/reservations/:id/inspection
GET /car-rental/availability
GET /car-rental/dashboard-stats
```

### Dashboard Pages الجديدة:
- `CarRentalPage.tsx` — لوحة تحكم شاملة بتبويبات متعددة

---

## مستوى التشغيل المرن

### Hotel
| الوضع | ما يلزم |
|-------|--------|
| مبسط | اسم الغرفة + سعر ليلة + حجز مباشر |
| متوسط | أنواع غرف + وحدات + تقويم توفر |
| متقدم | housekeeping + تسعير موسمي + سياسات + تقارير |

الحقل `settings.capabilities.hotel_mode = 'simple' | 'standard' | 'advanced'`

### Car Rental
| الوضع | ما يلزم |
|-------|--------|
| مبسط | اسم الفئة + سعر يوم + حجز مباشر |
| متوسط | فئات + وحدات + تقويم توفر + عربون |
| متقدم | فحص + صيانة + تأمين + مخالفات + تقارير |

الحقل `settings.capabilities.car_rental_mode = 'simple' | 'standard' | 'advanced'`

---

## تأثير على بقية النظام

| Module | Hotel | Car Rental |
|--------|-------|-----------|
| Bookings | حجوزات فندقية بحالات مختلفة | حجوزات تأجير بحالات مختلفة |
| Inventory/Assets | غرف كـ units | سيارات كـ units |
| Pricing | تسعير موسمي، خطط إقامة | تسعير بالمدة، كيلومتر |
| Finance | فاتورة بإقامة + extra charges | فاتورة بإيجار + deposit + damage |
| Reports | إشغال، RevPAR، نزلاء | fleet utilization، return rate |
| Team/Roles | front desk، housekeeping، maintenance | fleet manager، inspection staff |
| Notifications | تذكير قبل check-in، تأخير check-out | تذكير بموعد الإرجاع |
| Integrations | OTA channels, booking.com | delivery/pickup tracking |
