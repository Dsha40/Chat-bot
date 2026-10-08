import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appointmentsCsv, patientsCsv, toCsv } from '../src/export/csv.ts';
import { normalizeField } from '../src/patients/fields.ts';
import { Store } from '../src/store/db.ts';
import { clinic, NOW, setup, scriptedModel } from './helpers.ts';

const field = (clave: string) => clinic.datosPaciente.find((f) => f.clave === clave)!;

describe('patient field validation', () => {
  it.each([
    ['cedula', 'v-12.345.678', 'V-12345678'],
    ['cedula', '12345678', 'V-12345678'],
    ['cedula', 'E 8123456', 'E-8123456'],
    ['fechaNacimiento', '5/3/1990', '05/03/1990'],
    ['fechaNacimiento', '1990-03-05', '05/03/1990'],
    ['seguro', 'mapfre', 'Mapfre'],
    ['seguro', 'particular', 'Particular (sin seguro)'],
    ['email', 'Ana@Correo.com ', 'ana@correo.com'],
  ])('%s: %s → %s', (clave, raw, expected) => expect(normalizeField(clinic, field(clave), raw)).toEqual({ value: expected }));

  it.each([
    ['cedula', '12'],
    ['fechaNacimiento', '31/02/1990'],
    ['seguro', 'Seguros Inventados'],
    ['email', 'ana@'],
  ])('rejects %s: %s', (clave, raw) => expect(normalizeField(clinic, field(clave), raw)).toHaveProperty('error'));
});

describe('CSV export for Excel', () => {
  it('uses BOM, ";" separator, quoting and neutralizes formulas', () => {
    const csv = toCsv(['a', 'b'], [['x;y', '=HYPERLINK("evil")'], ['línea\nnueva', 'ñandú']]);
    expect(csv.startsWith('﻿a;b\r\n')).toBe(true);
    expect(csv).toContain('"x;y";"\'=HYPERLINK(""evil"")"');
    expect(csv).toContain('"línea\nnueva";ñandú');
  });

  it('exports appointments and patients with one column per configured field', async () => {
    const { agenda, store } = setup(scriptedModel([{ text: 'x' }]));
    store.getOrCreateConversation('whatsapp', '584121234567');
    const data = { nombre: 'Juan Pérez', cedula: 'V-12345678', seguro: 'Mapfre' };
    store.savePatient('whatsapp:584121234567', data);
    await agenda.book({
      conversationId: 'whatsapp:584121234567',
      patientName: 'Juan Pérez',
      serviceName: 'Consulta de medicina general',
      startIso: '2026-10-05T10:00:00-04:00',
      patientData: data,
    });

    const citas = appointmentsCsv(store, clinic).replace('﻿', '').split('\r\n');
    expect(citas[0]).toBe(
      'ID cita;Fecha;Hora;Servicio;Estado;Nombre y apellido;Cédula;Fecha de nacimiento;Seguro;Correo electrónico;Teléfono WhatsApp;Canal;Agendada el',
    );
    expect(citas[1]).toMatch(/^\w+;05\/10\/2026;10:00;Consulta de medicina general;Confirmada;Juan Pérez;V-12345678;;Mapfre;;58412 1234567;whatsapp;/);

    const pacientes = patientsCsv(store, clinic).replace('﻿', '').split('\r\n');
    expect(pacientes[1]).toMatch(/^Juan Pérez;V-12345678;;Mapfre;;58412 1234567;whatsapp;1;/);
  });

  it('upgrades a database created by the previous version', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'db-')), 'old.db');
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE appointments (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, patient_name TEXT NOT NULL,
      service TEXT NOT NULL, start TEXT NOT NULL, "end" TEXT NOT NULL, status TEXT NOT NULL, external_id TEXT,
      reminder_sent INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
      INSERT INTO appointments VALUES ('a1','web:x','Ana','Control','2026-10-05T14:00:00.000Z','2026-10-05T14:20:00.000Z','confirmed',NULL,0,'${NOW.toISOString()}');`);
    old.close();
    const store = new Store(path);
    expect(store.allAppointments()[0]).toMatchObject({ id: 'a1', patientName: 'Ana', patientData: undefined });
    expect(appointmentsCsv(store, clinic)).toContain('Ana');
  });
});

describe('admin CSV download', () => {
  it('requires the admin token and returns a CSV attachment', async () => {
    const { createApp } = await import('../src/server.ts');
    const { loadEnv } = await import('../src/config/env.ts');
    const { agent, store } = setup(scriptedModel([{ text: 'x' }]));
    const { app } = createApp({ env: loadEnv({ ADMIN_TOKEN: 'secreto' }), clinic, store, agent });
    expect((await app.request('/admin/export/citas.csv')).status).toBe(401);
    const res = await app.request('/admin/export/pacientes.csv?token=secreto');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="pacientes-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(await res.text()).toContain('Nombre y apellido;Cédula');
  });
});
