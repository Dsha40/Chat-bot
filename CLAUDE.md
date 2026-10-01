# CLAUDE.md — Plataforma de agentes de IA para clínicas

Archivo vivo con el objetivo, las decisiones, las convenciones y el estado del proyecto. Se actualiza al cerrar cada fase y cada vez que se registra un ADR.

## Objetivo

Agentes de IA para **clínicas, consultorios médicos y odontológicos, centros de estética y negocios de servicios** con muchas consultas repetidas.

- **Canal principal:** WhatsApp. Después, widget web.
- **Casos de uso:** FAQs (horarios, precios, servicios, ubicación, seguros), agendar, reagendar y cancelar citas, recordatorios, captura de datos mínimos y derivación a un humano.
- **Métricas de valor:** tiempo de primera respuesta, % de consultas resueltas sin humano y citas agendadas por el bot.
- **Restricción dura:** **USD 50/mes en total** hasta tener clientes que paguen.
- **Objetivo de margen:** margen bruto ≥ 70 % por cliente.

## Estado actual (2026-10-01)

- [x] **Fase 0 — Investigación y benchmark:** `docs/00-benchmark.md` y `docs/00-mercados.md`. **Pendiente: aprobación del usuario.**
- [ ] Fase 1 — Validación con 1–3 pilotos, sin código propio (ruta A → ver ADR 0001).
- [ ] Fase 2 — MVP propio mínimo (ruta C), solo si la Fase 1 lo justifica.
- [ ] Fase 3 — Multi-tenant, más canales, white-label para agencias y facturación.
- [ ] Fase 4 — Voz, orquestación, evaluaciones y ruteo avanzado de modelos.

**No escribir código de aplicación hasta que el usuario apruebe el resultado de la Fase 0.**

## Decisiones tomadas

| ADR | Decisión | Estado |
|---|---|---|
| [0001](docs/decisiones/0001-ruta-inicial.md) | Ruta A → C: validar revendiendo (Convocore, plan barato) y construir un MVP propio mínimo. B solo para componentes con licencia permisiva | Propuesta |
| [0002](docs/decisiones/0002-typescript-monorepo.md) | TypeScript de punta a punta, monorepo pnpm + Turborepo, adaptadores por canal y por LLM | Aceptada |
| [0003](docs/decisiones/0003-whatsapp-api-oficial.md) | Solo la WhatsApp Cloud API oficial de Meta. Nada de Evolution API/Baileys en producción | Aceptada |
| [0004](docs/decisiones/0004-entidad-legal.md) | Dónde registrar el negocio | **Propuesta: pendiente del usuario** |

**Respuestas del usuario (Fase 0):**
- **A quién vender:** a clínicas directamente primero; agencias (white-label) a partir de la Fase 3.
- **País de registro:** sin definir (Venezuela como punto de partida).
- **Agendas de los clientes:** Google Calendar y papel/WhatsApp manual. Prioridad: Google Calendar API más una agenda propia simple.

## Mercados (orden recomendado)

| Orden | País | Motivo |
|---|---|---|
| 1 | Colombia | WhatsApp a USD 0,0008 por mensaje, todos los proveedores disponibles, margen >90 % |
| 2 | Venezuela | Pilotos en paralelo. Sin Anthropic/OpenAI, se usa Gemini |
| 3 | España | Mayor precio, más cumplimiento normativo |
| 4 | Argentina | WhatsApp a USD 0,026, comisiones de ~6 % e inflación |

Detalle en `docs/00-mercados.md`.

## Stack tentativo (verificar versiones antes de usar)

