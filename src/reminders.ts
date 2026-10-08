import type { Clinic } from './config/clinic.ts';
import type { Env } from './config/env.ts';
import { formatSlotLabel } from './calendar/slots.ts';
import type { WhatsAppClient } from './channels/whatsapp.ts';
import type { Store } from './store/db.ts';

const HOUR = 3_600_000;

/**
 * Day-before reminders for WhatsApp appointments. Outside the 24 h customer-service window
 * WhatsApp only allows approved templates, so WHATSAPP_REMINDER_TEMPLATE is needed in that case.
 */
export async function sendDueReminders(opts: { store: Store; clinic: Clinic; env: Env; whatsapp: WhatsAppClient; now?: Date }) {
  const { store, clinic, env, whatsapp } = opts;
  const now = opts.now ?? new Date();
  const due = store.pendingReminders(new Date(now.getTime() + 20 * HOUR).toISOString(), new Date(now.getTime() + 24 * HOUR).toISOString());
  for (const a of due) {
    const conv = store.getConversation(a.conversationId);
    store.updateAppointment(a.id, { reminderSent: true });
    if (!conv || conv.channel !== 'whatsapp') continue;
    const when = formatSlotLabel(new Date(a.start), clinic.zonaHoraria);
    const insideWindow = conv.lastUserAt && now.getTime() - new Date(conv.lastUserAt).getTime() < 23 * HOUR;
    try {
      if (env.WHATSAPP_REMINDER_TEMPLATE) {
        await whatsapp.sendTemplate(conv.userId, env.WHATSAPP_REMINDER_TEMPLATE, env.WHATSAPP_TEMPLATE_LANG, [a.patientName, when, clinic.nombre]);
      } else if (insideWindow) {
        await whatsapp.sendText(
          conv.userId,
          `Hola ${a.patientName} 👋 Te recordamos tu cita de ${a.service} el ${when} en ${clinic.nombre} (ticket #${a.id}). Si necesitas cambiarla o cancelarla, respóndeme por aquí con tu número de ticket.`,
        );
      } else {
        console.warn(`[reminders] appointment ${a.id}: no template configured and 24 h window closed; reminder skipped`);
      }
    } catch (err) {
      console.error(`[reminders] failed for appointment ${a.id}`, err);
    }
  }
}
