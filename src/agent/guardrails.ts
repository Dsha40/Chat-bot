import type { Clinic } from '../config/clinic.ts';

function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Deterministic emergency detection. Runs BEFORE the model, so an urgent message never depends on the LLM.
 * Deliberately broad: a false positive only means a human gets notified.
 */
const EMERGENCY_PATTERNS: RegExp[] = [
  /dolor (muy )?(fuerte |intenso )?(en el|de|del) pecho/,
  /(me|le|nos) duele (mucho |muy fuerte |fuerte )?(el|en el) pecho/,
  /(opresion|presion|punzada) (fuerte )?en el pecho/,
  /(no respira|dejo de respirar)/,
  /(no puedo|no puede|me cuesta|le cuesta) respirar/,
  /(me falta|le falta) el aire/,
  /dificultad (para|al) respirar/,
  /\bme (estoy )?ahog/,
  /(sangrado|sangra|sangrando).{0,20}(mucho|abundante|no (se )?(para|detiene)|bastante)/,
  /hemorragia/,
  /(se|me) desmay/,
  /(golpe|golpeo|golpe fuerte) (en|de) la cabeza/,
  /embarazada.{0,40}(sangr|dolor fuerte|contracciones)/,
  /(cara|boca) (torcida|paralizada)|no puede hablar|perdio la fuerza/,
  /(perdio|perdi) el conocimiento/,
  /inconsciente/,
  /convulsi/,
  /infarto/,
  /derrame (cerebral)?/,
  /\bacv\b/,
  /(me quiero|quiero|me voy a) (morir|matar)/,
  /suicid/,
  /sobredosis/,
  /envenen|intoxicad/,
  /labios morados/,
  /(accidente|choque) grave/,
];

export function isEmergency(text: string): boolean {
  const t = normalize(text);
  return EMERGENCY_PATTERNS.some((p) => p.test(t));
}

export function emergencyReply(clinic: Clinic): string {
  return (
    `⚠️ Si se trata de una emergencia, llama ya al ${clinic.telefonoEmergencias} o acude a la emergencia más cercana. ` +
    `Este chat no puede atender urgencias médicas. Ya avisé al personal de ${clinic.nombre} para que te contacte.`
  );
}

export function introMessage(clinic: Clinic): string {
  const privacy = clinic.urlPoliticaDatos
    ? ` Usamos tus datos solo para gestionar tus citas (${clinic.urlPoliticaDatos}).`
    : ' Usamos tus datos solo para gestionar tus citas.';
  return (
    `Hola 👋 Soy el asistente virtual con inteligencia artificial de ${clinic.nombre}. ` +
    `Puedo darte información y ayudarte a agendar, cambiar o cancelar citas. ` +
    `No doy consejos médicos; si es una emergencia llama al ${clinic.telefonoEmergencias}.` +
    privacy
  );
}
