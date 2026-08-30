# SRS — Especificación de requisitos

Ecommerce de pescadería · México · B2C · MXN · panel administrativo primero.

Convenciones: [README.md](README.md).  
Lenguaje ubicuo: [GLOSARIO.md](GLOSARIO.md).

Prioridad MoSCoW: `M` imprescindible · `S` importante · `C` deseable · `W` fuera del MVP.

---

## 1. Alcance

### 1.1 Objetivo

Construir una tienda en línea operable desde un panel propio, empezando por el **backoffice** y entregando valor en rebanadas verticales pequeñas.

Orden de producto:

```text
Admin foundation
→ Catalog
→ Inventory
→ Manual Orders
→ Operational Dashboard
→ Storefront
→ Payments
```

El MVP debe permitir vender productos estandarizados de peso/precio fijo sin construir todavía una plataforma genérica.

### 1.2 Superficies

**Admin panel**
: productos, inventario, clientes, pedidos y métricas operativas.

**Storefront**
: catálogo, carrito y checkout sobre los mismos bounded contexts. Se construye después de validar el dominio desde el admin.

### 1.3 Actores

| Actor | Descripción | Rol |
|---|---|---|
| Staff | operación diaria: stock y pedidos | `staff` |
| Administrador | catálogo, ajustes, cancelaciones y operación | `admin` |
| Propietario | todo + usuarios y roles | `owner` |
| Visitante | navega la futura tienda | — |
| Comprador | compra sin requerir cuenta | — |
| Proveedor de pago | sistema externo post-MVP | — |

---

## 2. Reglas de negocio transversales

| ID | Regla |
|---|---|
| `RN-001` | **Un Product es un SKU vendible.** No existe ProductVariant en el MVP. |
| `RN-002` | **El precio se almacena y calcula en centavos enteros.** Nunca se usa `float` para dinero. |
| `RN-003` | **Nunca se vende más de lo disponible.** `reserved <= onHand` siempre. |
| `RN-004` | **Crear/cancelar/completar un pedido actualiza Sales e Inventory atómicamente.** |
| `RN-005` | **OrderItem congela nombre, SKU y precio.** Los pedidos históricos no dependen del Product actual. |
| `RN-006` | **Estado operativo y estado de pago son independientes.** |
| `RN-007` | **Un Product vendido no se borra.** Se archiva. |
| `RN-008` | **Los totales del pedido se calculan en servidor usando precios actuales del catálogo al crear la orden.** El cliente no envía el total autoritativo. |
| `RN-009` | **Toda modificación de inventario deja un InventoryMovement.** |
| `RN-010` | **El storefront reutiliza el mismo dominio del admin.** No se crea una segunda fuente de verdad. |
| `RN-011` | **El efectivo sólo se cobra en el mostrador.** Un pedido a domicilio se paga en línea; no hay pago contra entrega. |
| `RN-016` | **Un producto por encargo no reserva inventario.** No hay existencia que apartar: la tienda lo compra después de que alguien lo pida. Sus líneas no escriben movimientos de stock ni al vender ni al cancelar. |
| `RN-017` | **El abastecimiento de una línea se congela al vender.** Como el nombre y el precio (`RN-005`): decide si esa línea mueve inventario, y cambiar el producto después no debe reescribir lo que hay que deshacer. |
| `RN-018` | **Un pedido se entrega junto.** Su fecha prometida es la llegada más lejana de sus líneas, y el checkout lo avisa antes de confirmar. |
| `RN-013` | **El costo del envío lo decide el código postal.** Lo cotiza el servidor desde las zonas configuradas; el cliente nunca lo envía. Es `RN-008` aplicado al envío. |
| `RN-014` | **Un código postal pertenece a una sola zona.** Sin zona activa que lo cubra, no hay entrega — que no es lo mismo que envío gratis. |
| `RN-015` | **Perdonar el envío exige motivo escrito y rol `admin`.** El pedido guarda de qué zona era, qué se habría cobrado y quién decidió no cobrarlo. |
| `RN-012` | **Una entrega a domicilio necesita dirección en campos**, no en texto libre: calle, número exterior, colonia, municipio, estado y código postal de 5 dígitos. El interior y las referencias son opcionales. |

---

## 3. Requisitos funcionales

### 3.1 Identity & Access (`IAM`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-IAM-001` | Autenticar usuarios administrativos por email/password. | M |
| `RF-IAM-002` | Persistir rol `staff`, `admin` u `owner` en el usuario administrativo. | M |
| `RF-IAM-003` | Verificar rol dentro de cada Server Action sensible. | M |
| `RF-IAM-004` | Permitir al owner activar/desactivar usuarios administrativos. | S |

