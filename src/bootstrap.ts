import { join } from 'node:path';
import { ClinicAgent } from './agent/agent.ts';
import { Agenda } from './calendar/agenda.ts';
import { GoogleCalendar } from './calendar/google.ts';
import { InternalCalendar, type CalendarProvider } from './calendar/types.ts';
import { WhatsAppClient } from './channels/whatsapp.ts';
import { loadClinic } from './config/clinic.ts';
import { loadEnv } from './config/env.ts';
import { createModels } from './llm/models.ts';
import { Store } from './store/db.ts';

/** Wires every dependency from environment variables. */
export function bootstrap() {
  const env = loadEnv();
  const clinic = loadClinic(env.CLINIC_CONFIG);
  const store = new Store(join(env.DATA_DIR, 'chatbot.db'));
  const calendar: CalendarProvider =
    env.GOOGLE_SERVICE_ACCOUNT_FILE && env.GOOGLE_CALENDAR_ID
      ? new GoogleCalendar(env.GOOGLE_SERVICE_ACCOUNT_FILE, env.GOOGLE_CALENDAR_ID)
      : new InternalCalendar();
  const agenda = new Agenda(store, clinic, calendar);
  const whatsapp =
    env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID
      ? new WhatsAppClient({ token: env.WHATSAPP_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, apiVersion: env.WHATSAPP_API_VERSION })
      : undefined;
  const agent = new ClinicAgent({
    store,
    clinic,
    agenda,
    models: createModels(env),
    notifyStaff:
      whatsapp && env.STAFF_WHATSAPP ? (text) => whatsapp.sendText(env.STAFF_WHATSAPP!, text) : async (text) => console.log(`[staff] ${text}`),
  });
  return { env, clinic, store, calendar, agenda, whatsapp, agent };
}
