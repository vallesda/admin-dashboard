# Cómo funcionan el inventario y la creación de un pedido

> Escrito leyendo el código, no de memoria. Contextos `INV` y `SAL`.
> Modelo: [MODELO-DATOS.md](MODELO-DATOS.md) · Reglas: [SRS.md](SRS.md) · Pagos: [PAGOS.md](PAGOS.md).

---

## 1. La idea que hay que entender primero

Casi todo lo demás se deduce de esto:

> **Un pedido no saca pescado de la cámara. Lo aparta.**

Reservar y vender son cosas distintas y el sistema no las confunde nunca. De ahí salen dos
números por producto y no uno:

```text
on_hand    lo que físicamente hay en la cámara
reserved   lo que ya está prometido a un pedido abierto
available  on_hand − reserved          ← se calcula, no se guarda
```

`available` **no existe como columna**. Guardarlo daría dos fuentes de verdad que pueden
discrepar, y el día que discrepen nadie sabría cuál creer (INV-STK-05).

Y de ahí sale la regla que gobierna todo el contexto:

```text
RN-003:  reserved <= on_hand,  siempre
```

No es una convención del código: es un `CHECK` en la base
(`inventory_reserved_within_on_hand`). Da igual qué ruta de código escriba la fila —una acción,
una migración, alguien con `psql`—: Postgres la rechaza.

---

## 2. Dos tablas, y por qué son dos

| Tabla | Qué es | Se lee para |
|---|---|---|
| `inventory` | la **proyección**: una fila por producto, rápida de consultar | pintar el catálogo, decidir si alcanza |
| `inventory_movements` | el **libro**: append-only, una fila por cada vez que algo se movió | explicar cómo llegó `inventory` a ese número |

Es el mismo patrón que `orders.paymentStatus` sobre `payments`/`refunds` (ver
[PAGOS.md §6](PAGOS.md)) — de hecho el de pagos se copió de aquí.

**El libro es de verdad append-only.** No es una promesa del código: la migración `0004` instala
dos triggers, `inventory_movements_no_update` y `inventory_movements_no_delete`, que lanzan una
excepción. Un `UPDATE` sobre un movimiento falla aunque lo escriba un administrador. Una
corrección es un `adjustment` nuevo, y así la historia se explica sola.

### Los cinco tipos de movimiento

Cada uno tiene una **forma** obligatoria, verificada por un `CHECK`:

| Tipo | `on_hand` | `reserved` | ¿Lleva pedido? | Quién lo escribe |
|---|:--:|:--:|:--:|---|
| `receive` | **+** | 0 | no | una persona: llegó mercancía |
| `adjustment` | ± | 0 | no | una persona: merma, conteo, corrección |
| `reserve` | 0 | **+** | **sí** | Sales, al crear el pedido |
| `release` | 0 | **−** | **sí** | Sales, al cancelar |
| `sale` | **−** | **− (igual)** | **sí** | Sales, al completar |

Dos columnas de delta y no una cantidad, porque un `sale` mueve las dos a la vez y por el mismo
importe: el pescado salió *y* la promesa se cumplió. Una sola columna no podría decir eso
(INV-MOV-05).

Y ningún movimiento puede ser vacío: `on_hand_delta <> 0 OR reserved_delta <> 0`. Una fila que no
mueve nada es ruido en un libro contable.

---

## 3. De dónde sale el inventario

Un producto **nace con inventario en cero**. `initializeInventory` corre dentro de la misma
transacción que crea el producto, con `ON CONFLICT DO NOTHING`, así que la invariante «una fila de
inventario por producto» (INV-STK-04) se cumple desde el primer instante.

Eso importa más de lo que parece: sin fila de inventario, un producto es invisible para el
catálogo y **`createOrder` lo rechaza explícitamente** («no tiene inventario inicializado») en vez
de tratarlo como si tuviera cero. La diferencia entre «no hay» y «no sé» está codificada.

Después el stock sólo se mueve por dos vías humanas:

**Recibir mercancía** (`receiveStock`) — suma a `on_hand`, escribe un `receive`. No hay validación
más allá de que sea positivo: llegó pescado, y discutir con la realidad no es trabajo del software.

**Ajustar** (`adjustStock`) — suma o resta, con **nota obligatoria**, y escribe un `adjustment`.
Aquí sí hay dos frenos, y el segundo es el interesante:

```ts
if (next < 0)                → "No puedes dejar el stock en −3. Hay 2 unidades."
if (next < current.reserved)  → "No puedes bajar de 5: esas unidades ya están
                                 reservadas en pedidos."
```

