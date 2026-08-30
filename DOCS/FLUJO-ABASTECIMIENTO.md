# Cómo funciona el abastecimiento: fresco, congelado y por encargo

> Escrito leyendo el código, y verificado contra la aplicación corriendo.
> Complementa [FLUJO-INVENTARIO-PEDIDO.md](FLUJO-INVENTARIO-PEDIDO.md), que
> explica el inventario y la creación de un pedido cuando sólo existía el
> producto fresco.

---

## 1. El problema que resuelve

Hasta ahora el catálogo suponía una sola respuesta a «¿de dónde sale esto?»:
*está en la cámara*. La pescadería tiene tres, y la tercera no se podía vender:

> No hay mejillones en la tienda. Si el cliente los pide el **martes**, le
> llegan a su casa el **viernes** — la tienda va, los compra, y se los lleva.

Ese producto no tiene existencia y nunca la va a tener hasta que alguien lo
pida. Con el modelo anterior era permanentemente «agotado»: invisible en el
catálogo, imposible de añadir al carrito, y si se forzaba, **el pedido no se
podía completar** porque descontar una venta de algo que nunca se reservó
empujaba `reserved` por debajo de cero y la base rechazaba la transacción
entera.

---

## 2. Los tres abastecimientos

Una columna en `products`, `supply_type`, con tres valores:

| | Qué es | ¿Reserva inventario? | Se agota y… |
|---|---|:--:|---|
| **`fresh`** | la captura del día | **sí** | desaparece: hoy ya no hubo |
| **`stocked`** | congelado y despensa | **sí** | «se acabó, pedimos más» |
| **`preorder`** | por encargo | **no** | nunca se agota: no hay nada que agotar |

Dos decisiones que conviene defender:

**`stocked` no relaja la regla del stock.** Vender 50 kg de camarón congelado
que no se tienen es exactamente el mismo problema que venderlos frescos, así que
reserva igual. La diferencia es de **mensaje y de merchandising**: no desaparece
del catálogo a diario, y quedarse sin él significa otra cosa. Modelarlo como
«sin límite» habría roto `RN-003` a cambio de nada.

**`preorder` no toca el inventario en absoluto.** No es una excepción cómoda: es
lo correcto. La tienda compra tres kilos de mejillones *para el pedido #123* y
se los entrega; nunca entran a la cámara como existencia vendible. El inventario
muestra cero durante todo el proceso, y eso es la verdad. Si sobran dos kilos,
entran como un `receive` manual, que es una operación distinta.

---

## 3. El ciclo de encargo

Se guarda como un **ciclo semanal**, no como fechas:

```text
preorder_cutoff_weekday   2   (martes)
preorder_cutoff_hour     18   (hora del mostrador)
preorder_arrival_weekday  5   (viernes)
preorder_note                 "Llegan directo del muelle."
```

Fechas concretas habría que reescribirlas cada semana y nadie lo haría. El
ciclo se configura una vez y `modules/catalog/preorder.ts` calcula las dos
fechas que ve cada cliente según cuándo mire.

Un `CHECK` obliga a que el ciclo esté completo **si y sólo si** el producto es
por encargo: sin él, un `preorder` a medias enseñaría «llega el …» con un hueco,
y un producto fresco arrastraría un ciclo que alguien leería dentro de seis
meses creyendo que significa algo.

### 3.1 Las tres cosas que lo hacen difícil

**Quien mira después del corte ve el ciclo siguiente.** El miércoles ya no se
alcanza el viernes: el corte es el martes que viene y la entrega el viernes de
después. Prometer una fecha que ya no se puede cumplir es peor que dar una más
lejana.

**El día de llegada puede caer antes que el de corte en la semana.** Corte el
viernes y llegada el martes es un ciclo legítimo que cruza el domingo. Se cuenta
`(llegada − corte + 7) mod 7`, y cuando da cero se entiende como siete: «pide el
martes, llega el martes» es una semana, no cero días.

**Todo se mide en la hora del mostrador.** Una función en Vercel corre en UTC, y
«antes del martes a las 6» significa las 6 de Monterrey. Las 23:30 UTC del lunes
son todavía lunes allí; un servidor que razonara en UTC ofrecería el ciclo
equivocado a quien entra de noche.

El desfase de la zona se **deduce** comparando la hora civil con UTC en vez de
fijarse en una constante. México suprimió el horario de verano en 2022, pero un
`-6` quemado es una bomba con retardo cada vez que un país cambia de opinión.

Todo esto vive en una función pura con **13 pruebas**, entre ellas la de que
la llegada nunca cae antes que el corte para las 49 combinaciones posibles de
días.

---

## 4. Qué pasa cuando alguien pide

```text
El cliente ve                      El sistema hace
────────────────────────────────   ──────────────────────────────────────────
catálogo: «Llega el viernes»       supply.shortNotice, calculado por la API
ficha: «Pídelo antes del martes
  a las 6 p.m. y llega el viernes
  4 de septiembre.»                supply.notice
botón «Agregar» habilitado         availableForSale = true aunque available = 0
carrito                            la línea copia arrivesOn
checkout: «Tu pedido llega el
  viernes 4 de septiembre»         la fecha más lejana de las líneas
```

### 4.1 `availableForSale` deja de significar «hay existencia»

```ts
const availableForSale =
  row.status === 'active' &&
  (row.supplyType === 'preorder' || row.available > 0);
```