### 3.2 Catalog (`CAT`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-CAT-001` | Crear y editar categorías planas con nombre, slug, orden y estado activo. | M |
| `RF-CAT-002` | Crear Product con SKU, nombre, slug, descripción, categoría, precio y status. | M |
| `RF-CAT-003` | Guardar opcionalmente costo, imagen, unidad de venta y peso neto. | M |
| `RF-CAT-004` | Buscar productos por nombre o SKU y paginar con estado en la URL. | M |
| `RF-CAT-005` | Activar/publicar un Product. | M |
| `RF-CAT-006` | Archivar un Product sin borrar su historia. | M |
| `RF-CAT-007` | Impedir vender Products `draft` o `archived`. | M |
| `RF-CAT-008` | Garantizar SKU y slug únicos. | M |

### 3.3 Inventory (`INV`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-INV-001` | Mantener una fila de Inventory por Product con `onHand`, `reserved` y umbral de bajo stock. | M |
| `RF-INV-002` | Mostrar `available = onHand - reserved`. | M |
| `RF-INV-003` | Recibir stock incrementando `onHand` y registrando movimiento `receive`. | M |
| `RF-INV-004` | Ajustar `onHand` con motivo/nota y movimiento `adjustment`. | M |
| `RF-INV-005` | Reservar unidades al crear un pedido sin permitir `reserved > onHand`. | M |
| `RF-INV-006` | Liberar reserva al cancelar un pedido. | M |
| `RF-INV-007` | Convertir reserva en venta al completar un pedido. | M |
| `RF-INV-008` | Listar productos bajo su `lowStockThreshold`. | S |

### 3.4 Customers (`CLI`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-CLI-001` | Crear Customer con nombre, teléfono y email opcional. | M |
| `RF-CLI-002` | Buscar clientes por nombre, teléfono o email. | M |
| `RF-CLI-003` | Consultar pedidos de un Customer. | S |
| `RF-CLI-004` | No requerir cuenta/password para que exista un Customer. | M |

### 3.5 Sales (`SAL`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-SAL-001` | Crear pedido manual desde el admin para un Customer y uno o más Products. | M |
| `RF-SAL-002` | Generar número de pedido humano único. | M |
| `RF-SAL-003` | Validar Product activo y disponibilidad antes de confirmar la creación. | M |
| `RF-SAL-004` | Calcular `unitPrice`, `lineTotal`, subtotal y total en servidor. | M |
| `RF-SAL-005` | Congelar snapshot de nombre, SKU y precio en OrderItem. | M |
| `RF-SAL-006` | Reservar Inventory en la misma transacción que crea Order/OrderItems. | M |
| `RF-SAL-007` | Listar/buscar/paginar pedidos y abrir su detalle. | M |
| `RF-SAL-008` | Aplicar solo transiciones legales de estado operativo. | M |
| `RF-SAL-009` | Completar un pedido convirtiendo reserva en venta. | M |
| `RF-SAL-010` | Cancelar un pedido no terminal liberando su reserva. | M |
| `RF-SAL-011` | Marcar pago manual como `paid` y registrar `refunded` sin mezclarlo con estado operativo. | M |
| `RF-SAL-012` | Permitir `pickup` o `delivery`; para delivery guardar dirección snapshot en texto. | S |

### 3.6 Admin Read Models (`ADM`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-ADM-001` | Dashboard con pedidos abiertos, ventas del día y productos con bajo stock. | M |
| `RF-ADM-002` | Mostrar pedidos recientes. | M |
| `RF-ADM-003` | Las métricas se derivan de Orders/Inventory; no existe tabla `revenue` del dominio nuevo. | M |
| `RF-ADM-004` | Navegación inicial: Dashboard, Products, Inventory, Orders, Customers. | M |

### 3.7 Storefront (`TDA`) — segunda mitad del MVP

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-TDA-001` | Mostrar solo Products activos. | M |
| `RF-TDA-002` | Mostrar precio, imagen, presentación/peso y disponibilidad. | M |
| `RF-TDA-003` | Mantener carrito de Products y cantidades. | M |
| `RF-TDA-004` | Revalidar disponibilidad y precios en servidor al checkout. | M |
| `RF-TDA-005` | Crear Customer/Order desde checkout usando el mismo Sales service. | M |
| `RF-TDA-006` | No reservar stock al añadir al carrito; reservar solo al crear Order. | M |

### 3.8 Payments (`PAG`) — post-storefront

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-PAG-001` | Crear Payment asociado a Order mediante un provider externo. | S |
| `RF-PAG-002` | Procesar webhooks firmados e idempotentes. | S |
| `RF-PAG-003` | Actualizar `paymentStatus` de Order desde el resultado del provider. | S |
| `RF-PAG-004` | Registrar reembolso sin alterar el estado operativo del pedido. | S |

---

## 4. Máquina de permisos

