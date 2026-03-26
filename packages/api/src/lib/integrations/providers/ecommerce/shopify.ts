import { IntegrationProvider } from "../../base";

export class ShopifyProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const { store_url, api_key, secret } = this.credentials;
      if (!store_url) return { ok: false, message: "store_url مطلوب" };
      const auth = Buffer.from(`${api_key}:${secret}`).toString("base64");
      const host = store_url.replace(/https?:\/\//, "").replace(/\/$/, "");
      const res = await fetch(`https://${host}/admin/api/2024-01/shop.json`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
