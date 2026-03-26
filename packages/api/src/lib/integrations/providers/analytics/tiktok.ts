import { IntegrationProvider } from "../../base";

export class TikTokPixelProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
        method: "POST",
        headers: { "Access-Token": this.credentials.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ pixel_code: this.credentials.pixel_id, event: "TestConnection", timestamp: new Date().toISOString(), context: {} }),
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
