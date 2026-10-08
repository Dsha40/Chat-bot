import { tool } from 'ai';
import { z } from 'zod';
import type { Agenda } from '../calendar/agenda.ts';
import type { Clinic } from '../config/clinic.ts';
import { mergePatientData } from '../patients/fields.ts';
import type { Store } from '../store/db.ts';

export interface ToolContext {
  agenda: Agenda;
  store: Store;
  clinic: Clinic;
  conversationId: string;
  onHandoff: (reason: string) => Promise<void>;
}

function serviceList(clinic: Clinic): string[] {
  return clinic.servicios.filter((s) => s.agendable).map((s) => s.nombre);
}

/** Tools are built per conversation so the model can only see and change this patient's appointments. */
export function buildTools(ctx: ToolContext) {
  const { agenda, clinic, conversationId, store } = ctx;

  // One optional string per configured field; required-ness is checked against what we already know.
  const patientSchema = z.object(
    Object.fromEntries(
      clinic.datosPaciente.map((f) => [f.clave, z.string().optional().describe(f.etiqueta + (f.descripcion ? `. ${f.descripcion}` : ''))]),
    ),
  );

  function collect(incoming: Record<string, string | undefined>) {
    const r = mergePatientData(clinic, store.getPatient(conversationId), incoming);
    if (Object.keys(r.invalid).length === 0) store.savePatient(conversationId, r.data);
    return r;
  }

  return {
    buscar_horarios: tool({
      description:
        'Busca horarios disponibles para un servicio. Devuelve opciones con "inicio" (valor exacto para agendar) y "texto" (para mostrar al paciente).',
      inputSchema: z.object({
        servicio: z.string().describe('Nombre del servicio, tal como aparece en la lista de servicios'),
        desde: z.string().optional().describe('Fecha desde la cual buscar, formato YYYY-MM-DD. Omitir para buscar desde hoy.'),
        franja: z.enum(['manana', 'tarde', 'cualquiera']).optional().describe('Preferencia del paciente'),
      }),
      execute: async ({ servicio, desde, franja }) => {
        const service = agenda.resolveService(servicio);
        if (!service) return { error: 'Servicio no encontrado', serviciosAgendables: serviceList(clinic) };
        if (!service.agendable) return { error: `"${service.nombre}" no se agenda por chat`, serviciosAgendables: serviceList(clinic) };
        const slots = await agenda.availableSlots({ service, fromDate: desde, dayPart: franja });
        if (slots.length === 0) return { servicio: service.nombre, horarios: [], nota: 'No hay horarios disponibles en ese rango.' };
        return {
          servicio: service.nombre,
          duracionMin: service.duracionMin,
          horarios: slots.map((s) => ({ inicio: s.iso, texto: s.label })),
        };
      },
    }),

    guardar_datos_paciente: tool({
      description:
        'Guarda o corrige datos del paciente (los de la lista DATOS DEL PACIENTE). Úsala cuando el paciente los dé o quiera corregirlos.',
      inputSchema: z.object({ datosPaciente: patientSchema }),
      execute: async ({ datosPaciente }) => {
        const r = collect(datosPaciente);
        if (Object.keys(r.invalid).length) return { ok: false, invalidos: r.invalid };
        return { ok: true, faltanObligatorios: r.missing };
      },
    }),

    agendar_cita: tool({
      description:
        'Agenda una cita. Usa el valor "inicio" EXACTO devuelto por buscar_horarios e incluye los datos del paciente que te haya dado.',
      inputSchema: z.object({
        servicio: z.string(),
        inicio: z.string().describe('Valor "inicio" devuelto por buscar_horarios'),
        datosPaciente: patientSchema.describe('Datos del paciente según la lista DATOS DEL PACIENTE'),
      }),
      execute: async ({ servicio, inicio, datosPaciente }) => {
        const p = collect(datosPaciente ?? {});
        if (Object.keys(p.invalid).length || p.missing.length) {
          return { ok: false, motivo: 'Faltan o son inválidos algunos datos del paciente', faltan: p.missing, invalidos: p.invalid };
        }
        const r = await agenda.book({
          conversationId,
          patientName: p.data.nombre!,
          serviceName: servicio,
          startIso: inicio,
          patientData: p.data,
        });
        if (!r.ok) {
          return { ok: false, motivo: r.reason, alternativas: r.alternatives?.map((s) => ({ inicio: s.iso, texto: s.label })) };
        }
        return {
          ok: true,
          citaId: r.appointment.id,
          servicio: r.appointment.service,
          fechaHora: r.label,
          direccion: clinic.direccion,
        };
      },
    }),

    mis_citas: tool({
      description: 'Lista las próximas citas confirmadas de este paciente.',
      inputSchema: z.object({}),
      execute: async () => ({
        citas: agenda.upcoming(conversationId).map((a) => ({ citaId: a.id, servicio: a.service, fechaHora: a.label, paciente: a.patientName })),
      }),
    }),

    cancelar_cita: tool({
      description: 'Cancela una cita del paciente. Confirma con el paciente antes de usarla.',
      inputSchema: z.object({ citaId: z.string() }),
      execute: async ({ citaId }) => {
        const r = await agenda.cancel(conversationId, citaId);
        return r.ok ? { ok: true } : { ok: false, motivo: r.reason };
      },
    }),

    reagendar_cita: tool({
      description: 'Mueve una cita existente a un nuevo horario. Usa un "inicio" devuelto por buscar_horarios.',
      inputSchema: z.object({ citaId: z.string(), nuevoInicio: z.string() }),
      execute: async ({ citaId, nuevoInicio }) => {
        const r = await agenda.reschedule(conversationId, citaId, nuevoInicio);
        if (!r.ok) {
          return { ok: false, motivo: r.reason, alternativas: r.alternatives?.map((s) => ({ inicio: s.iso, texto: s.label })) };
        }
        return { ok: true, citaId: r.appointment.id, fechaHora: r.label };
      },
    }),

    derivar_a_humano: tool({
      description:
        'Pasa la conversación a una persona del equipo: urgencias, quejas, preguntas sin respuesta en los datos, o si el paciente lo pide.',
      inputSchema: z.object({ motivo: z.string() }),
      execute: async ({ motivo }) => {
        await ctx.onHandoff(motivo);
        return { ok: true, nota: 'Una persona del equipo continuará la conversación lo antes posible.' };
      },
    }),
  };
}
