import { describe, expect, it } from 'vitest';
import { computeSlots } from '../src/calendar/slots.ts';
import { isEmergency } from '../src/agent/guardrails.ts';
import { clinic, NOW } from './helpers.ts';

const service = clinic.servicios[0]!; // 30 min

describe('computeSlots', () => {
  it('respects opening hours, minimum notice and the per-day cap', () => {
    const slots = computeSlots({ clinic, service, now: NOW, busy: [], perDay: 3, limit: 6 });
    expect(slots.map((s) => s.iso)).toEqual([
      '2026-10-05T10:00:00-04:00',
      '2026-10-05T10:30:00-04:00',
      '2026-10-05T11:00:00-04:00',
      '2026-10-06T08:00:00-04:00',
      '2026-10-06T08:30:00-04:00',
      '2026-10-06T09:00:00-04:00',
    ]);
  });

  it('skips closed days (Saturday/Sunday) and busy intervals', () => {
    const slots = computeSlots({
      clinic,
      service,
      now: NOW,
      fromDate: '2026-10-10', // Saturday
      busy: [{ start: new Date('2026-10-12T12:00:00Z'), end: new Date('2026-10-12T13:00:00Z') }], // Mon 08:00–09:00
      limit: 2,
    });
    expect(slots.map((s) => s.iso)).toEqual(['2026-10-12T09:00:00-04:00', '2026-10-12T09:30:00-04:00']);
  });

  it('filters by afternoon and never runs past closing time', () => {
    const slots = computeSlots({ clinic, service, now: NOW, busy: [], dayPart: 'tarde', fromDate: '2026-10-05', singleDay: true });
    expect(slots[0]!.iso).toBe('2026-10-05T14:00:00-04:00');
    expect(slots.at(-1)!.iso).toBe('2026-10-05T17:30:00-04:00');
  });
});

describe('isEmergency', () => {
  it.each([
    'tengo dolor en el pecho',
    'Mi mamá no puede respirar',
    'está sangrando mucho y no se para',
    'me quiero morir',
    'mi hijo convulsionó',
    'Se desmayó en la casa',
    'me duele el pecho muy fuerte',
    'siento presión en el pecho',
    'mi papá no respira bien',
    'estoy embarazada y estoy sangrando',
    'se le torció la cara, cara torcida y no puede hablar',
  ])('detects: %s', (t) => expect(isEmergency(t)).toBe(true));

  it.each(['¿Atienden emergencias?', 'Quiero una cita para el lunes', 'tengo dolor de cabeza leve desde ayer', 'cuánto cuesta la consulta'])(
    'ignores: %s',
    (t) => expect(isEmergency(t)).toBe(false),
  );
});

import { findService } from '../src/config/clinic.ts';

describe('findService', () => {
  it.each([
    ['consulta medicina general', 'Consulta de medicina general'],
    ['CONSULTA', 'Consulta de medicina general'],
    ['un control', 'Control o seguimiento'],
    ['certificado', 'Certificado de salud'],
    ['electro', 'Electrocardiograma'],
  ])('%s → %s', (q, expected) => expect(findService(clinic, q)?.nombre).toBe(expected));

  it('returns undefined for unknown services', () => expect(findService(clinic, 'ortodoncia')).toBeUndefined());
});
