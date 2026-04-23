// ============================================================
// بيانات القوالب — 29 قالب عربي جاهز
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
    previewImageUrl: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=1200&q=80",
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
              { imageUrl: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=600&q=80", alt: "داخل المقهى", caption: "الجلسات الداخلية" },
              { imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80", alt: "كوب قهوة", caption: "تحضير القهوة" },
              { imageUrl: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80", alt: "تراس المقهى", caption: "الجلسات الخارجية" },
              { imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80", alt: "مشروبات باردة", caption: "مشروباتنا الباردة" },
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
    previewImageUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1200&q=80",
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
              { url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80", alt: "خدمات الشعر" },
              { url: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&q=80", alt: "العناية بالبشرة" },
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
    previewImageUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1200&q=80",
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
            imageUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1200&q=80",
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
    previewImageUrl: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=80",
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
                imageUrl: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80",
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
                imageUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&q=80",
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
    previewImageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80",
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
              { url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80", alt: "لوبي الفندق" },
              { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80", alt: "جناح فاخر" },
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
              { imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80", name: "الغرفة الكلاسيكية", description: "غرفة مريحة بسرير كينج وإطلالة مدينة", price: "٤٥٠", currency: "ر.س/ليلة", badge: "", ctaLabel: "احجز", ctaUrl: "/booking/classic" },
              { imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80", name: "جناح ديلوكس", description: "جناح فاخر بغرفة معيشة مستقلة وإطلالة بانورامية", price: "٨٥٠", currency: "ر.س/ليلة", badge: "الأكثر طلباً", ctaLabel: "احجز", ctaUrl: "/booking/deluxe" },
              { imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80", name: "جناح بنتهاوس", description: "قمة الفخامة — طابقان مع تراس خاص ومسبح", price: "٢,٥٠٠", currency: "ر.س/ليلة", badge: "VIP", ctaLabel: "احجز", ctaUrl: "/booking/penthouse" },
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
    previewImageUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80",
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
            imageUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80",
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
              { imageUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80", name: "تويوتا كامري", description: "سيارة مريحة مناسبة للعائلات — 5 ركاب", price: "٢٢٠", currency: "ر.س/يوم", badge: "الأكثر طلباً", ctaLabel: "احجز", ctaUrl: "/booking/camry" },
              { imageUrl: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=600&q=80", name: "لكزس ES 350", description: "سيارة فاخرة لرجال الأعمال — مع سائق اختياري", price: "٤٥٠", currency: "ر.س/يوم", badge: "فاخرة", ctaLabel: "احجز", ctaUrl: "/booking/lexus" },
              { imageUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80", name: "تويوتا لاند كروزر", description: "للرحلات البرية والمجموعات الكبيرة — 7 ركاب", price: "٥٥٠", currency: "ر.س/يوم", badge: "", ctaLabel: "احجز", ctaUrl: "/booking/landcruiser" },
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
    previewImageUrl: "https://images.unsplash.com/photo-1510924199351-4e9d94df18a6?w=1200&q=80",
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
              { url: "https://images.unsplash.com/photo-1510924199351-4e9d94df18a6?w=1200&q=80", alt: "مناسبة فاخرة" },
              { url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80", alt: "تنظيم حفل" },
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
              { imageUrl: "https://images.unsplash.com/photo-1510924199351-4e9d94df18a6?w=600&q=80", alt: "حفل زفاف", caption: "حفل زفاف ملكي" },
              { imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80", alt: "مؤتمر", caption: "مؤتمر شركات" },
              { imageUrl: "https://images.unsplash.com/photo-1510924199351-4e9d94df18a6?w=600&q=80", alt: "حفلة", caption: "حفلة عيد ميلاد" },
              { imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80", alt: "معرض", caption: "معرض تجاري" },
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
    previewImageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=80",
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

  // ─────────────────────────────────────────────────────────
  // 11. محل الورد
  // ─────────────────────────────────────────────────────────
  {
    slug: "flower-shop-homepage",
    nameAr: "محل زهور النخبة",
    descriptionAr: "قالب أنيق لمحلات الورد والتنسيق يعرض الباقات والمناسبات مع نظام طلب التوصيل",
    category: "flower_shop",
    businessTypes: ["flower_shop"],
    previewImageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80",
    tags: ["ورد", "زهور", "تنسيق", "مناسبات"],
    isFeatured: true,
    isPublished: true,
    sortOrder: 11,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "زهور النخبة",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "باقاتنا", url: "/packages" },
              { label: "المناسبات", url: "/occasions" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "اطلب الآن",
            ctaLink: "/order",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "أجمل الورود لأجمل لحظاتك",
            subheading: "نصمم باقات الورود الطازجة لكل مناسبة — أعراس، خطوبة، هدايا، وتنسيق القاعات بلمسة فنية تدوم في الذاكرة",
            ctaText: "تصفح الباقات",
            ctaUrl: "/packages",
            secondaryCtaText: "اطلب توصيل",
            secondaryCtaUrl: "/order",
            imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=80",
            imageAlt: "باقة ورود",
            imagePosition: "right",
            badge: "توصيل سريع",
            mediaType: "image",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "لماذا تختارنا؟",
            subheading: "نقدم أفضل الورود الطازجة بخدمة استثنائية",
            items: [
              { icon: "Flower2", title: "ورود طازجة يومياً", description: "نستورد الورد يومياً مباشرة من المزارع لضمان أعلى جودة وأطول عمر للباقة" },
              { icon: "Truck", title: "توصيل سريع", description: "توصيل في نفس اليوم لجميع المناطق — نضمن وصول باقتك في الوقت المحدد" },
              { icon: "Palette", title: "تصميم مخصص", description: "نصمم باقتك حسب ذوقك ومناسبتك — نسمعك ونجسّد ما تتخيل" },
              { icon: "Gift", title: "تغليف فاخر", description: "تغليف فاخر مع بطاقة إهداء شخصية لتجعل هديتك لا تُنسى" },
            ],
          },
        },
        {
          type: "ProductsGrid",
          props: {
            heading: "أبرز باقاتنا",
            subheading: "اختر من تشكيلتنا المتنوعة",
            items: [
              { name: "باقة الرومانسية", price: "١٥٠ ريال", image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&q=80", badge: "الأكثر طلباً", description: "٢٤ وردة حمراء مع خضرة وتغليف فاخر" },
              { name: "باقة الأعراس", price: "٤٥٠ ريال", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80", badge: "مميزة", description: "تصميم عصري للعرائس مع لمسة من الإيليوم" },
              { name: "باقة المناسبات", price: "٢٢٠ ريال", image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80", badge: "", description: "مزيج من الورود الملونة مثالية لأعياد الميلاد" },
              { name: "تنسيق القاعات", price: "٨٠٠ ريال", image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80", badge: "الأفضل قيمة", description: "تنسيق كامل للقاعة يشمل الطاولات والكوش" },
            ],
            ctaText: "تصفح جميع الباقات",
            ctaUrl: "/packages",
          },
        },
        {
          type: "TestimonialsCards",
          props: {
            heading: "آراء عملاؤنا",
            subheading: "نفخر بثقة آلاف العملاء",
            items: [
              { name: "سارة المطيري", role: "عروس", content: "زينوا حفل زفافي بأجمل الورود — كل شيء كان مثالياً أكثر مما تخيلت. شكراً جزيلاً!", rating: 5 },
              { name: "محمد العتيبي", role: "عميل", content: "طلبت باقة هدية لزوجتي وكانت المفاجأة رائعة — التوصيل في الموعد والتغليف فاخر جداً", rating: 5 },
              { name: "نورة الغامدي", role: "منظمة أفراح", content: "نتعامل معهم في كل مناسباتنا — جودة ثابتة وخدمة ممتازة واحترافية عالية", rating: 5 },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "اطلب باقتك الآن",
            subheading: "توصيل في نفس اليوم — اتصل بنا أو اطلب عبر الموقع",
            ctaText: "اطلب الآن",
            ctaUrl: "/order",
            secondaryCtaText: "تواصل معنا",
            secondaryCtaUrl: "/contact",
            backgroundColor: "#e91e8c",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "زهور النخبة",
            tagline: "أجمل الورود لأجمل لحظاتك",
            copyright: "2025 زهور النخبة. جميع الحقوق محفوظة.",
            links: [
              { label: "باقاتنا", url: "/packages" },
              { label: "المناسبات", url: "/occasions" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            socialLinks: [
              { platform: "instagram", url: "https://instagram.com" },
              { platform: "twitter", url: "https://twitter.com" },
            ],
          },
        },
      ],
      root: { props: { title: "زهور النخبة — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 12. حلاق
  // ─────────────────────────────────────────────────────────
  {
    slug: "barber-homepage",
    nameAr: "صالون الفارس للحلاقة",
    descriptionAr: "قالب عصري لصالونات الحلاقة الرجالية يعرض الخدمات والأسعار مع نظام حجز مواعيد",
    category: "barber",
    businessTypes: ["barber"],
    previewImageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80",
    tags: ["حلاقة", "رجالي", "مواعيد", "تصفيف"],
    isFeatured: true,
    isPublished: true,
    sortOrder: 12,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "صالون الفارس",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "أسعارنا", url: "/pricing" },
              { label: "احجز موعد", url: "/booking" },
            ],
            ctaText: "احجز الآن",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "إطلالة تليق بك",
            subheading: "حلاقون محترفون بخبرة عشر سنوات — نقدم أحدث صيحات التصفيف وخدمات العناية للرجال في أجواء راقية",
            ctaText: "احجز موعدك",
            ctaUrl: "/booking",
            secondaryCtaText: "شاهد خدماتنا",
            secondaryCtaUrl: "/services",
            imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80",
            imageAlt: "حلاق محترف",
            imagePosition: "right",
            badge: "حجز فوري",
            mediaType: "image",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "خدماتنا",
            subheading: "كل ما يحتاجه الرجل العصري",
            items: [
              { icon: "Scissors", title: "قص الشعر", description: "أحدث قصات الشعر العصرية والكلاسيكية بيد حلاقين محترفين", link: "/services" },
              { icon: "Star", title: "العناية باللحية", description: "تشكيل وتهذيب اللحية مع علاجات العناية المتخصصة", link: "/services" },
              { icon: "Sparkles", title: "الحلاقة الكلاسيكية", description: "حلاقة بالموس الكلاسيكي مع بخار دافئ وماسك البشرة", link: "/services" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "أرقامنا تتحدث",
            items: [
              { value: "٥,٠٠٠+", label: "عميل شهرياً" },
              { value: "١٠", label: "سنوات خبرة" },
              { value: "١٥", label: "حلاق محترف" },
              { value: "٩٨٪", label: "رضا العملاء" },
            ],
          },
        },
        {
          type: "TestimonialsCards",
          props: {
            heading: "يقولون عنا",
            items: [
              { name: "خالد الدوسري", role: "عميل دائم", content: "أفضل صالون حلاقة زرته — نظافة عالية وحلاقون محترفون والنتيجة دائماً ممتازة", rating: 5 },
              { name: "فهد العنزي", role: "عميل", content: "خدمة اللحية لديهم لا تُضاهى — يفهمون ما تريد ويطبقونه بإتقان", rating: 5 },
              { name: "عبدالله القحطاني", role: "عميل دائم", content: "الحجز الإلكتروني سهّل علينا كثيراً — لا انتظار ولا ازدحام", rating: 5 },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "احجز موعدك الآن",
            subheading: "لا تنتظر — مواعيد متاحة الآن",
            ctaText: "احجز موعداً",
            ctaUrl: "/booking",
            backgroundColor: "#1a1a2e",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "صالون الفارس",
            tagline: "إطلالة تليق بك",
            copyright: "2025 صالون الفارس. جميع الحقوق محفوظة.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "احجز موعد", url: "/booking" }],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "صالون الفارس للحلاقة — الصفحة الرئيسية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 13. سبا
  // ─────────────────────────────────────────────────────────
  {
    slug: "spa-homepage",
    nameAr: "سبا النقاء الفاخر",
    descriptionAr: "قالب فاخر لمراكز السبا يعرض الجلسات والعروض مع نظام حجز مريح",
    category: "spa",
    businessTypes: ["spa"],
    previewImageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80",
    tags: ["سبا", "استرخاء", "تدليك", "عناية"],
    isFeatured: true,
    isPublished: true,
    sortOrder: 13,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "سبا النقاء",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "جلساتنا", url: "/services" },
              { label: "العروض", url: "/offers" },
              { label: "احجزي موعد", url: "/booking" },
            ],
            ctaText: "احجزي الآن",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "تجديد الروح والجسد",
            subheading: "مركز سبا فاخر يقدم تجربة استرخاء شاملة — تدليك، حمام مغربي، علاجات البشرة وجلسات الأروما في أجواء هادئة",
            ctaText: "احجزي جلستك",
            ctaUrl: "/booking",
            secondaryCtaText: "استكشفي الجلسات",
            secondaryCtaUrl: "/services",
            imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80",
            imageAlt: "سبا فاخر",
            imagePosition: "right",
            badge: "تجربة استثنائية",
            mediaType: "image",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "جلساتنا المميزة",
            items: [
              { icon: "Wind", title: "تدليك استرخائي", description: "جلسة تدليك كاملة بالزيوت العطرية تخفف التوتر وتجدد النشاط" },
              { icon: "Droplets", title: "حمام مغربي", description: "تنظيف عميق للبشرة بالطريقة المغربية الأصيلة مع الكيس والصابون البلدي" },
              { icon: "Sparkles", title: "علاجات البشرة", description: "بروتوكولات متخصصة للبشرة بمستحضرات عالمية لنتيجة مذهلة" },
              { icon: "Flower2", title: "جلسة الأروما", description: "علاج بالروائح العطرية لتحقيق التوازن النفسي والجسدي" },
            ],
          },
        },
        {
          type: "TestimonialsCards",
          props: {
            heading: "تجارب عميلاتنا",
            items: [
              { name: "ريم السعد", role: "عميلة دائمة", content: "أجمل تجربة سبا عشتها — الأجواء هادئة والمعاملة راقية والنتيجة رائعة", rating: 5 },
              { name: "لمياء الحربي", role: "عميلة", content: "الحمام المغربي هنا على مستوى عالمي — أنصح به كل فتاة", rating: 5 },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "احجزي جلستك اليوم",
            subheading: "هديتي نفسك لحظة راحة تستحقينها",
            ctaText: "احجزي الآن",
            ctaUrl: "/booking",
            backgroundColor: "#8b5cf6",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "سبا النقاء",
            copyright: "2025 سبا النقاء الفاخر.",
            links: [{ label: "جلساتنا", url: "/services" }, { label: "احجزي", url: "/booking" }],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }],
          },
        },
      ],
      root: { props: { title: "سبا النقاء الفاخر" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 14. لياقة بدنية
  // ─────────────────────────────────────────────────────────
  {
    slug: "fitness-homepage",
    nameAr: "نادي القوة للياقة",
    descriptionAr: "قالب محفز لنوادي اللياقة البدنية يعرض البرامج والاشتراكات مع نظام التسجيل",
    category: "fitness",
    businessTypes: ["fitness"],
    previewImageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
    tags: ["جيم", "لياقة", "رياضة", "اشتراك"],
    isFeatured: true,
    isPublished: true,
    sortOrder: 14,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "نادي القوة",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "البرامج", url: "/programs" },
              { label: "الاشتراكات", url: "/membership" },
              { label: "سجّل الآن", url: "/register" },
            ],
            ctaText: "سجّل الآن",
            ctaLink: "/register",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "ابنِ جسمك — غيّر حياتك",
            subheading: "ناديك المتكامل للياقة البدنية — مدربون معتمدون، أجهزة حديثة، برامج تدريبية مخصصة لتحقيق أهدافك",
            ctaText: "سجّل الآن",
            ctaUrl: "/register",
            secondaryCtaText: "تعرف على البرامج",
            secondaryCtaUrl: "/programs",
            imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80",
            imageAlt: "نادي لياقة",
            imagePosition: "right",
            badge: "أول شهر مجاني",
            mediaType: "image",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "لماذا نادي القوة؟",
            items: [
              { icon: "Dumbbell", title: "أجهزة حديثة", description: "أحدث أجهزة القوة والكارديو من أفضل العلامات العالمية" },
              { icon: "UserCheck", title: "مدربون معتمدون", description: "فريق من المدربين الحاصلين على أعلى الشهادات الدولية" },
              { icon: "Calendar", title: "دروس جماعية", description: "أكثر من ٣٠ درساً أسبوعياً — يوغا، كروسفت، بوكسنغ وأكثر" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "",
            items: [
              { value: "٢,٠٠٠+", label: "عضو نشط" },
              { value: "٣٠+", label: "برنامج تدريبي" },
              { value: "٢٠", label: "مدرب محترف" },
              { value: "٥", label: "سنوات تميز" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "ابدأ رحلتك اليوم",
            subheading: "سجّل الآن واحصل على الشهر الأول مجاناً",
            ctaText: "سجّل الآن",
            ctaUrl: "/register",
            backgroundColor: "#dc2626",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "نادي القوة",
            copyright: "2025 نادي القوة للياقة.",
            links: [{ label: "البرامج", url: "/programs" }, { label: "الاشتراكات", url: "/membership" }],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "نادي القوة للياقة" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 15. مخبز
  // ─────────────────────────────────────────────────────────
  {
    slug: "bakery-homepage",
    nameAr: "مخبز العجين الذهبي",
    descriptionAr: "قالب دافئ للمخابز والحلويات يعرض المنتجات والعروض مع إمكانية الطلب المسبق",
    category: "bakery",
    businessTypes: ["bakery"],
    previewImageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80",
    tags: ["مخبز", "حلويات", "كيك", "خبز"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 15,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "العجين الذهبي",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "منتجاتنا", url: "/products" },
              { label: "تورتات", url: "/cakes" },
              { label: "اطلب الآن", url: "/order" },
            ],
            ctaText: "اطلب الآن",
            ctaLink: "/order",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "لذة تصنعها الحرفة",
            subheading: "مخبز يومي يقدم أشهى الخبز والمعجنات والحلويات — محضّرة بحب من أجود المكونات الطبيعية منذ عشرين سنة",
            ctaText: "تصفح المنتجات",
            ctaUrl: "/products",
            secondaryCtaText: "اطلب تورتة خاصة",
            secondaryCtaUrl: "/custom-cake",
            imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80",
            imageAlt: "منتجات المخبز",
            imagePosition: "right",
            badge: "طازج يومياً",
            mediaType: "image",
          },
        },
        {
          type: "ProductsGrid",
          props: {
            heading: "أبرز منتجاتنا",
            items: [
              { name: "خبز التميس", price: "١٥ ريال", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80", badge: "الأكثر مبيعاً", description: "خبز تميس طازج يومياً بالطريقة التقليدية" },
              { name: "تورتة الشوكولاتة", price: "١٢٠ ريال", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80", badge: "مميز", description: "تورتة شوكولاتة بلجيكية مع كريمة الكاكاو" },
              { name: "كرواسون بالجبن", price: "٢٥ ريال", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80", badge: "", description: "كرواسون فرنسي مقرمش محشو بالجبن الذائب" },
              { name: "بسكويت الزبدة", price: "٤٥ ريال", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80", badge: "", description: "علبة بسكويت زبدة فاخرة مثالية كهدية" },
            ],
            ctaText: "تصفح كامل القائمة",
            ctaUrl: "/products",
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "اطلب تورتتك الخاصة",
            subheading: "تصاميم مخصصة لمناسباتك — أعياد ميلاد، أفراح، مناسبات الشركات",
            ctaText: "اطلب الآن",
            ctaUrl: "/custom-cake",
            backgroundColor: "#d97706",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "العجين الذهبي",
            copyright: "2025 مخبز العجين الذهبي.",
            links: [{ label: "منتجاتنا", url: "/products" }, { label: "اطلب", url: "/order" }],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }],
          },
        },
      ],
      root: { props: { title: "مخبز العجين الذهبي" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 16. تموين وضيافة
  // ─────────────────────────────────────────────────────────
  {
    slug: "catering-homepage",
    nameAr: "شركة الضيافة الراقية",
    descriptionAr: "قالب احترافي لشركات التموين يعرض الباقات والقوائم مع نظام طلب العروض",
    category: "catering",
    businessTypes: ["catering"],
    previewImageUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80",
    tags: ["تموين", "ضيافة", "مناسبات", "حفلات"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 16,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "الضيافة الراقية",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "قوائمنا", url: "/menus" },
              { label: "الباقات", url: "/packages" },
              { label: "اطلب عرضاً", url: "/quote" },
            ],
            ctaText: "اطلب عرضاً",
            ctaLink: "/quote",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "ضيافة تليق بمناسبتك",
            subheading: "نقدم خدمات تموين متكاملة للأفراح والمؤتمرات والحفلات الخاصة — طعام شهي وخدمة احترافية تجعل مناسبتك لا تُنسى",
            ctaText: "اطلب عرض أسعار",
            ctaUrl: "/quote",
            secondaryCtaText: "تصفح القوائم",
            secondaryCtaUrl: "/menus",
            imageUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?w=900&q=80",
            imageAlt: "ضيافة فاخرة",
            imagePosition: "right",
            badge: "لكل مناسبة",
            mediaType: "image",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "لماذا تختارنا؟",
            items: [
              { icon: "ChefHat", title: "طهاة محترفون", description: "فريق من الطهاة ذوي الخبرة العالمية يحضرون أشهى الأطباق" },
              { icon: "Users", title: "كل المناسبات", description: "أفراح، مؤتمرات، حفلات شركات، مناسبات خاصة — ندير الكل" },
              { icon: "Truck", title: "تجهيز كامل", description: "نوفر الطعام والمعدات وطاقم الخدمة والإعداد والتنظيف" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "",
            items: [
              { value: "٥٠٠+", label: "مناسبة نجحنا فيها" },
              { value: "١٠,٠٠٠+", label: "ضيف خدمناهم" },
              { value: "١٥", label: "سنة خبرة" },
              { value: "٩٩٪", label: "رضا العملاء" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "خطط مناسبتك معنا",
            subheading: "تواصل الآن واحصل على عرض أسعار مجاني",
            ctaText: "اطلب عرضاً مجانياً",
            ctaUrl: "/quote",
            backgroundColor: "#065f46",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "الضيافة الراقية",
            copyright: "2025 شركة الضيافة الراقية.",
            links: [{ label: "القوائم", url: "/menus" }, { label: "الباقات", url: "/packages" }],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "شركة الضيافة الراقية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 17. متجر تجزئة
  // ─────────────────────────────────────────────────────────
  {
    slug: "retail-homepage",
    nameAr: "متجر التميز",
    descriptionAr: "قالب احترافي للمتاجر يعرض المنتجات والعروض مع تجربة تسوق سلسة",
    category: "retail",
    businessTypes: ["retail"],
    previewImageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
    tags: ["متجر", "تسوق", "منتجات", "عروض"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 17,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "متجر التميز",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "المنتجات", url: "/products" },
              { label: "العروض", url: "/offers" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "تسوق الآن",
            ctaLink: "/products",
            sticky: true,
            backgroundColor: "white",
            showSearch: true,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "تسوّق بذوق، عِش بتميّز",
            subheading: "أحدث المنتجات العالمية بأسعار منافسة — شحن سريع وإرجاع مجاني",
            ctaText: "تسوق الآن",
            ctaUrl: "/products",
            secondaryCtaText: "أحدث الوصولات",
            secondaryCtaUrl: "/new",
            badge: "شحن مجاني +٢٠٠ ريال",
            backgroundStyle: "light",
            alignment: "center",
          },
        },
        {
          type: "CategoriesGrid",
          props: {
            heading: "تصفح الفئات",
            items: [
              { name: "ملابس رجالية", image: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=400&q=80", href: "/men" },
              { name: "ملابس نسائية", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80", href: "/women" },
              { name: "الإكسسوارات", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", href: "/accessories" },
              { name: "العطور", image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80", href: "/perfumes" },
            ],
          },
        },
        {
          type: "ProductsFeatured",
          props: {
            heading: "منتجات مميزة",
            items: [
              { name: "حذاء رياضي", price: "٢٩٩ ريال", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80", badge: "جديد", oldPrice: "٣٩٩ ريال" },
              { name: "ساعة فاخرة", price: "٨٩٩ ريال", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80", badge: "مميز", oldPrice: "" },
              { name: "حقيبة جلدية", price: "٤٥٠ ريال", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80", badge: "تخفيض ٢٠٪", oldPrice: "٥٦٠ ريال" },
            ],
            ctaText: "تصفح جميع المنتجات",
            ctaUrl: "/products",
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "عروض حصرية",
            subheading: "اشترك في نشرتنا واحصل على خصم ١٥٪ على أول طلب",
            ctaText: "اشترك الآن",
            ctaUrl: "/newsletter",
            backgroundColor: "#1d4ed8",
          },
        },
        {
          type: "FooterComprehensive",
          props: {
            logoText: "متجر التميز",
            copyright: "2025 متجر التميز. جميع الحقوق محفوظة.",
            columns: [
              { heading: "المتجر", links: [{ label: "المنتجات", url: "/products" }, { label: "العروض", url: "/offers" }] },
              { heading: "الدعم", links: [{ label: "الشحن والإرجاع", url: "/shipping" }, { label: "تواصل معنا", url: "/contact" }] },
            ],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "متجر التميز" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 18. تأجير (معدات / أثاث)
  // ─────────────────────────────────────────────────────────
  {
    slug: "rental-homepage",
    nameAr: "شركة الإيجار الشامل",
    descriptionAr: "قالب لشركات تأجير المعدات والأثاث يعرض الكتالوج والأسعار مع نظام الحجز",
    category: "rental",
    businessTypes: ["rental"],
    previewImageUrl: "https://images.unsplash.com/photo-1603796846097-bee99e4a601f?w=1200&q=80",
    tags: ["تأجير", "معدات", "أثاث", "حجز"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 18,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "الإيجار الشامل",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "الكتالوج", url: "/catalog" },
              { label: "الأسعار", url: "/pricing" },
              { label: "احجز الآن", url: "/booking" },
            ],
            ctaText: "احجز الآن",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "كل ما تحتاجه بأقل تكلفة",
            subheading: "تأجير المعدات والأثاث والتجهيزات للمناسبات والأعمال — توصيل وتركيب وجمع بعد الانتهاء",
            ctaText: "تصفح الكتالوج",
            ctaUrl: "/catalog",
            secondaryCtaText: "احسب التكلفة",
            secondaryCtaUrl: "/calculator",
            backgroundStyle: "light",
            alignment: "center",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "خدماتنا",
            items: [
              { icon: "Box", title: "مجموعة واسعة", description: "آلاف القطع من الأثاث والمعدات وأدوات المناسبات جاهزة للإيجار" },
              { icon: "Truck", title: "توصيل وجمع", description: "ننقل المعدات ونركبها في الموقع ونجمعها فور انتهاء المناسبة" },
              { icon: "Shield", title: "ضمان الجودة", description: "كل قطعة معقمة ومفحوصة قبل التسليم — نضمن سلامة المعدات" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "احجز مبكراً",
            subheading: "توفر محدود في المواسم — احجز موعدك الآن وأمّن احتياجاتك",
            ctaText: "احجز الآن",
            ctaUrl: "/booking",
            backgroundColor: "#0369a1",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "الإيجار الشامل",
            copyright: "2025 شركة الإيجار الشامل.",
            links: [{ label: "الكتالوج", url: "/catalog" }, { label: "الأسعار", url: "/pricing" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "شركة الإيجار الشامل" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 19. تصوير
  // ─────────────────────────────────────────────────────────
  {
    slug: "photography-homepage",
    nameAr: "استوديو اللحظة",
    descriptionAr: "قالب فني لاستوديوهات التصوير يعرض الأعمال والباقات مع نظام الحجز",
    category: "photography",
    businessTypes: ["photography"],
    previewImageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&q=80",
    tags: ["تصوير", "استوديو", "مناسبات", "أفراح"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 19,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "استوديو اللحظة",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "أعمالنا", url: "/portfolio" },
              { label: "الباقات", url: "/packages" },
              { label: "احجز جلسة", url: "/booking" },
            ],
            ctaText: "احجز جلسة",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroGallery",
          props: {
            heading: "نصنع الذكريات الخالدة",
            subheading: "استوديو تصوير متخصص في المناسبات والأفراح والبورتريه — نلتقط أجمل لحظاتك بعين فنية لا تُنسى",
            ctaText: "احجز جلستك",
            ctaUrl: "/booking",
            images: [
              { url: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80", alt: "تصوير أفراح" },
              { url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", alt: "جلسة تصوير" },
              { url: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800&q=80", alt: "تصوير مناسبات" },
            ],
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "تخصصاتنا",
            items: [
              { icon: "Heart", title: "تصوير الأفراح", description: "نوثق كل لحظة من ليلة عمرك بأسلوب فني راقٍ يبقى معك للأبد" },
              { icon: "Camera", title: "تصوير البورتريه", description: "جلسات تصوير شخصية ومهنية بإضاءة استوديو احترافية" },
              { icon: "Building2", title: "تصوير الشركات", description: "تصوير المنتجات والفريق والفعاليات للشركات والعلامات التجارية" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "احجز جلستك الآن",
            subheading: "مواعيد محدودة — احجز مبكراً وأمّن يومك",
            ctaText: "احجز الآن",
            ctaUrl: "/booking",
            backgroundColor: "#111827",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "استوديو اللحظة",
            copyright: "2025 استوديو اللحظة.",
            links: [{ label: "أعمالنا", url: "/portfolio" }, { label: "احجز", url: "/booking" }],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }],
          },
        },
      ],
      root: { props: { title: "استوديو اللحظة" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 20. صيانة
  // ─────────────────────────────────────────────────────────
  {
    slug: "maintenance-homepage",
    nameAr: "شركة الإصلاح السريع",
    descriptionAr: "قالب موثوق لشركات الصيانة يعرض الخدمات وطلب الزيارة مع متابعة الطلب",
    category: "maintenance",
    businessTypes: ["maintenance"],
    previewImageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80",
    tags: ["صيانة", "إصلاح", "كهرباء", "سباكة"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 20,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "الإصلاح السريع",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "اطلب زيارة", url: "/request" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "اطلب زيارة",
            ctaLink: "/request",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "الإصلاح السريع في وقت قياسي",
            subheading: "فنيون معتمدون لجميع أعمال الصيانة المنزلية والتجارية — كهرباء، سباكة، تكييف، نجارة والمزيد",
            ctaText: "اطلب زيارة الآن",
            ctaUrl: "/request",
            secondaryCtaText: "تعرف على خدماتنا",
            secondaryCtaUrl: "/services",
            badge: "استجابة خلال ساعتين",
            backgroundStyle: "light",
            alignment: "center",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "خدماتنا",
            items: [
              { icon: "Zap", title: "الكهرباء", description: "تركيب وإصلاح الأسلاك والمفاتيح واللوحات الكهربائية بأيدي معتمدة" },
              { icon: "Droplets", title: "السباكة", description: "إصلاح تسربات المياه وتركيب الصنابير والمراحيض والخزانات" },
              { icon: "Wind", title: "التكييف", description: "تركيب وصيانة وتنظيف جميع أنواع مكيفات الهواء" },
              { icon: "Hammer", title: "النجارة", description: "إصلاح الأبواب والنوافذ والأثاث وتركيب الرفوف والخزائن" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "",
            items: [
              { value: "١٠,٠٠٠+", label: "طلب منجز" },
              { value: "ساعتان", label: "وقت الاستجابة" },
              { value: "٥٠+", label: "فني معتمد" },
              { value: "٩٧٪", label: "رضا العملاء" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "عطل مفاجئ؟ لا تقلق",
            subheading: "فريقنا متاح ٧ أيام — اطلب زيارة الآن",
            ctaText: "اطلب زيارة طارئة",
            ctaUrl: "/emergency",
            backgroundColor: "#ea580c",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "الإصلاح السريع",
            copyright: "2025 شركة الإصلاح السريع.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "اطلب زيارة", url: "/request" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "شركة الإصلاح السريع" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 21. ورشة / خدمات سيارات
  // ─────────────────────────────────────────────────────────
  {
    slug: "workshop-homepage",
    nameAr: "ورشة السرعة",
    descriptionAr: "قالب احترافي لورش السيارات والخدمات التقنية يعرض الخدمات وحجز المواعيد",
    category: "workshop",
    businessTypes: ["workshop"],
    previewImageUrl: "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=1200&q=80",
    tags: ["ورشة", "سيارات", "صيانة", "ميكانيك"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 21,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "ورشة السرعة",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "احجز موعد", url: "/booking" },
            ],
            ctaText: "احجز موعداً",
            ctaLink: "/booking",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "سيارتك بأيد أمينة",
            subheading: "ورشة متخصصة بأحدث الأجهزة التشخيصية وفنيين معتمدين — صيانة دورية، إصلاح، دهان وغيره بضمان كتابي",
            ctaText: "احجز موعداً",
            ctaUrl: "/booking",
            secondaryCtaText: "شاهد خدماتنا",
            secondaryCtaUrl: "/services",
            imageUrl: "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=900&q=80",
            imageAlt: "ورشة سيارات",
            imagePosition: "right",
            badge: "ضمان كتابي",
            mediaType: "image",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "خدماتنا",
            items: [
              { icon: "Settings", title: "الصيانة الدورية", description: "تغيير زيت، فلاتر، إطارات، فرامل — كل ما تحتاجه سيارتك" },
              { icon: "Cpu", title: "تشخيص الكتروني", description: "أحدث أجهزة الفحص الإلكتروني للكشف الدقيق عن الأعطال" },
              { icon: "Paintbrush", title: "الدهان والهيكل", description: "إصلاح الدهان وصناعة الهيكل بأحدث تقنيات وألوان دقيقة" },
              { icon: "Thermometer", title: "تكييف السيارة", description: "فحص وشحن وإصلاح أنظمة التكييف لجميع الموديلات" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "احجز موعد صيانة",
            subheading: "فحص أولي مجاني — احجز الآن ووفّر وقتك",
            ctaText: "احجز الآن",
            ctaUrl: "/booking",
            backgroundColor: "#1e293b",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "ورشة السرعة",
            copyright: "2025 ورشة السرعة.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "احجز", url: "/booking" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }, { platform: "instagram", url: "https://instagram.com" }],
          },
        },
      ],
      root: { props: { title: "ورشة السرعة" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 22. مغسلة
  // ─────────────────────────────────────────────────────────
  {
    slug: "laundry-homepage",
    nameAr: "مغسلة النظافة الفائقة",
    descriptionAr: "قالب بسيط لمغاسل الملابس يعرض الخدمات والأسعار مع نظام الاستلام والتوصيل",
    category: "laundry",
    businessTypes: ["laundry"],
    previewImageUrl: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1200&q=80",
    tags: ["مغسلة", "كوي", "تنظيف", "توصيل"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 22,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "النظافة الفائقة",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "الأسعار", url: "/pricing" },
              { label: "اطلب استلام", url: "/pickup" },
            ],
            ctaText: "اطلب استلام",
            ctaLink: "/pickup",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "ملابسك نظيفة — بلا عناء",
            subheading: "مغسلة احترافية — نستلم من باب بيتك ونوصل مكوياً وعطراً في نفس اليوم",
            ctaText: "اطلب استلاماً الآن",
            ctaUrl: "/pickup",
            secondaryCtaText: "شاهد خدماتنا",
            secondaryCtaUrl: "/services",
            badge: "توصيل في ٢٤ ساعة",
            backgroundStyle: "light",
            alignment: "center",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "لماذا تختارنا؟",
            items: [
              { icon: "Truck", title: "استلام وتوصيل مجاني", description: "نصل إليك — استلام من الباب وتوصيل مجاني لجميع المناطق" },
              { icon: "Clock", title: "نفس اليوم", description: "خدمة الطوارئ — استلام وتسليم خلال ٢٤ ساعة أو أقل" },
              { icon: "Sparkles", title: "نظافة مضمونة", description: "مواد تنظيف عالية الجودة لا تضر بالأقمشة مع ضمان استعادة النظافة" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "اطلب استلاماً الآن",
            subheading: "أول طلب بخصم ٢٠٪",
            ctaText: "اطلب الآن",
            ctaUrl: "/pickup",
            backgroundColor: "#0891b2",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "النظافة الفائقة",
            copyright: "2025 مغسلة النظافة الفائقة.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "الأسعار", url: "/pricing" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "مغسلة النظافة الفائقة" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 23. طباعة
  // ─────────────────────────────────────────────────────────
  {
    slug: "printing-homepage",
    nameAr: "مطبعة الإبداع",
    descriptionAr: "قالب احترافي لمراكز الطباعة يعرض الخدمات وطلب الأسعار مع رفع الملفات",
    category: "printing",
    businessTypes: ["printing"],
    previewImageUrl: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=1200&q=80",
    tags: ["طباعة", "دعاية", "بنرات", "بروشور"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 23,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "مطبعة الإبداع",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "الأسعار", url: "/pricing" },
              { label: "اطلب الآن", url: "/order" },
            ],
            ctaText: "اطلب الآن",
            ctaLink: "/order",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "طباعة بألوان تلفت الأنظار",
            subheading: "مطبعة رقمية وأوفست بأعلى دقة — بنرات، بروشورات، بطاقات أعمال، تصميم واطباعة في يوم واحد",
            ctaText: "اطلب عرض أسعار",
            ctaUrl: "/quote",
            secondaryCtaText: "تصفح خدماتنا",
            secondaryCtaUrl: "/services",
            badge: "توصيل في ٢٤ ساعة",
            backgroundStyle: "light",
            alignment: "center",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "خدمات الطباعة",
            items: [
              { icon: "FileText", title: "بروشور وكتالوج", description: "طباعة بروشورات واضحة وكتالوجات فاخرة للشركات والمعارض" },
              { icon: "CreditCard", title: "بطاقات أعمال", description: "بطاقات أعمال فاخرة بتشطيبات UV وبروز وورق فاخر" },
              { icon: "Layout", title: "بنرات ولافتات", description: "طباعة بنرات كبيرة وصغيرة بألوان حية تدوم طويلاً" },
              { icon: "Package", title: "تصميم وطباعة", description: "فريق تصميم متكامل يصمم ويطبع كل ما تحتاجه" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "اطلب عرض أسعار الآن",
            subheading: "أرسل ملفاتك واحصل على سعر فوري",
            ctaText: "اطلب الآن",
            ctaUrl: "/quote",
            backgroundColor: "#7c3aed",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "مطبعة الإبداع",
            copyright: "2025 مطبعة الإبداع.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "الأسعار", url: "/pricing" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }, { platform: "instagram", url: "https://instagram.com" }],
          },
        },
      ],
      root: { props: { title: "مطبعة الإبداع" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 24. لوجستيات / شحن
  // ─────────────────────────────────────────────────────────
  {
    slug: "logistics-homepage",
    nameAr: "شركة السرعة للشحن",
    descriptionAr: "قالب لشركات الشحن والتوصيل يعرض الخدمات وتتبع الطلبات مع طلب الشحن",
    category: "logistics",
    businessTypes: ["logistics"],
    previewImageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80",
    tags: ["شحن", "توصيل", "لوجستيات", "تتبع"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 24,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "السرعة للشحن",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "تتبع شحنتك", url: "/track" },
              { label: "اطلب شحناً", url: "/ship" },
            ],
            ctaText: "اطلب شحناً",
            ctaLink: "/ship",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "شحن سريع وآمن في كل مكان",
            subheading: "نوصل شحناتك لجميع مناطق المملكة خلال ٢٤-٤٨ ساعة — تتبع لحظي ومسؤولية كاملة",
            ctaText: "اطلب شحناً الآن",
            ctaUrl: "/ship",
            secondaryCtaText: "تتبع شحنتك",
            secondaryCtaUrl: "/track",
            badge: "تتبع لحظي",
            backgroundStyle: "light",
            alignment: "center",
          },
        },
        {
          type: "Features3col",
          props: {
            heading: "لماذا نحن؟",
            items: [
              { icon: "Truck", title: "تغطية شاملة", description: "نصل لجميع مناطق ومحافظات المملكة العربية السعودية" },
              { icon: "MapPin", title: "تتبع لحظي", description: "تتبع شحنتك لحظة بلحظة عبر تطبيقنا أو الموقع" },
              { icon: "Shield", title: "تأمين كامل", description: "جميع الشحنات مؤمنة — نضمن وصولها سليمة أو نعوضك كاملاً" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "اشحن معنا اليوم",
            subheading: "أسعار تنافسية وخدمة لا تُنسى",
            ctaText: "اطلب شحناً",
            ctaUrl: "/ship",
            backgroundColor: "#1d4ed8",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "السرعة للشحن",
            copyright: "2025 شركة السرعة للشحن.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "تتبع", url: "/track" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "شركة السرعة للشحن" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 25. مقاولات / بناء
  // ─────────────────────────────────────────────────────────
  {
    slug: "construction-homepage",
    nameAr: "مجموعة البنيان للمقاولات",
    descriptionAr: "قالب احترافي لشركات المقاولات يعرض المشاريع والخدمات مع طلب العرض",
    category: "construction",
    businessTypes: ["construction"],
    previewImageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80",
    tags: ["مقاولات", "بناء", "تشييد", "مشاريع"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 25,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "مجموعة البنيان",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "مشاريعنا", url: "/projects" },
              { label: "اطلب عرضاً", url: "/quote" },
            ],
            ctaText: "اطلب عرض سعر",
            ctaLink: "/quote",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "نبني أحلامك على أرض الواقع",
            subheading: "شركة مقاولات متكاملة — بناء، تشطيب، ترميم، وإدارة مشاريع بمعايير عالمية وخبرة ٢٠ عاماً",
            ctaText: "اطلب عرض سعر",
            ctaUrl: "/quote",
            secondaryCtaText: "شاهد مشاريعنا",
            secondaryCtaUrl: "/projects",
            imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=80",
            imageAlt: "مشاريع بناء",
            imagePosition: "right",
            badge: "٢٠ عاماً خبرة",
            mediaType: "image",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "خدماتنا",
            items: [
              { icon: "Building2", title: "البناء والتشييد", description: "تنفيذ المباني السكنية والتجارية وفق أعلى معايير الجودة" },
              { icon: "Paintbrush", title: "التشطيب والديكور", description: "تشطيبات فاخرة وديكورات داخلية بلمسة معمارية متميزة" },
              { icon: "Wrench", title: "الترميم والتجديد", description: "ترميم وتجديد المباني القديمة لتعود بحلة جديدة" },
              { icon: "ClipboardList", title: "إدارة المشاريع", description: "إدارة متكاملة للمشاريع من الخطة حتى التسليم بضمان الجودة" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "",
            items: [
              { value: "٥٠٠+", label: "مشروع منجز" },
              { value: "٢٠", label: "عاماً من الخبرة" },
              { value: "١,٠٠٠+", label: "عميل راضٍ" },
              { value: "١٠٠٪", label: "التزام بالمواعيد" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "ابدأ مشروعك اليوم",
            subheading: "تواصل معنا للحصول على عرض مجاني",
            ctaText: "اطلب عرضاً مجانياً",
            ctaUrl: "/quote",
            backgroundColor: "#92400e",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "مجموعة البنيان",
            copyright: "2025 مجموعة البنيان للمقاولات.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "مشاريعنا", url: "/projects" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }, { platform: "instagram", url: "https://instagram.com" }],
          },
        },
      ],
      root: { props: { title: "مجموعة البنيان للمقاولات" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 26. خدمات رقمية / تصميم
  // ─────────────────────────────────────────────────────────
  {
    slug: "digital-services-homepage",
    nameAr: "وكالة بيكسل الرقمية",
    descriptionAr: "قالب عصري لوكالات التصميم والتسويق الرقمي يعرض الخدمات والأعمال مع طلب عرض",
    category: "digital_services",
    businessTypes: ["digital_services"],
    previewImageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
    tags: ["تصميم", "تسويق رقمي", "وكالة", "برمجة"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 26,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "بيكسل الرقمية",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "أعمالنا", url: "/portfolio" },
              { label: "اطلب عرضاً", url: "/quote" },
            ],
            ctaText: "اطلب عرضاً",
            ctaLink: "/quote",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "نبني حضورك الرقمي بالكامل",
            subheading: "وكالة رقمية متكاملة — تصميم مواقع، تطبيقات، تسويق إلكتروني، SEO وهوية بصرية لتنمية أعمالك",
            ctaText: "اطلب عرضاً مجانياً",
            ctaUrl: "/quote",
            secondaryCtaText: "شاهد أعمالنا",
            secondaryCtaUrl: "/portfolio",
            badge: "١٠٠+ مشروع ناجح",
            backgroundStyle: "dark",
            alignment: "center",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "خدماتنا الرقمية",
            items: [
              { icon: "Globe", title: "تصميم المواقع", description: "مواقع ويب احترافية سريعة ومتجاوبة تعكس هوية علامتك" },
              { icon: "Smartphone", title: "تطبيقات الجوال", description: "تطبيقات iOS وAndroid بواجهات سلسة وتجربة مستخدم ممتازة" },
              { icon: "TrendingUp", title: "التسويق الإلكتروني", description: "إدارة حسابات التواصل الاجتماعي وإعلانات مدفوعة وSEO" },
              { icon: "Palette", title: "الهوية البصرية", description: "تصميم لوغو وهوية بصرية متكاملة تميز علامتك في السوق" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "",
            items: [
              { value: "١٠٠+", label: "مشروع منجز" },
              { value: "٨٠+", label: "عميل راضٍ" },
              { value: "٥", label: "سنوات خبرة" },
              { value: "٣", label: "جوائز دولية" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "ابدأ مشروعك الرقمي",
            subheading: "استشارة مجانية — تواصل معنا اليوم",
            ctaText: "اطلب استشارة مجانية",
            ctaUrl: "/quote",
            backgroundColor: "#4f46e5",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "بيكسل الرقمية",
            copyright: "2025 وكالة بيكسل الرقمية.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "أعمالنا", url: "/portfolio" }],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "twitter", url: "https://twitter.com" }, { platform: "linkedin", url: "https://linkedin.com" }],
          },
        },
      ],
      root: { props: { title: "وكالة بيكسل الرقمية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 27. تقنية / برمجيات
  // ─────────────────────────────────────────────────────────
  {
    slug: "technology-homepage",
    nameAr: "شركة نور التقنية",
    descriptionAr: "قالب تقني لشركات البرمجيات والحلول التقنية يعرض المنتجات والتسعير",
    category: "technology",
    businessTypes: ["technology"],
    previewImageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
    tags: ["تقنية", "برمجيات", "SaaS", "حلول"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 27,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "نور التقنية",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "المنتجات", url: "/products" },
              { label: "التسعير", url: "/pricing" },
              { label: "ابدأ مجاناً", url: "/signup" },
            ],
            ctaText: "ابدأ مجاناً",
            ctaLink: "/signup",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroMinimal",
          props: {
            heading: "حلول تقنية تنمّي أعمالك",
            subheading: "برمجيات وأنظمة ذكية للشركات — أتمتة، تحليلات، إدارة العمليات كلها في منصة واحدة سهلة الاستخدام",
            ctaText: "ابدأ التجربة المجانية",
            ctaUrl: "/signup",
            secondaryCtaText: "تعرف على المنتجات",
            secondaryCtaUrl: "/products",
            badge: "تجربة مجانية ١٤ يوماً",
            backgroundStyle: "dark",
            alignment: "center",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "لماذا نور التقنية؟",
            items: [
              { icon: "Zap", title: "سريع وموثوق", description: "وقت تشغيل ٩٩.٩٪ مع أداء عالٍ يتعامل مع ملايين العمليات يومياً" },
              { icon: "Shield", title: "أمان عالي", description: "تشفير بيانات من نهاية لنهاية مع شهادات أمان دولية معتمدة" },
              { icon: "BarChart3", title: "تحليلات متقدمة", description: "لوحة تحكم تحليلية تعطيك رؤية كاملة عن أداء أعمالك" },
              { icon: "Puzzle", title: "تكاملات سهلة", description: "تتكامل مع أكثر من ١٠٠ تطبيق وأداة تستخدمها يومياً" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "ابدأ تجربتك المجانية",
            subheading: "١٤ يوماً مجاناً — لا بطاقة ائتمانية مطلوبة",
            ctaText: "ابدأ الآن مجاناً",
            ctaUrl: "/signup",
            backgroundColor: "#0f172a",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "نور التقنية",
            copyright: "2025 شركة نور التقنية.",
            links: [{ label: "المنتجات", url: "/products" }, { label: "التسعير", url: "/pricing" }, { label: "الدعم", url: "/support" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }, { platform: "linkedin", url: "https://linkedin.com" }],
          },
        },
      ],
      root: { props: { title: "شركة نور التقنية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 28. مدرسة / تعليم (مدرسة خاصة)
  // ─────────────────────────────────────────────────────────
  {
    slug: "school-homepage",
    nameAr: "مدرسة المستقبل الأهلية",
    descriptionAr: "قالب تعليمي للمدارس الخاصة يعرض المناهج والأنشطة مع نموذج التسجيل",
    category: "school",
    businessTypes: ["school"],
    previewImageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80",
    tags: ["مدرسة", "تعليم", "تسجيل", "طلاب"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 28,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "مدرسة المستقبل",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "عن المدرسة", url: "/about" },
              { label: "البرامج", url: "/programs" },
              { label: "التسجيل", url: "/register" },
            ],
            ctaText: "سجّل الآن",
            ctaLink: "/register",
            sticky: true,
            backgroundColor: "white",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "نبني جيل الغد بعلم اليوم",
            subheading: "مدرسة أهلية متميزة تجمع بين المنهج الوطني والتقنية الحديثة — بيئة تعليمية آمنة تنمي الإبداع وتبني الشخصية",
            ctaText: "التسجيل للعام الجديد",
            ctaUrl: "/register",
            secondaryCtaText: "تعرف على المدرسة",
            secondaryCtaUrl: "/about",
            imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=900&q=80",
            imageAlt: "مدرسة المستقبل",
            imagePosition: "right",
            badge: "تسجيل مفتوح",
            mediaType: "image",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "مميزاتنا التعليمية",
            items: [
              { icon: "BookOpen", title: "منهج متكامل", description: "المنهج الوطني مدعوماً بالإثراء اللغوي والرياضي والعلمي" },
              { icon: "Monitor", title: "تعليم رقمي", description: "فصول ذكية بأحدث التقنيات ومنصة تعليمية إلكترونية" },
              { icon: "Users", title: "كوادر مؤهلة", description: "معلمون حاصلون على أعلى الشهادات وتدريب مستمر" },
              { icon: "Heart", title: "رعاية شاملة", description: "دعم نفسي وتربوي متكامل للطلاب طوال العام الدراسي" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "سجّل ابنك للعام الدراسي الجديد",
            subheading: "مقاعد محدودة — التسجيل المبكر يضمن مقعدك",
            ctaText: "سجّل الآن",
            ctaUrl: "/register",
            backgroundColor: "#1e40af",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "مدرسة المستقبل",
            copyright: "2025 مدرسة المستقبل الأهلية.",
            links: [{ label: "عن المدرسة", url: "/about" }, { label: "التسجيل", url: "/register" }],
            socialLinks: [{ platform: "twitter", url: "https://twitter.com" }, { platform: "instagram", url: "https://instagram.com" }],
          },
        },
      ],
      root: { props: { title: "مدرسة المستقبل الأهلية" } },
    },
  },

  // ─────────────────────────────────────────────────────────
  // 29. منظم فعاليات
  // ─────────────────────────────────────────────────────────
  {
    slug: "event-organizer-homepage",
    nameAr: "شركة لحظة للتنظيم والإنتاج",
    descriptionAr: "قالب فاخر لمنظمي الفعاليات والإنتاج الإعلامي يعرض الخدمات والأعمال",
    category: "event_organizer",
    businessTypes: ["event_organizer"],
    previewImageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
    tags: ["فعاليات", "مؤتمرات", "حفلات", "إنتاج"],
    isFeatured: false,
    isPublished: true,
    sortOrder: 29,
    data: {
      content: [
        {
          type: "HeaderSimple",
          props: {
            logoText: "لحظة للتنظيم",
            logoUrl: "/",
            links: [
              { label: "الرئيسية", url: "/", isActive: true },
              { label: "خدماتنا", url: "/services" },
              { label: "أعمالنا", url: "/portfolio" },
              { label: "تواصل معنا", url: "/contact" },
            ],
            ctaText: "اطلب عرضاً",
            ctaLink: "/quote",
            sticky: true,
            backgroundColor: "dark",
            showSearch: false,
          },
        },
        {
          type: "HeroSplit",
          props: {
            heading: "نصنع الفعاليات الاستثنائية",
            subheading: "تنظيم متكامل للمؤتمرات والحفلات وإطلاق المنتجات — تصميم، لوجستيات، ضيافة، بث مباشر ولحظات لا تُنسى",
            ctaText: "اطلب عرض سعر",
            ctaUrl: "/quote",
            secondaryCtaText: "شاهد أعمالنا",
            secondaryCtaUrl: "/portfolio",
            imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80",
            imageAlt: "فعالية فاخرة",
            imagePosition: "right",
            badge: "٣٠٠+ فعالية ناجحة",
            mediaType: "image",
          },
        },
        {
          type: "Features4cards",
          props: {
            heading: "خدماتنا",
            items: [
              { icon: "Mic2", title: "المؤتمرات والمعارض", description: "تنظيم كامل للمؤتمرات والمعارض التجارية بكل تفاصيلها" },
              { icon: "Music", title: "الحفلات والأمسيات", description: "حفلات موسيقية وأمسيات فنية وحفلات الشركات" },
              { icon: "Star", title: "حفلات الزفاف", description: "تنظيم حفلات الزفاف الفاخرة بلمسة إبداعية لا تُنسى" },
              { icon: "Video", title: "الإنتاج الإعلامي", description: "تغطية إعلامية شاملة وبث مباشر واحترافي" },
            ],
          },
        },
        {
          type: "StatsSimple",
          props: {
            heading: "",
            items: [
              { value: "٣٠٠+", label: "فعالية ناجحة" },
              { value: "٥٠,٠٠٠+", label: "ضيف خدمناهم" },
              { value: "١٢", label: "عاماً من التميز" },
              { value: "٩٩٪", label: "رضا العملاء" },
            ],
          },
        },
        {
          type: "CTAColorBg",
          props: {
            heading: "خطط فعاليتك القادمة",
            subheading: "تواصل معنا للحصول على عرض مخصص",
            ctaText: "اطلب عرضاً الآن",
            ctaUrl: "/quote",
            backgroundColor: "#701a75",
          },
        },
        {
          type: "FooterMinimal",
          props: {
            logoText: "لحظة للتنظيم",
            copyright: "2025 شركة لحظة للتنظيم والإنتاج.",
            links: [{ label: "خدماتنا", url: "/services" }, { label: "أعمالنا", url: "/portfolio" }],
            socialLinks: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "twitter", url: "https://twitter.com" }],
          },
        },
      ],
      root: { props: { title: "شركة لحظة للتنظيم والإنتاج" } },
    },
  },
];
