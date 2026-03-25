import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative } from "@/hooks/usePlatform";

export async function tap() {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function success() {
  if (!isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}

export async function medium() {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}
