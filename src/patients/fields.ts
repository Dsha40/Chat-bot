import { DateTime } from 'luxon';
import type { Clinic, PatientField } from '../config/clinic.ts';

export type PatientData = Record<string, string>;

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Options for an "opcion" field; for the insurance field it defaults to the clinic's accepted insurers. */
export function fieldOptions(clinic: Clinic, f: PatientField): string[] | undefined {
  if (f.opciones?.length) return f.opciones;
  if (f.tipo === 'opcion' && f.clave === 'seguro') return [...clinic.segurosAceptados, 'Particular (sin seguro)'];
  return undefined;
}

/** Validates and normalizes one value. Returns the clean value or an error message for the model. */
export function normalizeField(clinic: Clinic, f: PatientField, raw: string): { value: string } | { error: string } {
  const v = raw.trim().replace(/\s+/g, ' ');
  if (!v) return { error: 'vacío' };
  switch (f.tipo) {
    case 'cedula': {
      // Venezuelan ID: V/E/J/P prefix + 5–10 digits, written in any way ("v12.345.678", "12345678").
      const m = v.toUpperCase().replace(/[.\s-]/g, '').match(/^([VEJP])?(\d{5,10})$/);
      return m ? { value: `${m[1] ?? 'V'}-${m[2]}` } : { error: 'cédula inválida (ejemplo: V-12345678)' };
    }
    case 'telefono': {
      const digits = v.replace(/[^\d]/g, '');
      return digits.length >= 7 && digits.length <= 15 ? { value: digits } : { error: 'teléfono inválido' };
    }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? { value: v.toLowerCase() } : { error: 'correo inválido' };
    case 'fecha': {
      const formats = ['d/M/yyyy', 'd-M-yyyy', 'yyyy-MM-dd', 'd/M/yy', 'd.M.yyyy'];
      for (const fmt of formats) {
        const d = DateTime.fromFormat(v, fmt);
        if (d.isValid && d.year > 1900 && d <= DateTime.now()) return { value: d.toFormat('dd/MM/yyyy') };
      }
      return { error: 'fecha inválida (formato dd/mm/aaaa)' };
    }
    case 'opcion': {
      const options = fieldOptions(clinic, f) ?? [];
      const n = normalizeText(v);
      const match = options.find((o) => normalizeText(o) === n) ?? options.find((o) => normalizeText(o).includes(n) || n.includes(normalizeText(o)));
      return match ? { value: match } : { error: `debe ser una de: ${options.join(', ')}` };
    }
    default:
      return v.length <= 200 ? { value: v } : { error: 'demasiado largo' };
  }
}

/**
 * Merges new values over what we already know about the patient, validates everything,
 * and reports which required fields are still missing.
 */
export function mergePatientData(
  clinic: Clinic,
  known: PatientData,
  incoming: Record<string, string | undefined>,
): { data: PatientData; missing: string[]; invalid: Record<string, string> } {
  const data: PatientData = { ...known };
  const invalid: Record<string, string> = {};
  for (const f of clinic.datosPaciente) {
    const raw = incoming[f.clave];
    if (raw === undefined || raw.trim() === '') continue;
    const r = normalizeField(clinic, f, raw);
    if ('error' in r) invalid[f.etiqueta] = r.error;
    else data[f.clave] = r.value;
  }
  const missing = clinic.datosPaciente.filter((f) => f.obligatorio && !data[f.clave]).map((f) => f.etiqueta);
  return { data, missing, invalid };
}

/** Text block for the system prompt describing what to ask. */
export function describeFields(clinic: Clinic): string {
  return clinic.datosPaciente
    .map((f) => {
      const opts = fieldOptions(clinic, f);
      return `- ${f.etiqueta} [clave: ${f.clave}] (${f.obligatorio ? 'obligatorio' : 'opcional'})${f.descripcion ? `: ${f.descripcion}` : ''}${
        opts ? ` — opciones: ${opts.join(', ')}` : ''
      }`;
    })
    .join('\n');
}
