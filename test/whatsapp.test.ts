import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.ts';
import { parseWebhook, verifySignature, WhatsAppClient } from '../src/channels/whatsapp.ts';
import { createApp } from '../src/server.ts';
import { clinic, scriptedModel, setup } from './helpers.ts';

const SECRET = 'app-secret';
const sign = (body: string) => `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`;

function webhook(messages: unknown[], contacts = [{ wa_id: '584121112233', profile: { name: 'María' } }]) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'PNID' }, contacts, messages } }] }],
  };
}

describe('WhatsApp webhook parsing', () => {
  it('verifies signatures', () => {
    const body = '{"a":1}';
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
    expect(verifySignature(body, sign('{"a":2}'), SECRET)).toBe(false);
    expect(verifySignature(body, undefined, SECRET)).toBe(false);
  });

  it('normalizes text, buttons, voice notes and unsupported types; ignores statuses', () => {
    const parsed = parseWebhook({
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                contacts: [{ wa_id: '58412', profile: { name: 'Luis' } }],
                messages: [
                  { id: 'm1', from: '58412', type: 'text', text: { body: 'Hola' } },
                  { id: 'm2', from: '58412', type: 'interactive', interactive: { button_reply: { id: 'b', title: 'Sí' } } },
                  { id: 'm3', from: '58412', type: 'audio', audio: { id: 'MEDIA', mime_type: 'audio/ogg; codecs=opus' } },
                  { id: 'm4', from: '58412', type: 'sticker', sticker: {} },
                ],
              },
            },
            { field: 'messages', value: { statuses: [{ id: 'm0', status: 'delivered' }] } },
            { field: 'smb_message_echoes', value: { message_echoes: [{ from: 'BIZ', to: '58999' }] } },
          ],
        },
      ],
    });
    expect(parsed.messages.map((m) => [m.kind, m.text])).toEqual([
      ['text', 'Hola'],
      ['text', 'Sí'],
      ['audio', ''],
      ['unsupported', ''],
    ]);
    expect(parsed.messages[0]!.name).toBe('Luis');
    expect(parsed.messages[2]!.mediaId).toBe('MEDIA');
    expect(parsed.echoes).toEqual([{ to: '58999' }]);
  });
});

describe('WhatsApp end to end (Meta API mocked)', () => {
  function build(steps: Parameters<typeof scriptedModel>[0]) {
    const sent: any[] = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/MEDIA1')) return Response.json({ url: 'https://lookaside.example/audio', mime_type: 'audio/ogg; codecs=opus' });
      if (String(url).startsWith('https://lookaside.example')) return new Response(new Uint8Array([1, 2, 3]));
      sent.push({ url, body: JSON.parse(String(init?.body)) });
      return Response.json({ messages: [{ id: 'out' }] });
    }) as typeof fetch;
    const model = scriptedModel(steps);
    const { agent, store } = setup(model);
    const env = loadEnv({ WHATSAPP_VERIFY_TOKEN: 'verify-me', WHATSAPP_APP_SECRET: SECRET, DEBOUNCE_MS: '10' });
    const whatsapp = new WhatsAppClient({ token: 'T', phoneNumberId: 'PNID', apiVersion: 'v23.0', fetch: fakeFetch });
    const { app, buffer } = createApp({ env, clinic, store, agent, whatsapp });
    const post = (payload: unknown) => {
      const body = JSON.stringify(payload);
      return app.request('/webhook/whatsapp', { method: 'POST', body, headers: { 'x-hub-signature-256': sign(body) } });
    };
    return { app, buffer, sent, model, post, store };
  }

  it('answers the Meta verification challenge only with the right token', async () => {
    const { app } = build([{ text: 'x' }]);
    const ok = await app.request('/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123');
    expect(await ok.text()).toBe('123');
    const bad = await app.request('/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=123');
    expect(bad.status).toBe(403);
  });

  it('rejects unsigned requests', async () => {
    const { app } = build([{ text: 'x' }]);
    const res = await app.request('/webhook/whatsapp', { method: 'POST', body: '{}', headers: { 'x-hub-signature-256': 'sha256=00' } });
    expect(res.status).toBe(401);
  });

  it('merges a burst of messages, replies once via the Graph API and ignores duplicates', async () => {
    const { post, buffer, sent, model } = build([{ text: 'Hola María, la consulta cuesta USD 30.' }]);
    const m1 = { id: 'w1', from: '584121112233', type: 'text', text: { body: 'Hola' } };
    const m2 = { id: 'w2', from: '584121112233', type: 'text', text: { body: '¿cuánto cuesta la consulta?' } };

    expect((await post(webhook([m1]))).status).toBe(200);
    await post(webhook([m2]));
    await post(webhook([m2])); // duplicate delivery from Meta
    await buffer.drain();

    expect(model.doGenerateCalls).toHaveLength(1);
    const userMsg = model.doGenerateCalls[0]!.prompt.at(-1) as any;
    expect(userMsg.content[0].text).toBe('Hola\n¿cuánto cuesta la consulta?');

    const texts = sent.filter((s) => s.body.type === 'text');
    expect(texts.map((s) => s.body.text.body)).toEqual([
      expect.stringContaining('asistente virtual'),
      'Hola María, la consulta cuesta USD 30.',
    ]);
    expect(texts[0].url).toBe('https://graph.facebook.com/v23.0/PNID/messages');
    expect(texts[0].body.to).toBe('584121112233');
    expect(sent.some((s) => s.body.status === 'read')).toBe(true);
  });

  it('downloads voice notes and sends the audio to the model', async () => {
    const { post, buffer, model } = build([{ text: 'Entendí tu nota de voz.' }]);
    await post(webhook([{ id: 'a1', from: '584121112233', type: 'audio', audio: { id: 'MEDIA1', mime_type: 'audio/ogg; codecs=opus' } }]));
    await buffer.drain();
    const userMsg = model.doGenerateCalls[0]!.prompt.at(-1) as any;
    const file = userMsg.content.find((p: any) => p.type === 'file');
    expect(file.mediaType).toBe('audio/ogg');
  });

  it('serves the web demo chat', async () => {
    const { app } = build([{ text: 'Estamos en Chacao.' }]);
    expect((await app.request('/')).status).toBe(200);
    const res = await app.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'abc', text: '¿Dónde quedan?' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await res.json()).replies.at(-1)).toBe('Estamos en Chacao.');
  });
});

