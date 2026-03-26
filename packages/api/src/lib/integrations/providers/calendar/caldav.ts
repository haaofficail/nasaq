import { IntegrationProvider } from "../../base";

export class CalDAVProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const { server_url, username, password } = this.credentials;
      if (!server_url) return { ok: false, message: "server_url مطلوب" };
      const auth = Buffer.from(`${username}:${password}`).toString("base64");
      const res = await fetch(server_url, {
        method: "PROPFIND",
        headers: { Authorization: `Basic ${auth}`, Depth: "0", "Content-Type": "application/xml" },
        body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>',
        signal: AbortSignal.timeout(30000),
      });
      return { ok: res.status < 500 };
    } catch {
      return { ok: false, message: "فشل الاتصال" };
    }
  }
}
