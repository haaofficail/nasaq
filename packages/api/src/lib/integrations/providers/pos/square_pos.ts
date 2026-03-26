import { IntegrationProvider } from "../../base";

export class SquarePOSProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://connect.squareup.com/v2/locations", {
        headers: { Authorization: `Bearer ${this.credentials.access_token}`, "Square-Version": "2024-01-17" },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
