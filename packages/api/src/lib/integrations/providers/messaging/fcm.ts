import { IntegrationProvider } from "../../base";

export class FCMProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // TODO: implement actual API call
    const key = this.credentials.server_key;
    if (!key) return { ok: false, message: "مفتاح السيرفر مطلوب" };
    return { ok: true, message: "تم حفظ الإعدادات (التحقق الفعلي قيد التطوير)" };
  }
}
