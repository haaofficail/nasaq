import { IntegrationProvider } from "../../base";

export class ZidProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // TODO: implement OAuth flow
    const key = this.credentials.access_token ?? this.credentials.api_key;
    if (!key) return { ok: false, message: "رمز الوصول مطلوب" };
    try {
      const res = await fetch("https://api.zid.sa/v1/managers/store/", {
        headers: { Authorization: key, "store-id": this.credentials.store_id ?? "" },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
