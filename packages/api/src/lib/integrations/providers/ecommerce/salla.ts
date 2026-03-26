import { IntegrationProvider } from "../../base";

export class SallaProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    // TODO: implement OAuth flow
    const key = this.credentials.access_token ?? this.credentials.api_key;
    if (!key) return { ok: false, message: "رمز الوصول مطلوب" };
    try {
      const res = await fetch("https://api.salla.dev/admin/v2/store/info", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
