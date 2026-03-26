import { IntegrationProvider } from "../../base";

export class SendGridProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/user/account", {
        headers: { Authorization: `Bearer ${this.credentials.api_key}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
