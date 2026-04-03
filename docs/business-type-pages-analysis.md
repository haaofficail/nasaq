# تحليل الصفحات الرئيسية لكل نوع منشأة — نسق

> تاريخ التحليل: 2026-04-02
> المصدر: navigationRegistry.ts + dashboardProfiles.ts + pages/

---

## مفتاح التحليل

| رمز | معنى |
|-----|------|
| ✅ | الصفحة موجودة وعاملة |
| 🔒 | مقيّدة بالاشتراك (plan gate) |
| ⚠️ | موجودة جزئياً أو تحتاج تكاملاً |
| ❌ | غير موجودة — تحتاج بناء |
| 🎯 | الصفحة الرئيسية لهذا النوع |

---

## 1. صالون / حلاق / سبا / لياقة
**types:** `salon`, `barber`, `spa`, `fitness`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد (الإيرادات، الحجوزات، الموظفون) | DashboardPage → ProfileDashboard | ✅ | جميع |
| الحجوزات | BookingsPage | ✅ | جميع |
| الجدول الزمني | SchedulePage | ✅ | basic+ |
| العملاء | CustomersPage | ✅ | جميع |
| الخدمات | CatalogPage | ✅ | جميع |
| العمولات | CommissionsPage | ✅ 🔒 | advanced+ |
| الاستدعاء | RecallPage | ✅ 🔒 | advanced+ |
| مستلزمات الصالون | SalonSuppliesPage | ✅ | basic+ |
| اشتراكات العملاء | CustomerSubscriptionsPage | ✅ 🔒 | pro+ |
| بطاقة الجمال | ClientBeautyCardPage | ✅ | جميع |
| الحضور والانصراف | AttendancePage | ✅ | basic+ |
| التحكم في الدخول (fitness) | AccessControlPage | ✅ 🔒 | pro+ |
| التقارير | ReportsPage | ✅ 🔒 | basic+ |
| المالية | FinancePage | ✅ 🔒 | basic+ |
| التسويق | MarketingPage | ✅ 🔒 | advanced+ |
| واتساب | MessagingSettingsPage | ✅ 🔒 | advanced+ |

**الوضع:** مكتمل. أغنى نوع بالصفحات في النظام.

---

## 2. مطعم / مقهى / مخبز / تموين
**types:** `restaurant`, `cafe`, `bakery`, `catering`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد (الإيرادات، الطلبات، الموظفون) | DashboardPage → ProfileDashboard | ✅ | جميع |
| قائمة الطعام | MenuPage | ✅ | جميع |
| تصنيفات القائمة | MenuCategoriesPage | ✅ | جميع |
| المطبخ (شاشة الطلبات) | KitchenPage | ✅ | جميع |
| الطاولات | TableMapPage | ✅ | جميع |
| الطلبات الإلكترونية | OnlineOrdersPage | ✅ | basic+ |
| العملاء | CustomersPage | ✅ | جميع |
| الحجوزات (طاولات) | BookingsPage | ✅ | جميع |
| إعدادات الحجز | RestaurantBookingSettingsPage | ✅ | جميع |
| السلات المتروكة | AbandonedCartsPage | ✅ 🔒 | advanced+ |
| التقارير | RestaurantAnalyticsPage | ✅ 🔒 | basic+ |
| التسويق | MarketingPage | ✅ 🔒 | advanced+ |
| المالية | FinancePage | ✅ 🔒 | basic+ |

**الوضع:** مكتمل. الـ sidebar مبسّط (home + specialty_food + ops + growth).

---

## 3. محل ورود
**type:** `flower_shop`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد (السيقان، المنتهية، الإيرادات) | DashboardPage → FlowerProfile | ✅ | جميع |
| مخزون الورد | FlowerInventoryPage | ✅ | جميع |
| بيانات الورد (ماستر) | FlowerMasterPage | ✅ | جميع |
| التنسيقات | ArrangementsPage | ✅ | جميع |
| التحليلات | FlowerAnalyticsPage | ✅ 🔒 | basic+ |
| الحجوزات | BookingsPage | ✅ | جميع |
| العملاء | CustomersPage | ✅ | جميع |
| المتجر الإلكتروني (صفحة عامة) | PublicFlowerPage | ✅ | basic+ |
| بطاقات الباركود | BarcodeLabelPage | ✅ 🔒 | pro+ |
| السلات المتروكة | AbandonedCartsPage | ✅ 🔒 | advanced+ |
| المخزون العام | InventoryPage | ✅ | جميع |

**الوضع:** مكتمل جداً. نظام الورد أكثر عمقاً من أي نوع آخر.

---

## 4. فندق
**type:** `hotel`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد (الغرف، check-in/out، الإيرادات) | DashboardPage → HotelProfile | ✅ | جميع |
| إدارة الفندق (غرف، حجوزات، خدمات) | HotelPage | ✅ | جميع |
| الحجوزات | BookingsPage | ✅ | جميع |
| العملاء (النزلاء) | CustomersPage | ✅ | جميع |
| المالية | FinancePage | ✅ 🔒 | basic+ |
| التقارير | ReportsPage | ✅ 🔒 | basic+ |
| التكاملات (channel manager) | IntegrationsPage | ✅ 🔒 | pro+ |

