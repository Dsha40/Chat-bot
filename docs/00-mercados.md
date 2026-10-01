# Fase 0 — Mercados objetivo: Venezuela, Colombia, Argentina y España

> **Fecha de consulta de todas las fuentes: 2026-10-01.** Resumen práctico, **no es asesoría legal ni fiscal**.
> Antes de vender en cada país, valida con un abogado local los puntos marcados con ⚖️ y con la fuente oficial los marcados con ⚠️.
> El método y las limitaciones de las fuentes están en `docs/00-benchmark.md` ("Cómo se verificó").

## Supuestos comunes

- **Clínica tipo:** 300 conversaciones al mes.
  - Cada conversación tiene 5 respuestas del bot, así que hay 1.500 mensajes de servicio, de los que 1.000 son gratis por número.
  - A eso se suman 120 recordatorios (plantilla *utility*) al mes.
- **IA por conversación:**
  - CO, AR y ES: USD 0,0061 (90 % GPT-5 mini + 10 % Claude Sonnet 5.5).
  - VE: USD 0,0021 (90 % Gemini 2.5 Flash-Lite + 10 % Gemini Flash).
  - El detalle está en el benchmark, sección 2.
- **Costo fijo compartido (ruta C):** USD 12,24/mes.
  - Hetzner CX33 + IPv4 ≈ USD 10,24 ⚠️
  - Dominio ≈ USD 1
  - Backups ≈ USD 1
- **Tipos de cambio:**

