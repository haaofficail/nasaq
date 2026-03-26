import { IntegrationProvider } from "../../base";

export class SnapchatPixelProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("https://tr.snapchat.com/v2/conversion", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.credentials.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pixel_id: this.credentials.pixel_id, events: [] }),
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
