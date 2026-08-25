# Flujos del MVP

Cada flujo con actor, disparador, camino normal, caminos alternos y errores.
Los requisitos que realiza se citan entre paréntesis.

Índice de IDs en [README.md](README.md).

---

## 1. Tienda y cliente

### `FLU-TDA-01` — Comprobar cobertura por código postal
**Actor:** Visitante · **Disparador:** entra al sitio o teclea su CP
*Realiza:* `RF-ENT-003`, `RF-TDA-001`

1. El sitio pide el CP antes de que el visitante invierta tiempo navegando.
2. Se busca el CP en `zonas_cp`.
3. **Cubierto:** se guarda la zona en la sesión; se muestran tarifa, mínimo de pedido y próximas ventanas.
4. **No cubierto:** "Aún no llegamos a tu zona", con el CP repetido para que vea que se leyó bien, y captura opcional de correo para avisar.

> Va primero deliberadamente. En entrega local, dejar que alguien llene un
> carrito y descubra en el checkout que no hay cobertura es la peor experiencia
> posible y la principal fuente de abandono.

**Errores:** CP con formato inválido (`INV-DIR-01`) → mensaje inmediato sin recargar.

---

### `FLU-TDA-02` — Explorar catálogo y buscar
**Actor:** Visitante · **Disparador:** navegación o búsqueda
*Realiza:* `RF-CAT-009`, `RF-TDA-002`

1. Listado por categoría, paginado.
2. La búsqueda usa el **patrón ya existente**: `useDebouncedCallback` de 300 ms, reset de `page=1`, estado en la URL (`app/ui/search.tsx`). **Reutilizar, no reimplementar** (`RNF-REND-004`).
3. Coincidencia parcial sobre nombre y especie vía índice trigram (`RNF-REND-002`).
4. Los productos sin existencias se muestran marcados como agotados, no se ocultan: enseñan que el catálogo es real y varía por temporada.

---

### `FLU-TDA-03` — Ver ficha de producto
**Actor:** Visitante · **Disparador:** clic en una tarjeta
*Realiza:* `RF-CAT-003`, `RF-CAT-006`, `RF-TDA-003`

Muestra especie, nombre científico, origen, zona FAO, método de producción y arte
de pesca (`RF-CAT-003`); presentación, estado de conservación, peso neto; precio
del paquete **y precio por kilogramo** (`RF-CAT-006`); imágenes con texto
alternativo; disponibilidad y próxima ventana de entrega.

---

### `FLU-TDA-04` — Añadir al carrito
**Actor:** Visitante · **Disparador:** botón "Añadir"
*Realiza:* `RF-TDA-004`

1. Se valida disponibilidad **en el servidor** en el momento de añadir.
2. El carrito **no reserva existencias**: la reserva ocurre en el checkout (`TR-PED-01`).

> Reservar al añadir al carrito bloquearía producto fresco durante horas por
> carritos abandonados. En perecedero, eso es merma directa.

**Errores:** sin existencias suficientes → mensaje con la cantidad realmente disponible.

---

### `FLU-TDA-05` — Checkout
**Actor:** Cliente · **Disparador:** "Finalizar compra"
*Realiza:* `RF-PED-001`, `RF-PED-002`, `RF-ENT-006`, `RF-ENT-007`, `RF-TDA-005`, `RF-TDA-006`

1. **Dirección** — elegir o crear; se valida que el CP esté cubierto (`RF-CLI-005`).
2. **Slot** — solo se ofrecen slots abiertos, con corte no vencido y capacidad libre (`RF-ENT-006`).
3. **Resumen** — subtotal, impuestos calculados por la clase de cada línea (`RN-003`), envío y mínimo de pedido de la zona.
4. **Pago** — método y confirmación.
5. **Transacción única** (`RNF-TIEMPO-003`): bloqueo del slot, incremento de `reservados`, movimientos de `reserva` en el ledger, creación del pedido y de sus líneas con **snapshot completo**, y `TR-PED-01`.

