# Plan de pruebas — tienda, pedidos, pagos y confirmación

> 2 de septiembre de 2026. Complementa [PLAN-PRUEBAS.md](PLAN-PRUEBAS.md), que cubre las tres capas
> rápidas (dominio, base, componente). Esto es la cuarta capa: **navegador real, dos apps
> levantadas y Stripe de verdad**.
>
> Estado de lo que ya se verificó a mano: [PAGOS-VERIFICACION.md](PAGOS-VERIFICACION.md).

---

## 1. Por qué hay una cuarta capa

Las tres capas existentes son buenas y no atraparon los tres bugs más caros de este mes:

| Bug | Por qué no lo vio ninguna prueba |
|---|---|
| `methodLabel` en `null` tras pagar | todas las pruebas del camino paraban **antes** de que un cobro se liquidara |
| `refund.created` → 500 | hace falta que **dos eventos de Stripe** lleguen a la vez |
| Cancelar dejaba viva la página de cobro | hace falta una **sesión real** de Stripe para ver que no tiene `payment_intent` |

El patrón es el mismo en los tres: **el fallo vive en la costura**, entre la tienda y el admin,
entre el admin y Stripe, o entre dos eventos. Ninguna prueba que se detenga en un lado de la
costura puede verlos.

Esta capa es lenta, necesita red y no corre en CI. A cambio es la única que ejercita el sistema
como lo usa un cliente.

### Lo que NO va aquí

Si algo se puede probar en una capa más barata, va en la capa más barata. Concretamente:

- reglas de precio, stock, estado o dirección → dominio (`vitest`);
- que la API rechace una combinación inválida → base (`vitest` + PGlite);
- que un componente muestre lo que debe → componente (`vitest` + happy-dom);
- que Stripe acepte nuestros parámetros → `test/stripe-sandbox.smoke.test.ts`.

Una prueba E2E que sólo verifica que un botón existe es una prueba de componente cara y frágil.

---

## 2. Cómo se corre

```bash
pnpm dev                          # admin  :3000
pnpm --filter storefront dev      # tienda :3001
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # copia el whsec_ a .env.local
pnpm e2e                          # todas
pnpm e2e e2e/checkout-happy-path.spec.ts     # una
pnpm e2e:ui                       # modo interactivo
```

Requisitos, y cada uno falla con un mensaje que lo dice:

- `.env.local` con `STRIPE_SECRET_KEY` **de prueba** (`sk_test_`/`rk_test_`) y `STRIPE_WEBHOOK_SECRET`;
- `stripe listen` corriendo — si no, `waitForPaymentStatus` lo nombra al expirar;
- `POSTGRES_URL` de **desarrollo** — el setup global escribe, y se niega a correr contra algo que
  parezca producción.

### El inventario se repone solo

`e2e/global-setup.ts` mantiene un producto propio (`E2E-PRUEBA`, categoría Congelado) con 40
unidades disponibles, reponiendo lo que falte con un movimiento `receive` y su nota.

Existe porque sin él **la suite se agota sola**: el camino feliz aparta producto de verdad y no lo
devuelve —el pedido queda pagado, que es el punto—, así que a las pocas corridas falla por falta de
pescado en vez de por un fallo del código. Pasó al escribirla: primera corrida verde, segunda sin
stock.

Dos detalles que costaron una vuelta cada uno:

- **Se mide contra lo disponible, no contra `on_hand`.** Un pedido pagado retiene su reserva hasta
  que se entrega, y `on_hand` sólo baja con un `sale`. Comparando contra `on_hand`, la reposición
  se cree innecesaria mientras `reserved` sube corrida tras corrida, y la suite vuelve a morir en
  silencio semanas después.
- **El producto necesita categoría.** `/search` lista por colección: sin pertenencias existe en la
  API y no aparece en ninguna página.

### Tres trampas del entorno, aprendidas a golpes

1. **Reinicia el dev server del admin antes de una tanda.** Un `next dev` de días deja de recoger
   cambios: el 2 de septiembre un arreglo verificado dejó de aplicarse sin que nada lo dijera, y
   se perdió media hora buscándolo en el código, que estaba bien. Base correcta + consulta correcta
   + respuesta incorrecta = servidor rancio.
2. **`stripe listen` imprime un `whsec_` nuevo cada vez.** Si se reinicia y no se copia, las firmas
   fallan con 400 y parece un bug de la app.
3. **Estas pruebas escriben en la base de desarrollo.** Dejan pedidos y consumen stock de verdad.
   No apuntar nunca a producción.

---

## 3. Los flujos, y qué prueba cada uno

Cinco archivos. La numeración `P#` es la de esta capa; `M#` remite a la matriz de
[PAGOS-VERIFICACION.md](PAGOS-VERIFICACION.md) §6.

### 3.1 `checkout-happy-path.spec.ts` — el camino completo ✅ escrito

Catálogo → ficha → carrito → checkout → Stripe → página del pedido. La única que recorre la cadena
entera.

| # | Afirmación | Por qué importa |
|---|---|---|
| P1 | el pedido queda `paid` **y** `confirmed` | M1 |
| P2 | `amountPaid` **=** `total` del servidor | conciliación: el navegador nunca decide el importe |
| P3 | `methodLabel` = «Tarjeta» | la regresión del bug de septiembre |
| P4 | el stock baja **exactamente una vez** | se aparta al crear; cobrar no debe volver a descontar |
| P5 | la tienda nunca ve la palabra «Stripe» | la costura de `DOCS/PAGOS.md` §8.2 |

