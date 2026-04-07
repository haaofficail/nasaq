// ============================================================
// قوالب الخدمات الجاهزة — static data, no DB required
// هذا الملف هو المصدر الوحيد لقوالب الخدمات لكل نوع منشأة
// ============================================================

export interface TemplateItem {
  categoryName: string;
  name: string;
  nameEn?: string;
  description?: string;
  basePrice: number;
  durationMinutes?: number;
  offeringType: string;
  serviceType: string;
  sortOrder: number;
}

export interface ServiceTemplate {
  businessType: string;
  label: string;
  items: TemplateItem[];
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  // ─── صالون ──────────────────────────────────────────────────────────────
  {
    businessType: "salon",
    label: "صالون تجميل",
    items: [
      { categoryName: "قص وتصفيف", name: "قص شعر رجالي", nameEn: "Men's Haircut", description: "قص شعر احترافي مع تسريح وتشطيب", basePrice: 50, durationMinutes: 30, offeringType: "service", serviceType: "appointment", sortOrder: 1 },
      { categoryName: "قص وتصفيف", name: "قص شعر أطفال", nameEn: "Kids Haircut", description: "قص شعر الأطفال بعناية واحترافية", basePrice: 35, durationMinutes: 20, offeringType: "service", serviceType: "appointment", sortOrder: 2 },
      { categoryName: "العناية باللحية", name: "حلاقة لحية كاملة", nameEn: "Full Beard Shave", description: "تشكيل وحلاقة اللحية مع ترطيب", basePrice: 40, durationMinutes: 25, offeringType: "service", serviceType: "appointment", sortOrder: 3 },
      { categoryName: "العناية باللحية", name: "تشكيل لحية", nameEn: "Beard Shaping", description: "تشكيل وتهذيب اللحية فقط", basePrice: 25, durationMinutes: 15, offeringType: "service", serviceType: "appointment", sortOrder: 4 },
      { categoryName: "باقات", name: "باقة الاستقبال الكاملة", nameEn: "Full Grooming Package", description: "قص + لحية + مساج رأس", basePrice: 110, durationMinutes: 60, offeringType: "service", serviceType: "appointment", sortOrder: 5 },
      { categoryName: "العناية بالبشرة", name: "مساج وجه وعنق", nameEn: "Face & Neck Massage", description: "مساج استرخاء مع كريمات طبيعية", basePrice: 60, durationMinutes: 30, offeringType: "service", serviceType: "appointment", sortOrder: 6 },
    ],
  },

  // ─── تصوير ──────────────────────────────────────────────────────────────
  {
    businessType: "photography",
    label: "تصوير",
    items: [
      { categoryName: "جلسات تصوير", name: "جلسة تصوير عائلية", nameEn: "Family Photo Session", description: "جلسة تصوير للعائلة في الاستوديو أو خارجه", basePrice: 800, durationMinutes: 90, offeringType: "service", serviceType: "appointment", sortOrder: 1 },
      { categoryName: "جلسات تصوير", name: "جلسة تصوير أفراد", nameEn: "Individual Portrait", description: "تصوير فردي احترافي للشخصيات", basePrice: 500, durationMinutes: 60, offeringType: "service", serviceType: "appointment", sortOrder: 2 },
      { categoryName: "جلسات تصوير", name: "جلسة تصوير أطفال", nameEn: "Kids Photography", description: "جلسة تصوير مخصصة للأطفال مع ديكور احترافي", basePrice: 600, durationMinutes: 60, offeringType: "service", serviceType: "appointment", sortOrder: 3 },
      { categoryName: "تصوير الفعاليات", name: "تصوير حفل زفاف", nameEn: "Wedding Photography", description: "تغطية فوتوغرافية كاملة لحفل الزفاف", basePrice: 4500, durationMinutes: 480, offeringType: "service", serviceType: "execution", sortOrder: 4 },
      { categoryName: "تصوير الفعاليات", name: "تصوير تخرج", nameEn: "Graduation Photography", description: "تصوير حفلات التخرج والمناسبات الجامعية", basePrice: 1200, durationMinutes: 120, offeringType: "service", serviceType: "appointment", sortOrder: 5 },
      { categoryName: "تصوير منتجات", name: "تصوير منتجات تجارية", nameEn: "Product Photography", description: "تصوير منتجات للمتاجر الإلكترونية والكتالوجات", basePrice: 300, durationMinutes: 120, offeringType: "service", serviceType: "appointment", sortOrder: 6 },
      { categoryName: "تصوير فيديو", name: "فيديو إعلاني قصير", nameEn: "Short Ad Video", description: "تصوير ومونتاج فيديو إعلاني 60 ثانية", basePrice: 2000, durationMinutes: 240, offeringType: "service", serviceType: "execution", sortOrder: 7 },
    ],
  },

