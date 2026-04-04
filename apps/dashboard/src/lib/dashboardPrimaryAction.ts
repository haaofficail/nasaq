import {
  Plus, Calendar, BedDouble, Car, Camera,
  Utensils, Package, Wrench, Scissors,
  Flower2, Building2, ShoppingBag, Zap,
  Truck, Code2, CalendarCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PrimaryAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

const DEFAULT_ACTION: PrimaryAction = {
  label: "حجز جديد",
  href: "/dashboard/bookings/new",
  icon: Plus,
  description: "ابدأ بإضافة أول حجز لمنشأتك",
};

const PRIMARY_ACTIONS: Record<string, PrimaryAction> = {
  // Beauty & Wellness
  salon: {
    label: "حجز موعد",
    href: "/dashboard/bookings/new",
    icon: Scissors,
    description: "سجّل أول حجز لعميلك",
  },
  barber: {
    label: "حجز موعد",
    href: "/dashboard/bookings/new",
    icon: Scissors,
    description: "سجّل أول حجز لعميلك",
  },
  spa: {
    label: "حجز جلسة",
    href: "/dashboard/bookings/new",
    icon: Zap,
    description: "أضف أول جلسة سبا",
  },
  fitness: {
    label: "تسجيل اشتراك",
    href: "/dashboard/bookings/new",
    icon: Zap,
    description: "سجّل أول اشتراك في الصالة",
  },

  // Food & Beverage
  restaurant: {
    label: "حجز طاولة",
    href: "/dashboard/bookings/new",
    icon: Utensils,
    description: "افتح أول حجز في المطعم",
  },
  cafe: {
    label: "حجز طاولة",
    href: "/dashboard/bookings/new",
    icon: Utensils,
    description: "ابدأ باستقبال الحجوزات",
  },
  bakery: {
    label: "طلب جديد",
    href: "/dashboard/bookings/new",
    icon: ShoppingBag,
    description: "سجّل أول طلب من العميل",
  },
  catering: {
    label: "طلب تموين",
    href: "/dashboard/bookings/new",
    icon: Utensils,
    description: "سجّل أول طلب ضيافة",
  },

  // Specialty
  flower_shop: {
    label: "طلب ورود",
    href: "/dashboard/flower-orders",
    icon: Flower2,
    description: "سجّل أول طلب تنسيق زهور",
  },

  // Accommodation
  hotel: {
    label: "حجز غرفة",
    href: "/dashboard/hotel",
    icon: BedDouble,
    description: "ابدأ بتسجيل أول نزيل",
  },

  // Rentals
  car_rental: {
    label: "تأجير سيارة",
    href: "/dashboard/car-rental",
    icon: Car,
    description: "سجّل أول عقد تأجير",
  },
  rental: {
    label: "عقد تأجير",
    href: "/dashboard/bookings/new",
    icon: Package,
    description: "ابدأ بتأجير أول أصل",
  },

  // Real Estate
  real_estate: {
    label: "عقار جديد",
    href: "/dashboard/property",
    icon: Building2,
    description: "أضف أول عقار للنظام",
  },

  // Retail
  retail: {
    label: "بيع منتج",
    href: "/dashboard/pos",
    icon: ShoppingBag,
    description: "ابدأ بنقطة البيع الآن",
  },

  // Professional Services
  photography: {
    label: "حجز جلسة",
    href: "/dashboard/bookings/new",
    icon: Camera,
    description: "سجّل أول جلسة تصوير",
  },
  printing: {
    label: "طلب طباعة",
    href: "/dashboard/bookings/new",
    icon: Package,
    description: "سجّل أول طلب طباعة",
  },
  laundry: {
    label: "طلب غسيل",
    href: "/dashboard/bookings/new",
    icon: Package,
    description: "سجّل أول طلب من العميل",
  },
  maintenance: {
    label: "طلب صيانة",
    href: "/dashboard/bookings/new",
    icon: Wrench,
    description: "ابدأ باستقبال طلبات الصيانة",
  },
  workshop: {
    label: "طلب ورشة",
    href: "/dashboard/bookings/new",
    icon: Wrench,
    description: "سجّل أول طلب شغل",
  },

  // Events
  events: {
    label: "حجز فعالية",
    href: "/dashboard/bookings/new",
    icon: CalendarCheck,
    description: "سجّل أول حجز فعالية",
  },
  event_organizer: {
    label: "حجز مناسبة",
    href: "/dashboard/bookings/new",
    icon: Calendar,
    description: "ابدأ بتنظيم أول مناسبة",
  },

  // Tech & Digital
  digital_services: {
    label: "طلب خدمة",
    href: "/dashboard/bookings/new",
    icon: Code2,
    description: "سجّل أول طلب خدمة رقمية",
  },
  technology: {
    label: "طلب خدمة",
    href: "/dashboard/bookings/new",
    icon: Code2,
    description: "ابدأ باستقبال طلبات التقنية",
  },

  // Trade & Logistics
  logistics: {
    label: "طلب شحن",
    href: "/dashboard/bookings/new",
    icon: Truck,
    description: "سجّل أول طلب لوجستي",
  },
  construction: {
    label: "مشروع جديد",
    href: "/dashboard/bookings/new",
    icon: Wrench,
    description: "أضف أول مشروع مقاولات",
  },

  // Default / General
  general: DEFAULT_ACTION,
};

export function getDashboardPrimaryAction(businessType: string): PrimaryAction {
  return PRIMARY_ACTIONS[businessType] ?? DEFAULT_ACTION;
}
