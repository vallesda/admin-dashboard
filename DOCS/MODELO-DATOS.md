# Modelo de datos

Entidades, invariantes y máquina de estados. Convención de IDs en
[README.md](README.md); vocabulario en [GLOSARIO.md](GLOSARIO.md).

---

## 1. Convenciones

**Idioma.** Tablas y columnas del dominio nuevo **en español**; las heredadas
(`users`, `customers`, `invoices`, `revenue`) en inglés hasta morir o
renombrarse. Argumentado en [GLOSARIO.md](GLOSARIO.md).

**Dinero.** Enteros de centavos, sufijo `_centavos`. `moneda char(3) DEFAULT 'MXN'`.
Se mantiene la convención existente (ver `ARCHITECTURE.md` §5).

**Impuestos.** Tasas en **puntos básicos** como enteros (`0`, `1600`), no
`numeric`. Motivo: el cálculo del impuesto debe ser aritmética entera exacta y
reproducible al centavo, que es exactamente lo que el CFDI exige que cuadre.

**Tiempo.** Todo `timestamptz`. `date` solo para fechas de calendario reales
(caducidad, fecha del slot). Presentación siempre con `Intl` en `es-MX` /
`America/Mexico_City`. **Prohibido** `new Date().toISOString().split('T')[0]` —
es `DT-003`, presente hoy en `app/lib/actions.ts:59`.

**Borrado.** Soft delete (`deleted_at`) en catálogo y clientes. Nunca se borra
algo que aparece en un pedido histórico.

**Auditoría.** `created_at` / `updated_at` en toda tabla mutable.

---

## 2. Catálogo

### E-Categoria — `categorias`
`id uuid PK` · `nombre` · `slug UNIQUE` · `parent_id → categorias.id` (SET NULL) ·
`orden smallint` · `activa bool`.
Índice `(parent_id, orden)`.

### E-Producto — `productos`
Identidad comercial: lo que el cliente reconoce ("Huachinango del Pacífico").

`id uuid PK` · `slug text UNIQUE NOT NULL` · `nombre` · `descripcion` ·
`categoria_id → categorias` (RESTRICT) · `especie text` · `nombre_cientifico text NULL` ·
`origen text` · `zona_fao text NULL` · `metodo_produccion enum('salvaje','acuicultura')` ·
`arte_pesca text NULL` · `activo bool` · `created_at/updated_at/deleted_at`.

Índices: `slug`; GIN trigram sobre `nombre` y `especie`; parcial
`WHERE deleted_at IS NULL AND activo`.

> **Por qué producto y variante son tablas distintas.** Además del argumento ya
> escrito en `ARCHITECTURE.md` §5, aquí gana un motivo propio del dominio: los
> campos de **etiquetado obligatorio de pesca** (`RF-CAT-003`) son del producto,
> no del formato. Repetirlos por SKU garantiza que acaben contradiciéndose.

### E-Variante — `variantes`
El SKU vendible ("Filete de huachinango 500 g").

`id uuid PK` · `producto_id → productos` (RESTRICT) · `sku text UNIQUE NOT NULL` ·
`nombre_variante` · `presentacion enum('entero','entero_limpio','filete','lomo','rodaja','pulpa','vivo','preparado')` ·
`estado_conservacion enum('fresco','refrigerado','congelado','ultracongelado')`

**Unidad y peso** (día uno, para catch-weight sin migración — `RF-CAT-005`):
`unidad_venta enum('pieza','paquete','kg') NOT NULL` · `peso_neto_g int NOT NULL` ·
`peso_tolerancia_bps int NOT NULL DEFAULT 0` · `precio_por_kg_centavos int NULL` ·
`precio_centavos int NOT NULL` · `moneda char(3) NOT NULL DEFAULT 'MXN'`

**Fiscal:** `clase_impuesto text → clases_impuesto.clave` (RESTRICT) ·
`clave_prod_serv_sat char(8) NOT NULL` · `clave_unidad_sat char(3) NOT NULL` ·
`objeto_impuesto char(2) NOT NULL DEFAULT '02'`

**Frío:** `requiere_frio bool NOT NULL` · `temp_min_c numeric(4,1)` ·
`temp_max_c numeric(4,1)` · `vida_util_horas int NOT NULL`

