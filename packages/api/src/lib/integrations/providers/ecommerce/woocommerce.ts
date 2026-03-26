import { IntegrationProvider } from "../../base";

export class WooCommerceProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const { store_url, consumer_key, consumer_secret } = this.credentials;
      if (!store_url) return { ok: false, message: "store_url مطلوب" };
      const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString("base64");
      const host = store_url.replace(/\/$/, "");
      const res = await fetch(`${host}/wp-json/wc/v3/system_status`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
