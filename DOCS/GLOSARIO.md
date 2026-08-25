# Glosario

Vocabulario **normativo**. Si un término está aquí, se usa así en el código, en
la interfaz y en el resto de los documentos.

Existe porque el dominio mezcla tres vocabularios —pesquero, fiscal mexicano y
técnico— y el código va en español. Sin un glosario normativo, cinco personas
escriben cinco nombres distintos para la misma columna.

## Idioma de los identificadores

**Decisión:** las tablas y columnas del dominio nuevo van **en español**; las
heredadas del tutorial (`users`, `customers`, `invoices`, `revenue`) se quedan en
inglés hasta que mueran o se renombren.

**Motivo:** el núcleo del dominio es fiscal y sanitario mexicano —*merma*, *clase
de impuesto*, *régimen fiscal*, *uso de CFDI*, *clave ProdServ*, *hora de corte*—
y estos términos **no tienen traducción fiel**. Traducirlos introduce ambigüedad
justo donde un error cuesta una multa del SAT o un lote mal rastreado. Además el
producto es monolingüe, así que la interfaz y la base de datos comparten
vocabulario y este glosario tiene una sola columna de traducción, no dos.

**Coste que se acepta:** convivencia de dos idiomas durante las fases 1–4. Se
acota con una frontera explícita (las cuatro tablas heredadas, listadas por
nombre) y se cierra al renombrar `customers` → `clientes` y `users` →
`usuarios_admin`.

**Alternativa descartada:** todo en inglés. Obligaría a inventar traducciones
para conceptos del SAT y a que el formulario en español y la columna en inglés
difieran en cada campo fiscal.

## Dominio pesquero y de inventario

| Término | Identificador | Significado |
|---|---|---|
| **Lote** | `lotes` | Cantidad de producto recibida de un proveedor en una fecha, con una caducidad común. Unidad mínima de trazabilidad. No es lo mismo que SKU. |
| **FEFO** | — | *First Expired, First Out*. Se despacha primero lo que caduca antes. En fresco sustituye a FIFO: lo que entró primero no siempre caduca primero. |
| **Merma** | `movimientos_inventario.tipo = 'merma'` | Producto que se pierde y no se vende: caducidad, rotura de frío, daño, descarte de calidad, no-entrega. **KPI central del negocio.** |
| **Ledger de inventario** | `movimientos_inventario` | Registro *append-only* de todo movimiento de existencias. Nunca se edita; una corrección es un movimiento compensatorio. |
| **Reserva** | `tipo = 'reserva'` | Producto comprometido con un pedido aún no surtido. Con SPEI/OXXO puede vivir 24 h. |
| **Presentación** | `variantes.presentacion` | Forma en que se vende: entero, entero limpio, filete, lomo, rodaja, pulpa, vivo, preparado. |
| **Estado de conservación** | `variantes.estado_conservacion` | fresco · refrigerado · congelado · ultracongelado. |
| **Vida útil** | `variantes.vida_util_horas` | Horas que el producto aguanta desde recepción en condiciones correctas. |
| **Cadena de frío** | — | Mantenimiento continuo de temperatura desde recepción hasta entrega. Su rotura es merma total. |
| **Retirada sanitaria** | `FLU-INV-04` | Retirar del mercado un lote por alerta sanitaria, y avisar a los clientes que lo recibieron. |
| **Zona FAO** | `productos.zona_fao` | Área de captura, dato de etiquetado obligatorio en pesca. |
| **Arte de pesca** | `productos.arte_pesca` | Método de captura (palangre, cerco, trampa). Dato de etiquetado. |

## Dominio fiscal mexicano

