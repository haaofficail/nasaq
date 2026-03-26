import { IntegrationProvider } from "../../base";

export class GCSProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // TODO: implement actual GCS API call
    const key = this.credentials.api_key ?? this.credentials.access_token;
    if (!key) return { ok: false, message: "مفتاح API مطلوب" };
    return { ok: true, message: "تم حفظ الإعدادات" };
  }
}
