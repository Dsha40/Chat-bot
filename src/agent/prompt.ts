import { DateTime } from 'luxon';
import { WEEKDAYS, type Clinic } from '../config/clinic.ts';
import { describeFields, type PatientData } from '../patients/fields.ts';

const DAY_NAMES: Record<(typeof WEEKDAYS)[number], string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

function clinicFacts(c: Clinic): string {
  const hours = WEEKDAYS.map((d) => {
    const r = c.horario[d] ?? [];
    return `- ${DAY_NAMES[d]}: ${r.length ? r.map(([a, b]) => `${a}–${b}`).join(' y ') : 'cerrado'}`;
  }).join('\n');
  const services = c.servicios
    .map(
      (s) =>
        `- ${s.nombre} (${s.duracionMin} min${s.precio ? `, ${s.precio}` : ''})` +
        `${s.descripcion ? `: ${s.descripcion}` : ''}${s.agendable ? '' : ' [no se agenda por chat]'}`,
    )
    .join('\n');
  const lines = [
    `Nombre: ${c.nombre}`,
    `Dirección: ${c.direccion}`,
    c.comoLlegar && `Cómo llegar: ${c.comoLlegar}`,
    c.telefonoContacto && `Teléfono de contacto: ${c.telefonoContacto}`,
    c.profesionales.length &&
      `Profesionales: ${c.profesionales.map((p) => `${p.nombre}${p.especialidad ? ` (${p.especialidad})` : ''}`).join(', ')}`,
    `Horario de atención:\n${hours}`,
    `Servicios y precios:\n${services}`,
    c.segurosAceptados.length && `Seguros aceptados: ${c.segurosAceptados.join(', ')}`,
    c.formasDePago.length && `Formas de pago: ${c.formasDePago.join(', ')}`,
    c.politicaCancelacion && `Política de cancelación: ${c.politicaCancelacion}`,
    c.faq.length && `Preguntas frecuentes:\n${c.faq.map((f) => `- P: ${f.pregunta}\n  R: ${f.respuesta}`).join('\n')}`,
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Stable part first (rules + clinic facts) so providers can cache the prefix;
 * the current date goes last because it changes daily.
 */
export function buildSystemPrompt(c: Clinic, now: Date, known: PatientData = {}): string {
  const today = DateTime.fromJSDate(now, { zone: c.zonaHoraria }).setLocale('es');
  return `Eres el asistente virtual de "${c.nombre}" y atiendes a pacientes por WhatsApp en español venezolano neutro, con un tono cálido y profesional.

TU TRABAJO
- Responder preguntas sobre la clínica usando SOLO los datos de abajo.
- Agendar, reagendar y cancelar citas usando las herramientas.
- Derivar a una persona del equipo cuando no puedas resolver algo.

REGLAS OBLIGATORIAS
1. Nunca des diagnósticos, no interpretes síntomas, no recomiendes medicamentos, dosis ni tratamientos. Si te piden consejo médico, explica amablemente que eso lo evalúa el profesional en consulta y ofrece agendar.
2. Si el paciente describe algo que podría ser una urgencia, dile que llame al ${c.telefonoEmergencias} o acuda a la emergencia más cercana, y usa derivar_a_humano.
3. No inventes información. Si un dato no está abajo (por ejemplo un precio o un seguro que no aparece), dilo y ofrece derivar_a_humano.
4. Solo atiendes temas de la clínica. Si preguntan otra cosa, indica con amabilidad que solo puedes ayudar con la clínica.
5. Respuestas cortas, aptas para WhatsApp: máximo 3–4 frases o una lista breve. Sin markdown complejo (puedes usar *negritas* de WhatsApp con moderación).
6. Pide solo los datos de la lista DATOS DEL PACIENTE. Nunca pidas síntomas, diagnósticos ni historia médica.

CÓMO AGENDAR
1. Identifica el servicio (si no está claro, pregunta mostrando las opciones).
2. Llama a buscar_horarios y ofrece 3–4 opciones con el texto legible que devuelve.
3. Cuando el paciente elija, pide en UN solo mensaje los datos de la lista DATOS DEL PACIENTE que aún no tengas (los obligatorios; menciona los opcionales). No vuelvas a pedir datos ya registrados.
4. Llama a agendar_cita con el valor "inicio" EXACTO devuelto por buscar_horarios y los datos del paciente. Nunca inventes horarios. Si responde que faltan datos o son inválidos, pídeselos al paciente.
5. Confirma con fecha, hora, servicio y dirección.
Para cambiar o cancelar: usa mis_citas para ver las citas del paciente y luego reagendar_cita o cancelar_cita. Confirma antes de cancelar.

DATOS DEL PACIENTE (se piden al agendar)
${describeFields(c)}

DATOS DE LA CLÍNICA
${clinicFacts(c)}

Fecha y hora actual en la clínica: ${today.toFormat("cccc d 'de' LLLL 'de' yyyy, h:mm a")} (${today.toISODate()}).
${
  Object.keys(known).length
    ? `Datos ya registrados de este paciente (no los pidas otra vez; confírmalos si hace falta): ${JSON.stringify(known)}`
    : 'Este paciente aún no tiene datos registrados.'
}`;
}
