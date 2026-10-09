# Guía de puesta en marcha del asistente de WhatsApp

Todos los pasos, en orden, desde cero hasta tener el bot atendiendo pacientes reales.
Marca cada casilla cuando la termines.

| Parte | Qué logras | Tiempo | Costo |
|---|---|---|---|
| 1 | El bot responde en tu Codespace (chat web y terminal) | 10 min | Gratis |
| 2 | Configurar los datos de la clínica | 30 min | Gratis |
| 3 | Conectar Google Calendar | 20 min | Gratis |
| 4 | Conectar WhatsApp con el número de prueba | 30 min | Gratis |
| 5 | Token permanente de WhatsApp | 15 min | Gratis |
| 6 | Servidor propio encendido 24/7 | 45 min | USD 6–10/mes |
| 7 | Número real de la clínica | 30 min | Meta cobra por mensaje |
| 8 | Recordatorios y avisos al personal (opcional) | 20 min | — |
| — | Uso diario y solución de problemas | — | — |

---

## Parte 1 — Primer arranque en Codespaces

- [ ] **1.1** Abre el repositorio `Dsha40/Chat-bot` en GitHub → botón verde **Code** → pestaña **Codespaces** → abre (o crea) tu Codespace.
- [ ] **1.2** En la terminal, ponte en la rama del proyecto e instala las dependencias:
  ```bash
  git checkout claude/new-session-ryhede
  git pull
  npm install
  ```
  Si aparece un aviso sobre `esbuild`, ignóralo. Si más adelante algo falla por `esbuild`, ejecuta `npm install-scripts approve esbuild && npm install`.
- [ ] **1.3** Crea tus archivos de configuración (solo la primera vez):
  ```bash
  cp .env.example .env
  cp config/clinica.ejemplo.json config/clinica.json
  ```
- [ ] **1.4** Crea la clave de Gemini, la inteligencia artificial que usa el bot:
  1. Entra a https://aistudio.google.com/apikey con tu Gmail.
  2. Pulsa **Create API key**.
  3. Copia el texto que empieza con `AIza...`.
- [ ] **1.5** Abre el archivo `.env` en el panel izquierdo y pega la clave después del `=`, sin espacios:
  ```
  GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
  LLM_MODEL=gemini-3.5-flash-lite
  ```
  Guarda con **Ctrl+S**.
- [ ] **1.6** Comprueba que la clave funciona:
  ```bash
  npm run models
  ```
  Debe mostrar una lista de modelos.
- [ ] **1.7** Habla con el bot desde la terminal:
  ```bash
  npm run chat
  ```
  Escribe como si fueras un paciente. Para terminar, escribe `salir`.

> **Si el bot responde "Disculpa, tuve un problema técnico":** la línea `[agent] el modelo … falló:` dice el motivo. Si dice que el modelo ya no está disponible, ejecuta `npm run models` y elige otro para `LLM_MODEL`.

---

## Parte 2 — Datos de la clínica

Todo lo que el bot sabe de la clínica está en **`config/clinica.json`**. Si un dato no está ahí, el bot no lo inventa: ofrece pasar la conversación a una persona.

- [ ] **2.1** Abre `config/clinica.json` y cambia:

