# ADR 0001 — Ruta inicial: A → C (validar revendiendo y construir un MVP mínimo)

- **Estado:** Propuesta (pendiente de aprobación de la Fase 0)
- **Fecha:** 2026-10-01

## Contexto

- Hay que elegir entre revender (A), autohospedar open source (B) o construir (C).
- El nicho son clínicas con WhatsApp como canal principal.
- El presupuesto es de USD 50/mes hasta tener clientes que paguen.

Hallazgos de la Fase 0 (`docs/00-benchmark.md`):
- **A:** los planes white-label cuestan USD 97 (Lety), 197 (Stammer) y 220 (Convocore WL), y ninguno cabe. Solo cabe Convocore Pay as you go o Starter (USD 20–29), sin white-label completo.
- **B:** Dify prohíbe el uso multi-tenant y quitar su logo, n8n prohíbe revenderlo y Typebot (FSL) prohíbe ofrecerlo como servicio. El stack necesita ≥8 GB de RAM.
- **IA:** cuesta entre USD 0,0012 y 0,027 por conversación. El costo dominante es WhatsApp, que cobra los mensajes de servicio desde el 1-oct-2026.
- **Venezuela:** no tiene Anthropic ni OpenAI, así que hace falta ruteo de modelos por país.

## Decisión

1. **Fase 1:** validar con 1–3 pilotos usando **Convocore** en el plan más barato que incluya WhatsApp y BYOK. Gemini para VE y GPT-5 mini o Gemini para CO. Sin datos clínicos.
2. **Fase 2** (si ≥2 pilotos pagan): **construir un MVP propio mínimo (C)** en TypeScript sobre Hetzner + Coolify + Postgres/pgvector, reutilizando solo componentes con licencia permisiva (Vercel AI SDK, Chatwoot sin `enterprise/`, Langfuse, Promptfoo, Crawl4AI).
3. **B** no es la base del producto. Solo se usa como fuente de componentes.

## Consecuencias

- **A favor:**
  - el primer cliente llega en 1–2 semanas;
  - el gasto de la Fase 1 ronda USD 41/mes y el de la Fase 2, USD 23–27/mes (más WhatsApp por clínica);
  - control total de la agenda, los guardarraíles y el ruteo por país en la Fase 2.
- **En contra:**
  - los pilotos de la Fase 1 dependen de un tercero y no son white-label;
  - habrá que migrar las configuraciones de los pilotos a la plataforma propia;
  - la Fase 2 requiere 4–8 semanas de desarrollo.
- **Actualización 2026-10-01:** con 6 h/semana de dedicación, el MVP propio (~55–70 h con Claude Code) llevaría **9–12 semanas**. Eso refuerza validar primero sin código.
  - Requisito duro de la plataforma de la Fase 1: **permitir BYOK con Gemini**, porque el fundador reside en VE y no puede usar las claves de Anthropic ni OpenAI. Si Convocore no lo permite, probar otra plataforma que sí lo haga antes de pasar al plan B.
- **Plan B:** si Convocore no admite Gemini con BYOK o no factura WhatsApp correctamente ⚠️, hacer un piloto "C-cero" con un solo cliente: script mínimo Meta Cloud API → LLM → Google Calendar.
