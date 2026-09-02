# Pagos — dónde estamos y cómo verificarlo

> Auditoría del 30 de agosto de 2026, hecha contra el código y la base, no de memoria.
> **Actualizada el mismo día:** `F7.01`–`F7.03` ya están hechos; §4 conserva el hallazgo original
> y dice debajo cómo se cerró.
> Diseño y decisiones: [PAGOS.md](PAGOS.md). Roadmap: [PLAN.md](PLAN.md) §9bis.
>
> **Todo lo que sigue ocurre en modo de prueba.** No hay claves `live` en ninguna parte
> y este documento no propone ponerlas.

---

## 1. La conclusión, en una frase

El camino de **cobrar en efectivo funciona y está probado de punta a punta**; el camino de
**cobrar en línea está escrito entero y no se ha ejecutado nunca ni una sola vez.**

Esa asimetría es todo lo que hay que entender. No es que falte código: falta que el código se
haya encontrado con Stripe.

| Capa | Estado | Cómo lo sé |
|---|---|---|
| Libro de pagos y proyección | 🟢 verificado | 81 pruebas + pruebas end-to-end contra la app |
| Cobro manual (efectivo / terminal / transferencia) | 🟢 verificado | cobro, cobro parcial, «cobrar y entregar» |
| Puertas P1–P4 entre pedido y pago | 🟢 verificado | pruebas unitarias exhaustivas + navegador |
| Reembolsos manuales | 🟢 verificado | reembolso parcial real, estado y libro correctos |
| Dirección estructurada y reglas de entrega | 🟢 verificado | API rechaza las 4 combinaciones inválidas |
| Barrido de reservas abandonadas | 🟡 parcial | funcionó con un pedido **fabricado a mano**, nunca con uno real |
| Ruta del webhook: firma, deduplicación y liberación | 🟢 automatizado | `test/webhook-route.test.ts`: 10 pruebas contra Postgres real (matriz #7, #9, #11) |
| Apertura de sesión de Checkout | 🟢 ejecutado | `test/stripe-sandbox.smoke.test.ts`: 9 pruebas contra sandbox MX real |
| **Cobro completo, webhooks y reembolsos contra Stripe** | 🔴 **nunca ejecutado** | `stripe_events` no tiene ni una fila venida de Stripe; ninguna sesión se ha llegado a pagar |
| Confirmación desde la página de retorno | 🟢 hecho | endpoint con verificación de sesión (§4.1) |
| Conciliación y reportes de dinero | ⚫ no existe | — |
| CI | 🟢 hecho | `.github/workflows/ci.yml`: typecheck, lint, tests y ambos builds |

---

## 2. Lo que está verificado de verdad

Vale distinguir dos clases de evidencia, porque no valen lo mismo.

**Probado contra la aplicación corriendo** (navegador dirigido por CDP y llamadas a la API):

- un pedido nace, reserva stock y se confirma;
- «Registrar cobro» escribe en el libro con autor y fecha, y la proyección cambia;
- la puerta P3 impide entregar sin cobro y ofrece «Cobrar y entregar», que hace las dos cosas en
  una transacción;
- la puerta P1 impide confirmar a mano un pedido en línea sin pagar;
- un reembolso parcial de $180 sobre $620 deja el pedido en `partially_refunded` con las dos
  líneas en el libro;
- el barrido cancela un pedido abandonado y devuelve el stock, y es idempotente;
- la API rechaza domicilio con efectivo, domicilio sin dirección, código postal inválido y estado
  inventado, cada uno con su mensaje;
- el respaldo cuando Stripe no está configurado: pickup cae a efectivo, domicilio queda en línea
  esperando liga. Ninguno deja stock colgado.

**Probado sólo como funciones puras** (81 pruebas, `pnpm test`): la proyección del estado de pago,
las cuatro puertas en todas sus combinaciones, los validadores de cobro y reembolso, las reglas de
dirección y de estado, y la lista blanca de URLs de retorno.

---

## 3. Lo que existe y nunca se ha ejecutado

Esta es la sección que importa. Son ~600 líneas, las más consecuentes del proyecto, y **ninguna
ha corrido jamás**:

| Función | Qué hace | Veces ejecutada |
|---|---|:--:|
| ~~`createCheckoutSession`~~ | abre la página de cobro | ✅ ejecutada contra el sandbox |
| ~~`retrieveSession`~~ | relee la sesión para decidir | ✅ ejecutada contra el sandbox |
| ~~`fulfillCheckout`~~ | marca el pedido pagado y lo confirma | ✅ pedido #60, cobro real |
| `failCheckout` | libera stock de un cobro caído | **0** |
| `providerRefund` | devuelve dinero por la API de Stripe | **0** |
| `syncRefund` | refleja un reembolso hecho en el Dashboard | **0** |
| ~~`handleEvent` / `claimEvent`~~ | despacha y deduplica eventos | ✅ 5 eventos reales, todos 200 |
| ~~verificación de firma **en la ruta**~~ | rechaza un webhook falso | ✅ automatizada |

La base lo confirma sin ambigüedad: `stripe_events` tiene **0 filas** y no existe ni un pago con
proveedor `stripe`. La única fila que llegó a existir la inserté yo a mano para ejercitar el
barrido, con un id de sesión inventado; **la borré al hacer esta auditoría**, porque un
`cs_test_abandoned_43` que Stripe no conoce envenenaría cualquier conciliación futura.

Lo que sí comprobé fue la verificación de firma **del SDK**, en un script aparte: firma válida
aceptada, firma basura rechazada, cuerpo alterado rechazado, replay de una hora rechazado. Es
tranquilizador y no es lo mismo que probar la ruta.

---

## 3bis. La cuenta sandbox, y lo que su estado sí impide

> Añadido el 2 de septiembre de 2026, al conectar por primera vez una llave `sk_test_` real.

`acct_1UAhJt…` — **país `MX`, moneda `mxn`**, que es el contexto correcto para esta tienda.
Cobra: un PaymentIntent de $50 con `pm_card_visa` liquidó (`amount_received: 5000`).

Dos hallazgos que cambian qué se puede verificar hoy:

- **`charges_enabled: false`.** La cuenta no ha completado el alta. En modo prueba no impide
  cobrar, pero sí restringe qué métodos hay disponibles.
- **OXXO y SPEI están en `available: false`**, no sólo apagados. No se pueden encender desde la
  API en este estado.

Eso tiene una consecuencia incómoda que conviene dejar escrita: **afirmar «la sesión no ofrece
OXXO» pasaría igual sin la exclusión del código.** Sería una prueba verde que no prueba nada —
exactamente lo que `DT-008` describe.

Por eso el smoke test separa las dos cosas:

| Qué | Cómo se comprueba | Estado |
|---|---|---|
| Los parámetros existen | Stripe rechaza lo desconocido (`parameter_unknown`); acepta los nuestros | 🟢 probado |
| La exclusión **tiene efecto** | excluir `card` vacía el conjunto y Stripe falla con «No valid payment method types» | 🟢 probado |
| La exclusión suprime **OXXO** en concreto | requiere que la cuenta lo tenga disponible | 🟡 pendiente del alta |

El mecanismo está probado; falta la configuración. Cuando la cuenta se active hay que releer la
configuración de métodos y confirmar que OXXO aparece como `available` y **aun así** no se ofrece.

---

## 3ter. El primer cobro real (pedido #60)

> 2 de septiembre de 2026. Sandbox `acct_1UAhJt…`, tarjeta `4242…`, $1 500 MXN.

La cadena entera, de punta a punta y por primera vez:

| Comprobación | Resultado |
|---|---|
| Total del servidor **=** `amount_total` de Stripe | `150000` = `150000` ✅ |
| Stock reservado al crear el pedido | 6 → 5 ✅ |
| Stock **no** vuelve a bajar al cobrar | sigue en 5 ✅ |
| `checkout.session.completed` recibido y procesado | 5 eventos reenviados, **todos 200** ✅ |
| Pedido tras el webhook | `confirmed` + `paid` ✅ |
| Importe cobrado = total del pedido | `150000` ✅ |
| Firma verificada en la app corriendo | sin cabecera → 400; firma basura → 400 ✅ |
| `integration_identifier` en la sesión | `amoramar-hosted-checkout-fqishqrr` ✅ |
| Métodos ofrecidos | `['card', 'link']`, sin OXXO ni SPEI ✅ |

**`link` apareció.** Es exactamente lo que el `payment_method_types: ['card']` viejo tiraba a la
basura: liquida al instante, no cuesta nada y no se estaba ofreciendo.

### El bug que sólo aparece cobrando de verdad

`getOrderByToken` leía el método de pago desde `findOpenAttempt`, que sólo mira intentos en
`created`/`processing`. En cuanto el cobro **triunfa**, el intento pasa a `succeeded` y deja de
encontrarse: quien acababa de pagar con tarjeta aterrizaba —desde el propio redirect de Stripe— en
una página de confirmación que **no decía cómo había pagado** (`methodLabel: null`).

Ninguna de las 210 pruebas lo atrapó, porque todas las que tocaban ese camino se detenían antes de
que un cobro llegara a liquidarse. Es la clase de hueco que sólo cierra ejecutar el flujo.

Corregido en `modules/storefront/queries.ts`: el cobro liquidado gana, y el abierto queda de
respaldo para que un vale de OXXO siga teniendo método antes de pagarse. Con prueba de regresión
en `modules/storefront/order-payment-label.test.ts`, verificada por mutación.

---

## 3quater. Los dos bugs que sólo aparecieron ejecutando la matriz

> 2 de septiembre de 2026, contra el sandbox. Ninguno de los dos lo tenía ninguna prueba.

### A. `refund.created` devolvía 500 (carrera de eventos)

Un reembolso del Dashboard llega por **varios eventos casi simultáneos**: `refund.created` y
`refund.updated`. Los dos entran en `syncRefund`, los dos ven que no hay fila y los dos intentan
crearla. Es un comprobar-luego-actuar, y ninguna comprobación previa lo cierra.

**El dinero salió bien**, y eso importa: `refunds_stripe_refund_id_unique` hizo perder al segundo,
así que hubo un reembolso de $300, no dos. Fue exactamente la restricción de base actuando como
frontera de idempotencia. Lo que estaba mal era la consecuencia: un **500** que hacía a Stripe
reintentar un evento sin trabajo pendiente, y que en cualquier panel de monitoreo se leería como
un webhook fallando.

Corregido: la violación de unicidad se trata como «alguien ya lo registró» — se relee y se aplica
el estado. Cualquier otro error sigue subiendo, porque un 200 sobre un fallo real perdería el
evento para siempre. Verificado en vivo: el segundo reembolso ($1 200) pasó **sin un solo 500**.

### B. Cancelar un pedido dejaba viva su página de cobro 🔴

El más grave de los dos, y el que la matriz nombraba como #18.

`voidOpenAttempts` cancelaba el **PaymentIntent**. Pero una sesión de Checkout que el comprador
**nunca abrió no tiene PaymentIntent** — comprobado contra Stripe: `payment_intent: null` en una
sesión recién creada. No había nada que cancelar, y el enlace seguía cobrando hasta 24 h.

La secuencia que eso permite:

1. el barrido cancela un pedido abandonado y **devuelve el pescado a la venta**;
2. se vende a otro cliente;
3. el primero abre su enlace viejo y **paga**;
4. `fulfillCheckout` registra el cobro contra un pedido `cancelled` y sin existencias.

Dinero recibido por algo que ya no hay. `F7.02` daba esto por hecho desde agosto y **nunca había
corrido**.

Corregido: si la sesión sigue `open` se **vence** (lo que además cancela el intent si existía); el
vale de OXXO —sesión `complete` e impaga, que Stripe no deja vencer— sigue cerrándose por el
intent. Con pruebas en `modules/payments/void-attempts.test.ts`, las tres verificadas por mutación,
y la premisa del bug fijada contra Stripe en el smoke test.

---

## 3quinquies. La prueba que pasaba sin probar nada

> 2 de septiembre de 2026, escribiendo el escenario #6.

Merece quedar escrito porque es el fallo más barato de cometer y el más caro de
no ver.

El escenario #6 sólo tiene sentido con el webhook **apagado**: la página de retorno y el webhook
llaman a la misma `fulfillCheckout`, así que con los dos vivos no se puede saber cuál hizo el
trabajo. La prueba apagaba `stripe listen` con `pkill -f "stripe listen --forward-to"`.

Ese patrón **nunca encontró el proceso**: la línea real es
`stripe listen --api-key sk_test_… --forward-to …`, con la clave entre medias. `pkill` falló en
silencio, `pgrep` tampoco lo vio, y la función dio por apagado algo que seguía corriendo. La prueba
pasó — midiendo el webhook, es decir, sin probar `F7.01` en absoluto.

Dos correcciones, y la segunda importa más:

1. El patrón pasó a ser `stripe listen`, sin banderas.
2. **La prueba afirma el estado del que depende** antes de medir nada:
   `expect(forwardingRunning()).toBe(false)`. Una prueba que no puede fallar no prueba nada, y la
   forma de que pueda fallar es no suponer la precondición.

Con eso, `F7.01` quedó verificado por primera vez: el comprador ve «Pagado» sin que haya llegado
ningún webhook.

**El `whsec_` del CLI es estable por cuenta y dispositivo** (`stripe listen --print-secret` devuelve
siempre el mismo), que es lo que permite apagar y encender el reenvío sin tocar `.env.local`. No es
obvio y conviene no volver a averiguarlo.

---

## 4. Huecos reales que encontró esta auditoría

Tres cosas que no sabía antes de mirar. **Las tres están cerradas**; dejo el hallazgo escrito
porque el razonamiento importa más que el parche.

### 4.1 La página de retorno no confirma nada 🔴 — **corregido**

[PAGOS.md §11.1](PAGOS.md) dice, con todas sus letras, que el webhook **y** la página de retorno
llaman a la misma función `fulfillCheckout`. Es la recomendación explícita de Stripe: el webhook
porque nadie garantiza que el comprador llegue a la página, y la página porque los webhooks a
veces tardan y el comprador está mirando la pantalla *ahora*.

Sólo está la mitad. `fulfillCheckout` se llama desde un único sitio, el webhook. La página
`/pedido/[token]` lee el pedido por la API y ya; ni siquiera mira el `session_id` que Stripe le
pone en la URL.

Consecuencia práctica: alguien paga, vuelve a la tienda y ve **«Pendiente»**. Checkout espera
hasta 10 s a nuestro webhook antes de redirigir, así que casi siempre saldrá bien — y «casi
siempre» es exactamente lo que el documento dice que no hay que suponer.

**Hecho (`F7.01`).** Existe `POST /api/v1/orders/[token]/confirm`: recibe el `session_id`, lo
verifica contra el pedido que nombra el token —viene de una URL editable, y sin esa comprobación
pasar la sesión de otro haría que confirmáramos *su* pedido—, llama a `fulfillCheckout` y devuelve
el pedido ya actualizado en el mismo viaje. La página lo invoca antes de renderizar y, si falla,
cae a la lectura normal: el pedido es real de todos modos y el webhook lo va a resolver.

### 4.2 «Cancelar no es reembolsar» está documentado y no implementado 🟡 — **corregido**

[PAGOS.md §12.4](PAGOS.md) explica que un cobro que aún no se completó **se cancela** en vez de
reembolsarse, porque cancelar no cuesta comisión. Escribí `cancelIntent` e `isCancelableIntent`
para eso.

**Ninguna de las dos se llama desde ningún sitio.** Son código muerto, y `isCancelableIntent`
tiene hasta una prueba que verifica que una función que nadie usa se comporta bien.

**Hecho (`F7.02`).** `voidOpenAttempts` relee la sesión, cancela el intent si todavía admite
cancelación y marca el intento como `canceled` para que la proyección no se quede en «cobrando»
sobre un pedido que ya nadie puede pagar. Se llama desde el barrido y desde la cancelación manual.

Eso obligó a mover la cancelación de `SAL` a `PAG`: cancelar dejó de ser una operación puramente
operativa, y Sales no puede saber que Stripe existe (`PAG` depende de `SAL`, nunca al revés). De
paso apareció otro hueco de la misma familia que `DT-009`: la acción exigía rol `staff` cuando el
SRS §4 siempre dijo que cancelar es de `admin`. Ahora exige `admin`.

### 4.3 Nada corre solo 🔴 — **corregido**

**Hecho (`F7.03`).** `.github/workflows/ci.yml` corre typecheck, lint, tests y los dos builds en
cada push y cada PR. Se comprobó que los cinco pasos pasan con variables de relleno y sin base de
datos ni red: cada página del panel es `force-dynamic` y la tienda no consulta el catálogo al
construir. Ninguna clave real vive en el workflow.

---

## 5. Lo que directamente no existe

| Falta | Impacto | Prioridad |
|---|---|---|
| Conciliación: «¿cuánto entró hoy por tarjeta y cuánto en efectivo?» | el libro tiene los datos, no hay ninguna pantalla que los sume | 🔴 alta |
| Manejo de disputas (`charge.dispute.*`) | una contracargo llega y el panel no se entera | 🟡 media |
| ~~Cobro del envío~~ | Hecho: zonas por código postal, umbral de gratis y exención con motivo | ✅ |
| Recibo o comprobante para el cliente | sólo el correo automático de Stripe, si se activa | 🟡 media |
| Limpieza de `stripe_events` | crece sin límite; irrelevante por años | 🟢 baja |
| Pruebas sobre transacciones reales | todo lo que toca Postgres se verifica a mano | 🔴 alta |

El del envío ya está cerrado: el costo lo decide el código postal a través de las zonas de
`DEL`, con umbral de «gratis a partir de X» y exención manual con motivo y autor. La tienda lo
cotiza en vivo mientras se escribe la dirección, y `createOrder` lo vuelve a calcular dentro de su
transacción — la vista previa nunca es autoritativa.

---

## 6. El plan — Fase 7, íntegramente en modo de prueba

Cuatro pasos. Los dos primeros no necesitan cuenta de Stripe y se pueden hacer hoy.

### Paso 1 — Cerrar los huecos que no dependen de nadie

| # | Tarea | Por qué antes de Stripe |
|---|---|---|
| ✅ `F7.01` | Endpoint de confirmación + la página de retorno que lo llama (§4.1) | si no, la primera prueba real medirá un flujo a medias |
| ✅ `F7.02` | `voidOpenAttempts` al cancelar; cancelación movida a `PAG` y elevada a rol `admin` (§4.2) | el plan de pruebas del paso 3 lo incluye; hay que saber qué se prueba |
| ✅ `F7.03` | CI en GitHub Actions: `typecheck`, `lint`, `test`, ambos builds | para que el paso 3 no rompa el paso 1 sin avisar |
| ✅ `F7.04` | Cobro del envío **por zona**, con gratis por monto y exención con motivo (`DEL`) | cambia el importe que se le cobra a la gente |

### Paso 2 — Un entorno de prueba de Stripe

Sin datos de la empresa, sin cuenta bancaria, sin verificación de identidad. Un *sandbox* da
claves `sk_test_` que funcionan de inmediato:

```bash
npm i -g @stripe/cli
stripe login                 # o: stripe sandbox create
```

Después, en `.env` del admin — y **sólo** claves de prueba:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...      # lo imprime `stripe listen`
STOREFRONT_ALLOWED_ORIGINS=http://localhost:3001
```

Con `stripe listen --forward-to localhost:3000/api/webhooks/stripe` corriendo, el webhook local
recibe eventos reales de una cuenta de prueba. Nada de esto toca dinero de nadie.

### Paso 3 — La matriz de verificación

Cada fila es un escenario que hoy nunca ha ocurrido. Ninguno requiere modo `live`.

**Cobro**

| # | Escenario | Cómo | Qué debe pasar |
|---|---|---|---|
| 1 | Tarjeta aprobada | `4242 4242 4242 4242` | pedido `paid` **y** `confirmed` solo — ✅ **hecho** (#60: $1 500, stock 6→5 al reservar y **sin volver a bajar** al cobrar) |
| 2 | Tarjeta rechazada | `4000 0000 0000 0002` | ✅ **automatizado** (`checkout-failures`): sigue `unpaid` y **el stock sigue apartado** |
| 3 | Requiere 3DS | `4000 0025 0000 3155` | ✅ **automatizado**: `unpaid` ante el reto, `paid` al autenticar |
| 4 | Abandono del Checkout | cerrar la pestaña | ✅ **hecho** (#61: sesión vencida por API → `cancelled`, stock 3→5) |
| 5 | Doble clic en «Pagar» | pulsar dos veces | ✅ **una** sesión, no dos (smoke de Stripe, matriz #5) |
| 6 | Retorno antes que el webhook | `stripe listen` apagado, pagar, volver | ✅ **automatizado** (`checkout-confirmation`), con el reenvío apagado de verdad — ver §3quinquies |

**Webhooks**

| # | Escenario | Cómo | Qué debe pasar |
|---|---|---|---|
| 7 | Evento duplicado | reenviar el mismo `evt_` desde el Dashboard | el pedido cambia **una** vez — ✅ *el mecanismo (`claimEvent`) ya está cubierto automáticamente; falta el viaje real desde el Dashboard* |
| 8 | Evento fuera de orden | disparar `async_payment_succeeded` antes que `completed` | ⚫ **no aplica con tarjeta.** Esos eventos sólo existen en métodos de notificación diferida; se prueba el día que se encienda SPEI |
| 9 | Firma inválida | `curl` con `Stripe-Signature` basura | **400**, y nada escrito — ✅ **automatizado** (firma basura, cuerpo alterado, otro secreto, replay de una hora, y sin cabecera) |
| 10 | Endpoint caído y reintento | matar el servidor, pagar, levantarlo | ✅ **hecho** (un 500 real reentregado → 200, sin duplicar dinero) |
| 11 | Fallo a mitad del manejador | forzar un error | 500, el evento **se libera** y el reintento sí funciona — ✅ **automatizado**, y comprobado por mutación: comentar `releaseEvent` hace fallar la prueba |

**Reembolsos**

| # | Escenario | Qué debe pasar |
|---|---|---|
| 12 | Reembolso total por API | `refunded`, y el libro con autor | 🟡 pendiente (falta el que nace en el panel) |
| 13 | Reembolso parcial, luego otro | ✅ **hecho** (#60: $300 → `partially_refunded`, +$1 200 → `refunded`, 150000 = 150000) |
| 14 | Reembolso desde el **Dashboard** de Stripe | ✅ **hecho** — y destapó la carrera de §3quater |
| 15 | Reembolso que falla | `refund.failed` → rojo en el pedido, el pedido vuelve a contar como cobrado |
| 16 | Cancelar un pedido pagado | la puerta P4 obliga a decidir; el reembolso sale por Stripe |

**Barrido**

| # | Escenario | Qué debe pasar |
|---|---|---|
| 17 | Sesión real vencida (24 h) | el cron la cancela y libera stock — hoy sólo se probó con una fila inventada |
| 18 | Cancelar un pedido con la página de pago abierta | ✅ **corregido y probado** — no funcionaba; ver §3quater |

### Paso 4 — Lo que hace falta antes de pensar en producción

Deliberadamente **fuera** de esta fase, listado para que no se confunda con «ya está»:

- claves `live` y cuenta de Stripe México verificada (entidad, RFC, cuenta bancaria);
- la respuesta del contador sobre el **IVA** — sin ella no se implementa nada de impuestos;
- política de devoluciones escrita;
- un webhook desplegado con URL pública y su propio `whsec_`;
- `CRON_SECRET` real (hoy es un valor de desarrollo);
- las dos restricciones `NOT VALID` validadas, tras corregir a mano el pedido histórico #42.

---

## 6bis. Dónde está la matriz hoy

| Bloque | Estado |
|---|---|
| Cobro (#1–#6) | 🟢 los seis, automatizados en `e2e/` |
| Webhooks (#7, #9, #10, #11) | 🟢 automatizados entre `test/webhook-route.test.ts` y replay firmado |
| Webhooks (#8) | ⚫ no aplica con tarjeta; espera a SPEI |
| Reembolsos (#13, #14) | 🟢 verificados en vivo contra el sandbox |
| Reembolsos (#12, #15, #16) | 🟡 pendientes: nacen en el panel, que pide sesión de admin |
| Barrido (#17) | 🟡 el vencimiento sí (#4 lo cubre); falta el cron sobre un pedido de 26 h |
| Barrido (#18) | 🟢 corregido y probado (§3quater) |

**16 de 18.** Las dos que faltan de verdad —#12, #15, #16— entran por el panel, y automatizarlas
pide resolver antes la sesión de admin en Playwright. No es difícil; es otro trabajo.

---

## 7. Riesgos de este plan

**El paso 3 va a encontrar cosas.** Seiscientas líneas que nunca han corrido no funcionan a la
primera; lo raro sería lo contrario. Presupuestar la matriz como «un rato de clicar» es la forma
segura de acabar encendiendo pagos con la mitad sin comprobar.

**El escenario 11 ~~es el que más me preocupa~~ ya está cerrado.** La ruta, ante un fallo, borra
la fila de `stripe_events` para que el reintento pueda trabajar. Era correcto sobre el papel y
nunca se había ejecutado; si estuviera mal, un error transitorio se habría convertido en un pago
perdido en silencio, la peor clase de fallo que puede tener este sistema. Ahora hay una prueba que
falla el evento, exige 500, comprueba que la fila desapareció y vuelve a entregar el evento para
ver que el reintento sí procesa. Se verificó por mutación que la prueba detecta la regresión.

**Queda pendiente el hueco que esa prueba no cubre:** un fallo *después* de que `handleEvent` haya
escrito parte de su trabajo. `releaseEvent` deja el evento listo para reintento, pero no deshace lo
ya escrito; la idempotencia de `fulfillCheckout` es lo que debe absorberlo, y eso sólo se ve contra
sesiones reales.

**El sandbox no prueba el dinero.** Prueba el flujo. Comisiones, tiempos de liquidación y el
comportamiento real de un reembolso a una tarjeta viva son cosas que sólo se ven en `live`, y este
plan no llega ahí a propósito.

---

## 8. Criterio de salida de la fase

```text
las 17 filas de la matriz pasan en modo de prueba
la página de retorno confirma el pago sin depender del webhook
CI corre typecheck, lint, test y build en cada push
`stripe_events` tiene filas reales y ningún pedido quedó a medias
ni una sola clave `live` en el repositorio ni en ningún entorno
```

Cuando eso se cumpla, el sistema seguirá **sin** poder cobrarle a nadie de verdad — y esa será una
decisión pendiente, no un descuido.
