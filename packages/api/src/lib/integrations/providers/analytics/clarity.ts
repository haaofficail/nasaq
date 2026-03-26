import { IntegrationProvider } from "../../base";

export class MicrosoftClarityProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // Microsoft Clarity is a client-side analytics tool — no server-side API to test
    const projectId = this.credentials.project_id ?? this.credentials.api_key;
    if (!projectId) return { ok: false, message: "Project ID مطلوب" };
    return { ok: true, message: "تم حفظ الإعدادات" };
  }
}
