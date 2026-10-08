import { randomInt } from 'node:crypto';
import { DateTime } from 'luxon';
import { findService, type Clinic, type Service } from '../config/clinic.ts';
import type { Store, StoredAppointment } from '../store/db.ts';
import { computeSlots, formatSlotLabel, type DayPart, type Slot } from './slots.ts';
import type { BusyInterval, CalendarProvider } from './types.ts';

export type BookResult =
  | { ok: true; appointment: StoredAppointment; label: string }
  | { ok: false; reason: string; alternatives?: Slot[] };

/** Appointment logic shared by every channel. Our DB is the source of truth; the calendar provider mirrors it. */
export class Agenda {
  private lock: Promise<unknown> = Promise.resolve();

  constructor(
    private store: Store,
    private clinic: Clinic,
    private calendar: CalendarProvider,
    private now: () => Date = () => new Date(),
  ) {}

  /** Serializes writes so two patients cannot book the same slot at the same time. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn, fn);
    this.lock = run.catch(() => undefined);
    return run;
  }

  resolveService(name: string): Service | undefined {
    return findService(this.clinic, name);
  }

  private async busy(from: Date, to: Date, excludeId?: string): Promise<BusyInterval[]> {
    const own = this.store
      .appointmentsBetween(from.toISOString(), to.toISOString())
      .filter((a) => a.id !== excludeId);
    const excluded = excludeId ? this.store.getAppointment(excludeId) : undefined;
    const external = (await this.calendar.busy(from, to)).filter(
      (b) =>
        !excluded ||
        b.start.getTime() !== new Date(excluded.start).getTime() ||
        b.end.getTime() !== new Date(excluded.end).getTime(),
    );
    return [...own.map((a) => ({ start: new Date(a.start), end: new Date(a.end) })), ...external];
  }

  private window(): { from: Date; to: Date } {
    const from = this.now();
    const to = DateTime.fromJSDate(from).plus({ days: this.clinic.diasMaximosAgenda + 1 }).toJSDate();
    return { from, to };
  }

  async availableSlots(opts: {
    service: Service;
    fromDate?: string;
    dayPart?: DayPart;
    limit?: number;
    excludeAppointmentId?: string;
  }): Promise<Slot[]> {
    const { from, to } = this.window();
    const busy = await this.busy(from, to, opts.excludeAppointmentId);
    return computeSlots({
      clinic: this.clinic,
      service: opts.service,
      now: this.now(),
      busy,
      fromDate: opts.fromDate,
      dayPart: opts.dayPart,
      limit: opts.limit ?? 6,
      perDay: 3,
    });
  }

  /** Checks that `startIso` is exactly one of the currently offered slots (prevents invented times). */
  private async validateSlot(service: Service, startIso: string, excludeId?: string): Promise<BookResult | Slot> {
    const start = DateTime.fromISO(startIso, { setZone: true });
    if (!start.isValid) return { ok: false, reason: 'Fecha u hora inválida. Usa exactamente el valor "inicio" devuelto por buscar_horarios.' };
    const day = start.setZone(this.clinic.zonaHoraria).toISODate()!;
    const { from, to } = this.window();
    const busy = await this.busy(from, to, excludeId);
    const daySlots = computeSlots({ clinic: this.clinic, service, now: this.now(), busy, fromDate: day, singleDay: true });
    const match = daySlots.find((s) => s.start.getTime() === start.toMillis());
    if (match) return match;
    const alternatives = computeSlots({ clinic: this.clinic, service, now: this.now(), busy, fromDate: day, limit: 4, perDay: 2 });
    return { ok: false, reason: 'Ese horario no está disponible.', alternatives };
  }

