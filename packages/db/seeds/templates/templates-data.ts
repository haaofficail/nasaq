// ============================================================
// بيانات القوالب — 10 قوالب عربية جاهزة
// ============================================================

export const TEMPLATES_DATA = [
  // ─────────────────────────────────────────────────────────
  // 1. مطعم الأصالة
  // ─────────────────────────────────────────────────────────
  {
    slug: "restaurant-homepage",
    nameAr: "مطعم الأصالة",
    descriptionAr: "قالب احترافي للمطاعم يعرض القائمة والمميزات وآراء العملاء مع نموذج حجز واضح",
    category: "restaurant",
    businessTypes: ["restaurant", "food"],
    previewImageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    tags: ["مطعم", "طعام", "قائمة", "حجز"],
    isFeatured: true,
    isPublished: true,
    sortOrder: 1,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "مطعم الأصالة",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "قائمتنا", url: "/menu" },
              { label: "من نحن", url: "/about" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "احجز طاولة",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "تجربة طعام لا تُنسى في قلب الرياض",
            subheading: "نقدم أشهى الأطباق العربية الأصيلة بمكونات طازجة يومياً، في أجواء راقية تجمع الأسرة على مائدة واحدة",
            primaryCtaText: "احجز طاولتك الآن",
            primaryCtaLink: "/booking",
            secondaryCtaText: "تصفح القائمة",
            secondaryCtaLink: "/menu",
            imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
            imageAlt: "أطباق مطعم الأصالة",
            imagePosition: "left",
            textAlignment: "right",
            mediaType: "image",
            accentStyle: "line",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "لماذا تختار مطعم الأصالة؟",
            subheading: "نؤمن بأن الطعام الجيد يجمع القلوب ويصنع الذكريات",
            items: [
              {
                icon: "Star",
                title: "مكونات طازجة",
                description: "نختار أجود المكونات الطازجة يومياً من مزارع محلية معتمدة لضمان أعلى جودة",
                link: "/about",
              },
              {
                icon: "Clock",
                title: "خدمة سريعة",
                description: "فريق متخصص يضمن تقديم طلبك في أقل من 20 دقيقة للطاولات الداخلية",
                link: "/menu",
              },
              {
                icon: "Heart",
                title: "طبخ بمحبة",
                description: "طهاة خبراء بخبرة تزيد عن 15 سنة في المطبخ العربي الأصيل",
                link: "/about",
              },
            ],
          },
        },
        {
          type: "ProductsFeatured",
          props: {
            heading: "أبرز أطباقنا",
            subheading: "اكتشف أشهر ما يميّز مطعمنا من أطباق يطلبها زوارنا دائماً",
            ctaLabel: "تصفح القائمة كاملة",
            ctaUrl: "/menu",
            items: [
              {
                imageUrl: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&q=80",
                name: "كبسة اللحم الملكي",
                description: "رز بسمتي مع لحم ضأن طازج متبل بأفضل البهارات العربية",
                price: "85",
                currency: "ر.س",
                badge: "الأكثر طلباً",
                ctaLabel: "اطلب الآن",
                ctaUrl: "/menu/kabsa",
              },
              {
                imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
                name: "مندي الدجاج",
                description: "دجاج مدخن بالفحم مع رز معطر بزعفران الهند",
                price: "65",
                currency: "ر.س",
                badge: "جديد",
                ctaLabel: "اطلب الآن",
                ctaUrl: "/menu/mandi",
              },
              {
                imageUrl: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&q=80",
                name: "سلطة فتوش الأصالة",
                description: "خضروات طازجة مع خبز محمص وصلصة الليمون والزيتون",
                price: "35",
                currency: "ر.س",
                badge: "",
                ctaLabel: "اطلب الآن",
                ctaUrl: "/menu/fattoush",
              },
            ],
          },
        },
        {
          type: "TestimonialsCards",
          props: {
            heading: "ماذا يقول زوارنا",
            subheading: "أكثر من 5000 عميل راضٍ — نفخر بثقتهم",
            items: [
              {
                quote: "أفضل كبسة جربتها في حياتي، الطعم والجودة ممتازان والخدمة راقية جداً",
                name: "محمد العتيبي",
                role: "زائر منتظم",
                avatarUrl: "",
                rating: 5,
              },
              {
                quote: "الأجواء رائعة ومناسبة للعائلات، الأطفال أحبوا وجباتهم والأسعار معقولة",
                name: "فاطمة الشمري",
                role: "زيارة عائلية",
                avatarUrl: "",
                rating: 5,
              },
              {
                quote: "احتجزت طاولة لاحتفال عيد ميلاد وكان كل شيء مثالياً، شكراً للفريق",
                name: "خالد الدوسري",
                role: "مناسبة خاصة",
                avatarUrl: "",
                rating: 5,
              },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "احجز طاولتك اليوم",
            subheading: "لا تفوّت تجربة الطعام المميزة — احجز مقعدك الآن وأمّن وقتك",
            ctaLabel: "احجز الآن",
            ctaUrl: "/booking",
            secondaryLabel: "تواصل معنا",
            secondaryUrl: "/contact",
            bgColor: "#5b9bd5",
            textColor: "#ffffff",
            alignment: "center",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "مطعم الأصالة",
            tagline: "طعام أصيل، ذكريات لا تُنسى",
            copyright: "2025 مطعم الأصالة. جميع الحقوق محفوظة.",
            links: [
              { label: "الرئيسية", url: "/" },
              { label: "القائمة", url: "/menu" },
              { label: "احجز طاولة", url: "/booking" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "instagram", url: "https://instagram.com" },
              { platform: "twitter", url: "https://twitter.com" },
            ],
          },
        },
      ],
      root: { props: { title: "مطعم الأصالة — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 2. مقهى الديوانية
  // ─────────────────────────────────────────────────────────
  {
    slug: "cafe-homepage",
    nameAr: "مقهى الديوانية",
    descriptionAr: "قالب أنيق للمقاهي يبرز الأجواء الدافئة وقائمة المشروبات مع نظام الطلب",
    category: "cafe",
    businessTypes: ["cafe", "coffee", "restaurant"],
    previewImageUrl: "https://images.unsplash.com/photo-1501339847302-ac2be43f4f7c?w=1200&q=80",
    tags: ["مقهى", "قهوة", "كافيه", "مشروبات"],
    isFeatured: true,
    isPublished: true,
    sortOrder: 2,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "مقهى الديوانية",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "قائمتنا", url: "/menu" },
              { label: "عروضنا", url: "/offers" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "اطلب الآن",
            ctaLink: "/order",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "حيث تبدأ يومك بفنجان قهوة مختلف",
            subheading: "نقدم أجود حبوب القهوة من إثيوبيا والبرازيل، محمّصة يدوياً لتمنحك تجربة استثنائية في كل كوب",
            ctaText: "اكتشف قائمتنا",
            ctaUrl: "/menu",
            secondaryCtaText: "اطلب توصيل",
            secondaryCtaUrl: "/delivery",
            badge: "قهوة مختصة",
            backgroundStyle: "dark",
            alignment: "center",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "تجربة القهوة الكاملة",
            subheading: "كل تفصيلة اخترناها لتكون زيارتك مميزة",
            items: [
              { icon: "Coffee", title: "حبوب مختارة", description: "نستورد حبوب القهوة الخضراء مباشرة من مزارع حول العالم", link: "/about" },
              { icon: "Flame", title: "تحميص طازج", description: "نحمّص حبوبنا أسبوعياً للحصول على نكهة في أوج طازجيتها", link: "/about" },
              { icon: "Droplet", title: "براعة الباريستا", description: "باريستا محترفون يضخون خبرتهم في كل كوب يقدمونه", link: "/team" },
              { icon: "Leaf", title: "بيئة مريحة", description: "مساحة هادئة تصلح للعمل والدراسة والاسترخاء", link: "/about" },
            ],
          },
        },
        {
          type: "GalleryGrid",
          props: {
            heading: "أجواء مقهانا",
            subheading: "استمتع بمساحة دافئة تجمعك مع أصدقائك",
            items: [
              { imageUrl: "https://images.unsplash.com/photo-1501339847302-ac2be43f4f7c?w=600&q=80", alt: "داخل المقهى", caption: "الجلسات الداخلية" },
              { imageUrl: "https://images.unsplash.com/photo-1554118811-4-cfc1a23?w=600&q=80", alt: "كوب قهوة", caption: "تحضير القهوة" },
              { imageUrl: "https://images.unsplash.com/photo-1501339847302-ac2be43f4f7c?w=600&q=80", alt: "تراس المقهى", caption: "الجلسات الخارجية" },
              { imageUrl: "https://images.unsplash.com/photo-1554118811-4-cfc1a23?w=600&q=80", alt: "مشروبات باردة", caption: "مشروباتنا الباردة" },
            ],
            layout: "grid-4",
            aspectRatio: "square",
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "أرقام نفخر بها",
            items: [
              { value: "٥٠٠+", label: "زبون يومي" },
              { value: "٢٥", label: "نوع قهوة" },
              { value: "٨", label: "سنوات خبرة" },
              { value: "٩.٧", label: "تقييم عملائنا" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "اشترك في برنامج الولاء",
            subheading: "كل كوب يقربك من كوب مجاني — سجّل الآن واحصل على أول قهوتك مجاناً",
            ctaLabel: "سجّل مجاناً",
            ctaUrl: "/loyalty",
            secondaryLabel: "",
            secondaryUrl: "",
            bgColor: "#3d2b1f",
            textColor: "#ffffff",
            alignment: "center",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "مقهى الديوانية",
            tagline: "قهوة مختصة — أجواء أصيلة",
            copyright: "2025 مقهى الديوانية. جميع الحقوق محفوظة.",
            links: [
              { label: "القائمة", url: "/menu" },
              { label: "الطلب", url: "/order" },
              { label: "التوصيل", url: "/delivery" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "instagram", url: "https://instagram.com" },
              { platform: "twitter", url: "https://twitter.com" },
            ],
          },
        },
      ],
      root: { props: { title: "مقهى الديوانية — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 3. صالون الجمال الراقي
  // ─────────────────────────────────────────────────────────
  {
    slug: "salon-homepage",
    nameAr: "صالون الجمال الراقي",
    descriptionAr: "قالب أنثوي راقي للصالونات والسبا يعرض الخدمات والأسعار مع نظام حجز مواعيد",
    category: "salon",
    businessTypes: ["salon", "beauty", "spa"],
    previewImageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c305?w=1200&q=80",
    tags: ["صالون", "جمال", "سبا", "تجميل"],
    isFeatured: true,
    isPublished: true,
    sortOrder: 3,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "صالون الجمال الراقي",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "فريقنا", url: "/team" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "احجزي موعدك",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroShowcase",
          props: {
            heading: "جمالك أولويتنا — تألقي بثقة",
            subheading: "خبيرات تجميل محترفات يقدمن لك أحدث الاتجاهات العالمية بأيدٍ سعودية بارعة",
            ctaText: "احجزي الآن",
            ctaUrl: "/booking",
            secondaryCtaText: "تصفحي خدماتنا",
            secondaryCtaUrl: "/services",
            images: [
              { url: "https://images.unsplash.com/photo-1560066984-138dadb4c305?w=800&q=80", alt: "خدمات الشعر" },
              { url: "https://images.unsplash.com/photo-1522337360788-8b13dec7ab3?w=800&q=80", alt: "العناية بالبشرة" },
            ],
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "خدماتنا المميزة",
            subheading: "تشكيلة متكاملة من خدمات التجميل بأيدي خبيرات متخصصات",
            items: [
              { icon: "Scissors", title: "تصفيف الشعر", description: "قص وتصفيف وصبغ وكيراتين بأحدث الأساليب وأجود المنتجات", link: "/services/hair" },
              { icon: "Sparkles", title: "العناية بالبشرة", description: "جلسات عناية متكاملة للبشرة بمنتجات فرنسية فاخرة", link: "/services/skincare" },
              { icon: "Heart", title: "مكياج احترافي", description: "مكياج للعرائس والمناسبات الخاصة والتصوير", link: "/services/makeup" },
            ],
          },
        },
        {
          type: "TestimonialsCards",
          props: {
            heading: "قالت عنا عميلاتنا",
            subheading: "آلاف العميلات وثقن بنا — نفخر بكل كلمة ثناء",
            items: [
              { quote: "خدمة ممتازة وفريق محترف، خرجت من الصالون وأنا أشعر بثقة عالية. سأعود حتماً", name: "ريم الحربي", role: "عميلة منتظمة", avatarUrl: "", rating: 5 },
              { quote: "مكياج العروس كان خيالياً، كل ضيوفي مدحوه طول الليلة. شكراً للفريق الرائع", name: "نورة القحطاني", role: "عروس سعيدة", avatarUrl: "", rating: 5 },
              { quote: "أفضل صالون جربته في الرياض، الاستقبال راقي والخدمة احترافية جداً", name: "منى الزهراني", role: "زيارة أولى", avatarUrl: "", rating: 5 },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "احجزي موعدك اليوم",
            subheading: "متاحون لخدمتك من السبت إلى الخميس من الساعة 9 صباحاً حتى 10 مساءً",
            ctaLabel: "احجزي الآن",
            ctaUrl: "/booking",
            secondaryLabel: "تواصلي معنا",
            secondaryUrl: "/contact",
            bgColor: "#c9a96e",
            textColor: "#ffffff",
            alignment: "center",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "صالون الجمال الراقي",
            tagline: "تألقي بجمالك الطبيعي",
            copyright: "2025 صالون الجمال الراقي. جميع الحقوق محفوظة.",
            links: [
              { label: "خدماتنا", url: "/services" },
              { label: "احجزي موعد", url: "/booking" },
              { label: "من نحن", url: "/about" },
              { label: "تواصلي معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "instagram", url: "https://instagram.com" },
              { platform: "twitter", url: "https://twitter.com" },
            ],
          },
        },
      ],
      root: { props: { title: "صالون الجمال الراقي — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 4. عيادة الرعاية الطبية
  // ─────────────────────────────────────────────────────────
  {
    slug: "clinic-homepage",
    nameAr: "عيادة الرعاية الطبية",
    descriptionAr: "قالب موثوق للعيادات والمراكز الطبية يعرض التخصصات والأطباء مع نظام حجز مواعيد",
    category: "clinic",
    businessTypes: ["clinic", "medical", "healthcare"],
    previewImageUrl: "https://images.unsplash.com/photo-1519494026892-8cf5c5b7debb?w=1200&q=80",
    tags: ["عيادة", "طب", "صحة", "أطباء"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 4,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "عيادة الرعاية الطبية",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "أطباؤنا", url: "/doctors" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "احجز موعداً",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "صحتك أمانة — رعايتنا على أعلى مستوى",
            subheading: "فريق من أمهر الأطباء والمختصين يقدم رعاية صحية شاملة بأحدث التقنيات الطبية في بيئة آمنة ومريحة",
            primaryCtaText: "احجز موعدك",
            primaryCtaLink: "/booking",
            secondaryCtaText: "تعرف على خدماتنا",
            secondaryCtaLink: "/services",
            imageUrl: "https://images.unsplash.com/photo-1519494026892-8cf5c5b7debb?w=1200&q=80",
            imageAlt: "عيادة الرعاية الطبية",
            imagePosition: "left",
            textAlignment: "right",
            mediaType: "image",
            accentStyle: "none",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "تخصصاتنا الطبية",
            subheading: "تغطية شاملة لاحتياجاتك الصحية",
            items: [
              { icon: "Heart", title: "أمراض القلب", description: "تشخيص وعلاج أمراض القلب بأحدث الأجهزة التصويرية", link: "/services/cardiology" },
              { icon: "Brain", title: "الأعصاب", description: "رعاية تخصصية لأمراض الجهاز العصبي والمخ", link: "/services/neurology" },
              { icon: "Eye", title: "العيون", description: "فحص وعلاج الأمراض البصرية بأحدث تقنيات الليزر", link: "/services/ophthalmology" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "إنجازاتنا بالأرقام",
            items: [
              { value: "٢٠,٠٠٠+", label: "مريض سنوياً" },
              { value: "٤٥", label: "طبيب متخصص" },
              { value: "١٥", label: "سنة خبرة" },
              { value: "٩٨%", label: "رضا المرضى" },
            ],
          },
        },
        {
          type: "ContactSimple",
          props: {
            heading: "تواصل معنا",
            subheading: "فريقنا جاهز للإجابة على استفساراتك وحجز موعدك",
            nameLabel: "الاسم الكامل",
            emailLabel: "البريد الإلكتروني",
            messageLabel: "رسالتك أو طلب الحجز",
            submitLabel: "أرسل رسالتك",
            submitEndpoint: "/api/contact",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "عيادة الرعاية الطبية",
            tagline: "صحتك أولاً — رعايتنا دائماً",
            copyright: "2025 عيادة الرعاية الطبية. جميع الحقوق محفوظة.",
            links: [
              { label: "خدماتنا", url: "/services" },
              { label: "أطباؤنا", url: "/doctors" },
              { label: "احجز موعداً", url: "/booking" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "twitter", url: "https://twitter.com" },
              { platform: "instagram", url: "https://instagram.com" },
            ],
          },
        },
      ],
      root: { props: { title: "عيادة الرعاية الطبية — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 5. أكاديمية العلم والمعرفة
  // ─────────────────────────────────────────────────────────
  {
    slug: "school-homepage",
    nameAr: "أكاديمية العلم والمعرفة",
    descriptionAr: "قالب تعليمي احترافي للمدارس والأكاديميات يعرض البرامج والمناهج مع التسجيل",
    category: "education",
    businessTypes: ["education", "school", "academy"],
    previewImageUrl: "https://images.unsplash.com/photo-1497633762265-fd58d71f03c3?w=1200&q=80",
    tags: ["تعليم", "مدرسة", "أكاديمية", "دورات"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 5,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "أكاديمية العلم والمعرفة",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "البرامج", url: "/programs" },
              { label: "الكادر التعليمي", url: "/faculty" },
              { label: "التسجيل", url: "/enroll" },
            ],
            ctaText: "سجّل الآن",
            ctaLink: "/enroll",
            sticky: true,
            backgroundColor: "white",
            showSearch: true,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "ابنِ مستقبلك — العلم طريق لا نهاية له",
            subheading: "برامج تعليمية متكاملة تجمع بين التأسيس الأكاديمي القوي والمهارات العملية المطلوبة في سوق العمل",
            ctaText: "تصفح البرامج",
            ctaUrl: "/programs",
            secondaryCtaText: "سجّل الآن",
            secondaryCtaUrl: "/enroll",
            badge: "مؤسسة تعليمية معتمدة",
            backgroundStyle: "light",
            alignment: "center",
          },
        },
        {
          type: "FeaturesAlternating",
          props: {
            items: [
              {
                heading: "منهج متطور يواكب العصر",
                subheading: "برامج دراسية",
                description: "نقدم مناهج تعليمية حديثة صممها خبراء تربويون بالتعاون مع جامعات دولية مرموقة",
                ctaLabel: "اكتشف البرامج",
                ctaUrl: "/programs",
                imageUrl: "https://images.unsplash.com/photo-1497633762265-fd58d71f03c3?w=800&q=80",
                imageAlt: "الفصول الدراسية",
                imagePosition: "left",
                accentColor: "#5b9bd5",
              },
              {
                heading: "معلمون متخصصون وخبراء",
                subheading: "الكادر التعليمي",
                description: "كادر من المعلمين المؤهلين حاملي شهادات الدكتوراه والماجستير من جامعات سعودية ودولية",
                ctaLabel: "تعرف على فريقنا",
                ctaUrl: "/faculty",
                imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
                imageAlt: "معلمون متخصصون",
                imagePosition: "right",
                accentColor: "#5b9bd5",
              },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "أكاديميتنا بالأرقام",
            items: [
              { value: "٣,٠٠٠+", label: "طالب منتسب" },
              { value: "٨٠", label: "معلم متخصص" },
              { value: "٢٠", label: "برنامج دراسي" },
              { value: "٩٥%", label: "نسبة النجاح" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "التسجيل مفتوح للعام الدراسي الجديد",
            subheading: "احجز مقعد ابنك الآن — الأماكن محدودة لضمان جودة التعليم",
            ctaLabel: "سجّل الآن",
            ctaUrl: "/enroll",
            secondaryLabel: "استفسر عن البرامج",
            secondaryUrl: "/contact",
            bgColor: "#5b9bd5",
            textColor: "#ffffff",
            alignment: "center",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "أكاديمية العلم والمعرفة",
            tagline: "نبني الأجيال — نصنع المستقبل",
            copyright: "2025 أكاديمية العلم والمعرفة. جميع الحقوق محفوظة.",
            links: [
              { label: "البرامج", url: "/programs" },
              { label: "الكادر", url: "/faculty" },
              { label: "التسجيل", url: "/enroll" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "twitter", url: "https://twitter.com" },
              { platform: "instagram", url: "https://instagram.com" },
              { platform: "youtube", url: "https://youtube.com" },
            ],
          },
        },
      ],
      root: { props: { title: "أكاديمية العلم والمعرفة — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 6. شركة الإعمار للعقارات
  // ─────────────────────────────────────────────────────────
  {
    slug: "real-estate-homepage",
    nameAr: "شركة الإعمار للعقارات",
    descriptionAr: "قالب احترافي لشركات العقارات يعرض العقارات المتاحة والخدمات مع نموذج التواصل",
    category: "real-estate",
    businessTypes: ["real-estate", "property"],
    previewImageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80",
    tags: ["عقارات", "بيع", "إيجار", "استثمار"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 6,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "الإعمار للعقارات",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "للبيع", url: "/sale" },
              { label: "للإيجار", url: "/rent" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "ابحث عن عقار",
            ctaLink: "/search",
            sticky: true,
            backgroundColor: "dark",
            showSearch: true,
          },
        },
        {
          type: "HeroGallery",
          props: {
            heading: "ابحث عن منزل أحلامك",
            subheading: "أكثر من 500 عقار متاح في أرقى أحياء الرياض وجدة والدمام",
            ctaText: "تصفح العقارات",
            ctaUrl: "/search",
            images: [
              { url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80", alt: "فيلا فاخرة" },
              { url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80", alt: "شقة عصرية" },
            ],
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "خدماتنا العقارية",
            subheading: "نقدم حلولاً عقارية متكاملة للأفراد والشركات",
            items: [
              { icon: "Home", title: "البيع والشراء", description: "توثيق كامل وشفاف مع ضمان سلامة المعاملات العقارية", link: "/sale" },
              { icon: "Key", title: "الإيجار", description: "شقق وفلل ومكاتب للإيجار مع خدمة إدارة العقار", link: "/rent" },
              { icon: "TrendingUp", title: "الاستشارة العقارية", description: "خبراء يساعدونك باتخاذ القرار الاستثماري الأمثل", link: "/consulting" },
            ],
          },
        },
        {
          type: "ProductsFeatured",
          props: {
            heading: "عقارات مميزة",
            subheading: "أبرز العقارات المتاحة الآن",
            ctaLabel: "عرض جميع العقارات",
            ctaUrl: "/search",
            items: [
              { imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80", name: "فيلا حي النرجس", description: "فيلا 5 غرف — مسبح خاص — جراج مزدوج — حي النرجس الرياض", price: "٣,٢ مليون", currency: "ر.س", badge: "للبيع", ctaLabel: "تفاصيل", ctaUrl: "/properties/narjis-villa" },
              { imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80", name: "شقة العليا", description: "شقة 3 غرف فاخرة — إطلالة بانورامية — حي العليا", price: "٨,٥٠٠", currency: "ر.س/شهر", badge: "للإيجار", ctaLabel: "تفاصيل", ctaUrl: "/properties/olaya-apt" },
              { imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80", name: "مكتب شارع الملك فهد", description: "مساحة مكتبية 250 متر — موقع مميز — مصلّى وكافيه", price: "٢٢,٠٠٠", currency: "ر.س/شهر", badge: "للإيجار", ctaLabel: "تفاصيل", ctaUrl: "/properties/kf-office" },
            ],
          },
        },
        {
          type: "ContactWithMap",
          props: {
            heading: "تواصل مع مستشارينا",
            subheading: "فريقنا متاح لمساعدتك في إيجاد العقار المناسب",
            nameLabel: "الاسم",
            phoneLabel: "رقم الجوال",
            messageLabel: "طلبك",
            submitLabel: "تواصل معنا",
            submitEndpoint: "/api/contact",
            mapEmbedUrl: "",
            address: "شارع الملك فهد، حي العليا، الرياض",
            phone: "0112345678",
            email: "info@alimaronrealestate.com",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "الإعمار للعقارات",
            tagline: "منزلك المثالي — يبدأ من هنا",
            copyright: "2025 شركة الإعمار للعقارات. جميع الحقوق محفوظة.",
            links: [
              { label: "للبيع", url: "/sale" },
              { label: "للإيجار", url: "/rent" },
              { label: "استشارة", url: "/consulting" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "twitter", url: "https://twitter.com" },
              { platform: "instagram", url: "https://instagram.com" },
              { platform: "linkedin", url: "https://linkedin.com" },
            ],
          },
        },
      ],
      root: { props: { title: "شركة الإعمار للعقارات — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 7. فندق الأصالة الراقية
  // ─────────────────────────────────────────────────────────
  {
    slug: "hotel-homepage",
    nameAr: "فندق الأصالة الراقية",
    descriptionAr: "قالب فاخر للفنادق والمنتجعات يعرض الغرف والمرافق مع نظام حجز مباشر",
    category: "hotel",
    businessTypes: ["hotel", "resort", "hospitality"],
    previewImageUrl: "https://images.unsplash.com/photo-1566073771259-e5278a66b3c3?w=1200&q=80",
    tags: ["فندق", "إقامة", "منتجع", "ضيافة"],
    isFeatured: true,
    isPublished: true,
    sortOrder: 7,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "فندق الأصالة",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "الغرف", url: "/rooms" },
              { label: "المرافق", url: "/amenities" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "احجز الآن",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "transparent",
            showSearch: false,
          },
        },
        {
          type: "HeroGallery",
          props: {
            heading: "حيث تلتقي الأصالة بالرفاهية",
            subheading: "تجربة إقامة استثنائية في قلب مدينة الرياض — 120 غرفة وجناح فاخر مع إطلالات بانورامية",
            ctaText: "احجز إقامتك",
            ctaUrl: "/booking",
            images: [
              { url: "https://images.unsplash.com/photo-1566073771259-e5278a66b3c3?w=1200&q=80", alt: "لوبي الفندق" },
              { url: "https://images.unsplash.com/photo-1551882547-ab25b5f?w=1200&q=80", alt: "جناح فاخر" },
            ],
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "مرافق الفندق",
            subheading: "كل ما تحتاجه لإقامة مثالية",
            items: [
              { icon: "Wifi", title: "واي فاي مجاني", description: "إنترنت عالي السرعة في جميع أرجاء الفندق", link: "/amenities" },
              { icon: "Dumbbell", title: "مركز لياقة", description: "صالة رياضية مجهزة بأحدث الأجهزة مفتوحة 24 ساعة", link: "/amenities/gym" },
              { icon: "Utensils", title: "مطعم راقي", description: "مطعم فاخر يقدم المأكولات العربية والعالمية", link: "/restaurant" },
              { icon: "Car", title: "موقف مجاني", description: "موقف سيارات مؤمن ومكيّف تحت إشراف الأمن", link: "/amenities" },
            ],
          },
        },
        {
          type: "ProductsFeatured",
          props: {
            heading: "غرفنا وأجنحتنا",
            subheading: "اختر الغرفة التي تناسب احتياجاتك",
            ctaLabel: "عرض جميع الغرف",
            ctaUrl: "/rooms",
            items: [
              { imageUrl: "https://images.unsplash.com/photo-1566073771259-e5278a66b3c3?w=600&q=80", name: "الغرفة الكلاسيكية", description: "غرفة مريحة بسرير كينج وإطلالة مدينة", price: "٤٥٠", currency: "ر.س/ليلة", badge: "", ctaLabel: "احجز", ctaUrl: "/booking/classic" },
              { imageUrl: "https://images.unsplash.com/photo-1551882547-ab25b5f?w=600&q=80", name: "جناح ديلوكس", description: "جناح فاخر بغرفة معيشة مستقلة وإطلالة بانورامية", price: "٨٥٠", currency: "ر.س/ليلة", badge: "الأكثر طلباً", ctaLabel: "احجز", ctaUrl: "/booking/deluxe" },
              { imageUrl: "https://images.unsplash.com/photo-1566073771259-e5278a66b3c3?w=600&q=80", name: "جناح بنتهاوس", description: "قمة الفخامة — طابقان مع تراس خاص ومسبح", price: "٢,٥٠٠", currency: "ر.س/ليلة", badge: "VIP", ctaLabel: "احجز", ctaUrl: "/booking/penthouse" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "احجز مبكراً ووفّر 20%",
            subheading: "عروض حصرية للحجوزات المبكرة — احجز قبل 7 أيام وادفع أقل",
            ctaLabel: "احجز الآن",
            ctaUrl: "/booking",
            secondaryLabel: "تواصل معنا",
            secondaryUrl: "/contact",
            bgColor: "#1a1a2e",
            textColor: "#ffffff",
            alignment: "center",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "فندق الأصالة الراقية",
            tagline: "إقامة لا تُنسى — خدمة تفوق التوقعات",
            copyright: "2025 فندق الأصالة الراقية. جميع الحقوق محفوظة.",
            links: [
              { label: "الغرف", url: "/rooms" },
              { label: "المرافق", url: "/amenities" },
              { label: "احجز الآن", url: "/booking" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "instagram", url: "https://instagram.com" },
              { platform: "twitter", url: "https://twitter.com" },
              { platform: "facebook", url: "https://facebook.com" },
            ],
          },
        },
      ],
      root: { props: { title: "فندق الأصالة الراقية — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 8. شركة الرحلة لتأجير السيارات
  // ─────────────────────────────────────────────────────────
  {
    slug: "car-rental-homepage",
    nameAr: "شركة الرحلة لتأجير السيارات",
    descriptionAr: "قالب احترافي لشركات تأجير السيارات يعرض الأسطول والأسعار مع نظام الحجز",
    category: "car-rental",
    businessTypes: ["car-rental", "transport"],
    previewImageUrl: "https://images.unsplash.com/photo-1552519507-da3b142a9e78?w=1200&q=80",
    tags: ["تأجير سيارات", "مواصلات", "سفر"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 8,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "الرحلة لتأجير السيارات",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "أسطولنا", url: "/fleet" },
              { label: "الأسعار", url: "/pricing" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "احجز سيارة",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "أسافر بأمان وراحة — معنا كل رحلاتك مميزة",
            subheading: "أسطول متنوع من أحدث السيارات بأسعار تنافسية وخدمة توصيل لأي مكان في المملكة",
            primaryCtaText: "احجز سيارتك الآن",
            primaryCtaLink: "/booking",
            secondaryCtaText: "تصفح أسطولنا",
            secondaryCtaLink: "/fleet",
            imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142a9e78?w=1200&q=80",
            imageAlt: "سيارة فاخرة",
            imagePosition: "left",
            textAlignment: "right",
            mediaType: "image",
            accentStyle: "gradient",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "لماذا تختارنا؟",
            subheading: "نقدم خدمة تأجير موثوقة وشفافة بدون تكاليف مخفية",
            items: [
              { icon: "Shield", title: "تأمين شامل", description: "جميع سياراتنا مؤمنة بشكل كامل ضد الحوادث والسرقة", link: "/about" },
              { icon: "MapPin", title: "توصيل لأي مكان", description: "نوصل السيارة لمطارك أو فندقك أو أي عنوان تحدده", link: "/delivery" },
              { icon: "CreditCard", title: "دفع مرن", description: "ادفع يومياً أو أسبوعياً أو شهرياً حسب احتياجاتك", link: "/pricing" },
            ],
          },
        },
        {
          type: "ProductsFeatured",
          props: {
            heading: "أبرز سياراتنا",
            subheading: "من الاقتصادية للفاخرة — لدينا ما يناسبك",
            ctaLabel: "عرض الأسطول كاملاً",
            ctaUrl: "/fleet",
            items: [
              { imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142a9e78?w=600&q=80", name: "تويوتا كامري", description: "سيارة مريحة مناسبة للعائلات — 5 ركاب", price: "٢٢٠", currency: "ر.س/يوم", badge: "الأكثر طلباً", ctaLabel: "احجز", ctaUrl: "/booking/camry" },
              { imageUrl: "https://images.unsplash.com/photo-1503376780353-e7bf6?w=600&q=80", name: "لكزس ES 350", description: "سيارة فاخرة لرجال الأعمال — مع سائق اختياري", price: "٤٥٠", currency: "ر.س/يوم", badge: "فاخرة", ctaLabel: "احجز", ctaUrl: "/booking/lexus" },
              { imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142a9e78?w=600&q=80", name: "تويوتا لاند كروزر", description: "للرحلات البرية والمجموعات الكبيرة — 7 ركاب", price: "٥٥٠", currency: "ر.س/يوم", badge: "", ctaLabel: "احجز", ctaUrl: "/booking/landcruiser" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "أرقامنا تتحدث",
            items: [
              { value: "٥٠٠+", label: "سيارة في الأسطول" },
              { value: "١٥", label: "مدينة نخدمها" },
              { value: "٥٠,٠٠٠+", label: "عميل سعيد" },
              { value: "٩.٨", label: "تقييم متوسط" },
            ],
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "الرحلة لتأجير السيارات",
            tagline: "رحلاتك — مسؤوليتنا",
            copyright: "2025 شركة الرحلة لتأجير السيارات. جميع الحقوق محفوظة.",
            links: [
              { label: "أسطولنا", url: "/fleet" },
              { label: "الأسعار", url: "/pricing" },
              { label: "احجز الآن", url: "/booking" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "twitter", url: "https://twitter.com" },
              { platform: "instagram", url: "https://instagram.com" },
            ],
          },
        },
      ],
      root: { props: { title: "شركة الرحلة لتأجير السيارات — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 9. شركة اللحظة للمناسبات
  // ─────────────────────────────────────────────────────────
  {
    slug: "events-homepage",
    nameAr: "شركة اللحظة للمناسبات",
    descriptionAr: "قالب احترافي لشركات تنظيم الفعاليات والمناسبات يعرض الباقات والأعمال السابقة",
    category: "events",
    businessTypes: ["events", "wedding", "corporate"],
    previewImageUrl: "https://images.unsplash.com/photo-1519167758481-8b4bb2e41e8d?w=1200&q=80",
    tags: ["مناسبات", "أعراس", "فعاليات", "تنظيم"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 9,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "اللحظة للمناسبات",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "معرض أعمالنا", url: "/portfolio" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "استفسر عن مناسبتك",
            ctaLink: "/inquiry",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroGallery",
          props: {
            heading: "نصنع لك لحظات لا تُنسى",
            subheading: "تخصصنا في تنظيم الأعراس وحفلات الأعمال والمناسبات الخاصة بأعلى معايير الإبداع والتنظيم",
            ctaText: "احجز استشارتك المجانية",
            ctaUrl: "/inquiry",
            images: [
              { url: "https://images.unsplash.com/photo-1519167758481-8b4bb2e41e8d?w=1200&q=80", alt: "مناسبة فاخرة" },
              { url: "https://images.unsplash.com/photo-1464366400600-ac27e6?w=1200&q=80", alt: "تنظيم حفل" },
            ],
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "خدماتنا الإبداعية",
            subheading: "نتولى كل تفاصيل مناسبتك من الألف إلى الياء",
            items: [
              { icon: "Sparkles", title: "الديكور والتزيين", description: "تصاميم فريدة وتنفيذ احترافي يعكس ذوقك الرفيع", link: "/services/decor" },
              { icon: "Music", title: "البرامج الفنية", description: "فرق موسيقية واستعراضات وبرامج ترفيهية متنوعة", link: "/services/entertainment" },
              { icon: "Camera", title: "التصوير والتوثيق", description: "مصورون محترفون لحفظ ذكريات يومك الخاص", link: "/services/photography" },
            ],
          },
        },
        {
          type: "GalleryGrid",
          props: {
            heading: "من أعمالنا السابقة",
            subheading: "أكثر من 300 مناسبة نظمناها بنجاح",
            items: [
              { imageUrl: "https://images.unsplash.com/photo-1519167758481-8b4bb2e41e8d?w=600&q=80", alt: "حفل زفاف", caption: "حفل زفاف ملكي" },
              { imageUrl: "https://images.unsplash.com/photo-1464366400600-ac27e6?w=600&q=80", alt: "مؤتمر", caption: "مؤتمر شركات" },
              { imageUrl: "https://images.unsplash.com/photo-1519167758481-8b4bb2e41e8d?w=600&q=80", alt: "حفلة", caption: "حفلة عيد ميلاد" },
              { imageUrl: "https://images.unsplash.com/photo-1464366400600-ac27e6?w=600&q=80", alt: "معرض", caption: "معرض تجاري" },
            ],
            layout: "grid-4",
            aspectRatio: "landscape",
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "حوّل مناسبتك إلى تحفة فنية",
            subheading: "استشارتنا مجانية — تواصل معنا اليوم ودعنا نخطط لمناسبتك المثالية",
            ctaLabel: "احجز استشارتك",
            ctaUrl: "/inquiry",
            secondaryLabel: "تصفح أعمالنا",
            secondaryUrl: "/portfolio",
            bgColor: "#7c3aed",
            textColor: "#ffffff",
            alignment: "center",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "اللحظة للمناسبات",
            tagline: "كل لحظة تستحق أن تُحتفل بها",
            copyright: "2025 شركة اللحظة للمناسبات. جميع الحقوق محفوظة.",
            links: [
              { label: "خدماتنا", url: "/services" },
              { label: "معرض الأعمال", url: "/portfolio" },
              { label: "الباقات والأسعار", url: "/pricing" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "instagram", url: "https://instagram.com" },
              { platform: "twitter", url: "https://twitter.com" },
              { platform: "youtube", url: "https://youtube.com" },
            ],
          },
        },
      ],
      root: { props: { title: "شركة اللحظة للمناسبات — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 10. قالب عام متعدد الاستخدامات
  // ─────────────────────────────────────────────────────────
  {
    slug: "general-homepage",
    nameAr: "قالب عام متعدد الاستخدامات",
    descriptionAr: "قالب مرن وبسيط يناسب أي نوع من الأعمال — يمكن تخصيصه بالكامل",
    category: "general",
    businessTypes: ["general", "services", "business"],
    previewImageUrl: "https://images.unsplash.com/photo-1497366216548-37526084cd21?w=1200&q=80",
    tags: ["عام", "متعدد الاستخدامات", "أعمال"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 10,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "اسم منشأتك",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "من نحن", url: "/about" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "ابدأ الآن",
            ctaLink: "/contact",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "نقدم لك أفضل الخدمات بأعلى مستوى",
            subheading: "فريق متخصص وخبرة تمتد لسنوات — نساعدك على تحقيق أهدافك بكفاءة واحترافية",
            ctaText: "تعرف علينا",
            ctaUrl: "/about",
            secondaryCtaText: "تواصل معنا",
            secondaryCtaUrl: "/contact",
            badge: "",
            backgroundStyle: "light",
            alignment: "center",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "خدماتنا الرئيسية",
            subheading: "نقدم حلولاً شاملة لاحتياجاتك",
            items: [
              { icon: "Star", title: "جودة عالية", description: "نلتزم بأعلى معايير الجودة في كل ما نقدمه من خدمات ومنتجات", link: "/services" },
              { icon: "Clock", title: "التزام بالمواعيد", description: "نحترم وقتك ونلتزم بالمواعيد المحددة دون أي تأخير", link: "/services" },
              { icon: "Shield", title: "موثوقية تامة", description: "سنوات من الخبرة وآلاف العملاء الراضين شاهدون على جودتنا", link: "/about" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "أرقامنا",
            items: [
              { value: "١,٠٠٠+", label: "عميل راضٍ" },
              { value: "١٠", label: "سنوات خبرة" },
              { value: "٥٠+", label: "موظف متخصص" },
              { value: "٩٨%", label: "نسبة الرضا" },
            ],
          },
        },
        {
          type: "FAQAccordion",
          props: {
            heading: "الأسئلة الشائعة",
            subheading: "إجابات على أكثر الأسئلة شيوعاً",
            items: [
              { question: "كيف يمكنني التواصل معكم؟", answer: "يمكنك التواصل معنا عبر نموذج التواصل في الموقع أو الاتصال على الرقم الموضح في صفحة التواصل." },
              { question: "ما هي أوقات الدوام؟", answer: "نعمل من الأحد إلى الخميس من الساعة 8 صباحاً حتى 5 مساءً. السبت من 9 صباحاً حتى 1 ظهراً." },
              { question: "هل تقدمون استشارة مجانية؟", answer: "نعم، نقدم استشارة أولية مجانية لفهم احتياجاتك وتقديم أفضل الحلول المناسبة." },
              { question: "ما أنواع الدفع المقبولة؟", answer: "نقبل الدفع النقدي والتحويل البنكي وبطاقات الائتمان ومدى." },
            ],
          },
        },
        {
          type: "ContactSimple",
          props: {
            heading: "تواصل معنا",
            subheading: "يسعدنا الإجابة على استفساراتك",
            nameLabel: "الاسم",
            emailLabel: "البريد الإلكتروني",
            messageLabel: "رسالتك",
            submitLabel: "أرسل الرسالة",
            submitEndpoint: "/api/contact",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "اسم منشأتك",
            tagline: "شعارك هنا",
            copyright: "2025 منشأتك. جميع الحقوق محفوظة.",
            links: [
              { label: "خدماتنا", url: "/services" },
              { label: "من نحن", url: "/about" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "twitter", url: "https://twitter.com" },
              { platform: "instagram", url: "https://instagram.com" },
            ],
          },
        },
      ],
      root: { props: { title: "الصفحة الرئيسية" } },
    },
  },
];