| Campo | Qué es | Ejemplo |
|---|---|---|
| `nombre` | Nombre de la clínica o del médico | `"Consultorio Dr. Luis Mora"` |
| `zonaHoraria` | Zona horaria | `"America/Caracas"` |
| `telefonoEmergencias` | Número de emergencias del país | `"911"` |
| `direccion`, `comoLlegar` | Ubicación | `"Av. Bolívar, Torre X, piso 2"` |
| `telefonoContacto` | Teléfono de la recepción | `"+58 412-000-0000"` |
| `horario` | Horas de atención por día. Un día vacío `[]` significa cerrado | `"lunes": [["08:00","12:00"],["14:00","18:00"]]` |
| `servicios` | Cada servicio con su duración en minutos y su precio. `"agendable": false` si no se agenda por chat | `{ "nombre": "Limpieza dental", "duracionMin": 45, "precio": "USD 40" }` |
| `segurosAceptados`, `formasDePago` | Listas de texto | `["Mapfre", "Seguros Caracas"]` |
| `politicaCancelacion` | Texto libre | `"Cancela sin costo hasta 4 horas antes."` |
| `faq` | Preguntas frecuentes con su respuesta | `{ "pregunta": "¿Atienden niños?", "respuesta": "Sí, desde los 12 años." }` |
| `datosPaciente` | Datos que el bot pide al agendar (ver 2.2) | — |
| `anticipacionMinimaHoras` | Con cuánta anticipación mínima se puede agendar | `2` |
| `diasMaximosAgenda` | Hasta cuántos días a futuro se puede agendar | `30` |
| `intervaloMin` | Cada cuántos minutos se ofrecen horarios | `30` |

- [ ] **2.2** Elige qué datos pide el bot a cada paciente (`datosPaciente`). El nombre se pide siempre.
  ```json
  "datosPaciente": [
    { "clave": "nombre", "etiqueta": "Nombre y apellido", "obligatorio": true },
    { "clave": "cedula", "etiqueta": "Cédula", "tipo": "cedula", "obligatorio": true },
    { "clave": "fechaNacimiento", "etiqueta": "Fecha de nacimiento", "tipo": "fecha" },
    { "clave": "seguro", "etiqueta": "Seguro", "tipo": "opcion" },
    { "clave": "email", "etiqueta": "Correo electrónico", "tipo": "email" }
  ]
  ```
  Tipos disponibles: `texto`, `cedula`, `fecha`, `email`, `telefono` y `opcion`.
- [ ] **2.3** Prueba de nuevo con `npm run chat`: agenda una cita, cámbiala y cancélala con el número de ticket.

> **Atención con las comas y las comillas en el JSON.** Si el bot no arranca y dice `Invalid clinic config`, el mensaje indica qué campo está mal.

---

## Parte 3 — Google Calendar

Con esto las citas aparecen en el Google Calendar del médico, y lo que él bloquee en su calendario (vacaciones, cirugías) el bot no lo ofrece.

**A. Crear el calendario de citas**
- [ ] **3.1** En https://calendar.google.com (con la cuenta del médico o de la clínica), en la barra izquierda, junto a **Otros calendarios**, pulsa **+** → **Crear un calendario**. Ponle de nombre `Citas consultorio`, revisa que la zona horaria sea la de Venezuela y pulsa **Crear calendario**.

**B. Crear el "usuario robot" (cuenta de servicio) en Google Cloud**
- [ ] **3.2** Entra a https://console.cloud.google.com. En el selector de proyecto (arriba a la izquierda) elige **Proyecto nuevo** → nombre `asistente-clinica` → **Crear**, y luego selecciónalo.
- [ ] **3.3** En el buscador de arriba escribe **Google Calendar API** → **Habilitar**.
- [ ] **3.4** En el buscador escribe **Cuentas de servicio** → **+ Crear cuenta de servicio**:
  1. Nombre: `bot-agenda` → **Crear y continuar**.
  2. Deja los roles vacíos → **Listo**.
- [ ] **3.5** En la lista de cuentas de servicio, en la fila del robot, pulsa los tres puntos **⋮** → **Administrar claves** → **Agregar clave** → **Crear clave nueva** → **JSON** → **Crear**. Se descarga un archivo `.json`. No lo compartas con nadie.
- [ ] **3.6** Copia el correo del robot, que termina en `@...iam.gserviceaccount.com`.

> Si Google dice que la creación de claves está deshabilitada por una "política de la organización", hazlo con un Gmail personal.

