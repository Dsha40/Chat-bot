import { generateText, isStepCount, type LanguageModel, type ModelMessage } from 'ai';
import type { Agenda } from '../calendar/agenda.ts';
import type { Clinic } from '../config/clinic.ts';
import { costUsd } from '../llm/pricing.ts';
import type { Store } from '../store/db.ts';
import { emergencyReply, introMessage, isEmergency } from './guardrails.ts';
import { buildSystemPrompt } from './prompt.ts';
import { buildTools } from './tools.ts';

export interface IncomingMessage {
  channel: 'whatsapp' | 'web';
  userId: string;
  name?: string;
  text: string;
  /** Voice note; Gemini understands audio directly. */
  audio?: { data: Uint8Array; mediaType: string };
}

export interface AgentDeps {
  store: Store;
  clinic: Clinic;
  agenda: Agenda;
  models: { primary: LanguageModel; primaryId: string; fallback?: LanguageModel; fallbackId?: string };
  /** Sends a notice to clinic staff (e.g. WhatsApp to the reception phone). */
  notifyStaff?: (text: string) => Promise<void>;
  now?: () => Date;
  handoffHours?: number;
  historyLimit?: number;
}

const FALLBACK_REPLY = 'Disculpa, tuve un problema técnico. ¿Podrías repetir tu mensaje en un momento?';

export class ClinicAgent {
  constructor(private deps: AgentDeps) {}

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  private async handoff(conversationId: string, userId: string, reason: string): Promise<void> {
    const { store, notifyStaff, handoffHours = 12 } = this.deps;
    store.setHandoff(conversationId, new Date(this.now().getTime() + handoffHours * 3_600_000));
    await notifyStaff?.(`🔔 Paciente ${userId} necesita atención de una persona. Motivo: ${reason}`).catch((err) =>
      console.error('[handoff] staff notification failed', err),
    );
  }

  /** Processes one (possibly merged) patient message and returns the replies to send, in order. */
  async handle(msg: IncomingMessage): Promise<string[]> {
    const { store, clinic } = this.deps;
    const { conv, isNew } = store.getOrCreateConversation(msg.channel, msg.userId, msg.name);
    const userText = msg.audio ? `[nota de voz] ${msg.text}`.trim() : msg.text;
    const history = store.recentMessages(conv.id, this.deps.historyLimit ?? 16);
    store.addMessage(conv.id, 'user', userText);

    // A person from the clinic is handling this conversation: the bot stays quiet.
    if (conv.handoffUntil && new Date(conv.handoffUntil) > this.now()) return [];

    const replies: string[] = [];
    if (isNew) {
      const intro = introMessage(clinic);
      replies.push(intro);
      store.addMessage(conv.id, 'assistant', intro);
    }

    if (msg.text && isEmergency(msg.text)) {
      const reply = emergencyReply(clinic);
      await this.handoff(conv.id, msg.userId, `posible urgencia: "${msg.text.slice(0, 200)}"`);
      store.addMessage(conv.id, 'assistant', reply);
      return [...replies, reply];
    }

    const messages: ModelMessage[] = [
      ...history.map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
      msg.audio
        ? {
            role: 'user',
            content: [
              { type: 'text', text: msg.text || '(El paciente envió una nota de voz. Escúchala y respóndele.)' },
              { type: 'file', data: msg.audio.data, mediaType: msg.audio.mediaType },
            ],
          }
        : { role: 'user', content: msg.text },
    ];

    const tools = buildTools({
      agenda: this.deps.agenda,
      clinic,
      conversationId: conv.id,
      onHandoff: (reason) => this.handoff(conv.id, msg.userId, reason),
    });

    const attempts = [
      { model: this.deps.models.primary, id: this.deps.models.primaryId },
      ...(this.deps.models.fallback ? [{ model: this.deps.models.fallback, id: this.deps.models.fallbackId! }] : []),
    ];

    let text: string | undefined;
    for (const attempt of attempts) {
      try {
        const result = await generateText({
          model: attempt.model,
          system: buildSystemPrompt(clinic, this.now()),
          messages,
          tools,
          stopWhen: isStepCount(6),
          temperature: 0.3,
          maxOutputTokens: 800,
        });
        const u = result.usage;
        const input = u.inputTokens ?? 0;
        const cached = u.inputTokenDetails?.cacheReadTokens ?? 0;
        const output = u.outputTokens ?? 0;
        store.logUsage({
          conversationId: conv.id,
          model: attempt.id,
          inputTokens: input,
          cachedTokens: cached,
          outputTokens: output,
          costUsd: costUsd(attempt.id, input, cached, output),
        });
        text = result.text.trim();
        break;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error(`[agent] el modelo ${attempt.id} falló: ${detail}`);
      }
    }

    const reply = text || FALLBACK_REPLY;
    store.addMessage(conv.id, 'assistant', reply);
    return [...replies, reply];
  }
}
