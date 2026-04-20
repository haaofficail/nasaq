/**
 * Shared icon utility for Features blocks (Day 12)
 * Uses lucide-react with a string→component map for Puck select fields.
 */
import React from "react";
import {
  Shield, Truck, Headphones, BarChart2, Star,
  Zap, CheckCircle, Heart, Gift, Globe,
  Lock, CreditCard, Package, Users, Clock,
  Award, Sparkles, Leaf, MapPin, Phone,
} from "lucide-react";

type LucideComp = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const ICON_MAP: Record<string, LucideComp> = {
  "shield":        Shield,
  "truck":         Truck,
  "headphones":    Headphones,
  "bar-chart-2":   BarChart2,
  "star":          Star,
  "zap":           Zap,
  "check-circle":  CheckCircle,
  "heart":         Heart,
  "gift":          Gift,
  "globe":         Globe,
  "lock":          Lock,
  "credit-card":   CreditCard,
  "package":       Package,
  "users":         Users,
  "clock":         Clock,
  "award":         Award,
  "sparkles":      Sparkles,
  "leaf":          Leaf,
  "map-pin":       MapPin,
  "phone":         Phone,
};

export function FeatureIcon({
  name,
  size = 24,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Comp: LucideComp = ICON_MAP[name] ?? Shield;
  return <Comp size={size} strokeWidth={1.5} className={className} />;
}

export const ICON_OPTIONS = Object.keys(ICON_MAP).map((k) => ({
  value: k,
  label: k,
}));
