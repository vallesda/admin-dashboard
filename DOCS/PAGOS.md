# Pagos (`PAG`) — plan de implementación con Stripe

> Contexto acotado `PAG` del [README](README.md). Requisitos: `RF-PAG-001…004` del [SRS](SRS.md) §3.8.
> Depende de `SAL` e `INV`; no los sustituye.
> Estado de verificación: [PAGOS-VERIFICACION.md](PAGOS-VERIFICACION.md) — el camino en
> efectivo está probado de punta a punta; **nada de lo que toca Stripe se ha ejecutado nunca**.
>
> Estado: **`F6.01`–`F6.16` implementados**, más el refactor `F6.17` (dos formas de pago,
> tarjeta como único método en línea y dirección de entrega estructurada). Lo único que falta es la verificación
> contra Stripe real, bloqueada hasta que exista cuenta de Stripe MX. Sin
> `STRIPE_SECRET_KEY` el checkout cae al camino de «pagar al recibir», que es una
> degradación deliberada y no un fallo. Ver §14.

Una nota antes de empezar: el brief pedía «buenas prácticas para nuxt». Este repositorio es
**Next.js 16 con App Router**, así que el plan está escrito para Next.js. Si el objetivo real
era Nuxt, esto no aplica y hay que hablarlo antes de escribir una línea.

---

## 1. La tesis

Hoy la pescadería cobra fuera del sistema. El pedido nace `unpaid`, alguien transfiere o paga en
mostrador, y un `admin` pulsa **Marcar pagado**. Eso funciona porque hay una persona verificando
el dinero. Cobrar en línea no elimina a esa persona: **añade un segundo camino junto al suyo.**

La tienda en producción tiene que ofrecer los dos:

- **Pagar ahora**, con tarjeta, OXXO o SPEI, y recibir o recoger ya pagado.
- **Apartar y pagar al recibir**, en el mostrador o al repartidor, como se hace hoy por teléfono.

Ninguno es el camino «de verdad» con el otro de respaldo. En México el efectivo sigue siendo la
mitad del mostrador, y una tienda de barrio que obligue a pagar por adelantado pierde clientes
reales. Pero un pedido a domicilio de $1,200 que nadie prepagó también es un riesgo real. Los dos
caminos existen porque el negocio los necesita, y el sistema tiene que tratarlos como iguales.

De ahí sale la única idea que sostiene todo el documento:

> **Cobrar es siempre lo mismo: registrar un `Payment`.** Lo único que cambia entre un pago con
> tarjeta y un billete de $500 en el mostrador es *quién* confirma que el dinero existe —Stripe
> por webhook, o una persona con rol `admin`— y eso es un campo, no un flujo aparte.

Cuatro decisiones cargan con el resto, y las argumento antes de escribir una sola tabla:

1. **Checkout Sessions alojado**, no Payment Intents, no incrustado.
2. **El pedido nace primero**, el cobro después — por los dos caminos.
3. **`orders.paymentStatus` pasa a ser una proyección** del libro de pagos, no un campo suelto.
4. **El webhook y las llaves viven en el admin.** La tienda no sabe que Stripe existe.

---

## 2. Lo que el dominio ya resuelve (y lo que no)

Vale la pena ser explícito, porque la mitad de las integraciones de Stripe que salen mal
reimplementan cosas que el dominio ya tenía.

**Ya resuelto, y no se toca:**

| Pieza | Por qué sirve tal cual |
|---|---|
| `RN-008` — el servidor calcula el total | El carrito manda ids y cantidades; el precio sale del catálogo dentro de la transacción. Un comprador que edite el payload cambia *qué* pide, nunca *cuánto* paga. Stripe recibe una cifra que ya es autoritativa. |
| `RN-002` — dinero en centavos enteros | MXN es una moneda de dos decimales, así que `totalCents` es exactamente el `unit_amount` de Stripe. **Cero conversión.** No hay redondeo que auditar. |
| `RN-006` — pago y operación son máquinas independientes | Un pedido pagado no está entregado; uno entregado no está necesariamente cobrado. Esto **no** cambia; lo que añadimos son unas pocas puertas entre ambas (§7). |
| `orders.publicToken` | Ya existe un identificador opaco para la página pública del pedido. Es el destino natural del `success_url` y el mejor candidato para `metadata`. |
| Idempotencia en las transiciones | `changeOrderStatus` devuelve sin escribir si el estado destino ya es el actual. Un webhook reentregado no vuelve a mover el pedido. |
| `createOrder` transaccional | Aparta stock y congela precios en un solo `BEGIN`. Los dos caminos de cobro lo reutilizan sin tocarlo. |
| La costura `TDA → API → dominio` | La tienda no toca la base de datos. Esto decide dónde vive Stripe (§8). |

**No resuelto, y aquí está el trabajo real:**

| Hueco | Consecuencia si se ignora |
|---|---|
| **No existe «cómo se acordó cobrar»** | El sistema no puede distinguir un pedido que espera un pago en línea de uno que se paga en el mostrador. Sin esa distinción, la regla «no prepares lo que no está pagado» no se puede escribir, porque sería falsa para la mitad de los pedidos. |
| `payment_status` solo tiene `unpaid \| paid \| refunded` | Un vale OXXO emitido y no pagado es *indistinguible* de un pedido que nadie intentó pagar. El mostrador no puede saber si esperar. |
| No existe entidad `Payment` | `paymentStatus` es un adjetivo del pedido, no un hecho con fecha, importe, método y autor. Sin eso no hay conciliación posible, ni contra Stripe ni contra la caja. |
| No existe entidad `Refund` | La API de Stripe permite **varios reembolsos parciales** sobre un mismo cargo. Un enum de tres valores no puede representar «se devolvieron $180 de $540». |
| La reserva de stock no caduca | `createOrder` aparta inventario al instante. Si el comprador abandona el Checkout o deja vencer el vale OXXO, ese kilo de camarón queda apartado **para siempre** (§10). |
| Nada impide entregar sin cobrar | `ready → completed` no mira el pago. Es el hueco más caro del panel actual. |

---

## 3. Decisión 1 — Checkout Sessions alojado

Stripe expone dos APIs para cobrar. La recomendación oficial es inequívoca: usa
**Checkout Sessions** salvo que quieras ser dueño de todo el proceso de compra y reconstruir a
mano descuentos, impuestos, direcciones y conversión de moneda.

Para esta tienda el argumento es más fuerte:

- **Nada que nos pague mañana, y la puerta abierta.** La regla no es «sólo tarjeta»: es que la
  tienda no fía contra producto perecedero. OXXO y SPEI son métodos de *notificación diferida* —la
  tienda se entera al día siguiente— y eso significa congelar un kilo de pescado tres días contra
  un vale que quizá nadie pague.

  Por eso el código **no** manda `payment_method_types`. Ese parámetro congela la lista de métodos
  en el despliegue: las carteras (Apple Pay, Google Pay, Link) que liquidan al instante y no
  cuestan nada nunca aparecerían, y cambiar cualquier cosa exigiría una release. Lo que se escribe
  en el código es la regla real, `excluded_payment_method_types: ['oxxo', 'customer_balance']`, que
  además conserva el motivo original de no dejarlo al Dashboard: encender un método allí no puede
  cambiar en silencio lo que esta tienda fía. Todo lo instantáneo lo elige Stripe dinámicamente.

  Añadir SPEI más adelante, que liquida en ~30 minutos, es quitar `customer_balance` de esa lista.
  Si algún día conviene fijar el catálogo entero de métodos desde Stripe, `payment_method_configuration`
  acepta un `pmc_…` por `STRIPE_PAYMENT_METHOD_CONFIGURATION`; hoy va sin definir.

