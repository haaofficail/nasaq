import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";
import * as crypto from "crypto";

export class StripeProvider extends IntegrationProvider {
  private readonly baseUrl = "https://api.stripe.com/v1";

  private get auth(): string {
    return "Basic " + Buffer.from(this.credentials.secret_key + ":").toString("base64");
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/balance`, {
          headers: { Authorization: this.auth },
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/balance", method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok, message: res.ok ? undefined : "مفتاح API غير صحيح" };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async createCheckoutSession(params: {
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    description: string;
    customerEmail?: string;
  }): Promise<{ id: string; url: string }> {
    const start = Date.now();
    const body = new URLSearchParams({
      "line_items[0][price_data][currency]": params.currency,
      "line_items[0][price_data][unit_amount]": String(params.amount),
      "line_items[0][price_data][product_data][name]": params.description,
      "line_items[0][quantity]": "1",
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
    });
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/checkout/sessions`, {
        method: "POST",
        headers: { Authorization: this.auth, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { id?: string; url?: string; error?: { message?: string } };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/checkout/sessions", method: "POST",
      responseBody: data, statusCode: res.status, durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.error?.message ?? "فشل إنشاء جلسة الدفع");
    return { id: data.id ?? "", url: data.url ?? "" };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.credentials.webhook_secret;
    if (!secret) return false;
    const parts = signature.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    const sig = parts.find((p) => p.startsWith("v1="))?.slice(3);
    if (!timestamp || !sig) return false;
    const signed = `${timestamp}.${payload}`;
    const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  }
}