**C. Compartir el calendario con el robot**
- [ ] **3.7** En Google Calendar, en el menú de la izquierda, junto a **Citas consultorio**, pulsa **⋮** → **Configuración y uso compartido**.
- [ ] **3.8** En **Compartir con determinadas personas o grupos** → **Añadir personas** → pega el correo del robot → permiso **Hacer cambios en eventos** → **Enviar**.
- [ ] **3.9** Baja hasta **Integrar el calendario** y copia el **ID del calendario**, que termina en `@group.calendar.google.com`.

**D. Conectar el bot**
- [ ] **3.10** En Codespaces, arrastra el `.json` del paso 3.5 a la carpeta `config/` y renómbralo `google-service-account.json` (clic derecho → **Rename**).
- [ ] **3.11** En `.env`:
  ```
  GOOGLE_SERVICE_ACCOUNT_FILE=./config/google-service-account.json
  GOOGLE_CALENDAR_ID=xxxxxxxx@group.calendar.google.com
  ```
- [ ] **3.12** Comprueba la conexión:
  ```bash
  npm run calendario -- --probar-escritura
  ```
  Debe mostrar **✔ Lectura OK** y **✔ Escritura OK**.

---

## Parte 4 — WhatsApp con el número de prueba (gratis)

**A. Registro y app en Meta**
- [ ] **4.1** Entra a https://developers.facebook.com con tu Facebook → **Empezar** → acepta, verifica tu teléfono y elige el rol **Desarrollador**.
- [ ] **4.2** **Mis apps** → **Crear app**:
  - Nombre: sin las palabras "WhatsApp", "Meta" ni "Facebook". Por ejemplo `Clínica`.
  - Caso de uso: **Conectarte con los clientes a través de WhatsApp**.
  - Portfolio comercial: elige uno existente o créalo con el nombre de tu negocio.
- [ ] **4.3** En **Casos de uso** → **Personalizar** → **Integrar con la API** → en el menú, **Paso 1. Pruébalo**.

**B. Copiar los datos** (anótalos en un bloc de notas)

| # | Dato | Dónde está | Va en `.env` como |
|---|---|---|---|
| ① | Token de acceso (`EAA...`) | Paso 1 → **Generar token de acceso** | `WHATSAPP_TOKEN` |
| ② | Identificador del número de teléfono | Debajo del número de prueba `+1 555…` | `WHATSAPP_PHONE_NUMBER_ID` |
| ③ | Identificador de la cuenta de WhatsApp Business | Cerca del dato ② | *(no va en el `.env`; se usa en el paso 4.10)* |
| ④ | Clave secreta de la app | ⚙️ **Configuración de la app → Básica → Mostrar** | `WHATSAPP_APP_SECRET` |
| ⑤ | Palabra de verificación | **La inventas tú**, sin espacios (ej. `clinica-demo-2026`) | `WHATSAPP_VERIFY_TOKEN` |

- [ ] **4.4** En **Para** (*To*) → **Administrar lista de números** → agrega tu celular (+58, **sin el 0**) y escribe el código que te llega por WhatsApp. Puedes agregar hasta 5 números, por ejemplo el del médico.
- [ ] **4.5** Pon los datos ①, ②, ④ y ⑤ en `.env` y guarda.
- [ ] **4.6** Comprueba el token y el número. Pon tu número con el 58 delante, sin el 0 ni el `+`:
  ```bash
  npm run whatsapp -- --enviar 58412XXXXXXX
  ```
  Te debe llegar un "Hello World". Es una plantilla que Meta trae por defecto y llega en inglés.

**C. Publicar el bot y conectar el webhook**
- [ ] **4.7** Arranca el bot y **deja esa terminal abierta**:
  ```bash
  npm run dev
  ```
- [ ] **4.8** En la pestaña **PORTS** (junto a TERMINAL), haz clic derecho en el puerto **3000** → **Port Visibility → Public**. Copia la dirección, del estilo `https://xxxx-3000.app.github.dev`.
- [ ] **4.9** En Meta, ve a **Paso 2: Configuración de producción** → **Webhook** → **Editar**:
  - **URL de devolución de llamada:** `https://xxxx-3000.app.github.dev/webhook/whatsapp`
  - **Token de verificación:** tu palabra ⑤
  - Pulsa **Verificar y guardar**. En la terminal debe aparecer `✔ Meta verificó el webhook correctamente`.
  - En **Campos del webhook** → **messages** → **Suscribirse**.
