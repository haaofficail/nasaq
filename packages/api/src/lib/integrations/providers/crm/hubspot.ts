import { IntegrationProvider } from "../../base";

export class HubSpotProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
        headers: { Authorization: `Bearer ${this.credentials.api_key}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