`activa bool` · `created_at/updated_at/deleted_at`.

| ID | Invariante |
|---|---|
| `INV-VAR-01` | `unidad_venta='kg' ⇒ precio_por_kg_centavos IS NOT NULL` |
| `INV-VAR-02` | `clase_impuesto NOT NULL` — no hay tasa por defecto (`RN-003`) |
| `INV-VAR-03` | `requiere_frio ⇒ temp_min_c NOT NULL AND temp_max_c NOT NULL AND temp_min_c <= temp_max_c` |
| `INV-VAR-04` | `peso_tolerancia_bps BETWEEN 0 AND 5000` |
| `INV-VAR-05` | `precio_centavos > 0` |

> **El interruptor de catch-weight.** En el MVP el importe sale siempre de
> `precio_centavos`; `precio_por_kg_centavos` se guarda y se muestra ("$1,480/kg")
> pero **no factura**. Cuando se active el peso variable, el importe pasa a
> `round(peso_real_g * precio_por_kg / 1000)` **sin tocar el esquema**. Ese es
> todo el propósito de `RF-CAT-005`.

### E-ImagenProducto — `imagenes_producto`
`id` · `producto_id` (CASCADE) · `variante_id NULL` · `url` · **`alt text NOT NULL`** ·
`orden` · `es_principal bool`.

`INV-IMG-01`: índice único parcial `(producto_id) WHERE es_principal`.

> `alt NOT NULL` es un requisito de accesibilidad (`RNF-A11Y-002`) **codificado en
> el esquema**. Si la base de datos no lo obliga, la mitad de las fichas saldrán
> sin texto alternativo.

### E-ClaseImpuesto — `clases_impuesto`
`clave text PK` (`IVA_0`, `IVA_16`) · `descripcion` · `base_legal text` · `activa bool`.

### E-TasaImpuesto — `tasas_impuesto`
`clase → clases_impuesto` · `tasa_bps int NOT NULL` · `vigente_desde date NOT NULL` ·
`vigente_hasta date NULL`. PK `(clase, vigente_desde)`.

`INV-IMP-01`: no se solapan periodos para una misma clase.

> **Por qué tabla y no un enum con tasa fija.** Una reforma fiscal cambia la tasa
> con fecha de efecto; un enum no puede llevar vigencia y obligaría a desplegar
> código para algo que es un dato. Y como el pedido congela la tasa (§6), un
> cambio futuro nunca reescribe historia.

### E-Proveedor — `proveedores`
`id` · `nombre` · `rfc varchar(13) NULL` · `contacto` · `telefono` ·
`certificaciones text[]` · `activo`.

---

## 3. Lotes e inventario

### E-Lote — `lotes`
`id uuid PK` · `variante_id → variantes` (RESTRICT) · `codigo_lote text NOT NULL` ·
`proveedor_id → proveedores` (RESTRICT) · `fecha_recepcion timestamptz NOT NULL` ·
`fecha_captura date NULL` · `fecha_caducidad date NOT NULL` ·
`temperatura_recepcion_c numeric(4,1) NOT NULL` · `costo_unitario_centavos int` ·
`cantidad_recibida int NOT NULL` · `cantidad_disponible int NOT NULL` ·
`estado enum('disponible','retenido','agotado','retirado') NOT NULL` · `nota` · `created_at`.

Índices:
- `UNIQUE (variante_id, codigo_lote)` — `INV-LOT-01`
- **`(variante_id, fecha_caducidad ASC, id) WHERE estado='disponible' AND cantidad_disponible > 0`**
- `(fecha_caducidad) WHERE estado='disponible'` — job diario de caducados

> Ese índice parcial **es** FEFO. Un `LIMIT n` sobre él resuelve la asignación sin
> ordenar la tabla, y excluye por construcción los lotes retenidos o retirados
> (`RNF-FRIO-002`).

| ID | Invariante |
|---|---|
| `INV-LOT-02` | `0 <= cantidad_disponible <= cantidad_recibida` |
| `INV-LOT-03` | `fecha_caducidad >= fecha_recepcion::date` |
| `INV-LOT-04` | Un lote `retenido` o `retirado` no es asignable a ningún pedido |