import { describeWhatsAppError, WhatsAppApiError } from '../src/channels/whatsapp.ts';

describe('WhatsApp API errors', () => {
  const failing = (code: number, message: string) =>
    (async () => Response.json({ error: { message, code } }, { status: 400 })) as unknown as typeof fetch;

  it.each([
    [190, 'token de WhatsApp venció'],
    [131030, 'números autorizados'],
    [131047, '24 h'],
    [100, 'Phone number ID'],
  ])('code %i gives a Spanish hint', async (code, hint) => {
    const wa = new WhatsAppClient({ token: 'T', phoneNumberId: 'P', apiVersion: 'v23.0', fetch: failing(code, 'meta says no') });
    const err = await wa.sendText('58412', 'hola').catch((e) => e);
    expect(err).toBeInstanceOf(WhatsAppApiError);
    expect(err.code).toBe(code);
    expect(describeWhatsAppError(err)).toContain(hint);
  });

  it('sends the hello_world template without empty components', async () => {
    const bodies: any[] = [];
    const wa = new WhatsAppClient({
      token: 'T',
      phoneNumberId: 'P',
      apiVersion: 'v23.0',
      fetch: (async (_u: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        return Response.json({});
      }) as typeof fetch,
    });
    await wa.sendTemplate('58412', 'hello_world', 'en_US', []);
    expect(bodies[0]).toEqual({
      messaging_product: 'whatsapp',
      to: '58412',
      type: 'template',
      template: { name: 'hello_world', language: { code: 'en_US' } },
    });
  });
});

