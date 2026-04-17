import { IntegrationProvider } from "../../base";

export class GathernProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // Gathern supports both iCal sync and API key
    const key = this.credentials.api_key ?? this.credentials.ical_url;
    if (!key) return { ok: false, message: "مفتاح API أو رابط iCal مطلوب" };
    return { ok: true, message: "تم حفظ الإعدادات (التحقق الفعلي قيد التطوير)" };
  }
}
