import { IntegrationProvider } from "../../base";

export class UnifonicProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://el.cloud.unifonic.com/rest/SMS/GetBalance", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ AppSid: this.credentials.app_sid }).toString(),
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