### E-Inventario — `inventario`
Proyección de lectura en tiempo constante. Una fila por variante.

`variante_id PK → variantes` · `cantidad_disponible int NOT NULL` ·
`cantidad_reservada int NOT NULL` · `punto_reorden int` · `actualizado_en timestamptz`.

| ID | Invariante |
|---|---|
| `INV-STK-01` | `cantidad_disponible >= 0`, `cantidad_reservada >= 0`, `cantidad_reservada <= cantidad_disponible` |
| `INV-STK-02` | `cantidad_disponible = SUM(movimientos.cantidad)` de esa variante |

> `INV-STK-02` es **la única invariante del sistema que no puede expresarse como
> restricción de base de datos**, y por eso necesita el job de conciliación
> `RNF-DAT-004`. Documentarlo evita que alguien la dé por garantizada.

### E-MovimientoInventario — `movimientos_inventario`
Ledger *append-only*.

`id bigserial PK` · `variante_id → variantes` · `lote_id → lotes NULL` · `tipo enum` ·
`cantidad int NOT NULL` (con signo) · `motivo_merma enum NULL` ·
`referencia_tipo enum('pedido','recepcion','ajuste_manual','conteo','recall') NULL` ·
`referencia_id uuid NULL` · `costo_unitario_centavos int NULL` ·
`usuario_id → usuarios_admin NULL` · `nota text` · `creado_en timestamptz NOT NULL DEFAULT now()`.

`tipo`: `recepcion` · `reserva` · `liberacion_reserva` · `venta` · **`merma`** ·
`ajuste` · `devolucion_a_stock` · `transferencia`.

`motivo_merma`: `caducidad` · `rotura_cadena_frio` · `daño_manipulacion` ·
`descarte_calidad` · `no_entregado` · `muestra` · `robo_perdida`.

| ID | Invariante |
|---|---|
| `INV-MOV-01` | Append-only: `UPDATE`/`DELETE` revocados al rol de aplicación |
| `INV-MOV-02` | `tipo='merma' ⇒ motivo_merma NOT NULL AND cantidad < 0` |
| `INV-MOV-03` | `tipo='recepcion' ⇒ cantidad > 0 AND lote_id NOT NULL AND costo_unitario_centavos NOT NULL` |
| `INV-MOV-04` | `tipo IN ('venta','merma') ⇒ lote_id NOT NULL` |
| `INV-MOV-05` | `referencia_tipo NOT NULL ⇒ referencia_id NOT NULL` |
| `INV-MOV-06` | `cantidad <> 0` |

Índices: `(variante_id, creado_en DESC)` · `(referencia_tipo, referencia_id)` ·
`(lote_id)` · `(creado_en) WHERE tipo='merma'`.

> **Por qué `merma` sin motivo está prohibido por `CHECK` y no por validación.**
> En una pescadería la merma es el KPI que decide si el negocio gana dinero. Sin
> motivo obligatorio nunca se sabrá si el problema es la compra, el frío o la
> demanda — y una validación de aplicación se puede saltar; una restricción de
> base de datos, no.
>
> **Por qué `reserva`/`liberacion_reserva` son tipos del ledger.** Con pago
> diferido (SPEI, OXXO) una reserva puede vivir 24 h. Si solo existiera como
> número en `inventario`, nadie podría explicar por qué había 20 disponibles y
> solo 12 vendibles a las tres de la tarde. Con el ledger, es una consulta.

---

## 4. Máquina de estados del pedido

### 4.1 Dos máquinas ortogonales

`pedidos.estado` (**cumplimiento**) y `pedidos.estado_pago` (**dinero**) son
independientes.

> **Argumento.** Si el reembolso fuera un estado del pedido harían falta estados
> producto-cruz: `entregado_reembolsado_parcial`, `cancelado_reembolsado`,
> `no_entregado_pendiente_reembolso`… y cada regla de la interfaz tendría que
> enumerarlos. En este negocio el caso es cotidiano: un pedido **entregado** al
> que se le reembolsa una pieza en mal estado sigue siendo, operativa y
> fiscalmente, un pedido entregado — el lote salió, la merma está registrada, el
> CFDI está timbrado. Cambiarle el estado de cumplimiento falsearía la operación.
> Además, con SPEI y OXXO el pago llega horas después de crear el pedido: la
> máquina del dinero avanza a su ritmo.

