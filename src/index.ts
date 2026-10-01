import { serve } from '@hono/node-server';
import { bootstrap } from './bootstrap.ts';
import { sendDueReminders } from './reminders.ts';
import { createApp } from './server.ts';

const deps = bootstrap();
const { app } = createApp(deps);

serve({ fetch: app.fetch, port: deps.env.PORT }, (info) => {
  console.log(`Asistente de "${deps.clinic.nombre}" escuchando en http://localhost:${info.port}`);
  console.log(`  modelo: ${deps.env.LLM_MODEL}${deps.env.LLM_FALLBACK_MODEL ? ` (respaldo ${deps.env.LLM_FALLBACK_MODEL})` : ''}`);
  console.log(`  agenda: ${deps.calendar.name} · WhatsApp: ${deps.whatsapp ? 'configurado' : 'NO configurado (solo chat web)'}`);
});

if (deps.whatsapp) {
  const tick = () => sendDueReminders({ ...deps, whatsapp: deps.whatsapp! }).catch((err) => console.error('[reminders]', err));
  setInterval(tick, 15 * 60_000);
  tick();
}
