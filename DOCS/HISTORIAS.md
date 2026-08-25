# Backlog de historias de usuario

Cada historia cita los requisitos que realiza y lleva criterios de aceptación en
formato Dado/Cuando/Entonces. Una historia sin criterios verificables no entra en
una fase.

Índice de IDs en [README.md](README.md). Estimación en puntos (1, 2, 3, 5, 8).

## Cobertura actual

**41 historias · 98 criterios de aceptación · 60 de los 95 requisitos cubiertos.**

El backlog **no es exhaustivo a propósito**. Cubre los requisitos de mayor riesgo
—aquellos donde una implementación ingenua produce un error caro o irreversible:
sobreventa de slot, pérdida de trazabilidad de lote, impuesto mal congelado,
merma sin motivo, errores de validación invisibles.

Los 35 requisitos restantes son mayoritariamente de prioridad `S` o `C`, o CRUD
directo cuya implementación no admite ambigüedad. **Se les escribe historia
cuando se planifica su fase**, no antes: una historia redactada seis meses antes
de tocarse se escribe sobre supuestos que habrán cambiado.

Para ver cuáles faltan en cualquier momento, ejecutar la comprobación 3 de
[README.md](README.md).

---

## Fase 1 — Catálogo y fiscalidad

### HU-ADM-001 — Rol en usuarios administrativos
*Realiza:* `RF-ADM-001`, `RF-ADM-002` · Cierra `DT-009` · **3 pts**

> Como **propietario** quiero que cada usuario administrativo tenga un rol, para
> que el sistema pueda verificar permisos de verdad.

- `CA-HU-ADM-001-1` — **Dado** un usuario con rol `staff`, **cuando** invoca por POST directo una acción reservada a `admin`, **entonces** recibe un error de autorización y la acción no se ejecuta.
- `CA-HU-ADM-001-2` — **Dado** que existe la columna `rol`, **cuando** se llama a `requireRole('admin')`, **entonces** deja de usarse el valor por defecto `'owner'` y se lee el rol real.
- `CA-HU-ADM-001-3` — **Dado** un usuario nuevo, **cuando** se crea sin especificar rol, **entonces** queda como `staff`, el rol de menor privilegio.

### HU-CAT-001 — Categorías del catálogo
*Realiza:* `RF-CAT-001` · **2 pts**

> Como **administrador** quiero organizar el catálogo en categorías, para que el
> cliente encuentre el producto.

- `CA-HU-CAT-001-1` — **Dado** el catálogo, **cuando** creo una categoría hija, **entonces** aparece anidada bajo su madre en el orden indicado.
- `CA-HU-CAT-001-2` — **Dado** una categoría con productos, **cuando** intento borrarla, **entonces** se impide y se explica por qué.

### HU-CAT-002 — Alta de producto con etiquetado de pesca
*Realiza:* `RF-CAT-002`, `RF-CAT-003` · **5 pts**

> Como **administrador** quiero registrar especie, origen, zona FAO y arte de
> pesca, para cumplir el etiquetado obligatorio y para que el cliente sepa qué
> está comprando.

- `CA-HU-CAT-002-1` — **Dado** un producto nuevo, **cuando** lo guardo sin especie ni origen, **entonces** veo un error por campo y no se guarda.
- `CA-HU-CAT-002-2` — **Dado** un producto guardado, **cuando** lo veo en la tienda, **entonces** la ficha muestra especie, origen, zona FAO, método de producción y arte de pesca.
- `CA-HU-CAT-002-3` — **Dado** un producto publicado, **cuando** lo despublico, **entonces** desaparece de la tienda pero sigue existiendo y sus pedidos históricos no cambian.

### HU-CAT-003 — Variantes con unidad, peso y frío
*Realiza:* `RF-CAT-004`, `RF-CAT-005`, `RF-CAT-007` · **5 pts**

