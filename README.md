# Asistente de WhatsApp con IA para clínicas

Bot que atiende pacientes por WhatsApp (y por un chat web de demostración):

- **Responde preguntas frecuentes** con los datos de la clínica: horarios, precios, dirección, seguros y formas de pago.
- **Gestiona citas:** agenda, reagenda y cancela. No puede inventar horarios porque solo ofrece los que están libres de verdad.
- **Entiende notas de voz.**
- **Recordatorios:** avisa el día antes de la cita.
- **Derivación a una persona:** pasa la conversación al equipo cuando hace falta. Con las urgencias responde de inmediato, sin pasar por la IA.

Usa **Gemini** (Google) como modelo, que funciona desde Venezuela, y la **API oficial de WhatsApp** de Meta.

## 1. Probarlo en 5 minutos (sin WhatsApp)

Requisitos: Node.js 22.13 o superior.

```bash
npm install
cp .env.example .env
cp config/clinica.ejemplo.json config/clinica.json   # edita los datos de tu clínica
```

1. Crea una clave gratis en https://aistudio.google.com/apikey y pégala en `.env`, en `GOOGLE_GENERATIVE_AI_API_KEY`.
2. Comprueba qué modelos tienes disponibles:
   ```bash
   npm run models
   ```
3. Elige `LLM_MODEL` (por defecto `gemini-3.5-flash-lite`). Si quieres respuestas de mejor calidad, usa un modelo "flash" más nuevo de la lista. Opcionalmente pon otro en `LLM_FALLBACK_MODEL`, que se usa si el principal falla.
4. Habla con el bot de una de estas dos formas:
   ```bash
   npm run chat     # en la terminal
   npm run dev      # chat web en http://localhost:3000, ideal para mostrárselo a los médicos
   ```

## 2. Configurar la clínica

Toda la información de la clínica vive en `config/clinica.json`:

- horario por día;
- servicios con duración y precio;
- seguros y formas de pago;
- preguntas frecuentes;
- teléfono de emergencias;
- anticipación mínima para agendar.

El bot **solo** responde con lo que está en ese archivo. Si algo no aparece, deriva a una persona.

## 3. Conectar WhatsApp (API oficial de Meta)

1. Crea una app de tipo "Business" en https://developers.facebook.com y añade el producto **WhatsApp**.
2. En *WhatsApp → API Setup* registra el número de la clínica y copia el **Phone number ID** y un **token permanente** (créalo con un usuario del sistema en Business Settings). Ponlos en `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_TOKEN`.
3. En *App settings → Basic* copia el **App secret** a `WHATSAPP_APP_SECRET`.
4. Inventa una contraseña para `WHATSAPP_VERIFY_TOKEN`.
5. Publica el servidor con HTTPS (paso 5). En *WhatsApp → Configuration → Webhook*:
   - URL: `https://TU-DOMINIO/webhook/whatsapp`
   - Verify token: el mismo de `WHATSAPP_VERIFY_TOKEN`
   - Suscríbete al campo **messages**. Si la clínica sigue usando la app WhatsApp Business en el mismo número (*coexistence*), suscríbete también a **smb_message_echoes**: así el bot se calla cuando responde una persona.
6. En *Billing*, agrega tu tarjeta. Meta cobra por mensaje (ver `docs/00-benchmark.md` §2.4).
7. (Opcional) Para los recordatorios fuera de la ventana de 24 h, crea una plantilla **utility** en español con el texto:
   > Hola {{1}}, te recordamos tu cita el {{2}} en {{3}}.

   Pon su nombre en `WHATSAPP_REMINDER_TEMPLATE`.
8. (Opcional) Pon en `STAFF_WHATSAPP` el número de recepción para recibir los avisos de derivación.

**Para probar sin dominio** puedes exponer tu PC con `cloudflared tunnel --url http://localhost:3000` y usar la URL que te da.

## 4. Google Calendar (opcional)

Sin configurar nada, el bot usa su **agenda interna**. Para usar la agenda de Google de la clínica:

1. En https://console.cloud.google.com crea un proyecto, activa la **Google Calendar API** y crea una **cuenta de servicio** con su clave JSON.
2. En Google Calendar, comparte el calendario de la clínica con el correo de esa cuenta de servicio, con el permiso "Hacer cambios en eventos".
3. Pon la ruta del JSON en `GOOGLE_SERVICE_ACCOUNT_FILE` y el ID del calendario (Configuración del calendario → "ID del calendario") en `GOOGLE_CALENDAR_ID`.

El bot respetará los eventos que ya existan en ese calendario y creará uno por cada cita.

## 5. Publicarlo en un servidor (≈ USD 6–10/mes)

En un VPS (por ejemplo Hetzner CX23) con Docker:

```bash
docker build -t clinic-bot .
docker run -d --name clinic-bot --restart unless-stopped -p 3000:3000 \
  --env-file .env -v $PWD/data:/app/data -v $PWD/config:/app/config clinic-bot
```

Ponle HTTPS con Caddy (`caddy reverse-proxy --from tu-dominio.com --to localhost:3000`) o usa Coolify.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor + chat web, con recarga automática |
| `npm start` | Servidor en producción |
| `npm run chat` | Hablar con el bot desde la terminal |
| `npm run models` | Ver los modelos de Gemini disponibles con tu clave |
| `npm run costs` | Costo de IA acumulado y por conversación |
| `npm test` | Pruebas automáticas (no gastan dinero; usan un modelo simulado) |

## Qué está probado y qué no

- ✅ **Probado con pruebas automáticas** (con modelo y API de Meta simulados):
  - flujo completo de agendar, reagendar y cancelar;
  - rechazo de horarios inventados y de citas dobles;
  - urgencias, derivación a una persona y respaldo si el modelo falla;
  - webhook de WhatsApp: firma, mensajes duplicados, ráfagas de mensajes y notas de voz;
  - chat web.
- ✅ **Probado de verdad:** el servidor arranca, sirve el chat web y se conecta a la API de Gemini. Con una clave inválida responde un mensaje de disculpa en vez de caerse.
- ⚠️ **Falta probar con tus credenciales:**
  - la calidad de las respuestas de Gemini con tus datos reales (`npm run chat`);
  - el envío real por WhatsApp;
  - Google Calendar;
  - el formato exacto del evento `smb_message_echoes`.