Sin esa rama, el único producto que **siempre** se puede pedir habría quedado
agotado para siempre.

### 4.2 Dentro de `createOrder`

Por cada línea, antes de nada, se pregunta de dónde sale el producto:

- **por encargo** → no se consulta existencia, no se reserva, y la línea
  adquiere una fecha: cuándo llega si se pide ahora;
- **fresco o congelado** → el camino de siempre: bloqueo `FOR UPDATE`,
  comprobación de disponible, y un movimiento `reserve`.

El pedido guarda `promised_for` = **la fecha más lejana de sus líneas**, porque
se entrega junto.

### 4.3 La consecuencia incómoda, dicha en voz alta

Un carrito con mejillones (viernes) y atún fresco (hoy) **espera al viernes
entero**. Es lo que pasa cuando se entrega una sola vez, y el checkout lo dice
antes de confirmar:

> **Tu pedido llega el viernes 4 de septiembre**
> Lleva productos por encargo que traemos ese día. El resto de tu pedido se
> entrega junto con ellos.

Alguien que agregó mejillones sin darse cuenta tiene derecho a sacarlos del
carrito antes de comprometerse, no después.

---

## 5. La línea del pedido guarda su abastecimiento

`order_items.supply_type` es una **copia**, igual que el nombre y el precio
(`RN-005`), y por una razón que va más allá de la fidelidad histórica: **es lo
que decide si esa línea mueve inventario.**

Si se leyera del catálogo actual, un congelado que mañana pase a ser de encargo
haría que completar un pedido de la semana pasada intentara descontar existencia
que sí se había reservado — o al revés. Lo que hay que deshacer es lo que se
hizo entonces, no lo que se haría hoy.

De ahí sale `stockBearingLines()`, que es lo que salva el caso mixto:

```ts
// Las líneas que sí movieron inventario. Sin este filtro, un `sale` sobre una
// línea por encargo empujaría `reserved` bajo cero y el CHECK rechazaría la
// transacción entera: un pedido con mejillones no se podría completar.
ne(orderItems.supplyType, 'preorder')
```

**Verificado:** un pedido mixto completado dejó dos movimientos para el atún
(`reserve` y `sale`) y **cero** para los mejillones, con el inventario de éstos
intacto en 0/0.

---

## 6. Lo que cambió fuera del pedido

**El bajo stock ignora los encargos.** Su existencia es cero por definición, así
que estarían permanentemente «por resurtir» y ahogarían la alerta que sí
importa: la del congelador vaciándose. Una alarma que siempre suena es una
alarma que nadie mira.

**El selector de cantidad no se topa en cero** para un encargo: la tienda compra
lo que se pida.

**«Disponible ahora» se volvió mentira** en la ficha de un encargo, y ahora dice
*«Lo conseguimos para ti · Entrega refrigerada»*. La línea existe justamente
para no mentir sobre la disponibilidad.

---

## 7. Un fallo real que apareció probando

La tienda **se cayó entera** —500 en todas las páginas de catálogo— porque un
componente leía `product.supply.type` sobre una respuesta **en caché** de la API
anterior, donde ese campo no existía.

Es el desfase de versiones que este proyecto lleva meses diseñando: la tienda va
a ser un despliegue aparte y va a consumir versiones de la API distintas de la
que se escribió con ella. Un campo de presentación que falta debe **degradar, no
tumbar el catálogo**.

La corrección hace `supply` opcional en el tipo del cliente y añade `supplyOf()`,
que devuelve `fresh` por omisión — que es lo que era todo el catálogo antes de
que el campo existiera. Que el tipo sea opcional obliga a cada uso a tratarlo, y
eso es exactamente lo correcto para un cliente de una API que no controla.

---

## 8. Cómo se configura, en la práctica

1. **Productos → Crear producto**, elegir **Por encargo** en *Abastecimiento*.
2. Aparece el ciclo: día de corte, hora, día de llegada, y una nota opcional
   para el cliente.
3. Publicar el producto.

A partir de ahí no hay nada más que hacer: el producto sale en el catálogo con
su etiqueta, la ficha calcula las fechas para cada visitante, y el mostrador ve
en el pedido *«Por encargo: llega el 4 de septiembre»* — que es la señal de que
lo que toca no es preparar hoy, sino **comprar para esa fecha**.

---

## 9. Lo que este diseño todavía no hace

| Límite | Consecuencia |
|---|---|
| **Un pedido se entrega junto** | mezclar encargo y fresco hace esperar todo. Se avisa, no se resuelve |
| **Sin fecha de compra en el panel** | el mostrador ve cuándo llega, no cuándo hay que ir a comprarlo |
| **Sin agrupación de encargos** | dos pedidos de mejillones para el mismo viernes no se muestran juntos, que es como se compraría |
| **El ciclo es semanal y único** | un producto no puede tener dos ventanas por semana |
| **Sin tope de cantidad por encargo** | el selector permite hasta 99; si el proveedor tiene mínimos o máximos, no se modelan |
| **La fecha del carrito puede envejecer** | quien abandona el carrito el lunes y vuelve el jueves ve una fecha vieja. **No decide nada**: la que vale la calcula `createOrder` al confirmar |

La primera y la tercera son las que el negocio va a pedir primero. La lista de
«qué hay que comprar para el viernes» es, de hecho, la pantalla que hace este
flujo operable a escala — hoy hay que deducirla leyendo pedidos uno por uno.
