import { IntegrationProvider } from "../../base";

export class TapProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://api.tap.company/v2/charges?limit=1", {
        headers: { Authorization: `Bearer ${this.credentials.secret_key}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
