import { existsSync } from 'node:fs';
import { z } from 'zod';

if (existsSync('.env')) process.loadEnvFile('.env');

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATA_DIR: z.string().default('./data'),
  CLINIC_CONFIG: z.string().default('./config/clinica.json'),
  ADMIN_TOKEN: optional,

  GOOGLE_GENERATIVE_AI_API_KEY: optional,
  LLM_MODEL: z.string().default('gemini-3.5-flash-lite'),
  LLM_FALLBACK_MODEL: optional,

  WHATSAPP_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_VERIFY_TOKEN: optional,
  WHATSAPP_APP_SECRET: optional,
  WHATSAPP_API_VERSION: z.string().default('v23.0'),
  WHATSAPP_REMINDER_TEMPLATE: optional,
  WHATSAPP_TEMPLATE_LANG: z.string().default('es'),
  STAFF_WHATSAPP: optional,
  DEBOUNCE_MS: z.coerce.number().default(2500),

  GOOGLE_SERVICE_ACCOUNT_FILE: optional,
  GOOGLE_CALENDAR_ID: optional,
});

export type Env = z.infer<typeof schema>;

/**
 * Forgives common copy/paste mistakes in .env: a repeated name ("LLM_MODEL=LLM_MODEL=x"),
 * surrounding quotes or spaces, and a "models/" prefix on model ids.
 */
function clean(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, raw] of Object.entries(source)) {
    let v = raw?.trim();
    while (v?.startsWith(`${key}=`)) v = v.slice(key.length + 1).trim();
    if (v && /^(["']).*\1$/.test(v)) v = v.slice(1, -1).trim();
    if (v && key.startsWith('LLM_') && v.startsWith('models/')) v = v.slice('models/'.length);
    out[key] = v === '' ? undefined : v;
  }
  return out;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(clean(source));
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