Verificada: cuatro corridas seguidas en verde, sin reintentos, ~19 s cada una.

### 3.2 `checkout-failures.spec.ts` — cuando el cobro no sale ⬜ por escribir

| # | Escenario | Afirmación | M# |
|---|---|---|---|
| P6 | tarjeta rechazada (`4000…0002`) | el pedido sigue `unpaid`; **el stock sigue apartado** | M2 |
| P7 | 3DS, autenticación completada | acaba `paid` | M3 |
| P8 | 3DS, autenticación abandonada | no avanza; el stock sigue apartado | M3 |
| P9 | fondos insuficientes (`4000…9995`) | mensaje al cliente, pedido intacto | — |
| P10 | cerrar la pestaña en Stripe | nada cambia hasta que vence la sesión | M4 |

En P6 y P8 lo que se prueba **no** es el mensaje de error: es que el pescado siga apartado. Una
tarjeta rechazada no es un pedido abandonado, y liberar el stock ahí le quitaría el producto a
alguien que va a reintentar con otra tarjeta.

### 3.3 `checkout-confirmation.spec.ts` — la vuelta ⬜ por escribir

| # | Escenario | Afirmación | M# |
|---|---|---|---|
| P11 | **con `stripe listen` apagado**, pagar y volver | la página dice **Pagado** igual | M6 |
| P12 | recargar la página del pedido varias veces | el pedido se confirma **una** vez |
| P13 | `session_id` de **otro** pedido en la URL | 403, y nada se confirma |
| P14 | token inventado | 404 limpio |

**P11 es la más importante de esta capa.** Es lo único que prueba `F7.01`: que la página de retorno
concilie por su cuenta. Sin ella, el sistema depende de que el webhook llegue en los 10 s que
Checkout espera antes de redirigir, y «casi siempre» es exactamente lo que este proyecto decidió no
suponer.

P13 es la puerta contra el diputado confundido: el `session_id` viaja en una URL que el cliente
puede editar.

### 3.4 `checkout-validation.spec.ts` — el formulario ⬜ por escribir

| # | Escenario | Afirmación |
|---|---|---|
| P15 | carrito vacío | no hay formulario; no se puede pedir |
| P16 | domicilio sin dirección | error de campo, sin viaje al servidor |
| P17 | código postal fuera de zona | el botón se bloquea y se explica |
| P18 | domicilio dentro de zona | el envío aparece **y entra en el total cobrado** |
| P19 | envío gratis por monto | el total refleja la exención |
| P20 | `lines` manipulado en el DOM | el importe cobrado lo decide el servidor (RN-008) |

P20 es una prueba de seguridad, no de UI: el carrito vive en `localStorage` y viaja como JSON en un
campo oculto. Manipularlo debe cambiar **qué** se pide, nunca **cuánto** cuesta.

### 3.5 `catalog-browsing.spec.ts` — navegar y armar el carrito ⬜ por escribir

| # | Escenario | Afirmación |
|---|---|---|
| P21 | colecciones (fresco / congelado / especiales) | filtran de verdad |
| P22 | producto agotado | no se puede agregar |
| P23 | el carrito sobrevive a una recarga | `localStorage` |
| P24 | cantidades desde la rejilla y desde la ficha | coinciden |
| P25 | paquetes (`/paquete/[handle]`) | se agregan como cualquier producto |

---

## 4. Lo que sigue fuera de esta capa, a propósito

| Qué | Dónde |
|---|---|
| Reembolsos (M12–M16) | por API; ya verificados a mano — §3ter y §3quater |
| Duplicados, fuera de orden, reintentos (M7–M11) | `test/webhook-route.test.ts` y replay firmado |
| Barrido de reservas (M17) | necesita manipular el tiempo; unitario + una corrida manual |
| Eventos asíncronos (M8 real) | sólo aplica cuando se encienda SPEI |
| Cobro en el mostrador | es el panel, con su propia autenticación |

---

## 5. Cómo se escribe una prueba aquí

Cuatro reglas, las cuatro salidas de errores cometidos escribiendo la primera.

**Descubre los datos, no los fijes.** `buyableProduct()` busca un producto con stock en vez de
llevar un UUID escrito. Una prueba anclada a un id falla con «agotado» y hace perder media hora
buscando en el código lo que era un problema del dato.

**Espera condiciones, no segundos.** `waitForPaymentStatus` sondea hasta que el pedido cambia.
Un `waitForTimeout(5000)` o va sobrado o falla el día que Stripe va lento — y cuando falla, miente
sobre la causa.

**Evita las cadenas de navegación.** La primera versión hacía clic en la rejilla y luego en
«Agregar»: dos navegaciones y una hidratación, y pasaba una vez sí y otra no. Ir directo a
`/product/[handle]` quitó la carrera sin quitar cobertura, porque la rejilla ya tiene su prueba de
componente.

**Sin reintentos.** `retries: 0` en la configuración. Una prueba que toca dinero y pasa «a la
segunda» está escondiendo una carrera, que es justo lo que esta capa existe para encontrar.

---

## 6. Criterio de salida

```text
P1–P25 pasan contra el sandbox
P11 pasa con `stripe listen` apagado
ninguna prueba necesita reintento
ni una clave `live` en ninguna parte
```

Cuando eso se cumpla, el flujo de la tienda estará verificado de punta a punta en modo de prueba —
y seguirá **sin** poder cobrarle a nadie de verdad, que es una decisión aparte.
