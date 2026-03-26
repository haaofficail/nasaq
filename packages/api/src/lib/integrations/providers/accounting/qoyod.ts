import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

export class QoyodProvider extends IntegrationProvider {
  private readonly baseUrl = "https://api.qoyod.com/api/2.0";

  private get headers(): Record<string, string> {
    return {
      "API-KEY": this.credentials.api_token,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/contacts?limit=1`, {
          headers: this.headers,
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/contacts", method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async createInvoice(params: {
    contactName: string;
    contactEmail?: string;
    reference: string;
    date: string;
    dueDate: string;
    lines: Array<{ description: string; quantity: number; unitPrice: number; accountId?: number }>;
  }): Promise<{ id: number; invoiceNumber: string }> {
    const start = Date.now();
    const body = {
      invoice: {
        contact: { name: params.contactName, email: params.contactEmail },
        reference: params.reference,
        issue_date: params.date,
        due_date: params.dueDate,
        invoice_lines: params.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unitPrice,
          account_id: l.accountId ?? null,
        })),
      },
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/invoices`, {
        method: "POST", headers: this.headers, body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { error?: string; invoice?: { id: number; number: string } };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/invoices", method: "POST",
      requestBody: body, responseBody: data, statusCode: res.status,
      durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.error ?? "فشل إنشاء الفاتورة في قيود");
    return { id: data.invoice?.id ?? 0, invoiceNumber: data.invoice?.number ?? "" };
  }
}
