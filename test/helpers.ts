import { readFileSync } from 'node:fs';
import { MockLanguageModelV4 } from 'ai/test';
import { ClinicAgent } from '../src/agent/agent.ts';
import { Agenda } from '../src/calendar/agenda.ts';
import { InternalCalendar } from '../src/calendar/types.ts';
import { parseClinic } from '../src/config/clinic.ts';
import { Store } from '../src/store/db.ts';

/** Monday 2026-10-05, 08:00 in Caracas (UTC-4). */
export const NOW = new Date('2026-10-05T12:00:00Z');

export const clinic = parseClinic(JSON.parse(readFileSync('config/clinica.ejemplo.json', 'utf8')));

const usage = {
  inputTokens: { total: 1000, noCache: 1000, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 50, text: 50, reasoning: undefined },
};

export type Step = { tool: string; input: Record<string, unknown> } | { text: string };

/** A mock model that plays a fixed script of tool calls / texts, one per model step. */
export function scriptedModel(steps: Step[]) {
  let i = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const step = steps[Math.min(i, steps.length - 1)]!;
      i++;
      if ('tool' in step) {
        return {
          content: [{ type: 'tool-call', toolCallId: `call-${i}`, toolName: step.tool, input: JSON.stringify(step.input) }],
          finishReason: { unified: 'tool-calls', raw: undefined },
          usage,
          warnings: [],
        };
      }
      return { content: [{ type: 'text', text: step.text }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] };
    },
  });
}

export function setup(model: MockLanguageModelV4, opts: { fallback?: MockLanguageModelV4 } = {}) {
  const store = new Store(':memory:');
  const agenda = new Agenda(store, clinic, new InternalCalendar(), () => NOW);
  const staff: string[] = [];
  const agent = new ClinicAgent({
    store,
    clinic,
    agenda,
    models: { primary: model, primaryId: 'gemini-2.5-flash-lite', fallback: opts.fallback, fallbackId: 'gemini-3.7-flash' },
    notifyStaff: async (t) => {
      staff.push(t);
    },
    now: () => NOW,
  });
  return { store, agenda, agent, staff };
}

/** Extracts the JSON output of the last tool result present in a model call prompt. */
export function lastToolOutput(model: MockLanguageModelV4, callIndex: number): any {
  const prompt = model.doGenerateCalls[callIndex]!.prompt;
  const toolMsgs = prompt.filter((m: any) => m.role === 'tool');
  const part = (toolMsgs.at(-1) as any)?.content?.at(-1);
  return part?.output?.value;
}
