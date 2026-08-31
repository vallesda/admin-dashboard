# Inventario y pedidos

> Contextos `INV` y `SAL`. Explicación larga del mecanismo:
> [FLUJO-INVENTARIO-PEDIDO.md](../FLUJO-INVENTARIO-PEDIDO.md).

---

## 1. Para qué existe

La pescadería vende lo que trajo el barco hoy. Alguien pide tres kilos de atún a
las once, otro pide dos a las once y cuarto, y sólo hay cuatro. El sistema tiene
que impedir la segunda venta sin haber sacado nada de la cámara todavía.

## 2. Qué tiene que ser verdad

| Regla | Enunciado |
|---|---|
| `RN-003` | nunca se vende más de lo disponible: `reserved <= on_hand`, siempre |
| `RN-004` | crear, cancelar y completar actualizan Sales e Inventory **atómicamente** |
| `RN-005` | la línea del pedido congela nombre, SKU y precio |
| `RN-008` | el total lo calcula el servidor con los precios del catálogo |
| `RN-009` | toda modificación de inventario deja un movimiento |
| `INV-STK-05` | `available = on_hand − reserved` se calcula, nunca se guarda |

## 3. Cómo se decidió

### 3.1 Dos números por producto, no uno

**La decisión.** `on_hand` (lo que hay) y `reserved` (lo prometido), con
`available` derivado.

**La alternativa descartada.** Un solo contador que baje al pedir. Habría hecho
imposible distinguir «lo vendimos» de «lo tenemos apartado», que son estados con
consecuencias distintas: uno se puede deshacer sin mover pescado y el otro no.

**Por qué `available` no se guarda.** Tres columnas donde bastan dos dan dos
fuentes de verdad que pueden discrepar, y el día que discrepen nadie sabrá cuál
creer. Es `INV-STK-05` y está escrito en el esquema.

### 3.2 La regla vive en la base, no en el servicio

**La decisión.** `RN-003` es un `CHECK` en `inventory`, no un `if`.

**Por qué.** Una Server Action es un endpoint POST público. El servicio
comprueba primero para dar un mensaje legible —«Solo hay 3 disponibles»— y la
base comprueba después para que sea cierto sin importar qué ruta de código
escriba la fila.

### 3.3 Una proyección y un libro

**La decisión.** `inventory` es rápida de consultar; `inventory_movements` es
append-only y explica cómo llegó a ese número.

**Por qué append-only de verdad.** No es una convención: son dos triggers que
lanzan excepción ante `UPDATE` y `DELETE`. Una corrección es un `adjustment`
nuevo. Un libro que se puede editar no es un libro.

**Efecto colateral bueno.** Este patrón se copió después para `orders.paymentStatus`
sobre `payments`/`refunds` — [pagos.md](pagos.md) §3.1.

### 3.4 Bloqueo en orden de id

**La decisión.** `SELECT … FOR UPDATE ORDER BY product_id`.

**Por qué el `ORDER BY`.** Sin él, un pedido que bloquea atún y luego pulpo,
mientras otro bloquea pulpo y luego atún, se esperan mutuamente para siempre.
Bloquear siempre en el mismo orden hace el interbloqueo imposible.

### 3.5 El pedido es un documento, no una consulta

**La decisión.** `orderItems` copia nombre, SKU y precio; el pedido copia
nombre, teléfono y correo del cliente.

**Por qué.** Subir el precio del salmón mañana no puede reescribir lo que se
vendió hoy, y editar la ficha de un cliente no puede cambiar a quién se llamó
para un pedido pasado (`INV-CUS-03`).

## 4. Cómo se comprueba

| Regla | Prueba | Capa |
|---|---|---|
| `RN-003` en la base | `test/schema.test.ts` → «rechaza reservar más de lo que hay» | base |
| `RN-003` en el flujo | `order-flow.test.ts` → «rechaza pedir más… y no deja rastro» | base |
| disponible ≠ físico | `order-flow.test.ts` → «cuenta lo ya reservado» | base |
| `RN-004` atomicidad | `order-flow.test.ts` → verifica que un rechazo no deja pedido, reserva ni movimiento | base |
| `RN-005` | `order-flow.test.ts` → «congela nombre y precio» | base |
| `RN-008` | `order-flow.test.ts` → «el servidor calcula el total» | base |
| reservar ≠ vender | `order-flow.test.ts` → «sube `reserved` y deja `on_hand` intacto» | base |
| completar | `order-flow.test.ts` → los dos deltas, iguales y negativos | base |
| cancelar devuelve | `order-flow.test.ts` → «libera para que otro pedido pueda comprar» | base |
| libro inmodificable | `test/schema.test.ts` → `UPDATE` y `DELETE` lanzan | base |
| forma de cada movimiento | `test/schema.test.ts` → `reserve` sin pedido y con delta físico | base |
| máquina de estados | `state-machine.test.ts` → 36×5×2 combinaciones | dominio |

### Lo que **no** está cubierto

- **Concurrencia real.** El `FOR UPDATE` existe y ninguna prueba lanza dos
  `createOrder` a la vez por la última pieza. Es la prueba de mayor valor
  pendiente en este módulo.
- `receiveStock` y `adjustStock` — sobre todo el ajuste negativo que no puede
  bajar de lo reservado.
- Que un `staff` no pueda ajustar inventario (autorización de la acción).