- **Las sesiones van etiquetadas.** `integration_identifier` agrupa en el Dashboard todo lo que
  abre este checkout. Es constante a propósito: regenerarlo por petición dejaría cada pago en un
  grupo de uno.
- **PCI.** La página la sirve Stripe; el número de tarjeta nunca toca nuestro dominio ni nuestros
  logs.
- **La sesión caduca sola a las 24 h.** Ese vencimiento es justo lo que necesitamos para liberar
  la reserva de inventario. Payment Intents **no caduca**, así que tendríamos que inventar ese
  reloj nosotros.
- **Localización.** Checkout ya viene en español de México y con los métodos correctos por país.

### Por qué alojado y no incrustado

Esta parte cambió con el requisito de que **la tienda se convertirá en un sistema separado que
consume la API**. Antes era una decisión estética; ahora es arquitectónica.

Checkout incrustado (`ui_mode: 'embedded'`) obliga a la tienda a cargar Stripe.js y a tener una
clave publicable. Eso significa que el sistema separado **sabría que existe Stripe**: tendría una
dependencia de su SDK, una variable de entorno del proveedor y un despliegue acoplado a cambios
de la pasarela. El día que se cambie de proveedor —o se añada un segundo para SPEI directo— habría
que tocar dos repositorios.

Con Checkout alojado, la tienda recibe una URL y hace `redirect()`. Eso es todo. El contrato de la
API es una cadena de texto, no un SDK, y **el nombre del proveedor no aparece en ninguna parte del
sistema separado**. Cambiar de Stripe a otra cosa se vuelve un cambio en el admin y nada más.

La contra honesta: se pierde control estético. El comprador sale de `amoramar` y aterriza en una
página de Stripe con nuestro logo y colores, pero que no es nuestra. A cambio, la tienda no
mantiene un formulario de pago ni un SDK ajeno. Para este proyecto es un trato que se acepta sin
discutir.

**Decisión:** `mode: 'payment'`, `ui_mode: 'hosted_page'`, moneda `mxn`.

---

## 4. Decisión 2 — los dos caminos, y el pedido siempre primero

### 4.1 Tres combinaciones, no cuatro

Entrega y cobro son ejes distintos, pero **el efectivo sólo se cobra en el mostrador**:

| Entrega | Cobro | Cómo se llama en la tienda |
|---|---|---|
| `pickup` | `on_site` | «Pagar en efectivo al recoger» |
| `pickup` | `online` | «Pagar ahora con tarjeta» y sólo pasas por él |
| `delivery` | `online` | «Pagar ahora con tarjeta» y te lo llevamos |
| ~~`delivery`~~ | ~~`on_site`~~ | **No se ofrece.** |

El cruce que falta es deliberado y es el que se propuso vigilar en la primera versión de este
documento: pagar al repartidor es subir producto a una moto contra una promesa, y el riesgo
completo lo carga la tienda. La decisión del negocio fue no ofrecerlo.

Está prohibido en tres capas, y las tres hacen falta:

1. el formulario de la tienda **oculta** la opción al elegir domicilio —no la deshabilita: un
   control gris invita a discutir con él, y un radio deshabilitado que conserva un valor viejo es
   como un formulario acaba enviando algo que nadie eligió;
2. `createOrderSchema` y `checkoutSchema` la rechazan con un mensaje que nombra la regla;
3. el CHECK `orders_cash_is_pickup_only` la rechaza en la base, porque una Server Action es un
   endpoint POST público y ésta es la regla que tiene dinero detrás.

El formulario del admin ni siquiera pregunta: un pedido a domicilio tomado por teléfono **deriva**
a `online`, y la pantalla dice que hay que mandar la liga de pago al guardarlo. Un grupo de
opciones cuya segunda alternativa siempre es ilegal es un control que existe sólo para ser
rechazado.

### 4.2 El pedido nace primero — por los dos caminos

Hay dos secuencias posibles para el camino en línea y sólo una sobrevive a las invariantes del
repositorio.

**A) Cobrar primero, crear el pedido en el webhook.** Es lo que hacen muchos tutoriales, y es un
error aquí: significa aceptar dinero por producto que **nunca se reservó**. Entre el clic y el
webhook, el mostrador puede haber vendido el último kilo de robalo. Habríamos cobrado algo que no
existe, y `RN-003` (`reserved <= onHand`) pasa a ser una regla que se cumple a veces.

**B) Crear el pedido primero, cobrar después.** El pedido nace `pending` / `unpaid` con el stock
ya apartado, y sólo entonces se abre la sesión de cobro. Si el pago falla, teníamos apartado algo
que hay que soltar — un problema **acotado y reversible**.

La secuencia B tiene además una propiedad que sólo se ve ahora que hay dos caminos: **es la misma
secuencia que el camino en mostrador.** Apartar y luego cobrar es literalmente lo que hace el
pedido telefónico desde la fase 3. Los dos caminos comparten `createOrder` sin una sola rama, y
divergen únicamente en lo que ocurre *después*. Un flujo, dos finales, cero duplicación.

**Decisión:** B. El `POST /api/v1/checkout` que ya existe sigue creando el pedido; según el modo
de cobro, devuelve además una URL de pago.

---

## 5. Decisión 3 — captura automática, no manual

Stripe permite separar autorización y captura: retienes el importe y cobras después. Su propia
documentación lo recomienda **para negocios que reembolsan mucho cerca de la transacción**,
porque cancelar una autorización no cuesta comisión y un reembolso sí — las comisiones de
procesamiento no se devuelven.

Para una pescadería es tentador: la mercancía depende de lo que llegó del muelle, y cancelar
porque no llegó el pulpo es una posibilidad real. Y aun así, no para la v1:

- **OXXO y SPEI no se pueden retener.** Es efectivo y transferencia; no hay autorización que
  capturar. Tendríamos dos flujos de cobro en línea distintos conviviendo, sobre un modelo que ya
  tiene dos caminos de cobro. Cuatro combinaciones de estado donde el error cuesta dinero.
- **Las autorizaciones de tarjeta caducan** (típicamente ~7 días). Un reloj más que vigilar.
- **No sabemos el volumen de cancelación.** Optimizar una comisión que aún no hemos medido es
  complejidad especulativa, y contradice el principio 12 del proyecto.

**Decisión:** captura automática. Se revisa cuando exista un número real de cancelaciones
post-cobro que lo justifique. Queda como deuda anotada (§17), no como omisión.

---

## 6. Decisión 4 — `paymentStatus` se vuelve una proyección

Este es el cambio que hace que «el flujo de orders concuerde con los payments», y conviene
entender por qué no basta con seguir moviendo el enum a mano.

