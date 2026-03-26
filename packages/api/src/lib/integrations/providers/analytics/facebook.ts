import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";
import * as crypto from "crypto";

export class FacebookPixelProvider extends IntegrationProvider {
  private readonly baseUrl = "https://graph.facebook.com/v19.0";

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/${this.credentials.pixel_id}?access_token=${this.credentials.access_token}`, {
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: `/${this.credentials.pixel_id}`, method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async sendServerEvent(params: {
    eventName: string;
    eventTime?: number;
    userEmail?: string;
    userPhone?: string;
    value?: number;
    currency?: string;
    orderId?: string;
    contentName?: string;
  }): Promise<void> {
    const start = Date.now();
    const hashedEmail = params.userEmail
      ? crypto.createHash("sha256").update(params.userEmail.toLowerCase().trim()).digest("hex")
      : undefined;
    const hashedPhone = params.userPhone
      ? crypto.createHash("sha256").update(params.userPhone.trim()).digest("hex")
      : undefined;
    const body = {
      data: [{
        event_name: params.eventName,
        event_time: params.eventTime ?? Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: {
          em: hashedEmail ? [hashedEmail] : undefined,
          ph: hashedPhone ? [hashedPhone] : undefined,
        },
        custom_data: {
          value: params.value,
          currency: params.currency ?? "SAR",
          order_id: params.orderId,
          content_name: params.contentName,
        },
      }],
      access_token: this.credentials.access_token,
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/${this.credentials.pixel_id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as Record<string, unknown>;
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: `/${this.credentials.pixel_id}/events`, method: "POST",
      requestBody: { eventName: params.eventName, value: params.value },
      responseBody: data, statusCode: res.status, durationMs: Date.now() - start,
    });
  }
}
