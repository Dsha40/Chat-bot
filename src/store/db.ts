import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Role = 'user' | 'assistant';

export interface Conversation {
  id: string;
  channel: string;
  userId: string;
  name: string | null;
  createdAt: string;
  lastUserAt: string | null;
  handoffUntil: string | null;
}

export interface StoredAppointment {
  id: string;
  conversationId: string;
  patientName: string;
  service: string;
  start: string;
  end: string;
  status: 'confirmed' | 'cancelled';
  externalId: string | null;
  reminderSent: boolean;
}

export interface UsageRow {
  conversationId: string;
  model: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  costUsd: number;
}

/** Thin SQLite store (node:sqlite) for conversations, appointments and LLM usage. */
export class Store {
  readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, channel TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT,
        created_at TEXT NOT NULL, last_user_at TEXT, handoff_until TEXT
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL,
        role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS messages_conv ON messages(conversation_id, id);
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, patient_name TEXT NOT NULL,
        service TEXT NOT NULL, start TEXT NOT NULL, "end" TEXT NOT NULL, status TEXT NOT NULL,
        external_id TEXT, reminder_sent INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS appointments_start ON appointments(start);
      CREATE TABLE IF NOT EXISTS llm_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL, cached_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL,
        cost_usd REAL NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS processed_messages (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
    `);
  }

  getOrCreateConversation(channel: string, userId: string, name?: string): { conv: Conversation; isNew: boolean } {
    const id = `${channel}:${userId}`;
    const existing = this.getConversation(id);
    if (existing) {
      if (name && !existing.name) this.db.prepare('UPDATE conversations SET name = ? WHERE id = ?').run(name, id);
      return { conv: existing, isNew: false };
    }
    const now = new Date().toISOString();
    this.db
      .prepare('INSERT INTO conversations (id, channel, user_id, name, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, channel, userId, name ?? null, now);
    return { conv: this.getConversation(id)!, isNew: true };
  }

  getConversation(id: string): Conversation | undefined {
    const r = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Record<string, any> | undefined;
    if (!r) return undefined;
    return {
      id: r.id,
      channel: r.channel,
      userId: r.user_id,
      name: r.name,
      createdAt: r.created_at,
      lastUserAt: r.last_user_at,
      handoffUntil: r.handoff_until,
    };
  }

  setHandoff(conversationId: string, until: Date | null): void {
    this.db
      .prepare('UPDATE conversations SET handoff_until = ? WHERE id = ?')
      .run(until ? until.toISOString() : null, conversationId);
  }

  addMessage(conversationId: string, role: Role, content: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare('INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)')
      .run(conversationId, role, content, now);
    if (role === 'user') {
      this.db.prepare('UPDATE conversations SET last_user_at = ? WHERE id = ?').run(now, conversationId);
    }
  }

  recentMessages(conversationId: string, limit: number): { role: Role; content: string }[] {
    const rows = this.db
      .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?')
      .all(conversationId, limit) as { role: Role; content: string }[];
    return rows.reverse();
  }

  /** Returns true the first time a message id is seen (WhatsApp may deliver webhooks more than once). */
  markProcessed(messageId: string): boolean {
    const r = this.db
      .prepare('INSERT OR IGNORE INTO processed_messages (id, created_at) VALUES (?, ?)')
      .run(messageId, new Date().toISOString());
    return r.changes > 0;
  }

  insertAppointment(a: Omit<StoredAppointment, 'reminderSent'>): void {
    this.db
      .prepare(
        `INSERT INTO appointments (id, conversation_id, patient_name, service, start, "end", status, external_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(a.id, a.conversationId, a.patientName, a.service, a.start, a.end, a.status, a.externalId, new Date().toISOString());
  }

  updateAppointment(id: string, fields: Partial<Pick<StoredAppointment, 'start' | 'end' | 'status' | 'externalId' | 'reminderSent'>>): void {
    const map: Record<string, string> = { start: 'start', end: '"end"', status: 'status', externalId: 'external_id', reminderSent: 'reminder_sent' };
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${map[k]} = ?`);
      values.push(typeof v === 'boolean' ? Number(v) : (v as string | null));
    }
    if (sets.length === 0) return;
    this.db.prepare(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
  }

  private toAppointment(r: Record<string, any>): StoredAppointment {
    return {
      id: r.id,
      conversationId: r.conversation_id,
      patientName: r.patient_name,
      service: r.service,
      start: r.start,
      end: r.end,
      status: r.status,
      externalId: r.external_id,
      reminderSent: r.reminder_sent === 1,
    };
  }

  getAppointment(id: string): StoredAppointment | undefined {
    const r = this.db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Record<string, any> | undefined;
    return r ? this.toAppointment(r) : undefined;
  }

  /** Confirmed appointments overlapping [from, to). Times are ISO strings in UTC. */
  appointmentsBetween(fromIso: string, toIso: string): StoredAppointment[] {
    const rows = this.db
      .prepare(`SELECT * FROM appointments WHERE status = 'confirmed' AND start < ? AND "end" > ? ORDER BY start`)
      .all(toIso, fromIso) as Record<string, any>[];
    return rows.map((r) => this.toAppointment(r));
  }

  upcomingForConversation(conversationId: string, nowIso: string): StoredAppointment[] {
    const rows = this.db
      .prepare(`SELECT * FROM appointments WHERE conversation_id = ? AND status = 'confirmed' AND start > ? ORDER BY start`)
      .all(conversationId, nowIso) as Record<string, any>[];
    return rows.map((r) => this.toAppointment(r));
  }

  pendingReminders(fromIso: string, toIso: string): StoredAppointment[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM appointments WHERE status = 'confirmed' AND reminder_sent = 0 AND start >= ? AND start < ? ORDER BY start`,
      )
      .all(fromIso, toIso) as Record<string, any>[];
    return rows.map((r) => this.toAppointment(r));
  }

  logUsage(u: UsageRow): void {
    this.db
      .prepare(
        `INSERT INTO llm_usage (conversation_id, model, input_tokens, cached_tokens, output_tokens, cost_usd, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(u.conversationId, u.model, u.inputTokens, u.cachedTokens, u.outputTokens, u.costUsd, new Date().toISOString());
  }

  usageSummary(): { conversations: number; calls: number; inputTokens: number; outputTokens: number; costUsd: number } {
    const r = this.db
      .prepare(
        `SELECT COUNT(DISTINCT conversation_id) AS conversations, COUNT(*) AS calls,
                COALESCE(SUM(input_tokens),0) AS inputTokens, COALESCE(SUM(output_tokens),0) AS outputTokens,
                COALESCE(SUM(cost_usd),0) AS costUsd FROM llm_usage`,
      )
      .get() as any;
    return { ...r };
  }
}
