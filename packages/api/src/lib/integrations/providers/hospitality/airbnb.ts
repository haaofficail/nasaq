import { IntegrationProvider } from "../../base";

export class AirbnbProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const url = this.credentials.ical_url;
    if (!url) return { ok: false, message: "رابط iCal مطلوب" };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      const text = await res.text();
      return { ok: text.includes("BEGIN:VCALENDAR") };
    } catch {
      return { ok: false, message: "فشل جلب ملف iCal" };
    }
  }
}
