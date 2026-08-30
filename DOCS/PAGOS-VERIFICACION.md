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
| **Todo lo que toca Stripe** | 🔴 **nunca ejecutado** | `stripe_events` tiene 0 filas; no existe ni una sesión real |
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
| `createCheckoutSession` | abre la página de cobro | **0** |
| `retrieveSession` | relee la sesión para decidir | **0** |
| `fulfillCheckout` | marca el pedido pagado y lo confirma | **0** |
| `failCheckout` | libera stock de un cobro caído | **0** |
| `providerRefund` | devuelve dinero por la API de Stripe | **0** |
| `syncRefund` | refleja un reembolso hecho en el Dashboard | **0** |
| `handleEvent` / `claimEvent` | despacha y deduplica eventos | **0** |
| verificación de firma **en la ruta** | rechaza un webhook falso | **0** |

La base lo confirma sin ambigüedad: `stripe_events` tiene **0 filas** y no existe ni un pago con
proveedor `stripe`. La única fila que llegó a existir la inserté yo a mano para ejercitar el
barrido, con un id de sesión inventado; **la borré al hacer esta auditoría**, porque un
`cs_test_abandoned_43` que Stripe no conoce envenenaría cualquier conciliación futura.

Lo que sí comprobé fue la verificación de firma **del SDK**, en un script aparte: firma válida
aceptada, firma basura rechazada, cuerpo alterado rechazado, replay de una hora rechazado. Es
tranquilizador y no es lo mismo que probar la ruta.

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
| 1 | Tarjeta aprobada | `4242 4242 4242 4242` | pedido `paid` **y** `confirmed` solo |
| 2 | Tarjeta rechazada | `4000 0000 0000 0002` | el pedido sigue `pending`/`unpaid`, el stock sigue apartado |
| 3 | Requiere 3DS | `4000 0025 0000 3155` | el pedido no avanza hasta completar la autenticación |
| 4 | Abandono del Checkout | cerrar la pestaña | `checkout.session.expired` → cancelado, stock liberado |
| 5 | Doble clic en «Pagar» | pulsar dos veces | **una** sesión, no dos (clave de idempotencia) |
| 6 | Retorno antes que el webhook | `stripe listen` apagado, pagar, volver | la página muestra **Pagado** (esto prueba `F7.01`) |

**Webhooks**

| # | Escenario | Cómo | Qué debe pasar |
|---|---|---|---|
| 7 | Evento duplicado | reenviar el mismo `evt_` desde el Dashboard | el pedido cambia **una** vez |
| 8 | Evento fuera de orden | disparar `async_payment_succeeded` antes que `completed` | resultado correcto (el manejador relee) |
| 9 | Firma inválida | `curl` con `Stripe-Signature` basura | **400**, y nada escrito |
| 10 | Endpoint caído y reintento | matar el servidor, pagar, levantarlo | Stripe reintenta y el pedido acaba pagado |
| 11 | Fallo a mitad del manejador | forzar un error | 500, el evento **se libera** y el reintento sí funciona |

**Reembolsos**

| # | Escenario | Qué debe pasar |
|---|---|---|
| 12 | Reembolso total por API | `refunded`, y el libro con autor |
| 13 | Reembolso parcial, luego otro | `partially_refunded` → `refunded`; nunca por encima de lo cobrado |
| 14 | Reembolso desde el **Dashboard** de Stripe | el panel se entera solo, con `actorId` nulo |
| 15 | Reembolso que falla | `refund.failed` → rojo en el pedido, el pedido vuelve a contar como cobrado |
| 16 | Cancelar un pedido pagado | la puerta P4 obliga a decidir; el reembolso sale por Stripe |

**Barrido**

| # | Escenario | Qué debe pasar |
|---|---|---|
| 17 | Sesión real vencida (24 h) | el cron la cancela y libera stock — hoy sólo se probó con una fila inventada |
| 18 | Cancelar un pedido con la página de pago abierta | el intent se cancela en Stripe y el enlace deja de cobrar (`F7.02`) |

### Paso 4 — Lo que hace falta antes de pensar en producción

Deliberadamente **fuera** de esta fase, listado para que no se confunda con «ya está»:

- claves `live` y cuenta de Stripe México verificada (entidad, RFC, cuenta bancaria);
- la respuesta del contador sobre el **IVA** — sin ella no se implementa nada de impuestos;
- política de devoluciones escrita;
- un webhook desplegado con URL pública y su propio `whsec_`;
- `CRON_SECRET` real (hoy es un valor de desarrollo);
- las dos restricciones `NOT VALID` validadas, tras corregir a mano el pedido histórico #42.

---

## 7. Riesgos de este plan

**El paso 3 va a encontrar cosas.** Seiscientas líneas que nunca han corrido no funcionan a la
primera; lo raro sería lo contrario. Presupuestar la matriz como «un rato de clicar» es la forma
segura de acabar encendiendo pagos con la mitad sin comprobar.

**El escenario 11 es el que más me preocupa.** La ruta del webhook, ante un fallo, borra la fila
de `stripe_events` para que el reintento pueda trabajar. Esa lógica es correcta sobre el papel y
nunca se ha ejecutado; si estuviera mal, un error transitorio se convertiría en un pago perdido en
silencio, que es la peor clase de fallo que puede tener este sistema.

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
