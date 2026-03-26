import { IntegrationProvider } from "../../base";

export class OneSignalProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const { app_id, api_key } = this.credentials;
      if (!app_id || !api_key) return { ok: false, message: "app_id و api_key مطلوبان" };
      const res = await fetch(`https://onesignal.com/api/v1/apps/${app_id}`, {
        headers: { Authorization: `Basic ${api_key}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