describe('Argentine/Mexican number format quirk', () => {
  it('lists alternative formats', () => {
    expect(WhatsAppClient.recipientVariants('5493517554979')).toEqual(['54351157554979', '54351517554979', '54351715554979']);
    expect(WhatsAppClient.recipientVariants('5215512345678')).toEqual(['525512345678']);
    expect(WhatsAppClient.recipientVariants('584121234567')).toEqual([]);
  });

  it('retries with the 54+area+15 format on 131030 and remembers it', async () => {
    const tried: string[] = [];
    const wa = new WhatsAppClient({
      token: 'T',
      phoneNumberId: 'P',
      apiVersion: 'v23.0',
      fetch: (async (_u: string, init?: RequestInit) => {
        const to = JSON.parse(String(init?.body)).to as string;
        tried.push(to);
        return to === '54351157554979'
          ? Response.json({})
          : Response.json({ error: { message: 'not in allowed list', code: 131030 } }, { status: 400 });
      }) as typeof fetch,
    });
    await wa.sendText('5493517554979', 'hola');
    expect(tried).toEqual(['5493517554979', '54351157554979']);
    await wa.sendText('5493517554979', 'otra vez');
    expect(tried.at(-1)).toBe('54351157554979');
    expect(tried).toHaveLength(3);
  });

  it('does not retry for other numbers or other errors', async () => {
    let calls = 0;
    const wa = new WhatsAppClient({
      token: 'T',
      phoneNumberId: 'P',
      apiVersion: 'v23.0',
      fetch: (async () => {
        calls++;
        return Response.json({ error: { message: 'x', code: 131030 } }, { status: 400 });
      }) as typeof fetch,
    });
    await expect(wa.sendText('584121234567', 'hola')).rejects.toBeInstanceOf(WhatsAppApiError);
    expect(calls).toBe(1);
  });
});

import { handleStaffCommand } from '../src/channels/staff-commands.ts';
import { Store } from '../src/store/db.ts';

describe('staff control of the bot', () => {
  it('pauses and resumes globally and per patient', async () => {
    const store = new Store(':memory:');
    expect(handleStaffCommand('hola', store)).toBeNull();
    expect(handleStaffCommand('#pausa', store)).toContain('TODOS');
    expect(store.isBotPaused()).toBe(true);
    expect(handleStaffCommand('#estado', store)).toContain('PAUSADO');
    expect(handleStaffCommand('#Activa', store)).toContain('activo');
    expect(store.isBotPaused()).toBe(false);

    expect(handleStaffCommand('#pausa +58 412-111-2233', store)).toContain('584121112233');
    expect(store.getConversation('whatsapp:584121112233')!.handoffUntil).not.toBeNull();
    expect(handleStaffCommand('#estado', store)).toContain('584121112233');
    handleStaffCommand('#activa 584121112233', store);
    expect(store.getConversation('whatsapp:584121112233')!.handoffUntil).toBeNull();
    expect(handleStaffCommand('#loquesea', store)).toContain('Comandos del asistente');
  });

  it('the global pause silences the agent', async () => {
    const { agent, store } = setup(scriptedModel([{ text: 'no debería responder' }]));
    store.setBotPaused(true);
    expect(await agent.handle({ channel: 'whatsapp', userId: '58999', text: 'hola' })).toEqual([]);
    expect(store.recentMessages('whatsapp:58999', 5)).toHaveLength(1); // still stored
  });

  it('staff #commands over WhatsApp never reach the agent and patients are paused by echoes', async () => {
    const sent: any[] = [];
    const fakeFetch = (async (_u: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return Response.json({});
    }) as typeof fetch;
    const model = scriptedModel([{ text: 'respuesta del bot' }]);
    const { agent, store } = setup(model);
    const env = loadEnv({ WHATSAPP_APP_SECRET: SECRET, DEBOUNCE_MS: '10', STAFF_WHATSAPP: '58414000111, 58424000222', HANDOFF_HOURS: '6' });
    const whatsapp = new WhatsAppClient({ token: 'T', phoneNumberId: 'P', apiVersion: 'v23.0', fetch: fakeFetch });
    const { app, buffer } = createApp({ env, clinic, store, agent, whatsapp });
    const post = (payload: unknown) => {
      const body = JSON.stringify(payload);
      return app.request('/webhook/whatsapp', { method: 'POST', body, headers: { 'x-hub-signature-256': sign(body) } });
    };

    await post(webhook([{ id: 's1', from: '58424000222', type: 'text', text: { body: '#pausa' } }], []));
    await buffer.drain();
    expect(model.doGenerateCalls).toHaveLength(0);
    expect(store.isBotPaused()).toBe(true);
    expect(sent.find((b) => b.type === 'text').text.body).toContain('pausado');

    await post({ entry: [{ changes: [{ field: 'smb_message_echoes', value: { message_echoes: [{ from: 'BIZ', to: '58412777888' }] } }] }] });
    const until = new Date(store.getConversation('whatsapp:58412777888')!.handoffUntil!).getTime();
    expect(until - Date.now()).toBeGreaterThan(5.9 * 3_600_000);
    expect(until - Date.now()).toBeLessThan(6.1 * 3_600_000);
  });
});
