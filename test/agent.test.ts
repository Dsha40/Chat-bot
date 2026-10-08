import { describe, expect, it } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { lastToolOutput, scriptedModel, setup } from './helpers.ts';

const CONSULTA = 'Consulta de medicina general';
const FIRST_SLOT = '2026-10-05T10:00:00-04:00'; // 08:00 now + 2 h minimum notice

describe('ClinicAgent', () => {
  it('books an appointment end to end through tool calls', async () => {
    const model = scriptedModel([
      { tool: 'buscar_horarios', input: { servicio: 'consulta medicina general' } },
      { tool: 'agendar_cita', input: { servicio: CONSULTA, inicio: FIRST_SLOT, datosPaciente: { nombre: 'Juan Pérez', cedula: 'v12.345.678', seguro: 'mercantil' } } },
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
    expect(appts[0]).toMatchObject({
      patientName: 'Juan Pérez',
      start: '2026-10-05T14:00:00.000Z',
      status: 'confirmed',
      patientData: { nombre: 'Juan Pérez', cedula: 'V-12345678', seguro: 'Seguros Mercantil' },
    });
    expect(store.getPatient('whatsapp:584120000001')).toEqual({ nombre: 'Juan Pérez', cedula: 'V-12345678', seguro: 'Seguros Mercantil' });

    expect(store.usageSummary().calls).toBe(1);
    expect(store.usageSummary().costUsd).toBeGreaterThan(0);
  });

  it('rejects a time the model invented and offers real alternatives', async () => {
    const model = scriptedModel([
      { tool: 'agendar_cita', input: { servicio: CONSULTA, inicio: '2026-10-05T10:15:00-04:00', datosPaciente: { nombre: 'Ana Gil', cedula: '9876543' } } },
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

  it('refuses to book until required data is complete and valid', async () => {
    const model = scriptedModel([
      { tool: 'agendar_cita', input: { servicio: CONSULTA, inicio: FIRST_SLOT, datosPaciente: { nombre: 'Rosa Díaz' } } },
      { tool: 'agendar_cita', input: { servicio: CONSULTA, inicio: FIRST_SLOT, datosPaciente: { cedula: 'abc', email: 'no-es-correo' } } },
      { tool: 'agendar_cita', input: { servicio: CONSULTA, inicio: FIRST_SLOT, datosPaciente: { cedula: 'E 8.123.456' } } },
      { text: 'Listo Rosa.' },
    ]);
    const { agent, store } = setup(model);
    await agent.handle({ channel: 'web', userId: 'r1', text: 'cita a las 10' });

    expect(lastToolOutput(model, 1)).toMatchObject({ ok: false, faltan: ['Cédula'] });
    expect(lastToolOutput(model, 2)).toMatchObject({ ok: false, invalidos: { 'Cédula': expect.any(String), 'Correo electrónico': 'correo inválido' } });
    // The name given in the first attempt was remembered, so the third call only needs the ID.
    expect(lastToolOutput(model, 3)).toMatchObject({ ok: true });
    expect(store.getPatient('web:r1')).toEqual({ nombre: 'Rosa Díaz', cedula: 'E-8123456' });
  });

  it('tells the model what it already knows about a returning patient', async () => {
    const model = scriptedModel([{ text: 'Hola de nuevo, Juan.' }]);
    const { agent, store } = setup(model);
    store.getOrCreateConversation('web', 'p1');
    store.savePatient('web:p1', { nombre: 'Juan Pérez', cedula: 'V-12345678' });
    await agent.handle({ channel: 'web', userId: 'p1', text: 'quiero otra cita' });
    const system = model.doGenerateCalls[0]!.prompt[0] as any;
    expect(system.content).toContain('Datos ya registrados de este paciente');
    expect(system.content).toContain('V-12345678');
    expect(system.content).toContain('Cédula [clave: cedula] (obligatorio)');
  });

  it('gives a 6-digit ticket and lets the patient cancel with it', async () => {
    const model = scriptedModel([
      { tool: 'agendar_cita', input: { servicio: CONSULTA, inicio: FIRST_SLOT, datosPaciente: { nombre: 'Luis Mora', cedula: '20111222' } } },
      { text: 'Listo, tu ticket es #...' },
    ]);
    const { agent, agenda } = setup(model);
    await agent.handle({ channel: 'whatsapp', userId: '58414', text: 'cita a las 10' });
    const ticket = lastToolOutput(model, 1).ticket as string;
    expect(ticket).toMatch(/^\d{6}$/);

    // Written with "#" and spaces from the same chat: the ticket is enough.
    const spaced = `#${ticket.slice(0, 3)} ${ticket.slice(3)}`;
    expect(await agenda.cancel('whatsapp:58414', spaced)).toMatchObject({ ok: true });
    expect((await agenda.cancel('whatsapp:58414', ticket)).ok).toBe(false); // already cancelled
  });

  it('from another number, cancelling needs the patient ID or full name too', async () => {
    const { agenda } = setup(scriptedModel([{ text: 'x' }]));
    const r = await agenda.book({
      conversationId: 'whatsapp:58414',
      patientName: 'Luis Mora',
      serviceName: CONSULTA,
      startIso: FIRST_SLOT,
      patientData: { nombre: 'Luis Mora', cedula: 'V-20111222' },
    });
    if (!r.ok) throw new Error(r.reason);
    const t = r.appointment.id;

    expect((await agenda.cancel('whatsapp:58999', t)).reason).toContain('cédula o el nombre completo');
    expect((await agenda.cancel('whatsapp:58999', t, 'V-99999999')).ok).toBe(false);
    expect((await agenda.cancel('whatsapp:58999', '000000', '20111222')).reason).toContain('No encontré');
    expect((await agenda.cancel('whatsapp:58999', t, '20.111.222')).ok).toBe(true);
  });

  it('a relative can reschedule with ticket + full name', async () => {
    const { agenda } = setup(scriptedModel([{ text: 'x' }]));
    const r = await agenda.book({ conversationId: 'web:a', patientName: 'Ana Gil', serviceName: CONSULTA, startIso: FIRST_SLOT });
    if (!r.ok) throw new Error(r.reason);
    const moved = await agenda.reschedule('web:b', r.appointment.id, '2026-10-06T09:00:00-04:00', 'ana gil');
    expect(moved).toMatchObject({ ok: true, label: 'martes 6 de octubre, 9:00 a. m.' });
  });
});
