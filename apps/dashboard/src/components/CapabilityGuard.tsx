/**
 * CapabilityGuard — wraps a route and shows an access-denied screen
 * if the required feature flag is not enabled for the current org.
 *
 * Usage:
 *   <CapabilityGuard capability="page_builder_v2">
 *     <PagesV2Page />
 *   </CapabilityGuard>
 */
import React from "react";
import { Lock } from "lucide-react";
import { useCapability } from "@/hooks/useCapability";

interface Props {
  capability: string;
  children: React.ReactNode;
}

export function CapabilityGuard({ capability, children }: Props) {
  const { isEnabled, loading } = useCapability();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isEnabled(capability)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Lock className="w-7 h-7 text-gray-300" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-700">هذه الميزة غير متاحة حالياً</p>
          <p className="text-sm text-gray-400 mt-1">
            تواصل مع فريق الدعم لتفعيل هذه الميزة لمنشأتك
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