  // ─── فندق ───────────────────────────────────────────────────────────────
  {
    businessType: "hotel",
    label: "فندق وإقامة",
    items: [
      { categoryName: "الغرف", name: "غرفة مفردة", nameEn: "Single Room", description: "غرفة مفردة مع إطلالة داخلية", basePrice: 350, durationMinutes: 1440, offeringType: "room_booking", serviceType: "rental", sortOrder: 1 },
      { categoryName: "الغرف", name: "غرفة مزدوجة", nameEn: "Double Room", description: "غرفة بسريرين مع إطلالة خارجية", basePrice: 500, durationMinutes: 1440, offeringType: "room_booking", serviceType: "rental", sortOrder: 2 },
      { categoryName: "الغرف", name: "جناح عائلي", nameEn: "Family Suite", description: "جناح واسع للعائلات مع غرفتين ومطبخ صغير", basePrice: 900, durationMinutes: 1440, offeringType: "room_booking", serviceType: "rental", sortOrder: 3 },
      { categoryName: "الخدمات", name: "خدمة الإفطار", nameEn: "Breakfast Service", description: "وجبة إفطار بوفيه مفتوح للشخص الواحد", basePrice: 80, offeringType: "service", serviceType: "appointment", sortOrder: 4 },
      { categoryName: "الخدمات", name: "خدمة التوصيل من المطار", nameEn: "Airport Transfer", description: "توصيل من/إلى المطار بسيارة مريحة", basePrice: 150, durationMinutes: 60, offeringType: "service", serviceType: "execution", sortOrder: 5 },
      { categoryName: "قاعات الاجتماعات", name: "قاعة اجتماعات صغيرة", nameEn: "Small Meeting Room", description: "قاعة لـ 10 أشخاص مع أجهزة عرض", basePrice: 500, durationMinutes: 60, offeringType: "service", serviceType: "appointment", sortOrder: 6 },
    ],
  },

  // ─── تأجير سيارات ────────────────────────────────────────────────────────
  {
    businessType: "car_rental",
    label: "تأجير سيارات",
    items: [
      { categoryName: "سيارات اقتصادية", name: "تأجير سيارة اقتصادية يومي", nameEn: "Economy Car - Daily", description: "سيارة صالون اقتصادية، تأجير يومي", basePrice: 150, durationMinutes: 1440, offeringType: "vehicle_rental", serviceType: "rental", sortOrder: 1 },
      { categoryName: "سيارات اقتصادية", name: "تأجير سيارة اقتصادية أسبوعي", nameEn: "Economy Car - Weekly", description: "سيارة صالون اقتصادية، تأجير أسبوعي مع خصم", basePrice: 900, durationMinutes: 10080, offeringType: "vehicle_rental", serviceType: "rental", sortOrder: 2 },
      { categoryName: "دفع رباعي", name: "تأجير جيب دفع رباعي يومي", nameEn: "4WD SUV - Daily", description: "جيب دفع رباعي مناسب للرحلات البرية", basePrice: 350, durationMinutes: 1440, offeringType: "vehicle_rental", serviceType: "rental", sortOrder: 3 },
      { categoryName: "سيارات فاخرة", name: "تأجير سيارة فاخرة يومي", nameEn: "Luxury Car - Daily", description: "سيارة فاخرة للمناسبات والأعمال", basePrice: 700, durationMinutes: 1440, offeringType: "vehicle_rental", serviceType: "rental", sortOrder: 4 },
      { categoryName: "خدمات إضافية", name: "سائق خاص يومي", nameEn: "Private Driver - Daily", description: "سائق محترف لمدة يوم كامل", basePrice: 400, durationMinutes: 480, offeringType: "service", serviceType: "rental", sortOrder: 5 },
      { categoryName: "خدمات إضافية", name: "تأمين شامل للمركبة", nameEn: "Full Insurance", description: "تأمين شامل ضد الحوادث والسرقة", basePrice: 50, offeringType: "service", serviceType: "rental", sortOrder: 6 },
    ],
  },

