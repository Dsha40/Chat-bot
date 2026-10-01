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
