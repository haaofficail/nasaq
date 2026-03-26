import { IntegrationProvider } from "../../base";

export class FoodicsProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://api.foodics.com/api/v5/branches", {
        headers: { Authorization: `Bearer ${this.credentials.access_token}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
