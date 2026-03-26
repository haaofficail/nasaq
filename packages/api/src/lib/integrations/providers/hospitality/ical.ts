import { IntegrationProvider } from "../../base";
import { logIntegration } from "../../logger";

interface ICalEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  status?: string;
}

export class ICalSyncProvider extends IntegrationProvider {
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const url = this.credentials.ical_url;
    if (!url) return { ok: false, message: "رابط iCal مطلوب" };
    const start = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: url, method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      const text = await res.text();
      return { ok: text.includes("BEGIN:VCALENDAR") };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل جلب ملف iCal" };
    }
  }

  async fetchEvents(): Promise<ICalEvent[]> {
    const url = this.credentials.ical_url;
    if (!url) return [];
    const start = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: url, method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      if (!res.ok) return [];
      const text = await res.text();
      return this.parseIcal(text);
    } catch {
      return [];
    }
  }

  private parseIcal(text: string): ICalEvent[] {
    const events: ICalEvent[] = [];
    const blocks = text.split("BEGIN:VEVENT");
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i] ?? "";
      const getVal = (key: string): string => {
        const match = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
        return match?.[1]?.trim() ?? "";
      };
      const parseDate = (val: string): Date => {
        if (val.includes("T")) {
          return new Date(val.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6"));
        }
        const d = val.match(/(\d{4})(\d{2})(\d{2})/);
        if (!d) return new Date();
        return new Date(`${d[1]}-${d[2]}-${d[3]}`);
      };
      const uid = getVal("UID");
      const summary = getVal("SUMMARY");
      const dtstart = getVal("DTSTART");
      const dtend = getVal("DTEND");
      const status = getVal("STATUS");
      if (uid && dtstart) {
        events.push({
          uid,
          summary,
          start: parseDate(dtstart),
          end: dtend ? parseDate(dtend) : parseDate(dtstart),
          status,
        });
      }
    }
    return events;
  }

  generateIcal(events: { uid: string; summary: string; start: Date; end: Date; description?: string }[]): string {
    const formatDt = (d: Date): string =>
      d.toISOString().replace(/[-:]/g, "").replace(".000", "");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Nasaq//Nasaq Calendar//AR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    for (const e of events) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.uid}`,
        `DTSTAMP:${formatDt(new Date())}`,
        `DTSTART:${formatDt(e.start)}`,
        `DTEND:${formatDt(e.end)}`,
        `SUMMARY:${e.summary}`,
        ...(e.description ? [`DESCRIPTION:${e.description}`] : []),
        "END:VEVENT"
      );
    }
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
}
