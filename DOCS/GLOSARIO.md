# Glosario — lenguaje ubicuo

Este documento define el vocabulario canónico del negocio. Los nombres de interfaz están en español y los identificadores de código/base de datos en inglés.

DDD depende de que “producto”, “inventario” o “pedido” signifiquen lo mismo en conversación, documentación, código y tests.

---

## 1. Convención de idioma

| Negocio / UI | Código | Persistencia |
|---|---|---|
| Usuario administrativo | `AdminUser` | `admin_users` |
| Categoría | `Category` | `categories` |
| Producto | `Product` | `products` |
| Inventario | `Inventory` | `inventory` |
| Movimiento de inventario | `InventoryMovement` | `inventory_movements` |
| Cliente | `Customer` | `customers` |
| Pedido | `Order` | `orders` |
| Línea de pedido | `OrderItem` | `order_items` |
| Pago | `Payment` | `payments` |

La UI puede decir “pedido”; el código dice `Order`. No se mezclan `pedido`, `order`, `sale` y `invoice` para representar la misma cosa.

---

## 2. Catálogo

### Producto — `Product`

Unidad comercial **vendible directamente** en el MVP.

Ejemplo:

```text
Salmón premium 500 g
SKU: SAL-500
Precio: $349.00
```

“Salmón premium 1 kg” es otro Product/SKU.

Un Product no es una especie abstracta ni un contenedor de variantes.

### SKU — `sku`

Identificador comercial único de un Product vendible.

No cambia para reutilizarlo con otro producto.

### Categoría — `Category`

Agrupa productos para administración y storefront. En el MVP es plana; jerarquía de categorías queda fuera.

### Producto activo — `status = active`

Puede ofrecerse y venderse si además hay inventario disponible.

### Producto borrador — `status = draft`

Existe en el admin pero no se vende.

### Producto archivado — `status = archived`

Ya no se vende. Se conserva porque puede aparecer en pedidos históricos.

### Precio — `priceCents`

Precio actual del Product, en centavos enteros.

`34900 = $349.00 MXN`.

### Costo — `costCents`

Costo interno opcional del Product para margen/operación. No forma parte del precio histórico de la venta.

### Unidad de venta — `unitType`

Forma simple del MVP:

- `piece`: pieza
- `pack`: paquete de peso fijo

### Peso neto — `netWeightGrams`

Peso nominal del paquete en gramos. No representa peso real medido al surtir.

### Variante — `ProductVariant`

**Término fuera del MVP.** Solo se introduce cuando el negocio necesite que una sola ficha de Product posea múltiples SKUs/opciones.

---

## 3. Inventario

### Existencia física — `onHand`

Cantidad de unidades físicas bajo control del negocio.

### Reservado — `reserved`

Unidades comprometidas por pedidos abiertos y todavía no convertidas en venta.

### Disponible — `available`

Valor derivado:

```text
available = onHand - reserved
```

No se persiste como tercera fuente de verdad.

### Movimiento de inventario — `InventoryMovement`

Hecho que explica un cambio de `onHand` y/o `reserved`.

Tipos MVP:

- `receive`
- `adjustment`
- `reserve`
- `release`
- `sale`

### Recepción — `receive`

Aumenta `onHand`.

### Ajuste — `adjustment`

Corrección explícita de `onHand` por conteo, daño u otra diferencia operativa. Siempre requiere nota.

### Reserva — `reserve`

Aumenta `reserved` sin disminuir `onHand`.

### Liberación — `release`

Disminuye `reserved`, normalmente por cancelación.

### Venta — `sale`

Al completar un pedido disminuye a la vez `onHand` y `reserved`.

### Stock

Se acepta en conversación informal, pero en documentación técnica usar:

- `onHand`
- `reserved`
- `available`

“Stock” por sí solo es ambiguo.

### Lote / FEFO

**Fuera del MVP.** Lote implica trazabilidad de recepción/caducidad y FEFO implica asignación por fecha de expiración. Se agregan cuando la operación los requiera.

