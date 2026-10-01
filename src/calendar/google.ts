import { GoogleAuth } from 'google-auth-library';
import type { BusyInterval, CalendarEventInput, CalendarProvider } from './types.ts';

const BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Google Calendar via a service account. The clinic shares its calendar with the
 * service account e-mail ("Make changes to events" permission).
 */
export class GoogleCalendar implements CalendarProvider {
  readonly name = 'google';
  private auth: GoogleAuth;

  constructor(
    keyFile: string,
    private calendarId: string,
  ) {
    this.auth = new GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/calendar'] });
  }

  async busy(from: Date, to: Date): Promise<BusyInterval[]> {
    const res = await this.auth.request<{ calendars: Record<string, { busy?: { start: string; end: string }[] }> }>({
      url: `${BASE}/freeBusy`,
      method: 'POST',
      data: { timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: this.calendarId }] },
    });
    const busy = res.data.calendars[this.calendarId]?.busy ?? [];
    return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }

  async createEvent(e: CalendarEventInput): Promise<string> {
    const res = await this.auth.request<{ id: string }>({
      url: `${BASE}/calendars/${encodeURIComponent(this.calendarId)}/events`,
      method: 'POST',
      data: {
        summary: e.summary,
        description: e.description,
        start: { dateTime: e.start.toISOString(), timeZone: e.timeZone },
        end: { dateTime: e.end.toISOString(), timeZone: e.timeZone },
      },
    });
    return res.data.id;
  }

  async deleteEvent(externalId: string): Promise<void> {
    await this.auth.request({
      url: `${BASE}/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(externalId)}`,
      method: 'DELETE',
    });
  }
}
