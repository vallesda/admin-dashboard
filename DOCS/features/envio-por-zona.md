# Envío por zona

> Contexto `DEL`.

---

## 1. Para qué existe

Hasta que esto se construyó, `deliveryFeeCents` valía siempre `0`: **la tienda
regalaba el envío**. Y el reparto no cuesta lo mismo a dos colonias que a otro
municipio.

## 2. Qué tiene que ser verdad

| Regla | Enunciado |
|---|---|
| `RN-013` | el costo del envío lo decide el código postal, y lo cotiza el servidor |
| `RN-014` | un código postal pertenece a una sola zona; sin zona activa, no hay entrega |
| `RN-015` | perdonar el envío exige motivo escrito y rol `admin` |

## 3. Cómo se decidió

### 3.1 Zonas de códigos postales, no radio ni distancia

**La decisión.** Una zona agrupa códigos postales y les pone tarifa.

**Las alternativas descartadas.** Radio en kilómetros —necesita geocodificar
cada dirección y cobra distinto a dos vecinos de la misma calle— y tarifa plana,
que ya se había descartado en la conversación anterior por no distinguir San
Pedro de Santa Catarina.

**Por qué tabla aparte y no un arreglo.** Para poder poner un índice único sobre
el código postal. Si perteneciera a dos zonas no habría respuesta a «¿cuánto
cuesta el envío?», y esa ambigüedad aparece meses después como la queja de
alguien a quien se le cobró distinto que a su vecino.

### 3.2 Fuera de cobertura no es envío gratis

**La decisión.** Tres desenlaces: se cobra, sale gratis, o **no se entrega ahí**.

**Por qué importa la distinción.** Devolver «cero» para un código sin zona haría
que la tienda aceptara pedidos que nadie va a poder entregar. El checkout lo
dice antes y **bloquea el botón**.

### 3.3 El umbral se mide contra la mercancía

**La decisión.** «Gratis a partir de $800» se compara con el subtotal, nunca con
el total.

**Por qué.** Contra el total, $780 de pescado más $50 de envío cruzarían el
umbral, el envío se volvería gratis, y el total volvería a $780 — por debajo del
umbral otra vez. La regla se muerde la cola. Hay una prueba que lo fija.

### 3.4 La exención se aplica encima, no en lugar

**La decisión.** El pedido guarda de qué zona era, qué se habría cobrado, quién
decidió no cobrarlo y por qué.

**Por qué.** Un cero sin más no distingue «promoción por monto» de «el dueño se
lo perdonó a un cliente enojado», y esas dos cosas se auditan distinto. Un
`CHECK` exige que `waived` lleve motivo y importe cero.

**Detalle.** Perdonar un envío que ya era gratis **no** se marca como exención:
mentiría sobre por qué costó cero.

### 3.5 `DEL` no importa `SAL`

**La decisión.** `deleteZone` se apoya en `ON DELETE RESTRICT` y traduce el
rechazo, en vez de consultar `orders` para dar un mensaje más específico.

**Por qué.** Cotizar el envío es una entrada del pedido, igual que el catálogo:
la flecha va `SAL → DEL`. Consultar pedidos desde aquí habría cerrado el ciclo
por comodidad, a cambio de un mensaje algo mejor.

**Lo que costó.** Descubrir que `ON DELETE RESTRICT` levanta el código `23001` y
no `23503` — ver [PLAN-PRUEBAS.md](../PLAN-PRUEBAS.md) §3.

## 3bis. Las zonas del área metropolitana de Monterrey

> Sembradas el 2 de septiembre de 2026 con `pnpm db:seed:zonas`
> (`scripts/seed-delivery-zones.ts`). Antes sólo existía una zona de demo con
> códigos postales de **Ciudad de México**.

Las tarifas salen de los tabuladores de **DERBY** tomando como origen la tienda
en Río Amazonas 132 ote., y **son aproximadas**: el negocio las fijó por tramos,
no calculando distancia por dirección.

| Zona | Tarifa | CP |
|---|--:|---|
| San Pedro · Valle y Campestre | $50 | 66220, 66224, 66225, 66240, 66250, 66263, 66265, 66267, 66268, 66270, 66280 |
| San Pedro · Bosques, Pedregal y San Agustín | $70 | 66230, 66260, 66285, 66287 |
| San Pedro · Valle Oriente, Privanzas y Rosario | $90 | 66235, 66247, 66266, 66277, 66278 |
| San Pedro · Periferia y sierra | $110 | 66290, 66295, 66296, 66297 |
| Monterrey · Colinas de San Jerónimo | $80 | 64630 |
| Monterrey · Colinas del Valle | $100 | 64650 |
| Monterrey · La Estanzuela | $120 | 64984, 64988 |

### El desajuste entre la regla y el modelo

**El negocio piensa en colonias. El sistema cobra por código postal.** Y
`RN-014` no es una preferencia: `delivery_zone_postal_codes` lleva un índice
único sobre `postal_code`, así que un CP pertenece a una zona y sólo a una.

En San Pedro eso choca en cuatro sitios, donde **dos colonias de tramos
distintos comparten CP**:

