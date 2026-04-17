import { IntegrationProvider } from "../../base";

export class QuickBooksProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // TODO: implement OAuth flow
    const key = this.credentials.access_token ?? this.credentials.api_key;
    if (!key) return { ok: false, message: "رمز الوصول مطلوب" };
    return { ok: true, message: "تم حفظ الإعدادات (التحقق الفعلي قيد التطوير)" };
  }
}
