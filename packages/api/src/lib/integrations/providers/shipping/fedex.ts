import { IntegrationProvider } from "../../base";

export class FedExProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const auth = Buffer.from(`${this.credentials.client_id}:${this.credentials.client_secret}`).toString("base64");
      const res = await fetch("https://apis.fedex.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
