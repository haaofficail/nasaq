import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

interface ZatcaInvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}

export class ZatcaCleartaxProvider extends IntegrationProvider {
  private readonly baseUrl = "https://api.cleartax.com/sa/einvoicing/v1";

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/health`, {
          headers: { Authorization: `Bearer ${this.credentials.api_key}` },
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/health", method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async submitB2CInvoice(params: {
    invoiceNumber: string;
    invoiceDate: string;
    buyerName: string;
    items: ZatcaInvoiceItem[];
    totalAmount: number;
    vatAmount: number;
  }): Promise<{ uuid: string; reportingStatus: string }> {
    const start = Date.now();
    const body = {
      invoice_number: params.invoiceNumber,
      invoice_date: params.invoiceDate,
      invoice_type: "simplified",
      seller: {
        tax_id: this.credentials.tax_id,
        csid: this.credentials.csid,
      },
      buyer_name: params.buyerName,
      line_items: params.items.map((i) => ({
        item_description: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        vat_rate: i.vatRate ?? 15,
      })),
      total_amount: params.totalAmount,
      vat_amount: params.vatAmount,
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/simplified`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.credentials.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { message?: string; uuid?: string; status?: string };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/simplified", method: "POST",
      requestBody: body, responseBody: data, statusCode: res.status,
      durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.message ?? "فشل تقديم الفاتورة");
    return { uuid: data.uuid ?? "", reportingStatus: data.status ?? "" };
  }
}
