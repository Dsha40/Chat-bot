import { createHmac, timingSafeEqual } from 'node:crypto';

/** Normalized inbound WhatsApp message. */
export interface WaInbound {
  id: string;
  from: string;
  name?: string;
  phoneNumberId?: string;
  kind: 'text' | 'audio' | 'unsupported';
  text: string;
  mediaId?: string;
  mediaType?: string;
}

/** A message sent by clinic staff from the WhatsApp Business app on the same number (coexistence). */
export interface WaEcho {
  to: string;
}

export interface ParsedWebhook {
  messages: WaInbound[];
  echoes: WaEcho[];
}

/** Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body with the app secret). */
export function verifySignature(rawBody: string, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = header.slice('sha256='.length);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
}

export function parseWebhook(body: any): ParsedWebhook {
  const out: ParsedWebhook = { messages: [], echoes: [] };
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      if (change?.field === 'smb_message_echoes') {
        for (const e of value.message_echoes ?? []) if (e?.to) out.echoes.push({ to: String(e.to) });
        continue;
      }
      if (change?.field !== 'messages') continue;
      const names = new Map<string, string>();
      for (const c of value.contacts ?? []) if (c?.wa_id) names.set(c.wa_id, c.profile?.name);
      for (const m of value.messages ?? []) {
        const base = {
          id: String(m.id),
          from: String(m.from),
          name: names.get(m.from),
          phoneNumberId: value.metadata?.phone_number_id,
        };
        switch (m.type) {
          case 'text':
            out.messages.push({ ...base, kind: 'text', text: m.text?.body ?? '' });
            break;
          case 'interactive': {
            const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
            out.messages.push({ ...base, kind: 'text', text: r?.title ?? '' });
            break;
          }
          case 'button':
            out.messages.push({ ...base, kind: 'text', text: m.button?.text ?? '' });
            break;
          case 'audio':
            out.messages.push({ ...base, kind: 'audio', text: '', mediaId: m.audio?.id, mediaType: m.audio?.mime_type });
            break;
          default:
            out.messages.push({ ...base, kind: 'unsupported', text: '' });
        }
      }
    }
  }
  return out;
}

export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  fetch?: typeof fetch;
}

/** Minimal WhatsApp Cloud API client (official API only, see ADR 0003). */
export class WhatsAppClient {
  private base: string;
  private fetch: typeof fetch;

  constructor(private cfg: WhatsAppConfig) {
    this.base = `https://graph.facebook.com/${cfg.apiVersion}`;
    this.fetch = cfg.fetch ?? fetch;
  }

  private async post(body: unknown): Promise<void> {
    const res = await this.fetch(`${this.base}/${this.cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...(body as object) }),
    });
    if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
  }

  sendText(to: string, text: string): Promise<void> {
    return this.post({ to, type: 'text', text: { body: text.slice(0, 4096), preview_url: false } });
  }

  sendTemplate(to: string, name: string, lang: string, params: string[]): Promise<void> {
    return this.post({
      to,
      type: 'template',
      template: {
        name,
        language: { code: lang },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    });
  }

  markRead(messageId: string): Promise<void> {
    return this.post({ status: 'read', message_id: messageId });
  }

  /** Downloads a media file (e.g. a voice note): first resolve its URL, then fetch the bytes. */
  async downloadMedia(mediaId: string): Promise<{ data: Uint8Array; mediaType: string }> {
    const auth = { Authorization: `Bearer ${this.cfg.token}` };
    const meta = await this.fetch(`${this.base}/${mediaId}`, { headers: auth });
    if (!meta.ok) throw new Error(`WhatsApp media ${meta.status}: ${await meta.text()}`);
    const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
    const file = await this.fetch(url, { headers: auth });
    if (!file.ok) throw new Error(`WhatsApp media download ${file.status}`);
    return { data: new Uint8Array(await file.arrayBuffer()), mediaType: mime_type.split(';')[0]!.trim() };
  }
}

/**
 * Patients often send several short messages in a row. This buffer waits `delayMs` after the last
 * one and processes them together (fewer model calls and fewer paid replies), one user at a time.
 */
export class MessageBuffer<T> {
  private pending = new Map<string, { items: T[]; timer: NodeJS.Timeout }>();
  private chains = new Map<string, Promise<void>>();

  constructor(
    private delayMs: number,
    private flush: (key: string, items: T[]) => Promise<void>,
  ) {}

  add(key: string, item: T): void {
    const p = this.pending.get(key);
    if (p) clearTimeout(p.timer);
    const items = p ? [...p.items, item] : [item];
    const timer = setTimeout(() => {
      this.pending.delete(key);
      const prev = this.chains.get(key) ?? Promise.resolve();
      const next = prev
        .then(() => this.flush(key, items))
        .catch((err) => console.error(`[buffer] processing failed for ${key}`, err));
      this.chains.set(key, next);
    }, this.delayMs);
    this.pending.set(key, { items, timer });
  }

  /** Resolves when everything queued so far has been processed (used in tests and on shutdown). */
  async drain(): Promise<void> {
    while (this.pending.size > 0) await new Promise((r) => setTimeout(r, this.delayMs + 5));
    await Promise.all(this.chains.values());
  }
}