> Como **administrador** quiero definir el SKU vendible con su peso, su precio por
> kilo y sus parámetros de frío, para poder venderlo y conservarlo bien.

- `CA-HU-CAT-003-1` — **Dado** "Filete de huachinango", **cuando** creo la variante de 500 g con precio $250, **entonces** se guarda con `unidad_venta='paquete'`, `peso_neto_g=500` y `precio_centavos=25000`.
- `CA-HU-CAT-003-2` — **Dado** una variante con `precio_por_kg`, **cuando** la veo en la tienda, **entonces** se muestra "$500.00/kg" junto al precio del paquete.
- `CA-HU-CAT-003-3` — **Dado** una variante que requiere frío, **cuando** la guardo sin rango de temperatura, **entonces** se rechaza (`INV-VAR-03`).
- `CA-HU-CAT-003-4` — **Dado** una variante, **cuando** guardo `precio_centavos = 0`, **entonces** se rechaza (`INV-VAR-05`).

### HU-CAT-004 — Clase de impuesto obligatoria
*Realiza:* `RF-CAT-013`, `RF-CAT-014`, `RN-003` · **3 pts**

> Como **administrador** quiero declarar la clase de impuesto de cada variante,
> porque en México el pescado va al 0 % pero el salmón ahumado va al 16 %.

- `CA-HU-CAT-004-1` — **Dado** un producto nuevo, **cuando** lo guardo sin clase de impuesto, **entonces** veo un error visible y no se guarda. **No existe valor por defecto.**
- `CA-HU-CAT-004-2` — **Dado** "Filete de huachinango 500 g" con `IVA_0`, **cuando** calculo el precio con impuesto, **entonces** el impuesto es $0.00.
- `CA-HU-CAT-004-3` — **Dado** "Salmón ahumado 200 g" con `IVA_16`, **cuando** calculo el precio con impuesto sobre $180.00, **entonces** el impuesto es exactamente $28.80.
- `CA-HU-CAT-004-4` — **Dado** la clase `IVA_0`, **cuando** consulto su ficha, **entonces** muestra su base legal citable ("LIVA art. 2-A, fracc. I, inciso b").

### HU-CAT-005 — Imágenes con texto alternativo obligatorio
*Realiza:* `RF-CAT-008`, `RNF-A11Y-002` · **2 pts**

- `CA-HU-CAT-005-1` — **Dado** una imagen nueva, **cuando** la guardo sin texto alternativo, **entonces** se rechaza en la base de datos, no solo en el formulario.
- `CA-HU-CAT-005-2` — **Dado** un producto con tres imágenes, **cuando** marco una como principal, **entonces** las otras dejan de serlo automáticamente (`INV-IMG-01`).

### HU-CAT-006 — Búsqueda de catálogo
*Realiza:* `RF-CAT-009`, `RNF-REND-002`, `RNF-REND-004` · **3 pts**

- `CA-HU-CAT-006-1` — **Dado** un catálogo con "Huachinango", **cuando** busco "huachi", **entonces** aparece en los resultados.
- `CA-HU-CAT-006-2` — **Dado** una base **recién migrada** con `pnpm db:migrate`, **cuando** ejecuto `EXPLAIN` sobre la búsqueda, **entonces** usa el índice GIN trigram. Cierra `DT-004`.
- `CA-HU-CAT-006-3` — **Dado** que estoy en la página 3, **cuando** escribo en el buscador, **entonces** vuelvo a la página 1 y la URL refleja la búsqueda.

### HU-CAT-007 — Errores de formulario visibles
*Realiza:* `RNF-A11Y-001` · Cierra `DT-001` · **3 pts**

> Como **usuario del panel** quiero ver por qué falló el formulario, porque hoy la
> validación funciona y no se muestra nada.

