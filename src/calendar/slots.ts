import { DateTime } from 'luxon';
import { WEEKDAYS, type Clinic, type Service } from '../config/clinic.ts';
import type { BusyInterval } from './types.ts';

export interface Slot {
  start: Date;
  end: Date;
  /** ISO 8601 with the clinic's offset, e.g. 2026-10-06T09:00:00-04:00. This is what the model passes back. */
  iso: string;
  /** Human label in Spanish, e.g. "martes 6 de octubre, 9:00 a. m." */
  label: string;
}

export type DayPart = 'manana' | 'tarde' | 'cualquiera';

export interface SlotQuery {
  clinic: Clinic;
  service: Service;
  now: Date;
  busy: BusyInterval[];
  /** First day to search (YYYY-MM-DD in the clinic's time zone). Defaults to today. */
  fromDate?: string;
  dayPart?: DayPart;
  /** Max slots returned; undefined = all. */
  limit?: number;
  /** Max slots per day, to offer variety across days. */
  perDay?: number;
  /** Only search this single day. */
  singleDay?: boolean;
}

export function formatSlotLabel(date: Date, zone: string): string {
  return DateTime.fromJSDate(date, { zone })
    .setLocale('es')
    .toFormat("cccc d 'de' LLLL, h:mm a")
    .replace(/[\u00a0\u202f]/g, ' ');
}

export function computeSlots(q: SlotQuery): Slot[] {
  const zone = q.clinic.zonaHoraria;
  const now = DateTime.fromJSDate(q.now, { zone });
  const earliest = now.plus({ hours: q.clinic.anticipacionMinimaHoras });
  const lastDay = now.startOf('day').plus({ days: q.clinic.diasMaximosAgenda });
  let day = (q.fromDate ? DateTime.fromISO(q.fromDate, { zone }) : now).startOf('day');
  if (!day.isValid) day = now.startOf('day');
  if (day < now.startOf('day')) day = now.startOf('day');

  const slots: Slot[] = [];
  const step = q.clinic.intervaloMin;
  const dur = q.service.duracionMin;

  for (; day <= lastDay; day = day.plus({ days: 1 })) {
    const ranges = q.clinic.horario[WEEKDAYS[day.weekday - 1]!] ?? [];
    let perDay = 0;
    for (const [from, to] of ranges) {
      const [fh, fm] = from.split(':').map(Number) as [number, number];
      const [th, tm] = to.split(':').map(Number) as [number, number];
      const rangeEnd = day.set({ hour: th, minute: tm });
      for (let t = day.set({ hour: fh, minute: fm }); t.plus({ minutes: dur }) <= rangeEnd; t = t.plus({ minutes: step })) {
        if (t < earliest) continue;
        if (q.dayPart === 'manana' && t.hour >= 12) continue;
        if (q.dayPart === 'tarde' && t.hour < 12) continue;
        const start = t.toJSDate();
        const end = t.plus({ minutes: dur }).toJSDate();
        if (q.busy.some((b) => start < b.end && end > b.start)) continue;
        if (q.perDay !== undefined && perDay >= q.perDay) continue;
        slots.push({ start, end, iso: t.toISO({ suppressMilliseconds: true })!, label: formatSlotLabel(start, zone) });
        perDay++;
        if (q.limit !== undefined && slots.length >= q.limit) return slots;
      }
    }
    if (q.singleDay) break;
  }
  return slots;
}