El `CHECK` de la base atraparía ambos casos igual. Se comprueban antes para que el operador lea
**qué hacer**, no una violación de restricción. Y la lectura se hace con `FOR UPDATE`, porque
entre comprobar y escribir cabe otro ajuste.

---

## 4. Crear un pedido, paso a paso

Todo lo que sigue ocurre **dentro de una sola transacción**. `createOrder` la abre en la primera
línea y no la suelta hasta el final: o pasa todo, o no pasa nada (RN-004).

### Paso 1 — El cliente tiene que existir

Se busca por id. Si no está, `NotFoundError`. Un pedido sin cliente no es un pedido.

### Paso 2 — Bloquear el inventario, en orden

```sql
SELECT ... FROM inventory
 WHERE product_id IN (...)
 ORDER BY product_id          -- ← esto no es cosmético
   FOR UPDATE
```

Dos detalles que valen la sección entera:

- **`FOR UPDATE`** bloquea las filas hasta el final de la transacción. Sin él, dos pedidos
  simultáneos por el último kilo de robalo leerían ambos «hay 1», y ambos lo apartarían.
- **`ORDER BY product_id`** evita un *deadlock*. Si un pedido bloquea atún y luego pulpo mientras
  otro bloquea pulpo y luego atún, los dos se quedan esperando al otro para siempre. Bloqueando
  siempre en el mismo orden, eso no puede pasar.

### Paso 3 — Validar cada línea

Por cada producto pedido, en este orden:

1. **¿existe?** → si no, `NotFoundError`;
2. **¿está `active`?** → un borrador o un archivado no se puede vender (INV-PRO-06);
3. **¿tiene inventario inicializado?** → si no, error explícito;
4. **¿alcanza?** → `available = on_hand − reserved`; si la cantidad pedida es mayor:

   > «Solo hay 3 de "Atún aleta amarilla 1 kg" disponibles.»

   El mensaje dice el número, porque un operador con el cliente al teléfono necesita saber cuánto
   sí puede vender.

### Paso 4 — Congelar los precios

```ts
items.push({
  productName: product.name,     // el nombre de HOY
  sku: product.sku,
  unitPriceCents: product.priceCents,
  lineTotalCents: product.priceCents * line.quantity,
});
```

Esto es `RN-005`, y es una de las decisiones más importantes del modelo: **`orderItems` guarda una
copia del nombre, el SKU y el precio**. Subir el precio del salmón mañana no reescribe lo que se
vendió hoy. Un pedido histórico es un documento, no una consulta al catálogo actual.

Lo mismo con el cliente: `customerName`, `customerPhone` y `customerEmail` se copian a la fila del
pedido. Editar la ficha del cliente después no cambia a quién se llamó para *ese* pedido
(INV-CUS-03).

### Paso 5 — El total lo calcula el servidor

```ts
subtotalCents = suma de lineTotalCents
totalCents    = subtotalCents + deliveryFeeCents
```

`RN-008`: **el cliente nunca manda el total**. El carrito de la tienda envía ids y cantidades, y
nada más. Un comprador que edite el payload cambia *qué* pide, jamás *cuánto* paga.

Y por si el código fallara, la base lo repite:

```sql
CHECK (total_cents = subtotal_cents + delivery_fee_cents)
```

El total es aritmética, no una opinión.

> **Nota abierta:** `deliveryFeeCents` hoy siempre vale `0` porque la tienda no tiene tarifa de
> envío modelada. Es decir, **el envío se está regalando**. Está anotado como pendiente en
> [PAGOS-VERIFICACION.md §5](PAGOS-VERIFICACION.md).

### Paso 6 — Guardar y apartar

Se inserta el pedido, luego sus líneas, y después, **por cada línea**:

```ts
UPDATE inventory SET reserved = reserved + cantidad   -- la proyección
INSERT INTO inventory_movements (type: 'reserve', reservedDelta: +cantidad, orderId)
```

Fíjate en que `on_hand` no se toca. El pescado sigue en la cámara; sólo dejó de estar disponible.

El movimiento lleva `createdBy = actorId`, que es **`null` cuando el pedido vino de la tienda** —
nadie del negocio lo tocó. Esa convención se usa igual en pagos: autor nulo significa «lo confirmó
un sistema, no una persona».

---

## 5. Qué le pasa al inventario después

El pedido tiene dos máquinas independientes (`RN-006`): la operativa y la del dinero. **Sólo la
operativa mueve stock.**