Hoy `orders.paymentStatus` es un campo que alguien escribe. Con dos caminos de cobro, tres
métodos en línea, reembolsos parciales y un webhook asíncrono, ese campo tendría **cinco
escritores distintos** y ninguna forma de reconstruir cómo llegó a su valor. La primera vez que
Stripe y el mostrador se contradigan, no habrá manera de saber quién tiene razón.

La solución ya está inventada **en este mismo repositorio**: es exactamente la relación entre
`inventory` e `inventory_movements`. Una proyección rápida para consultar, y un libro
append-only que la explica.

```text
payments  +  refunds        →  orders.paymentStatus
(el libro, con autor)          (la proyección, recalculada en la misma transacción)
```

Consecuencias concretas:

- **«Marcar pagado» deja de existir como tal.** Se convierte en **«Registrar cobro»**: método
  (efectivo, terminal, transferencia), importe, y el `adminUser` que lo tomó. Eso es un
  `Payment` con `provider = 'cash' | 'terminal' | 'transfer'`.
- **Un pago de Stripe y un billete de $500 son la misma fila**, con distinto `provider` y distinto
  autor: `actorId` para la persona, `null` para el webhook. La convención ya existe —`createOrder`
  recibe `actorId = null` cuando nadie de la tienda tocó el pedido.
- **`paymentStatus` nunca se escribe directamente.** Se recalcula: sin pagos exitosos → `unpaid`;
  con un intento en curso → `processing`; cobrado y sin devoluciones → `paid`; con devoluciones
  parciales → `partially_refunded`; devuelto entero → `refunded`.
- **La conciliación se vuelve posible.** «¿Cuánto entró hoy en efectivo y cuánto por Stripe?» es
  una consulta, no una tarde de trabajo.

Esto encarece un poco `F6`, y lo vale: es la diferencia entre un sistema que *dice* que un pedido
está pagado y uno que puede *demostrarlo*.

---

## 7. La concordancia entre pedido y pago

`RN-006` sigue en pie: son dos máquinas y ninguna arrastra a la otra automáticamente. Lo que
añadimos son **puertas**: momentos en que una máquina consulta a la otra antes de dejar pasar. Sin
ellas, «independientes» degenera en «desconectadas», que es lo que permite entregar sin cobrar.

### 7.1 Las cuatro puertas

| # | Regla | Por qué |
|---|---|---|
| **P1** | Un pedido `online` **no puede confirmarse a mano**. Lo confirma el pago. | Confirmar es la señal de «empieza a cortar». Hacerlo antes del cobro convierte cada carrito abandonado en pescado fileteado que nadie pidió. |
| **P2** | Un pedido `on_site` **avanza libremente sin pagar** hasta `ready`. | Es el flujo telefónico de siempre. Exigir pago para preparar rompería el negocio que ya funciona. |
| **P3** | **Ningún** pedido pasa a `completed` sin un cobro registrado. | No se entrega mercancía sin dinero. Es la regla más simple del mostrador y hoy el panel no la conoce. |
| **P4** | Cancelar un pedido con dinero cobrado **exige decidir el reembolso**. | Cancelar y quedarse el dinero sin registrarlo crea un pasivo invisible. La cancelación no se bloquea: se obliga a elegir «devolver» o «retener con nota». |

**P1 en la práctica:** el webhook llama a `changeOrderStatus(orderId, 'confirmed', null)` cuando
el pago llega a `paid`. No es una transición nueva; es la que ya existe, disparada por Stripe en
vez de por una persona. En el panel, un pedido `online` en `pending` muestra «Esperando pago»
donde iría el botón **Confirmar**, con el método y la fecha límite si es un vale OXXO.

**P3 en la práctica:** bloquear sin más sería cruel con el mostrador —obligaría a ir a otra
pantalla, registrar el cobro y volver. La acción correcta es **una sola**: en un pedido `ready`
sin pagar, el botón dice **«Cobrar y entregar»**, abre el diálogo de cobro y, al confirmarlo,
ejecuta el pago y la transición en la misma transacción. Un clic, dos hechos, cero pedidos
entregados en el aire.

Excepción explícita: `partially_refunded` también permite completar. Se entregó menos de lo
pedido y ya se devolvió la diferencia; el pedido está tan cerrado como puede estarlo.

**P4 en la práctica:** el diálogo de cancelación de un pedido cobrado ofrece dos salidas —
**«Cancelar y devolver»** (reembolso total) o **«Cancelar sin devolver»** (obliga a escribir la
razón, y esa nota queda en el pedido). Una tienda a veces retiene legítimamente: el cliente no se
presentó y el producto se echó a perder. Lo inaceptable no es retener, es hacerlo sin dejar
rastro.

### 7.2 La tabla completa

Estados operativos en filas, de pago en columnas. **✅** permitido, **⛔** bloqueado, **⚠️** permitido
con confirmación explícita.

| | `unpaid` | `processing` | `paid` | `partially_refunded` | `refunded` |
|---|:--:|:--:|:--:|:--:|:--:|
| `pending → confirmed` | ✅ `on_site` · ⛔ `online` | ⛔ | ✅ | ✅ | ⚠️ |
| `confirmed → preparing` | ✅ `on_site` · ⛔ `online` | ⛔ | ✅ | ✅ | ⚠️ |
| `preparing → ready` | ✅ `on_site` · ⛔ `online` | ⛔ | ✅ | ✅ | ⚠️ |
| `ready → completed` | ⛔ *(→ «Cobrar y entregar»)* | ⛔ | ✅ | ✅ | ⛔ |
| `* → cancelled` | ✅ | ✅ *(cancela el intent)* | ⚠️ P4 | ⚠️ P4 | ✅ |

Las tres celdas `⚠️` de la columna `refunded` son la contradicción legítima: alguien devolvió el
dinero y el pedido sigue en preparación. Casi siempre es un error humano, pero **prohibirlo sería
peor**: hay un caso real —se devolvió por cortesía y el pedido se entrega igual— y bloquearlo
dejaría al operador sin salida. Se permite, se pide confirmación y se anota.

`processing` bloquea todo avance porque un vale OXXO emitido no es dinero. Es la celda que
justifica haber añadido ese estado.

### 7.3 Dónde vive esto

En `modules/sales/state-machine.ts`, junto a `canTransition`, como función pura:

```ts
export function canTransitionWithPayment(
  from: OrderStatus,
  to: OrderStatus,
  payment: { status: PaymentStatus; mode: PaymentMode },
): { allowed: boolean; requiresConfirmation?: boolean; reason?: string }
```

Pura, sin base de datos ni sesión, por la razón que ese archivo ya declara en su cabecera: *«una
UI que ofrece una transición que el servicio va a rechazar es una UI que miente.»* Los botones del
pedido leen la misma función que el servicio aplica. Un solo lugar donde equivocarse.

---

## 8. La frontera: la tienda como sistema separado

La tienda va a dejar de vivir en este repositorio. Todo lo anterior tiene que sobrevivir a esa
mudanza, y eso impone reglas duras.

### 8.1 Qué sabe cada lado

