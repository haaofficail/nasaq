/**
 * usePlatformConfig — يجلب إعدادات المنصة (شعار، اسم، لون) ويُطبّقها
 *
 * البنية:
 * - _cached:      كاش في الذاكرة — يُعاد جلبه عند invalidate
 * - localStorage: كاش دائم — يُقرأ فوراً عند أي reload
 * - _subscribers: كل المكونات المحملة حالياً — تُبلَّغ عند أي تغيير
 */
import { useEffect, useState } from "react";
import { DEFAULT_PLATFORM_LOGO } from "@/lib/branding";

export interface PlatformConfig {
  platformName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
}

// v2: force-busts old cache that may contain "نسق" (stale platform name)
const STORAGE_KEY = "nasaq_platform_config_v2";

export const PLATFORM_NAME = "ترميز OS";
export const PLATFORM_LOGO = DEFAULT_PLATFORM_LOGO;

const DEFAULT_CONFIG: PlatformConfig = {
  platformName: PLATFORM_NAME,
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#5b9bd5",
  supportEmail: "info@tarmizos.com",
  supportPhone: "0532064321",
};

// قراءة الكاش من localStorage عند أول تحميل
function readStoredConfig(): PlatformConfig | null {
  try {
    // مسح الـ key القديم (v1) الذي قد يحتوي "نسق"
    localStorage.removeItem("nasaq_platform_config");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlatformConfig;
  } catch {
    return null;
  }
}

function writeStoredConfig(config: PlatformConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}
}

// تطبيق الـ favicon على المتصفح
function applyFavicon(url: string | null) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (link.href !== url) link.href = url;
}

let _cached: PlatformConfig | null = readStoredConfig();
let _fetching = false;
const _subscribers = new Set<(c: PlatformConfig) => void>();

function notifyAll(config: PlatformConfig) {
  _subscribers.forEach(fn => fn(config));
}

async function fetchConfig() {
  if (_fetching) return;
  _fetching = true;
  try {
    const res = await fetch("/api/v1/platform-config/public");
    if (res.ok) {
      const json = await res.json();
      // Only override defaults with non-null values from the API
      const overrides = Object.fromEntries(
        Object.entries(json.data as Partial<PlatformConfig>).filter(([, v]) => v !== null && v !== undefined)
      );
      const fresh: PlatformConfig = { ...DEFAULT_CONFIG, ...overrides };
      _cached = fresh;
      writeStoredConfig(fresh);
      applyFavicon(fresh.faviconUrl);
      notifyAll(fresh);
    } else {
      if (!_cached) { _cached = DEFAULT_CONFIG; notifyAll(_cached); }
    }
  } catch {
    if (!_cached) { _cached = DEFAULT_CONFIG; notifyAll(_cached); }
  } finally {
    _fetching = false;
  }
}

export function usePlatformConfig(): PlatformConfig {
  const [config, setConfig] = useState<PlatformConfig>(_cached ?? DEFAULT_CONFIG);

  useEffect(() => {
    _subscribers.add(setConfig);

    // طبّق الكاش الموجود فوراً (من localStorage أو الذاكرة)
    if (_cached) {
      setConfig(_cached);
      applyFavicon(_cached.faviconUrl);
    }

    // دائماً اجلب أحدث إصدار في الخلفية
    fetchConfig();

    return () => {
      _subscribers.delete(setConfig);
    };
  }, []);

  return config;
}

/** استدعها بعد أي تغيير من الأدمن — تُعيد الجلب وتُبلّغ جميع المكونات فوراً */
export function invalidatePlatformConfig() {
  _cached = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  fetchConfig();
}
