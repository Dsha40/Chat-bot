import { describe, expect, it } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { lastToolOutput, scriptedModel, setup } from './helpers.ts';

const CONSULTA = 'Consulta de medicina general';
const FIRST_SLOT = '2026-10-05T10:00:00-04:00'; // 08:00 now + 2 h minimum notice

describe('ClinicAgent', () => {
  it('books an appointment end to end through tool calls', async () => {
    const model = scriptedModel([
      { tool: 'buscar_horarios', input: { servicio: 'consulta medicina general' } },
      { tool: 'agendar_cita', input: { servicio: CONSULTA, inicio: FIRST_SLOT, nombrePaciente: 'Juan Pérez' } },
      { text: 'Listo Juan, tu cita quedó para el lunes 5 de octubre a las 10:00 a. m.' },
    ]);
    const { agent, store } = setup(model);

    const replies = await agent.handle({ channel: 'whatsapp', userId: '584120000001', text: 'Quiero una cita hoy, soy Juan Pérez' });

    expect(replies).toHaveLength(2);
    expect(replies[0]).toContain('asistente virtual con inteligencia artificial');
    expect(replies[1]).toContain('Listo Juan');

    const search = lastToolOutput(model, 1);
    expect(search.horarios[0]).toEqual({ inicio: FIRST_SLOT, texto: 'lunes 5 de octubre, 10:00 a. m.' });

    const booked = lastToolOutput(model, 2);
    expect(booked).toMatchObject({ ok: true, servicio: CONSULTA, fechaHora: 'lunes 5 de octubre, 10:00 a. m.' });

    const appts = store.upcomingForConversation('whatsapp:584120000001', '2026-10-01T00:00:00Z');
    expect(appts).toHaveLength(1);
    expect(appts[0]).toMatchObject({ patientName: 'Juan Pérez', start: '2026-10-05T14:00:00.000Z', status: 'confirmed' });

    expect(store.usageSummary().calls).toBe(1);
    expect(store.usageSummary().costUsd).toBeGreaterThan(0);
  });

  it('rejects a time the model invented and offers real alternatives', async () => {
    const model = scriptedModel([
      { tool: 'agendar_cita', input: { servicio: CONSULTA, inicio: '2026-10-05T10:15:00-04:00', nombrePaciente: 'Ana Gil' } },
      { text: 'Ese horario no está disponible.' },
    ]);
    const { agent, store } = setup(model);
    await agent.handle({ channel: 'web', userId: 's1', text: 'a las 10:15' });

    const out = lastToolOutput(model, 1);
    expect(out.ok).toBe(false);
    expect(out.alternativas[0].inicio).toBe(FIRST_SLOT);
    expect(store.appointmentsBetween('2026-10-01T00:00:00Z', '2026-12-01T00:00:00Z')).toHaveLength(0);
  });

  it('does not offer or allow a slot that is already taken', async () => {
    const { agenda } = setup(scriptedModel([{ text: 'x' }]));
    const a = await agenda.book({ conversationId: 'c1', patientName: 'A', serviceName: CONSULTA, startIso: FIRST_SLOT });
    const b = await agenda.book({ conversationId: 'c2', patientName: 'B', serviceName: CONSULTA, startIso: FIRST_SLOT });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);

    const service = agenda.resolveService(CONSULTA)!;
    const slots = await agenda.availableSlots({ service });
    expect(slots.map((s) => s.iso)).not.toContain(FIRST_SLOT);
  });

  it('lets a patient reschedule and cancel only their own appointments', async () => {
    const { agenda } = setup(scriptedModel([{ text: 'x' }]));
    const r = await agenda.book({ conversationId: 'c1', patientName: 'A', serviceName: CONSULTA, startIso: FIRST_SLOT });
    if (!r.ok) throw new Error(r.reason);
    const id = r.appointment.id;

    expect((await agenda.cancel('intruder', id)).ok).toBe(false);

    const moved = await agenda.reschedule('c1', id, '2026-10-06T09:00:00-04:00');
    expect(moved.ok).toBe(true);
    expect(agenda.upcoming('c1')[0]!.label).toBe('martes 6 de octubre, 9:00 a. m.');

    expect((await agenda.cancel('c1', id)).ok).toBe(true);
    expect(agenda.upcoming('c1')).toHaveLength(0);
  });

  it('handles emergencies without calling the model and hands off to staff', async () => {
    const model = scriptedModel([{ text: 'should not be used' }]);
    const { agent, store, staff } = setup(model);

    const replies = await agent.handle({ channel: 'whatsapp', userId: '58412', text: 'Tengo un dolor muy fuerte en el pecho y me falta el aire' });
    expect(model.doGenerateCalls).toHaveLength(0);
    expect(replies.at(-1)).toContain('911');
    expect(staff[0]).toContain('posible urgencia');

    // While a human is in charge, the bot stays quiet.
    expect(await agent.handle({ channel: 'whatsapp', userId: '58412', text: 'hola?' })).toEqual([]);
    expect(store.getConversation('whatsapp:58412')!.handoffUntil).not.toBeNull();
  });

  it('pauses the bot after derivar_a_humano', async () => {
    const model = scriptedModel([
      { tool: 'derivar_a_humano', input: { motivo: 'pregunta por un seguro que no aparece' } },
      { text: 'Te comunico con una persona del equipo.' },
    ]);
    const { agent, staff } = setup(model);
    const replies = await agent.handle({ channel: 'web', userId: 's2', text: '¿Aceptan Seguros X?' });
    expect(replies.at(-1)).toContain('persona del equipo');
    expect(staff).toHaveLength(1);
    expect(await agent.handle({ channel: 'web', userId: 's2', text: '¿?' })).toEqual([]);
  });

  it('falls back to the second model when the first one fails', async () => {
    const broken = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error('503 overloaded');
      },
    });
    const { agent, store } = setup(broken, { fallback: scriptedModel([{ text: 'Respuesta del respaldo' }]) });
    const replies = await agent.handle({ channel: 'web', userId: 's3', text: 'horario?' });
    expect(replies.at(-1)).toBe('Respuesta del respaldo');
    expect(store.usageSummary().calls).toBe(1);
  });

  it('only sends the AI disclosure on the first contact and keeps history', async () => {
    const model = scriptedModel([{ text: 'Abrimos de lunes a viernes.' }]);
    const { agent } = setup(model);
    await agent.handle({ channel: 'web', userId: 's4', text: 'hola' });
    const second = await agent.handle({ channel: 'web', userId: 's4', text: '¿y el sábado?' });
    expect(second).toHaveLength(1);
    const prompt = model.doGenerateCalls[1]!.prompt;
    expect(prompt.filter((m: any) => m.role === 'user')).toHaveLength(2);
    expect(prompt[0]!.role).toBe('system');
  });
});