```text
┌─ TIENDA (sistema separado) ─────────┐      ┌─ ADMIN (dominio + Stripe) ──────────┐
│ conoce: /api/v1/*, su token         │      │ conoce: catálogo, inventario,       │
│         y una URL a la que redirigir│─────►│  pedidos, pagos, STRIPE_SECRET_KEY  │
│                                     │      │                                      │
│ NO conoce: Stripe, su SDK, sus      │      │ único consumidor de webhooks        │
│  llaves, ni el nombre del proveedor │      │  de Stripe                          │
└─────────────────────────────────────┘      └──────────────────────────────────────┘
                                                        ▲
                                              Stripe ───┘  POST /api/webhooks/stripe
```

La palabra «stripe» no debe aparecer en el código de la tienda. Ni en un tipo, ni en un nombre de
campo, ni en una variable de entorno. Si aparece, la mudanza ya falló.

Por eso el contrato usa `checkoutUrl`, no `stripeCheckoutUrl`; y `paymentMode`, no
`stripePaymentMethod`. Nombres del negocio, no del proveedor.

### 8.2 El contrato

**`POST /api/v1/checkout`** — un endpoint, dos respuestas discriminadas por `paymentMode`:

```jsonc
// petición
{
  "customer":       { "name": "…", "phone": "…", "email": "…" },
  "fulfillmentType": "pickup" | "delivery",
  "deliveryAddress": "…",
  "paymentMode":     "online" | "on_site",   // ← nuevo
  "notes":           "…",
  "lines":          [{ "productId": "uuid", "quantity": 2 }],
  "returnUrls":     {                         // ← nuevo, sólo si online
    "success": "https://tienda.mx/pedido/{TOKEN}",
    "cancel":  "https://tienda.mx/checkout?cancelado=1"
  }
}
```

```jsonc
// respuesta — online
{ "orderNumber": 1043, "token": "…", "paymentMode": "online",
  "payment": { "status": "pending", "checkoutUrl": "https://…", "expiresAt": "…" } }

// respuesta — on_site
{ "orderNumber": 1043, "token": "…", "paymentMode": "on_site",
  "payment": { "status": "on_delivery", "instructions": "Paga al recoger, en efectivo o con tarjeta." } }
```

La tienda hace `if (res.paymentMode === 'online') redirect(res.payment.checkoutUrl)`. No inspecciona
la URL, no la construye, no sabe a dónde apunta.

**Las URLs de retorno las manda la tienda, y el admin las valida contra una lista blanca de
orígenes.** Es el punto sutil: un sistema separado no puede tener su dominio incrustado en el
admin —dejaría de ser separado—, pero aceptar cualquier URL sería un *open redirect* con la
marca de la tienda encima. La lista blanca (`STOREFRONT_ALLOWED_ORIGINS`) resuelve las dos cosas:
la tienda decide su ruta, el admin decide su dominio.

**`GET /api/v1/orders/[token]`** crece para que la página del pedido pueda contar la verdad sin
saber de Stripe:

```jsonc
{
  "orderNumber": 1043, "status": "confirmed",
  "paymentMode": "online",
  "payment": {
    "status": "processing",
    "methodLabel": "OXXO",                    // texto listo para mostrar
    "amountPaidCents": 0,
    "amountRefundedCents": 0,
    "actionUrl": "https://…",                 // el vale, si lo hay
    "expiresAt": "2026-09-02T05:59:00Z"
  },
  "instructions": "Presenta este vale en cualquier OXXO antes del 1 de septiembre."
}
```

`methodLabel` e `instructions` van **redactados desde el admin**. La alternativa —mandar
`payment_method_type: "oxxo"` y que la tienda tenga un diccionario— es exactamente la fuga de
conocimiento del proveedor que estamos evitando. El día que se añada un método nuevo, la tienda no
se entera.

### 8.3 Dónde vive Stripe

```text
POST  /api/webhooks/stripe   ← admin. Único consumidor de eventos.
POST  /api/v1/checkout       ← admin. Crea Order y, si toca, abre la sesión de cobro.
      tienda/pedido/[token]  ← TDA. Página de retorno. Lee, no escribe.
```

Tres consecuencias operativas:

1. **La ruta del webhook no lleva token de servicio.** Su autenticación es la firma
   `Stripe-Signature`, más fuerte que un bearer compartido. Pedirle a Stripe una credencial que
   Stripe no tiene sería garantizar que nunca entre un evento.
2. **Hoy no hay `middleware.ts`.** Cuando se agregue —y se agregará— `/api/webhooks/*` tiene que
   quedar fuera del matcher. El callback `authorized` actual redirige a `/dashboard` cualquier
   petición fuera de `/dashboard`; aplicado a una ruta de API, convierte un evento de Stripe en un
   307 y el pago se pierde en silencio.
3. **`export const runtime = 'nodejs'`** en la ruta del webhook: la verificación de firma necesita
   el cuerpo crudo y el SDK de Node.

### 8.4 Lo que la mudanza deja pendiente

Cuando la tienda sea otro despliegue, no podrá enterarse por sí sola de que un vale OXXO se pagó
—el evento llega al admin. Si hace falta que la tienda reaccione (mandar un correo propio,
invalidar una caché), el admin tendrá que **emitir sus propios webhooks salientes**. No es parte
de `F6`; queda anotado (§17) para no descubrirlo el día de la separación.

---

## 9. Modelo de datos

### 9.1 `orders` — cómo se acordó cobrar

```ts
export const paymentModeEnum = pgEnum('payment_mode', ['online', 'on_site']);

// en orders:
paymentMode: paymentModeEnum('payment_mode').notNull().default('on_site'),
```

`on_site` por defecto, y no es arbitrario: **es lo que son todos los pedidos que ya existen.** Los
telefónicos se pagan en mostrador; el default hace que la migración no tenga que adivinar nada ni
reescribir historia.

Es un campo del pedido, no del pago, porque describe **el acuerdo**, no el hecho. Y es mutable por
un `admin`: un cliente que apartó por teléfono puede pedir una liga para pagar en línea (§11.3).
Cambiarlo re-evalúa las puertas de §7, lo cual es correcto — cambió el acuerdo.

### 9.2 Ampliar `payment_status`

```ts
export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid',
  'processing',          // nuevo: vale OXXO emitido / SPEI en camino
  'paid',
  'partially_refunded',  // nuevo: hubo devolución, no completa
  'refunded',
]);
```

`processing` no es cosmético: es la diferencia entre «este señor no ha pagado» y «este señor ya
tiene su vale y OXXO nos avisa en un día hábil». Sin ese estado, el mostrador acabará preguntando
por WhatsApp —el trabajo manual que veníamos a eliminar— y la puerta P1 de §7 no se podría escribir.

`partially_refunded` existe porque la API de Refunds admite varios reembolsos parciales sobre un
mismo cargo. Un pedido de $540 al que se devolvieron $180 no es `paid` ni es `refunded`.

La máquina queda:

```text
unpaid ──► processing ──► paid ──► partially_refunded ──► refunded
   │            │                        │
   └────────────┴──► unpaid              └──► refunded
        (vale vencido / pago fallido)
```

`processing → unpaid` es nuevo y correcto: un vale vencido devuelve el pedido a «no pagado», que
es la verdad. `refunded` sigue siendo terminal — devolver es un hecho ocurrido, y «des-reembolsar»
sería borrar historia en vez de corregirla. Volver a cobrar es un `Payment` nuevo.