---

## 4. Clientes

### Cliente — `Customer`

Persona que compra o para quien se registra un pedido.

En el MVP es contacto, no una cuenta autenticada.

Campos principales:

- nombre;
- teléfono;
- email opcional.

### Cuenta de cliente

**Fuera del MVP.** `Customer` no contiene password, sesión, favoritos ni direcciones guardadas.

---

## 5. Ventas

### Pedido — `Order`

Aggregate root que representa una intención/venta operativa.

No se usa *invoice* como sinónimo.

### Número de pedido — `orderNumber`

Identificador humano secuencial. El `id` técnico sigue siendo UUID.

### Línea de pedido — `OrderItem`

Producto y cantidad incluidos en un Order.

Contiene un **snapshot** del nombre, SKU y precio.

### Snapshot

Valor congelado en el momento de crear la orden.

Ejemplo:

```text
Product.priceCents hoy = 39900
OrderItem.unitPriceCents de agosto = 34900
```

Cambiar Product no cambia la historia.

### Total de línea — `lineTotalCents`

```text
unitPriceCents * quantity
```

### Subtotal — `subtotalCents`

Suma de líneas antes de cargos adicionales.

### Total — `totalCents`

En el MVP:

```text
subtotalCents + deliveryFeeCents
```

No se modelan descuentos/impuestos complejos hasta necesitarlos.

### Estado operativo — `status`

Describe dónde está el trabajo/producto:

- `pending`
- `confirmed`
- `preparing`
- `ready`
- `completed`
- `cancelled`

### Estado de pago — `paymentStatus`

Describe dónde está el dinero, independientemente del estado operativo:

- `unpaid`
- `paid`
- `refunded`

### Cancelación

Transición operativa que termina el Order y libera reservas pendientes.

Cancelar no implica automáticamente “reembolsado”; pago y operación son estados distintos.

### Completar pedido

Convierte la reserva en venta: reduce `onHand` y `reserved`.

### Pedido manual

Pedido creado por staff/admin desde el panel, útil para ventas por WhatsApp, teléfono o mostrador antes de tener storefront.

---

## 6. Fulfillment

### Tipo de entrega — `fulfillmentType`

MVP:

- `pickup`
- `delivery`

### Dirección snapshot — `deliveryAddress`

Texto congelado en Order cuando `fulfillmentType = delivery`.

No requiere todavía un modelo `Address`.

### Ventana de entrega / ruta

**Fuera del MVP inicial.** Si el negocio requiere slots/capacidad/ruteo se convierte en bounded context `DEL`.

---

## 7. Identidad y permisos

### Usuario administrativo — `AdminUser`

Persona que opera el panel. Nunca se usa `Customer` para este propósito.

### Staff

Opera pedidos y recepciones.

### Admin

Además gestiona catálogo, ajustes de inventario y cancelaciones.

### Owner

Además gestiona usuarios y roles.

### RBAC

Role-Based Access Control. La autorización se aplica en servidor dentro de cada mutación, no solo ocultando botones.

---

## 8. Pagos

### Pago — `Payment`

Registro de una operación de un proveedor externo. **Post-MVP**.

### Pago manual

En el admin MVP, `markOrderPaid()` cambia `paymentStatus`; no representa una transacción de gateway.

### Webhook

Notificación firmada de un proveedor de pagos. Se implementa con Route Handler cuando entre `PAG`.

---

## 9. Términos que no se usan

| Evitar | Usar | Razón |
|---|---|---|
| invoice para una venta | Order | invoice pertenece al tutorial legacy |
| variant para cada presentación MVP | Product/SKU | cada SKU es un Product |
| stock como único número | onHand / reserved / available | evita ambigüedad |
| delete product | archive product | conserva historia |
| customer user | Customer / AdminUser | ciclos de vida distintos |
| frontend backend separados | admin/storefront + domain modules | una sola aplicación modular |
| event para cualquier cambio | InventoryMovement o estado explícito | no hay event bus en el MVP |
