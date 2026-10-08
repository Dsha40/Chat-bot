import { readFileSync } from 'node:fs';
import { DateTime } from 'luxon';
import { bootstrap } from '../bootstrap.ts';
import { GoogleCalendar } from '../calendar/google.ts';

/**
 * Checks the calendar connection: which agenda is used, upcoming events and the next free slots the bot would offer.
 *   npm run calendario                      → read-only check
 *   npm run calendario -- --probar-escritura → also creates and deletes a test event
 */
const { env, clinic, calendar, agenda } = bootstrap();
const zone = clinic.zonaHoraria;
const fmt = (d: Date) => DateTime.fromJSDate(d, { zone }).setLocale('es').toFormat("ccc d LLL, HH:mm");

function explain(err: unknown, email: string): string {
  const e = err as { status?: number; response?: { status?: number }; code?: string; message?: string };
  const status = e.status ?? e.response?.status;
  if (e.code === 'ENOENT') return `No encuentro el archivo de la cuenta de servicio: ${env.GOOGLE_SERVICE_ACCOUNT_FILE}`;
  if (status === 404) return `Google no encuentra el calendario "${env.GOOGLE_CALENDAR_ID}". Revisa el ID y que esté compartido con ${email}.`;
  if (status === 403)
    return `Sin permiso. En Google Calendar comparte el calendario con ${email} y elige "Hacer cambios en eventos". Verifica también que la "Google Calendar API" esté habilitada en tu proyecto de Google Cloud.`;
  if (/invalid_grant/.test(e.message ?? ''))
    return `Google rechazó la cuenta de servicio (${email}). Descarga una clave JSON nueva desde Google Cloud y reemplaza el archivo.`;
  return e.message ?? String(err);
}

if (!(calendar instanceof GoogleCalendar)) {
  console.log('Agenda: INTERNA (las citas viven solo en la base de datos del bot).');
  console.log('Para usar Google Calendar, completa GOOGLE_SERVICE_ACCOUNT_FILE y GOOGLE_CALENDAR_ID en .env (ver README §4).\n');
} else {
  let email = '(desconocido)';
  try {
    email = JSON.parse(readFileSync(env.GOOGLE_SERVICE_ACCOUNT_FILE!, 'utf8')).client_email;
  } catch {}
  console.log(`Agenda: GOOGLE CALENDAR\n  calendario: ${env.GOOGLE_CALENDAR_ID}\n  cuenta de servicio: ${email}\n`);
  try {
    const from = new Date();
    const to = DateTime.fromJSDate(from).plus({ days: 7 }).toJSDate();
    const events = await calendar.listEvents(from, to);
    console.log(`✔ Lectura OK. Eventos en los próximos 7 días: ${events.length}`);
    for (const e of events.slice(0, 15)) {
      const when = e.start?.date ? `${e.start.date} (todo el día)` : fmt(new Date(e.start!.dateTime!));
      console.log(`   • ${when} — ${e.summary ?? '(sin título)'}${e.transparency === 'transparent' && !e.start?.date ? ' [libre]' : ''}`);
    }
    if (process.argv.includes('--probar-escritura')) {
      const start = DateTime.now().plus({ days: 1 }).startOf('day').set({ hour: 6 }).toJSDate();
      const id = await calendar.createEvent({
        summary: 'Prueba del asistente (se borra sola)',
        description: 'Creada por npm run calendario',
        start,
        end: new Date(start.getTime() + 15 * 60_000),
        timeZone: zone,
      });
      await calendar.deleteEvent(id);
      console.log('✔ Escritura OK (se creó y se borró un evento de prueba).');
    }
  } catch (err) {
    console.error(`✘ ${explain(err, email)}`);
    process.exit(1);
  }
  console.log('');
}

const service = clinic.servicios.find((s) => s.agendable)!;
const slots = await agenda.availableSlots({ service, limit: 8 });
console.log(`Próximos horarios libres para "${service.nombre}" (lo que ofrecería el bot):`);
for (const s of slots) console.log(`   • ${s.label}`);
if (slots.length === 0) console.log('   (ninguno: revisa el horario de la clínica en config/clinica.json)');
