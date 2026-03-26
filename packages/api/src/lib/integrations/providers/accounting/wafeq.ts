import { IntegrationProvider } from "../../base";

export class WafeqProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://api.wafeq.com/v1/accounts/", {
        headers: { Authorization: `Api-Key ${this.credentials.api_key}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