> **Nota de migración:** `ALTER TYPE ... ADD VALUE` no corre dentro de una transacción en
> PostgreSQL. Drizzle lo emite con `--> statement-breakpoint`; hay que revisar el SQL generado
> antes de aplicarlo, no confiar en el `generate`.

### 9.3 `payments` — el libro, no el adjetivo

```ts
export const paymentProviderEnum = pgEnum('payment_provider', [
  'stripe',    // en línea
  'cash',      // efectivo en mostrador o al repartidor
  'terminal',  // terminal física de la tienda
  'transfer',  // transferencia SPEI directa a la cuenta, verificada a mano
]);

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),

  provider: paymentProviderEnum('provider').notNull(),
  status: paymentAttemptEnum('status').notNull(),  // created|processing|succeeded|failed|expired|canceled
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('mxn'),

  // Sólo para provider='stripe'. Únicos: son la llave de idempotencia natural.
  stripeSessionId: varchar('stripe_session_id', { length: 255 }).unique(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).unique(),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  paymentMethodType: varchar('payment_method_type', { length: 64 }),  // 'card' | 'oxxo' | …
  hostedVoucherUrl: text('hosted_voucher_url'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),

  // Quién registró el cobro. NULL = lo confirmó el proveedor, no una persona.
  actorId: uuid('actor_id').references(() => adminUsers.id, { onDelete: 'restrict' }),
  note: text('note'),
  failureReason: text('failure_reason'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
}, (t) => [
  check('payments_amount_positive', sql`${t.amount_cents} > 0`),
  // Un pago en efectivo tiene autor; uno de Stripe no lo necesita.
  check('payments_manual_has_actor',
    sql`${t.provider} = 'stripe' OR ${t.actorId} IS NOT NULL`),
]);
```

Ese último `CHECK` es la regla de §1 escrita en el esquema: **todo cobro tiene un responsable, sea
una persona o un proveedor**, y nunca ninguno de los dos.

Por qué una tabla y no tres columnas en `orders`:

- **Un pedido puede tener varios intentos.** El vale venció y el cliente pidió otro; o pagó $300 en
  efectivo y $240 con terminal. Todos son hechos; sólo algunos terminaron en dinero.
- **La conciliación necesita importe, método y autor.** «¿Cuánto entró hoy en efectivo?» tiene que
  ser una consulta.
- **`currency` aquí sí**, aunque MODELO-DATOS diga que no hace falta columna de moneda. La regla es
  correcta para el catálogo: el precio de un producto es MXN y punto. Un `Payment` es el registro de
  lo que un tercero movió, y ese tercero **sí** reporta moneda. No guardarla es tirar información
  que Stripe nos está dando gratis.

### 9.4 `refunds` — append-only, con autor

```ts
export const refunds = pgTable('refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'restrict' }),
  orderId:   uuid('order_id').notNull().references(() => orders.id,     { onDelete: 'restrict' }),

  amountCents: integer('amount_cents').notNull(),
  reason: varchar('reason', { length: 64 }),   // requested_by_customer | duplicate | fraudulent | other
  note: text('note'),
  status: refundStatusEnum('status').notNull(),  // pending|requires_action|succeeded|failed|canceled

  stripeRefundId: varchar('stripe_refund_id', { length: 255 }).unique(),  // NULL si fue en efectivo
  failureReason: text('failure_reason'),

  actorId: uuid('actor_id').references(() => adminUsers.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('refunds_amount_positive', sql`${t.amountCents} > 0`),
]);
```

`stripeRefundId` es nullable a propósito: **devolver efectivo también es un reembolso.** Si el
cliente pagó en el mostrador y se le devuelven $180 en billetes, eso es una fila aquí con
`provider` del pago original en `cash` y sin id de Stripe. El libro es el mismo para los dos
caminos; sólo cambia quién movió el dinero.

Deliberadamente **no** se toca `orders.totalCents` al reembolsar. El check `orders_total_is_sum`
existe para que el total sea aritmética y no opinión; un reembolso no cambia lo que se vendió,
cambia lo que se cobró.

### 9.5 `stripe_events` — idempotencia de verdad

```ts
export const stripeEvents = pgTable('stripe_events', {
  id: varchar('id', { length: 255 }).primaryKey(),   // evt_...
  type: varchar('type', { length: 128 }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});
```

Stripe documenta que un endpoint puede recibir el mismo evento más de una vez y que **no hay
garantía de orden**; recomienda registrar los `event.id` procesados. Un
`INSERT ... ON CONFLICT DO NOTHING` que no afecta filas significa «ya se procesó: responde 200 y no
hagas nada». Es una línea de SQL y es la diferencia entre confirmar un pedido una vez o tres.

Sobre el orden: nunca usar `created` para deducir secuencia. Si `checkout.session.completed` llega
después de `async_payment_succeeded`, el manejador debe **releer el objeto desde la API** y decidir
con el estado actual, no con el que traía el evento.

---

## 10. El problema que de verdad puede doler: la reserva colgada

Merece sección propia porque es donde este plan se gana el sueldo — y porque los dos caminos de
cobro **no se tratan igual**.

`createOrder` aparta stock en la misma transacción en que nace el pedido. Correcto para un pedido
telefónico: alguien lo tomó, alguien responde por él. Para uno en línea, no:

- el comprador abre Checkout y cierra la pestaña → sesión abandonada;
- elige OXXO y nunca va a pagar → hasta **7 días** de vale vivo;
- el vale vence → Stripe avisa, pero si nadie escucha, el camarón sigue apartado.

Sin caducidad, `reserved` sólo crece. En una semana la tienda muestra «agotado» con la cámara
llena, y `RN-003` se cumple contra un número que ya no significa nada.

**El diseño, y la distinción que importa:**

| Modo | Situación | Señal | Acción |
|---|---|---|---|
| `online` | Sesión abandonada | `checkout.session.expired` (~24 h) | `changeOrderStatus(…, 'cancelled')` → libera stock |
| `online` | Vale OXXO vencido | `checkout.session.async_payment_failed` | igual, y `payment.status = 'expired'` |
| `online` | No llegó ningún evento | barrido diario | cancela los `online` sin cobro cuya sesión ya expiró |
| `on_site` | Nadie vino a recoger | **ninguna** | **No se cancela solo.** Aparece en una lista «Apartados hace más de N horas» para que una persona decida. |

Esa última fila es una decisión, no un olvido:

> **La cancelación automática sólo es legítima cuando la contraparte es una máquina.** Una sesión
> de Stripe expirada es un hecho verificable. Una persona que dijo «paso en la tarde» hizo una
> promesa a otra persona, y sólo una persona debería romperla.

Cancelar solo un pedido `on_site` significaría que un cliente que llegó una hora tarde encuentra
su pedido deshecho y su producto vendido. Ese cliente no vuelve. La lista de apartados viejos le da
al mostrador la información sin quitarle la decisión.

El barrido existe **además** del webhook, no en su lugar. Stripe reintenta la entrega durante tres
días con backoff exponencial, pero si el endpoint estuvo caído más que eso, el evento se pierde. Un
job diario es el único mecanismo que no depende de que la red se portara bien.