**Caminos alternos**
- Slot ocupado entre el paso 2 y el 5 → error accionable y vuelta a elegir slot. Nunca sobreventa (`INV-SLOT-01`).
- Corte vencido durante el proceso → el slot deja de ser válido; se revalida **en servidor** (`RNF-TIEMPO-002`).
- Existencias insuficientes → se indica la línea concreta.
- Por debajo del mínimo de pedido → se bloquea con el importe que falta.

---

### `FLU-TDA-06` — Seguimiento del pedido
**Actor:** Cliente · **Disparador:** enlace del correo de confirmación
*Realiza:* `RF-PED-016`, `RF-TDA-007`

Línea de tiempo derivada de `pedido_eventos` — la misma fuente que la auditoría
interna, filtrando los metadatos que no son del cliente.

---

### `FLU-TDA-07` — Cancelación por el cliente
**Actor:** Cliente · **Disparador:** "Cancelar pedido"
*Realiza:* `RF-PED-011`, `RN-007`

1. Solo disponible **antes de la hora de corte** del slot.
2. `TR-PED-03` o `TR-PED-04` según haya pago.
3. Libera plaza del slot y existencias; si estaba pagado, reembolso total.

**Errores:** pasado el corte, el botón desaparece y la acción se rechaza también
en el servidor, con explicación de por qué (el producto ya está comprometido).

---

### `FLU-CLI-01` — Alta e inicio de sesión
**Actor:** Visitante · **Disparador:** checkout o "Mi cuenta" · *Realiza:* `RF-CLI-001`

### `FLU-CLI-02` — Gestión de direcciones
**Actor:** Cliente · **Disparador:** "Mis direcciones" · *Realiza:* `RF-CLI-002`, `RF-CLI-003`

Con **referencias visuales destacadas** en el formulario, no escondidas en un
campo opcional al final.

---

### `FLU-FIS-01` — Solicitar factura
**Actor:** Cliente · **Disparador:** marca "Requiero factura" en el checkout
*Realiza:* `RF-FIS-001`

Captura de RFC, razón social, régimen fiscal y CP fiscal — **los cuatro juntos**
(`INV-FIS-02`). Si no los proporciona, el pedido continúa y se timbrará a público
en general (`RN-008`). **La venta nunca se bloquea.**

---

### `FLU-PAG-01` — Confirmación asíncrona de pago
**Actor:** Sistema (webhook) · **Disparador:** notificación del proveedor
*Realiza:* `RF-PAG-004`, `RNF-SEG-004`

1. Verificación de firma.
2. Idempotencia por `UNIQUE (proveedor, referencia_externa)`.
3. `TR-PED-02` si es aprobación; `TR-PED-03` si es rechazo.
4. Correo al cliente.

> Con SPEI y OXXO esto ocurre **horas** después del checkout. Es la razón por la
> que la máquina del dinero es independiente de la del cumplimiento (§4.1 del
> modelo de datos).

### `FLU-PAG-02` — Vencimiento de referencia sin pago
**Actor:** Sistema (job) · **Disparador:** se cumple el plazo o llega el corte
*Realiza:* `RF-PAG-005` · Job idempotente (`RNF-TIEMPO-004`).

---

## 2. Catálogo

### `FLU-CAT-01` — Alta y edición de producto y variantes
**Actor:** admin · **Disparador:** producto nuevo o cambio de precio
*Realiza:* `RF-CAT-002` … `RF-CAT-008`, `RF-CAT-012`, `RF-CAT-014`

1. Identidad: nombre, descripción, categoría, slug.
2. Etiquetado de pesca: especie, científico, origen, zona FAO, método, arte.
3. Variantes: SKU, presentación, conservación.
4. Unidad y peso: `unidad_venta`, `peso_neto_g`, `precio_por_kg`, tolerancia.
5. Frío: rango de temperatura y vida útil.
6. **Fiscal: clase de impuesto (obligatoria, sin valor por defecto), clave ProdServ, clave de unidad.**
7. Imágenes con texto alternativo obligatorio.

