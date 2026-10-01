import { join } from 'node:path';
import { loadEnv } from '../config/env.ts';
import { Store } from '../store/db.ts';

const env = loadEnv();
const s = new Store(join(env.DATA_DIR, 'chatbot.db')).usageSummary();
console.log(`Conversaciones: ${s.conversations}`);
console.log(`Llamadas al modelo: ${s.calls}`);
console.log(`Tokens: ${s.inputTokens} entrada / ${s.outputTokens} salida`);
console.log(`Costo IA total: USD ${s.costUsd.toFixed(4)}  (≈ USD ${(s.conversations ? s.costUsd / s.conversations : 0).toFixed(5)} por conversación)`);