  // ─── مطعم ────────────────────────────────────────────────────────────────
  {
    businessType: "restaurant",
    label: "مطعم",
    items: [
      { categoryName: "حجوزات", name: "حجز طاولة للأفراد (2-4)", nameEn: "Table for 2-4", description: "حجز طاولة في منطقة الغداء أو العشاء", basePrice: 0, durationMinutes: 90, offeringType: "reservation", serviceType: "appointment", sortOrder: 1 },
      { categoryName: "حجوزات", name: "حجز طاولة للعائلات (5-8)", nameEn: "Family Table", description: "حجز طاولة كبيرة في القسم العائلي", basePrice: 0, durationMinutes: 120, offeringType: "reservation", serviceType: "appointment", sortOrder: 2 },
      { categoryName: "خاص ومناسبات", name: "حجز قاعة VIP", nameEn: "VIP Room Booking", description: "قاعة خاصة لـ 10-20 شخص مع تزيين خاص", basePrice: 500, durationMinutes: 180, offeringType: "reservation", serviceType: "appointment", sortOrder: 3 },
      { categoryName: "خاص ومناسبات", name: "حفل عيد ميلاد", nameEn: "Birthday Party", description: "حجز خاص مع كيكة وتزيين لعيد ميلاد", basePrice: 800, durationMinutes: 180, offeringType: "service", serviceType: "appointment", sortOrder: 4 },
      { categoryName: "عروض خاصة", name: "تجربة عشاء رومانسي", nameEn: "Romantic Dinner", description: "طاولة خاصة مع إضاءة رومانسية وبوكيه", basePrice: 350, durationMinutes: 120, offeringType: "service", serviceType: "appointment", sortOrder: 5 },
      { categoryName: "توصيل", name: "توصيل طلبات للمنازل", nameEn: "Home Delivery", description: "توصيل الطلبات لنطاق المطعم", basePrice: 15, durationMinutes: 45, offeringType: "service", serviceType: "food_order", sortOrder: 6 },
    ],
  },

  // ─── تجزئة ──────────────────────────────────────────────────────────────
  {
    businessType: "retail",
    label: "تجزئة",
    items: [
      { categoryName: "منتجات", name: "منتج عام", nameEn: "General Product", description: "منتج للبيع بالتجزئة", basePrice: 100, offeringType: "product", serviceType: "product", sortOrder: 1 },
      { categoryName: "خدمات", name: "توصيل للمنزل", nameEn: "Home Delivery", description: "توصيل المشتريات للعنوان المطلوب", basePrice: 25, durationMinutes: 60, offeringType: "service", serviceType: "product_shipping", sortOrder: 2 },
      { categoryName: "خدمات", name: "تغليف هدايا", nameEn: "Gift Wrapping", description: "تغليف احترافي للهدايا مع بطاقة", basePrice: 20, durationMinutes: 15, offeringType: "service", serviceType: "execution", sortOrder: 3 },
      { categoryName: "اشتراكات", name: "اشتراك شهري", nameEn: "Monthly Subscription", description: "اشتراك شهري لتوصيل منتجات مختارة", basePrice: 199, offeringType: "subscription", serviceType: "product", sortOrder: 4 },
      { categoryName: "باقات", name: "باقة هدايا خاصة", nameEn: "Gift Bundle", description: "مجموعة منتجات مختارة في علبة هدايا أنيقة", basePrice: 250, offeringType: "service", serviceType: "product", sortOrder: 5 },
    ],
  },

  // ─── تأجير معدات وفعاليات ────────────────────────────────────────────────
  {
    businessType: "rental",
    label: "تأجير معدات",
    items: [
      { categoryName: "خيام وظلال", name: "خيمة مغربية 6×8", nameEn: "Moroccan Tent 6x8", description: "خيمة مغربية فاخرة مع إضاءة وتأثيث", basePrice: 2500, offeringType: "service", serviceType: "event_rental", sortOrder: 1 },
      { categoryName: "خيام وظلال", name: "مظلة احتفالية كبيرة", nameEn: "Large Party Tent", description: "مظلة بيضاء 10×20 متر للفعاليات", basePrice: 1800, offeringType: "service", serviceType: "event_rental", sortOrder: 2 },
      { categoryName: "جلسات وأثاث", name: "طقم جلسة عربية", nameEn: "Arabic Seating Set", description: "طقم جلسة أرضية عربية لـ 10 أشخاص", basePrice: 800, offeringType: "rental", serviceType: "event_rental", sortOrder: 3 },
      { categoryName: "جلسات وأثاث", name: "طاولات وكراسي (10 طاولات)", nameEn: "Tables & Chairs x10", description: "طاولات وكراسي بيضاء لـ 80 شخص", basePrice: 1200, offeringType: "rental", serviceType: "event_rental", sortOrder: 4 },
      { categoryName: "صوتيات وإضاءة", name: "نظام صوتي احترافي", nameEn: "Pro Sound System", description: "سماعات + ميكسر + ميكروفون لاسلكي", basePrice: 1500, offeringType: "rental", serviceType: "event_rental", sortOrder: 5 },
      { categoryName: "صوتيات وإضاءة", name: "إضاءة ليد احتفالية", nameEn: "LED Event Lighting", description: "إضاءة ملونة وديكورية للفعاليات", basePrice: 900, offeringType: "rental", serviceType: "event_rental", sortOrder: 6 },
      { categoryName: "دفايات وتبريد", name: "دفاية غاز (4 قطع)", nameEn: "Gas Heaters x4", description: "دفايات غاز للفعاليات الشتوية", basePrice: 600, offeringType: "rental", serviceType: "event_rental", sortOrder: 7 },
    ],
  },

