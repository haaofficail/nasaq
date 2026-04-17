import { IntegrationProvider } from "../../base";

export class HungerStationProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // TODO: implement actual API call
    const key = this.credentials.api_key ?? this.credentials.access_token ?? this.credentials.api_token;
    if (!key) return { ok: false, message: "مفتاح API مطلوب" };
    return { ok: true, message: "تم حفظ الإعدادات (التحقق الفعلي قيد التطوير)" };
  }
}