Se acoplan **solo en dos puntos declarados**: `estado_pago='pagado'` habilita
`TR-PED-02`; `estado_pago='fallido'` o el vencimiento disparan `TR-PED-03`.

### 4.2 Estados de cumplimiento

| Estado | Significado | Existencias | Terminal |
|---|---|---|:--:|
| `ST-PED-pendiente_pago` | Creado; slot y existencias **reservados**; esperando confirmación | reservado | no |
| `ST-PED-pagado` | Pago confirmado, aún antes del corte; el cliente puede cancelar | reservado | no |
| `ST-PED-en_preparacion` | Pasó el corte; se surte; **aquí se asignan lotes por FEFO** | vendido | no |
| `ST-PED-listo_para_ruta` | Empacado y en cámara, esperando salida | vendido | no |
| `ST-PED-en_ruta` | El repartidor salió; registrada hora y temperatura | vendido | no |
| `ST-PED-entregado` | Entregado y confirmado; dispara CFDI si se solicitó | vendido | **sí** |
| `ST-PED-no_entregado` | Se llegó y no se pudo entregar | vendido | no |
| `ST-PED-cancelado` | Terminado sin entrega, con motivo | liberado o merma | **sí** |

### 4.3 Transiciones legales

| ID | De → A | Disparador | Efecto obligatorio |
|---|---|---|---|
| `TR-PED-01` | — → `pendiente_pago` | checkout confirmado | reserva atómica de slot y de existencias |
| `TR-PED-02` | `pendiente_pago` → `pagado` | webhook del proveedor o confirmación manual | `pagado_en`; `estado_pago='pagado'` |
| `TR-PED-03` | `pendiente_pago` → `cancelado` | pago fallido, referencia vencida, corte alcanzado sin pago, o el cliente | liberación de reserva y de plaza |
| `TR-PED-04` | `pagado` → `cancelado` | cliente, **antes del corte** | liberación + reembolso total |
| `TR-PED-05` | `pagado` → `en_preparacion` | hora de corte (job) o inicio manual del surtido | asignación FEFO; ledger a `venta` |
| `TR-PED-06` | `en_preparacion` → `listo_para_ruta` | fin del empaque | registro de temperatura de cámara |
| `TR-PED-07` | `en_preparacion` → `cancelado` | faltante real, lote retenido, calidad | reembolso; `merma` si ya se manipuló, `devolucion_a_stock` si sigue íntegro y en frío |
| `TR-PED-08` | `listo_para_ruta` → `en_ruta` | carga del vehículo | temperatura de salida; **bloqueada si está fuera de rango** |
| `TR-PED-09` | `listo_para_ruta` → `cancelado` | excepcional (admin) | reembolso + merma |
| `TR-PED-10` | `en_ruta` → `entregado` | confirmación del repartidor | `entregado_en`; evidencia; disparo de CFDI |
| `TR-PED-11` | `en_ruta` → `no_entregado` | ausente / dirección errónea / rechazo | motivo obligatorio; evidencia |
| `TR-PED-12` | `no_entregado` → `listo_para_ruta` | **reprogramación** a nuevo slot | solo si se mantuvo el frío y `now() + tránsito < caducidad`; libera el slot viejo |
| `TR-PED-13` | `no_entregado` → `cancelado` | no reprogramable | `merma` con motivo `no_entregado` + reembolso según política |

**Invariantes de la máquina**

- `INV-EVT-01` Cada transición escribe en `pedido_eventos` **en la misma transacción** que el cambio de estado.
- Ningún camino sale de `entregado` ni de `cancelado`.
- Toda entrada a `cancelado` escribe un movimiento compensatorio en el ledger — liberación o merma. **Nunca se deja existencia fantasma.**
- `TR-PED-05` es la **única** transición que convierte reserva en venta.

### 4.4 Por qué estos estados y no otros

- **No hay `enviado` / `en_tránsito` / `en_oficina`.** No hay paquetería. Copiar
  la máquina de un ecommerce de transportista metería estados inalcanzables y
  ramas muertas en la interfaz.