- `CA-HU-CAT-007-1` — **Dado** un formulario, **cuando** lo envío con un campo inválido, **entonces** veo el mensaje **junto al campo**.
- `CA-HU-CAT-007-2` — **Dado** un lector de pantalla, **cuando** aparece el error, **entonces** se anuncia por la región `aria-live`.
- `CA-HU-CAT-007-3` — **Dado** un fallo general, **cuando** ocurre, **entonces** se muestra el mensaje de nivel de formulario, no solo los de campo.

> **Por qué esta historia va en la Fase 1 y no "cuando haya tiempo":** todos los
> formularios de las fases 2–7 se escribirán copiando este patrón. Si sale de F1
> con el bug, se replica veinte veces y arreglarlo cuesta veinte veces más.

### HU-CAT-008 — Limpieza de código muerto y moneda
*Realiza:* `RNF-A11Y-005` · Cierra `DT-005`, `DT-008`, `DT-003`, `DT-006` · **3 pts**

- `CA-HU-CAT-008-1` — **Dado** el repositorio, **cuando** busco `fetchFilteredCustomers` o `app/ui/customers/table.tsx`, **entonces** no existen.
- `CA-HU-CAT-008-2` — **Dado** un importe, **cuando** se muestra, **entonces** aparece como `$1,234.56` en formato `es-MX`/`MXN`, no `en-US`/`USD`.
- `CA-HU-CAT-008-3` — **Dado** un registro creado a las 23:30 hora de Ciudad de México, **cuando** veo su fecha, **entonces** es la del día correcto, no la del siguiente.
- `CA-HU-CAT-008-4` — **Dado** un cliente con correo existente, **cuando** intento crear otro con el mismo, **entonces** se rechaza por restricción única.

---

## Fase 2 — Inventario y lotes

### HU-INV-001 — Recepción de mercancía
*Realiza:* `RF-INV-001`, `RF-INV-003` · **5 pts**

- `CA-HU-INV-001-1` — **Dado** una variante, **cuando** recibo 20 unidades con lote, caducidad, temperatura y coste, **entonces** se crea el lote y las existencias muestran 20.
- `CA-HU-INV-001-2` — **Dado** una recepción, **cuando** se guarda, **entonces** el ledger tiene un movimiento `recepcion` de `+20` con lote y coste (`INV-MOV-03`).
- `CA-HU-INV-001-3` — **Dado** una recepción a 8 °C de producto de 0–4 °C, **cuando** la guardo, **entonces** se exige un motivo de excepción que queda registrado (`RNF-FRIO-001`).
- `CA-HU-INV-001-4` — **Dado** un lote, **cuando** pongo caducidad anterior a la recepción, **entonces** se rechaza (`INV-LOT-03`).
- `CA-HU-INV-001-5` — **Dado** un lote existente, **cuando** creo otro con el mismo código para la misma variante, **entonces** se rechaza (`INV-LOT-01`).

### HU-INV-002 — Registro de merma con motivo
*Realiza:* `RF-INV-004`, `RN-006` · **3 pts**

- `CA-HU-INV-002-1` — **Dado** un lote de 20, **cuando** registro 3 de merma por `rotura_cadena_frio`, **entonces** quedan 17 y el ledger suma exactamente 17.
- `CA-HU-INV-002-2` — **Dado** una merma, **cuando** intento guardarla sin motivo, **entonces** la base de datos la rechaza (`INV-MOV-02`).
- `CA-HU-INV-002-3` — **Dado** una merma por rotura de frío, **cuando** se registra, **entonces** aparece una alerta en el panel del día atribuida a su usuario.

### HU-INV-003 — Ledger inalterable
*Realiza:* `RF-INV-003`, `RNF-DAT-001` · **3 pts**

- `CA-HU-INV-003-1` — **Dado** un movimiento, **cuando** intento un `UPDATE` directo con el rol de aplicación, **entonces** la base de datos lo rechaza por permisos.
- `CA-HU-INV-003-2` — **Dado** un error de captura, **cuando** lo corrijo, **entonces** se crea un movimiento compensatorio y el original permanece.

