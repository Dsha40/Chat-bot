# ADR 0003 — Solo la WhatsApp Cloud API oficial de Meta

- **Estado:** Aceptada
- **Fecha:** 2026-10-01

## Contexto

Las alternativas no oficiales (Evolution API y Baileys) emulan el protocolo de WhatsApp Web:
- **violan los ToS de WhatsApp**;
- exponen el número de la clínica a un **baneo permanente**: las fuentes reportan que las cuentas duran entre 2 y 8 semanas antes de ser detectadas ([checkleaked](https://whatsapp.checkleaked.cc/blog/whatsapp-cloud-api-vs-unofficial), [messagemarvel](https://messagemarvel.com/is-evolution-api-a-real-alternative-to-the-official-whatsapp-business-api/));
- la licencia de Evolution API exige mantener su logo y avisar del uso.

La Cloud API oficial:
- cobra por mensaje y, desde el 1-oct-2026, también los mensajes de servicio por encima de 1.000/mes por número;
- exige un método de pago internacional;
- desde el 15-ene-2026 prohíbe los chatbots de propósito general.

## Decisión

- Usar **solo la WhatsApp Cloud API oficial**, directa o vía un BSP si conviene.
- **No usar** Evolution API ni Baileys en producción ni con números de clientes. Tampoco en pilotos.
- El agente se limita al ámbito de la clínica: citas, FAQs y derivación.

## Consecuencias

- **A favor:** números estables, plantillas aprobadas para recordatorios y cumplimiento de la política de Meta.
- **En contra:**
  - costo por mensaje: VE ~USD 0,013, CO 0,0008, AR 0,026 y ES 0,020;
  - verificación del negocio en Meta;
  - hace falta una tarjeta internacional.
- **Mitigaciones:** diseño de ≤4 mensajes por conversación y WhatsApp facturado al costo en los planes altos.
