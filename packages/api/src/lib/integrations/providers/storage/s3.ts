import { IntegrationProvider } from "../../base";

export class AWSS3Provider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // TODO: implement actual S3 API call
    const key = this.credentials.access_key_id ?? this.credentials.api_key;
    if (!key) return { ok: false, message: "مفتاح الوصول مطلوب" };
    return { ok: true, message: "تم حفظ الإعدادات (التحقق الفعلي قيد التطوير)" };
  }
}
