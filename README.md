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