Y una propiedad valiosa: `changeOrderStatus(…, 'cancelled')` **ya existe, ya es transaccional y ya
libera reservas**. La caducidad no inventa una operación nueva; reutiliza la que el mostrador usa
para cancelar a mano.

---

## 11. Los flujos, de punta a punta

### 11.1 En línea con tarjeta

```text
Carrito → checkout (paymentMode: 'online')
  → POST /api/v1/checkout (admin)
      1. createOrder(…)  → Order pending/unpaid, paymentMode='online', stock reservado  [transacción]
      2. stripe.checkout.sessions.create({
           mode: 'payment',
           line_items: [ … price_data.currency='mxn', unit_amount=lineTotalCents … ],
           client_reference_id: order.id,
           metadata: { orderId, orderNumber, publicToken },
           success_url: `${returnUrls.success}?session_id={CHECKOUT_SESSION_ID}`,
           cancel_url:  returnUrls.cancel,
         }, { idempotencyKey: `order:${order.id}` })
      3. INSERT payments (provider 'stripe', status 'created', actorId NULL)
      4. → { paymentMode: 'online', payment: { checkoutUrl } }
  → la tienda hace redirect(checkoutUrl)

Stripe cobra
  ├─ webhook  checkout.session.completed   → fulfill(sessionId)   ← la verdad
  └─ retorno  /pedido/[token]?session_id=… → fulfill(sessionId)   ← la prisa
```

Las dos flechas finales llaman **a la misma función**, y esa función es idempotente. Es
literalmente lo que Stripe recomienda: el webhook es obligatorio porque nadie garantiza que el
comprador llegue a la página de retorno —puede pagar y perder la conexión— y la página de retorno
se añade porque los webhooks a veces tardan y el comprador está mirando la pantalla *ahora*.

`fulfillCheckout(sessionId)` hace, en este orden:

1. recupera la sesión desde la API con `expand: ['line_items', 'payment_intent']`;
2. si `payment_status === 'unpaid'`, no hace nada (vale emitido, aún sin dinero);
3. si no, **en una transacción**: actualiza `payments`, recalcula `orders.paymentStatus`, aplica
   **P1** (`pending → confirmed`) y sella `processedAt` en `stripe_events`.

Nunca confía en el cuerpo del evento para decidir. Relee.

### 11.2 En línea con OXXO (diferido)

```text
… misma sesión, con payment_method_options.oxxo.expires_after_days = 3

checkout.session.completed          → NO es un cobro. Es un vale.
                                      payments.status='processing' + hosted_voucher_url
                                      orders.paymentStatus='processing'
                                      → la página del pedido muestra el vale y la fecha límite
                                      → el pedido NO avanza (puerta P1 / celda `processing`)

checkout.session.async_payment_succeeded  → 'paid' → confirma el pedido
checkout.session.async_payment_failed     → vencido → cancela y libera stock
```

Tres cosas que salen de la documentación y hay que decirle al negocio:

- El vale vive **5 días** por defecto; se puede fijar de 1 a 7 con `expires_after_days`. Vence a las
  23:59 hora de Ciudad de México. **Recomiendo 3**: suficiente para pasar al OXXO, poco para
  congelar producto perecedero una semana.
- La confirmación llega **hasta un día hábil después** de que el cliente pagó. No es un fallo; es
  cómo liquida OXXO.
- Stripe puede enviar por correo las instrucciones con el número y el enlace al vale. Se activa en
  el Dashboard y ahorra la conversación de «perdí mi ficha».

Y una consecuencia que no es técnica: **si el vale vence, el pedido se cancela y el producto vuelve
a la venta.** Eso va en Preguntas Frecuentes *antes* de encender el método, no después del primer
reclamo.

### 11.3 En mostrador (`on_site`)

```text
Carrito → checkout (paymentMode: 'on_site')
  → POST /api/v1/checkout
      1. createOrder(…) → Order pending/unpaid, paymentMode='on_site'   [transacción]
      2. NO se crea sesión de cobro. NO se llama a Stripe.
      3. → { paymentMode: 'on_site', payment: { instructions: 'Paga al recoger…' } }
  → la tienda muestra la confirmación con el número de pedido

El mostrador:
  Confirmar → Preparar → Marcar listo          (puerta P2: avanza sin pagar)
  «Cobrar y entregar»  → diálogo: método, importe, nota
                       → [transacción] INSERT payments(provider='cash', actorId=quien cobró)
                                       recalcula paymentStatus → 'paid'
                                       changeOrderStatus(…, 'completed') → movimiento de venta
```

Nótese que este camino **no toca Stripe en ningún punto**, y aun así produce exactamente las mismas
filas en `payments`. Esa simetría es lo que permite que los reportes, la conciliación y la página
del pedido no tengan una sola rama por método de cobro.

### 11.4 El puente: liga de pago para un pedido apartado

El caso que une los dos caminos y que el negocio va a pedir en la primera semana: un pedido
telefónico de $1,400 a domicilio que la tienda no quiere mandar sin cobrar.

```text
Pedido on_site → botón «Enviar liga de pago» (rol admin)
  → cambia paymentMode a 'online'
  → crea la sesión de cobro con el mismo servicio de §11.1
  → devuelve una URL corta para mandar por WhatsApp
  → a partir de aquí es el flujo 11.1: el webhook confirma y el pedido avanza
```

Cero código nuevo de pagos: es `createCheckoutSession(orderId)` invocado desde el admin en vez de
desde la tienda. Es la prueba de que la abstracción está bien puesta — si esto hubiera necesitado
un segundo servicio, el modelo estaría mal.

### 11.5 SPEI

Misma mecánica de método diferido (`customer_balance`, transferencia bancaria MXN). Stripe liquida
vía Citibanamex y confirma la mayoría de los pagos **en unos 30 minutos en día hábil**, lo que lo
vuelve mucho más apetecible que OXXO para producto fresco. Se activa desde el Dashboard, sin código
adicional.

---

## 12. Devoluciones

`RF-PAG-004` pide registrar el reembolso **sin alterar el estado operativo** del pedido. `RN-006` ya
lo garantiza; aquí sólo hay que no romperlo, y cubrir los dos caminos.

### 12.1 La operación

```ts
export async function refundOrder(
  orderId: string,
  input: { amountCents: number | 'full'; reason: RefundReason; note?: string },
  actorId: string,
): Promise<RefundRow>
```

1. Localiza el `payment` con `status = 'succeeded'`. Si no hay ninguno, `ConflictError`:
   *«Este pedido no registra ningún cobro. No hay nada que devolver.»*
2. Suma los reembolsos previos `succeeded`/`pending`. Si el nuevo importe pasa del cobrado, se
   rechaza **antes** de llamar a Stripe — un mensaje nuestro es más útil que un 400 ajeno.
3. **Bifurca según el proveedor**, y es la única bifurcación de todo el módulo:
   - `stripe` → llama a la API con clave de idempotencia;
   - `cash` / `terminal` / `transfer` → **no hay API que llamar**. Se registra la fila con
     `status='succeeded'` y `stripeRefundId = NULL`; el dinero lo entrega una persona. El diálogo
     lo dice con todas sus letras: *«Devuelve $180 en efectivo al cliente y confirma aquí.»*
