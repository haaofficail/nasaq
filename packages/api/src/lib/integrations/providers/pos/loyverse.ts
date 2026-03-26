import { IntegrationProvider } from "../../base";

export class LoyverseProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://api.loyverse.com/v1.0/merchant", {
        headers: { Authorization: `Bearer ${this.credentials.access_token}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