| Operación | staff | admin | owner |
|---|:--:|:--:|:--:|
| Ver Products/Inventory/Orders/Customers | ✅ | ✅ | ✅ |
| Recibir stock | ✅ | ✅ | ✅ |
| Actualizar flujo operativo de Order | ✅ | ✅ | ✅ |
| Crear/editar/archivar Product | ❌ | ✅ | ✅ |
| Ajustar inventario manualmente | ❌ | ✅ | ✅ |
| Cancelar Order | ❌ | ✅ | ✅ |
| Marcar pago/reembolso manual | ❌ | ✅ | ✅ |
| Gestionar AdminUsers/roles | ❌ | ❌ | ✅ |

La interfaz refleja permisos, pero el enforcement autoritativo es servidor.

---

## 5. Requisitos no funcionales

### 5.1 Seguridad (`SEG`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-SEG-001` | Toda Server Action verifica sesión; acciones privilegiadas usan `requireRole`. | Invocar directamente una acción sin rol suficiente → rechazo sin mutación. |
| `RNF-SEG-002` | Password hash nunca sale en session/read models. | Inspección de sesión y selects. |
| `RNF-SEG-003` | Input externo se valida con Zod en servidor. | Payload inválido no llega al servicio. |
| `RNF-SEG-004` | Reglas de stock, precio y transición no dependen del cliente. | Alterar HTML/payload no permite violarlas. |

### 5.2 Integridad y transacciones (`DAT`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-DAT-001` | Constraints de DB protegen cantidades/precios/estados básicos. | Inserts inválidos fallan. |
| `RNF-DAT-002` | Crear/cancelar/completar Order es transaccional con Inventory. | Inyectar fallo intermedio → rollback completo. |
| `RNF-DAT-003` | Inventory nunca termina con `onHand < 0`, `reserved < 0` o `reserved > onHand`. | Test de integración/concurrencia. |
| `RNF-DAT-004` | Toda migración está versionada en `db/migrations`. | Base limpia puede llegar al schema esperado. |
| `RNF-DAT-005` | Productos/pedidos históricos no dependen de joins mutables para precio/nombre de la venta. | Cambiar Product no altera OrderItem. |

### 5.3 Rendimiento (`REND`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-REND-001` | Listados usan paginación y no cargan tablas completas. | Revisión de query. |
| `RNF-REND-002` | Índices existen en SKU, slug, status, fechas de pedidos y FKs de joins frecuentes. | `EXPLAIN`/schema review. |
| `RNF-REND-003` | Búsqueda y paginación viven en URL, reutilizando el patrón actual. | URL compartible/reload conserva estado. |
| `RNF-REND-004` | Server Components hacen fetch directo; no hay HTTP interno innecesario. | Revisión de arquitectura. |

### 5.4 Accesibilidad (`A11Y`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-A11Y-001` | Formularios tienen labels y errores por campo visibles/anunciados. | Navegación teclado/lector. |
| `RNF-A11Y-002` | Estado no se comunica solo por color. | Revisión visual. |
| `RNF-A11Y-003` | Loading/error states existen en listados principales. | Navegación con conexión lenta/fallo. |

### 5.5 Desarrollo y deploy (`DEV`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-DEV-001` | Cada PR debe pasar `pnpm typecheck`, `pnpm lint`, `pnpm build`. | CI/local. |
| `RNF-DEV-002` | Cada fase termina en una aplicación desplegable; no se acumulan semanas de infraestructura sin UI usable. | Criterio de salida de PLAN. |
| `RNF-DEV-003` | Reglas puras de Order/Inventory tienen tests unitarios; transacciones críticas tienen tests de integración. | Suite verde. |
| `RNF-DEV-004` | `db/schema` y módulos están cortados por bounded context, no por megaarchivos globales. | Revisión de tree/imports. |

### 5.6 Observabilidad (`OBS`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-OBS-001` | Errores de dominio son distinguibles de fallos inesperados. | Mensaje accionable en UI + log técnico. |
| `RNF-OBS-002` | InventoryMovement permite explicar por qué cambió stock. | Recorrer historial de un Product. |

---

## 6. Fuera del alcance inicial

Prioridad `W` hasta evidencia contraria:

- variantes;
- lotes/FEFO/caducidad;
- proveedores;
- múltiples almacenes;
- peso variable;
- autenticación de clientes;
- direcciones guardadas;
- descuentos;
- suscripciones;
- CFDI;
- múltiples monedas;
- rutas/slots;
- multi-tenant;
- microservicios/event bus.

---

## 7. Criterio global de MVP

El MVP está listo cuando:

1. un admin crea Products reales;
2. staff recibe Inventory;
3. staff/admin registra una orden manual y el stock queda reservado;
4. la orden avanza y al completarse descuenta existencias;
5. una cancelación libera stock;
6. el dashboard refleja datos reales;
7. un visitante puede repetir el mismo recorrido desde storefront;
8. el pago se puede integrar sin cambiar Product/Inventory/OrderItem;
9. cada fase fue desplegable y el dominio no depende de `invoices`/`revenue`.
