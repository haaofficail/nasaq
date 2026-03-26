import { IntegrationProvider } from "../../base";

export class PayPalProvider extends IntegrationProvider {
  private get baseUrl(): string {
    return this.credentials.mode === "sandbox"
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const auth = Buffer.from(`${this.credentials.client_id}:${this.credentials.client_secret}`).toString("base64");
      const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
