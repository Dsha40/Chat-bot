# ADR 0004 — Dónde registrar el negocio

- **Estado:** **Propuesta: pendiente de decisión del usuario**
- **Fecha:** 2026-10-01

## Contexto

El país de registro y el de residencia determinan qué proveedores y pasarelas se pueden usar (`docs/00-mercados.md` §5):
- **Desde Venezuela:**
  - no hay Anthropic, OpenAI, Stripe, Mercury ni Wise;
  - sí Gemini y Meta (con tarjeta internacional).
- **Anthropic:** se reserva el derecho de no servir a entidades con propiedad mayoritaria atribuible a países no soportados. **OpenAI:** prohíbe usuarios finales en países no soportados.
- **Colombia y Argentina:** para cobrar con Wompi o Mercado Pago hace falta una entidad o persona local.

## Opciones

| Opción | Costo | A favor | En contra |
|---|---|---|---|
| Persona natural en VE | ~USD 0 | Sin costo. Válida para pilotos | No sirve para cobrar en CO, AR ni ES con pasarelas locales |
| SAS en Colombia | COP 1,2–3,5 M + contador | Pasarelas locales e IA para clientes fuera de VE | Requiere representante legal en CO |
| LLC en EE.UU. (Wyoming) | ~USD 297 + USD 60/año | Stripe | Banca difícil para residentes en VE. Obligaciones fiscales de EE.UU. ⚖️ |
| Autónomo en España | €88,64/mes | Mercado de la UE | Requiere residencia |

## Propuesta

1. Fase 1 sin entidad.
2. Al llegar a ≥3 clientes pagando en Colombia, **SAS colombiana** si hay representación posible.
3. Si no, **LLC en Wyoming**, resolviendo antes la banca.
4. En ningún caso falsear la residencia ni usar VPN para acceder a proveedores.

## Pendiente

Que el usuario confirme:
- el país de residencia;
- si dispone de una tarjeta internacional;
- si puede tener representación en Colombia o España.
