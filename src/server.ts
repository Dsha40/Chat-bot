import { Hono } from 'hono';
import type { ClinicAgent } from './agent/agent.ts';
import type { Clinic } from './config/clinic.ts';
import type { Env } from './config/env.ts';
import { webChatPage } from './channels/web-page.ts';
import { appointmentsCsv, patientsCsv } from './export/csv.ts';
import {
  describeWhatsAppError,
  MessageBuffer,
  parseWebhook,
  verifySignature,
  type WaInbound,
  type WhatsAppClient,
} from './channels/whatsapp.ts';
import type { Store } from './store/db.ts';

export interface AppDeps {
  env: Env;
  clinic: Clinic;
  store: Store;
  agent: ClinicAgent;
  whatsapp?: WhatsAppClient;
}

export function createApp(deps: AppDeps) {
  const { env, clinic, store, agent, whatsapp } = deps;
  const app = new Hono();

  // --- WhatsApp: merge bursts of messages per patient, then answer ---
  const buffer = new MessageBuffer<WaInbound & { audio?: { data: Uint8Array; mediaType: string } }>(
    env.DEBOUNCE_MS,
    async (from, items) => {
      const audio = items.find((m) => m.audio)?.audio;
      const text = items
        .map((m) => m.text)
        .filter(Boolean)
        .join('\n');
      console.log(`[whatsapp] ← ${from}${items[0]?.name ? ` (${items[0].name})` : ''}: ${audio ? '[nota de voz] ' : ''}${text}`);
      const replies = await agent.handle({ channel: 'whatsapp', userId: from, name: items[0]?.name, text, audio });
      if (replies.length === 0) console.log(`[whatsapp]   (bot en pausa: una persona atiende a ${from})`);
      for (const r of replies) {
        try {
          await whatsapp!.sendText(from, r);
          console.log(`[whatsapp] → ${from}: ${r.length > 120 ? `${r.slice(0, 120)}…` : r}`);
        } catch (err) {
          console.error(`[whatsapp] ✘ no pude enviar la respuesta a ${from}: ${describeWhatsAppError(err)}`);
          return;
        }
      }
    },
  );

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/webhook/whatsapp', (c) => {
    const q = c.req.query();
    if (q['hub.mode'] === 'subscribe' && env.WHATSAPP_VERIFY_TOKEN && q['hub.verify_token'] === env.WHATSAPP_VERIFY_TOKEN) {
      console.log('[whatsapp] ✔ Meta verificó el webhook correctamente');
      return c.text(q['hub.challenge'] ?? '');
    }
    console.warn('[whatsapp] ✘ Meta intentó verificar el webhook con un "Verify token" distinto a WHATSAPP_VERIFY_TOKEN');
    return c.text('Forbidden', 403);
  });

  app.post('/webhook/whatsapp', async (c) => {
    const raw = await c.req.text();
    if (env.WHATSAPP_APP_SECRET) {
      if (!verifySignature(raw, c.req.header('x-hub-signature-256'), env.WHATSAPP_APP_SECRET)) {
        console.warn('[whatsapp] ✘ firma inválida: revisa que WHATSAPP_APP_SECRET sea el "App secret" de esta app de Meta');
        return c.text('Invalid signature', 401);
      }
    } else {
      console.warn('[whatsapp] WHATSAPP_APP_SECRET not set: webhook signature NOT verified');
    }
    if (!whatsapp) return c.text('WhatsApp not configured', 503);

    const { messages, echoes } = parseWebhook(JSON.parse(raw));
    // Staff answered from the WhatsApp Business app: pause the bot for that patient.
    for (const e of echoes) store.setHandoff(`whatsapp:${e.to}`, new Date(Date.now() + 12 * 3_600_000));

    for (const m of messages) {
      if (!store.markProcessed(m.id)) continue; // duplicate delivery
      whatsapp.markRead(m.id).catch(() => undefined);
      if (m.kind === 'unsupported') {
        await whatsapp
          .sendText(m.from, 'Por ahora solo puedo leer mensajes de texto y notas de voz 🙏. ¿Me lo escribes, por favor?')
          .catch((err) => console.error(`[whatsapp] ✘ ${describeWhatsAppError(err)}`));
        continue;
      }
      if (m.kind === 'audio' && m.mediaId) {
        try {
          const audio = await whatsapp.downloadMedia(m.mediaId);
          buffer.add(m.from, { ...m, audio });
        } catch (err) {
          console.error(`[whatsapp] ✘ no pude descargar la nota de voz: ${describeWhatsAppError(err)}`);
          await whatsapp.sendText(m.from, 'No pude escuchar tu nota de voz. ¿Me lo escribes, por favor?').catch(() => undefined);
        }
        continue;
      }
      buffer.add(m.from, m);
    }
    // Meta expects a fast 200; replies are sent asynchronously.
    return c.text('OK');
  });

  // --- Web demo chat ---
  app.get('/', (c) => c.html(webChatPage(clinic.nombre)));
  app.post('/api/chat', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { sessionId?: string; text?: string };
    const sessionId = String(body.sessionId ?? '').slice(0, 64);
    const text = String(body.text ?? '').slice(0, 2000).trim();
    if (!sessionId || !text) return c.json({ error: 'sessionId and text are required' }, 400);
    const replies = await agent.handle({ channel: 'web', userId: sessionId, text });
    return c.json({ replies });
  });

  // --- Admin ---
  const admin = new Hono();
  admin.use(async (c, next) => {
    // Header for scripts; ?token= so the clinic can download exports from a browser link.
    const token = c.req.header('authorization')?.replace(/^Bearer /, '') ?? c.req.query('token');
    if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return c.text('Unauthorized', 401);
    await next();
  });
  const csvResponse = (body: string, name: string) =>
    new Response(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  admin.get('/export/citas.csv', () => csvResponse(appointmentsCsv(store, clinic), 'citas'));
  admin.get('/export/pacientes.csv', () => csvResponse(patientsCsv(store, clinic), 'pacientes'));
  admin.get('/costs', (c) => c.json(store.usageSummary()));
  admin.post('/resume', async (c) => {
    const { conversationId } = (await c.req.json().catch(() => ({}))) as { conversationId?: string };
    if (!conversationId || !store.getConversation(conversationId)) return c.json({ error: 'conversation not found' }, 404);
    store.setHandoff(conversationId, null);
    return c.json({ ok: true });
  });
  app.route('/admin', admin);

  return { app, buffer };
}
