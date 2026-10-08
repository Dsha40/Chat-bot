import { describeWhatsAppError, WhatsAppClient } from '../channels/whatsapp.ts';
import { loadEnv } from '../config/env.ts';

/**
 * Checks the WhatsApp configuration.
 *   npm run whatsapp                              → validates token + phone number id
 *   npm run whatsapp -- --enviar 58412XXXXXXX     → also sends Meta's "hello_world" template to that number
 *   npm run whatsapp -- --suscribir WABA_ID       → subscribes the app to the WhatsApp Business Account
 */
const env = loadEnv();
const missing = (['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'] as const).filter((k) => !env[k]);
if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
  console.error(`✘ Faltan variables en .env: ${missing.join(', ')} (ver README §3)`);
  process.exit(1);
}
if (missing.length) console.warn(`⚠ Faltan en .env: ${missing.join(', ')}. Son necesarias para conectar el webhook.`);

const wa = new WhatsAppClient({ token: env.WHATSAPP_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, apiVersion: env.WHATSAPP_API_VERSION });
try {
  const info = await wa.phoneInfo();
  console.log('✔ Token y Phone number ID válidos');
  console.log(`   número: ${info.display_phone_number ?? '?'} · nombre: ${info.verified_name ?? '?'} · calidad: ${info.quality_rating ?? '?'}`);
} catch (err) {
  console.error(`✘ ${describeWhatsAppError(err)}`);
  process.exit(1);
}

const i = process.argv.indexOf('--enviar');
if (i > 0) {
  const to = (process.argv[i + 1] ?? '').replace(/\D/g, '');
  if (!to) {
    console.error('✘ Indica el número destino con código de país, sin "+": npm run whatsapp -- --enviar 58412XXXXXXX');
    process.exit(1);
  }
  try {
    await wa.sendTemplate(to, 'hello_world', 'en_US', []);
    console.log(`✔ Mensaje de prueba ("hello_world") enviado a ${to}. Revisa tu WhatsApp.`);
  } catch (err) {
    console.error(`✘ ${describeWhatsAppError(err).split('\n')[0]}`);
    console.error('   → Revisa que sea el "Identificador de la cuenta de WhatsApp Business" (no el del número de teléfono).');
    process.exit(1);
  }
}

const j = process.argv.indexOf('--suscribir');
if (j > 0) {
  const waba = (process.argv[j + 1] ?? '').trim();
  if (!/^\d{6,}$/.test(waba)) {
    console.error('✘ Indica el "WhatsApp Business Account ID" (está en API Setup): npm run whatsapp -- --suscribir 1234567890');
    process.exit(1);
  }
  try {
    await wa.subscribeApp(waba);
    console.log('✔ App suscrita a la cuenta de WhatsApp: los mensajes reales llegarán al webhook.');
  } catch (err) {
    console.error(`✘ ${describeWhatsAppError(err).split('\n')[0]}`);
    console.error('   → Revisa que sea el "Identificador de la cuenta de WhatsApp Business" (no el del número de teléfono).');
    process.exit(1);
  }
}
