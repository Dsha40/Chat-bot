# Asistente de WhatsApp con IA para clínicas

Bot que atiende pacientes por WhatsApp (y por un chat web de demostración):

- **Responde preguntas frecuentes** con los datos de la clínica: horarios, precios, dirección, seguros y formas de pago.
- **Gestiona citas:** agenda, reagenda y cancela. No puede inventar horarios porque solo ofrece los que están libres de verdad. Cada cita tiene un **número de ticket** de 6 dígitos (ej. #482731) para cambiarla o cancelarla. Desde otro número hay que dar además la cédula o el nombre del paciente.
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

### Datos que el bot pide a cada paciente

En `datosPaciente` defines qué datos pide el bot al agendar. Los pide en un solo mensaje, valida el formato y no se los vuelve a pedir a un paciente que regresa. Ejemplo:

```json
"datosPaciente": [
  { "clave": "nombre", "etiqueta": "Nombre y apellido", "obligatorio": true },
  { "clave": "cedula", "etiqueta": "Cédula", "tipo": "cedula", "obligatorio": true },
  { "clave": "fechaNacimiento", "etiqueta": "Fecha de nacimiento", "tipo": "fecha" },
  { "clave": "seguro", "etiqueta": "Seguro", "tipo": "opcion" },
  { "clave": "email", "etiqueta": "Correo electrónico", "tipo": "email" }
]
```

| Tipo | Qué valida |
|---|---|
| `texto` | Cualquier texto (es el tipo por defecto) |
| `cedula` | V/E/J/P + números. "v12.345.678" se guarda como "V-12345678" |
| `fecha` | Se guarda como dd/mm/aaaa |
| `email` | Que sea un correo válido |
| `telefono` | Solo dígitos |
| `opcion` | Debe ser una de `opciones`. Para el campo `seguro`, si no pones opciones, usa los `segurosAceptados` + "Particular" |

`nombre` siempre se pide aunque no lo pongas en la lista. El bot nunca pide síntomas ni diagnósticos.

## Exportar pacientes y citas a Excel

```bash
npm run export          # crea exports/citas-FECHA.csv y exports/pacientes-FECHA.csv
npm run export -- --coma   # si tu Excel usa "," como separador
```

Los archivos se abren con doble clic en Excel: acentos correctos, una columna por dato y teléfonos y cédulas como texto. En el servidor, con `ADMIN_TOKEN` configurado, la clínica puede descargarlos desde el navegador:

- `https://TU-DOMINIO/admin/export/citas.csv?token=TU_ADMIN_TOKEN`
- `https://TU-DOMINIO/admin/export/pacientes.csv?token=TU_ADMIN_TOKEN`

## 3. Conectar WhatsApp (API oficial de Meta)

Primero lo pruebas **gratis con el número de prueba de Meta** desde tu Codespace. Cuando funcione, pasas al número real de la clínica y a un servidor.

### 3.1 Crear la app en Meta (una sola vez)

1. Entra a https://developers.facebook.com con tu Facebook y regístrate como desarrollador si te lo pide.
2. **Mis apps → Crear app**. Elige el caso de uso **"Conectar con clientes por WhatsApp"** (o tipo "Business" + producto **WhatsApp**). Si te pide un *portfolio comercial*, crea uno con el nombre de tu negocio.
3. En el menú de la app, ve a **WhatsApp → API Setup** (o "Configuración de la API" / "Getting started"). Ahí verás:
   - **Número de prueba** ("From"): Meta te lo da gratis.
   - **Phone number ID**: cópialo.
   - **WhatsApp Business Account ID**: cópialo también, lo usarás en el paso 3.3.
   - **Token de acceso temporal**: pulsa *Generar*. **Dura 24 horas**.
4. En el campo **"To"**, agrega **tu número personal** y escribe el código que te llega por WhatsApp. Con el número de prueba, el bot solo puede escribirle a los números que agregues ahí (hasta 5).
5. Ve a **Configuración de la app → Básica** y copia la **Clave secreta de la app** (App secret) con el botón *Mostrar*.

### 3.2 Configurar el bot

En `.env`:
```
WHATSAPP_TOKEN=el-token-temporal
WHATSAPP_PHONE_NUMBER_ID=el-phone-number-id
WHATSAPP_APP_SECRET=la-clave-secreta-de-la-app
WHATSAPP_VERIFY_TOKEN=inventa-una-palabra-secreta
```

Comprueba que todo esté bien y envíate un mensaje de prueba (tu número con código de país y sin "+"):
```bash
npm run whatsapp -- --enviar 58412XXXXXXX
```
Si te llega un "Hello World" a tu WhatsApp, el token y el número funcionan.

### 3.3 Conectar el webhook (para que el bot reciba los mensajes)

1. Arranca el bot:
   ```bash
   npm run dev
   ```
2. Hazlo público:
   - **En Codespaces:** abre la pestaña **PORTS** (junto a TERMINAL), haz clic derecho en el puerto **3000** → **Port Visibility → Public**. Copia la dirección; es algo como `https://tu-codespace-3000.app.github.dev`. Si no la pones en **Public**, Meta no podrá entrar.
   - **En tu computadora:** usa `cloudflared tunnel --url http://localhost:3000` y copia la URL que te da.
3. En Meta, ve a **WhatsApp → Configuración → Webhook → Editar**:
   - **URL de devolución de llamada:** `https://TU-DIRECCION/webhook/whatsapp`
   - **Token de verificación:** la misma palabra que pusiste en `WHATSAPP_VERIFY_TOKEN`
   - Pulsa **Verificar y guardar**. En la terminal del bot debe aparecer `✔ Meta verificó el webhook correctamente`.
4. En **Campos del webhook**, pulsa **Administrar** y suscríbete a **messages**.
5. Suscribe la app a tu cuenta de WhatsApp. A veces el panel no lo hace solo y, sin esto, los mensajes no llegan:
   ```bash
   npm run whatsapp -- --suscribir TU_WHATSAPP_BUSINESS_ACCOUNT_ID
   ```
6. **Escríbele "hola" al número de prueba desde tu WhatsApp.** En la terminal verás:
   ```
   [whatsapp] ← 58412XXXXXXX (Tu nombre): hola
   [whatsapp] → 58412XXXXXXX: Hola 👋 Soy el asistente virtual…
   ```
   y la respuesta te llegará al teléfono.

Si algo falla, la terminal dice qué pasó y qué hacer (token vencido, número no autorizado, firma inválida…).

### 3.4 Pasar a producción (número real de la clínica)

Cuando el médico lo apruebe:

1. **Número real:** en **WhatsApp → API Setup → Agregar número de teléfono**, registra el número de la clínica. Debe poder recibir un SMS o llamada para verificarlo.
   - Si ese número ya se usa en la app WhatsApp Business, Meta permite usar la app y la API a la vez (*coexistence*). En ese caso suscríbete también al campo **smb_message_echoes**: así el bot se calla cuando una persona responde desde la app.
2. **Token permanente:** en **business.facebook.com → Configuración del negocio → Usuarios del sistema**, crea un usuario del sistema con rol de administrador, asígnale la app y la cuenta de WhatsApp, y genera un token con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Ponlo en `WHATSAPP_TOKEN`.
3. **Pago:** agrega tu tarjeta en **WhatsApp Manager → Configuración de pagos**. Meta cobra por mensaje (ver `docs/00-benchmark.md` §2.4).
4. **Servidor:** publícalo en un VPS (sección 5). Codespaces se apaga cuando no lo usas, así que solo sirve para pruebas.
5. **Recordatorios (opcional):** fuera de la ventana de 24 h, WhatsApp solo permite plantillas aprobadas. Crea una plantilla **utility** en español con el texto:
   > Hola {{1}}, te recordamos tu cita el {{2}} en {{3}}.

   Pon su nombre en `WHATSAPP_REMINDER_TEMPLATE`.
6. **Avisos al personal (opcional):** pon en `STAFF_WHATSAPP` el número de recepción para recibir los avisos cuando el bot pase una conversación a una persona.

## 4. Agenda: ¿dónde revisa el bot los horarios libres?

Antes de ofrecer un horario, el bot revisa siempre tres cosas:
- el horario de atención de `config/clinica.json`;
- las citas ya agendadas;
- la anticipación mínima.

Nunca ofrece un horario ocupado ni permite dos citas a la misma hora. Hay dos formas de llevar la agenda:

| | Agenda interna (por defecto) | Google Calendar (recomendado) |
|---|---|---|
| Dónde quedan las citas | En la base de datos del bot (`data/chatbot.db`) | En el Google Calendar del médico, y también en la base de datos |
| Cómo las ve el médico | `npm run export` → Excel | En su celular, en la app de Google Calendar |
| Bloquear un día (vacaciones, cirugía) | Cambiando el horario en `clinica.json` | Creando un evento en su calendario: el bot ya no ofrece esa hora |
| Configuración | Ninguna | 10 minutos, una sola vez |

**Si el consultorio usa papel o cuaderno**, lo más práctico es usar Google Calendar: el médico ve las citas en el celular y bloquea horas con un toque.

### Conectar Google Calendar paso a paso

1. **Crea un calendario para las citas.** En https://calendar.google.com (con la cuenta del médico o de la clínica), en "Otros calendarios" pulsa **+ → Crear calendario**, por ejemplo "Citas consultorio". Uno separado evita que el bot vea cumpleaños o eventos personales.
2. **Crea la cuenta de servicio.** Es el "usuario robot" del bot.
   1. Entra a https://console.cloud.google.com y crea un proyecto (por ejemplo "asistente-clinica").
   2. Menú → **APIs y servicios → Biblioteca** → busca **Google Calendar API** → **Habilitar**.
   3. Menú → **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**. Ponle un nombre y pulsa Listo; no hace falta darle roles.
   4. Entra a la cuenta creada → pestaña **Claves → Agregar clave → Crear clave nueva → JSON**. Se descarga un archivo `.json`.
   5. Copia el correo de la cuenta de servicio (termina en `@...iam.gserviceaccount.com`).
3. **Comparte el calendario con el robot.** En Google Calendar, en el calendario "Citas consultorio" → **⋮ → Configuración y uso compartido**:
   1. En **Compartir con determinadas personas**, agrega el correo del paso 2.5 con el permiso **"Hacer cambios en eventos"**.
   2. En esa misma página, baja hasta **Integrar el calendario** y copia el **ID del calendario** (algo como `abc123@group.calendar.google.com`).
4. **Configura el bot.**
   1. Sube el `.json` a la carpeta `config/` con el nombre `google-service-account.json`. En Codespaces, arrástralo al panel de archivos. Ese nombre está excluido de git, así que no se sube a GitHub.
   2. En `.env` pon:
      ```
      GOOGLE_SERVICE_ACCOUNT_FILE=./config/google-service-account.json
      GOOGLE_CALENDAR_ID=abc123@group.calendar.google.com
      ```
5. **Comprueba la conexión:**
   ```bash
   npm run calendario                        # lee el calendario y muestra los horarios libres
   npm run calendario -- --probar-escritura  # además crea y borra un evento de prueba
   ```
   Si algo falta, el comando te dice qué es en español: calendario no compartido, API sin habilitar o archivo no encontrado.

**Cómo usa el calendario el bot:**
- Cada cita que agenda aparece como "Servicio — Nombre del paciente".
- Si el paciente cancela o reagenda por el chat, el evento se borra o se mueve.
- Cualquier evento que el médico cree en ese calendario bloquea esa hora, incluidos los de día completo (vacaciones, congresos).
- Si quieres crear un evento que no bloquee la agenda (una nota, por ejemplo), márcalo como **"Disponible"** en Google Calendar.

### ¿Y si la clínica usa otro sistema (Doctoralia, un software médico)?

Muchos sistemas pueden sincronizarse con Google Calendar; en ese caso basta con conectar ese calendario. Si no, se puede escribir un adaptador nuevo en `src/calendar/` que implemente la interfaz `CalendarProvider` (`busy`, `createEvent`, `deleteEvent`) sin tocar el resto del bot.

## 5. Publicarlo en un servidor (≈ USD 6–10/mes)

En un VPS (por ejemplo Hetzner CX23) con Docker:

```bash
docker build -t clinic-bot .
docker run -d --name clinic-bot --restart unless-stopped -p 3000:3000 \
  --env-file .env -v $PWD/data:/app/data -v $PWD/config:/app/config clinic-bot
```

Ponle HTTPS con Caddy (`caddy reverse-proxy --from tu-dominio.com --to localhost:3000`) o usa Coolify.

> 📋 **Guía completa paso a paso:** [`docs/guia-puesta-en-marcha.md`](docs/guia-puesta-en-marcha.md)

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor + chat web, con recarga automática |
| `npm start` | Servidor en producción |
| `npm run chat` | Hablar con el bot desde la terminal |
| `npm run models` | Ver los modelos de Gemini disponibles con tu clave |
| `npm run costs` | Costo de IA acumulado y por conversación |
| `npm run export` | Exportar citas y pacientes a CSV para Excel |
| `npm run calendario` | Verificar la conexión con Google Calendar y ver los horarios libres |
| `npm run whatsapp` | Verificar el token y el número de WhatsApp (`-- --enviar NUM`, `-- --suscribir WABA_ID`) |
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
