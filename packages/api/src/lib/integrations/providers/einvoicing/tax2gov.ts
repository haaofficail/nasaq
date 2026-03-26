import { IntegrationProvider } from "../../base";

export class Tax2GovProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://api.tax2gov.com/v1/ping", {
        headers: { "x-api-key": this.credentials.api_key },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
