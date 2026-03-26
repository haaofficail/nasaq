import { IntegrationProvider } from "../../base";

export class ZapierProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const webhookUrl = this.credentials.webhook_url;
      if (!webhookUrl) return { ok: false, message: "webhook_url مطلوب" };
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, source: "nasaq" }),
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
