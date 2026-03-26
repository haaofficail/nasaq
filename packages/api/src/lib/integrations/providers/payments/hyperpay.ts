import { IntegrationProvider } from "../../base";

export class HyperPayProvider extends IntegrationProvider {
  private get baseUrl(): string {
    return this.credentials.mode === "test"
      ? "https://eu-test.oppwa.com"
      : "https://eu-prod.oppwa.com";
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/paymentWidgets.js?checkoutId=test`, {
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