### HU-INV-004 — Asignación FEFO
*Realiza:* `RF-INV-006`, `RF-INV-007`, `RN-004` · **5 pts**

- `CA-HU-INV-004-1` — **Dado** lotes que caducan el 3 y el 5, **cuando** se asigna, **entonces** se consume el del 3 (`RNF-CAD-001`).
- `CA-HU-INV-004-2` — **Dado** un lote `retenido`, **cuando** se ejecuta la asignación, **entonces** se excluye incluso si es el que caduca antes (`INV-LOT-04`).
- `CA-HU-INV-004-3` — **Dado** un lote que caduca hoy, **cuando** se intenta surtir un pedido para mañana, **entonces** no se asigna (`RNF-CAD-002`).

### HU-INV-005 — Caducados y conciliación
*Realiza:* `RF-INV-008`, `RF-INV-012` · **3 pts**

- `CA-HU-INV-005-1` — **Dado** un lote caducado, **cuando** corre el job diario, **entonces** deja de contar como disponible **sin borrarse**.
- `CA-HU-INV-005-2` — **Dado** una discrepancia entre existencias y ledger, **cuando** corre la conciliación, **entonces** genera alerta y **no se autocorrige** (`RNF-DAT-004`).

### HU-INV-006 — Retirada sanitaria
*Realiza:* `RF-INV-010`, `RF-INV-011`, `RNF-CAD-004` · **5 pts**

> Como **propietario** quiero, ante una alerta sanitaria, saber en minutos a qué
> clientes les vendí un lote.

- `CA-HU-INV-006-1` — **Dado** un lote vendido a 40 clientes, **cuando** ejecuto la retirada, **entonces** obtengo la lista con teléfono y pedido en menos de 1 segundo.
- `CA-HU-INV-006-2` — **Dado** un lote retirado, **cuando** hay pedidos aún no entregados con ese lote, **entonces** se separan de los ya entregados.
- `CA-HU-INV-006-3` — **Dado** un lote retenido, **cuando** se surte cualquier pedido, **entonces** nunca se selecciona.

---

## Fase 3 — Entrega

### HU-ENT-001 — Zonas y cobertura por CP
*Realiza:* `RF-ENT-001`, `RF-ENT-002`, `RF-ENT-003`, `RN-010` · **3 pts**

- `CA-HU-ENT-001-1` — **Dado** un CP cubierto, **cuando** lo tecleo, **entonces** veo la zona, la tarifa y el mínimo de pedido.
- `CA-HU-ENT-001-2` — **Dado** un CP sin cobertura, **cuando** lo tecleo, **entonces** veo "aún no llegamos a tu zona" con el CP repetido.
- `CA-HU-ENT-001-3` — **Dado** un CP ya asignado, **cuando** intento asignarlo a otra zona, **entonces** se rechaza (`INV-ZCP-01`).

### HU-ENT-002 — Ventanas y generación de slots
*Realiza:* `RF-ENT-004`, `RF-ENT-005` · **5 pts**

- `CA-HU-ENT-002-1` — **Dado** una ventana "martes 10–13, 12 pedidos", **cuando** se generan slots, **entonces** existe uno por cada martes futuro con capacidad 12.
- `CA-HU-ENT-002-2` — **Dado** un día no laborable, **cuando** se generan slots, **entonces** esa fecha no produce slot.

### HU-ENT-003 — Reserva sin sobreventa
*Realiza:* `RF-ENT-007`, `RN-002`, `RNF-TIEMPO-003` · **5 pts**

- `CA-HU-ENT-003-1` — **Dado** un slot con una plaza libre, **cuando** dos checkouts la piden a la vez, **entonces** uno gana y el otro recibe un mensaje accionable. **Nunca 13 de 12.**
- `CA-HU-ENT-003-2` — **Dado** un slot lleno, **cuando** consulto el checkout, **entonces** no se ofrece.

