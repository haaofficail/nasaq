import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

export class TamaraProvider extends IntegrationProvider {
  private readonly baseUrl = "https://api.tamara.co";

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.credentials.api_token}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/stores/info`, {
          headers: this.headers,
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/stores/info", method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async createOrder(params: {
    totalAmount: number;
    currency: string;
    description: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    successUrl: string;
    failureUrl: string;
    cancelUrl: string;
    referenceId: string;
  }): Promise<{ checkoutId: string; checkoutUrl: string }> {
    const start = Date.now();
    const firstName = params.buyerName.split(" ")[0] ?? params.buyerName;
    const lastName = params.buyerName.split(" ").slice(1).join(" ") || "-";
    const body = {
      order_reference_id: params.referenceId,
      total_amount: { amount: params.totalAmount.toFixed(2), currency: params.currency },
      description: params.description,
      items: [{
        name: params.description,
        sku: params.referenceId,
        quantity: 1,
        total_amount: { amount: params.totalAmount.toFixed(2), currency: params.currency },
        unit_price: { amount: params.totalAmount.toFixed(2), currency: params.currency },
      }],
      consumer: { first_name: firstName, last_name: lastName, email: params.buyerEmail, phone_number: params.buyerPhone },
      billing_address: { first_name: params.buyerName, last_name: "-", line1: "-", city: "Riyadh", country_code: "SA" },
      shipping_address: { first_name: params.buyerName, last_name: "-", line1: "-", city: "Riyadh", country_code: "SA" },
      merchant_url: {
        success: params.successUrl,
        failure: params.failureUrl,
        cancel: params.cancelUrl,
        notification: "https://webhook.nasaq.app/integrations/webhook/tamara",
      },
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/checkout`, {
        method: "POST", headers: this.headers, body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { message?: string; checkout_id?: string; checkout_url?: string };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/checkout", method: "POST",
      requestBody: body, responseBody: data, statusCode: res.status,
      durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.message ?? "فشل إنشاء طلب تمارا");
    return { checkoutId: data.checkout_id ?? "", checkoutUrl: data.checkout_url ?? "" };
  }
}
