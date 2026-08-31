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