| CP | Un tramo | Otro tramo | Queda en |
|---|---|---|---|
| 66250 | Jerónimo Siller $50 | Bosques del Valle $70 | **$50** |
| 66270 | Zona Tampiquito $50 | Los Colorines $70 | **$50** |
| 66280 | Balcones del Valle $50 | Pedregal del Valle $70 | **$50** |
| 66260 | Zona San Agustín $70 | Del Valle Oriente $90 | **$70** |

**La decisión del negocio fue que gana la tarifa menor.** Nadie paga de más y la
tienda absorbe la diferencia en los repartos del tramo alto. La alternativa
—redondear hacia arriba— cobraba $20 de más a clientes del tramo barato sin que
pudieran saber por qué.

Tiene una consecuencia que conviene ver escrita: **una misma colonia puede
quedar a dos precios** si sus sectores están en CP distintos. Bosques del Valle
sale a $50 por 66250 y a $70 por 66285. Es el precio de resolver una regla de
colonias con una llave de códigos postales.

La salida definitiva sería resolver la zona por CP **más** colonia. Es una
migración, tocar el checkout para pedir una colonia normalizada, y aceptar que
la gente escribe su colonia de diez maneras distintas. No se hizo.

### Lo que deliberadamente quedó sin cubrir

San Pedro tiene ~54 códigos postales y estas zonas cubren 24. **Los otros 30 no
tienen zona**, y eso es una decisión, no un olvido: el negocio nombró colonias
concretas y sus listas terminan en «etc.». Extrapolar qué tramo le toca a Palo
Blanco o a Carrizalejo sería inventar una tarifa, y una tarifa inventada se
cobra igual de bien que una decidida — sólo se nota cuando alguien se queja.

Sin zona, la tienda ofrece recoger en tienda, que es un hueco honesto. El seed
imprime la lista de los 30 en cada corrida para triarlos desde el panel.

**Cuatro puntos siguen abiertos**, y el seed también los imprime:

- **La Rioja ($120)** — no se confirmó su CP; se sembró sólo La Estanzuela.
- **Valle Poniente ($90)** — figura como **66233, en San Pedro**, no en
  Monterrey, donde el negocio la listó.
- **Centrito del Valle ($50)** — es la zona comercial dentro de Del Valle, no un
  CP propio; queda cubierta por 66220 si es a eso a lo que se refiere.
- **Envíos foráneos** — «según peso y destino» no es una zona: es otra regla, y
  este modelo no la expresa.

Ninguna zona lleva umbral de **envío gratis**: el negocio no fijó ninguno para
éstas, y el seed nunca sobrescribe el que alguien ponga a mano en el panel.

### La zona de demo que sobra

Sigue existiendo **«Centro y Roma»** con los CP `06500`, `06700` y `06000`. Son
de **Ciudad de México** —Roma y Centro—, datos de prueba de antes de que hubiera
zonas reales. No estorba porque ningún cliente de Monterrey escribirá esos
códigos, pero conviene borrarla desde el panel para que el listado diga la
verdad. El seed no la toca: borrar una zona que alguien pudo crear a propósito
no es trabajo de un script.

### Por qué el seed no usa `ON CONFLICT`

`delivery_zones.name` **no tiene índice único**, así que un
`INSERT … ON CONFLICT DO NOTHING` no dispara nunca: crea una zona nueva en cada
corrida y luego muere al reinsertar los códigos postales, que sí son únicos. La
primera versión de este script hacía exactamente eso —y decía «idempotente» en
su propia cabecera—. Ahora busca por nombre antes de decidir, y si encuentra dos
zonas con el mismo nombre se detiene en vez de adivinar cuál es la buena.

---

## 4. Cómo se comprueba

| Regla | Prueba | Capa |
|---|---|---|
| tarifa de zona | `quote.test.ts` + `zone-flow.test.ts` | ambas |
| gratis en el umbral, no un centavo antes | `quote.test.ts` | dominio |
| el umbral no se paga a sí mismo | `quote.test.ts` | dominio |
| fuera de cobertura ≠ gratis | `quote.test.ts` + `zone-flow.test.ts` | ambas |
| un CP en una sola zona | `test/schema.test.ts` (índice) + `zone-flow.test.ts` (mensaje) | base |
| reordenar sin chocar consigo misma | `zone-flow.test.ts` | base |
| desactivar deja de cotizar sin borrar | `zone-flow.test.ts` | base |
| no se borra una zona usada | `zone-flow.test.ts` | base |
| exención: sólo si había algo que cobrar | `quote.test.ts` | dominio |
| CP de 5 dígitos | `test/schema.test.ts` | base |

### Lo que **no** está cubierto

- Que `createOrder` cotice de verdad y guarde el motivo (verificado a mano).
- Que un `staff` no pueda perdonar el envío.
- El componente de cotización en vivo del checkout.

### Deuda conocida

Las zonas cargadas son de **Ciudad de México**, de cuando se probó el módulo.
Mientras sigan así, el checkout a domicilio le dice «no entregamos ahí» a todo
cliente de Nuevo León.