**الفجوات:**
- ❌ **صفحة الغرف المستقلة** — حالياً كل شيء داخل HotelPage كـ tabs
- ❌ **تقرير الإشغال** — مدمج في ReportsPage بشكل عام
- ⚠️ **خدمات الغرف** — تُدار عبر CatalogPage لكنها مخفية (excluded)

---

## 5. تأجير سيارات
**type:** `car_rental`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد (متاحة، مؤجرة، تسليم/استلام اليوم) | DashboardPage → CarRentalProfile | ✅ | جميع |
| تأجير السيارات (أسطول، عقود، طلبات) | CarRentalPage | ✅ | جميع |
| الحجوزات | BookingsPage | ✅ | جميع |
| العملاء | CustomersPage | ✅ | جميع |
| المالية | FinancePage | ✅ 🔒 | basic+ |
| التقارير | ReportsPage | ✅ 🔒 | basic+ |

**الفجوات:**
- ❌ **صفحة الأسطول المستقلة** — كل شيء داخل CarRentalPage
- ❌ **تقرير المركبة** (history per vehicle)
- ⚠️ **التفتيش والصيانة** — موجودة في rental لكن غير مكشوفة لـ car_rental

---

## 6. تأجير (معدات / شاليهات / مستودعات)
**type:** `rental`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد (العقود، الأصول، الإيرادات) | DashboardPage → RentalProfile | ✅ | جميع |
| الأصول | AssetsPage | ✅ | جميع |
| العقود | ContractsPage | ✅ | جميع |
| التفتيش | InspectionsPage | ✅ | جميع |
| الصيانة والنظافة | MaintenancePage | ✅ | جميع |
| المستودع | WarehousePage | ✅ | جميع |
| الحجوزات | BookingsPage | ✅ | جميع |
| العملاء | CustomersPage | ✅ | جميع |
| التحليلات | RentalAnalyticsPage | ✅ 🔒 | basic+ |
| المالية | FinancePage | ✅ 🔒 | basic+ |

**الوضع:** مكتمل. نظام التأجير من أكثر الأنظمة اكتمالاً.

---

## 7. عقارات
**type:** `real_estate`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 لوحة العقارات | property/PropertyDashboardPage | ✅ | جميع |
| العقارات | property/PropertiesPage | ✅ | جميع |
| الوحدات | property/UnitsPage | ✅ | جميع |
| المستأجرون | property/TenantsPage | ✅ | جميع |
| العقود | property/ContractsPage | ✅ | جميع |
| الفواتير | property/InvoicesPage | ✅ | جميع |
| المدفوعات | property/PaymentsPage | ✅ | جميع |
| الصيانة | property/MaintenancePage | ✅ | جميع |
| المصروفات | property/ExpensesPage | ✅ | جميع |
| الإعلانات | property/ListingsPage | ✅ 🔒 | basic+ |
| الاستفسارات | property/InquiriesPage | ✅ | جميع |
| عمليات البيع | property/SalesPage | ✅ 🔒 | advanced+ |
| التقارير | property/ReportsPage | ✅ 🔒 | basic+ |

**الوضع:** نظام كامل ومستقل. لديه layout خاص به (isolated vertical).

---

## 8. متجر تجزئة
**type:** `retail`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد (الإيرادات، الطلبات، المخزون) | DashboardPage → RetailProfile | ✅ | جميع |
| المنتجات | CatalogPage | ✅ | جميع |
| المخزون | InventoryPage | ✅ | جميع |
| الطلبات | OnlineOrdersPage | ✅ | basic+ |
| العملاء | CustomersPage | ✅ | جميع |
| بطاقات الباركود | BarcodeLabelPage | ✅ 🔒 | pro+ |
| السلات المتروكة | AbandonedCartsPage | ✅ 🔒 | advanced+ |
| المالية | FinancePage | ✅ 🔒 | basic+ |
| التقارير | ReportsPage | ✅ 🔒 | basic+ |
| التسويق | MarketingPage | ✅ 🔒 | advanced+ |

**الوضع:** مكتمل.

---

## 9. فعاليات / تنظيم مناسبات
**types:** `events`, `event_organizer`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد | DashboardPage → EventsProfile | ✅ | جميع |
| الفعاليات | EventsPage | ✅ | جميع |
| الباقات | PackagesPage | ✅ | جميع |
| عروض الأسعار | EventQuotationsPage | ✅ | جميع |
| الحجوزات | BookingsPage | ✅ | جميع |
| العملاء | CustomersPage | ✅ | جميع |
| المالية | FinancePage | ✅ 🔒 | basic+ |

**الفجوات:**
- ❌ **صفحة الموردين والبائعين** (catering, photography vendors per event)
- ❌ **جدول الفعالية التفصيلي** (timeline per event day)

---

