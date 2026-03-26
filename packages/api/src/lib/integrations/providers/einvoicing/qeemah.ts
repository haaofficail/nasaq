import { IntegrationProvider } from "../../base";

export class QeemahProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://api.qeemah.com/v1/health", {
        headers: { Authorization: `Bearer ${this.credentials.api_key}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
