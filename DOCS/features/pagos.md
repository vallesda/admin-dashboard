# Pagos

> Contexto `PAG`. Diseño completo: [PAGOS.md](../PAGOS.md).
> Estado de verificación: [PAGOS-VERIFICACION.md](../PAGOS-VERIFICACION.md).

---

## 1. Para qué existe

La tienda cobra de dos maneras: **efectivo al recoger** en el mostrador, o
**tarjeta en línea** —y entonces se puede entregar o recoger—. Lo que no
existe es pagar al repartidor.

Antes, «pagado» era una casilla que alguien marcaba. Con dos caminos, tres
métodos, reembolsos parciales y un webhook asíncrono, esa casilla tendría cinco
escritores y ninguna forma de reconstruir cómo llegó a su valor.

## 2. Qué tiene que ser verdad

| Regla | Enunciado |
|---|---|
| `RN-006` | el estado operativo y el de pago son máquinas independientes |
| `RN-011` | el efectivo sólo se cobra en el mostrador |
| `RF-PAG-002` | los webhooks se procesan firmados e idempotentes |
| `RF-PAG-004` | un reembolso se registra sin alterar el estado operativo |
| `INV` (base) | todo cobro tiene autor: una persona o un proveedor, nunca ninguno |

## 3. Cómo se decidió

### 3.1 `paymentStatus` es una proyección, no un campo

**La decisión.** `orders.paymentStatus` se recalcula desde `payments` y
`refunds` dentro de la misma transacción que los escribe. **Nunca se asigna
desde fuera.**

**La alternativa descartada.** Seguir moviendo el enum a mano. La primera vez
que Stripe y el mostrador se contradijeran, no habría forma de saber quién tiene
razón.

**De dónde salió.** Es el mismo patrón que `inventory` sobre
`inventory_movements` — proyección rápida, libro que la explica. Se copió a
conciencia ([inventario-y-pedidos.md](inventario-y-pedidos.md) §3.3).

### 3.2 Cobrar es siempre lo mismo

**La decisión.** Un billete de $500 y un cargo con tarjeta son **la misma fila**
en `payments`, con distinto `provider` y distinto autor: `actorId` para la
persona, `null` para el proveedor.

**Por qué.** La alternativa —un subsistema para el efectivo y otro para Stripe—
habría duplicado la conciliación, los reembolsos y los reportes. Lo único que
cambia entre los dos es *quién confirma que el dinero existe*, y eso es una
columna.

**Cómo se hizo cumplir.** Un `CHECK`: `provider = 'stripe' OR actor_id IS NOT
NULL`. Todo cobro tiene alguien responsable, y nunca ninguno de los dos.

### 3.3 Cuatro puertas, no una fusión

**La decisión.** `RN-006` sigue en pie —las dos máquinas son independientes—
pero hay cuatro momentos donde una consulta a la otra:

| | Regla | Por qué |
|---|---|---|
| **P1** | un pedido en línea no avanza a mano sin pagar | confirmar es «empieza a cortar»; hacerlo antes convierte cada carrito abandonado en pescado fileteado |
| **P2** | un pedido de mostrador avanza libre hasta `ready` | es el pedido telefónico de siempre; exigir pago rompería el negocio que ya funciona |
| **P3** | nada llega a `completed` sin cobro | la regla más simple de cualquier mostrador, y el panel no la conocía |
| **P4** | cancelar con dinero cobrado obliga a decidir el reembolso | retener a veces es legítimo; hacerlo sin rastro no |

**La alternativa descartada.** Fusionar las dos máquinas en un solo estado.
Habría hecho imposible «entregado pero no cobrado», que es un estado real de una
pescadería.

**Dónde vive.** `canTransitionWithPayment` en `state-machine.ts`, **pura**. La
misma función dibuja los botones y la aplica el servicio: una UI que ofrece una
transición que el servicio va a rechazar es una UI que miente.

### 3.4 P3 bloquea *y* ofrece la salida

**La decisión.** El botón de un pedido `ready` sin cobro no dice «Completar
(deshabilitado)»: dice **«Cobrar y entregar»** y hace las dos cosas en una
transacción.

**Por qué.** Bloquear a secas mandaría a la persona del mostrador a otra
pantalla y de vuelta, con un cliente esperando. Una regla correcta que hace el
trabajo más lento se acaba saltando.

### 3.5 Checkout alojado, no incrustado

**La decisión.** La tienda recibe una URL y hace `redirect()`.

**Por qué dejó de ser estético.** La tienda va a ser un despliegue aparte.
Incrustado obligaría a cargar el SDK de Stripe y tener una clave publicable —el
sistema separado *sabría* que existe Stripe—. Alojado, el contrato es una cadena
de texto y **la palabra «stripe» no aparece en el código de la tienda**.

### 3.6 Sólo tarjeta

**La decisión.** `payment_method_types: ['card']`, escrito en el código y no
dejado al Dashboard.

**Por qué.** OXXO y SPEI son métodos de notificación diferida: la tienda se
entera al día siguiente. Sobre producto perecedero eso significa congelar un
kilo de pescado tres días contra un vale que quizá nadie pague. Fijarlo en el
código evita que encender un método en el Dashboard cambie en silencio lo que la
tienda fía.

## 4. Cómo se comprueba

| Regla | Prueba | Capa |
|---|---|---|
| las cuatro puertas | `state-machine.test.ts` — cada una con sus casos límite | dominio |
| las puertas nunca amplían la máquina | `state-machine.test.ts` — 36×5×2 combinaciones | dominio |
| la proyección | `projection.test.ts` — incluidos devolver de más y un centavo menos | dominio |
| cobro manual sin Stripe | `payments/validators.test.ts` | dominio |
| exención de envío con motivo | `payments/validators.test.ts` | dominio |
| todo cobro tiene autor | `order-flow.test.ts` — el `CHECK` rechazó `actorId: null` | base |
| P3 impide entregar sin cobro | `order-flow.test.ts` — falló hasta registrar el cobro | base |
| traducción de estados de Stripe | `payments/stripe.test.ts` | dominio |
| lista blanca de retorno | `lib/stripe.test.ts` — incluido `amoramar.mx.evil.com` | dominio |

### Lo que **no** está cubierto 🔴

- **`modules/payments/webhook.ts` — 330 líneas que nunca se han ejecutado.**
  Dedup de eventos, fulfilment idempotente, caducidad. Es lo pendiente más caro
  del proyecto.
- `recordPayment` y `refundOrder` **contra base**: la aritmética se prueba pura,
  que *escriba* bien no.
- Reembolso parcial acumulado que no puede pasar de lo cobrado.
- Todo lo que toca la API de Stripe — bloqueado hasta que exista cuenta de MX.