  book(input: {
    conversationId: string;
    patientName: string;
    serviceName: string;
    startIso: string;
    patientData?: Record<string, string>;
  }): Promise<BookResult> {
    return this.exclusive(async () => {
      const service = this.resolveService(input.serviceName);
      if (!service || !service.agendable) return { ok: false, reason: `Servicio no agendable: ${input.serviceName}` };
      const slot = await this.validateSlot(service, input.startIso);
      if ('ok' in slot) return slot;

      const ticket = this.newTicket();
      const externalId = await this.calendar.createEvent({
        summary: `${service.nombre} — ${input.patientName} (ticket #${ticket})`,
        description: `Agendada por el asistente virtual. Conversación: ${input.conversationId}`,
        start: slot.start,
        end: slot.end,
        timeZone: this.clinic.zonaHoraria,
      });
      const appointment: StoredAppointment = {
        id: ticket,
        conversationId: input.conversationId,
        patientName: input.patientName,
        service: service.nombre,
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        status: 'confirmed',
        externalId,
        reminderSent: false,
        patientData: input.patientData,
      };
      this.store.insertAppointment(appointment);
      return { ok: true, appointment, label: slot.label };
    });
  }

  upcoming(conversationId: string): (StoredAppointment & { label: string })[] {
    return this.store
      .upcomingForConversation(conversationId, this.now().toISOString())
      .map((a) => ({ ...a, label: formatSlotLabel(new Date(a.start), this.clinic.zonaHoraria) }));
  }

  /** 6-digit ticket, easy to read out over the phone and unique in the DB. */
  private newTicket(): string {
    for (;;) {
      const t = String(randomInt(100000, 1000000));
      if (!this.store.getAppointment(t)) return t;
    }
  }

  /**
   * Finds an upcoming confirmed appointment by ticket ("#482731", "482 731"...).
   * From the conversation that booked it the ticket is enough; from any other chat
   * the patient must also give the ID number or full name on the appointment.
   */
  private findForChange(conversationId: string, ticket: string, verification?: string): StoredAppointment | string {
    const clean = ticket.replace(/[#\s-]/g, '').trim();
    const a = this.store.getAppointment(clean) ?? this.store.getAppointment(clean.toLowerCase());
    if (!a || a.status !== 'confirmed' || new Date(a.start) <= this.now()) {
      return 'No encontré una cita futura con ese número de ticket.';
    }
    if (a.conversationId === conversationId) return a;
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const v = verification ? norm(verification) : '';
    const data = a.patientData ?? { nombre: a.patientName };
    const candidates = [data.cedula, data.nombre ?? a.patientName].filter(Boolean).map((x) => norm(x!));
    if (v && candidates.some((c) => c === v || (c.length > 3 && c.endsWith(v) && v.length >= 6))) return a;
    return 'Para cambiar o cancelar una cita agendada desde otro número, pide la cédula o el nombre completo del paciente (campo verificacion).';
  }

  cancel(conversationId: string, ticket: string, verification?: string): Promise<{ ok: boolean; reason?: string; appointment?: StoredAppointment }> {
    return this.exclusive(async () => {
      const a = this.findForChange(conversationId, ticket, verification);
      if (typeof a === 'string') return { ok: false, reason: a };
      const id = a.id;
      if (a.externalId) await this.calendar.deleteEvent(a.externalId);
      this.store.updateAppointment(id, { status: 'cancelled' });
      return { ok: true, appointment: a };
    });
  }

  reschedule(conversationId: string, ticket: string, newStartIso: string, verification?: string): Promise<BookResult> {
    return this.exclusive(async () => {
      const a = this.findForChange(conversationId, ticket, verification);
      if (typeof a === 'string') return { ok: false, reason: a };
      const id = a.id;
      const service = this.resolveService(a.service);
      if (!service) return { ok: false, reason: 'El servicio de esa cita ya no existe.' };
      const slot = await this.validateSlot(service, newStartIso, id);
      if ('ok' in slot) return slot;

      if (a.externalId) await this.calendar.deleteEvent(a.externalId);
      const externalId = await this.calendar.createEvent({
        summary: `${service.nombre} — ${a.patientName} (ticket #${a.id})`,
        description: `Reagendada por el asistente virtual. Conversación: ${conversationId}`,
        start: slot.start,
        end: slot.end,
        timeZone: this.clinic.zonaHoraria,
      });
      this.store.updateAppointment(id, {
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        externalId,
        reminderSent: false,
      });
      return { ok: true, appointment: this.store.getAppointment(id)!, label: slot.label };
    });
  }
}
