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

/** Common Meta error codes → what to do, in Spanish, for the console. */
const HINTS: Record<number, string> = {
  190: 'El token de WhatsApp venció o es inválido. Los tokens temporales duran 24 h: genera otro en "API Setup" o crea uno permanente.',
  100: 'Parámetro inválido. Revisa WHATSAPP_PHONE_NUMBER_ID (debe ser el "Phone number ID", no el número de teléfono).',
  10: 'El token no tiene permiso sobre este número. Revisa que el token sea de la misma app/negocio.',
  200: 'El token no tiene permiso sobre este número. Revisa que el token sea de la misma app/negocio.',
  131030: 'Con el número de prueba solo puedes escribir a números autorizados: agrega tu teléfono en "API Setup → To" y verifícalo.',
  131047: 'Pasaron más de 24 h desde el último mensaje del paciente: fuera de esa ventana solo se pueden enviar plantillas aprobadas.',
  131042: 'Problema de pago: agrega un método de pago en Meta Business (WhatsApp Manager → Configuración de pagos).',
  131026: 'El mensaje no se pudo entregar (el número no tiene WhatsApp o no aceptó los términos nuevos).',
  133010: 'El número del negocio no está registrado en la Cloud API.',
  132001: 'La plantilla no existe o no está aprobada en ese idioma.',
  131056: 'Demasiados mensajes seguidos al mismo número; espera un momento.',
  368: 'El número está bloqueado temporalmente por Meta por incumplir políticas.',
};

export class WhatsAppApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | undefined,
    readonly metaMessage: string,
  ) {
    super(`WhatsApp API ${status}${code !== undefined ? ` (código ${code})` : ''}: ${metaMessage}`);
  }

  get hint(): string | undefined {
    return this.code !== undefined ? HINTS[this.code] : undefined;
  }
}

/** One-line, human description of any error thrown while talking to WhatsApp. */
export function describeWhatsAppError(err: unknown): string {
  if (err instanceof WhatsAppApiError) return err.hint ? `${err.message}\n   → ${err.hint}` : err.message;
  return err instanceof Error ? err.message : String(err);
}

async function toApiError(res: Response): Promise<WhatsAppApiError> {
  const text = await res.text();
  try {
    const { error } = JSON.parse(text) as { error?: { message?: string; code?: number; error_data?: { details?: string } } };
    return new WhatsAppApiError(res.status, error?.code, [error?.message, error?.error_data?.details].filter(Boolean).join(' — ') || text);
  } catch {
    return new WhatsAppApiError(res.status, undefined, text);
  }
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

  /** Recipient formats that worked after a 131030 retry (e.g. Argentine 549… → 54…15…). */
  private aliases = new Map<string, string>();

  /**
   * Meta quirk (mostly with the free test number): Argentine and Mexican mobiles arrive as 549…/521…
   * but the allowed-recipient list stores them as 54+area+15+number / 52+number. Alternatives to try.
   */
  static recipientVariants(to: string): string[] {
    const out: string[] = [];
    const ar = to.match(/^549(\d{10})$/);
    if (ar) for (const areaLen of [3, 2, 4]) out.push(`54${ar[1]!.slice(0, areaLen)}15${ar[1]!.slice(areaLen)}`);
    const mx = to.match(/^521(\d{10})$/);
    if (mx) out.push(`52${mx[1]}`);
    return out;
  }

  /** Sends to a recipient, retrying alternative number formats when Meta answers 131030. */
  private async postTo(to: string, body: Record<string, unknown>): Promise<void> {
    const first = this.aliases.get(to) ?? to;
    try {
      return await this.post({ to: first, ...body });
    } catch (err) {
      if (!(err instanceof WhatsAppApiError) || err.code !== 131030) throw err;
      for (const alt of WhatsAppClient.recipientVariants(to).filter((v) => v !== first)) {
        try {
          await this.post({ to: alt, ...body });
          this.aliases.set(to, alt);
          return;
        } catch (e) {
          if (!(e instanceof WhatsAppApiError) || e.code !== 131030) throw e;
        }
      }
      throw err;
    }
  }

  private async post(body: unknown): Promise<void> {
    const res = await this.fetch(`${this.base}/${this.cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...(body as object) }),
    });
    if (!res.ok) throw await toApiError(res);
  }

  /** Subscribes this app to the WhatsApp Business Account so real messages reach the webhook. */
  async subscribeApp(wabaId: string): Promise<void> {
    const res = await this.fetch(`${this.base}/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.cfg.token}` },
    });
    if (!res.ok) throw await toApiError(res);
  }

  /** Reads the business phone number's public info (used by `npm run whatsapp`). */
  async phoneInfo(): Promise<{ display_phone_number?: string; verified_name?: string; quality_rating?: string; code_verification_status?: string }> {
    const res = await this.fetch(
      `${this.base}/${this.cfg.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
      { headers: { Authorization: `Bearer ${this.cfg.token}` } },
    );
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as any;
  }

  sendText(to: string, text: string): Promise<void> {
    return this.postTo(to, { type: 'text', text: { body: text.slice(0, 4096), preview_url: false } });
  }

  sendTemplate(to: string, name: string, lang: string, params: string[]): Promise<void> {
    return this.postTo(to, {
      type: 'template',
      template: {
        name,
        language: { code: lang },
        ...(params.length ? { components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] } : {}),
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
    if (!meta.ok) throw await toApiError(meta);
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
