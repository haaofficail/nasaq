import { IntegrationProvider } from "../../base";

export class TwilioProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const { account_sid, auth_token } = this.credentials;
      if (!account_sid?.startsWith("AC")) return { ok: false, message: "account_sid يجب أن يبدأ بـ AC" };
      const auth = Buffer.from(`${account_sid}:${auth_token}`).toString("base64");
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account_sid}.json`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
