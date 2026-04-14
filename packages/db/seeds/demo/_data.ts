/**
 * Business configuration data for all 33 demo org types.
 * Each entry defines a realistic Saudi business with full catalog.
 */

import type { OrgConfig } from "./_shared";

export const ALL_ORGS: OrgConfig[] = [

  // ═══════════════════════════════════════════════════════
  // 1. RESTAURANT — مطعم الديوانية
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-restaurant",
    name: "مطعم الديوانية",
    businessType: "restaurant",
    city: "الرياض",
    phone: "+966500000101",
    email: "demo-restaurant@tarmizos.sa",
    ownerName: "محمد سالم العتيبي",
    tagline: "أصيل الطعم السعودي",
    description: "مطعم سعودي أصيل يقدم أشهى المأكولات الخليجية والمشويات في أجواء عائلية دافئة.",
    vatNumber: "310012345600003",
    crNumber: "1010234567",
    enabledCapabilities: ["bookings","customers","catalog","media","pos","accounting","website","schedules"],
    hasPos: true,
    categories: ["مقبلات","الأطباق الرئيسية","المشويات","المشروبات","الحلويات"],
    services: [
      { category: "الأطباق الرئيسية", name: "حجز طاولة عائلية (6 أشخاص)", price: 0, duration: 90 },
      { category: "الأطباق الرئيسية", name: "حجز قاعة خاصة VIP", price: 800, duration: 240 },
      { category: "الأطباق الرئيسية", name: "باقة عشاء رجال الأعمال", price: 380, duration: 120 },
      { category: "المشروبات", name: "باقة مشروبات (للطاولة)", price: 120, duration: 30 },
      { category: "الحلويات", name: "حلويات محلية متنوعة", price: 85, duration: 15 },
      { category: "المشويات", name: "مشاوي ملكية للعائلة", price: 650, duration: 90 },
      { category: "مقبلات", name: "سلطة ومقبلات للطاولة", price: 95, duration: 15 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 2. CAFE — كافيه بلو
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-cafe",
    name: "كافيه بلو",
    businessType: "cafe",
    city: "جدة",
    phone: "+966500000102",
    email: "demo-cafe@tarmizos.sa",
    ownerName: "سارة عبدالله الزهراني",
    tagline: "تجربة قهوة استثنائية",
    description: "كافيه متخصص في القهوة المختصة والمشروبات الباردة، بيئة إبداعية للعمل والاسترخاء.",
    enabledCapabilities: ["bookings","customers","catalog","media","pos","accounting","website","schedules"],
    hasPos: true,
    categories: ["القهوة الساخنة","المشروبات الباردة","الإفطار","الكيك والمعجنات"],
    services: [
      { category: "القهوة الساخنة", name: "حجز ركن خاص (ساعتان)", price: 150, duration: 120 },
      { category: "القهوة الساخنة", name: "باقة قهوة مختصة للاجتماع", price: 200, duration: 180 },
      { category: "المشروبات الباردة", name: "موهيتو فاكهة طازجة", price: 35, duration: 10 },
      { category: "الإفطار", name: "وجبة إفطار كاملة", price: 75, duration: 30 },
      { category: "الكيك والمعجنات", name: "كيكة مخصصة للمناسبات", price: 280, duration: 30 },
      { category: "القهوة الساخنة", name: "قهوة فلتر مختصة", price: 28, duration: 10 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 3. BAKERY — مخبز الفرح
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-bakery",
    name: "مخبز الفرح",
    businessType: "bakery",
    city: "الرياض",
    phone: "+966500000103",
    email: "demo-bakery@tarmizos.sa",
    ownerName: "هند إبراهيم الشهراني",
    tagline: "حلاوة كل يوم",
    description: "مخبز يومي متخصص في المعجنات الطازجة والكيك المخصص للمناسبات وحفلات الأطفال.",
    enabledCapabilities: ["bookings","customers","catalog","media","pos","accounting","website","schedules"],
    hasPos: true,
    categories: ["خبز طازج","كيك ومعجنات","حلويات شرقية","طلبات خاصة"],
    services: [
      { category: "كيك ومعجنات", name: "كيك عيد ميلاد مخصص (6 أشخاص)", price: 180, duration: 30 },
      { category: "كيك ومعجنات", name: "كيك زفاف طبقتين", price: 650, duration: 60 },
      { category: "خبز طازج", name: "خبز تميس يومي (12 رغيف)", price: 45, duration: 15 },
      { category: "حلويات شرقية", name: "تشكيلة بقلاوة (صحن 500 غرام)", price: 95, duration: 20 },
      { category: "طلبات خاصة", name: "صحن تمر مجدول فاخر مع لوز", price: 120, duration: 15 },
      { category: "كيك ومعجنات", name: "كوكيز شوكولاتة (دزينة)", price: 60, duration: 15 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 4. CATERING — ضيافة الوفاء
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-catering",
    name: "ضيافة الوفاء",
    businessType: "catering",
    city: "الرياض",
    phone: "+966500000104",
    email: "demo-catering@tarmizos.sa",
    ownerName: "فيصل حمد الحربي",
    tagline: "طعامك على أعلى مستوى",
    description: "شركة ضيافة وكيترينج للمناسبات الكبرى والشركات والحفلات الخاصة.",
    enabledCapabilities: ["bookings","customers","catalog","media","inventory","contracts","accounting","website"],
    hasPos: false,
    categories: ["ضيافة عربية","بوفيه مفتوح","ضيافة شركات","طلبات خاصة"],
    services: [
      { category: "بوفيه مفتوح", name: "بوفيه مفتوح (50 شخص)", price: 4500, duration: 180 },
      { category: "بوفيه مفتوح", name: "بوفيه مفتوح (100 شخص)", price: 8500, duration: 240 },
      { category: "ضيافة عربية", name: "مجلس ضيافة سعودي (30 شخص)", price: 2500, duration: 120 },
      { category: "ضيافة شركات", name: "غداء شركاتي (20 شخص)", price: 1800, duration: 90 },
      { category: "طلبات خاصة", name: "تجهيز حفل عشاء رسمي", price: 6000, duration: 240 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 5. SALON — صالون لمسة
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-salon",
    name: "صالون لمسة",
    businessType: "salon",
    city: "الرياض",
    phone: "+966500000105",
    email: "demo-salon@tarmizos.sa",
    ownerName: "نورة سعد الشمري",
    tagline: "جمالك يبدأ هنا",
    description: "صالون تجميل نسائي متكامل للشعر والميك أب والعناية بالبشرة والأظافر.",
    enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","pos","accounting","website"],
    hasPos: true,
    categories: ["العناية بالشعر","الميك أب","الأظافر","العناية بالبشرة","العروس"],
    services: [
      { category: "العناية بالشعر", name: "قصة شعر + سشوار", price: 120, duration: 60 },
      { category: "العناية بالشعر", name: "صبغة شعر كاملة", price: 380, duration: 150 },
      { category: "العناية بالشعر", name: "كيراتين + علاج البروتين", price: 550, duration: 180 },
      { category: "الميك أب", name: "ميك أب سهرة", price: 280, duration: 90 },
      { category: "الميك أب", name: "ميك أب عروس كامل", price: 950, duration: 180 },
      { category: "الأظافر", name: "مانيكير + باديكير جيل", price: 180, duration: 75 },
      { category: "العناية بالبشرة", name: "جلسة تنظيف بشرة عميق", price: 250, duration: 90 },
      { category: "العروس", name: "باقة العروس الكاملة (يومين)", price: 2200, duration: 480 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 6. BARBER — صالون الفارس
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-barber",
    name: "صالون الفارس للحلاقة",
    businessType: "barber",
    city: "الدمام",
    phone: "+966500000106",
    email: "demo-barber@tarmizos.sa",
    ownerName: "خالد محمد الدوسري",
    tagline: "لأناقة الرجل العصري",
    description: "صالون حلاقة رجالي متخصص بأحدث الأساليب والتقنيات العصرية، مع خدمة العناية باللحية.",
    enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","pos","accounting","website"],
    hasPos: true,
    categories: ["الحلاقة","العناية باللحية","الصبغة والعلاجات"],
    services: [
      { category: "الحلاقة", name: "حلاقة شعر كلاسيكية", price: 40, duration: 30 },
      { category: "الحلاقة", name: "حلاقة + تشكيل لحية", price: 75, duration: 45 },
      { category: "الحلاقة", name: "حلاقة فيد + تدرج", price: 60, duration: 45 },
      { category: "العناية باللحية", name: "حلاقة لحية + حواجب", price: 55, duration: 30 },
      { category: "العناية باللحية", name: "كريم ترطيب لحية", price: 35, duration: 15 },
      { category: "الصبغة والعلاجات", name: "صبغة شعر رجالي", price: 130, duration: 60 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 7. SPA — سبا أندالسيا
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-spa",
    name: "سبا أندالسيا الفاخر",
    businessType: "spa",
    city: "الرياض",
    phone: "+966500000107",
    email: "demo-spa@tarmizos.sa",
    ownerName: "منى حمد البقمي",
    tagline: "استرخِ وجدّد طاقتك",
    description: "مركز سبا فاخر متخصص في العلاجات التقليدية والحديثة، الحمام المغربي، والمساج العلاجي.",
    enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","pos","accounting","website"],
    hasPos: true,
    categories: ["المساج","العلاجات المائية","الحمام المغربي","الباقات الفاخرة"],
    services: [
      { category: "المساج", name: "مساج استرخاء (60 دقيقة)", price: 320, duration: 60 },
      { category: "المساج", name: "مساج عميق للعضلات (90 دقيقة)", price: 420, duration: 90 },
      { category: "المساج", name: "مساج حجارة ساخنة", price: 480, duration: 90 },
      { category: "الحمام المغربي", name: "حمام مغربي كامل", price: 380, duration: 90 },
      { category: "العلاجات المائية", name: "جلسة جاكوزي خاصة", price: 200, duration: 60 },
      { category: "الباقات الفاخرة", name: "باقة العروس الكاملة", price: 1400, duration: 300 },
      { category: "الباقات الفاخرة", name: "باقة الزوجين الرومانسية", price: 950, duration: 180 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 8. FITNESS — نادي القوة
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-fitness",
    name: "نادي القوة للياقة",
    businessType: "fitness",
    city: "جدة",
    phone: "+966500000108",
    email: "demo-fitness@tarmizos.sa",
    ownerName: "عبدالعزيز ناصر الجهني",
    tagline: "جسم قوي عقل صافي",
    description: "مركز لياقة بدنية متكامل يقدم تدريبات شخصية، دروس جماعية، وإدارة اشتراكات أعضاء.",
    enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","pos","accounting","website"],
    hasPos: true,
    categories: ["اشتراكات","تدريب شخصي","دروس جماعية","خدمات إضافية"],
    services: [
      { category: "اشتراكات", name: "اشتراك شهري (رجال)", price: 280, duration: 43200 },
      { category: "اشتراكات", name: "اشتراك 3 أشهر", price: 700, duration: 129600 },
      { category: "اشتراكات", name: "اشتراك سنوي VIP", price: 2500, duration: 525600 },
      { category: "تدريب شخصي", name: "جلسة تدريب شخصي (60 دقيقة)", price: 180, duration: 60 },
      { category: "تدريب شخصي", name: "باقة 12 جلسة تدريب", price: 1800, duration: 720 },
      { category: "دروس جماعية", name: "حصة كروسفيت", price: 80, duration: 60 },
      { category: "دروس جماعية", name: "حصة يوغا", price: 70, duration: 60 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 9. FLOWER SHOP — زهور الرياض
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-flower-shop",
    name: "زهور الرياض الفاخرة",
    businessType: "flower_shop",
    city: "الرياض",
    phone: "+966500000109",
    email: "demo-flowers@tarmizos.sa",
    ownerName: "ريم علي العنزي",
    tagline: "كل مناسبة بحلة أجمل",
    description: "متجر ورود ونباتات متخصص في التنسيقات الاحتفالية وتجهيز أعراس وهدايا فاخرة.",
    enabledCapabilities: ["bookings","customers","catalog","media","inventory","floral","pos","accounting","website"],
    hasPos: true,
    categories: ["باقات الورود","تنسيقات الأعراس","الهدايا والصناديق","النباتات الطبيعية"],
    services: [
      { category: "باقات الورود", name: "باقة ورد صغيرة احتفالية", price: 150, minPrice: 100, duration: 30 },
      { category: "باقات الورود", name: "باقة ورد كبيرة متميزة", price: 380, minPrice: 280, duration: 30 },
      { category: "باقات الورود", name: "صندوق ورد دائم فاخر", price: 550, minPrice: 400, duration: 30 },
      { category: "تنسيقات الأعراس", name: "تنسيق زفاف كامل (كوش + طاولات)", price: 4500, minPrice: 3000, duration: 480 },
      { category: "تنسيقات الأعراس", name: "بوكيه عروس", price: 350, minPrice: 250, duration: 60 },
      { category: "الهدايا والصناديق", name: "صندوق هدايا فاخر مع ورود", price: 480, duration: 30 },
      { category: "النباتات الطبيعية", name: "نبات داخلي مع وعاء مميز", price: 220, duration: 15 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 10. EVENTS — الذهبية للفعاليات
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-events",
    name: "الذهبية لتنظيم الفعاليات",
    businessType: "events",
    city: "جدة",
    phone: "+966500000110",
    email: "demo-events@tarmizos.sa",
    ownerName: "عبدالله محمد القرشي",
    tagline: "نصنع لحظاتك الاستثنائية",
    description: "شركة تنظيم فعاليات وأعراس واحتفالات متكاملة بأعلى معايير الجودة.",
    enabledCapabilities: ["bookings","customers","catalog","media","inventory","contracts","attendance","accounting","website"],
    hasPos: false,
    categories: ["الأعراس","حفلات الأطفال","الفعاليات الشركاتية","حفلات التخرج"],
    services: [
      { category: "الأعراس", name: "حفل زفاف كامل (300 شخص)", price: 28000, duration: 720 },
      { category: "الأعراس", name: "حفل خطوبة (100 شخص)", price: 9500, duration: 360 },
      { category: "حفلات الأطفال", name: "حفل ميلاد أطفال (50 شخص)", price: 3800, duration: 240 },
      { category: "الفعاليات الشركاتية", name: "مؤتمر شركاتي (200 شخص)", price: 18000, duration: 480 },
      { category: "حفلات التخرج", name: "حفل تخرج مدرسي", price: 16000, duration: 480 },
      { category: "الأعراس", name: "زفاف تراثي سعودي (150 شخص)", price: 22000, duration: 600 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 11. EVENT ORGANIZER — بيت الأفراح
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-event-organizer",
    name: "بيت الأفراح للتخطيط",
    businessType: "event_organizer",
    city: "الرياض",
    phone: "+966500000111",
    email: "demo-eventorg@tarmizos.sa",
    ownerName: "لمى حسن المنصور",
    tagline: "نخطط لتعيش اللحظة",
    description: "شركة تخطيط أفراح وفعاليات خاصة مع تنسيق كامل مع الموردين والمقاولين.",
    enabledCapabilities: ["bookings","customers","catalog","media","contracts","inventory","accounting","website"],
    hasPos: false,
    categories: ["تخطيط الأعراس","تنسيق الفعاليات","الاستشارات","الباقات المتكاملة"],
    services: [
      { category: "تخطيط الأعراس", name: "تخطيط زفاف كامل Day-Of", price: 12000, duration: 600 },
      { category: "تخطيط الأعراس", name: "استشارة تخطيط زفاف (شهر)", price: 3500, duration: 180 },
      { category: "تنسيق الفعاليات", name: "تنسيق حفل تخرج", price: 6000, duration: 480 },
      { category: "الاستشارات", name: "جلسة استشارية لتخطيط الزفاف", price: 500, duration: 90 },
      { category: "الباقات المتكاملة", name: "باقة Full Planning (3 أشهر)", price: 25000, duration: 2160 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 12. EVENTS VENDOR — مستلزمات الأفراح
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-events-vendor",
    name: "مستلزمات الأفراح للتأجير",
    businessType: "events_vendor",
    city: "الدمام",
    phone: "+966500000112",
    email: "demo-vendor@tarmizos.sa",
    ownerName: "ماجد سعد الغامدي",
    tagline: "كل شيء لحفلتك",
    description: "شركة تأجير مستلزمات الأفراح من كراسي وطاولات وديكور وإضاءة للمناسبات.",
    enabledCapabilities: ["bookings","customers","catalog","media","assets","contracts","inventory","accounting"],
    hasPos: false,
    categories: ["أثاث الأفراح","الديكور والإضاءة","المعدات","الخيام والقاعات"],
    services: [
      { category: "أثاث الأفراح", name: "كراسي كيان (100 كرسي/يوم)", price: 300, duration: 1440 },
      { category: "أثاث الأفراح", name: "طاولات مستديرة (10 طاولات/يوم)", price: 250, duration: 1440 },
      { category: "الديكور والإضاءة", name: "باقة إضاءة LED كاملة", price: 1800, duration: 1440 },
      { category: "الخيام والقاعات", name: "خيمة نجدية كاملة (200 شخص)", price: 8000, duration: 2880 },
      { category: "المعدات", name: "مولد كهرباء (يومي)", price: 600, duration: 1440 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 13. PHOTOGRAPHY — عدسة الذكريات
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-photography",
    name: "عدسة الذكريات للتصوير",
    businessType: "photography",
    city: "الرياض",
    phone: "+966500000113",
    email: "demo-photo@tarmizos.sa",
    ownerName: "يوسف أحمد السبيعي",
    tagline: "نلتقط لحظاتك الأجمل",
    description: "استوديو تصوير احترافي للأفراح والمناسبات والبورتريه والتصوير التجاري.",
    enabledCapabilities: ["bookings","customers","catalog","media","contracts","accounting","website"],
    hasPos: false,
    categories: ["تصوير الأفراح","البورتريه","التصوير التجاري","الدروس والورش"],
    services: [
      { category: "تصوير الأفراح", name: "تصوير زفاف كامل (يوم)", price: 5500, duration: 720 },
      { category: "تصوير الأفراح", name: "تصوير حفل خطوبة (3 ساعات)", price: 1800, duration: 180 },
      { category: "البورتريه", name: "جلسة بورتريه عائلية", price: 850, duration: 120 },
      { category: "البورتريه", name: "جلسة بورتريه تجاري", price: 650, duration: 90 },
      { category: "التصوير التجاري", name: "تصوير منتجات (10 منتجات)", price: 1200, duration: 180 },
      { category: "الدروس والورش", name: "ورشة تصوير مبتدئين (يوم)", price: 450, duration: 360 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 14. HOTEL — فندق النخبة
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-hotel",
    name: "فندق النخبة",
    businessType: "hotel",
    city: "الرياض",
    phone: "+966500000114",
    email: "demo-hotel@tarmizos.sa",
    ownerName: "وليد ناصر الفهد",
    tagline: "إقامة لا تُنسى",
    description: "فندق 4 نجوم بموقع متميز في قلب الرياض يقدم خدمات راقية للأفراد ورجال الأعمال.",
    enabledCapabilities: ["bookings","customers","catalog","media","inventory","accounting","website","hotel"],
    hasPos: false,
    categories: ["الغرف والأجنحة","خدمات الفندق","قاعات الاجتماعات"],
    services: [
      { category: "الغرف والأجنحة", name: "غرفة ديلوكس (ليلة)", price: 650, duration: 1440 },
      { category: "الغرف والأجنحة", name: "جناح تنفيذي (ليلة)", price: 1200, duration: 1440 },
      { category: "الغرف والأجنحة", name: "جناح ملكي (ليلة)", price: 2500, duration: 1440 },
      { category: "خدمات الفندق", name: "خدمة الغرف (طلب وجبة)", price: 120, duration: 30 },
      { category: "قاعات الاجتماعات", name: "قاعة اجتماعات صغيرة (4 ساعات)", price: 800, duration: 240 },
      { category: "قاعات الاجتماعات", name: "قاعة مؤتمرات كبيرة (يوم)", price: 3500, duration: 480 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 15. CAR RENTAL — سهل لتأجير السيارات
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-car-rental",
    name: "سهل لتأجير السيارات",
    businessType: "car_rental",
    city: "الرياض",
    phone: "+966500000115",
    email: "demo-carrent@tarmizos.sa",
    ownerName: "حمد عبدالله البلوي",
    tagline: "سفرك بحرية وأمان",
    description: "شركة تأجير سيارات متنوعة الفئات للأفراد والشركات بأسعار تنافسية.",
    enabledCapabilities: ["bookings","customers","catalog","media","assets","contracts","accounting","car_rental"],
    hasPos: false,
    categories: ["اقتصادية","عائلية","SUV","فاخرة"],
    services: [
      { category: "اقتصادية", name: "تأجير سيارة اقتصادية (يومي)", price: 120, duration: 1440 },
      { category: "عائلية", name: "تأجير سيارة عائلية 7 مقاعد (يومي)", price: 220, duration: 1440 },
      { category: "SUV", name: "تأجير SUV 4×4 (يومي)", price: 380, duration: 1440 },
      { category: "فاخرة", name: "تأجير سيارة فاخرة (يومي)", price: 750, duration: 1440 },
      { category: "اقتصادية", name: "تأجير أسبوعي (اقتصادية)", price: 700, duration: 10080 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 16. RENTAL — مؤجرون للمعدات
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-rental",
    name: "مؤجرون — تأجير المعدات",
    businessType: "rental",
    city: "الرياض",
    phone: "+966500000116",
    email: "demo-rental@tarmizos.sa",
    ownerName: "فيصل خالد الحربي",
    tagline: "أجّر بكل سهولة وثقة",
    description: "شركة تأجير معدات وأدوات للأفراد والمقاولين والفعاليات.",
    enabledCapabilities: ["bookings","customers","catalog","media","assets","inventory","contracts","accounting"],
    hasPos: false,
    categories: ["معدات البناء","معدات الحفلات","كاميرات وتصوير","كهربائيات"],
    services: [
      { category: "معدات الحفلات", name: "طاولات تأجير (10 طاولات/يوم)", price: 200, duration: 1440 },
      { category: "معدات الحفلات", name: "كراسي (100 كرسي/يوم)", price: 180, duration: 1440 },
      { category: "معدات البناء", name: "مولد كهربائي (يومي)", price: 550, duration: 1440 },
      { category: "كاميرات وتصوير", name: "كاميرا احترافية DSLR (يومي)", price: 400, duration: 1440 },
      { category: "كهربائيات", name: "شاشة عرض بروجيكتر (يومي)", price: 280, duration: 1440 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 17. RETAIL — متجر بلو للأزياء
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-retail",
    name: "متجر بلو للأزياء",
    businessType: "retail",
    city: "جدة",
    phone: "+966500000117",
    email: "demo-retail@tarmizos.sa",
    ownerName: "شهد ناصر الزهراني",
    tagline: "أناقتك وجهتنا",
    description: "متجر أزياء راقٍ يقدم أحدث الموضات العربية والعالمية للمرأة والرجل.",
    enabledCapabilities: ["bookings","customers","catalog","media","inventory","pos","accounting","website"],
    hasPos: true,
    categories: ["ملابس نسائية","ملابس رجالية","عبايات","اكسسوارات"],
    services: [
      { category: "ملابس نسائية", name: "فستان سهرة فاخر", price: 850, duration: 30 },
      { category: "ملابس نسائية", name: "تنسيق يومي كامل", price: 380, duration: 20 },
      { category: "عبايات", name: "عباية مطرزة يدوياً", price: 1200, duration: 20 },
      { category: "ملابس رجالية", name: "بدلة كلاسيكية رسمية", price: 1800, duration: 30 },
      { category: "اكسسوارات", name: "حقيبة يد فاخرة", price: 650, duration: 15 },
      { category: "اكسسوارات", name: "حزام جلد أصلي", price: 280, duration: 10 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 18. STORE — متجر التقنية
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-store",
    name: "متجر التقنية الذكية",
    businessType: "store",
    city: "الرياض",
    phone: "+966500000118",
    email: "demo-store@tarmizos.sa",
    ownerName: "أحمد بكر الرشيد",
    tagline: "تقنية بمتناول يدك",
    description: "متجر متخصص في بيع الأجهزة الإلكترونية والإكسسوارات والحلول التقنية.",
    enabledCapabilities: ["bookings","customers","catalog","media","inventory","pos","accounting","website"],
    hasPos: true,
    categories: ["هواتف وأجهزة","لابتوب وكمبيوتر","إكسسوارات","صيانة"],
    services: [
      { category: "هواتف وأجهزة", name: "iPhone 15 Pro Max 256GB", price: 5200, duration: 20 },
      { category: "هواتف وأجهزة", name: "Samsung Galaxy S25 Ultra", price: 4800, duration: 20 },
      { category: "لابتوب وكمبيوتر", name: "MacBook Air M3", price: 4500, duration: 30 },
      { category: "إكسسوارات", name: "AirPods Pro الجيل الثالث", price: 1100, duration: 10 },
      { category: "إكسسوارات", name: "كفر حماية + شاشة زجاجية", price: 95, duration: 10 },
      { category: "صيانة", name: "تغيير شاشة هاتف", price: 350, duration: 60 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 19. PRINTING — مطبعة الإبداع
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-printing",
    name: "مطبعة الإبداع",
    businessType: "printing",
    city: "الرياض",
    phone: "+966500000119",
    email: "demo-print@tarmizos.sa",
    ownerName: "غازي عمر الشمراني",
    tagline: "نطبع أفكارك بدقة",
    description: "مطبعة متكاملة لتصميم وطباعة المواد التسويقية والإعلانية والتجارية.",
    enabledCapabilities: ["bookings","customers","catalog","media","pos","accounting","website"],
    hasPos: true,
    categories: ["طباعة رقمية","طباعة أوفست","بطاقات ولافتات","هدايا مطبوعة"],
    services: [
      { category: "بطاقات ولافتات", name: "بطاقات بيانات (1000 بطاقة)", price: 180, duration: 1440 },
      { category: "بطاقات ولافتات", name: "لافتة خارجية 3×2 متر", price: 450, duration: 2880 },
      { category: "طباعة رقمية", name: "طباعة بروشور A4 (500 نسخة)", price: 320, duration: 1440 },
      { category: "طباعة رقمية", name: "طباعة فلكس أو بنر", price: 95, duration: 480 },
      { category: "هدايا مطبوعة", name: "أكواب مطبوعة (12 كوب)", price: 120, duration: 2880 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 20. DIGITAL SERVICES — نبض للتسويق الرقمي
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-digital-services",
    name: "نبض للتسويق الرقمي",
    businessType: "digital_services",
    city: "الرياض",
    phone: "+966500000120",
    email: "demo-digital@tarmizos.sa",
    ownerName: "ريم فهد الحمدان",
    tagline: "نبضة جديدة لعلامتك",
    description: "وكالة تسويق رقمي متخصصة في إدارة السوشيال ميديا والإعلانات الرقمية وبناء المواقع.",
    enabledCapabilities: ["bookings","customers","catalog","media","contracts","accounting","website"],
    hasPos: false,
    categories: ["إدارة سوشيال ميديا","إعلانات مدفوعة","تصميم وبناء","استشارات"],
    services: [
      { category: "إدارة سوشيال ميديا", name: "إدارة حسابات (شهرياً - 3 منصات)", price: 2800, duration: 43200 },
      { category: "إعلانات مدفوعة", name: "حملة إعلانية غوغل (شهر)", price: 3500, duration: 43200 },
      { category: "تصميم وبناء", name: "تصميم هوية بصرية كاملة", price: 4500, duration: 10080 },
      { category: "تصميم وبناء", name: "بناء موقع ووردبريس احترافي", price: 7500, duration: 20160 },
      { category: "استشارات", name: "جلسة استشارية تسويقية", price: 600, duration: 90 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 21. MARKETING — وكالة الوصول
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-marketing",
    name: "وكالة الوصول للتسويق",
    businessType: "marketing",
    city: "جدة",
    phone: "+966500000121",
    email: "demo-marketing@tarmizos.sa",
    ownerName: "تركي مساعد الشريف",
    tagline: "نوصلك لجمهورك",
    description: "وكالة تسويق متكاملة تخدم المشاريع الصغيرة والمتوسطة في المملكة.",
    enabledCapabilities: ["bookings","customers","catalog","media","contracts","accounting","website"],
    hasPos: false,
    categories: ["تسويق رقمي","علاقات عامة","محتوى","تصوير إعلاني"],
    services: [
      { category: "تسويق رقمي", name: "خطة تسويقية شاملة", price: 8000, duration: 20160 },
      { category: "محتوى", name: "كتابة محتوى شهري (20 منشور)", price: 1800, duration: 43200 },
      { category: "علاقات عامة", name: "خدمات PR شهرية", price: 5500, duration: 43200 },
      { category: "تصوير إعلاني", name: "فيديو إعلاني قصير", price: 3500, duration: 2880 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 22. AGENCY — وتر للإبداع
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-agency",
    name: "وتر للإبداع والتصميم",
    businessType: "agency",
    city: "الرياض",
    phone: "+966500000122",
    email: "demo-agency@tarmizos.sa",
    ownerName: "بدر عبدالله المقبل",
    tagline: "نصمم فارقاً حقيقياً",
    description: "وكالة إبداعية متكاملة للتصميم والإنتاج الإعلاني والهوية البصرية.",
    enabledCapabilities: ["bookings","customers","catalog","media","contracts","accounting","website"],
    hasPos: false,
    categories: ["تصميم غرافيك","إنتاج فيديو","هوية بصرية","UI/UX"],
    services: [
      { category: "هوية بصرية", name: "هوية بصرية كاملة (لوغو + دليل)", price: 5500, duration: 20160 },
      { category: "إنتاج فيديو", name: "موشن غرافيك 60 ثانية", price: 2800, duration: 7200 },
      { category: "تصميم غرافيك", name: "تصميم مواد مطبوعة كاملة", price: 1800, duration: 5760 },
      { category: "UI/UX", name: "تصميم واجهة تطبيق موبايل", price: 9500, duration: 20160 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 23. TECHNOLOGY — حلول التقنية
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-technology",
    name: "حلول التقنية المتقدمة",
    businessType: "technology",
    city: "الرياض",
    phone: "+966500000123",
    email: "demo-tech@tarmizos.sa",
    ownerName: "محمد هادي القحطاني",
    tagline: "حلول تقنية لمستقبل أفضل",
    description: "شركة برمجيات وحلول تقنية للشركات الصغيرة والمتوسطة في المملكة.",
    enabledCapabilities: ["bookings","customers","catalog","media","contracts","accounting","website"],
    hasPos: false,
    categories: ["تطوير برمجيات","استشارات تقنية","دعم وصيانة","تدريب"],
    services: [
      { category: "تطوير برمجيات", name: "تطوير تطبيق موبايل iOS+Android", price: 45000, duration: 86400 },
      { category: "تطوير برمجيات", name: "بناء منصة ويب متكاملة", price: 28000, duration: 86400 },
      { category: "استشارات تقنية", name: "جلسة استشارية تقنية (2 ساعة)", price: 1200, duration: 120 },
      { category: "دعم وصيانة", name: "دعم تقني شهري", price: 3500, duration: 43200 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 24. MAINTENANCE — صيانة الخليج
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-maintenance",
    name: "صيانة الخليج المنزلية",
    businessType: "maintenance",
    city: "الرياض",
    phone: "+966500000124",
    email: "demo-maint@tarmizos.sa",
    ownerName: "علي صالح العسيري",
    tagline: "بيتك بأيدٍ أمينة",
    description: "شركة خدمات صيانة منزلية شاملة: كهرباء، سباكة، تكييف، ودهانات.",
    enabledCapabilities: ["bookings","customers","catalog","media","attendance","schedules","accounting","website","workshop"],
    hasPos: false,
    categories: ["كهرباء وإضاءة","سباكة وصرف","تكييف وتبريد","دهانات وديكور"],
    services: [
      { category: "كهرباء وإضاءة", name: "تركيب لوحة كهربائية جديدة", price: 850, duration: 180 },
      { category: "كهرباء وإضاءة", name: "تركيب وإصلاح إضاءة (غرفة)", price: 280, duration: 90 },
      { category: "سباكة وصرف", name: "فحص وإصلاح تسرب مياه", price: 350, duration: 120 },
      { category: "تكييف وتبريد", name: "تنظيف وصيانة مكيف (وحدة)", price: 180, duration: 90 },
      { category: "تكييف وتبريد", name: "تركيب مكيف سبليت جديد", price: 650, duration: 180 },
      { category: "دهانات وديكور", name: "دهان غرفة (نقاء)", price: 550, duration: 480 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 25. WORKSHOP — ورشة الماس
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-workshop",
    name: "ورشة الماس للسيارات",
    businessType: "workshop",
    city: "الدمام",
    phone: "+966500000125",
    email: "demo-workshop@tarmizos.sa",
    ownerName: "سعد منصور العجمي",
    tagline: "سيارتك بأفضل حال",
    description: "ورشة سيارات متخصصة في الصيانة الدورية والإصلاحات وتعديلات الأداء.",
    enabledCapabilities: ["bookings","customers","catalog","media","attendance","pos","accounting","website","workshop"],
    hasPos: true,
    categories: ["صيانة دورية","إصلاح ميكانيكا","كهربائيات وإلكترونيات","هياكل ودهان"],
    services: [
      { category: "صيانة دورية", name: "فلتر زيت + تغيير زيت", price: 180, duration: 60 },
      { category: "صيانة دورية", name: "فحص شامل للسيارة (90 نقطة)", price: 250, duration: 90 },
      { category: "إصلاح ميكانيكا", name: "تغيير دسك وتيل الفرامل", price: 650, duration: 120 },
      { category: "كهربائيات وإلكترونيات", name: "فحص كمبيوتر السيارة", price: 150, duration: 60 },
      { category: "هياكل ودهان", name: "دهان باب سيارة (قطعة)", price: 1200, duration: 1440 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 26. REAL ESTATE — العقار الرائد
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-real-estate",
    name: "العقار الرائد للتأجير",
    businessType: "real_estate",
    city: "الرياض",
    phone: "+966500000126",
    email: "demo-realestate@tarmizos.sa",
    ownerName: "عمر ياسين النجدي",
    tagline: "استثمر وأسكن بثقة",
    description: "شركة عقارية متخصصة في تأجير الوحدات السكنية والتجارية وإدارة الأصول العقارية.",
    enabledCapabilities: ["bookings","customers","catalog","media","contracts","accounting","website"],
    hasPos: false,
    categories: ["سكني","تجاري","مستودعات","خدمات عقارية"],
    services: [
      { category: "سكني", name: "شقة 3 غرف (شهرياً)", price: 3500, duration: 43200 },
      { category: "سكني", name: "فيلا فاخرة (شهرياً)", price: 12000, duration: 43200 },
      { category: "تجاري", name: "مكتب تجاري (شهرياً)", price: 6000, duration: 43200 },
      { category: "مستودعات", name: "مستودع 200 متر (شهرياً)", price: 4500, duration: 43200 },
      { category: "خدمات عقارية", name: "استشارة شراء/بيع عقار", price: 800, duration: 90 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 27. LAUNDRY — مغسلة النقاء
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-laundry",
    name: "مغسلة النقاء الفندقية",
    businessType: "laundry",
    city: "جدة",
    phone: "+966500000127",
    email: "demo-laundry@tarmizos.sa",
    ownerName: "زياد عبدالرحمن المسعد",
    tagline: "نظافة تليق بك",
    description: "مغسلة متكاملة تقدم خدمات الغسيل والكوي والتنظيف الجاف مع توصيل مجاني.",
    enabledCapabilities: ["bookings","customers","catalog","media","pos","accounting","website"],
    hasPos: true,
    categories: ["غسيل وكوي","تنظيف جاف","تنظيف بالبخار","طلبات خاصة"],
    services: [
      { category: "غسيل وكوي", name: "غسيل وكوي قميص (الحبة)", price: 12, duration: 1440 },
      { category: "غسيل وكوي", name: "غسيل وكوي بنطلون", price: 15, duration: 1440 },
      { category: "غسيل وكوي", name: "باقة الثوب الرجالي", price: 25, duration: 1440 },
      { category: "تنظيف جاف", name: "تنظيف جاف بدلة كاملة", price: 85, duration: 2880 },
      { category: "تنظيف بالبخار", name: "تنظيف بالبخار كنب (3 مقاعد)", price: 280, duration: 120 },
      { category: "طلبات خاصة", name: "ستائر منزلية (الطقم)", price: 150, duration: 2880 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 28. SERVICES — أمانة للخدمات
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-services",
    name: "أمانة للخدمات المنزلية",
    businessType: "services",
    city: "الرياض",
    phone: "+966500000128",
    email: "demo-services@tarmizos.sa",
    ownerName: "دلال أحمد الصقر",
    tagline: "راحتك مسؤوليتنا",
    description: "منصة خدمات منزلية شاملة من تنظيف وطبخ وعناية بالأطفال وخدمات متنوعة.",
    enabledCapabilities: ["bookings","customers","catalog","media","accounting","website"],
    hasPos: false,
    categories: ["تنظيف منازل","طبخ وطعام","رعاية الأطفال","خدمات متنوعة"],
    services: [
      { category: "تنظيف منازل", name: "تنظيف شامل للشقة (3 غرف)", price: 350, duration: 240 },
      { category: "تنظيف منازل", name: "تنظيف أسبوعي (فيلا كاملة)", price: 600, duration: 360 },
      { category: "طبخ وطعام", name: "طبخة يومية للعائلة", price: 280, duration: 180 },
      { category: "رعاية الأطفال", name: "جليسة أطفال (4 ساعات)", price: 200, duration: 240 },
      { category: "خدمات متنوعة", name: "مساعد منزلي (يوم كامل)", price: 450, duration: 480 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 29. MEDICAL — عيادة الشفاء
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-medical",
    name: "عيادة الشفاء",
    businessType: "medical",
    city: "الرياض",
    phone: "+966500000129",
    email: "demo-medical@tarmizos.sa",
    ownerName: "الدكتور أحمد سالم الحمدان",
    tagline: "صحتك أمانة بين يدينا",
    description: "عيادة طبية متخصصة تقدم خدمات طبية عامة واستشارات متعددة التخصصات.",
    enabledCapabilities: ["bookings","customers","catalog","media","accounting","website"],
    hasPos: false,
    categories: ["طب عام","استشارات","إجراءات طبية","متابعة المرضى"],
    services: [
      { category: "طب عام", name: "كشف طبي عام", price: 150, duration: 30 },
      { category: "استشارات", name: "استشارة متخصصة (30 دقيقة)", price: 280, duration: 30 },
      { category: "إجراءات طبية", name: "جرح وخياطة طارئة", price: 350, duration: 45 },
      { category: "إجراءات طبية", name: "تحليل دم شامل", price: 185, duration: 30 },
      { category: "متابعة المرضى", name: "مراجعة نتائج التحاليل", price: 100, duration: 20 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 30. EDUCATION — معهد النجاح
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-education",
    name: "معهد النجاح للتدريب",
    businessType: "education",
    city: "الرياض",
    phone: "+966500000130",
    email: "demo-edu@tarmizos.sa",
    ownerName: "خلود عبدالله الخالدي",
    tagline: "نبني المستقبل بالعلم",
    description: "معهد تدريبي متخصص في التعليم المهني والدورات المعتمدة وتطوير الكفاءات.",
    enabledCapabilities: ["bookings","customers","catalog","media","accounting","website","schedules"],
    hasPos: false,
    categories: ["دورات مهنية","لغات","تقنية","ورش عمل"],
    services: [
      { category: "دورات مهنية", name: "دورة إدارة المشاريع PMP (أسبوعان)", price: 3500, duration: 20160 },
      { category: "لغات", name: "دورة لغة إنجليزية مكثفة (شهر)", price: 1800, duration: 43200 },
      { category: "تقنية", name: "دورة برمجة Python للمبتدئين", price: 2200, duration: 20160 },
      { category: "ورش عمل", name: "ورشة مهارات القيادة (يوم)", price: 850, duration: 480 },
      { category: "ورش عمل", name: "ورشة تصميم غرافيك", price: 1200, duration: 10080 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 31. CONSTRUCTION — بناء الأمل
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-construction",
    name: "بناء الأمل للمقاولات",
    businessType: "construction",
    city: "الرياض",
    phone: "+966500000131",
    email: "demo-const@tarmizos.sa",
    ownerName: "سلطان راشد الوادي",
    tagline: "نبني بإتقان وأمانة",
    description: "شركة مقاولات متكاملة لبناء الفلل والمنازل والمنشآت التجارية الصغيرة.",
    enabledCapabilities: ["bookings","customers","catalog","media","contracts","attendance","inventory","accounting"],
    hasPos: false,
    categories: ["بناء جديد","تشطيبات","ترميم وإضافات","خدمات هندسية"],
    services: [
      { category: "بناء جديد", name: "بناء فيلا (250 م²)", price: 500000, duration: 129600 },
      { category: "تشطيبات", name: "تشطيب شامل شقة (120 م²)", price: 85000, duration: 43200 },
      { category: "ترميم وإضافات", name: "ترميم وصيانة منزل (أسبوعان)", price: 18000, duration: 20160 },
      { category: "خدمات هندسية", name: "تصميم معماري لفيلا", price: 12000, duration: 20160 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 32. LOGISTICS — سرعة التوصيل
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-logistics",
    name: "سرعة للتوصيل والشحن",
    businessType: "logistics",
    city: "الرياض",
    phone: "+966500000132",
    email: "demo-logistics@tarmizos.sa",
    ownerName: "فهد ماجد المطيري",
    tagline: "أسرع وأوثق",
    description: "شركة شحن ولوجستيات متخصصة في التوصيل داخل المملكة وخدمات المستودعات.",
    enabledCapabilities: ["bookings","customers","catalog","media","attendance","inventory","accounting","website"],
    hasPos: false,
    categories: ["توصيل محلي","شحن دولي","تخزين","خدمات مناولة"],
    services: [
      { category: "توصيل محلي", name: "توصيل داخل المدينة (طرد صغير)", price: 35, duration: 240 },
      { category: "توصيل محلي", name: "توصيل بين المدن (طرد صغير)", price: 85, duration: 1440 },
      { category: "شحن دولي", name: "شحن جوي دولي (كيلو)", price: 95, duration: 4320 },
      { category: "تخزين", name: "تخزين شهري (متر مكعب)", price: 180, duration: 43200 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 33. SCHOOL — مدرسة المعرفة
  // ═══════════════════════════════════════════════════════
  {
    slug: "demo-school",
    name: "مدرسة المعرفة الأهلية",
    businessType: "school",
    city: "الرياض",
    phone: "+966500000133",
    email: "demo-school@tarmizos.sa",
    ownerName: "فاطمة عبدالرحمن المنصور",
    tagline: "ننمي العقول ونصنع الغد",
    description: "مدرسة أهلية متميزة تقدم التعليم العام مع التركيز على التعليم المهاري والقيمي.",
    enabledCapabilities: ["bookings","customers","catalog","media","schedules","attendance","accounting"],
    hasPos: false,
    categories: ["الرسوم الدراسية","الأنشطة","الخدمات الإضافية"],
    services: [
      { category: "الرسوم الدراسية", name: "رسوم الفصل الدراسي الأول", price: 6500, duration: 129600 },
      { category: "الرسوم الدراسية", name: "رسوم الفصل الدراسي الثاني", price: 6500, duration: 129600 },
      { category: "الأنشطة", name: "اشتراك أنشطة صيفية (الطالب)", price: 1200, duration: 43200 },
      { category: "الخدمات الإضافية", name: "حافلة مدرسية (فصل دراسي)", price: 2800, duration: 129600 },
      { category: "الخدمات الإضافية", name: "وجبات مدرسية (شهرياً)", price: 450, duration: 43200 },
    ],
  },

];