**Errores:** guardar sin clase de impuesto → error visible por campo
(`INV-VAR-02`); sin `alt` → rechazo (`INV-IMG-01`).

### `FLU-CAT-02` — Publicar, despublicar y ordenar
**Actor:** admin · **Disparador:** temporada, veda o falta de suministro
*Realiza:* `RF-CAT-010`. Nunca borra: soft delete, para no romper pedidos históricos.

---

## 3. Inventario

### `FLU-INV-01` — Recepción de mercancía
**Actor:** staff · **Disparador:** llega el proveedor
*Realiza:* `RF-INV-001`, `RF-INV-003`

1. Selección de variante y proveedor.
2. Código de lote, fecha de captura, **caducidad**, **temperatura de recepción**, cantidad y coste unitario.
3. Se crea el lote y un movimiento `recepcion` (`INV-MOV-03`).
4. Se actualiza la proyección de existencias.

**Errores:** temperatura fuera de rango → exige motivo de excepción registrado
(`RNF-FRIO-001`); caducidad anterior a la recepción → rechazo (`INV-LOT-03`).

### `FLU-INV-02` — Registro de merma
**Actor:** staff · **Disparador:** caducidad, rotura de frío, daño, descarte
*Realiza:* `RF-INV-004`, `RN-006`

Motivo **obligatorio** del catálogo cerrado (`INV-MOV-02`). Una merma por rotura
de cadena de frío genera alerta en el panel del día (`RNF-FRIO-003`).

### `FLU-INV-03` — Ajuste por conteo físico
**Actor:** admin · **Disparador:** conteo de cierre · *Realiza:* `RF-INV-005`
Genera un movimiento `ajuste` compensatorio. **Nunca se edita el ledger** (`INV-MOV-01`).

### `FLU-INV-04` — Retención y retirada sanitaria de un lote
**Actor:** owner · **Disparador:** alerta del proveedor o de la autoridad
*Realiza:* `RF-INV-010`, `RF-INV-011`, `RNF-CAD-004`

1. El lote pasa a `retenido`: deja de ser asignable de inmediato (`INV-LOT-04`).
2. Barrido `pedido_item_lotes → pedido_items → pedidos → clientes` por el índice `(lote_id)`.
3. Lista de clientes afectados con teléfono y pedido, separando entregados de no entregados.
4. Los no entregados se cancelan con merma; a los entregados se les contacta.
5. El lote pasa a `retirado` y sus existencias se mermanan con motivo trazable.

> **Este es el flujo que justifica toda la arquitectura de lotes.** Si el sistema
> no puede ejecutarlo en minutos, no es apto para producto fresco de origen
> animal. El resto del diseño de inventario existe para que este flujo sea
> posible.

---

## 4. Pedidos y operación

### `FLU-PED-01` — Cierre de corte y hoja de surtido
**Actor:** Sistema + staff · **Disparador:** se alcanza la hora de corte
*Realiza:* `RF-ENT-008`, `RF-ENT-011`, `RF-PED-007`

1. El job cierra el slot (`INV-SLOT-02`).
2. Los pedidos `pagado` pasan a `en_preparacion` (`TR-PED-05`).
3. Los `pendiente_pago` se cancelan y liberan (`TR-PED-03`).
4. Se genera la hoja de surtido agrupada por variante y ordenada por ruta.

Idempotente: ejecutarlo dos veces no duplica nada (`RNF-TIEMPO-004`).

### `FLU-PED-02` — Surtido con asignación FEFO
**Actor:** staff · **Disparador:** abre el pedido en preparación
*Realiza:* `RF-INV-006`, `RF-PED-007`, `RN-004`

1. Por cada línea, se toman lotes por **FEFO estricto** vía el índice parcial (`RNF-CAD-001`).
2. Se excluyen retenidos, retirados y los que caducan antes de la entrega (`RNF-CAD-002`).
3. Se escribe `pedido_item_lotes` y movimientos `venta` (`INV-MOV-04`).
4. La reserva se convierte en venta — **única transición que lo hace** (`TR-PED-05`).
5. Empaque y `TR-PED-06` con temperatura de cámara.

