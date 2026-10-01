import { Hono } from 'hono';
import type { ClinicAgent } from './agent/agent.ts';
import type { Clinic } from './config/clinic.ts';
import type { Env } from './config/env.ts';
import { webChatPage } from './channels/web-page.ts';
import { MessageBuffer, parseWebhook, verifySignature, type WaInbound, type WhatsAppClient } from './channels/whatsapp.ts';
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
      const replies = await agent.handle({ channel: 'whatsapp', userId: from, name: items[0]?.name, text, audio });
      for (const r of replies) await whatsapp!.sendText(from, r);
    },
  );

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/webhook/whatsapp', (c) => {
    const q = c.req.query();
    if (q['hub.mode'] === 'subscribe' && env.WHATSAPP_VERIFY_TOKEN && q['hub.verify_token'] === env.WHATSAPP_VERIFY_TOKEN) {
      return c.text(q['hub.challenge'] ?? '');
    }
    return c.text('Forbidden', 403);
  });

  app.post('/webhook/whatsapp', async (c) => {
    const raw = await c.req.text();
    if (env.WHATSAPP_APP_SECRET) {
      if (!verifySignature(raw, c.req.header('x-hub-signature-256'), env.WHATSAPP_APP_SECRET)) {
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
          .catch((err) => console.error('[whatsapp] send failed', err));
        continue;
      }
      if (m.kind === 'audio' && m.mediaId) {
        try {
          const audio = await whatsapp.downloadMedia(m.mediaId);
          buffer.add(m.from, { ...m, audio });
        } catch (err) {
          console.error('[whatsapp] audio download failed', err);
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
    if (!env.ADMIN_TOKEN || c.req.header('authorization') !== `Bearer ${env.ADMIN_TOKEN}`) return c.text('Unauthorized', 401);
    await next();
  });
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
