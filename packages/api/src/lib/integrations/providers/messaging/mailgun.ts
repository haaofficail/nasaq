import { IntegrationProvider } from "../../base";

export class MailgunProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const auth = Buffer.from(`api:${this.credentials.api_key}`).toString("base64");
      const domain = this.credentials.domain;
      if (!domain) return { ok: false, message: "domain مطلوب" };
      const res = await fetch(`https://api.mailgun.net/v3/domains/${domain}`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