- [ ] **4.10** En otra terminal (pulsa **+**), suscribe la app a tu cuenta con el dato ③:
  ```bash
  npm run whatsapp -- --suscribir 1234567890123456
  ```
- [ ] **4.11** Escríbele **"hola"** al número de prueba desde tu celular. En la terminal verás:
  ```
  [whatsapp] ← 58412XXXXXXX: hola
  [whatsapp] → 58412XXXXXXX: Hola 👋 Soy el asistente virtual…
  ```

> **Prueba rápida sin celular:** en Meta, en **Campos del webhook → messages → Probar → Enviar al servidor**, debe aparecer en la terminal una línea con `←`. El error de envío que sigue a esa línea es normal, porque Meta usa un número inventado.

---

## Parte 5 — Token permanente (para que el bot no deje de responder)

El token del paso 4 **vence en 24 horas**. Este no vence.

- [ ] **5.1** Entra a https://business.facebook.com/settings y elige tu portfolio.
- [ ] **5.2** **Usuarios → Usuarios del sistema → Agregar**. Nombre `bot-clinica`, rol **Administrador** → **Crear**.
- [ ] **5.3** Con ese usuario seleccionado → **Asignar activos**:
  - **Apps** → tu app → **Control total**.
  - **Cuentas de WhatsApp** → tu cuenta → **Control total**.
  - **Guardar**.
- [ ] **5.4** **Generar nuevo token**:
  - App: la tuya.
  - Vencimiento: **Nunca**.
  - Permisos: `whatsapp_business_messaging` y `whatsapp_business_management`.
  - **Generar** y **cópialo ya**: Meta no lo vuelve a mostrar.
- [ ] **5.5** Ponlo en `WHATSAPP_TOKEN` del `.env`, guarda y reinicia el bot (**Ctrl+C** y otra vez `npm run dev`).
- [ ] **5.6** Comprueba con `npm run whatsapp`.

---

## Parte 6 — Servidor propio encendido 24/7

Codespaces se apaga cuando no lo usas, así que para pacientes reales el bot necesita un servidor.

**A. Crear el servidor**
- [ ] **6.1** Crea una cuenta en https://www.hetzner.com/cloud, agrega tu tarjeta y crea un servidor:
  - Ubicación: Alemania o Finlandia.
  - Imagen: **Ubuntu 24.04**.
  - Tipo: **CX23** (unos €5,49/mes).
  - Acceso: contraseña o, si sabes usarla, llave SSH.
- [ ] **6.2** Copia la **IP** del servidor, por ejemplo `65.21.100.200`.

**B. Instalar el bot** (desde la terminal de Codespaces o de tu PC)
- [ ] **6.3** Entra al servidor:
  ```bash
  ssh root@65.21.100.200
  ```
- [ ] **6.4** Instala Docker:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- [ ] **6.5** Descarga el proyecto. El repositorio es privado: cuando te pida usuario y contraseña, usa tu usuario de GitHub y un *token personal* creado en GitHub → **Settings → Developer settings → Personal access tokens**.
  ```bash
  git clone -b claude/new-session-ryhede https://github.com/Dsha40/Chat-bot.git
  cd Chat-bot
  ```
- [ ] **6.6** Copia tu configuración desde Codespaces. En cada archivo, ábrelo en Codespaces, copia todo el contenido y pégalo en el servidor con `nano`; guarda con **Ctrl+O**, Enter y **Ctrl+X**:
  ```bash
  nano .env
  nano config/clinica.json
  nano config/google-service-account.json
  ```
