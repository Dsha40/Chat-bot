import { DateTime } from 'luxon';
import type { Clinic } from '../config/clinic.ts';
import type { Store } from '../store/db.ts';

export interface CsvOptions {
  /** ";" by default: Excel in Spanish-speaking locales uses comma as decimal separator and ";" as list separator. */
  separator?: string;
}

/** Neutralizes spreadsheet formulas in patient-typed text (CSV injection) and quotes when needed. */
function cell(value: unknown, sep: string): string {
  let s = value === undefined || value === null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /["\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV that opens correctly in Excel: UTF-8 BOM (accents), CRLF line endings. */
export function toCsv(header: string[], rows: unknown[][], opts: CsvOptions = {}): string {
  const sep = opts.separator ?? ';';
  const lines = [header, ...rows].map((r) => r.map((v) => cell(v, sep)).join(sep));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** WhatsApp ids are long digit strings that Excel would show as 5,84E+11; a space keeps them as text. */
function phone(channel: string, userId: string): string {
  if (channel !== 'whatsapp' || !/^\d{8,}$/.test(userId)) return '';
  return `${userId.slice(0, -7)} ${userId.slice(-7)}`;
}

export function appointmentsCsv(store: Store, clinic: Clinic, opts?: CsvOptions): string {
  const fields = clinic.datosPaciente;
  const header = ['ID cita', 'Fecha', 'Hora', 'Servicio', 'Estado', ...fields.map((f) => f.etiqueta), 'Teléfono WhatsApp', 'Canal', 'Agendada el'];
  const rows = store.allAppointments().map((a) => {
    const start = DateTime.fromISO(a.start).setZone(clinic.zonaHoraria);
    const [channel = '', userId = ''] = a.conversationId.split(/:(.*)/s);
    const data = a.patientData ?? { nombre: a.patientName };
    return [
      a.id,
      start.toFormat('dd/MM/yyyy'),
      start.toFormat('HH:mm'),
      a.service,
      a.status === 'confirmed' ? 'Confirmada' : 'Cancelada',
      ...fields.map((f) => data[f.clave] ?? ''),
      phone(channel, userId),
      channel,
      a.createdAt ? DateTime.fromISO(a.createdAt).setZone(clinic.zonaHoraria).toFormat('dd/MM/yyyy HH:mm') : '',
    ];
  });
  return toCsv(header, rows, opts);
}

export function patientsCsv(store: Store, clinic: Clinic, opts?: CsvOptions): string {
  const fields = clinic.datosPaciente;
  const header = [...fields.map((f) => f.etiqueta), 'Teléfono WhatsApp', 'Canal', 'Citas agendadas', 'Actualizado el'];
  const rows = store.allPatients().map((p) => [
    ...fields.map((f) => p.data[f.clave] ?? ''),
    phone(p.channel, p.userId),
    p.channel,
    p.appointments,
    DateTime.fromISO(p.updatedAt).setZone(clinic.zonaHoraria).toFormat('dd/MM/yyyy HH:mm'),
  ]);
  return toCsv(header, rows, opts);
}
