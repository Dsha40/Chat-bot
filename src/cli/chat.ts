import { createInterface } from 'node:readline/promises';
import { bootstrap } from '../bootstrap.ts';

/** Talk to the assistant from the terminal (uses the real model and the configured agenda). */
const { agent, clinic } = bootstrap();
const rl = createInterface({ input: process.stdin, output: process.stdout });
const userId = `cli-${Date.now()}`;
console.log(`Chat de prueba con el asistente de "${clinic.nombre}". Escribe "salir" para terminar.\n`);
for (;;) {
  const text = (await rl.question('Tú: ')).trim();
  if (!text) continue;
  if (text.toLowerCase() === 'salir') break;
  for (const r of await agent.handle({ channel: 'web', userId, text })) console.log(`\nBot: ${r}\n`);
}
rl.close();
