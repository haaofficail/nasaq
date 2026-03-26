import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

export class MoyasarProvider extends IntegrationProvider {
  private readonly baseUrl = "https://api.moyasar.com/v1";

  private get auth(): string {
    return "Basic " + Buffer.from(this.credentials.secret_key + ":").toString("base64");
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/payments?per_page=1`, {
          headers: { Authorization: this.auth },
          signal: AbortSignal.timeout(30000),
        })
      );
      const durationMs = Date.now() - start;
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/payments", method: "GET",
        statusCode: res.status, durationMs,
      });
      if (res.status === 200 || res.status === 401) {
        return { ok: res.status === 200, message: res.status === 401 ? "مفتاح API غير صحيح" : undefined };
      }
      return { ok: false, message: `خطأ: ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async createPaymentLink(params: {
    amount: number;
    currency?: string;
    description: string;
    callbackUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; url: string }> {
    const start = Date.now();
    const body = {
      amount: params.amount,
      currency: params.currency ?? "SAR",
      description: params.description,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/payment_intents`, {
        method: "POST",
        headers: { Authorization: this.auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { id?: string; message?: string };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/payment_intents", method: "POST",
      requestBody: body, responseBody: data, statusCode: res.status,
      durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.message ?? "فشل إنشاء رابط الدفع");
    return { id: data.id ?? "", url: `https://checkout.moyasar.com/?callback_url=${params.callbackUrl}&payment_intent=${data.id}` };
  }

  async handleWebhook(payload: unknown, _signature?: string): Promise<void> {
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "inbound", endpoint: "/webhook/moyasar", method: "POST",
      requestBody: payload as Record<string, unknown>, statusCode: 200,
    });
  }
}