| Moneda | Tasa | Fuente |
|---|---|---|
| VES | 859,06 por USD (tasa BCV del 30-sep-2026) | [descifrado.com](https://www.descifrado.com/2026/09/30/precio-del-dolar-oficial-cierra-septiembre-en-85906-bolivares-alza-mensual-de-806/), [finanzasdigital.com](https://finanzasdigital.com/tasa-de-cambio-bcv-30-septiembre-2026/) |
| COP | 3.341,23 por USD (TRM del 30-sep-2026) | [wilkinsonpc](https://dolar.wilkinsonpc.com.co/2026-09-30) |
| ARS | 1.540 por USD (BNA venta, 30-sep-2026; MEP 1.541) | [La Nación](https://lanacion.com.ar/economia/dolar/dolar-hoy-y-dolar-blue-en-vivo-a-cuanto-cotiza-el-oficial-y-cual-es-el-precio-del-paralelo-este-nid30092026) |
| EUR | 0,8783 por USD (28-sep-2026) | [Infobae](https://www.infobae.com/espana/2026/09/28/cotizacion-del-euro-frente-al-dolar-hoy-28-de-septiembre/) |

- **Margen bruto** = (precio − WhatsApp − IA − comisión de cobro − costo fijo prorrateado) / precio.
- **Planes:**
  - **Esencial:** 300 conversaciones, WhatsApp incluido.
  - **Profesional:** 700 conversaciones, con el consumo de Meta facturado **al costo** (*pass-through*). También se calcula el precio mínimo que haría falta para incluir WhatsApp.

## Resumen comparativo

| | 🇻🇪 Venezuela | 🇨🇴 Colombia | 🇦🇷 Argentina | 🇪🇸 España |
|---|---|---|---|---|
| WhatsApp utility = servicio (USD por mensaje) | 0,0113–0,0130 ⚠️ | **0,0008** | 0,0260 | 0,0200 |
| Costo variable por clínica tipo (WhatsApp + IA) | USD 8,68 | **USD 2,33** | USD 17,96 | USD 14,24 |
| Costo mensual total con 1 / 5 / 20 clientes | 20,92 / 55,64 / 185,85 | **14,57 / 23,90 / 58,87** | 30,20 / 102,02 / 371,35 | 26,48 / 83,42 / 296,95 |
| Precio del plan Esencial | USD 49 (Bs 42.094) | COP 219.000 (≈ USD 65,5) | USD 99 (≈ ARS 152.460) | €69 + IVA (≈ USD 78,6) |
| Margen Esencial con 1 / 5 / 20 clientes | 54 / **74** / 78 % | 75 / **90** / 93 % | 64 / **73** / 75 % | 64 / **77** / 79 % |
| Anthropic / OpenAI disponibles | ❌ / ❌ | ✅ / ✅ ⚠️ | ✅ / ✅ ⚠️ | ✅ / ✅ |
| Stripe para cobrar | ❌ | ❌ | ❌ | ✅ |
| Dificultad de entrada | **Alta** (operativa) | **Baja–media** | **Media–alta** | **Media–alta** (cumplimiento) |
| Orden recomendado | 2.º (pilotos en paralelo) | **1.º** | 4.º | 3.º |

El presupuesto de USD 50/mes se respeta con 1 cliente en cualquier país. Con 5 clientes, VE, AR y ES lo superan en costo, pero los ingresos lo cubren con creces: con 5 clientes en ES entran USD ~393/mes frente a USD 83 de costo.

---

## 🇻🇪 1. Venezuela

### 1.1 Costos operativos

- **WhatsApp (mercado "Resto de América Latina", tarifas desde el 1-oct-2026):**
  - marketing: USD 0,0740–0,0851;
  - utility y servicio: USD 0,0113–0,0130;
  - autenticación: ~USD 0,0113.
  - Las fuentes no coinciden, así que hay que confirmar en el rate card oficial ⚠️ ([flowcall](https://www.flowcall.co/blog/whatsapp-business-api-pricing), [manychat](https://help.manychat.com/hc/en-us/articles/14281380243740-WhatsApp-pricing-guide), [mazkara.studio](https://mazkara.studio/en/newsletter/whatsapp-penetration-latin-america-2026/)). Los cálculos usan 0,0130.
- **IA:** USD 0,0021 por conversación con Gemini, que es el proveedor disponible en VE. Una clínica tipo gasta USD 0,62/mes.
- **Costo total mensual** (con el fijo de USD 12,24):

| Clientes | Total |
|---|---|
| 1 | **USD 20,92** |
| 5 | **USD 55,64** |
| 20 | **USD 185,85** |

### 1.2 Disponibilidad de proveedores

| Proveedor | ¿Acepta cuentas o usuarios de VE? | Detalle |
|---|---|---|
| Anthropic (API Claude) | ❌ | Venezuela no figura en la lista de acceso comercial a la API (verificado directamente en [anthropic.com/supported-countries](https://www.anthropic.com/supported-countries)). Los [términos comerciales](https://www.anthropic.com/legal/commercial-terms) incorporan esa política para el cliente y sus usuarios. Además, Anthropic "se reserva el derecho de no prestar servicio a entidades cuya propiedad mayoritaria, directa o indirecta, sea atribuible a países no listados" ⚖️ |
| OpenAI | ❌ | No figura en la lista de países soportados ([developers.openai.com](https://developers.openai.com/api/docs/supported-countries)). El Services Agreement prohíbe que **el cliente o sus usuarios finales** accedan, o que se les ofrezca acceso, fuera de los países soportados ([openai.com](https://openai.com/policies/services-agreement/)) |
| Google Gemini API | ✅ | Venezuela figura en las regiones disponibles ([ai.google.dev](https://ai.google.dev/gemini-api/docs/available-regions)). Facturación de Cloud Billing con medio de pago venezolano: ⚠️ no confirmada |
| OpenRouter | ⚠️ | Aplica las restricciones de cada proveedor de origen y las leyes de sanciones. Sus ToS prohíben eludirlas con VPN o proxy ([conductatlas](https://conductatlas.com/platform/openrouter/openrouter-terms-of-service/)). Sirve **solo** para modelos cuyo proveedor admite VE |
| Groq / DeepSeek | ⚠️ no verificado | Revisar la lista de países de cada uno antes de usarlos para tráfico VE |
| Meta / WhatsApp Cloud API | ✅ | Solo excluye Cuba, Irán, Corea del Norte, Siria y Crimea, Donetsk y Luhansk ([Vonage](https://api.support.vonage.com/hc/en-us/articles/4406453102868-What-are-the-country-restrictions-for-sending-or-receiving-messages-with-the-WhatsApp-Business-Platform)). **Exige una tarjeta Visa, Mastercard o Amex habilitada para pagos internacionales** ([useinvent](https://www.useinvent.com/blog/meta-whatsapp-payment-method-deadline-what-it-means-what-to-do)) |
| Stripe | ❌ | No abre cuentas a comercios en Venezuela |
| Mercury / Wise (banca para una LLC en EE.UU.) | ❌ | Venezuela está en la lista de países prohibidos de Mercury por residencia ([Mercury](https://support.mercury.com/hc/en-us/articles/28771710754580-Prohibited-countries)) y Wise no opera allí ([Wise](https://wise.com/uk/help/articles/2978049/which-countries-can-i-use-wise-in)) |
| Hetzner / nube | ⚠️ no verificado | Depende del medio de pago. Alojar en la UE no tiene restricción técnica |

**Sanciones (OFAC):**
- El programa de Venezuela **no es un embargo total**.
- La EO 13884 bloquea al **Gobierno de Venezuela**, que incluye entes públicos y empresas estatales ([CRS](https://www.congress.gov/crs-product/IF10715), [Steamship Mutual](https://www.steamshipmutual.com/liabilities-and-claims/sanctions/venezuela/us-executive-order-13884), [OFAC](https://ofac.treasury.gov/sanctions-programs-and-country-information/venezuela-related-sanctions)).
- Durante 2026 OFAC amplió las licencias generales, por ejemplo las GL 61 y 62 de telecomunicaciones en agosto ([Cleary Gottlieb](https://www.clearygottlieb.com/news-and-insights/publication-listing/ofac-issues-general-licenses-authorizing-activity-in-venezuelan-telecommunications-sector)).
- **Regla práctica:** venderle a clínicas privadas no está sancionado per se. **No vender a hospitales públicos ni a entes del Estado** y revisar la lista SDN de cada cliente ⚖️.

**Alternativas para operar desde o hacia Venezuela:**

| Opción | ¿Legal? | ¿Cumple ToS? | Riesgo | Recomendación |
|---|---|---|---|---|
| Usar **Gemini** (y otros proveedores que admitan VE) para el tráfico venezolano | ✅ | ✅ | Bajo. Si Gemini cambia de precio o política, quedas con un solo proveedor | **Recomendada.** Adaptador de LLM con ruteo por país |
| Registrar la empresa en CO o EE.UU. y usar Anthropic/OpenAI para pacientes en VE | ✅ (la entidad) | ❌ OpenAI prohíbe usuarios finales en países no soportados; ⚠️ Anthropic incorpora la política de regiones y su cláusula de propiedad | Alto: suspensión de la cuenta | No para tráfico VE. Sí para clientes en CO, AR y ES |
| Acceder a Anthropic/OpenAI vía OpenRouter | ✅ | ❌ hereda las restricciones | Alto | No |
| VPN, número virtual o ubicación falsa | ⚖️ posible fraude contractual | ❌ | Muy alto: cierre de cuenta, pérdida de fondos | **No** |
| Modelos open-weights (gpt-oss, Llama, Qwen) en un proveedor que admita VE, o autohospedados | ✅ (licencias Apache/MIT ⚠️ por modelo) | ✅ si el proveedor admite VE | Medio. Autohospedar en CPU no es viable con USD 50 | Plan B |

### 1.3 Cobros a clientes

| Método | Notas |
|---|---|
| **USD en efectivo o transferencia** | Lo más simple para cobrar a clínicas privadas. Si quien recibe es contribuyente especial (SPE), aplica el **IGTF del 3 %** a pagos en divisas ([galac.com](https://galac.com/galac-blog/igtf-pagos-divisas-cripto/)) |
| **Zelle** | Requiere una cuenta bancaria en EE.UU. a tu nombre o de tu empresa. Usar la cuenta de un tercero tiene riesgo de bloqueo y de trazabilidad fiscal. Legalmente debería cobrarse el IGTF ([fintechvenezuelaguia](https://www.fintechvenezuelaguia.com.ve/2026/03/Impuesto-igtf-como-afecta-tus-pagos-con-tarjetas-internacionales.html)) |
| **Pago Móvil en bolívares a tasa BCV** | Exento de IGTF. Fijar el precio en USD y cobrar en Bs **a la tasa BCV del día del pago**, porque el dólar oficial subió 188 % en los primeros 9 meses de 2026 y 8,06 % solo en septiembre ([descifrado](https://www.descifrado.com/2026/09/30/precio-del-dolar-oficial-cierra-septiembre-en-85906-bolivares-alza-mensual-de-806/)) |
| **USDT / Binance (P2P o Pay)** | Rápido y sin banco. ⚖️ Los criptoactivos también caen en el IGTF y la regulación cambia. Llevar registro de cada operación |

### 1.4 Precio sugerido de planes

| Plan | USD | Bs (tasa BCV 859,06) | Incluye | Margen |
|---|---|---|---|---|
| Esencial | **49** | 42.094 | 300 conversaciones, WhatsApp incluido, 1 agenda | 74 % con 5 clientes; 78 % con 20 |
| Profesional | **129** + WhatsApp al costo (≈ USD 36/mes) | 110.819 + consumo | 700 conversaciones, varias agendas, handoff | 94 % sobre la tarifa. Para incluir WhatsApp y mantener 70 % habría que cobrar ≥ USD 149 |

**Referencias locales de precio:**
- AnswerForMe desde USD 29 ([answerforme.io](https://answerforme.io/es/soluciones/venezuela)).
- LiveConnect, de USD 36 a 71/mes ([liveconnect.chat](https://liveconnect.chat/ve/whatsapp-multiagente-venezuela)).

### 1.5 Marco legal de datos y salud ⚖️

- **No existe una ley general de protección de datos personales** ([Espacio Público](https://espaciopublico.ong/en-venezuela-se-regula-la-proteccion-de-datos-personales/), [Transparencia Venezuela](https://transparenciave.org/project/en-venezuela-no-existe-una-ley-que-resguarde-los-datos-personales/)).
- **Constitución:**
  - **art. 28 (habeas data):** derecho a acceder, conocer el uso y la finalidad, y pedir la actualización, rectificación o destrucción de los datos;
  - **art. 60:** vida privada e intimidad.
- **Jurisprudencia:** la sentencia TSJ-SC 759 del 21-may-2025 atribuye las demandas de habeas data a los tribunales municipales contencioso-administrativos ([Badell & Grau](https://badellgrau.com/sala-constitucional-del-tsj-establecio-el-habeas-data-como-mecanismo-para-la-proteccion-de-datos-personales/)).
- **Ley Especial contra Delitos Informáticos, art. 20:** castiga con 2 a 6 años de prisión apoderarse, usar, modificar o eliminar datos personales ajenos sin consentimiento ([texto en OEA](http://www.oas.org/juridico/spanish/cyb_ven_ley%20esp_con_deli_infor.pdf)).
- **Secreto médico:** lo establecen la Ley de Ejercicio de la Medicina (1982) y el Código de Deontología Médica (1985), y es prácticamente absoluto ([SciELO](https://ve.scielo.org/scielo.php?script=sci_arttext&pid=S1690-75152008000100006)).
- **Qué hacer en la práctica:**
  - **Consentimiento en el chat:** "Soy el asistente virtual de [Clínica]. Uso tus datos (nombre, teléfono y motivo general de la cita) solo para gestionar tu cita. No des información médica detallada por aquí. ¿Aceptas? Responde SÍ".
  - **Qué no guardar:** síntomas detallados, diagnósticos, resultados, fotos clínicas ni documentos de identidad completos. Solo nombre, teléfono, tipo de cita, fecha y profesional.
  - **Dónde alojar:** no hay requisito de localización. Conviene alojar en la UE (Hetzner Alemania o Finlandia) para cumplir de una vez el estándar más alto, que sirve también para ES.
  - **Cláusulas del contrato con la clínica:**
    - la clínica es la responsable de los datos y tú, el encargado;
    - deber de confidencialidad y respeto del secreto médico;
    - finalidad limitada;
    - lista de subencargados (Meta, proveedor de LLM, hosting);
    - plazo de retención (12 meses para conversaciones, borrado a pedido);
    - aviso de incidentes en 72 h;
    - prohibición de venderle a entes públicos.

### 1.6 Contexto comercial

- **Uso de WhatsApp:** entre el 80 y el 85 % de los usuarios de internet ([mazkara.studio](https://mazkara.studio/en/newsletter/whatsapp-penetration-latin-america-2026/)).
- **Prioridad de digitalización de las clínicas:** 1) recordatorios por WhatsApp, 2) admisión, 3) historia clínica digital. Las fuentes del sector reportan reducciones de inasistencias del 35–50 % con recordatorios ([codebymelendez](https://codebymelendez.com/insights/automatizacion-clinicas-venezuela-costos)).
- **Agendas habituales:** papel, WhatsApp manual y Google Calendar, que coincide con tu respuesta. También hay directorios y apps locales como ReservaSimple y citamedica.com.ve ([reservasimple](https://www.reservasimple.com/app-citas-medicos-venezuela), [citamedica](https://citamedica.com.ve/)).
- **Cómo consiguen pacientes:** referidos, Instagram y WhatsApp, y directorios médicos ⚠️ (dato cualitativo).
- **Competidores:** AnswerForMe, LiveConnect y agencias locales de automatización.

### 1.7 Veredicto

- **Dificultad: alta**, por el acceso a modelos de IA, los cobros, la tarjeta para Meta y la inflación. La complejidad legal es baja porque no hay ley de datos, aunque eso también genera menos confianza.
- **Margen esperado:** medio (74 % en Esencial con 5 clientes).
- **Orden: 2.º**, con pilotos en paralelo a Colombia si el fundador está en Venezuela, porque la red de contactos acelera la validación.

---

## 🇨🇴 2. Colombia

### 2.1 Costos operativos

- **WhatsApp:**
  - marketing: USD 0,0125;
  - utility, autenticación y servicio: **USD 0,0008**, una de las tarifas más bajas del mundo ([ominiflow](https://ominiflow.com/whatsapp-api-pricing/colombia), [patagon.ai](https://www.patagon.ai/blog-posts/whatsapp-business-api-pricing)).
- **Clínica tipo:** USD 0,50 de WhatsApp + USD 1,84 de IA = **USD 2,33/mes**.
- **Costo total mensual:**

| Clientes | Total |
|---|---|
| 1 | **USD 14,57** |
| 5 | **USD 23,90** |
| 20 | **USD 58,87** |

### 2.2 Disponibilidad de proveedores

- **Anthropic:** ✅ verificado directamente.
- **OpenAI:** ✅ ⚠️ según su lista oficial, no leída directamente.
- **Gemini:** ✅
- **Meta Cloud API:** ✅
- **Stripe:** ❌ no abre cuentas de comercio en Colombia. Solo admite pagos transfronterizos hacia cuentas colombianas ([Stripe changelog](https://docs.stripe.com/changelog/dahlia/2026-03-25/cross-border-payouts-new-countries), [mazinooyolo](https://mazinooyolo.com/blog/stripe-account-in-colombia/)).
- **Hetzner:** ✅ con tarjeta.

### 2.3 Cobros a clientes

| Pasarela | Comisión | Fuente |
|---|---|---|
| **Wompi** (Bancolombia), link de pago | Nequi / Bancolombia 1,5 % + IVA · tarjetas 1,99 % + IVA · PSE 2,69 % + IVA · plan agregador 2,65 % + COP 700 + IVA | [mentoracolombia](https://mentoracolombia.com/pasarelas-de-pago-colombia-2026-comisiones-wompi-bold-mercadopago/) |
| **Mercado Pago**, link de pago | Acreditación al instante 3,29 % + COP 800 · a 7 días 2,99 % · a 14 días 2,79 % (+ IVA). PSE 2,99 % + COP 900 | [mentoracolombia](https://mentoracolombia.com/pasarelas-de-pago-colombia-2026-comisiones-wompi-bold-mercadopago/), [btodigital](https://btodigital.com/pasarelas-pago-colombia-comparativa-guia-negocio/) |
| **PayU** | ⚠️ no verificado en esta consulta | — |
| **Nequi / transferencia** | Nequi Negocios ([tarifas](https://ayuda.nequi.com.co/hc/es/articles/38968957037069-Tarifas-de-la-app-Nequi-Negocios)) | — |

Todas exigen una persona o empresa colombiana con RUT. Facturación electrónica DIAN: ⚠️ confirmar la obligación según el régimen.

### 2.4 Precio sugerido de planes

| Plan | COP | USD | Incluye | Margen |
|---|---|---|---|---|
| Esencial | **219.000** | 65,5 | 300 conversaciones, WhatsApp incluido | 90 % con 5 clientes; 93 % con 20 |
| Profesional | **499.000** | 149,4 | 700 conversaciones, WhatsApp incluido (≈ USD 2,2) | 92 % |

**Referencias de precio:**
- Dentiqa desde USD 89 ([dentiqa.app](https://dentiqa.app/blog/chatbot-clinica-dental)).
- Implementaciones a medida de COP 25–150 M ([softwaremedico.com.co](https://softwaremedico.com.co/chatbot-ia-para-citas/)).

### 2.5 Marco legal de datos y salud ⚖️

- **Ley 1581 de 2012 (habeas data):** los datos de salud son **sensibles**.
  - Exigen **autorización explícita**.
  - Responder debe ser **facultativo** y hay que informar la finalidad.
  - Las transferencias internacionales solo pueden ir a países con nivel adecuado según la SIC, salvo autorización expresa del titular. Entre las excepciones está el intercambio de datos médicos necesario para el tratamiento ([Ley 1581](http://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html), [estudio de la SIC](https://www.sic.gov.co/sites/default/files/files/Proteccion_Datos/consulta_avanzada/TRANSFERENCIA-INTERNACIONAL-DE-DATOS-PERSONALES-09-03-2017.pdf)).
- **Reglamentación:** Decreto 1377/2013, compilado en el Decreto 1074/2015 ⚠️.
- **Encargados:** la clínica (responsable) debe firmar un **contrato de transmisión** con el encargado, que eres tú.
- **RNBD (Registro Nacional de Bases de Datos):** obligatorio solo con activos superiores a 100.000 UVT o para entidades públicas ([SIC](https://www.sic.gov.co/registro-nacional-de-bases-de-datos), [Holland & Knight](https://www.hklaw.com/en/insights/publications/2025/01/obligaciones-del-registro-nacional-de-bases-de-datos-personales)). Las clínicas pequeñas normalmente no están obligadas.
- **Historia clínica:**
  - Res. 1995/1999, modificada por la Res. 839/2017 (custodia y retención);
  - Ley 2015/2020 (historia clínica electrónica interoperable);
  - Res. 1888/2025 (Resumen Digital de Atención obligatorio) ([MinSalud](https://www.minsalud.gov.co/Normatividad_Nuevo/Resolucion%20No%201888%20de%202025.pdf), [Ámbito Jurídico](https://www.ambitojuridico.com/noticias/analisis/el-abece-de-la-historia-clinica-en-colombia)).
  - **El bot no debe convertirse en historia clínica:** no registra anamnesis, diagnósticos ni conductas.
- **Qué hacer en la práctica:**
  - **Consentimiento en el chat:** "Autorizo a [Clínica] y a su encargado a tratar mis datos (nombre, teléfono, tipo de cita) para agendar y recordarme citas, según su política de tratamiento [enlace]. Sé que no estoy obligado a dar datos de salud. Responde ACEPTO". Hay que guardar la prueba de la autorización con fecha y hora.
  - **Qué no guardar:** síntomas, diagnósticos, medicamentos, imágenes ni número de documento salvo que sea imprescindible.
  - **Dónde alojar:** en la UE (adecuada según la SIC ⚠️). Si se usan LLM con sede en EE.UU., hay que incluirlo en la política y en la autorización expresa de transferencia.
  - **Cláusulas del contrato:** contrato de transmisión según el Decreto 1377, finalidades, medidas de seguridad, subencargados, retención, devolución o borrado al terminar y atención de consultas y reclamos de titulares en los plazos legales (10 y 15 días hábiles ⚠️).

### 2.6 Contexto comercial

- **Uso de WhatsApp:** 94 % de los usuarios de internet, y el 76 % interactúa con empresas por ese canal ([mazkara.studio](https://mazkara.studio/en/newsletter/whatsapp-penetration-latin-america-2026/)). La mensajería empresarial creció un 84 % ([Infobae](https://www.infobae.com/tecno/2026/04/27/whatsapp-lidera-el-crecimiento-del-84-en-la-mensajeria-empresarial-en-colombia/)).
- **Agendas habituales:** Google Calendar, Doctoralia, Nimbo y Eleonor, estas últimas integradas vía Google Calendar ([asistchat](https://asistchat.com/blog/chatbot-consultorios-medicos-citas-whatsapp)).
- **Caso de referencia:** una clínica dental de Bogotá triplicó sus citas confirmadas con un agente de IA ([tecnochat](https://tecnochat.com/blog/casos/como-una-clinica-dental-en-bogota-triplico-sus-citas-con-un-agente-de-ia-caso-real)).
- **Competidores:** Dentiqa, AsistChat, Tecnochat, CLINIMED, software médico local y agencias.

### 2.7 Veredicto

- **Dificultad: baja–media.** Requiere un RUT o empresa colombiana para cobrar.
- **Margen esperado: el más alto** (más del 90 %).
- **Orden: 1.º** por su costo de WhatsApp casi nulo, acceso a todos los proveedores, alto uso de WhatsApp y un marco legal claro.

---

## 🇦🇷 3. Argentina

### 3.1 Costos operativos

- **WhatsApp:**
  - marketing: USD 0,0618;
  - utility, autenticación y servicio: **USD 0,0260** ([ominiflow](https://ominiflow.com/whatsapp-api-pricing/argentina), [setsmart](https://setsmart.io/blog/whatsapp-business-api-pricing)).
  - Una fuente indicaba utility a USD 0,0072 en julio de 2025 ([doubletick](https://www.doubletick.com.ar/cuanto-cuesta-chatbot-whatsapp-argentina/)). Si se confirma, sería una subida fuerte, así que hay que verificarlo ⚠️.
- **Clínica tipo:** USD 16,12 de WhatsApp + USD 1,84 de IA = **USD 17,96/mes**.
- **Costo total mensual:**

| Clientes | Total |
|---|---|
| 1 | **USD 30,20** |
| 5 | **USD 102,02** |
| 20 | **USD 371,35** |

- **Sensibilidad:** con 4 respuestas por conversación en vez de 5, la clínica tipo baja a USD 10,16.

### 3.2 Disponibilidad de proveedores

- **Anthropic:** ✅ verificado.
- **OpenAI:** ✅ ⚠️
- **Gemini:** ✅
- **Meta:** ✅
- **Stripe:** ❌ para cuentas de comercio. Solo admite pagos transfronterizos hacia Argentina.

### 3.3 Cobros a clientes y manejo de la inflación

- **Mercado Pago, link de pago o suscripción:**
  - acreditación inmediata: **4,99 % + IVA (≈ 6,04 %)**;
  - a 14 días: 3,49–3,99 % + IVA;
  - a 30 días: 2,99 % + IVA ([sodi.com.ar](https://www.sodi.com.ar/blog/como-reducir-comisiones-mercadopago), [comparapasarelas](https://www.comparapasarelas.com/mercado-pago-comisiones)).
- **Inflación:**
  - agosto de 2026: 1,7 % mensual;
  - acumulada enero–agosto: 21,4 % ([valordolarblue](https://valordolarblue.ar/inflacion-mes-a-mes/2026)).
- **Dólar al 30-sep-2026:** BNA 1.540, MEP 1.541, blue 1.560.
- **Recomendaciones:**
  - **Precio de lista en USD** y cobro en ARS al dólar BNA o MEP del día de facturación, con suscripción mensual de Mercado Pago, o bien
  - un precio en ARS con **ajuste mensual por IPC (INDEC)** pactado en el contrato.
  - Para clínicas medianas, cobrar en USD por transferencia.

### 3.4 Precio sugerido de planes

| Plan | USD | ARS (1.540) | Incluye | Margen |
|---|---|---|---|---|
| Esencial | **99** | ≈ 152.460 | 300 conversaciones, WhatsApp incluido | 73 % con 5 clientes; 75 % con 20 |
| Profesional | **229** + WhatsApp al costo (≈ USD 72) | ≈ 352.660 + consumo | 700 conversaciones | 91 % sobre la tarifa. Con WhatsApp incluido haría falta ≥ USD 330 |

**Referencias de precio:**
- Cliengo, de USD 24 a 250.
- Botmaker desde USD 149, más USD 99 de alta.
- Bots a medida desde USD 600 ([doubletick](https://www.doubletick.com.ar/cuanto-cuesta-chatbot-whatsapp-argentina/)).

El precio de Esencial queda por encima de los SaaS genéricos. El diferenciador tiene que ser la agenda médica y la medición de citas agendadas.

### 3.5 Marco legal de datos y salud ⚖️

- **Ley 25.326 (datos personales):**
  - los datos de salud son **sensibles** y nadie está obligado a darlos;
  - el consentimiento debe ser libre, expreso e informado;
  - las transferencias internacionales están prohibidas hacia países sin protección adecuada, que determina la AAIP, salvo excepciones como el intercambio de datos médicos para tratamiento ([texto](https://www3.hcdn.gob.ar/dependencias/secparl/dgral_info_parlamentaria/dip/archivos/Ley_25326.pdf), [estudiolexar](https://estudiolexar.com/transferencia-internacional-de-datos-personales-desde-argentina/));
  - las bases de datos se inscriben ante la AAIP ⚠️.
- **Ley 26.529 (derechos del paciente):** confidencialidad e intimidad. La historia clínica es obligatoria, puede llevarse en soporte electrónico con garantías de integridad, y el paciente puede pedirla con entrega en 48 h ([texto](https://www.argentina.gob.ar/normativa/nacional/ley-26529-160432/texto)).
- **Proyecto 1751-D-2026:** busca modernizar la Ley 25.326, pero **no está vigente** ([leydedatospersonales.tech](https://leydedatospersonales.tech/)).
- **Qué hacer en la práctica:**
  - **Consentimiento en el chat:** expreso, con un enlace a la política. Aclarar que dar datos de salud es optativo.
  - **Qué no guardar:** síntomas detallados, diagnósticos ni estudios.
  - **Dónde alojar:** en la UE (países de la UE considerados adecuados por la AAIP ⚠️). Para proveedores en EE.UU., cláusulas contractuales modelo de la AAIP.
  - **Contrato con la clínica:** prestación de servicios de tratamiento por cuenta de terceros (art. 25 de la Ley 25.326 ⚠️), confidencialidad, destrucción de los datos al terminar y subencargados.

### 3.6 Contexto comercial

- **Uso de WhatsApp:** 90–93 %, y el 74 % interactúa con empresas ([mazkara.studio](https://mazkara.studio/en/newsletter/whatsapp-penetration-latin-america-2026/)).
- **Agendas habituales:** turnos por WhatsApp, agendas propias y Mi Agenda Profesional, que ya ofrece un bot de turnos con IA y cobro de seña ([miagendaprofesional](https://www.miagendaprofesional.com/)).
- **Competidores:** el mercado está maduro, con Cliengo, Botmaker y muchas agencias.

### 3.7 Veredicto

- **Dificultad: media–alta.** WhatsApp es el más caro de los 4 países, las comisiones de Mercado Pago rondan el 6 %, hay inflación y competencia local madura.
- **Margen esperado:** medio (73 %).
- **Orden: 4.º**

---

## 🇪🇸 4. España

### 4.1 Costos operativos

- **WhatsApp:**
  - marketing: USD 0,0707;
  - utility, autenticación y servicio: **USD 0,0200** ([setsmart](https://setsmart.io/blog/whatsapp-business-api-pricing), [gurusup](https://gurusup.com/blog/whatsapp-api-pricing)).
  - Meta puede facturar en EUR ⚠️.
- **Clínica tipo:** USD 12,40 de WhatsApp + USD 1,84 de IA = **USD 14,24/mes**.
- **Costo total mensual:**

| Clientes | Total |
|---|---|
| 1 | **USD 26,48** |
| 5 | **USD 83,42** |
| 20 | **USD 296,95** |

### 4.2 Disponibilidad de proveedores

Todos los proveedores están disponibles: Anthropic ✅ (verificado), OpenAI ✅, Gemini ✅, Meta ✅, Stripe ✅ y Hetzner ✅.

### 4.3 Cobros a clientes

- **Stripe, tarjetas del EEE:** **1,5 % + €0,25** (premium 2,8 % + €0,25) ([stripe.com/es](https://stripe.com/en-es/pricing)).
- **SEPA Direct Debit:** ≈ €0,35 por cobro según la fuente. Otra fuente indica 0,8 % + €0,30 ⚠️ ([stripe local methods](https://stripe.com/pricing/local-payment-methods)).
- **Stripe Billing:** +0,7 % para suscripciones.
- **IVA:** 21 %.
  - Si la empresa está fuera de la UE y vende B2B a una clínica española, aplica la **inversión del sujeto pasivo** ⚖️.
  - Ojo: muchos servicios sanitarios están exentos de IVA, así que la clínica no puede deducirlo. Hay que tenerlo en cuenta al fijar el precio.
- **Verifactu:** obligatorio desde el **1-ene-2027 para sociedades** y el **1-jul-2027 para autónomos**. La factura electrónica B2B se aplazó a octubre de 2027 ⚠️ ([merca2](https://www.merca2.es/2026/06/24/verifactu-2027-autonomos-facturacion-2404536/)).

### 4.4 Precio sugerido de planes

| Plan | EUR (sin IVA) | USD | Incluye | Margen |
|---|---|---|---|---|
| Esencial | **69** | 78,6 | 300 conversaciones, WhatsApp incluido | 77 % con 5 clientes; 79 % con 20 |
| Profesional | **149** + WhatsApp al costo (≈ €49) | 169,6 | 700 conversaciones, varias agendas | 94 % sobre la tarifa. Con WhatsApp incluido haría falta ≥ €193 |

**Referencias de precio:**

| Competidor | Precio | Fuente |
|---|---|---|
| Clientisima | €19 | [clientisima](https://clientisima.com/funcionalidades/chatbot/dentistas) |
| ConverPilot | €59,95 | [converpilot](https://converpilot.es/clinicasdentales/) |
| CLINIMED | desde €59 | — |
| Doctoralia | desde €80 | [Doctoralia Pro](https://pro.doctoralia.es/precios/para-clinicas) |
| Automaclinic | €397 + €99/mes | [automaclinic](https://automaclinic.es/) |
| Clinicbot (voz) | €55 | [clinicbot](https://clinicbot.es/) |

### 4.5 Marco legal de datos y salud ⚖️

- **RGPD art. 9:** los datos de salud son **categoría especial**. La base jurídica es el consentimiento explícito (9.2.a) o la asistencia sanitaria (9.2.h, junto con la LOPDGDD art. 9.2).
  - Para agendar, lo prudente es **no tratar datos de salud**: el motivo de la cita se recoge en una categoría genérica.
  - Si se trata algún dato de salud, hay que pedir consentimiento explícito.
- **RGPD art. 28:** contrato de **encargo de tratamiento** entre la clínica (responsable) y tú (encargado), con autorización de subencargados ([guía de la AEPD para el sector sanitario](https://www.aepd.es/guias/guia-profesionales-sector-sanitario.pdf), [sancantia](https://www.sancantia.com/blog/rgpd-chatbot-clinica-datos-salud)).
- **EIPD:** recomendable porque se usan nuevas tecnologías (IA) en el entorno sanitario ⚠️.
- **Transferencias a EE.UU.:** el **Data Privacy Framework** está vigente; el Tribunal General de la UE lo confirmó y la AEPD lo valoró ([4dlegal](https://4dlegal.es/transferencia-datos-ue-eeuu/)). Solo vale con proveedores certificados; en otro caso hacen falta cláusulas contractuales tipo.
- **Reglamento Europeo de IA, art. 50:** desde el **2-ago-2026** es obligatorio informar a la persona de que habla con una IA.
  - El *Digital Omnibus* (en vigor desde el 27-jul-2026) aplazó las obligaciones de alto riesgo, pero **no** el art. 50.
  - El marcado de contenido generado (50.2) tiene un periodo de gracia hasta el 2-dic-2026 para sistemas comercializados antes de agosto ([Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/), [aiactblog.nl](https://www.aiactblog.nl/en/posts/article-50-transparency-deadline-2-august-2026), [AESIA](https://aesia.digital.gob.es/es/recursos/ria-articulo-50-faqs-directrices-sobre-transparencia)).
- **Ley 41/2002 de autonomía del paciente:** regula la historia clínica ⚠️. El bot no debe actuar como historia clínica.
- **Qué hacer en la práctica:**
  - **Primer mensaje** (transparencia de IA + RGPD): "Hola, soy el asistente virtual con inteligencia artificial de [Clínica]. Puedo ayudarte a pedir, cambiar o cancelar citas e informarte de horarios y precios. No doy consejo médico. Si es una urgencia llama al 112. Tratamos tus datos según [enlace a la política]".
  - **Qué no guardar:** síntomas, diagnósticos, tratamientos, imágenes, DNI ni datos de menores sin un flujo específico.
  - **Dónde alojar:** **en la UE** (Hetzner Alemania o Finlandia). Si el LLM está en EE.UU., que el proveedor esté certificado en el DPF y tenga un DPA firmado, y aplicar retención cero cuando esté disponible ⚠️.
  - **Cláusulas del contrato:** las del art. 28 RGPD (objeto, duración, instrucciones, confidencialidad, seguridad del art. 32, subencargados, asistencia con los derechos ARSOPL, notificación de brechas, supresión o devolución, auditorías) y la responsabilidad por el art. 50 del Reglamento de IA.

### 4.6 Contexto comercial

- **Uso de WhatsApp:** 92,2 % ([mazkara.studio](https://mazkara.studio/en/newsletter/whatsapp-penetration-latin-america-2026/)).
- **Doctoralia** da servicio a más de 1.000 clínicas, con reserva online y recordatorios por WhatsApp.
- **Software de gestión habitual:** Gesden y Clinic Cloud ([cliniflux](https://cliniflux.es/blog/integracion-whatsapp-gesden-cliniccloud-doctoralia)).
- **Captación de pacientes:** Doctoralia, Google y redes sociales.
- **Competencia:** alta, con verticales dentales y de estética y asistentes de voz.

### 4.7 Veredicto

- **Dificultad: media–alta**, por el cumplimiento de RGPD, Reglamento de IA y contratos, y por la competencia.
- **Margen esperado: alto** (77 % en Esencial) y la mayor disposición a pagar.
- **Orden: 3.º**, cuando el producto y los contratos estén maduros.

---

## 5. ¿Dónde registrar el negocio? (comparativa de entidades)

| Opción | Costo inicial / anual | Qué habilita | Restricciones y riesgos | ¿Legal? |
|---|---|---|---|---|
| **Persona natural o firma personal en VE** | ~USD 0 | Gemini ✅, Meta ✅ (si tienes una tarjeta internacional), cobros en VE | Sin Anthropic, OpenAI, Stripe, Mercury ni Wise. No puedes cobrar con Wompi o Mercado Pago en CO o AR sin una entidad local | ✅ |
| **LLC en EE.UU.** (Wyoming ~USD 297 + USD 60/año; Stripe Atlas USD 500 + USD 100/año de agente + ~USD 450/año en Delaware) | USD 300–500 / 60–550 | Stripe ✅, OpenAI y Anthropic para clientes **fuera de VE** | Mercury rechaza a residentes en VE (hay que buscar un banco alternativo ⚠️). La cláusula de propiedad de Anthropic puede afectar si el dueño reside en VE ⚖️. Obligaciones fiscales de EE.UU. para LLC de extranjeros (por ejemplo, el formulario 5472) ⚖️ | ✅ con datos reales. ❌ si se falsea la residencia |
| **SAS en Colombia** | COP 1,2–3,5 M (≈ USD 360–1.050) + contador ⚠️ | Wompi y Mercado Pago ✅, banco local, todos los proveedores de IA para clientes en CO, AR y ES | Requiere representante legal y RUT en Colombia. Facturación electrónica DIAN ([snlegal](https://snlegal.co/blog/como-constituir-una-sas-en-colombia)) | ✅ |
| **Autónomo en España** | €88,64/mes los primeros 12 meses (tarifa plana de €80 + MEI) ([declarando](https://declarando.es/tarifa-plana-autonomos)) | Stripe y SEPA, todo el ecosistema de la UE | Requiere residencia y NIE. RGPD completo desde el día 1 | ✅ |

**Recomendación:**
1. **No constituir nada en la Fase 1.** Facturar los pilotos como persona natural, dentro de USD 50/mes.
2. **Al tener ≥3 clientes pagando en Colombia**, abrir una **SAS colombiana** si puedes tener residencia o un socio con representación allí. Es la opción que más habilita para el país n.º 1.
3. **Si no**, crear una LLC en Wyoming y resolver antes la banca (no Mercury).

La decisión queda abierta en `docs/decisiones/0004-entidad-legal.md`.
