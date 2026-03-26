import { IntegrationProvider } from "../../base";

export class GuestyProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const key = this.credentials.api_token ?? this.credentials.access_token ?? this.credentials.api_key;
      if (!key) return { ok: false, message: "api_token مطلوب" };
      const res = await fetch("https://open-api.guesty.com/v1/accounts/me", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