4. Inserta en `refunds` y recalcula `paymentStatus`: `partially_refunded` si queda saldo,
   `refunded` si no.

```ts
stripe.refunds.create(
  { payment_intent: payment.stripePaymentIntentId, amount, reason, metadata: { orderId, actorId } },
  { idempotencyKey: `refund:${orderId}:${amount}:${nonce}` },
);
```

Stripe guarda el resultado de la primera petición por clave durante 24 h y devuelve exactamente eso
en los reintentos, incluidos los 500. Es lo que impide que un doble clic devuelva el dinero dos
veces.

**El reembolso parcial es el caso normal, no el raro.** Llegaron 2 kg de callo y sólo había 1.5; se
entrega lo que hay y se devuelve la diferencia. Un botón que sólo sepa «devolver todo» obliga a
cancelar el pedido entero, y eso sí destruye historia.

### 12.2 Lo que la UI tiene que decir

Cuatro verdades incómodas, **antes** de pulsar, y sólo para pagos de Stripe:

1. **Las comisiones no se devuelven.** Reembolsar $540 le cuesta a la tienda el importe más lo que
   ya pagó por procesarlo. Va en el diálogo de confirmación.
2. **El dinero vuelve al método original, siempre.** No se puede redirigir a otra tarjeta ni a otra
   cuenta. Si el cliente pide otro destino, la respuesta es no.
3. **Tarda de 5 a 10 días hábiles** en aparecer en su estado de cuenta. Si se hace poco después del
   cargo puede aparecer como *anulación*: el cargo original desaparece del extracto y no hay abono
   separado. Ambas cosas generan la llamada «no me llegó nada».
4. **Un reembolso puede fallar.** Tarjeta cancelada, cuenta cerrada, saldo insuficiente en Stripe.
   Llega `refund.failed` y el dinero vuelve al saldo de la tienda. Un reembolso `failed` es un
   pendiente humano y tiene que verse rojo en el pedido, no enterrado en un log.

### 12.3 Eventos

| Evento | Qué hacemos |
|---|---|
| `refund.created` | Alta o confirmación de la fila. Stripe recomienda escuchar este como mínimo. |
| `refund.updated` | Actualiza estado y guarda la referencia (ARN/STAN) cuando llega — el número que el cliente lleva a su banco. |
| `refund.failed` | `status='failed'`, revierte `paymentStatus` y **alerta**. |
| `charge.refunded` | Confirmación del lado del cargo. Útil para conciliar; no es la fuente primaria. |

Un reembolso hecho desde el **Dashboard de Stripe** —porque el dueño entró desde el celular— llega
por los mismos eventos. Si el manejador sólo reacciona a lo que originamos nosotros, el panel y
Stripe divergen en silencio. Debe crear la fila si no existe, con `actorId = null` y una nota de que
se hizo fuera del panel.

### 12.4 Cancelar no es reembolsar

Si el `PaymentIntent` no se completó —`requires_payment_method`, `requires_action`, `processing`—
**no se reembolsa: se cancela**, y no cuesta comisión. Es exactamente el caso del vale OXXO emitido
y no pagado. El servicio elige la rama por el estado del intent; no ofrece «Reembolsar» sobre algo
que nadie pagó.

---

## 13. Seguridad

| Riesgo | Control |
|---|---|
| Webhook falsificado | `stripe.webhooks.constructEvent(rawBody, sig, secret)`. **Cuerpo crudo**: `await request.text()`, nunca `request.json()` antes. Cualquier manipulación invalida la firma. |
| Replay | La firma incluye timestamp con tolerancia de 5 min. Exige reloj sincronizado por NTP. |
| Evento duplicado | `stripe_events` con PK sobre `evt_...`. |
| **Open redirect** en `returnUrls` | Lista blanca `STOREFRONT_ALLOWED_ORIGINS`. Una URL de retorno de origen desconocido es un 400, no un `success_url`. |
| Clave secreta filtrada | `STRIPE_SECRET_KEY` sólo en el admin. La tienda no ve ninguna llave de Stripe, ni siquiera la publicable (§3). |
| Total manipulado | `RN-008`: el importe sale de `orders.totalCents`, calculado en servidor. |
| **Cobro fantasma** | El endpoint de «Registrar cobro» exige rol `admin` (matriz del SRS §4). Un `staff` puede preparar y entregar, no declarar que entró dinero. |
| Enumeración de pedidos | `publicToken` opaco, ya existente. |
| Timeout del endpoint | Responder `2xx` **antes** de la lógica pesada. Con `success_url` configurado, Checkout espera hasta 10 s a nuestro webhook antes de redirigir: un manejador lento se ve como una tienda lenta. |

Variables de entorno nuevas (admin):

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STOREFRONT_ALLOWED_ORIGINS=https://amoramar.mx,https://staging.amoramar.mx
```

La versión de API se fija explícitamente al construir el cliente. Una versión flotante significa que
Stripe puede cambiar la forma de un objeto un martes y romper la conciliación sin que nadie haya
desplegado nada.

---

## 14. Fase 6 — desglose

Siguiendo la numeración de [PLAN.md](PLAN.md). Cada feature cierra con la
[Definition of Done](PLAN.md#10-definition-of-done) del proyecto.

| Feature | Contenido | Requisito |
|---|---|---|
| ✅ `F6.01` | `payment_mode` en `orders`; `paymentMode` en checkout, API y UI de la tienda | — |
| ✅ `F6.02` | Migración: `payment_status` ampliado, `payments`, `refunds`, `stripe_events` | `RF-PAG-001` |
| ✅ `F6.03` | `modules/payments/service`: registrar cobro manual; `paymentStatus` como proyección | `RF-PAG-003` |
| ✅ `F6.04` | Puertas P1–P4 en `state-machine.ts` + botones del pedido que las respetan | `RN-006` |
| ✅ `F6.05` | «Cobrar y entregar» — cobro y transición en una transacción | `RF-SAL-011` |
| ✅ `F6.06` | `lib/stripe.ts` (cliente, versión fija), variables de entorno, sandbox | — |
| ✅ `F6.07` | Crear sesión de cobro; `POST /api/v1/checkout` devuelve `checkoutUrl`; lista blanca de retorno | `RF-PAG-001` |
| ✅ `F6.08` | `POST /api/webhooks/stripe`: firma, dedup, despacho | `RF-PAG-002` |
| ✅ `F6.09` | `completed` / `async_payment_succeeded` → cobro + confirmación automática | `RF-PAG-003` |
| ✅ `F6.10` | `GET /api/v1/orders/[token]` con bloque `payment` redactado; página de retorno y vale | — |
| ✅ `F6.11` | Caducidad `online`: `expired` / `async_payment_failed` → cancela y libera stock | `RN-003` |
| ✅ `F6.12` | Barrido de sesiones vencidas + lista «apartados hace más de N horas» para `on_site` | `RN-003` |
| ✅ `F6.13` | Reembolsos: servicio con las dos ramas, acción, UI, `<Can role="admin">` | `RF-PAG-004` |
| ✅ `F6.14` | `refund.*` en el webhook, incluidos los originados en el Dashboard | `RF-PAG-004` |
| ✅ `F6.15` | «Enviar liga de pago» para pedidos `on_site` | — |
| ✅ `F6.17` | Sólo dos formas de pago; tarjeta como único método; dirección en campos | `RN-011` |
| ✅ `F6.16` | Pruebas de dominio y de webhook (empieza a saldar `DT-008`) | — |

**Criterio de salida**

```text
un comprador paga con tarjeta        → el pedido se confirma solo, sin que nadie lo toque
un comprador paga en OXXO            → queda «cobrando», no avanza, y se paga solo al día hábil
un comprador aparta y paga al recoger→ avanza sin pagar y no se puede entregar sin cobrar
un comprador abandona el checkout    → el stock vuelve a la venta en 24 h
un pedido apartado se queda sin venir→ NO se cancela solo; aparece en la lista del mostrador
un admin devuelve $180 de $540       → parcialmente reembolsado, con autor y fecha
un admin devuelve efectivo           → misma fila en el libro, sin llamar a Stripe
el mismo evento llega tres veces     → el pedido cambia una sola vez
```

**Por qué este orden.** `F6.01`–`F6.05` **no tocan Stripe** y ya arreglan el panel actual: modo de
cobro, libro de pagos, puertas, y el hueco de entregar sin cobrar. Eso se puede desplegar solo y
mejora la tienda de hoy. `F6.06`–`F6.10` añaden el cobro en línea. `F6.11`–`F6.12` son lo que evita
que ese cobro se coma el inventario. `F6.13`–`F6.15` cierran devoluciones y el puente.

Se puede desplegar tras `F6.05` y tras `F6.12`. **No** se debe desplegar tras `F6.10`: una tienda
que aparta producto y nunca lo suelta está peor que la de hoy.

---

## 15. Cómo se prueba

`DT-008` sigue abierto: no hay tests ni CI. Encender pagos sin cerrar esa deuda al menos
parcialmente sería la decisión más cara del proyecto — un bug silencioso en catálogo cuesta una foto
mal puesta; uno en pagos cuesta dinero de alguien.

**Local, con la CLI de Stripe:**

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # imprime el whsec_ de pruebas
stripe trigger checkout.session.completed
stripe trigger charge.refunded
```

