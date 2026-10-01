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
  LLM_MODEL: z.string().default('gemini-2.5-flash-lite'),
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

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