  // ─── محل ورد ─────────────────────────────────────────────────────────────
  {
    businessType: "flower_shop",
    label: "محل ورد",
    items: [
      // ─ منتجات الورد
      { categoryName: "منتجات الورد", name: "وردة مفردة فاخرة", description: "وردة طازجة مفردة مع تغليف أنيق", basePrice: 15, offeringType: "product", serviceType: "product", sortOrder: 1 },
      { categoryName: "منتجات الورد", name: "باقة ورد صغيرة", description: "باقة 12 وردة طازجة مع خضرة زينية", basePrice: 80, offeringType: "product", serviceType: "product", sortOrder: 2 },
      { categoryName: "منتجات الورد", name: "باقة ورد متوسطة", description: "باقة 24 وردة مع تغليف فاخر وبطاقة", basePrice: 150, offeringType: "product", serviceType: "product", sortOrder: 3 },
      { categoryName: "منتجات الورد", name: "باقة ورد فاخرة", description: "باقة 50 وردة فاخرة بتصميم احترافي", basePrice: 350, offeringType: "product", serviceType: "product", sortOrder: 4 },
      // ─ صناديق وهدايا
      { categoryName: "صناديق وهدايا", name: "صندوق ورد صغير", description: "صندوق هدايا مع ورد طازج وبطاقة", basePrice: 120, offeringType: "product", serviceType: "product", sortOrder: 5 },
      { categoryName: "صناديق وهدايا", name: "صندوق ورد فاخر", description: "صندوق فاخر مع ورد وشوكولاتة وبطاقة شخصية", basePrice: 280, offeringType: "product", serviceType: "product", sortOrder: 6 },
      { categoryName: "صناديق وهدايا", name: "بوكس ورد مع هدية", description: "بوكس ورد مميز مع هدية مرفقة حسب المناسبة", basePrice: 350, offeringType: "product", serviceType: "product", sortOrder: 7 },
      // ─ تنسيقات
      { categoryName: "تنسيقات", name: "تنسيق طاولة صغير", description: "تنسيق ورد لطاولة صغيرة أو كاونتر", basePrice: 120, offeringType: "product", serviceType: "product", sortOrder: 8 },
      { categoryName: "تنسيقات", name: "تنسيق مكتبي", description: "تنسيق ورد طبيعي للمكاتب والاستقبالات", basePrice: 150, offeringType: "product", serviceType: "product", sortOrder: 9 },
      { categoryName: "تنسيقات", name: "تيراريوم نباتي", description: "تيراريوم زجاجي بالنباتات الصغيرة", basePrice: 200, offeringType: "product", serviceType: "product", sortOrder: 10 },
      // ─ نباتات
      { categoryName: "نباتات", name: "نبتة أوركيد", description: "أوركيد أبيض أو وردي في أصيص أنيق", basePrice: 180, offeringType: "product", serviceType: "product", sortOrder: 11 },
      { categoryName: "نباتات", name: "نبتة منزلية", description: "نبتة منزلية جميلة مناسبة للهدايا", basePrice: 120, offeringType: "product", serviceType: "product", sortOrder: 12 },
      // ─ إضافات
      { categoryName: "إضافات", name: "شمعة معطرة", description: "شمعة معطرة فاخرة مناسبة للهدايا", basePrice: 65, offeringType: "product", serviceType: "product", sortOrder: 13 },
      { categoryName: "إضافات", name: "بطاقة إهداء مخصصة", description: "بطاقة إهداء بكتابة خط يد جميلة", basePrice: 20, offeringType: "product", serviceType: "product", sortOrder: 14 },
      // ─ خدمات
      { categoryName: "خدمات", name: "توصيل باقة ورد", description: "توصيل الطلبات للعنوان المطلوب خلال 3 ساعات", basePrice: 30, durationMinutes: 90, offeringType: "service", serviceType: "product_shipping", sortOrder: 15 },
      { categoryName: "خدمات", name: "تغليف هدية خاص", description: "تغليف احترافي للهدايا مع ريبون وبطاقة", basePrice: 25, durationMinutes: 15, offeringType: "service", serviceType: "execution", sortOrder: 16 },
      // ─ تنسيقات مناسبات (execution)
      { categoryName: "تنسيقات مناسبات", name: "تنسيق طاولة زفاف", description: "تنسيق زهور لطاولة عروس مع كانديلابرا", basePrice: 500, durationMinutes: 120, offeringType: "service", serviceType: "execution", sortOrder: 17 },
      { categoryName: "تنسيقات مناسبات", name: "تنسيق قاعة احتفالات", description: "تنسيق زهور لقاعة احتفالات (25 طاولة)", basePrice: 3500, durationMinutes: 240, offeringType: "service", serviceType: "execution", sortOrder: 18 },
    ],
  },

