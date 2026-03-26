import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

export class MyFatoorahProvider extends IntegrationProvider {
  private get baseUrl(): string {
    return this.credentials.mode === "test"
      ? "https://apitest.myfatoorah.com"
      : "https://api.myfatoorah.com";
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.credentials.api_key}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/v2/InitiateSession`, {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/v2/InitiateSession", method: "POST",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async initiatePayment(params: {
    amount: number;
    currency: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    callbackUrl: string;
    errorUrl: string;
    description: string;
  }): Promise<{ paymentUrl: string; invoiceId: string }> {
    const start = Date.now();
    const body = {
      InvoiceValue: params.amount,
      CurrencyIso: params.currency,
      CustomerName: params.customerName,
      CustomerEmail: params.customerEmail,
      MobileCountryCode: "+966",
      CustomerMobile: params.customerPhone,
      CallBackUrl: params.callbackUrl,
      ErrorUrl: params.errorUrl,
      Language: "AR",
      InvoiceItems: [{ ItemName: params.description, Quantity: 1, UnitPrice: params.amount }],
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/v2/SendPayment`, {
        method: "POST", headers: this.headers, body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { Message?: string; Data?: { InvoiceURL: string; InvoiceId: string } };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/v2/SendPayment", method: "POST",
      requestBody: body, responseBody: data, statusCode: res.status,
      durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.Message ?? "فشل إنشاء الفاتورة");
    return { paymentUrl: data.Data?.InvoiceURL ?? "", invoiceId: data.Data?.InvoiceId ?? "" };
  }
}