```text
pending ──► confirmed ──► preparing ──► ready ──► completed
   │            │             │           │
   └────────────┴─────────────┴───────────┴──► cancelled
```

| Transición | Qué pasa con el inventario |
|---|---|
| `pending → confirmed → preparing → ready` | **nada**. La reserva ya está puesta desde que nació el pedido |
| `ready → completed` | `sale`: bajan `on_hand` **y** `reserved`, en la misma cantidad |
| `* → cancelled` | `release`: sube el disponible bajando `reserved`; `on_hand` intacto |

Que los estados intermedios no muevan nada es el punto: apartar ocurre **una vez**, al principio.
Confirmar y preparar son señales para las personas, no para la cámara.

**Completar** escribe un `sale` por línea con los dos deltas negativos e iguales — el pescado salió
y la promesa se cumplió a la vez.

**Cancelar** escribe un `release`: sólo `reserved` baja, porque nada salió nunca. Y no hay una
rama «¿ya se había vendido?», porque `completed` no tiene ninguna transición de salida: un pedido
completado no se puede cancelar, así que el caso no existe.

Todo dentro de la misma transacción que cambia el estado. Nunca hay un instante en que el pedido
diga «entregado» y el inventario todavía no lo sepa.

---

## 6. Dónde se cruza con los pagos

Desde [PAGOS.md §7](PAGOS.md) hay cuatro **puertas** entre las dos máquinas. Las que tocan
inventario son dos:

- **P3** — nada llega a `completed` sin cobro registrado. Es decir: **no se escribe un `sale` sin
  que haya dinero en el libro.** El botón «Cobrar y entregar» hace las dos cosas en una sola
  transacción precisamente por esto.
- **P1** — un pedido en línea sin pagar no avanza. Sigue apartando stock, pero nadie empieza a
  cortar.

Y hay un problema que sólo aparece con cobro en línea: **la reserva que nadie libera.** Un
comprador que abandona el checkout deja pescado apartado para siempre, y en una semana la tienda
muestra «agotado» con la cámara llena. Se resuelve por dos vías, y la distinción es deliberada:

- pedidos **en línea** abandonados → el barrido los cancela solo (una sesión vencida es un hecho
  verificable);
- pedidos **de mostrador** viejos → aparecen en una lista del panel para que decida una persona.

> La cancelación automática sólo es legítima cuando la contraparte es una máquina. Alguien que
> dijo «paso en la tarde» le prometió algo a otra persona.

---

## 7. Las invariantes, en una tabla

Lo que este diseño garantiza, y dónde se garantiza:

| Invariante | Dónde vive |
|---|---|
| `reserved <= on_hand` | `CHECK` en `inventory` |
| `on_hand >= 0`, `reserved >= 0` | `CHECK` en `inventory` |
| Una fila de inventario por producto | la PK **es** la FK |
| El libro no se edita ni se borra | dos triggers en Postgres |
| Cada tipo de movimiento tiene su forma | cinco `CHECK` en `inventory_movements` |
| `total = subtotal + envío` | `CHECK` en `orders` |
| Un producto vendido no se borra | `ON DELETE RESTRICT` |
| Pedido e inventario cambian juntos | una transacción por operación |
| No se vende más de lo disponible | `FOR UPDATE` + comprobación + `CHECK` |

Fíjate en el patrón: **casi todo está en la base, no en el código**. La regla de negocio vive en el
servicio para dar un mensaje legible; la restricción vive en Postgres para que sea cierta.

---

## 8. Lo que este diseño todavía no hace

Honestidad sobre los bordes:

| Límite | Consecuencia |
|---|---|
| **Un pedido no se puede editar** (`DT-012`) | cambiar una cantidad obliga a cancelar y rehacer |
| **`deliveryFeeCents` siempre 0** | el envío se regala |
| **Peso y precio fijos** | no hay *catch weight*: «salmón 500 g» y «salmón 1 kg» son dos productos |
| **Sin caducidad ni lotes** | el inventario no sabe qué llegó primero, lo cual para pescado fresco es una omisión real |
| **`backfillInventory` existe y nadie la llama** (`DT-011`) | reparación masiva sin punto de entrada |
| **Sin pruebas sobre transacciones reales** | lo de arriba se verifica a mano; `pnpm test` sólo cubre reglas puras |

La de lotes y caducidad es la que más pesa para este negocio en concreto. El sistema sabe *cuánto*
hay; no sabe *desde cuándo*.
