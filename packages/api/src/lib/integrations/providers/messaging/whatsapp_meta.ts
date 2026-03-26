import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

export class WhatsAppMetaProvider extends IntegrationProvider {
  private get baseUrl(): string {
    return `https://graph.facebook.com/v19.0/${this.credentials.phone_number_id}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.credentials.access_token}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`https://graph.facebook.com/v19.0/${this.credentials.phone_number_id}`, {
          headers: this.headers,
          signal: AbortSignal.timeout(30000),
        })
      );
      const data = await res.json() as { error?: { message?: string } };
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/phone_number", method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok, message: res.ok ? undefined : (data.error?.message ?? "فشل الاتصال") };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async sendTemplateMessage(params: {
    to: string;
    templateName: string;
    language?: string;
    components?: Array<{ type: string; parameters: Array<{ type: string; text?: string }> }>;
  }): Promise<{ messageId: string }> {
    const start = Date.now();
    const body = {
      messaging_product: "whatsapp",
      to: params.to,
      type: "template",
      template: {
        name: params.templateName,
        language: { code: params.language ?? "ar" },
        components: params.components ?? [],
      },
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/messages`, {
        method: "POST", headers: this.headers, body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/messages", method: "POST",
      requestBody: { to: params.to, template: params.templateName },
      responseBody: data, statusCode: res.status, durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.error?.message ?? "فشل إرسال الرسالة");
    return { messageId: data.messages?.[0]?.id ?? "" };
  }

  async sendTextMessage(to: string, text: string): Promise<{ messageId: string }> {
    const start = Date.now();
    const body = { messaging_product: "whatsapp", to, type: "text", text: { body: text } };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/messages`, {
        method: "POST", headers: this.headers, body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/messages", method: "POST",
      requestBody: { to, type: "text" }, responseBody: data, statusCode: res.status,
      durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.error?.message ?? "فشل إرسال الرسالة");
    return { messageId: data.messages?.[0]?.id ?? "" };
  }
}