### HU-ENT-004 — Hora de corte con horario de verano
*Realiza:* `RF-ENT-008`, `RNF-TIEMPO-002` · **3 pts**

- `CA-HU-ENT-004-1` — **Dado** un slot cuyo corte pasó, **cuando** envío el formulario con su `slot_id` desde una página cacheada, **entonces** el servidor lo rechaza.
- `CA-HU-ENT-004-2` — **Dado** un cambio de horario de verano, **cuando** se evalúa el corte, **entonces** la hora local es la correcta.

### HU-ENT-005 — Cancelar un slot concreto
*Realiza:* `RF-ENT-009` · **3 pts**

- `CA-HU-ENT-005-1` — **Dado** el martes 14, **cuando** lo cancelo por tormenta, **entonces** el martes 21 sigue abierto.
- `CA-HU-ENT-005-2` — **Dado** un slot cancelado con pedidos, **cuando** se cancela, **entonces** se avisa a los clientes y se ofrece reprogramar.

---

## Fase 4 — Pedidos

### HU-PED-001 — Crear pedido con snapshot
*Realiza:* `RF-PED-001`, `RF-PED-003`, `RF-PED-009`, `RF-PED-014`, `RN-009` · **8 pts**

- `CA-HU-PED-001-1` — **Dado** un pedido con dos líneas —una `IVA_0` y otra `IVA_16`—, **cuando** se guarda, **entonces** `total = subtotal + impuestos + envío − descuento` valida por restricción (`INV-PED-01`).
- `CA-HU-PED-001-2` — **Dado** un pedido creado, **cuando** cambio después el precio de la variante, **entonces** el pedido histórico no cambia.
- `CA-HU-PED-001-3` — **Dado** un pedido creado, **cuando** reclasifico después la variante de `IVA_0` a `IVA_16`, **entonces** el impuesto del pedido histórico no cambia.
- `CA-HU-PED-001-4` — **Dado** un pedido entregado, **cuando** el cliente edita su dirección, **entonces** la dirección de entrega registrada no cambia (`INV-PED-05`).

### HU-PED-002 — Reserva atómica en el checkout
*Realiza:* `RF-PED-002`, `TR-PED-01` · **5 pts**

- `CA-HU-PED-002-1` — **Dado** un checkout, **cuando** se confirma, **entonces** slot y existencias se reservan en **una sola transacción**.
- `CA-HU-PED-002-2` — **Dado** un fallo a mitad, **cuando** falla, **entonces** no queda ni plaza ocupada ni reserva de existencias.

### HU-PED-003 — Máquina de estados
*Realiza:* `RF-PED-004`, `RF-PED-006`, `RN-011` · **8 pts**

- `CA-HU-PED-003-1` — **Dado** un pedido `entregado`, **cuando** se intenta cualquier transición, **entonces** se rechaza: es terminal.
- `CA-HU-PED-003-2` — **Dado** cualquier transición, **cuando** ocurre, **entonces** se escribe en la bitácora **en la misma transacción** (`INV-EVT-01`).
- `CA-HU-PED-003-3` — **Dado** un pedido `en_ruta`, **cuando** se intenta pasarlo a `pagado`, **entonces** se rechaza por transición ilegal.
- `CA-HU-PED-003-4` — **Dado** toda entrada a `cancelado`, **cuando** ocurre, **entonces** existe un movimiento compensatorio en el ledger. Nunca existencia fantasma.

### HU-PED-004 — Surtido y conversión a venta
*Realiza:* `RF-PED-007`, `TR-PED-05` · **5 pts**

- `CA-HU-PED-004-1` — **Dado** un pedido pagado, **cuando** pasa a preparación, **entonces** se asigna el lote de caducidad más próxima y se escribe `pedido_item_lotes`.
- `CA-HU-PED-004-2` — **Dado** el surtido, **cuando** termina, **entonces** el ledger tiene `venta`, no `reserva`.