  // ─── تجهيزات فعاليات ────────────────────────────────────────────────────
  {
    businessType: "events",
    label: "تجهيزات فعاليات",
    items: [
      { categoryName: "تجهيز كامل", name: "تجهيز فعالية صغيرة (50 شخص)", nameEn: "Small Event Setup 50pax", description: "خيمة + أثاث + إضاءة + صوتيات لـ 50 شخص", basePrice: 5000, durationMinutes: 480, offeringType: "service", serviceType: "execution", sortOrder: 1 },
      { categoryName: "تجهيز كامل", name: "تجهيز فعالية متوسطة (150 شخص)", nameEn: "Medium Event Setup", description: "تجهيز متكامل لحفل أو فعالية متوسطة", basePrice: 12000, durationMinutes: 720, offeringType: "service", serviceType: "execution", sortOrder: 2 },
      { categoryName: "خدمات", name: "تركيب وفك", nameEn: "Setup & Teardown", description: "فريق تركيب وفك لأي نوع من التجهيزات", basePrice: 1500, durationMinutes: 360, offeringType: "service", serviceType: "execution", sortOrder: 3 },
      { categoryName: "استشارة", name: "استشارة تنظيم فعالية", nameEn: "Event Planning Consultation", description: "جلسة استشارة لتخطيط الفعاليات مع خبير", basePrice: 300, durationMinutes: 60, offeringType: "service", serviceType: "appointment", sortOrder: 4 },
    ],
  },

  // ─── ضيافة ────────────────────────────────────────────────────────────────
  {
    businessType: "catering",
    label: "ضيافة",
    items: [
      { categoryName: "وجبات", name: "بوفيه إفطار (للشخص)", nameEn: "Breakfast Buffet per Person", description: "بوفيه إفطار متنوع للفعاليات الصباحية", basePrice: 65, offeringType: "service", serviceType: "execution", sortOrder: 1 },
      { categoryName: "وجبات", name: "بوفيه غداء (للشخص)", nameEn: "Lunch Buffet per Person", description: "بوفيه غداء شامل مع مقبلات ورئيسية وحلى", basePrice: 120, offeringType: "service", serviceType: "execution", sortOrder: 2 },
      { categoryName: "قهوة وشاي", name: "ركن قهوة عربية (100 شخص)", nameEn: "Arabic Coffee Corner", description: "ركن قهوة عربية وشاي وتمر لـ 100 شخص", basePrice: 800, durationMinutes: 240, offeringType: "service", serviceType: "execution", sortOrder: 3 },
      { categoryName: "حلويات", name: "حلويات شرقية (كيلو)", nameEn: "Oriental Sweets per Kg", description: "تشكيلة حلويات شرقية محلية الصنع", basePrice: 80, offeringType: "product", serviceType: "product", sortOrder: 4 },
      { categoryName: "باقات كاملة", name: "ضيافة عزومة كاملة", nameEn: "Full Gathering Catering", description: "باقة ضيافة متكاملة للعزائم العائلية (20 شخص)", basePrice: 2500, durationMinutes: 300, offeringType: "service", serviceType: "execution", sortOrder: 5 },
    ],
  },

