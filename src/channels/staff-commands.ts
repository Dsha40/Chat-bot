import { DateTime } from 'luxon';
import type { Store } from '../store/db.ts';

const DAY = 24 * 3_600_000;
/** How long "#pausa NUMBER" silences the bot for one patient (until "#activa NUMBER"). */
const PATIENT_PAUSE_DAYS = 30;

export function parseStaffNumbers(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((n) => n.replace(/\D/g, ''))
    .filter(Boolean);
}

const HELP = [
  'Comandos del asistente:',
  '• #pausa → el bot deja de responder a TODOS',
  '• #activa → el bot vuelve a responder',
  '• #pausa 58412XXXXXXX → pausa el bot solo con ese paciente',
  '• #activa 58412XXXXXXX → reactiva el bot con ese paciente',
  '• #estado → ver qué está pausado',
].join('\n');

/**
 * Commands that clinic staff send to the bot's number from their own phone (never seen by patients).
 * Returns the reply to send, or null when the text is not a command.
 */
export function handleStaffCommand(text: string, store: Store, now: Date = new Date(), zone = 'America/Caracas'): string | null {
  const t = text.trim().toLowerCase();
  if (!t.startsWith('#')) return null;
  const [cmd = '', ...rest] = t.slice(1).split(/\s+/);
  const number = rest.join('').replace(/\D/g, '') || undefined;

  if (/^(pausa|pausar|off|apagar)$/.test(cmd)) {
    if (number) {
      store.getOrCreateConversation('whatsapp', number);
      store.setHandoff(`whatsapp:${number}`, new Date(now.getTime() + PATIENT_PAUSE_DAYS * DAY));
      return `⏸️ Bot pausado con ${number}. Escribe "#activa ${number}" para reactivarlo.`;
    }
    store.setBotPaused(true);
    return '⏸️ Bot pausado para TODOS los pacientes. Los mensajes quedan guardados. Escribe "#activa" para reactivarlo.';
  }
  if (/^(activa|activar|on|encender)$/.test(cmd)) {
    if (number) {
      store.setHandoff(`whatsapp:${number}`, null);
      return `▶️ Bot reactivado con ${number}.`;
    }
    store.setBotPaused(false);
    return '▶️ Bot activo: vuelve a responder a todos (salvo pacientes pausados individualmente; ver "#estado").';
  }
  if (cmd === 'estado') {
    const paused = store.pausedConversations(now.toISOString());
    const lines = [store.isBotPaused() ? '⏸️ Bot PAUSADO para todos.' : '▶️ Bot ACTIVO.'];
    if (paused.length) {
      lines.push('Pacientes atendidos por una persona (bot callado):');
      for (const c of paused.slice(0, 20)) {
        const until = DateTime.fromISO(c.handoffUntil!, { zone }).setLocale('es').toFormat("d LLL, HH:mm");
        lines.push(`• ${c.userId}${c.name ? ` (${c.name})` : ''} hasta ${until}`);
      }
    } else lines.push('Ningún paciente pausado individualmente.');
    return lines.join('\n');
  }
  return HELP;
}
