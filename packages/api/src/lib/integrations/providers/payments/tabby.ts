import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

export class TabbyProvider extends IntegrationProvider {
  private readonly baseUrl = "https://api.tabby.ai/api/v2";

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/checkout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.credentials.secret_key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            payment: {
              amount: "0", currency: "SAR", description: "test",
              buyer: { email: "test@test.com", name: "Test" },
              order: { tax_amount: "0", shipping_amount: "0", discount_amount: "0", updated_at: new Date().toISOString(), reference_id: "test", items: [] },
            },
            lang: "ar",
            merchant_code: this.credentials.merchant_code,
            merchant_urls: { success: "https://example.com", cancel: "https://example.com", failure: "https://example.com" },
          }),
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/checkout", method: "POST",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.status !== 401 };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async createSession(params: {
    amount: string;
    currency: string;
    description: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    successUrl: string;
    cancelUrl: string;
    failureUrl: string;
    referenceId: string;
  }): Promise<{ id: string; url: string }> {
    const start = Date.now();
    const body = {
      payment: {
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        buyer: { email: params.buyerEmail, name: params.buyerName, phone: params.buyerPhone },
        order: {
          tax_amount: "0", shipping_amount: "0", discount_amount: "0",
          updated_at: new Date().toISOString(), reference_id: params.referenceId, items: [],
        },
      },
      lang: "ar",
      merchant_code: this.credentials.merchant_code,
      merchant_urls: { success: params.successUrl, cancel: params.cancelUrl, failure: params.failureUrl },
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.credentials.secret_key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as {
      id?: string;
      error?: string;
      status?: string;
      configuration?: { available_products?: { installments?: Array<{ web_url?: string }> } };
    };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/checkout", method: "POST",
      requestBody: body, responseBody: data, statusCode: res.status,
      durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.error ?? "فشل إنشاء جلسة تابي");
    const installment = data.configuration?.available_products?.installments?.[0];
    return { id: data.id ?? "", url: installment?.web_url ?? data.status ?? "" };
  }
}
