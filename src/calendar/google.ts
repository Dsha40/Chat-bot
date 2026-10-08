import { GoogleAuth } from 'google-auth-library';
import { DateTime } from 'luxon';
import type { BusyInterval, CalendarEventInput, CalendarProvider } from './types.ts';

const BASE = 'https://www.googleapis.com/calendar/v3';

export interface GoogleEvent {
  status?: string;
  transparency?: 'opaque' | 'transparent';
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

/**
 * Turns calendar events into busy time.
 * - Cancelled events and timed events explicitly marked "Free" are ignored.
 * - All-day events (vacations, congresses) ALWAYS block the day, even though Google marks them "Free" by default.
 */
export function eventsToBusy(events: GoogleEvent[], zone: string): BusyInterval[] {
  const busy: BusyInterval[] = [];
  for (const e of events) {
    if (e.status === 'cancelled') continue;
    if (e.start?.date && e.end?.date) {
      busy.push({
        start: DateTime.fromISO(e.start.date, { zone }).toJSDate(),
        end: DateTime.fromISO(e.end.date, { zone }).toJSDate(),
      });
    } else if (e.start?.dateTime && e.end?.dateTime) {
      if (e.transparency === 'transparent') continue;
      busy.push({ start: new Date(e.start.dateTime), end: new Date(e.end.dateTime) });
    }
  }
  return busy;
}

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
    /** Clinic time zone, used to place all-day events. */
    private timeZone: string,
  ) {
    this.auth = new GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/calendar'] });
  }

  async busy(from: Date, to: Date): Promise<BusyInterval[]> {
    return eventsToBusy(await this.listEvents(from, to), this.timeZone);
  }

  async listEvents(from: Date, to: Date): Promise<GoogleEvent[]> {
    const items: GoogleEvent[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.auth.request<{ items?: GoogleEvent[]; nextPageToken?: string }>({
        url: `${BASE}/calendars/${encodeURIComponent(this.calendarId)}/events`,
        params: {
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          singleEvents: true,
          maxResults: 2500,
          ...(pageToken ? { pageToken } : {}),
        },
      });
      items.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken;
    } while (pageToken);
    return items;
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