  // ─── ديكور ────────────────────────────────────────────────────────────────
  {
    businessType: "decoration",
    label: "ديكور",
    items: [
      { categoryName: "تزيين مناسبات", name: "تزيين حفل زفاف", nameEn: "Wedding Decoration", description: "تزيين كامل للقاعة مع قوس العرسان", basePrice: 8000, durationMinutes: 480, offeringType: "service", serviceType: "execution", sortOrder: 1 },
      { categoryName: "تزيين مناسبات", name: "تزيين عيد ميلاد", nameEn: "Birthday Decoration", description: "بالونات وزينة متكاملة لحفل عيد الميلاد", basePrice: 800, durationMinutes: 120, offeringType: "service", serviceType: "execution", sortOrder: 2 },
      { categoryName: "استشارة", name: "استشارة ديكور وتصميم", nameEn: "Decoration Consultation", description: "جلسة استشارة مع مصمم ديكور معتمد", basePrice: 200, durationMinutes: 60, offeringType: "service", serviceType: "appointment", sortOrder: 3 },
      { categoryName: "تزيين مناسبات", name: "تزيين طاولة عيد ميلاد", nameEn: "Birthday Table Setup", description: "تزيين طاولة خاصة لعيد الميلاد", basePrice: 350, durationMinutes: 60, offeringType: "service", serviceType: "execution", sortOrder: 4 },
    ],
  },

  // ─── ترفيه ────────────────────────────────────────────────────────────────
  {
    businessType: "entertainment",
    label: "ترفيه",
    items: [
      { categoryName: "فعاليات ترفيهية", name: "تحفيظ ومقدم حفل", nameEn: "Event Host/MC", description: "مقدم محترف لإدارة الفعاليات والحفلات", basePrice: 1500, durationMinutes: 180, offeringType: "service", serviceType: "appointment", sortOrder: 1 },
      { categoryName: "فعاليات ترفيهية", name: "فرقة موسيقية", nameEn: "Music Band", description: "فرقة موسيقية لحفلات الزفاف والمناسبات", basePrice: 5000, durationMinutes: 180, offeringType: "service", serviceType: "appointment", sortOrder: 2 },
      { categoryName: "أطفال", name: "مدينة ألعاب متنقلة", nameEn: "Mobile Kids Zone", description: "منطقة ألعاب متنقلة للأطفال في الفعاليات", basePrice: 2000, durationMinutes: 240, offeringType: "rental", serviceType: "event_rental", sortOrder: 3 },
      { categoryName: "أطفال", name: "عروض مسرح عرائس", nameEn: "Puppet Show", description: "عروض مسرح عرائس ترفيهية للأطفال", basePrice: 1200, durationMinutes: 60, offeringType: "service", serviceType: "appointment", sortOrder: 4 },
    ],
  },

  // ─── عيادة وصحة ──────────────────────────────────────────────────────────
  {
    businessType: "clinic",
    label: "عيادة",
    items: [
      { categoryName: "استشارات", name: "استشارة طبية", nameEn: "Medical Consultation", description: "موعد استشارة طبية مع طبيب متخصص", basePrice: 200, durationMinutes: 30, offeringType: "service", serviceType: "appointment", sortOrder: 1 },
      { categoryName: "استشارات", name: "استشارة متابعة", nameEn: "Follow-up Consultation", description: "موعد متابعة للحالات السابقة", basePrice: 120, durationMinutes: 20, offeringType: "service", serviceType: "appointment", sortOrder: 2 },
      { categoryName: "إجراءات", name: "تحاليل مختبرية", nameEn: "Lab Tests", description: "طلب تحاليل مختبرية مع تقرير", basePrice: 150, durationMinutes: 15, offeringType: "service", serviceType: "appointment", sortOrder: 3 },
      { categoryName: "إجراءات", name: "أشعة عادية", nameEn: "X-Ray", description: "أشعة سينية مع تقرير فوري", basePrice: 250, durationMinutes: 20, offeringType: "service", serviceType: "appointment", sortOrder: 4 },
    ],
  },
];

/** البحث عن قالب بنوع المنشأة */
export function getTemplateByBusinessType(businessType: string): ServiceTemplate | undefined {
  return SERVICE_TEMPLATES.find(t => t.businessType === businessType);
}

/** قائمة بجميع أنواع المنشآت المتاحة */
export function getAvailableBusinessTypes(): Array<{ businessType: string; label: string; count: number }> {
  return SERVICE_TEMPLATES.map(t => ({
    businessType: t.businessType,
    label: t.label,
    count: t.items.length,
  }));
}