| Término | Identificador | Significado |
|---|---|---|
| **CFDI** | `cfdi` | Comprobante Fiscal Digital por Internet. La factura electrónica mexicana. Versión 4.0. |
| **PAC** | — | Proveedor Autorizado de Certificación. Tercero que timbra el CFDI ante el SAT. |
| **Timbrar** | `cfdi.estado = 'timbrado'` | Obtener del PAC el sello y el UUID fiscal que hacen válido el comprobante. |
| **UUID fiscal** | `cfdi.uuid_fiscal` | Folio fiscal de 36 caracteres que identifica el CFDI ante el SAT. |
| **RFC** | `datos_fiscales.rfc` | Registro Federal de Contribuyentes. |
| **Régimen fiscal** | `datos_fiscales.regimen_fiscal` | Clave de 3 dígitos del régimen del receptor. CFDI 4.0 exige que coincida con la Constancia de Situación Fiscal. |
| **Uso de CFDI** | `datos_fiscales.uso_cfdi` | Para qué usará el receptor el comprobante (`G01` adquisición de mercancías, `S01` sin efectos fiscales). |
| **Público en general** | RFC `XAXX010101000` | Receptor genérico cuando el cliente no solicita factura. **Nunca se bloquea una venta por falta de datos fiscales.** |
| **Clave ProdServ** | `variantes.clave_prod_serv_sat` | Clave de 8 dígitos del catálogo del SAT que clasifica el producto. |
| **Clave de unidad** | `variantes.clave_unidad_sat` | Unidad de medida SAT: `KGM` kilogramo, `H87` pieza. |
| **Objeto de impuesto** | `variantes.objeto_impuesto` | `01` no objeto · `02` sí objeto de impuesto. |
| **Clase de impuesto** | `clases_impuesto` | `IVA_0` o `IVA_16`. **No es una constante del sistema**: ver `RN-003`. |
| **Punto básico (bps)** | `tasa_impuesto_bps` | Centésima de punto porcentual. 0 % = `0`; 16 % = `1600`. Se usan enteros para que el cálculo cuadre al centavo. |

## Dominio de entrega

| Término | Identificador | Significado |
|---|---|---|
| **Zona de entrega** | `zonas_entrega` | Agrupación de códigos postales con la misma tarifa y mínimo de pedido. |
| **Ventana de entrega** | `ventanas_entrega` | **Plantilla** recurrente: "martes 10–13, 12 pedidos, corte a las 20:00 del lunes". |
| **Slot** | `slots_entrega` | **Instancia** de una ventana en una fecha concreta. Es lo que se reserva. |
| **Hora de corte** | `slots_entrega.corte_en` | Instante tras el cual el slot ya no admite pedidos y arranca el surtido. |
| **Surtido** | `ST-PED-en_preparacion` | Preparar físicamente el pedido: aquí se asignan lotes por FEFO. |
| **Hoja de ruta** | `FLU-PED-01` | Lista de pedidos de un slot ordenada para el reparto. |
| **No-entrega** | `ST-PED-no_entregado` | Se llegó al domicilio y no se pudo entregar. **No es terminal**: hay que decidir entre reprogramar y mermar. |

## Dominio de pedidos

| Término | Identificador | Significado |
|---|---|---|
| **Folio** | `pedidos.folio` | Identificador legible para humanos: `PES-2026-000481`. Distinto del `id` uuid. |
| **Snapshot** | `pedido_items.*_snapshot` | Copia congelada de un dato en el momento de la compra. Cambiar el precio o la tasa hoy no debe reescribir la historia. |
| **Estado de cumplimiento** | `pedidos.estado` | Dónde está el producto. |
| **Estado de pago** | `pedidos.estado_pago` | Dónde está el dinero. **Máquina independiente** de la anterior. |
| **Peso fijo** | `unidad_venta = 'paquete'` | El paquete tiene peso cerrado y precio determinista. Modelo del MVP. |
| **Catch-weight** | — | Cobrar el peso real pesado al surtir. **Fuera del MVP**, pero el esquema lo soporta sin migración. |

## Términos que NO se usan

| No usar | Usar | Por qué |
|---|---|---|
| *stock* como sinónimo de lote | `inventario` (cantidad) / `lotes` (trazabilidad) | Son cosas distintas: un número agregado y una entidad con caducidad. |
| *devolución* | reembolso + merma | Pescado fresco devuelto no se revende jamás. Ver `MODELO-DATOS.md` §4.4. |
| *envío*, *paquetería*, *tracking* | entrega, reparto, seguimiento | No hay transportista externo. El vocabulario de paquetería arrastra conceptos que aquí no existen. |
| *factura* para el pedido | pedido (`pedidos`) / CFDI (`cfdi`) | `invoices` es la tabla del tutorial y muere en F4. |
| *cliente* para el usuario del admin | cliente (compra) / usuario administrativo (opera) | Son dos tablas y dos ciclos de vida. |
