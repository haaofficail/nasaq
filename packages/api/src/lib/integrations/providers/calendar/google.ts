import { IntegrationProvider } from "../../base";
import { withRetry } from "../../retry";
import { logIntegration } from "../../logger";

export class GoogleCalendarProvider extends IntegrationProvider {
  private readonly baseUrl = "https://www.googleapis.com/calendar/v3";

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.credentials.access_token}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    const start = Date.now();
    try {
      const res = await withRetry(() =>
        fetch(`${this.baseUrl}/users/me/calendarList?maxResults=1`, {
          headers: this.headers,
          signal: AbortSignal.timeout(30000),
        })
      );
      await logIntegration({
        orgId: this.orgId, integrationId: this.integrationId,
        direction: "outbound", endpoint: "/users/me/calendarList", method: "GET",
        statusCode: res.status, durationMs: Date.now() - start,
      });
      return { ok: res.ok, message: res.ok ? undefined : "رمز الوصول غير صالح أو منتهي" };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "فشل الاتصال" };
    }
  }

  async createEvent(params: {
    calendarId?: string;
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: string[];
    location?: string;
  }): Promise<{ id: string; htmlLink: string }> {
    const calId = params.calendarId ?? (this.config.calendarId as string | undefined) ?? "primary";
    const start = Date.now();
    const body = {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: { dateTime: params.startDateTime, timeZone: "Asia/Riyadh" },
      end: { dateTime: params.endDateTime, timeZone: "Asia/Riyadh" },
      attendees: params.attendees?.map((email) => ({ email })),
    };
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/calendars/${encodeURIComponent(calId)}/events`, {
        method: "POST", headers: this.headers, body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = await res.json() as { id?: string; htmlLink?: string; error?: { message?: string } };
    await logIntegration({
      orgId: this.orgId, integrationId: this.integrationId,
      direction: "outbound", endpoint: `/calendars/${calId}/events`, method: "POST",
      responseBody: data, statusCode: res.status, durationMs: Date.now() - start,
    });
    if (!res.ok) throw new Error(data.error?.message ?? "فشل إنشاء الحدث");
    return { id: data.id ?? "", htmlLink: data.htmlLink ?? "" };
  }

  async deleteEvent(eventId: string, calendarId?: string): Promise<void> {
    const calId = calendarId ?? (this.config.calendarId as string | undefined) ?? "primary";
    await withRetry(() =>
      fetch(`${this.baseUrl}/calendars/${encodeURIComponent(calId)}/events/${eventId}`, {
        method: "DELETE", headers: this.headers,
        signal: AbortSignal.timeout(30000),
      })
    );
  }

  async updateEvent(eventId: string, params: {
    summary?: string;
    description?: string;
    startDateTime?: string;
    endDateTime?: string;
    calendarId?: string;
  }): Promise<void> {
    const calId = params.calendarId ?? (this.config.calendarId as string | undefined) ?? "primary";
    const body: Record<string, unknown> = {};
    if (params.summary) body.summary = params.summary;
    if (params.description) body.description = params.description;
    if (params.startDateTime) body.start = { dateTime: params.startDateTime, timeZone: "Asia/Riyadh" };
    if (params.endDateTime) body.end = { dateTime: params.endDateTime, timeZone: "Asia/Riyadh" };
    await withRetry(() =>
      fetch(`${this.baseUrl}/calendars/${encodeURIComponent(calId)}/events/${eventId}`, {
        method: "PATCH", headers: this.headers, body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
    );
  }
}