- [ ] **6.7** Construye y arranca el bot. Se reinicia solo si el servidor se reinicia:
  ```bash
  docker build -t clinic-bot .
  docker run -d --name clinic-bot --restart unless-stopped -p 127.0.0.1:3000:3000 \
    --env-file .env -v $PWD/data:/app/data -v $PWD/config:/app/config clinic-bot
  docker logs -f clinic-bot
  ```
  Debe decir "escuchando en http://localhost:3000". Sal de los logs con **Ctrl+C**; el bot sigue corriendo.

**C. HTTPS (Meta lo exige)**
- [ ] **6.8** Instala Caddy, que obtiene el certificado HTTPS solo:
  ```bash
  apt install -y caddy
  ```
- [ ] **6.9** Si no tienes dominio, usa uno gratis basado en tu IP: `65-21-100-200.sslip.io` (tu IP con guiones en vez de puntos). Configúralo:
  ```bash
  echo '65-21-100-200.sslip.io {
    reverse_proxy localhost:3000
  }' > /etc/caddy/Caddyfile
  systemctl reload caddy
  ```
  Si tienes dominio propio, crea un registro DNS tipo **A** que apunte a la IP y usa ese nombre en lugar de `sslip.io`.
- [ ] **6.10** Abre `https://65-21-100-200.sslip.io/health` en tu navegador: debe mostrar `{"ok":true}`.
- [ ] **6.11** En Meta, cambia la **URL del webhook** a `https://65-21-100-200.sslip.io/webhook/whatsapp` y pulsa **Verificar y guardar**.

**D. Actualizar el bot más adelante**
```bash
cd Chat-bot && git pull
docker build -t clinic-bot . && docker rm -f clinic-bot
docker run -d --name clinic-bot --restart unless-stopped -p 127.0.0.1:3000:3000 \
  --env-file .env -v $PWD/data:/app/data -v $PWD/config:/app/config clinic-bot
```
Las citas y los pacientes están en la carpeta `data/`, que no se borra al actualizar.

---

## Parte 7 — Número real de la clínica

- [ ] **7.1** En Meta → **Paso 2: Configuración de producción** → **Agregar número de teléfono**:
  - Nombre visible: el de la clínica.
  - El número debe poder recibir un SMS o una llamada para verificarse.
  - Si ese número ya se usa en la app **WhatsApp Business**, Meta permite usar la app y el bot a la vez (*coexistence*). En ese caso suscríbete también al campo **smb_message_echoes**: así, cuando el personal responde desde la app, el bot se calla 12 horas con ese paciente.
- [ ] **7.2** Copia el nuevo **Identificador del número de teléfono** en `WHATSAPP_PHONE_NUMBER_ID` y reinicia el bot.
- [ ] **7.3** Agrega tu tarjeta en **WhatsApp Manager → Configuración de pagos**. Sin método de pago, Meta no entrega los mensajes.
- [ ] **7.4** (Recomendado) **Paso 3: Verificación del negocio**: sube los documentos para tener mayores límites de envío y el nombre verificado.
- [ ] **7.5** Ejecuta `npm run whatsapp` en el servidor (`docker exec clinic-bot npm run whatsapp`) y escríbele al número real desde un celular.

---

## Parte 8 — Recordatorios y avisos al personal (opcional)

- [ ] **8.1** **Plantilla de recordatorio.** En WhatsApp Manager → **Plantillas** → **Crear**:
  - Categoría: **Utilidad**.
  - Idioma: **Español**.
  - Nombre: `recordatorio_cita`.
  - Texto:
    > Hola {{1}}, te recordamos tu cita el {{2}} en {{3}}. Si necesitas cambiarla o cancelarla, responde a este mensaje.

  Cuando Meta la apruebe, pon en `.env`:
  ```
  WHATSAPP_REMINDER_TEMPLATE=recordatorio_cita
  WHATSAPP_TEMPLATE_LANG=es
  ```
  El bot envía el recordatorio el día antes de cada cita.
