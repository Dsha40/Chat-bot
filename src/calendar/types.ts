export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface CalendarEventInput {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  timeZone: string;
}

/**
 * External calendar adapter. Appointments are always stored in our own DB;
 * a provider only reports extra busy time and mirrors events (e.g. Google Calendar).
 */
export interface CalendarProvider {
  readonly name: string;
  busy(from: Date, to: Date): Promise<BusyInterval[]>;
  /** Creates the event and returns its external id (or null if the provider does not store events). */
  createEvent(event: CalendarEventInput): Promise<string | null>;
  deleteEvent(externalId: string): Promise<void>;
}

/** Internal agenda: everything lives in our DB, so there is nothing extra to report. */
export class InternalCalendar implements CalendarProvider {
  readonly name = 'internal';
  async busy(): Promise<BusyInterval[]> {
    return [];
  }
  async createEvent(): Promise<string | null> {
    return null;
  }
  async deleteEvent(): Promise<void> {}
}
