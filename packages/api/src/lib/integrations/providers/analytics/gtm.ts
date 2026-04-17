import { IntegrationProvider } from "../../base";

export class GTMProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // GTM is a client-side tag manager — no server-side API to test
    const containerId = this.credentials.container_id ?? this.credentials.api_key;
    if (!containerId) return { ok: false, message: "Container ID مطلوب" };
    return { ok: true, message: "تم حفظ الإعدادات (التحقق الفعلي قيد التطوير)" };
  }
}