- [ ] **8.2** **Avisos al personal.** Pon el número de recepción (con 58 y sin 0) en `STAFF_WHATSAPP`. Cuando el bot detecte una urgencia o pase a un paciente con una persona, avisará a ese número. Esa persona debe haberle escrito al bot en las últimas 24 h para que el aviso le llegue.
- [ ] **8.3** **Descargas a Excel.** Pon una contraseña larga en `ADMIN_TOKEN` del `.env`. La clínica podrá descargar sus datos desde el navegador:
  - `https://TU-DOMINIO/admin/export/citas.csv?token=TU_ADMIN_TOKEN`
  - `https://TU-DOMINIO/admin/export/pacientes.csv?token=TU_ADMIN_TOKEN`

---

## Uso diario

| Para… | Comando |
|---|---|
| Arrancar el bot (Codespaces) | `npm run dev` |
| Hablar con el bot desde la terminal | `npm run chat` |
| Ver si WhatsApp está bien | `npm run whatsapp` |
| Ver si Google Calendar está bien y los horarios libres | `npm run calendario` |
| Exportar citas y pacientes a Excel | `npm run export` (crea la carpeta `exports/`) |
| Ver cuánto se ha gastado en IA | `npm run costs` |
| Ver los modelos de Gemini disponibles | `npm run models` |
| (En el servidor) ver lo que hace el bot | `docker logs -f clinic-bot` |
| (En el servidor) ejecutar cualquier comando | `docker exec clinic-bot npm run whatsapp` |

**Cada vez que cambies `.env` o `config/clinica.json`, reinicia el bot:**
- En Codespaces: **Ctrl+C** y otra vez `npm run dev`.
- En el servidor: `docker restart clinic-bot`.

---

## Solución de problemas

| Síntoma | Causa | Solución |
|---|---|---|
| `EADDRINUSE: address already in use :::3000` | El bot ya está corriendo en otra terminal | Usa esa terminal, o ejecuta `fuser -k 3000/tcp` y vuelve a arrancar |
| `Missing script: "…"` | Tu copia del código está desactualizada | `git pull` |
| `(código 190) … token venció` | El token temporal duró 24 h | Genera otro, o mejor haz la **Parte 5** |
| `(código 131030)` | Con el número de prueba solo puedes escribir a números autorizados | Agrégalo en **Para → Administrar lista** (paso 4.4) |
| `(código 131047)` | Pasaron más de 24 h desde el último mensaje del paciente | Normal; para escribirle hace falta una plantilla (Parte 8) |
| `(código 131042)` | Falta el método de pago | Paso 7.3 |
| `✘ firma inválida` | `WHATSAPP_APP_SECRET` no es el de esta app | Cópialo de nuevo (dato ④) y reinicia |
| Meta no verifica el webhook | El puerto es privado, la URL está mal o la palabra no coincide | Puerto en **Public**, la URL termina en `/webhook/whatsapp`, palabra igual a `WHATSAPP_VERIFY_TOKEN` |
| Escribes por WhatsApp y en la terminal no aparece nada | Falta la suscripción | Suscríbete a **messages** (4.9) y ejecuta `--suscribir` (4.10) |
| `el modelo … falló` | Problema con Gemini | Revisa la clave o cambia `LLM_MODEL` por uno de `npm run models` |
| `No encuentro el archivo de la cuenta de servicio` | El `.json` de Google no está en `config/` o tiene otro nombre | Paso 3.10 |
| `Sin permiso` en Google Calendar | El calendario no está compartido con el robot o la API no está habilitada | Pasos 3.3 y 3.8 |
| El bot no responde a un paciente | Está en pausa porque lo atiende una persona (12 h) | Espera, o reanúdalo con `curl -X POST https://TU-DOMINIO/admin/resume -H "Authorization: Bearer TU_ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"conversationId":"whatsapp:58412XXXXXXX"}'` |

Si un error no aparece en esta tabla, copia la línea que muestra la terminal: casi siempre trae la causa y la solución.