- **`reprogramado` no es un estado, es `TR-PED-12`.** Reprogramar no cambia la
  naturaleza del pedido: cambia el slot. Como estado obligaría a duplicar toda la
  lógica de `listo_para_ruta`. El histórico queda en `pedido_eventos`, que es
  donde debe estar.
- **`no_entregado` sí es estado, y no es terminal.** Es la diferencia entre un
  ecommerce normal y uno de fresco: el pedido está fuera, la cadena de frío
  corre, y hay que decidir en horas entre reprogramar o mermar. Es una cola de
  trabajo con urgencia, no un final.
- **`reembolsado` no está**: vive en `estado_pago` + `reembolsos` (§4.1).
- **No hay `parcialmente_entregado`.** Con peso fijo, un repartidor y un pedido
  por parada, el pedido es atómico. Un faltante detectado en surtido se resuelve
  antes de salir (`TR-PED-07`), no a mitad de entrega.
- **No hay `devuelto`.** Pescado fresco devuelto no se revende jamás, legalmente
  y por sentido común (`RN-005`). Por eso el modelo ofrece reembolso + merma, y
  `devolucion_a_stock` existe solo para producto **no manipulado y en frío que
  nunca salió**. Copiar aquí el patrón de retail genérico sería un error de
  dominio, no de estilo.
- **El hueco de catch-weight está identificado**: cuando llegue el peso variable
  entra `pesado_pendiente_ajuste` entre `en_preparacion` y `listo_para_ruta`, y
  por eso `peso_real_g` ya existe en `pedido_items`. Documentarlo evita que
  alguien lo "arregle" antes de tiempo.

---

## 5. Entrega

### E-ZonaEntrega — `zonas_entrega`
`id` · `nombre` · `activa` · `costo_envio_centavos` · `minimo_pedido_centavos` ·
`envio_gratis_desde_centavos NULL`.

### E-ZonaCP — `zonas_cp`
**`cp char(5) PK`** · `zona_id → zonas_entrega` (RESTRICT) · `activo bool`.

`INV-ZCP-01`: un código postal pertenece a exactamente una zona.

> **Por qué `cp` es la clave primaria y no un `id` con índice.** Fuerza el
> invariante por construcción. Si el mismo CP pudiera estar en dos zonas, la
> tarifa de envío sería ambigua y la consulta de cobertura tendría que desempatar
> con reglas. La PK lo hace imposible (`RN-010`).

### E-VentanaEntrega — `ventanas_entrega`
Plantilla recurrente.

`id` · `zona_id → zonas_entrega` · `dia_semana smallint 0..6` · `hora_inicio time` ·
`hora_fin time` · `capacidad_pedidos int` · `hora_corte time NOT NULL` ·
`dias_anticipacion smallint NOT NULL DEFAULT 0` · `activa`.

`INV-VEN-01` `hora_inicio < hora_fin` · `INV-VEN-02` `capacidad_pedidos > 0`.

### E-SlotEntrega — `slots_entrega`
Instancia en una fecha concreta. **Es lo que se reserva.**

`id` · `ventana_id → ventanas_entrega` (RESTRICT) · `fecha date NOT NULL` ·
`capacidad int NOT NULL` · `reservados int NOT NULL DEFAULT 0` ·
`corte_en timestamptz NOT NULL` · `estado enum('abierto','cerrado','cancelado')` ·
`motivo_cancelacion NULL`. `UNIQUE (ventana_id, fecha)`.

`INV-SLOT-01` **`reservados <= capacidad`** (CHECK — esto es lo que impide la
sobreventa de reparto, `RN-002`) · `INV-SLOT-02` `estado='abierto' ⇒ now() < corte_en`.

