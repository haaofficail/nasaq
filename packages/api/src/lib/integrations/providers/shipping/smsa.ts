import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

export class SMSAProvider extends IntegrationProvider {
  private readonly baseUrl = "https://b2capi.smsaexpress.com/v1";

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/GetPickupLocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Passkey: this.credentials.pass_key, Entity: this.credentials.entity_code }),
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/GetPickupLocations", method: "POST",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async createShipment(params: {
    reference: string;
    description: string;
    weight: number;
    consigneeName: string;
    consigneeCity: string;
    consigneeAddress: string;
    consigneePhone: string;
    cod?: number;
  }): Promise<{ awb: string }> {
    const start = Date.now();
    const body = {
      Passkey: this.credentials.pass_key,
      Entity: this.credentials.entity_code,
      ShipmentDetails: {
        ReferenceNumber: params.reference,
        Description: params.description,
        Weight: params.weight,
        Pieces: 1,
        ContentDescription: params.description,
        DeclaredValue: 0,
        COD: params.cod ?? 0,
        Consignee: {
          CName: params.consigneeName,
          CAddr1: params.consigneeAddress,
          CCity: params.consigneeCity,
          CCountry: "SA",
          CPhone1: params.consigneePhone,
        },
      },
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/AddShipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { AWBNumber?: string; Message?: string };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/AddShipment", method: "POST",
      requestBody: body, responseBody: data, statusCode: res.status,
      durationMs: Date.now() - start,
    });
    if (!res.ok || !data.AWBNumber) throw new Error(data.Message ?? "فشل إنشاء الشحنة");
    return { awb: data.AWBNumber };
  }

  async trackShipment(awb: string): Promise<{ status: string; events: { date: string; description: string }[] }> {
    const start = Date.now();
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/GetTracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Passkey: this.credentials.pass_key, AWBNumber: awb }),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { TrackingStatus?: string; TrackingEvents?: Array<{ Date: string; Description: string }> };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: "/GetTracking", method: "POST",
      statusCode: res.status, durationMs: Date.now() - start,
    });
    return {
      status: data.TrackingStatus ?? "unknown",
      events: (data.TrackingEvents ?? []).map((e) => ({ date: e.Date, description: e.Description })),
    };
  }
}