| Capa | Herramientas | Notas |
|---|---|---|
| Panel | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Autohospedado con **Coolify** en Hetzner. **Vercel Hobby no permite uso comercial** |
| Widget | Web Component o Preact + Vite | Bundle pequeño |
| IA | Vercel AI SDK (Apache 2.0) detrás de una interfaz `LlmProvider` propia | **Ruteo por país:** VE → Gemini; CO, AR y ES → GPT-5 mini o Gemini por defecto, escalado a Claude Sonnet 5.5 por regla |
| Datos | Postgres + pgvector en el VPS, Drizzle ORM | Supabase Free solo para prototipos: se pausa tras 7 días sin actividad |
| Canales | WhatsApp Cloud API (Meta) → widget web → Instagram, Messenger y Telegram (Fase 3) | — |
| Agenda | Google Calendar API (gratuita) + agenda propia simple | Cal.com es AGPL: evitarlo salvo que se autohospede sin modificar |
| Handoff | Chatwoot (MIT, **sin** `enterprise/`) o una bandeja propia simple | Chatwoot necesita ≥4 GB de RAM |
| Calidad | Langfuse (MIT, núcleo), Promptfoo (MIT), Vitest, Playwright, Sentry | — |
| Ingesta | Crawl4AI (Apache 2.0 + atribución), embeddings text-embedding-3-small | — |
| Hosting | Hetzner CX23 (€5,49) o CX33 (€8,49) | Precios subidos en abril y junio de 2026 |

**Licencias a evitar en el camino crítico del producto:** Dify (multi-tenant y logo), n8n (Sustainable Use License), Typebot (FSL) y Botpress v12 (AGPL). Detalle en `docs/00-benchmark.md` §4.

## Reglas de trabajo

1. **Empezar siempre en modo plan:** proponer, esperar aprobación y después ejecutar.
2. **Verificar en la web** precios, versiones de librerías y planes de proveedores antes de recomendarlos, e indicar la fecha de consulta. Lo no verificado se marca con ⚠️.
3. Mantener este archivo y `docs/decisiones/` (ADRs cortos: contexto → decisión → consecuencias).
4. **TypeScript** de punta a punta salvo una razón fuerte para Python.
5. **Código modular:** cada canal (web, WhatsApp, Instagram, voz) y cada proveedor de LLM va detrás de una interfaz o adaptador.
6. **Nada de secretos en el repo:** `.env.example` + validación de variables con `zod`.
7. **Cada fase termina con:** demo funcionando, costos medidos y una recomendación de seguir, pivotar o parar.

## Convenciones

- **Idioma:** documentación y textos de producto en español. Código, identificadores y commits en inglés.
- **Estructura objetivo (Fase 2+):** `apps/{web,widget,api}`, `packages/{core,channels,db,ui}`, `docs/decisiones`, `evals/`.
- **Costos desde el día 1:** cada llamada al LLM registra modelo, tokens de entrada, salida y caché y costo en USD por conversación y por clínica.
- **Límites por plan:** conversaciones, agentes y documentos, con alertas de consumo. WhatsApp se factura incluido (Esencial) o al costo (Profesional).
- **Diseño de conversación:** ≤4 respuestas del bot por conversación típica. Cada mensaje de servicio por encima de 1.000/mes cuesta entre USD 0,0008 y 0,026 según el país.
- **Caché de prompts:** primero el prompt de sistema y luego el historial (prefijo estable). Los fragmentos de RAG van en el turno actual.

## Guardarraíles de salud (obligatorios en todo agente)

- **Nunca** dar diagnósticos, interpretar síntomas, recomendar medicamentos ni dosis.
- **Detectar urgencias** (dolor torácico, dificultad para respirar, sangrado abundante, ideación suicida, etc.) y responder de inmediato con el número de emergencias del país (VE 911, CO 123, AR 107/911 según provincia, ES 112 ⚠️ confirmar por ciudad) más derivación a un humano.
- **Minimización:** guardar solo nombre, teléfono, tipo de cita, fecha y profesional. Nada de síntomas, diagnósticos, imágenes ni documentos de identidad.
- **Transparencia:** el primer mensaje declara que es un asistente de IA (obligatorio en ES por el art. 50 del Reglamento de IA desde el 2-ago-2026) y enlaza la política de datos.
- **Consentimiento:** pedirlo en el chat según el texto de cada país (`docs/00-mercados.md`) y guardar la prueba con fecha y hora.
- **Retención:** 12 meses para conversaciones, con borrado a pedido. Datos alojados en la UE.
- **Alcance:** el agente solo atiende temas de la clínica. La política de WhatsApp prohíbe los chatbots de propósito general desde el 15-ene-2026.
- **Sector público venezolano:** no vender a entes públicos ni empresas del Estado por las sanciones OFAC (EO 13884).
