import { IntegrationProvider } from "../../base";

export class ChannexProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const { api_key, property_id } = this.credentials;
      if (!api_key || !property_id) return { ok: false, message: "api_key و property_id مطلوبان" };
      const res = await fetch(`https://api.channex.io/api/v1/properties/${property_id}`, {
        headers: { "user-api-key": api_key },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