### HU-PED-005 — No-entrega y reprogramación
*Realiza:* `RF-ENT-013`, `RF-ENT-014`, `TR-PED-11`, `TR-PED-12`, `TR-PED-13` · **5 pts**

- `CA-HU-PED-005-1` — **Dado** una no-entrega, **cuando** se registra, **entonces** exige motivo y el pedido queda en cola urgente.
- `CA-HU-PED-005-2` — **Dado** un pedido no entregado aún apto, **cuando** lo reprogramo, **entonces** libera el slot viejo y ocupa el nuevo.
- `CA-HU-PED-005-3` — **Dado** un pedido no entregado ya no apto, **cuando** lo cancelo, **entonces** genera merma con motivo `no_entregado` y reembolso.

### HU-PED-006 — Muerte de invoices
*Realiza:* `RNF-REND-003`, `RNF-REND-005`, `RF-REP-002` (§8 del modelo de datos) · Cierra `DT-002`, `DT-007` · **3 pts**

- `CA-HU-PED-006-1` — **Dado** el repositorio, **cuando** busco `invoices` o `revenue`, **entonces** no existen ni como tabla ni como código.
- `CA-HU-PED-006-2` — **Dado** el proyecto, **cuando** ejecuto `typecheck`, `lint` y `build`, **entonces** salen en cero.

### HU-PED-007 — Pedido telefónico
*Realiza:* `RF-PED-013` · **3 pts**

- `CA-HU-PED-007-1` — **Dado** una llamada, **cuando** el staff crea el pedido, **entonces** pasa por la misma reserva atómica y los mismos snapshots que el checkout público.

---

## Fase 5 — Tienda pública

### HU-TDA-001 — Cobertura antes que nada
*Realiza:* `RF-TDA-001` · **3 pts**
- `CA-HU-TDA-001-1` — **Dado** un visitante nuevo, **cuando** entra, **entonces** se le pide el CP antes de navegar el catálogo.

### HU-TDA-002 — Carrito y disponibilidad
*Realiza:* `RF-TDA-004` · **5 pts**
- `CA-HU-TDA-002-1` — **Dado** 2 unidades disponibles, **cuando** añado 5, **entonces** veo la cantidad realmente disponible.
- `CA-HU-TDA-002-2` — **Dado** un producto en el carrito, **cuando** pasa una hora, **entonces** **no** se han reservado existencias.

### HU-TDA-003 — Checkout completo
*Realiza:* `RF-TDA-005`, `RF-TDA-006` · **8 pts**
- `CA-HU-TDA-003-1` — **Dado** un cliente, **cuando** completa dirección, slot y pago, **entonces** el pedido queda creado y recibe confirmación.
- `CA-HU-TDA-003-2` — **Dado** un carrito bajo el mínimo, **cuando** intento pagar, **entonces** se bloquea indicando cuánto falta.

### HU-TDA-004 — Seguimiento y cancelación
*Realiza:* `RF-TDA-007`, `RF-TDA-008`, `RF-PED-011` · **5 pts**
- `CA-HU-TDA-004-1` — **Dado** un pedido, **cuando** lo consulto, **entonces** veo la línea de tiempo derivada de la bitácora.
- `CA-HU-TDA-004-2` — **Dado** un pedido antes del corte, **cuando** lo cancelo, **entonces** se libera plaza y existencias y se reembolsa.
- `CA-HU-TDA-004-3` — **Dado** un pedido pasado el corte, **cuando** intento cancelar, **entonces** se rechaza también en el servidor con explicación.

---

## Fase 6 — Pagos

### HU-PAG-001 — Webhooks idempotentes
*Realiza:* `RF-PAG-004`, `RNF-SEG-004` · **5 pts**
- `CA-HU-PAG-001-1` — **Dado** un webhook, **cuando** llega tres veces, **entonces** produce un único efecto.
- `CA-HU-PAG-001-2` — **Dado** un webhook con firma inválida, **cuando** llega, **entonces** se rechaza sin efecto.

