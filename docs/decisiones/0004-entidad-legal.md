# ADR 0004 — Dónde registrar el negocio

- **Estado:** Aceptada para la Fase 1 (actualizada el 2026-10-01 con las respuestas del usuario)
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

## Decisión (2026-10-01)

Respuestas del usuario: reside en Venezuela, tiene tarjeta internacional y no se indicó representación en Colombia ni en España.

1. **Fase 1:** operar como **persona natural en Venezuela**.
   - Cobro a clínicas venezolanas en USD (transferencia o efectivo), Pago Móvil a tasa BCV o USDT, con registro de cada operación.
   - Proveedores pagados con la tarjeta internacional: Meta, Gemini, Convocore y Hetzner.
2. **Modelos:** solo proveedores que admiten Venezuela (Gemini). No se abren cuentas de Anthropic ni OpenAI para el negocio mientras resida en VE, porque sus políticas de regiones lo impiden.
3. **Disparador para revisar esta decisión:** ≥3 clientes pagando fuera de VE, o cuando haga falta cobrar con Wompi, Mercado Pago o Stripe. Entonces se evalúa una SAS en Colombia (si hay representante) o una LLC en EE.UU. (si hay banca viable).
