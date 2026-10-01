import { readFileSync } from 'node:fs';
import { z } from 'zod';

const timeRange = z.tuple([
  z.string().regex(/^\d{2}:\d{2}$/),
  z.string().regex(/^\d{2}:\d{2}$/),
]);

export const WEEKDAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

const clinicSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  zonaHoraria: z.string().default('America/Caracas'),
  telefonoEmergencias: z.string().default('911'),
  direccion: z.string(),
  comoLlegar: z.string().optional(),
  telefonoContacto: z.string().optional(),
  urlPoliticaDatos: z.string().optional(),
  horario: z.object(Object.fromEntries(WEEKDAYS.map((d) => [d, z.array(timeRange).default([])])) as Record<
    (typeof WEEKDAYS)[number],
    z.ZodDefault<z.ZodArray<typeof timeRange>>
  >),
  servicios: z
    .array(
      z.object({
        nombre: z.string(),
        duracionMin: z.number().int().positive(),
        precio: z.string().optional(),
        descripcion: z.string().optional(),
        agendable: z.boolean().default(true),
      }),
    )
    .min(1),
  profesionales: z.array(z.object({ nombre: z.string(), especialidad: z.string().optional() })).default([]),
  segurosAceptados: z.array(z.string()).default([]),
  formasDePago: z.array(z.string()).default([]),
  politicaCancelacion: z.string().optional(),
  faq: z.array(z.object({ pregunta: z.string(), respuesta: z.string() })).default([]),
  anticipacionMinimaHoras: z.number().default(2),
  diasMaximosAgenda: z.number().int().positive().default(30),
  intervaloMin: z.number().int().positive().default(30),
});

export type Clinic = z.infer<typeof clinicSchema>;
export type Service = Clinic['servicios'][number];

export function parseClinic(data: unknown): Clinic {
  const parsed = clinicSchema.safeParse(data);
  if (!parsed.success) throw new Error(`Invalid clinic config:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export function loadClinic(path: string): Clinic {
  return parseClinic(JSON.parse(readFileSync(path, 'utf8')));
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'una', 'un', 'y', 'o', 'con', 'cita', 'quiero']);

function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Finds a service by name, tolerant to accents, case, missing words ("consulta medicina general") and word order. */
export function findService(clinic: Clinic, name: string): Service | undefined {
  const n = normalize(name);
  const exact = clinic.servicios.find((s) => normalize(s.nombre) === n);
  if (exact) return exact;
  const q = tokens(name);
  if (q.length === 0) return undefined;
  let best: { s: Service; score: number } | undefined;
  for (const s of clinic.servicios) {
    const st = tokens(s.nombre);
    const hits = q.filter((t) => st.some((w) => w.startsWith(t) || t.startsWith(w))).length;
    const score = hits / Math.max(q.length, 1);
    if (hits > 0 && score >= 0.5 && (!best || score > best.score)) best = { s, score };
  }
  return best?.s;
}
