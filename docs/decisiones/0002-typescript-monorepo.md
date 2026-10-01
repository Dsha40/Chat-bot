# ADR 0002 — TypeScript de punta a punta, monorepo y adaptadores

- **Estado:** Aceptada (regla del proyecto; aplica desde la Fase 2)
- **Fecha:** 2026-10-01

## Contexto

- El producto combina panel web, widget embebible, webhooks de canales, workers y lógica de agentes y RAG.
- Hay que poder cambiar de proveedor de LLM (por país, costo o disponibilidad, por ejemplo Venezuela sin Anthropic ni OpenAI) y de canal sin reescribir.

## Decisión

- **TypeScript** en todo el stack. Las librerías clave tienen SDKs y licencias permisivas: Vercel AI SDK (Apache 2.0), SDK de Anthropic, Mastra (Apache 2.0, Fase 4) y Drizzle.
- **Monorepo con pnpm + Turborepo:** `apps/{web,widget,api}` y `packages/{core,channels,db,ui}`.
- **Interfaces propias:**
  - `LlmProvider`: `generate`, `stream`, `embed`, `costOf(usage)`, con un registro de modelos y precios versionado por fecha;
  - `Channel`: `receive(webhook)`, `send(message)`, `templates`.
  - Ningún módulo de negocio importa un SDK de proveedor directamente.
- **Ruteo de modelos** declarativo por país, plan y regla de escalado.
- **Configuración** validada con `zod` en el arranque. `.env.example` sin secretos.

## Consecuencias

- **A favor:**
  - cambiar de modelo o canal es configuración, no reescritura;
  - un solo lenguaje para todo el equipo.
- **En contra:** cuesta algo más al principio porque hay que definir las interfaces. Python solo se usaría para ingesta pesada (por ejemplo Crawl4AI) como servicio aislado.