> **Por qué dos tablas y no una.** La plantilla dice la regla ("martes 10–13, 12
> pedidos"); el slot dice lo que pasó ese martes concreto. Se necesita separarlos
> por tres razones operativas reales: (a) poder **cancelar un día** —no llegó la
> lancha, tormenta— sin desactivar la ventana entera; (b) poder **reducir la
> capacidad** de un día puntual; (c) `reservados` necesita un sitio con `CHECK` y
> bloqueo de fila para que dos checkouts simultáneos no ocupen la misma plaza
> (`RNF-TIEMPO-003`). Sin `slots`, cada visita al checkout tendría que contar
> pedidos por agregación y la carrera de concurrencia sería inevitable.

### E-DiaNoLaborable — `dias_no_laborables`
`fecha date PK` · `motivo` · `zona_id NULL` (NULL = todas las zonas).

---

## 6. Pedidos

### E-Pedido — `pedidos`
`id uuid PK` · `folio text UNIQUE NOT NULL` (`PES-2026-000481`) ·
`cliente_id → clientes` (RESTRICT) · `direccion_id → direcciones NULL` (RESTRICT) ·
**`direccion_snapshot jsonb NOT NULL`** · `slot_id → slots_entrega` (RESTRICT) ·
`fecha_entrega date NOT NULL` · `estado enum` (§4) ·
`estado_pago enum('pendiente','autorizado','pagado','fallido','reembolsado','parcialmente_reembolsado')` ·
`metodo_pago enum('mercado_pago','spei','oxxo')` · `subtotal_centavos` ·
`impuestos_centavos` · `envio_centavos` · `descuento_centavos` · `total_centavos` ·
`moneda char(3) DEFAULT 'MXN'` · `requiere_factura bool` · `datos_fiscales_id NULL` ·
`notas_cliente text` · `creado_en` · `actualizado_en` · `pagado_en NULL` ·
`entregado_en NULL` · `cancelado_en NULL` · `motivo_cancelacion NULL`.

| ID | Invariante |
|---|---|
| `INV-PED-01` | `total_centavos = subtotal + impuestos + envio - descuento` (CHECK) |
| `INV-PED-02` | Todos los importes `>= 0` |
| `INV-PED-03` | `estado='cancelado' ⇒ cancelado_en NOT NULL AND motivo_cancelacion NOT NULL` |
| `INV-PED-04` | `estado='entregado' ⇒ entregado_en NOT NULL` |
| `INV-PED-05` | `direccion_snapshot` obligatorio aunque exista `direccion_id` |
| `INV-PED-06` | `fecha_entrega` = fecha del slot referenciado (denormalizado) |

> `INV-PED-05`: si el cliente edita su dirección tres meses después, la evidencia
> de a dónde se entregó no puede cambiar. Es el mismo argumento del snapshot de
> precio, aplicado a la logística.

Índices: `(estado, fecha_entrega)` (tablero) · `(fecha_entrega, slot_id)` (hoja de
ruta) · `(cliente_id, creado_en DESC)` · `(creado_en DESC, id)` (paginación
keyset) · `folio`.

### E-PedidoItem — `pedido_items`
`id` · `pedido_id → pedidos` (CASCADE) · `variante_id → variantes` (RESTRICT)

**Snapshot completo:** `sku_snapshot` · `nombre_snapshot` ·
`presentacion_snapshot` · `unidad_venta_snapshot` · `peso_neto_g_snapshot` ·
`precio_unitario_centavos` · `precio_por_kg_centavos_snapshot NULL` ·
`clase_impuesto_snapshot` · **`tasa_impuesto_bps_snapshot int NOT NULL`** ·
`clave_prod_serv_sat_snapshot` · `clave_unidad_sat_snapshot`

`cantidad int NOT NULL` · `peso_real_g int NULL` · `importe_centavos` ·
`impuesto_centavos`.

| ID | Invariante |
|---|---|
| `INV-ITM-01` | `importe_centavos = precio_unitario_centavos * cantidad` (MVP peso fijo) |
| `INV-ITM-02` | `impuesto_centavos = round(importe_centavos * tasa_impuesto_bps / 10000)` |
| `INV-ITM-03` | `cantidad > 0` |
| `INV-ITM-04` | `peso_real_g IS NULL OR abs(peso_real_g - peso_neto_g_snapshot) <= peso_neto_g_snapshot * peso_tolerancia_bps / 10000` |

> **Por qué se congela la tasa y no solo el precio.** El snapshot de precio ya
> está argumentado en `ARCHITECTURE.md` §5. Aquí es más grave: si alguien
> reclasifica "salmón" de `IVA_0` a `IVA_16` porque añadió una variante ahumada,
> o si el SAT cambia una tasa, los CFDI ya timbrados dejarían de cuadrar con la
> base de datos y la conciliación fiscal sería imposible. **El impuesto de una
> línea es un hecho histórico, no un cálculo derivable** (`RN-009`).

### E-PedidoItemLote — `pedido_item_lotes`
`pedido_item_id → pedido_items` (CASCADE) · `lote_id → lotes` (RESTRICT) ·
`cantidad int NOT NULL`. PK `(pedido_item_id, lote_id)`. Índice `(lote_id)`.

`INV-PIL-01`: `SUM(cantidad) = pedido_items.cantidad` en líneas ya surtidas.

> Esta tabla es la que permite contestar **"¿a qué clientes les vendí el lote
> L-334?"** en una retirada sanitaria. Sin ella el sistema **no es apto para
> producto fresco de origen animal**: la trazabilidad ascendente y descendente es
> una obligación, no una función bonita (`RF-INV-009`, `RF-INV-011`). Su índice
> `(lote_id)` es el que hace ese barrido instantáneo.

### E-PedidoEvento — `pedido_eventos`
Bitácora *append-only* de la máquina de estados.

`id bigserial` · `pedido_id → pedidos` (CASCADE) · `estado_anterior NULL` ·
`estado_nuevo` · `motivo text NULL` · `usuario_id NULL` ·
`metadata jsonb` (temperatura, coordenadas, evidencia, reprogramación) · `creado_en`.

`INV-EVT-01` (§4.3) · `INV-EVT-02` append-only.

> Es a la vez auditoría (`RNF-OBS-001`) y la **línea de tiempo que ve el cliente**
> (`RF-TDA-007`). Una sola fuente para las dos cosas.

### E-Pago — `pagos`
`id` · `pedido_id → pedidos` · `proveedor enum` · `referencia_externa text` ·
`monto_centavos` · `estado` · `payload jsonb` · `creado_en`.

**`UNIQUE (proveedor, referencia_externa)`** = idempotencia de webhooks
(`RNF-SEG-004`). Un proveedor reenvía notificaciones; sin esto se duplican cobros
o transiciones.

### E-Reembolso — `reembolsos`
`id` · `pedido_id` · `pago_id NULL` · `monto_centavos` ·
`motivo enum('cancelacion','no_entregado','calidad','faltante_peso','error_operativo')` ·
`estado` · `referencia_externa` · `usuario_id` · `creado_en`.

`INV-REM-01`: `SUM(reembolsos.monto) <= pedidos.total_centavos`.

---

## 7. Clientes, usuarios y fiscal

### E-Cliente — `customers` → `clientes`

**Qué se conserva:** la tabla y sus `id`, porque son la única clave estable y
porque los índices existentes (incluidos los GIN trigram de `scripts/baseline.ts`)
ya sirven a la búsqueda que la nueva interfaz reutilizará.

Cambios:
- `+ telefono varchar(20) NOT NULL` — sin teléfono no hay entrega local (`RF-CLI-004`)
- `+ UNIQUE (email)` — **hoy no existe** (`db/schema/legacy.ts:33`), nada impide dos clientes con el mismo correo. Es `DT-006`
- `+ auth_user_id NULL`, `+ acepta_marketing bool`, `+ created_at/updated_at/deleted_at`
- `image_url` pasa a admitir `NULL` (hoy es `NOT NULL`): un cliente de pescadería no tiene avatar, y mantenerlo obligatorio obliga a inventar una URL en cada alta
- **Renombrado a `clientes`** con `ALTER TABLE ... RENAME` y, si hace falta, una vista `customers` de compatibilidad durante el despliegue. **No se recrea la tabla**: eso perdería los `id`

> `fetchFilteredCustomers` (`app/lib/data.ts:161`) y `app/ui/customers/table.tsx`
> son código muerto: **se borran, no se migran** (`DT-005`). Sin esta frase
> explícita, alguien invertirá un día en portar un listado que agrega `invoices`,
> una tabla que va a desaparecer.

### E-UsuarioAdmin — `users` → `usuarios_admin`
`+ rol enum('staff','admin','owner') NOT NULL DEFAULT 'staff'` · `+ activo bool` ·
`+ ultimo_acceso timestamptz` · `+ created_at`.

> Esta columna es la que desactiva el fallback `?? 'owner'` de
> `app/lib/auth-guard.ts:52`, que hoy hace que `requireRole()` sea un no-op
> (`DT-009`). Ver [PLAN.md](PLAN.md) §2: sube a la Fase 1.

### E-Direccion — `direcciones`
`id` · `cliente_id → clientes` (CASCADE) · `alias` · `calle` · `numero_ext` ·
`numero_int NULL` · `colonia` · `municipio` · `estado` · `cp char(5) NOT NULL` ·
`referencias text` · `lat/lng numeric NULL` · `es_predeterminada bool` ·
`created_at/deleted_at`.

`INV-DIR-01` `cp ~ '^[0-9]{5}$'` · `INV-DIR-02` único parcial `(cliente_id) WHERE es_predeterminada`.

> `referencias` se destaca en la interfaz porque en México la referencia visual
> ("portón azul, tocar en el 2B") es la diferencia entre entregar y no entregar —
> y la no-entrega de pescado fresco es merma del 100 %.

### E-DatosFiscales — `datos_fiscales`
`id` · `cliente_id → clientes` (RESTRICT) · `rfc varchar(13) NOT NULL` ·
`razon_social text NOT NULL` · `regimen_fiscal char(3) NOT NULL` ·
`uso_cfdi char(3) NOT NULL` · `cp_fiscal char(5) NOT NULL` · `email_facturacion` ·
`created_at/updated_at`.

| ID | Invariante |
|---|---|
| `INV-FIS-01` | `rfc ~ '^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$'` |
| `INV-FIS-02` | RFC, razón social, CP y régimen son obligatorios **juntos**: CFDI 4.0 los valida contra la Constancia de Situación Fiscal |
| `INV-FIS-03` | Un pedido sin datos fiscales se timbra a público en general (`XAXX010101000`) — **nunca se bloquea la venta** (`RN-008`) |

### E-CFDI — `cfdi`
`id` · `pedido_id → pedidos` **UNIQUE** · `uuid_fiscal char(36) UNIQUE NULL` ·
`serie` · `folio` · `estado enum('pendiente','timbrado','cancelado','error')` ·
`total_centavos` · `xml_url` · `pdf_url` · `timbrado_en NULL` ·
`motivo_cancelacion char(2) NULL` · `error_mensaje NULL`.

`INV-CFD-01` `estado='timbrado' ⇒ uuid_fiscal NOT NULL` · `INV-CFD-02`
`cfdi.total_centavos = pedidos.total_centavos` · `INV-CFD-03` XML conservado 5
años aunque el cliente se dé de baja (`RNF-DAT-003`).

---

## 8. Muerte de `invoices` y `revenue`

Tres pasos, con la muerte como **criterio de salida de fase**, no como tarea suelta.

1. **Congelación (F1).** `invoices` deja de recibir escrituras desde
   funcionalidad nueva. La ruta `/dashboard/invoices` sigue viva porque es la
   única prueba funcionando del patrón búsqueda + paginación + `useActionState`,
   y las fases 1–4 la usan como plantilla de referencia.
2. **Deprecación visible (F4).** Al entrar `pedidos`, aviso en el panel;
   `pedidos` pasa a ser la fuente de verdad.
3. **Ejecución (criterio de salida de F4).** Migración con `DROP TABLE invoices`
   y `DROP TABLE revenue`; borrado de `fetchLatestInvoices`, `fetchCardData`,
   `fetchFilteredInvoices`, `fetchInvoicesPages`, `fetchInvoiceById`,
   `createInvoice`, `updateInvoice`, `deleteInvoice`, los tipos correspondientes
   de `definitions.ts` y `app/ui/invoices/` salvo los patrones ya extraídos.

> **No hay ETL.** Los datos de `invoices` son la semilla del tutorial
> (`scripts/seed.ts`), no ventas reales. Sin esta frase explícita, alguien
> escribirá un migrador de facturas ficticias a pedidos reales.
>
> `revenue` se sustituye por una vista materializada `mv_ventas_mensuales` sobre
> pedidos **entregados** — lo que además arregla que hoy el ingreso se calcule
> sobre facturas `paid` que nunca se cobraron de verdad.