**Errores:** faltante real → `TR-PED-07` con reembolso y merma o devolución a stock según si se manipuló.

### `FLU-PED-03` — Reprogramación tras no-entrega
**Actor:** admin · **Disparador:** decisión sobre un pedido no entregado
*Realiza:* `RF-ENT-014`, `TR-PED-12`

Solo si el producto se mantuvo en frío y `ahora + tránsito < caducidad`. Libera el
slot viejo y ocupa uno nuevo. Si no es reprogramable → `TR-PED-13`: merma con
motivo `no_entregado` y reembolso.

### `FLU-PED-04` — Cancelación administrativa
**Actor:** admin · **Disparador:** faltante, lote retenido, calidad
*Realiza:* `RF-PED-012` · Reembolso + merma o liberación según el estado del producto.

### `FLU-PED-05` — Pedido telefónico
**Actor:** staff · **Disparador:** llamada del cliente
*Realiza:* `RF-PED-013`

Mismo motor que el checkout público: misma reserva atómica, mismos snapshots,
misma máquina de estados. **Canal distinto, reglas idénticas.**

---

## 5. Entrega

### `FLU-ENT-01` — Salida a ruta
**Actor:** staff / repartidor · **Disparador:** carga del vehículo
*Realiza:* `RF-ENT-012`, `RNF-FRIO-001`

Registro de temperatura. **Si está fuera de rango, `TR-PED-08` se bloquea** y
exige motivo de excepción, que queda en el evento.

### `FLU-ENT-02` — Entrega o no-entrega
**Actor:** Repartidor · **Disparador:** llegada al domicilio
*Realiza:* `RF-ENT-013`

- **Entrega:** `TR-PED-10`, evidencia, `entregado_en`, disparo de CFDI si se solicitó.
- **No-entrega:** `TR-PED-11` con **motivo obligatorio** y evidencia. Entra en la cola urgente de `FLU-PED-03`.

### `FLU-ENT-03` — Gestión de zonas, CP, ventanas y capacidad
**Actor:** admin / owner · **Disparador:** planificación semanal
*Realiza:* `RF-ENT-001`, `RF-ENT-002`, `RF-ENT-004`, `RF-ENT-005`

### `FLU-ENT-04` — Cierre o cancelación de un slot concreto
**Actor:** admin · **Disparador:** mal tiempo, no llegó el producto
*Realiza:* `RF-ENT-009`

Afecta **solo a esa fecha**, no a la ventana ni al mismo día de la semana
siguiente. Los pedidos afectados se cancelan o reprograman con aviso al cliente.

---

## 6. Fiscal y administración

### `FLU-FIS-02` — Timbrado y cancelación de CFDI
**Actor:** Sistema / admin · **Disparador:** entrega confirmada
*Realiza:* `RF-FIS-002` … `RF-FIS-007`

1. Se construye el comprobante con las **tasas congeladas por línea** — un mismo CFDI puede mezclar 0 % y 16 % (`RF-FIS-004`).
2. Timbrado con el PAC.
3. Sin datos fiscales → público en general (`RN-008`).
4. Se cuadra el total con el del pedido al centavo (`INV-CFD-02`).
5. Envío de XML y PDF; conservación 5 años (`RNF-DAT-003`).

**Errores:** rechazo del PAC → estado `error` con el mensaje, reintento manual; la
entrega **no se revierte** por un fallo de timbrado.

### `FLU-ADM-01` — Alta de usuario administrativo
**Actor:** owner · **Disparador:** nueva contratación · *Realiza:* `RF-ADM-001`

### `FLU-REP-01` — Panel del día
**Actor:** admin · **Disparador:** apertura de jornada · *Realiza:* `RF-REP-001`

Pedidos por slot y estado · merma del día por motivo · faltantes detectados en
surtido · alertas de cadena de frío · lotes que caducan hoy y mañana.