### HU-PAG-002 — Vencimiento de referencia
*Realiza:* `RF-PAG-005` · **3 pts**
- `CA-HU-PAG-002-1` — **Dado** una referencia OXXO impaga, **cuando** llega el corte, **entonces** el pedido se cancela y libera slot y existencias.

### HU-PAG-003 — Reembolsos
*Realiza:* `RF-PAG-006`, `RF-PAG-007` · **5 pts**
- `CA-HU-PAG-003-1` — **Dado** un pedido **entregado**, **cuando** se reembolsa una pieza por calidad, **entonces** el estado de cumplimiento **sigue siendo `entregado`**.
- `CA-HU-PAG-003-2` — **Dado** un pedido, **cuando** la suma de reembolsos supera su total, **entonces** se rechaza (`INV-REM-01`).

---

## Fase 7 — CFDI

### HU-FIS-001 — Timbrado con tasas mixtas
*Realiza:* `RF-FIS-002`, `RF-FIS-004`, `RF-FIS-007` · **8 pts**
- `CA-HU-FIS-001-1` — **Dado** un pedido con una línea al 0 % y otra al 16 %, **cuando** se timbra, **entonces** el PAC de pruebas lo acepta y los importes cuadran al centavo.
- `CA-HU-FIS-001-2` — **Dado** un fallo del PAC, **cuando** ocurre, **entonces** el CFDI queda en `error` y **la entrega no se revierte**.

### HU-FIS-002 — Público en general
*Realiza:* `RF-FIS-003`, `RN-008` · **3 pts**
- `CA-HU-FIS-002-1` — **Dado** un pedido sin datos fiscales, **cuando** se entrega, **entonces** se timbra con RFC `XAXX010101000` y la venta nunca se bloquea.

### HU-FIS-003 — Cancelación y retención
*Realiza:* `RF-FIS-005`, `RF-FIS-006`, `RNF-DAT-003` · **5 pts**
- `CA-HU-FIS-003-1` — **Dado** un CFDI timbrado, **cuando** se cancela con motivo `02`, **entonces** queda registrado y el XML se conserva.
- `CA-HU-FIS-003-2` — **Dado** un cliente que se da de baja, **cuando** se anonimiza, **entonces** sus CFDI persisten 5 años.

---

## Fase 8 — Endurecimiento

### HU-ADM-002 — RBAC en toda la interfaz
*Realiza:* `RF-ADM-003`, `RNF-SEG-002` · **5 pts**
- `CA-HU-ADM-002-1` — **Dado** un `staff`, **cuando** navega el panel, **entonces** no ve la edición de precios **y** un POST directo también se rechaza.

### HU-REP-001 — Panel del día
*Realiza:* `RF-REP-001` · **5 pts**
- `CA-HU-REP-001-1` — **Dado** una jornada, **cuando** abro el panel, **entonces** veo pedidos por slot, merma por motivo, faltantes y lotes que caducan hoy y mañana.

### HU-REP-002 — Rendimiento con volumen
*Realiza:* `RNF-REND-001`, `RNF-REND-003` · **5 pts**
- `CA-HU-REP-002-1` — **Dado** 10⁵ pedidos sembrados, **cuando** abro el tablero, **entonces** responde por debajo de 500 ms en p95.
- `CA-HU-REP-002-2` — **Dado** cualquier listado, **cuando** reviso sus consultas, **entonces** ninguna ejecuta el mismo `WHERE` dos veces.

### HU-ADM-003 — Prueba de restauración
*Realiza:* `RNF-DAT-002` · **3 pts**
- `CA-HU-ADM-003-1` — **Dado** el respaldo, **cuando** se ejecuta la prueba trimestral, **entonces** existe un informe con fecha y duración real medida.

> Un respaldo no probado no es un respaldo. Sin esta historia, `RNF-DAT-002` es humo.
