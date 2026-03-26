import { IntegrationProvider } from "../../base";

export class GoogleMapsProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=Riyadh&key=${this.credentials.api_key}`,
        { signal: AbortSignal.timeout(30000) }
      );
      const data = await res.json() as { status?: string };
      return { ok: res.ok && data.status !== "REQUEST_DENIED" };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