**Matriz mínima.** OXXO en modo prueba se controla con el correo del comprador, lo que permite
guionizar el flujo completo sin esperar a nadie:

| Escenario | Cómo se provoca |
|---|---|
| Tarjeta aprobada | `4242 4242 4242 4242` |
| OXXO pagado a los 3 min | correo `cualquiera@test.com` |
| OXXO pagado al instante | `succeed_immediately@test.com` |
| OXXO vencido al instante | `expire_immediately@test.com` |
| OXXO nunca pagado | `fill_never@test.com` |
| Evento duplicado | reenviar el mismo `evt_` desde el Dashboard |
| Evento fuera de orden | disparar `async_payment_succeeded` antes que `completed` |
| Reembolso parcial y luego total | dos llamadas al servicio |
| Firma inválida | `curl` con `Stripe-Signature` basura → 400 |
| **Puerta P1** | intentar confirmar a mano un `online` sin pagar → rechazado |
| **Puerta P3** | intentar completar un `on_site` sin cobro → rechazado, ofrece «Cobrar y entregar» |
| **Puerta P4** | cancelar un pedido pagado → obliga a elegir devolver o retener con nota |
| **Reembolso en efectivo** | pedido `cash` → fila en `refunds` sin `stripeRefundId`, sin llamada a Stripe |

Las cuatro últimas son las que no se prueban solas y las que rompen en producción.

---

## 16. Riesgos abiertos y preguntas para el negocio

Cosas que **no** puedo decidir yo y bloquean partes del plan:

1. **¿Cuenta de Stripe México activa?** Cobrar en MXN con OXXO exige entidad mexicana verificada.
   Sin eso, `F6.06` en adelante es teoría.
3. **IVA.** En México buena parte del alimento no procesado va a tasa 0%, pero congelados y
   preparados pueden clasificarse distinto. Lo dice el contador, no yo, y determina si hace falta
   Stripe Tax. **No implemento nada de impuestos hasta tener esa respuesta.**
4. **¿Cuándo encender SPEI?** Liquida en ~30 minutos en día hábil, así que es el candidato
   razonable a segundo método. OXXO (hasta 7 días de vale) queda descartado mientras el producto
   sea fresco.
5. **¿Cuántas horas antes de que un apartado `on_site` entre en la lista de revisión?** Propongo 24,
   o el cierre del día de recolección si es antes.
6. **Política de devoluciones escrita.** El código puede devolver cualquier importe; *cuándo* se
   devuelve es una política que hoy no existe. Sin ella, cada reembolso será una decisión
   improvisada y desigual.
7. **Costo de envío.** `deliveryFeeCents` existe y hoy siempre vale 0; la tienda no puede inventar
   una tarifa. Mientras siga así, se cobrará sólo mercancía. Si va a haber envío cobrado, entra
   **antes** que los pagos, no después.
8. **Comisiones.** Las tarifas vigentes están en la página de precios de Stripe México y cambian; hay
   que mirarlas al firmar, no citarlas de memoria. Lo que sí es seguro y afecta al diseño: **no se
   devuelven al reembolsar.**

---

## 17. Deuda que este plan crea a propósito

| ID propuesto | Deuda | Por qué se acepta |
|---|---|---|
| `DT-014` | Sin captura manual: cada cancelación post-cobro paga comisión | No hay volumen medido que lo justifique (§5) |
| `DT-015` | Sin manejo de disputas (`charge.dispute.*`) | Volumen esperado ~0; se atiende desde el Dashboard hasta que aparezca la primera |
| `DT-016` | Un pedido = una sesión de cobro; no hay «reintentar pago» en la tienda | El mostrador ya puede reenviar la liga (§11.4). Se automatiza cuando la frecuencia lo pida |
| `DT-017` | Sin recibo fiscal (CFDI) | Proyecto propio, no parte de Stripe |
| `DT-018` | El admin no emite webhooks salientes hacia la tienda separada | Con Checkout alojado la tienda no necesita reaccionar todavía; será necesario si algún día manda sus propios correos (§8.4) |
| `DT-019` | Pagos mixtos (parte efectivo, parte tarjeta) se modelan pero no tienen UI | El esquema los soporta con varias filas en `payments`; la pantalla se hace cuando ocurra el primero |

---

## 18. Referencias

- [Comparación Checkout Sessions vs Payment Intents](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison)
- [Completar pedidos con Checkout](https://docs.stripe.com/checkout/fulfillment) — webhook + página de retorno
- [Recibir eventos de webhook](https://docs.stripe.com/webhooks) — firma, duplicados, orden, reintentos
- [Reembolsar y cancelar pagos](https://docs.stripe.com/refunds) — parciales, fallidos, `requires_action`, anulaciones
- [Aceptar pagos con OXXO](https://docs.stripe.com/payments/oxxo/accept-a-payment) — vigencia, eventos, correos de prueba
- [Transferencias bancarias en México (SPEI)](https://docs.stripe.com/payments/bank-transfers)
- [Peticiones idempotentes](https://docs.stripe.com/api/idempotent_requests)
- [Retener fondos: autorización y captura manual](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)
- [Stripe CLI](https://docs.stripe.com/cli)
