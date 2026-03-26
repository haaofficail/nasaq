import { IntegrationProvider } from "../../base";

export class AramexProvider extends IntegrationProvider {
  private readonly baseUrl = "https://ws.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc/json";

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/FetchShipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ClientInfo: {
            UserName: this.credentials.username,
            Password: this.credentials.password,
            Version: "v1.0",
            AccountNumber: this.credentials.account,
            AccountPin: this.credentials.account_pin,
            AccountEntity: this.credentials.entity,
            AccountCountryCode: "SA",
            Source: 24,
          },
          ShipmentNumber: "000000000",
        }),
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