## 10. تصوير
**type:** `photography`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد | DashboardPage → PhotographyProfile | ✅ | جميع |
| الحجوزات | BookingsPage | ✅ | جميع |
| مكتبة الوسائط | MediaLibraryPage | ✅ | جميع |
| معارض العملاء | GalleriesPage | ✅ | basic+ |
| العملاء | CustomersPage | ✅ | جميع |
| الخدمات | CatalogPage | ✅ | جميع |
| أوامر العمل | WorkOrdersPage | ✅ | جميع |
| المالية | FinancePage | ✅ 🔒 | basic+ |

**الوضع:** مكتمل. نظام المعارض من أقوى الميزات.

---

## 11. صيانة / ورشة / مقاولات / لوجستيات
**types:** `maintenance`, `workshop`, `logistics`, `construction`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد | DashboardPage → default | ✅ | جميع |
| أوامر العمل | WorkOrdersPage | ✅ | جميع |
| الحجوزات (طلبات خدمة) | BookingsPage | ✅ | جميع |
| العملاء | CustomersPage | ✅ | جميع |
| الفريق | TeamPage | ✅ | جميع |
| المالية | FinancePage | ✅ 🔒 | basic+ |
| التقارير | ReportsPage | ✅ 🔒 | basic+ |

**الفجوات:**
- ❌ **داشبورد مخصص** — يستخدم "default" حالياً، يحتاج profile مخصص
- ❌ **خريطة الفريق الميداني** (تتبع مواقع المهندسين)
- ❌ **إدارة المواد والمخزون** للورش والمقاولات

---

## 12. طباعة / مغسلة / خدمات رقمية / تقنية
**types:** `printing`, `laundry`, `digital_services`, `technology`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 الداشبورد | DashboardPage → default | ✅ | جميع |
| الحجوزات / الطلبات | BookingsPage | ✅ | جميع |
| العملاء | CustomersPage | ✅ | جميع |
| الخدمات | CatalogPage | ✅ | جميع |
| المالية | FinancePage | ✅ 🔒 | basic+ |

**الفجوات:**
- ❌ **داشبورد مخصص** لكل منها
- ❌ **تتبع الطلبات** للمغسلة والطباعة (حالة الطلب: استلام → معالجة → تسليم)
- ❌ **إدارة المشاريع** للتقنية والخدمات الرقمية

---

## 13. مدرسة
**type:** `school`

| الصفحة | الملف | الحالة | الباقة |
|--------|-------|--------|--------|
| 🎯 مراقب اليوم | school/DayMonitorPage | ✅ | جميع |
| الطلاب | school/StudentsPage | ✅ | جميع |
| الفصول | school/ClassesPage | ✅ | جميع |
| الحضور والغياب | school/AttendancePage | ✅ | جميع |
| المعلمون | school/TeachersPage | ✅ | جميع |
| حصص اليوم | school/PeriodsPage | ✅ | جميع |
| الحالات والمتابعة | school/CasesPage | ✅ | جميع |
| المخالفات | school/ViolationsPage | ✅ | جميع |
| السلوك والمواظبة | school/BehaviorPage | ✅ | جميع |
| قوالب الجداول | school/TimetablePage | ✅ | جميع |
| الأسابيع والجداول | school/SchedulesPage | ✅ | جميع |
| المواد الدراسية | school/SubjectsPage | ✅ | جميع |
| الاستيراد | school/ImportPage | ✅ | جميع |

**الوضع:** نظام كامل ومستقل. يُعاد توجيه المدرسة فوراً من DashboardPage → /school/dashboard.

---

## ملخص الفجوات الكبرى

### الأولوية القصوى (مفقود كلياً)
| الفجوة | الأنواع المتأثرة | الأولوية |
|--------|----------------|---------|
| داشبورد مخصص للصيانة/ورشة | maintenance, workshop, construction, logistics | 🔴 عالية |
| صفحة تتبع الطلبات (lifecycle) | laundry, printing | 🔴 عالية |
| داشبورد مخصص للتقنية/الخدمات الرقمية | digital_services, technology | 🟡 متوسطة |
| صفحة الأسطول المستقلة | car_rental | 🟡 متوسطة |
| موردو الفعاليات (vendor management) | events, event_organizer | 🟡 متوسطة |

### مطلوب تكامل مع الاشتراك (موجود لكن غير محمي)
| الصفحة | الباقة المطلوبة |
|--------|--------------|
| CommissionsPage | advanced |
| RecallPage | advanced |
| IntegrationsPage | pro |
| CustomerSubscriptionsPage | pro |
| BarcodeLabelPage | pro |

---

## جدول الاشتراك × الصفحات

| الباقة | الصفحات المتاحة |
|--------|---------------|
| **free** | الداشبورد، الحجوزات، العملاء، الخدمات/المنتجات، الفريق (عرض فقط)، الإعدادات |
| **basic** | + المالية، المدفوعات، التقارير، الموقع، التقييمات، الجدول الزمني، المستلزمات، الطلبات الإلكترونية |
| **advanced** | + التسويق، واتساب، الشرائح، السلات المتروكة، العمولات، الاستدعاء |
| **pro** | + التكاملات، اشتراكات العملاء، بطاقات الباركود، التحكم في الدخول |
| **enterprise** | كل شيء + دعم مخصص |
