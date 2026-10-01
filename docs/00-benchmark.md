# Fase 0 — Benchmark de plataformas, costo unitario y rutas

> **Fecha de consulta de todas las fuentes: 2026-10-01.** Precios en USD salvo indicación.
> Documento de investigación, no es asesoría legal ni financiera.

## Cómo se verificó

- **Fuentes oficiales consultadas directamente:**
  - precios de la API de Anthropic ([platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing));
  - lista de países soportados por Anthropic ([anthropic.com/supported-countries](https://www.anthropic.com/supported-countries));
  - términos comerciales de Anthropic ([anthropic.com/legal/commercial-terms](https://www.anthropic.com/legal/commercial-terms));
  - licencias declaradas en los registros de npm y PyPI.
- **Fuentes no leídas directamente:** el proxy del entorno de trabajo bloqueó developers.facebook.com, openai.com, ai.google.dev, stripe.com, groq.com, openrouter.ai, los sitios de los competidores y los boletines oficiales. Esas cifras se tomaron de los resultados del buscador, que suelen ser fuentes secundarias (blogs de BSPs, comparadores) y se citan una por una.
- **Pendiente de confirmar:** todo lo marcado con ⚠️ debe confirmarse en la fuente oficial antes de firmar contratos o publicar precios.
- **Cálculos:** el script `calc.py` (fuera del repo) los reproduce. Los supuestos están en la sección 2.

## Resumen ejecutivo

1. **Revender con white-label no cabe en USD 50/mes.** Lety.ai cuesta desde USD 97, Stammer Agency USD 197 y Convocore White Label USD 220. Lo único que cabe es el plan *Pay as you go* o *Starter* de Convocore (USD 20–29), que sirve para pilotos pero no tiene white-label completo.
2. **Autohospedar Dify, n8n o Typebot como producto SaaS choca con sus licencias.**
   - Dify prohíbe operar multi-tenant sin licencia comercial y prohíbe quitar su logo.
   - n8n (Sustainable Use License) prohíbe revender un servicio cuyo valor dependa sustancialmente de n8n.
   - Typebot (FSL) prohíbe ofrecerlo como servicio competidor.
   - Sí se pueden reutilizar piezas con licencia permisiva: Chatwoot (MIT, sin `/enterprise`), Vercel AI SDK, Mastra, Langfuse, Promptfoo, Crawl4AI y Coolify.
3. **La IA no es el costo dominante.** Una conversación típica (5 respuestas con RAG) cuesta entre **USD 0,0012** (Gemini 2.5 Flash-Lite) y **USD 0,027** (Claude Sonnet 5.5 con caché). El costo dominante es **WhatsApp**: desde el **1-oct-2026 Meta cobra los mensajes de servicio** por encima de 1.000 gratis al mes por número.
4. **Venezuela no tiene acceso a las APIs de Anthropic ni de OpenAI.** Gemini sí está disponible allí. Esto obliga a tener ruteo de modelos por país desde el diseño.
5. **Recomendación: ruta A → C.** Validar con 1–3 pilotos usando la opción revendible más barata y, si la validación pasa, construir un MVP propio mínimo en TypeScript. La ruta B se usa solo como fuente de componentes con licencia permisiva. Detalle en la sección 6.

---

## 1. Competidores

### 1.1 Precios y modelo de negocio

| Plataforma | Modelo de negocio | Precio de entrada | Límites / costo por uso | White-label / sub-cuentas | Fuente |
|---|---|---|---|---|---|
| **Lety.ai** | White-label para agencias (cuota fija de plataforma) | desde USD 97/mes | Tokens del LLM y sesiones de WhatsApp se pasan **al costo**; agentes ilimitados | Sí, en todos los planes pagos | [lety.ai/pricing](https://lety.ai/pricing/), [lety.ai/es/agentes-de-ia](https://lety.ai/es/agentes-de-ia/) |
| **Stammer.ai** | White-label para agencias | Agency USD 197/mes; Enterprise desde USD 2.500 | 20 agentes, 20 sub-cuentas, 20 M de caracteres; trae tu propia clave de OpenAI; voz ~USD 0,11–0,17/min | Sí | [docs.stammer.ai](https://docs.stammer.ai/stammer.ai-docs/account-management/agency-billing/subscription-plans), [seldonframe.com](https://www.seldonframe.com/stammer-ai-pricing) |
| **Convocore** | SaaS + white-label | Free; Pay as you go USD 20/mes + uso; Starter USD 29; White Label USD 220 (5 clientes, +USD 15 por cliente extra) | 1 USD = 1.000 créditos; trae tu propia clave (BYOK) desde Pay as you go; voz ~USD 0,05–0,09/min | Sí, en el plan de USD 220 | [docs.convocore.ai](https://docs.convocore.ai/Pricing/overview), [convocore.ai/pricing](https://convocore.ai/pricing), [capterra](https://www.capterra.com/p/10039641/Convocore/) |
| **Botpress** | SaaS por suscripción + gasto de IA | Plus USD 189/mes (USD 150 anual) | 250 conversaciones y USD 25 de IA incluidos; Team USD 939/mes con 1.500 conversaciones. Precios cambiados el 24-sep-2026 ⚠️ | No nativo | [lindy.ai](https://www.lindy.ai/blog/botpress-pricing), [getmacha.com](https://www.getmacha.com/blog/botpress-complete-guide) |
| **Voiceflow** | SaaS por editor + créditos | Pro USD 60/mes; Business USD 150 | USD 0,005 por mensaje + tokens; +USD 50 por editor | No | [getmacha.com](https://www.getmacha.com/blog/voiceflow-pricing-explained) |
| **Chatbase** | SaaS por créditos de mensaje | Hobby USD 40/mes (500 créditos); Standard USD 150 (4.000) | Créditos extra a USD 40 por 1.000 | No | [chatarmin.com](https://chatarmin.com/en/blog/chatbase-pricing) |
| **Dify Cloud** | SaaS + open source (licencia restringida) | Sandbox gratis (200 créditos); Professional USD 59 | 5.000 créditos de mensaje (Professional); Team USD 159 | No | [dify-hosting.com](https://dify-hosting.com/en/guides/dify-pricing/) |
| **Typebot** | SaaS + fuente disponible (FSL) | Starter USD 39 (2.000 chats) | Pro USD 89 (10.000 chats, **WhatsApp**, dominio propio) | Dominio propio en Pro | [thatmarketingbuddy.com](https://thatmarketingbuddy.com/pricing/typebot) |
| **Flowise Cloud** | SaaS + open core (Apache 2.0) | Starter USD 35 (10.000 predicciones) | Pro USD 65 (50.000) | No | [lindy.ai](https://www.lindy.ai/blog/flowise-pricing) |
| **Dentiqa** (LATAM, dental) | SaaS vertical | desde USD 89/mes | Chatbot de WhatsApp con IA incluido | No | [dentiqa.app](https://dentiqa.app/blog/chatbot-clinica-dental) |
| **Cliengo** (AR) | SaaS | USD 24–250/mes | Fuerte en captación de leads web | No | [doubletick.com.ar](https://www.doubletick.com.ar/cuanto-cuesta-chatbot-whatsapp-argentina/) |
| **Botmaker** (AR) | SaaS | desde USD 149/mes + USD 99 de alta de WhatsApp | Flujos, IA y multicanal | No | [doubletick.com.ar](https://www.doubletick.com.ar/cuanto-cuesta-chatbot-whatsapp-argentina/) |

Competidores locales y verticales por país (precios en `docs/00-mercados.md`): AnswerForMe y LiveConnect (VE), AsistChat y Tecnochat (CO), Mi Agenda Profesional (AR), Doctoralia, ConverPilot, Clientisima y Clinicbot (ES).

### 1.2 Funciones según el material comercial (⚠️ verificar en una demo)

| Función | Lety | Stammer | Convocore | Botpress | Voiceflow | Chatbase | Dify | Typebot | Flowise |
|---|---|---|---|---|---|---|---|---|---|
| Entrenamiento con documentos / web (RAG) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | parcial | ✓ |
| Flujos visuales | ✓ | parcial | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ |
| WhatsApp | ✓ | ✓ | ✓ | ✓ | vía integración | vía integración | vía plugin | ✓ (Pro) | vía integración |
| Handoff a humano | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | – |
| Agenda (Google Calendar / Cal.com) | ✓ (vía MCP) | funciones propias | ✓ | integración | integración | acciones | herramientas | integración | herramientas |
| Voz | ✓ | ✓ | ✓ | – | ✓ | – | – | – | – |
| White-label + sub-cuentas | ✓ | ✓ | ✓ (USD 220) | – | – | – | licencia comercial | – | – |

### 1.3 Qué es commodity y qué diferencia

- **Commodity** (todos lo tienen, no se compite por esto):
  - RAG sobre PDF o web;
  - widget web;
  - conexión a WhatsApp, Instagram y Messenger;
  - flujos básicos;
  - historial de conversaciones;
  - white-label genérico para agencias.
- **Diferenciadores reales para clínicas** (casi nadie los resuelve bien a este precio):
  1. **Agenda real con reglas clínicas**: duración por tipo de cita, profesional, sede, reprogramar y cancelar, lista de espera, sobre Google Calendar, que es lo que usan tus clientes potenciales.
  2. **Recordatorios con confirmación** (reducen inasistencias) y **métricas de valor**: tiempo de primera respuesta, % resuelto sin humano y citas agendadas por el bot.
  3. **Guardarraíles de salud**: nunca diagnosticar, detectar urgencias y derivar, minimizar datos y pedir consentimiento por país.
  4. **Costo optimizado por país**: ruteo de modelos (Gemini en VE), pocos mensajes por conversación y WhatsApp facturado al costo.
  5. **Implementación en español en 48 h** con plantillas por especialidad (odontología, estética, consulta general).

---

## 2. Costo unitario de una conversación típica

### 2.1 Supuestos

| Parámetro | Valor |
|---|---|
| Mensajes | 10 en total: 5 del paciente y **5 respuestas del bot**, es decir 5 llamadas al LLM. Variante pesada: 10 llamadas |
| Prompt de sistema (personalidad, datos de la clínica, herramientas) | 1.500 tokens, cacheable |
| RAG | 3 fragmentos × 400 tokens = 1.200 tokens por llamada, en el turno del usuario y por tanto no cacheable |
| Mensaje del paciente / respuesta del bot | 40 / 150 tokens. La respuesta incluye un razonamiento mínimo |
| Historial | Crece 190 tokens por turno y es cacheable como prefijo |
| Embeddings de la consulta | text-embedding-3-small a USD 0,02 por 1 M tokens (despreciable) |
| Total por conversación | 15.600 tokens de entrada y 750 de salida |

**Diseño para aprovechar la caché:** van al principio, en este orden, el prompt de sistema y luego el historial. Los fragmentos de RAG van en el mensaje del turno actual. Así el prefijo es estable.

### 2.2 Precios por 1 M de tokens

| Modelo | Rol | Entrada | Entrada en caché | Salida | Disponible en VE | Fuente |
|---|---|---|---|---|---|---|
| Claude Sonnet 5.5 | Premium | 2,00 | 0,20 (escritura de caché ×1,25) | 10,00 | ❌ | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) (directa) |
| Claude Haiku 4.5 | Intermedio | 1,00 | 0,10 (mínimo cacheable 4.096 tokens, así que **no** cachea este prompt) | 5,00 | ❌ | ídem |
| Gemini 3.x Flash | Intermedio | 0,75 | 0,075 | 3,75 | ✅ | [morphllm.com](https://www.morphllm.com/gemini-api-pricing), [benchlm.ai](https://benchlm.ai/google/api-pricing) — precio introductorio hasta el 31-dic-2026; luego 1,50 / 7,50 ⚠️ |
| GPT-5 mini | Barato | 0,25 | 0,025 ⚠️ (otra fuente indica 0,013) | 2,00 | ❌ | [benchlm.ai](https://benchlm.ai/openai/api-pricing), [pricepertoken.com](https://pricepertoken.com/pricing-page/model/openai-gpt-5-mini) |
| gpt-oss-120b vía Groq | Barato | 0,15 | 0,075 | 0,60 | ⚠️ no verificado | [glamdringresearch.com](https://www.glamdringresearch.com/post/groq-api-pricing), [cloudzero.com](https://www.cloudzero.com/blog/groq-pricing/) |
| DeepSeek V3.2 vía OpenRouter | Barato | 0,2088 | – | 0,3096 | ⚠️ (OpenRouter aplica las restricciones de cada proveedor) | [openrouter.ai](https://openrouter.ai/deepseek/deepseek-v3.2); comisión de 5,5 % al comprar créditos con tarjeta ([glamdringresearch.com](https://www.glamdringresearch.com/post/openrouter-pricing)) |
| Gemini 2.5 Flash-Lite | Ultra barato | 0,10 | 0,01 | 0,40 | ✅ | [morphllm.com](https://www.morphllm.com/gemini-api-pricing) |

Notas:
- **Anthropic:** la caché de 5 min cuesta 1,25 × la entrada al escribir y 0,1 × al leer. La de 1 h cuesta 2 × al escribir. El Batch API tiene un descuento del 50 % (no aplica a chat en vivo).
- **Disponibilidad en Venezuela:** ❌ Anthropic no aparece en su lista de países soportados (verificado). OpenAI tampoco aparece en la suya ([developers.openai.com](https://developers.openai.com/api/docs/supported-countries)). Gemini sí está disponible ([ai.google.dev](https://ai.google.dev/gemini-api/docs/available-regions)).

### 2.3 Resultado

| Modelo | USD/conv sin caché | USD/conv con caché | **USD por 1.000 conv (con caché)** | USD/conv, variante de 10 llamadas |
|---|---|---|---|---|
| Claude Sonnet 5.5 | 0,0387 | 0,0270 | **26,98** | 0,0519 |
| Claude Haiku 4.5 | 0,0194 | 0,0194 | **19,35** | 0,0435 |
| Gemini 3.x Flash (precio intro) | 0,0145 | 0,0097 | **9,70** | 0,0189 |
| GPT-5 mini | 0,0054 | 0,0038 | **3,80** | 0,0074 |
| DeepSeek V3.2 (OpenRouter, +5,5 %) | 0,0037 | 0,0037 | **3,69** | 0,0084 |
| gpt-oss-120b (Groq) | 0,0028 | 0,0023 | **2,26** | 0,0048 |
| Gemini 2.5 Flash-Lite | 0,0019 | 0,0012 | **1,22** | 0,0024 |

**Política de modelos recomendada:** un modelo barato por defecto y un escalado de alrededor del 10 % al premium. El escalado se activa por regla: intención compleja, queja, que el modelo barato falle una validación o que el cliente esté en plan premium.

| Mercado | Mezcla | Costo por conversación | Costo por clínica de 300 conv/mes |
|---|---|---|---|
| CO / AR / ES | 90 % GPT-5 mini + 10 % Sonnet 5.5 | USD 0,0061 | **USD 1,84/mes** |
| VE | 90 % Gemini 2.5 Flash-Lite + 10 % Gemini Flash | USD 0,0021 | **USD 0,62/mes** |

### 2.4 El costo que sí importa: WhatsApp (Meta, desde el 1-oct-2026)

- **Cobro por mensaje** según la categoría y el país del destinatario.
- **Mensajes de servicio** (respuestas dentro de la ventana de 24 h):
  - antes eran gratis;
  - desde el 1-oct-2026 se cobran **a la tarifa de utility del país**;
  - cada número tiene **1.000 gratis al mes**;
  - la ventana de 72 h de los anuncios *click-to-WhatsApp* sigue siendo gratis.
- **Plantillas utility dentro de la ventana:** también se cobran. Fuentes: [360dialog](https://360dialog.com/blog/whatsapp-service-message-charging-october-2026/), [Meta Developers](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages) (citada vía buscador).
- **Sin método de pago:** quien no tuviera método de pago registrado antes del 30-sep-2026 deja de poder enviar mensajes de servicio.
- **Meta Business Agent:** el agente de IA propio de Meta cobra USD 2 por 1 M de tokens, unos USD 0,04–0,05 por mensaje ([zernio.com](https://zernio.com/blog/meta-business-agent-pricing)). Es **mucho más caro** que traer tu propio LLM.

| País | Marketing | Utility = servicio | WhatsApp por clínica tipo/mes* |
|---|---|---|---|
| Colombia | 0,0125 | 0,0008 | USD 0,50 |
| Venezuela (Resto de LatAm) | 0,0740–0,0851 ⚠️ | 0,0113–0,0130 ⚠️ | USD 8,06 (con 0,013) |
| España | 0,0707 | 0,0200 | USD 12,40 |
| Argentina | 0,0618 | 0,0260 | USD 16,12 |

\* Clínica tipo: 300 conversaciones × 5 respuestas = 1.500 mensajes de servicio, de los que 1.000 son gratis, más 120 recordatorios utility.

Fuentes: [ominiflow (CO)](https://ominiflow.com/whatsapp-api-pricing/colombia), [ominiflow (AR)](https://ominiflow.com/whatsapp-api-pricing/argentina), [flowcall](https://www.flowcall.co/blog/whatsapp-business-api-pricing), [manychat](https://help.manychat.com/hc/en-us/articles/14281380243740-WhatsApp-pricing-guide). La tarifa de "Resto de LatAm" aparece con dos valores distintos en las fuentes: hay que confirmarla en el rate card oficial.

**Implicaciones de diseño:**
- **Responder en 4 mensajes en lugar de 5 baja el costo de WhatsApp entre un 40 % y un 50 %** en AR, ES y VE.
- En planes de alto volumen, el consumo de Meta debe facturarse **al costo** (*pass-through*), como hace Lety.

---

## 3. Comparación de las 3 rutas (para clínicas, con USD 50/mes)

| | **A — Revender** | **B — Autohospedar open source** | **C — Construir propio** |
|---|---|---|---|
| Opción concreta | Convocore Pay as you go o Starter (USD 20–29). Lety (≥97), Stammer (197) y Convocore WL (220) **no caben** | Dify + Chatwoot + n8n en Hetzner CX33 (4 vCPU / 8 GB, €8,49 + IPv4) con Coolify | Servicio TypeScript propio: Meta Cloud API + adaptadores de LLM + Google Calendar + Postgres/pgvector en el mismo VPS |
| Costo inicial | USD 0 (con dominio, USD ~12/año) | USD 0 más ~1–2 días de montaje | USD 0 más 4–8 semanas de desarrollo con Claude Code |
| Costo mensual fijo | USD 20–29 + uso de la plataforma ⚠️ | ~USD 10–12 (VPS + dominio + backups). Chatwoot exige ≥4 GB y se recomiendan 8 ([docs](https://developers.chatwoot.com/self-hosted/deployment/requirements)) | ~USD 12 (VPS CX33 + dominio + backups) |
| Costo variable por clínica | LLM propio (BYOK) + WhatsApp + créditos de la plataforma ⚠️ | LLM + WhatsApp | LLM + WhatsApp |
| Tiempo al primer cliente | **1–2 semanas** | 2–4 semanas | 4–8 semanas |
| Control (agenda, guardarraíles, datos) | Bajo: dependes de las funciones del proveedor | Medio: las licencias limitan el modelo SaaS | **Total** |
| Riesgo de dependencia | Alto: precios, términos, cierre o cambios del proveedor; datos de salud en un tercero | Medio: cambios de licencia (Dify, n8n, Typebot ya los tuvieron) | Bajo: solo Meta y los LLM, aislados detrás de adaptadores |
| Licencias | Contrato del proveedor | **Dify:** prohibido multi-tenant sin licencia y quitar el logo. **n8n:** prohibido revenderlo como servicio. **Typebot (FSL):** prohibido como servicio competidor | Tú eliges (MIT/Apache) |
| Margen bruto estimado (3 clínicas en CO a COP 219.000 ≈ USD 65,5) | ~70–80 % con Convocore (sin contar créditos de plataforma ⚠️); ~45 % con Lety; negativo con Stammer (~34 % con 5 clínicas) | ~85–88 % (si se resuelven las licencias) | **~88 %**, y >90 % desde 5 clínicas |
| Encaje con VE (sin Anthropic/OpenAI) | Depende de que la plataforma permita BYOK con Gemini ⚠️ | Dify y n8n soportan Gemini | Nativo: ruteo por país en el adaptador |

---

## 4. Licencias de los repositorios de referencia

| Repositorio | Licencia | ¿Se puede usar en un SaaS comercial / white-label? | Fuente |
|---|---|---|---|
| langgenius/dify | Apache 2.0 **modificada** | ⚠️ Sí como backend de tu app. **No** para operar multi-tenant (varios workspaces o clientes) sin licencia comercial. **No** se puede quitar ni cambiar el logo del frontend | [LICENSE](https://github.com/langgenius/dify/blob/main/LICENSE), [dev.to](https://dev.to/beton/dify-pricing-teardown-2026-42g5) |
| FlowiseAI/Flowise | Apache 2.0 (open core) | ✅ Sí, salvo `packages/server/src/enterprise`, que tiene licencia comercial | [issue #5164](https://github.com/FlowiseAI/Flowise/issues/5164); npm: "SEE LICENSE IN LICENSE.md" |
| langflow-ai/langflow | MIT | ✅ Sí | PyPI `langflow` 1.12.4: MIT |
| botpress/botpress | MIT (SDK/CLI actuales); v12 en AGPL-3.0 (archivado) | ✅ El SDK y la CLI. ⚠️ v12 obliga a publicar el código bajo AGPL si se ofrece en red | npm `@botpress/sdk` 7.2.5: MIT; [botpress/v12](https://github.com/botpress/v12) |
| baptisteArno/typebot.io | FSL-1.1 (pasa a Apache 2.0 a los 2 años) | ⚠️ Uso interno sí. **No** ofrecerlo como servicio competidor ni vender acceso al hosting | [opentechhub.io](https://www.opentechhub.io/resource/license-fsl/), [typebot.com](https://typebot.com/business-continuity) |
| chatwoot/chatwoot | MIT + `enterprise/` propietario | ✅ Sí, eliminando `enterprise/` | [developers.chatwoot.com](https://developers.chatwoot.com/self-hosted/faq) |
| n8n-io/n8n | Sustainable Use License (fair-code) | ❌ No como parte del producto. Sí para automatizar tu propio negocio y cobrar por montar flujos | [ssdnodes.com](https://www.ssdnodes.com/learn/n8n-sustainable-use-license-explained); npm: "SEE LICENSE IN LICENSE.md" |
| EvolutionAPI/evolution-api | Apache 2.0 + condiciones extra | ⚠️ Licencia: hay que mantener logo y copyright y avisar del uso. **Riesgo mayor:** usa el protocolo de WhatsApp Web, lo que viola los ToS de WhatsApp (riesgo de baneo del número). **No usar en producción** (ADR 0003) | [LICENSE](https://github.com/evolution-foundation/evolution-api/blob/main/LICENSE), [checkleaked](https://whatsapp.checkleaked.cc/blog/whatsapp-cloud-api-vs-unofficial) |
| vercel/ai | Apache 2.0 | ✅ Sí | npm `ai` 7.0.126: Apache-2.0 |
| vercel/ai-chatbot (hoy vercel/chatbot) | Apache 2.0 | ✅ Sí | [LICENSE](https://github.com/vercel/chatbot/blob/main/LICENSE) |
| mastra-ai/mastra | Apache 2.0 + `ee/` (Mastra Enterprise License) | ✅ Sí, salvo `ee/` | npm `@mastra/core` 1.73.0: Apache-2.0; [mastra.ai](https://mastra.ai/docs/community/licensing) |
| langfuse/langfuse | MIT + `ee/` (requiere clave) | ✅ Sí, el núcleo | npm `langfuse`: MIT; [langfuse.com](https://langfuse.com/handbook/chapters/open-source) |
| promptfoo/promptfoo | MIT | ✅ Sí | npm `promptfoo` 0.123.1: MIT |
| unclecode/crawl4ai | Apache 2.0 + requisito de atribución | ✅ Sí, con atribución en la documentación o una insignia | PyPI `crawl4ai` 0.9.4: Apache-2.0; [LICENSE](https://github.com/unclecode/crawl4ai/blob/main/LICENSE) |
| coollabsio/coolify (extra) | Apache 2.0 | ✅ Sí | [temps.sh](https://temps.sh/blog/coolify-pricing-explained-2026) |
| calcom/cal.com (extra) | AGPL-3.0 | ⚠️ Autohospedado sí, pero si lo modificas y lo ofreces en red debes publicar el código. Usar Google Calendar API (gratis) como primera opción | [meetergo.com](https://meetergo.com/en/magazine/cal-com-pricing), [Google Calendar quota](https://developers.google.com/workspace/calendar/api/guides/quota) |

---

## 5. Restricciones de plataforma que cambian el diseño

- **Política de WhatsApp desde el 15-ene-2026:** prohíbe los chatbots **de propósito general** (tipo ChatGPT) en la Business Platform. Permite bots de soporte, reservas y ventas donde la IA es parte del servicio del negocio ([respond.io](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban)). El agente debe limitarse al ámbito de la clínica.
- **Vercel Hobby no permite uso comercial.** El plan Pro cuesta USD 20 por usuario ([fencode.dev](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing)). El panel se alojará en el VPS con Coolify.
- **Supabase Free:** pausa el proyecto tras 7 días sin actividad y tiene 500 MB ([costbench](https://costbench.com/software/database-as-service/supabase/free-plan/)). Sirve para prototipos. Para producción conviene Postgres + pgvector en el VPS.
- **Hetzner subió precios dos veces en 2026** (1-abr y 15-jun): CX23 (2 vCPU / 4 GB) €5,49 y CX33 (4 vCPU / 8 GB) €8,49, sin IPv4 ni IVA ([Hetzner Docs](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [agentdeals.dev](https://agentdeals.dev/hetzner-pricing-2026)).

---

## 6. Recomendación inicial: ruta A → C

**Fase 1 (validar, 1–2 semanas): ruta A con el plan más barato de Convocore** que incluya WhatsApp y BYOK (Starter USD 29, o Pay as you go USD 20 si cubre WhatsApp ⚠️). El objetivo es conseguir 1–3 pilotos sin escribir código.
- Venezuela usa una clave propia de Gemini. Colombia usa GPT-5 mini o Gemini.
- En los pilotos no se recogen datos clínicos.
- Plan alternativo si Convocore no permite Gemini o no factura bien: un piloto "C-cero" de un solo cliente, con el script mínimo Meta Cloud API → LLM → Google Calendar.

**Fase 2 (si ≥2 pilotos pagan): ruta C mínima.** Panel Next.js, widget y servicio de canales en TypeScript, en Hetzner con Coolify, con Postgres + pgvector.
- Se reutilizan solo piezas permisivas: Vercel AI SDK, Chatwoot sin `enterprise/` para el handoff, Langfuse, Promptfoo y Crawl4AI.
- Ningún componente con licencia restrictiva (Dify, n8n, Typebot) en el camino crítico del producto.

**Por qué no B como base del producto:**
- las licencias de Dify, n8n y Typebot no permiten un SaaS multi-tenant revendible sin pagar licencias comerciales;
- el stack combinado necesita ≥8 GB de RAM;
- igual habría que construir la integración de agenda y los guardarraíles de salud.

**Por qué no A a largo plazo:**
- el white-label cuesta ≥USD 97–220/mes;
- los datos de salud quedan en un tercero sin un DPA claro ⚠️;
- no controlas el ruteo de modelos por país (crítico para Venezuela).

### Desglose mensual estimado por fase (antes de tener clientes que paguen)

| Concepto | Fase 1 (ruta A, 3 pilotos: 2 CO + 1 VE) | Fase 2 (MVP propio, 1–3 pilotos) |
|---|---|---|
| Plataforma / hosting | Convocore USD 29 ⚠️ | Hetzner CX33 €8,49 + IPv4 ≈ **USD 10,25** ⚠️ |
| Base de datos / almacenamiento | incluido | Postgres en el VPS USD 0 + backups ~USD 1 |
| LLM (BYOK) | ~USD 2 | ~USD 2–6 |
| WhatsApp (Meta) | ~USD 9 (VE 8,06 + CO 2 × 0,50) | ~USD 9 |
| Dominio + landing (estática) | ~USD 1 | ~USD 1 |
| Observabilidad (Langfuse Hobby / Sentry free) | – | USD 0 |
| **Total** | **≈ USD 41** | **≈ USD 23–27** |

La recomendación completa por país está en `docs/00-mercados.md` y la decisión en `docs/decisiones/0001-ruta-inicial.md`.
