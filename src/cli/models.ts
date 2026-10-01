import { loadEnv } from '../config/env.ts';

/** Lists the Gemini models your API key can use, to pick LLM_MODEL / LLM_FALLBACK_MODEL. */
const env = loadEnv();
if (!env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('Set GOOGLE_GENERATIVE_AI_API_KEY in .env');
const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
  headers: { 'x-goog-api-key': env.GOOGLE_GENERATIVE_AI_API_KEY },
});
if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
const { models = [] } = (await res.json()) as { models?: { name: string; displayName: string; supportedGenerationMethods?: string[] }[] };
for (const m of models.filter((x) => x.supportedGenerationMethods?.includes('generateContent'))) {
  console.log(`${m.name.replace('models/', '').padEnd(40)} ${m.displayName}`);
}
