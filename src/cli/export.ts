import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadClinic } from '../config/clinic.ts';
import { loadEnv } from '../config/env.ts';
import { appointmentsCsv, patientsCsv } from '../export/csv.ts';
import { Store } from '../store/db.ts';

/** Writes exports/citas-FECHA.csv and exports/pacientes-FECHA.csv (open them with Excel). Use --coma for "," separator. */
const env = loadEnv();
const clinic = loadClinic(env.CLINIC_CONFIG);
const store = new Store(join(env.DATA_DIR, 'chatbot.db'));
const separator = process.argv.includes('--coma') ? ',' : ';';
const day = new Date().toISOString().slice(0, 10);
mkdirSync('exports', { recursive: true });
const files = {
  [`exports/citas-${day}.csv`]: appointmentsCsv(store, clinic, { separator }),
  [`exports/pacientes-${day}.csv`]: patientsCsv(store, clinic, { separator }),
};
for (const [path, content] of Object.entries(files)) {
  writeFileSync(path, content);
  console.log(`✔ ${path} (${content.split('\r\n').length - 2} filas)`);
}
