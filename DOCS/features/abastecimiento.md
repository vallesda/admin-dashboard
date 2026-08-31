# Abastecimiento: fresco, congelado y por encargo

> Contexto `CAT`. Explicación larga:
> [FLUJO-ABASTECIMIENTO.md](../FLUJO-ABASTECIMIENTO.md).

---

## 1. Para qué existe

> No hay mejillones en la tienda. Si el cliente los pide el **martes**, le
> llegan el **viernes** — la tienda va, los compra y se los lleva.

Ese producto no tiene existencia y no la va a tener hasta que alguien lo pida.
Con el modelo anterior era permanentemente «agotado», y si se forzaba, **el
pedido no se podía completar**: descontar una venta de algo que nunca se reservó
empujaba `reserved` bajo cero y la base rechazaba la transacción entera.

## 2. Qué tiene que ser verdad

| Regla | Enunciado |
|---|---|
| `RN-016` | un producto por encargo no reserva inventario |
| `RN-017` | el abastecimiento de una línea se congela al vender |
| `RN-018` | un pedido se entrega junto; su fecha es la llegada más lejana |
| base | un `preorder` lleva su ciclo completo; un no-`preorder`, ninguno |

## 3. Cómo se decidió

### 3.1 Tres tipos, no dos

| | ¿Reserva? | Agotarse significa |
|---|:--:|---|
| `fresh` | sí | hoy no hubo |
| `stocked` | **sí** | se acabó, pedimos más |
| `preorder` | **no** | nunca se agota: no hay nada que agotar |

**`stocked` no relaja la regla del stock.** Vender 50 kg de camarón congelado
que no se tienen es el mismo problema que venderlos frescos. La alternativa
—modelarlo como «sin límite»— habría roto `RN-003` a cambio de nada. La
diferencia real es de mensaje y de merchandising.

**`preorder` no toca el inventario en absoluto**, y no es una excepción cómoda:
la tienda compra tres kilos *para el pedido #123* y se los entrega. Nunca entran
a la cámara como existencia vendible, así que cero es la verdad durante todo el
proceso.

### 3.2 Un ciclo semanal, no fechas

**La decisión.** Día de corte, hora y día de llegada. Las fechas concretas se
calculan al mirarlas.

**La alternativa descartada.** Guardar fechas. Habría que reescribirlas cada
semana y nadie lo haría; a la tercera semana el catálogo prometería un viernes
que ya pasó.

**Las tres dificultades**, todas resueltas en una función pura:

1. quien mira después del corte ve el ciclo siguiente — prometer una fecha
   incumplible es peor que dar una más lejana;
2. el ciclo puede cruzar el domingo: corte el viernes, llegada el martes;
3. todo se mide en hora del mostrador. Las 23:30 UTC del lunes son todavía
   lunes en Monterrey, y un servidor razonando en UTC ofrecería el ciclo
   equivocado a quien entra de noche.

**El desfase se deduce**, no se fija. México suprimió el horario de verano en
2022, pero un `−6` quemado es una bomba con retardo.

### 3.3 La línea congela su abastecimiento

**La decisión.** `order_items.supply_type` es una copia, como el nombre y el
precio.

**Por qué va más allá de la fidelidad histórica.** Es lo que decide si esa línea
mueve inventario. Leerlo del catálogo actual haría que un congelado que mañana
pase a encargo rompiera un pedido de la semana pasada.

### 3.4 Un pedido se entrega junto

**La decisión.** La fecha del pedido es la más lejana de sus líneas.

**La consecuencia incómoda.** Un carrito con mejillones y atún fresco espera al
viernes entero. Se acepta y **se dice antes de confirmar**: quien agregó
mejillones sin darse cuenta tiene derecho a sacarlos del carrito.

## 4. Cómo se comprueba

| Regla | Prueba | Capa |
|---|---|---|
| el ciclo del ejemplo (martes 18 h → viernes) | `preorder.test.ts` | dominio |
| el corte a las 17:59 alcanza, a las 18:00 no | `preorder.test.ts` | dominio |
| la llegada nunca cae antes que el corte | `preorder.test.ts` — 49 combinaciones | dominio |
| hora del mostrador, no del servidor | `preorder.test.ts` — dos casos en UTC | dominio |
| la fecha no se corre al formatear | `preorder.test.ts` — anclada al mediodía | dominio |
| ciclo completo o ninguno | `test/schema.test.ts` — los dos sentidos | base |
| `RN-016` no reserva | `order-flow.test.ts` — cero movimientos | base |
| se puede completar | `order-flow.test.ts` — el caso que rompía todo | base |
| cancelar no escribe nada | `order-flow.test.ts` | base |

### Lo que **no** está cubierto

- Que la API publique `availableForSale: true` con existencia cero (hoy sólo
  verificado a mano).
- Que el bajo stock ignore los encargos.
- El componente del formulario: que el ciclo aparezca y desaparezca con el tipo.
