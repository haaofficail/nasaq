import { useMemo } from "react";
import { getBusinessConfig, type BusinessConfig, type BusinessType } from "@nasaq/shared";
import { useOrgContext } from "@/hooks/useOrgContext";

/**
 * Returns the BusinessConfig for the current tenant's business type.
 * Falls back to "general" if type is unknown or context is loading.
 */
export function useBusiness(): BusinessConfig {
  const { context } = useOrgContext();

  return useMemo(() => {
    const type = (context?.businessType ?? "") as BusinessType;
    return getBusinessConfig(type);
  }, [context?.businessType]);
}
