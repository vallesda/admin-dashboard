---
name: Amor a Mar
description: Pescadería en línea donde el catálogo cambia con lo que el mar dio ese día.
colors:
  brand: "#0C473F"
  brand-dark: "#062823"
  brand-soft: "#D1F9E2"
  turquoise: "#21A39E"
  coral: "#ED8268"
  scarlet: "#EF3A3A"
  sun: "#F4E23F"
  background: "#F7F3E1"
  surface: "#FCFAF0"
  foreground: "#0A2622"
  muted: "#4E6963"
  sand: "#E9E2CB"
  border: "#D2C8B7"
  border-strong: "#958E84"
typography:
  display:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "clamp(3.25rem, 8vw, 5.25rem)"
    fontWeight: 300
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "clamp(1.875rem, 4vw, 2.75rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "clamp(1.25rem, 2vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.1em"
rounded:
  sm: "2px"
  DEFAULT: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.background}"
    rounded: "{rounded.DEFAULT}"
    padding: "12px 24px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.brand-dark}"
    textColor: "{colors.background}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.DEFAULT}"
    padding: "12px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.foreground}"
  button-on-brand:
    backgroundColor: "{colors.background}"
    textColor: "{colors.brand}"
    rounded: "{rounded.DEFAULT}"
    padding: "12px 24px"
  button-on-brand-hover:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.foreground}"
  input-field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "44px"
    width: "44px"
  icon-button-hover:
    backgroundColor: "{colors.sand}"
  card-product:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
  chip-seasonal:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  chip-soldout:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  eyebrow:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  eyebrow-sun:
    textColor: "{colors.sun}"
    typography: "{typography.label}"
---

# Design System: Amor a Mar

> **Fuente de verdad: el manual de identidad** (Common Matter, San Pedro Garza
> García, 2017). Colores, tipografías y elementos gráficos salen de ahí, no de
> muestrear el logotipo — que es como se había construido la primera versión de
> este sistema, y daba un verde equivocado y un «oro» que la marca no tiene.
>
> Lo que este documento añade sobre el manual es lo que un manual impreso no
> puede decir: qué combinaciones pasan los contrastes de la web, y cuáles no.

## Overview

**Creative North Star: "La Captura del Día"**

Este no es un catálogo: es el registro de lo que el mar dio hoy. Todo el sistema
visual está construido alrededor de una sola verdad incómoda del negocio — el
inventario es volátil por diseño, una pieza se agota y desaparece, y el producto
que estaba ayer puede no estar mañana. Un anaquel de supermercado esconde eso.
Aquí se convierte en el material con el que se diseña.

De ahí salen las decisiones que parecen austeras y no lo son. La fotografía
ocupa el espacio que en otra tienda ocuparía la decoración, porque la foto es la
única prueba de frescura que un navegador puede transmitir. La superficie es
crema cálida y nunca blanco puro, porque el producto se fotografía sobre hielo y
el blanco puro le roba la temperatura. El verde de marca aparece en bloques
sólidos y completos en vez de en acentos dispersos, para que cada sección
declare de una vez si pertenece a la tienda o a la narrativa. Y el oro —
extraído del mismo logo que el verde — se reserva casi por completo para una
función: decir que algo es de temporada, es decir, que no siempre va a estar.

La tipografía sostiene la misma división del trabajo. Newsreader lleva la voz —
titulares, nombres de sección, la parte editorial. Instrument Sans lleva todo lo
que el comprador tiene que *usar*: precio, cantidad, etiqueta, botón. Mantenerlas
separadas por función y no por gusto es lo que impide que la tienda lea como un
sitio genérico de Tailwind.

**Key Characteristics:**

- El estado del inventario es información de primera clase, nunca una atenuación
  visual.
- Crema cálida dominante (~65–70%), verde de marca en bloques (~20–25%), el
  resto neutros y el oro contado con los dedos de una mano.
- Superficies planas: la profundidad viene de capas tonales y bordes de 1px, no
  de sombras.
- Serif editorial para la voz, sans para la función; nunca se cruzan.
- Una diagonal recortada (`clip-path`) es la única firma geométrica del sistema.
- Fotografía propia y real; jamás stock, jamás ilustración de mariscos.

## Colors

**La paleta es la del manual de identidad** (Common Matter, San Pedro Garza
García, 2017), en sus valores Pantone originales. Siete colores, no dos.

> **Nota sobre lo que había antes.** Este sistema derivaba el verde y un
> «oro» muestreando los píxeles del logotipo en PNG. Las dos deducciones eran
> incorrectas: el verde real es más profundo, y **el oro no existe en la marca**
> — lo que hay en su lugar es un amarillo mucho más brillante, más otros tres
> colores que el sitio no estaba usando. Muestrear un logotipo da los colores
> que un compresor dejó en un archivo; el manual da los que alguien eligió.

Todos se declaran una sola vez en `app/globals.css` como tripletas RGB —para que
Tailwind pueda aplicar opacidad (`bg-brand/10`)— y ningún componente sostiene un
hex propio.

### La regla que gobierna la paleta

**El verde es la tinta. Los otros cinco son suelo.**

No es una preferencia: sale de medir. El verde es el único color de la paleta
que sirve como texto sobre el crema de la página.

| sobre → | crema | menta | amarillo | verde |
|---|---|---|---|---|
| **verde** `#0C473F` | **9.48** ✓ | **9.23** ✓ | **7.94** ✓ | — |
| crema `#F7F3E1` | — | 1.03 ✗ | 1.19 ✗ | **9.48** ✓ |
| turquesa `#21A39E` | 2.77 ✗ | 2.70 ✗ | 2.32 ✗ | 3.42 ~ |
| coral `#ED8268` | 2.36 ✗ | 2.30 ✗ | 1.98 ✗ | 4.02 ~ |
| rojo `#EF3A3A` | 3.53 ~ | 3.44 ~ | 2.96 ✗ | 2.68 ✗ |
| amarillo `#F4E23F` | 1.19 ✗ | 1.16 ✗ | — | **7.94** ✓ |

*(✓ ≥4.5 texto normal · ~ ≥3 texto grande o elemento no textual · ✗ no usar)*

Esto **no** es una limitación que haya que sortear: es exactamente lo que enseña
la retícula de logotipos del manual (p. 9), donde la marca va siempre en verde
sobre cada uno de los colores, o en menta sobre verde. La paleta está construida
así.

### Primary

- **Verde Marino** (`#0C473F`, Pantone 323 U): el color de la marca y la tinta
  del sistema. Se usa en **bloques completos** —la barra de anuncios, el panel
  del hero, secciones enteras— y también como color de texto. Su trabajo es
  declarar territorio y, sobre cualquier suelo de la paleta, ser lo legible.
- **Verde Casco** (`#062823`): sólo el hover del verde de marca y el fondo del
  pie. No es una superficie por derecho propio.
- **Verde Menta** (`#D1F9E2`, Pantone 317 U): fondo de avisos informativos sobre
  crema, y tinta sobre verde cuando el amarillo sería demasiado.

### Los cuatro suelos

Se nombran por lo que son y no por su función, porque el manual los usa de forma
intercambiable: la misma marca va sobre los cuatro. Darles nombres semánticos
(«acento», «destacado») habría fijado una jerarquía que la identidad no tiene.

- **Amarillo** (`#F4E23F`, Pantone 106 U): el suelo más brillante. Es el único
  que además funciona como **tinta sobre verde** (7.94:1), y ahí es donde marca
  lo excepcional y lo efímero: «La pesca de la *semana*», el chip «De
  temporada», el hover de los botones. Sobre crema es ilegible (1.19:1) y no se
  usa nunca como texto.
- **Turquesa** (`#21A39E`, Pantone 320 U): suelo secundario, el más cercano al
  verde. Bandas y superficies grandes.
- **Coral** (`#ED8268`, Pantone 701 U): el cálido de la paleta. En el manual
  aparece en el patrón de escamas y en el ojo pequeño.
- **Rojo** (`#EF3A3A`, Pantone 192 U): el más enérgico y el que menos aparece.
  Un acento dentro del patrón, nunca una superficie de sección.

**Regla de escasez.** No más de **dos** colores de suelo por pantalla, y nunca
los cuatro. El manual los reparte entre aplicaciones distintas —una camiseta,
una bolsa, un póster— no dentro de la misma.

**Dónde deja de aplicar: las tres páginas estáticas.** La regla anterior protege
las superficies donde se compra —portada, catálogo, ficha, carrito, checkout—,
en las que el color tiene que ceder ante la fotografía de producto y el precio.

Cómo funciona, Nosotros y Preguntas frecuentes no venden nada, y ahí la regla se
cambia por otra, que es la de la lámina de paleta del manual: **un campo, un
color, y nunca dos colores dentro del mismo campo**. La lámina usa los seis a la
vez sin que ninguno se ensucie, porque cada uno tiene su propio rectángulo. El
componente es `components/ui/color-field.tsx`.

**Los pares de campo están medidos.** Un campo trae su tinta fijada; no se
combinan a gusto:

| campo    | tinta        | ratio     |
|----------|--------------|-----------|
| crema    | tinta de mar | 14.36 : 1 |
| verde    | crema        |  9.48 : 1 |
| menta    | verde marca  |  9.23 : 1 |
| amarillo | verde marca  |  7.94 : 1 |
| coral    | tinta de mar |  6.09 : 1 |
| turquesa | tinta de mar |  5.18 : 1 |

**No hay campo rojo.** El rojo (`#EF3A3A`) no sostiene texto con ningún color de
la paleta: 3.50 con crema, 4.04 con el verde oscuro, 2.93 con el amarillo. No es
una preferencia, es que no existe tinta legible para ese suelo. Se queda donde
el manual lo pone: acento dentro del patrón de escamas, nunca superficie.

**En un campo de color, la jerarquía la da el tamaño, no la opacidad.** Bajar la
entradilla al 80 % es seguro sobre crema, donde sobran diez puntos de margen, y
no lo es sobre turquesa ni coral: medido en pantalla, la entradilla caía a
**3.79:1** sobre turquesa y a **4.49** sobre coral. El titular mide 48–60px y la
entradilla 18–20; eso ya los separa sin tocar el contraste.

### Neutral

- **Crema de Papel** (`#F7F3E1`, Cool Gray 1 U): el fondo de todo el sitio.
  Cálido a propósito: la fotografía de producto se apoya en él y el blanco puro
  la enfría.
- **Crema Elevada** (`#FCFAF0`): superficies que se separan del fondo —tarjetas
  de resumen, campos, controles—. Apenas más clara; la diferencia se siente
  antes de verse.
- **Tinta de Mar** (`#0A2622`): el color del texto. Es el propio verde de marca
  oscurecido, no un gris neutro: un negro puro sobre crema es la señal más
  rápida de que una paleta se escogió por partes.
- **Gris Marea** (`#4E6963`): texto secundario — origen, presentación, unidad de
  precio, ayudas de formulario.
- **Arena** (`#E9E2CB`): el marcador de posición de toda imagen y el hover de
  todo control fantasma. Es el color que el comprador ve mientras la foto carga.
- **Borde de Concha** (`#D2C8B7`): la línea de 1px divisoria — reglas entre
  filas, cantos de tarjeta. Hace el trabajo que en otro sistema harían las
  sombras. WCAG no le exige nada, así que se mantiene fina y el sistema callado.
- **Borde de Control** (`#958E84`): el contorno de todo elemento interactivo.
  Existe aparte porque en un sistema sin sombras, con un fondo de campo apenas
  distinto del de la página, esa línea es lo **único** que identifica un input
  como input — lo que la mete bajo WCAG 1.4.11 y su piso de 3:1.

### Elementos gráficos

El manual define dos, y los dos existen ahora como componentes en
`components/brand/`:

- **El ojo** (`eye.tsx`): tres anillos concéntricos, pupila negra y un punto de
  luz descentrado. Es a la vez la moneda del concepto «Tesoro» y lo primero que
  un pescadero mira para saber si una pieza está fresca. Dibujado en SVG, no
  importado como imagen: son cuatro círculos, escala sin peso y cambia de color
  con la paleta.
- **El banco de escamas** (`scales.tsx`): gotas dispersas en los cinco colores
  describiendo una curva que cruza el lienzo. Generado y determinista —semilla
  fija— para que sea el mismo dibujo en el servidor, en el cliente y mañana.

### Named Rules

**La Regla del Amarillo Escaso.** El amarillo señala una sola cosa: que algo es
excepcional o no va a durar. Prohibido como fondo de sección, como color de
texto de cuerpo, y como borde decorativo. Su rareza *es* su función — un oro que
aparece en todas partes deja de significar «de temporada» y pasa a significar
nada.

Dónde se permite, y solo ahí:

**1 · El sustantivo acentuado de un titular display, y solo sobre verde.**
El `<em>` de un titular grande sobre superficie de marca va en oro: «cocina» en
el hero, «semana» en la pesca de la semana, y el nombre del producto de esa
misma banda. No es decoración: es la palabra sobre la que gira la frase. Regla
general, no lista de excepciones — si mañana hay otro titular display sobre
verde, su sustantivo acentuado también va en oro.

**2 · El chip «De temporada».**

**3 · El hover de un control.** Un botón claro sobre verde (`onBrand`) y los
botones «Agregar» (`add`, `addOutline`). Es el momento en que alguien alarga la
mano hacia una pieza de la captura del día — exactamente lo que el oro
significa. Medido: Tinta de Mar sobre oro da **7.89:1**, muy por encima del
4.5:1 que exige la etiqueta de un botón. En reposo el botón delineado conserva
`border-strong` (3.01:1), porque ahí esa línea es lo único que lo identifica
como control; en hover lo identifican el relleno y el texto, así que el borde
puede irse al oro con él.

**El oro solo vive sobre el verde de marca.** Medido: oro sobre verde da
**4.20:1**, que despeja AA para texto grande; el mismo oro sobre la crema de la
página da **2.06:1** y no despeja nada. Un titular dorado sobre crema no es una
decisión de gusto, es texto ilegible.

El hover no cuenta contra el techo: solo se puede apuntar a un control a la vez,
así que en reposo la rejilla no tiene ni una aparición de oro.

**Techo por viewport: tres en reposo.** Era dos. La banda de la pesca de la
semana ahora lleva tres —los dos titulares y el chip— más el hover del botón
como cuarta aparición transitoria. El techo se ensanchó para esa banda y para
ninguna otra: fuera de ella siguen siendo dos.

**La Regla del Bloque Verde.** El verde de marca se aplica a superficies
completas o a nada. Un párrafo con una palabra verde, un borde verde suelto o un
icono verde aislado diluyen el único color que la marca posee. Si una sección
merece verde, se lo lleva entero.

**La Regla de las Dos Líneas.** Un borde divisorio y un borde de control no son
el mismo token. Si la línea es lo único que dice «esto se puede tocar», usa
`border-strong`; si solo separa dos cosas, usa `border`. La prueba: ¿el usuario
pierde una afordancia si la línea desaparece?

**La Regla del Estado Legible.** La disponibilidad nunca se comunica solo con
color ni solo con opacidad. «Agotado» y «De temporada» son **palabras** sobre un
chip. La prueba: en escala de grises y a plena luz de sol, el estado del producto
sigue siendo legible. Esto no es negociable — es la manifestación visual del
principio de producto «el catálogo dice la verdad del día».

## Typography

**Display Font:** Newsreader (con `Georgia, serif`)
**Body Font:** Instrument Sans (con `system-ui, sans-serif`)

**Character:** Newsreader es una serif de lectura con contraste moderado y algo
de calidez — tiene voz sin volverse decorativa, que es exactamente lo que una
pescadería con oficio necesita para no sonar ni a laboratorio ni a boutique.
Instrument Sans es geométrica, neutra y de altura-x generosa: desaparece
mientras el comprador compara precios, que es todo lo que se le pide.

Ambas se cargan por `next/font/google` con `display: 'swap'` y se exponen como
`--font-display` y `--font-sans`. Todos los `h1`–`h3` reciben Newsreader
automáticamente en la capa base, con `font-weight: 400`, `text-wrap: balance` y
`letter-spacing: -0.015em`.

### Hierarchy

- **Display** (400, `3.25rem` → `5.5rem`, line-height `0.95`): solo el titular
  del hero. Uno por página, nunca dos.
- **Headline** (400, `1.875rem` → `3rem`): títulos de sección. Es la talla que
  divide la página en capítulos.
- **Title** (400, `1.25rem` → `1.5rem`): subsecciones, `<legend>` de formulario,
  encabezado del resumen de pedido.
- **Body** (400, `1rem`, line-height `1.5`): texto corrido. Los párrafos
  editoriales se limitan por `ch` (`max-w-[38ch]` en el hero) y no por
  porcentaje, para que la medida de lectura no dependa del viewport.
- **Label** (400, `0.75rem`, `letter-spacing: 0.1em`, mayúsculas): la etiqueta
  pequeña que precede a un encabezado o nombra un valor en una lista de
  definición. Vive en `components/ui/eyebrow.tsx` y en ningún otro lugar. El
  tracking abierto es lo que la separa del cuerpo a esa talla.
  La barra de anuncios es la excepción declarada: `0.08em`, sin mayúsculas, y no
  es un eyebrow — es una franja de ancho completo con su propio componente.

### Named Rules

**La Regla de la Voz Dividida.** Newsreader habla, Instrument Sans funciona.
Todo lo que el comprador *lee* como narrativa va en serif; todo lo que *usa* para
decidir o actuar — precio, cantidad, botón, etiqueta, dato de formulario — va en
sans. Un nombre de producto en una tarjeta de rejilla es dato, no voz: va en
sans (`font-sans text-base font-medium`), y eso es deliberado.

**La Regla del Número Tabular.** Toda cifra que un comprador pueda comparar de
una fila a otra lleva `tabular-nums`: precios, subtotales, cantidades. Precios
que bailan de columna a columna hacen más lento lo único que una página de
colección tiene que facilitar.

**La Regla de la Escala Central.** Las tallas de encabezado viven en
`components/ui/heading.tsx`, la etiqueta en `components/ui/eyebrow.tsx`, y el
ritmo vertical de sección en `components/ui/section.tsx`. En ningún otro lugar.
Un título `text-3xl` aquí y `text-4xl` dos componentes más allá es exactamente
cómo un sistema de diseño deja de serlo en silencio.

## Layout

El ancho está decidido en un solo archivo. `components/ui/container.tsx`
establece `max-width: 1360px` (`--container`) con padding horizontal de `20px`
que sube a `32px` desde `md`. Las secciones que sangran de borde a borde
simplemente no usan `Container` — pero la información comercial que llevan
dentro sí, de modo que una rejilla de producto queda alineada con la navegación
de arriba aunque su fondo no lo esté.

**Rejilla de producto:** 2 columnas en móvil, 3 desde `sm`, 4 desde `lg`
(`sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"`). Dos columnas
en móvil y no una: el comprador de despensa semanal está comparando, y una sola
columna convierte la comparación en scroll.

**Hero:** la fotografía es el **suelo**, no un vecino. Sangra a todo el ancho
(`absolute inset-0` desde `md`) y la superficie de marca se apoya encima como una
cuña del 62% —56% desde `lg`— recortada en su borde derecho por `.edge-right`.
Antes eran dos columnas contiguas en una rejilla `5fr 7fr`: prolijo, pero ahí la
imagen siempre era un panel en vez de un lugar.

En móvil colapsa a pila con la foto primero en 4:3 y el bloque verde debajo con
el corte horizontal — una cuña de texto sobre una foto de 390px no deja legibles
ni las palabras ni la imagen.

**El hero no consulta datos.** Llevaba un conteo del catálogo en vivo al pie del
bloque verde, tras su propio Suspense. Se retiró, y con él la última razón por la
que este componente tocaba la API. Es lo primero que se pinta del sitio y ahora
no depende de nada para pintarse. La fecha se queda: sale del reloj, no del
catálogo.

**Dos salidas, no una.** El botón primario va al catálogo —lo único que quiere
quien llegó a comprar— y a su lado un enlace de texto discreto a «Cómo funciona»
para quien necesita entender una tienda cuyo catálogo cambia cada día. Con un
solo botón, esa segunda persona tenía que salir por el encabezado.

**El banco de escamas cruza la cuña, y una máscara lo aparta del texto.** El
patrón del manual va a sangre sobre el verde, al 55 %, con una máscara vertical
que lo deja al 30 % sobre la banda de texto y lo sube al 100 % en el tercio
inferior, que está vacío.

La máscara no es un adorno técnico: es lo único que hace legible la
composición. Medido sobre los píxeles renderizados, con el patrón a plena
opacidad el texto crema sobre una gota amarilla cae a **2.45:1**, y al 40 % a
**3.75:1** — el mínimo es 4.5. Bajar la opacidad hasta ser seguro en todas
partes (25 %) dejaba el patrón sin color. Con la máscara, el titular mide
**6.25:1**, la entradilla **5.93:1** y el enlace secundario **4.98:1**.

La regla que sale de aquí: **un patrón de varios colores saturados no se hace
seguro bajando la opacidad, se hace seguro retirándolo de donde hay texto.**

**Checkout:** `1fr 22rem` desde `md`, con el resumen de pedido en `position:
sticky; top: 1.5rem`. El resumen es la única superficie pegajosa del sitio
además del encabezado.

**Encabezado:** `sticky top-0 z-40`, altura `64px` que sube a `80px` desde `md`,
sobre `background/95` con `backdrop-blur-sm`. Crema y no transparente-sobre-hero:
el contraste se mantiene fiable en todas las páginas.

**Ritmo:** el espaciado sigue la escala de 4px de Tailwind. Dentro de un
componente el paso típico es `gap-1` → `gap-5`; entre bloques de una sección,
`gap-8` → `gap-12`. El aire vertical de banda tiene **tres pasos y solo tres**,
declarados en `components/ui/section.tsx`:

- `sm` — `py-12 md:py-16`: cascarones de página, sub-secciones, filas
  secundarias.
- `md` — `py-16 md:py-24`: la banda por defecto. La mayoría de la portada.
- `lg` — `py-20 md:py-28`: la banda que debe leerse como un punto final; las
  secciones editoriales sobre verde.

**Objetivos táctiles:** todo control interactivo con icono mide **44×44px**
(`h-11 w-11`). Sin excepción — el selector de cantidad está justo encima de
«Agregar al carrito» en un teléfono, y un toque errado ahí cuesta una venta.

### Named Rules

**La Regla del Ancho Único.** Ninguna página declara su propio `max-width`. Si
una sección necesita otro ancho, es una prop de `Container`, no un valor suelto.

## Elevation & Depth

El sistema es **plano por defecto**. No existe una sola `box-shadow` en el
código de página, y no es un descuido: la profundidad se construye por
**estratificación tonal** y por bordes de 1px. Crema de Papel (`#FAF6EF`) es el
suelo; Crema Elevada (`#FFFDF9`) es lo que se levanta de él; Arena (`#EAE1D2`)
es lo que se hunde bajo él (marcadores de imagen, hover de controles fantasma).
La diferencia entre las tres es deliberadamente pequeña — se siente antes de
verse, que es la intención.

La única excepción son los **overlays**: el drawer del carrito y el menú móvil
flotan sobre contenido vivo y desplazable, y una capa tonal no basta para
separarlos de lo que sigue debajo. Solo ellos reciben sombra.

### La Placa

El único recurso de profundidad que se sumó al sistema, y no es una sombra:
**toda fotografía de la tienda lleva una línea de 1px dibujada por dentro de su
propio marco** (`.plate`, o `.plate-on-brand` sobre verde).

Es `box-shadow: inset`, no un borde: un borde exterior suma un píxel al layout y
`overflow-hidden` se lo come, mientras que el anillo interior lo pinta el propio
elemento — así un marco 4:5 sigue siendo exactamente 4:5 y la línea sobrevive al
recorte. El color es la tinta de la marca al 12% y no el token de borde: sobre
una foto oscura una línea arena brilla, y sobre una clara la tinta se lee como
el paspartú de una lámina enmarcada.

### Shadow Vocabulary

- **overlay** (`box-shadow: 0 8px 40px rgb(12 28 29 / 0.14)`): exclusivamente
  para superficies que flotan sobre contenido activo — drawer del carrito, menú
  móvil. La sombra es fría (usa Tinta de Mar, no negro puro) para no ensuciar la
  crema.

### Named Rules

**La Regla del Plano Absoluto.** Si un elemento vive en el flujo de la página,
no lleva sombra. Nunca. Una tarjeta de producto, un campo de formulario, el
resumen del pedido, un chip: todos se separan por tono y por borde. La sombra es
la respuesta a *flotar*, no a *importar*.

## Shapes

El lenguaje de forma es casi ortogonal. Nada es pastilla, nada es circular salvo
lo que representa un punto o un contador.

La escala real, tal como se computa hoy:

- `rounded-sm` = **2px** — el radio dominante: tarjetas de producto, campos,
  chips, superficies de resumen. Prácticamente recto.
- `rounded` = **4px** — botones y controles de cantidad. Es el único radio
  perceptiblemente curvo del sistema.
- `rounded-md` = **6px**, `rounded-lg` = **8px** — declarados en
  `tailwind.config.ts`, sin uso actual.
- `rounded-full` — solo para contadores y puntos (3 usos).

> **Deriva resuelta.** `sm: '2px'` ahora está declarado explícitamente en
> `tailwind.config.ts` en lugar de caer al default de Tailwind, y los tokens
> muertos `--radius-sm` / `--radius-md` se borraron de `globals.css`. El radio
> tiene una sola fuente de verdad: el config de Tailwind.

**Bordes:** 1px sólido en Borde de Concha (`#DFD6C7`). Es el separador universal
— entre encabezado y página, entre resumen y total, alrededor de todo control
secundario.

**La diagonal.** La única geometría expresiva del sistema: `.edge-top`,
`.edge-bottom` y `.edge-right` en `globals.css` recortan una superficie de marca
con `clip-path: polygon(...)` a `4vw` de inclinación. Se eligió `clip-path` sobre
un pseudo-elemento rotado porque nunca desborda, no exige `overflow-hidden` en el
padre, y el ángulo puede encogerse a `24px` bajo `768px` sin que la composición
se rompa.

Las dos primeras cortan un borde horizontal, contra la crema. `.edge-right`
corta el borde **derecho** y existe para el hero, donde la cuña verde se apoya
encima de una fotografía a sangre en vez de junto a ella. Es el mismo ángulo de
4vw a propósito: un sitio con dos diagonales que casi coinciden se ve como un
error, no como dos gestos.

### Named Rules

**La Regla de la Esquina Casi Recta.** Ningún radio del sistema supera los 8px, y
en la práctica ninguno supera los 4px. Una pastilla (`rounded-full` en un botón o
un chip) es ajena a este sistema: convierte una pescadería en una app.

**La Regla de la Diagonal Única.** La diagonal es una firma, no un patrón. Como
máximo una transición angular por pantalla. Dos diagonales compitiendo dejan de
ser un gesto de marca y pasan a ser ruido.

## Motion & Browser Surfaces

### El Momento Único

El sitio tiene **un** momento animado y está en el hero: la fecha, el titular, el
subtítulo y el CTA se posan en su sitio escalonados al primer pintado
(`.set-down`, 900ms, `--ease-out-expo`). Es CSS puro y no se repite en ninguna
otra banda.

Un *scroll reveal* repetido en cada sección es exactamente lo que hace que una
página se sienta animada en vez de compuesta, y le cobra al comprador un
parpadeo de vacío en cada banda. Aquí no existe.

La curva es exponencial: casi toda la distancia se recorre en el primer tercio,
así que el movimiento se lee como algo que **llega**, no como algo que viaja.
Vive una sola vez, en `--ease-out-expo`, y Tailwind la expone como `ease-board`.

El resto del movimiento del sistema es retroalimentación, no expresión: la regla
de una tarjeta que pasa a verde, la foto que escala 3% en 500ms, el chevron de un
`<details>` que gira, la flecha de un enlace que se desplaza 2px, el drawer que
entra desde su borde. Ninguno de esos es "el momento"; son estados.

### Superficies del Navegador

Las partes que no dibujamos también llevan el diseño. Todas resuelven desde la
paleta en `globals.css`:

- **`::selection`** — verde de marca al 16% con la tinta intacta encima. El
  resalte azul de Chrome sobre una página crema es la señal más ruidosa de que un
  sitio se ensambló en vez de construirse.
- **`caret-color`** — verde de marca, igual que el anillo de foco.
- **Scrollbar** — delgada, pista arena, pulgar en Borde de Control con radio de
  2px, nunca la pastilla del sistema operativo. Declarada dos veces:
  `scrollbar-color` para los que la respetan y `::-webkit-scrollbar` para el
  resto.
- **`text-underline-offset: 0.2em`** — sin él, el descendente de una serif
  atraviesa su propio subrayado y el enlace se lee tachado.
- **`::placeholder`** — Gris Marea explícito. El gris por defecto del navegador
  mide 3.1:1 sobre crema, bajo AA, en la única cadena que dice para qué sirve un
  campo.
- **Spinners de `input[type=number]`** — eliminados. El carrito y la ficha de
  producto ponen botones reales de 44px al lado; el spinner del navegador ofrece
  la misma acción a un tercio del tamaño, y en un teléfono es el que encuentra
  primero el pulgar.

### Named Rules

**La Regla del Momento Único.** Una sola animación de entrada autoral por sitio,
y está gastada en el hero. Cualquier otro movimiento tiene que ser un estado —
hover, foco, abierto/cerrado, entrada de un overlay — o no se añade.

**La Regla de la Superficie Prestada.** Ningún valor por defecto del navegador se
queda. Selección, cursor, scrollbar, placeholder y subrayado se declaran desde la
paleta o no se han terminado.

## Components

### Buttons

- **Forma:** esquina apenas curva (`4px`), sin sombra, sin pastilla. El peso
  viene del color y del tamaño, no de la decoración.
- **Primario:** verde de marca sobre texto crema (`bg-brand text-background`),
  padding `12px 24px`, `text-sm font-medium`.
- **Hover / Focus:** `transition-colors duration-150` a Verde Casco (`#012A2E`).
  El foco es el anillo global — nunca se sustituye por un cambio de fondo.
- **Secundario:** superficie crema elevada con borde de 1px
  (`border-border bg-surface text-foreground`), hover a Arena.
- **Sobre verde (`variant="onBrand"`):** cuando un botón vive dentro de un
  bloque de marca, invierte — fondo crema, texto verde — y su hover es el
  **único** lugar donde el amarillo toca un control (`hover:bg-sun
  hover:text-foreground`).

  Es una **variante**, no un `className` que sobrescribe a `primary`. Los dos
  CTA sobre verde estaban escritos como `variant="primary"` más
  `className="bg-background text-brand"`, suponiendo que una clase escrita
  después gana. No gana: la cascada resuelve por el orden en que las utilidades
  salen en la hoja generada, y `background` se declara después de `brand` en la
  paleta — así que `text-background` le ganaba a `text-brand` y ambos botones se
  pintaban crema sobre crema. **Invisibles**, en las dos llamadas a la acción más
  fuertes del sitio. Si dos utilidades del mismo grupo compiten, la respuesta es
  una variante, nunca el orden del string.
- **Deshabilitado:** `opacity-45` y `cursor-not-allowed`. Nunca se oculta.
- **`ButtonLink`:** un control que navega es un `<a>`; solo *parece* un botón.
  Toma su geometría de las mismas dos constantes que `Button`, así que los dos no
  pueden separarse. Existe porque siete lugares escribían `<Link><Button/></Link>`
  — el hero, la pesca de la semana, el carrito vacío, el checkout vacío y la
  página de pedido — y todos enviaban un `<a>` envolviendo un `<button>`.

### Icon Buttons

- **Forma:** cuadrado de `44×44px`, radio de 2px, sin fondo en reposo.
- **Hover:** fondo Arena.
- **Accesibilidad:** la prop `label` es **obligatoria por tipo**, no opcional. Un
  botón de icono sin nombre accesible es un botón que un lector de pantalla
  anuncia como «button», y hacer la prop obligatoria sale más barato que
  acordarse.

### Chips

- **De temporada:** fondo Amarillo, texto Verde Marino, `4px 8px`, radio 2px,
  `text-xs font-medium`. Posicionado arriba-izquierda sobre la fotografía.
- **Agotado:** fondo Tinta de Mar al 85% de opacidad, texto crema. Misma posición
  y misma talla — los dos estados nunca coexisten.

### Cards / Containers

- **Tarjeta de producto:** sin marco y sin fondo propio. La imagen es el objeto:
  `aspect-[4/5]`, radio 2px, `object-cover`, marcador de posición en Arena.
  Debajo, una regla; sobre la regla el nombre en sans medium y el precio en la
  misma línea base; luego `presentación · origen` a la izquierda con la unidad a
  la derecha; y al final la acción.
- **Hover:** la imagen escala `1.03` en `500ms` con `ease-board`, y la regla pasa
  de Borde de Concha a verde de marca. Nada importante se esconde detrás del
  hover — la fotografía vende y la tarjeta se aparta.
- **La acción de compra vive en la tarjeta, y tiene dos estados.** Una sola
  ranura de 44px a ancho completo:
  - **Fuera del carrito** — botón `secondary` «Agregar». No es primario a
    propósito: ocho botones verdes saturados bajando por una página de catálogo
    pesarían más que la fotografía que la rejilla existe para mostrar.
  - **Dentro del carrito** — el `Stepper` de esa línea: menos, cifra, más. El
    comprador de despensa semanal arma el pedido completo sin abrir el cajón
    nunca, que es exactamente su trabajo.

  **Visible en reposo en ambos estados.** La regla que prohíbe esconder
  información de compra detrás de un hover vale igual para el *control*: un botón
  que aparece al pasar el cursor no existe en un teléfono.
- **Un producto agotado muestra el botón deshabilitado** con la palabra
  «Agotado», no lo oculta: una tarjeta sin botón rompe la altura de la fila y
  deja el estado dependiendo solo del chip.
- **La papelera aparece en 1.** Bajar de uno no decrementa, quita la línea — y el
  glifo cambia a una papelera, porque «−» sobre la última unidad promete restar,
  no borrar. Sin eso, agregar desde la rejilla es una puerta de un solo sentido:
  se entra desde la tarjeta y se sale solo desde el cajón.
- **`mt-auto` fija la acción al fondo.** Una fila con nombres de una y dos líneas
  tiene que presentar sus botones en una sola línea horizontal.
- **Contenedor de resumen** (checkout, carrito): Crema Elevada, borde de 1px,
  radio 2px, padding `20px`, sin sombra.

#### La Regla de la Ranura Estable

Los dos estados miden **44px y ancho completo**. Una tarjeta que creciera o
encogiera al cambiar su cantidad empujaría todas las tarjetas de abajo: el
comprador pulsa «+» y ve la página moverse bajo su dedo. Por eso el `Stepper`
tiene `fullWidth` — el grupo se estira al ancho del botón que sustituye y la
cifra se lleva la holgura.

#### La Regla del Carrito como Fuente de Verdad

La cantidad se **lee del carrito en cada render**, nunca se copia a estado local.
El mismo producto puede aparecer dos veces en una pantalla —en la rejilla y en la
banda de la pesca de la semana, o en la rejilla y en el cajón abierto encima— y
una tarjeta con su propia copia del número mostraría una desactualizada en cuanto
el comprador editara la otra. Editar en el cajón se refleja en la tarjeta de
abajo al instante, y un carrito restaurado de `localStorage` en una segunda
visita pinta sus cantidades sin ningún paso de reconciliación.

Corolario: **las tres mutaciones del carrito viven en `CartProvider`**
(`add`, `setQuantity`, `remove`). Un componente que alcance `writeCart` por su
cuenta es exactamente cómo la fila de sugerencias del cajón acabó con su propia
copia sutilmente distinta de la escritura.

#### La tarjeta no es un solo enlace

Una tarjeta con destino **y** acción no puede ser un `<a>` envolviéndolo todo: un
`<button>` dentro de un `<a>` es HTML inválido y el navegador resuelve el
conflicto tragándose una de las dos interacciones.

El patrón es: contenedor posicionado, el **nombre** lleva el enlace, y ese enlace
estira un `::after` vacío sobre toda la tarjeta. Así la fotografía y el precio
siguen siendo clicables, el nombre accesible del enlace es el nombre del producto
—y no un párrafo de texto de tarjeta— y el botón se apoya encima del overlay con
su propio `relative`. Es la única forma de dejar las dos cosas alcanzables por
teclado.

### Inputs / Fields

- **Estilo:** fondo Crema de Papel (no la superficie elevada — el campo se hunde,
  no se levanta), borde de 1px, radio 2px, padding `10px 12px`, `text-sm`.
- **Foco:** `outline-none` en el campo, sustituido por `focus-visible:border-brand`
  más el anillo global de `:focus-visible`.
- **Error:** el borde pasa a verde de marca y el mensaje vive en un `<p>` con
  `role="alert"`, vinculado por `aria-describedby`. El error se anuncia; no se
  descubre al tabular de vuelta.
- **Ayuda:** Gris Marea, `text-sm`, también vinculada por `aria-describedby`.

### Navigation

- **Estilo:** crema al 95% con `backdrop-blur-sm`, borde inferior de 1px,
  `sticky top-0 z-40`.
- **Tipografía:** `text-sm` en sans; hover a verde de marca.
- **Estado activo:** nunca solo color — siempre acompañado de peso tipográfico,
  una regla, o `aria-current`.
- **Móvil:** el logo se centra entre el disparador del menú y el del carrito; la
  navegación entera pasa a un drawer, con filas regladas y objetivos de 44px en
  lugar de una lista de enlaces separada por `gap`.
- **Rieles de colección:** horizontales, no una barra lateral. Siete enlaces
  cortos se llevaban un séptimo del ancho de forma permanente y bajaban la
  rejilla de cuatro columnas a tres en cualquier laptop. Horizontales cuestan dos
  filas y devuelven el contenedor completo al producto. Los ítems se envuelven,
  no hacen scroll: una tira que se desplaza esconde su propia cola en un
  teléfono.
- **Contenido:** las colecciones se leen del catálogo real en un Server
  Component, no de una lista hardcodeada que se desincroniza.

### Eyebrow

**Solo para etiqueta-que-es-dato, nunca para adorno.** Una etiqueta pequeña
encima de un encabezado es decoración: el encabezado carga su propio peso. Los
eyebrows decorativos («Amor a Mar» sobre el antiguo titular de Nosotros,
«Pesca de la semana» sobre el nombre del producto) se **borraron**, no se
rediseñaron. El
componente sobrevive solo donde la etiqueta nombra un valor: los `<dt>` de las
listas de definición del pedido, los títulos de columna del footer, el
encabezado de grupo de la navegación de colecciones.

- **Estilo:** sans en mayúsculas, `0.75rem`, `letter-spacing: 0.1em`, en Gris
  Marea.
- **Tonos:** `muted` (por defecto), `sun` (solo la etiqueta «Pesca de la
  semana»), `on-brand` (`text-background/60`, para superficies verdes),
  `inherit`.
- **Variante `sm`:** `0.875rem` con peso 500 — el título de una tarjeta de valor,
  no una etiqueta que precede.
- **Regla:** el tono `on-brand` resuelve desde el token crema, nunca desde blanco
  puro. Dos blancos en la misma página se leen como un error.

### SectionHeader

El encabezado de banda, y la estructura sobre la que cuelga toda la portada.
Vive en `components/ui/section-header.tsx`. Anatomía fija, tres partes:

```
── regla ──────────────────────────────────────────────────────
Lo que hay hoy                             Ver todo el catálogo
El catálogo cambia con lo que llega.
```

- **La regla superior** es lo que hace que una banda se lea como una sección de
  un pizarrón y no como una tarjeta flotando sobre crema. También **sustituye al
  eyebrow**: una etiqueta pequeña sobre un encabezado es decoración que el
  encabezado no necesita, y una línea de 1px hace el mismo trabajo de separación
  sin decir nada.
- **La cursiva editorial.** Un sustantivo del título va en `<em>`, con la
  itálica real de Newsreader cargada en el layout — nunca una inclinación
  sintética. Es énfasis semántico, no un cambio de fuente.
- **`meta` y `action` comparten la ranura derecha** porque nunca aplican las
  dos: una banda o apunta a otro lado (el catálogo) o se cuenta a sí misma (el
  total de una colección).
- **`tone="on-brand"`** re-tinta regla, lede y enlace para superficie verde.

### SpecList

La etiqueta de mostrador: `components/ui/spec-list.tsx`. Una lista de
definición con una regla bajo cada fila, columna de etiqueta fija para que los
valores empiecen en la misma x en todos los productos.

Corte, origen, peso neto y categoría son los datos con los que se decide una
compra de pescado — la diferencia entre dos piezas del mismo animal — y estaban
repartidos en tres lugares. Aquí van juntos, bajo el precio, en la ficha de
producto y en la pesca de la semana. Filas sin valor se descartan en el
llamador, nunca se pintan vacías.

### Stepper

El control de cantidad, compartido por la ficha de producto y el carrito
(`components/ui/stepper.tsx`). Los tres elementos van soldados en un solo grupo
con borde: una cantidad es **un** valor, y tres cajas separadas se leen como
tres controles.

Botones de **44×44 en ambos sitios, sin variante compacta**. El carrito era
justo donde se iba a cobrar la excepción — usaba un `<input type="number">`
pelado y el spinner de 12px del navegador, en la única pantalla donde un toque
errado cambia lo que a alguien se le cobra.

### ResultRule

La regla entre los rieles de navegación y la rejilla, con el conteo en su
extremo (`components/grid/result-rule.tsx`). Cierra los filtros y abre los
resultados; sin ella los rieles y la primera fila de producto quedan en un solo
bloque indiferenciado.

### Section

- **Rol:** posee el ritmo vertical de una banda y su `aria-labelledby`.
- **Ritmos:** `sm` / `md` / `lg` (ver Layout), más `none` para bandas cuya
  superficie de marca sangra y cuyo padding vive en el `Container` interior.

### La Diagonal de Marca

El componente firma del sistema, y el único gesto puramente expresivo que se
permite. Una superficie verde recortada en ángulo contra la crema o contra una
fotografía. Vive en `globals.css` como utilidad (`.edge-top` / `.edge-bottom`),
degrada de `4vw` a `24px` bajo `768px`, y aparece como máximo una vez por
pantalla.

## Do's and Don'ts

### Do:

- **Do** declarar todo color como token en `app/globals.css` y consumirlo por la
  utilidad de Tailwind. Ningún componente sostiene un hex.
- **Do** usar Crema de Papel (`#FAF6EF`) como fondo, nunca `#FFFFFF`. La
  fotografía de producto se apoya en la calidez.
- **Do** aplicar el verde de marca a superficies **completas**.
- **Do** escribir el estado del producto como palabra sobre un chip — «Agotado»,
  «De temporada» — y no como una imagen atenuada.
- **Do** mantener `tabular-nums` en toda cifra comparable.
- **Do** mantener todo objetivo táctil de icono en `44×44px`.
- **Do** limitar la medida de lectura en `ch` (`max-w-[38ch]`), no en porcentaje.
- **Do** dejar las tallas de encabezado en `components/ui/heading.tsx`.
- **Do** encabezar toda banda con `SectionHeader`, y marcar el énfasis con `<em>`
  dentro del título.
- **Do** montar toda fotografía con `.plate` (o `.plate-on-brand` sobre verde).
- **Do** dar a toda cifra que el comprador acepta — total de línea, subtotal — la
  misma columna derecha, para que la suma se lea hacia abajo.
- **Do** vincular todo error de formulario con `aria-describedby` y `role="alert"`.
- **Do** respetar `prefers-reduced-motion` — ya está resuelto globalmente en
  `globals.css`, y de forma quirúrgica: el bloque mata `transform` y
  `animation`, pero **deja vivas** las transiciones de color. Reducir movimiento
  no es apagar la retroalimentación de hover, foco y estado deshabilitado, que
  no son movimiento. No lo re-implementes por componente.

### Don't:

- **Don't** añadir `box-shadow` a nada que viva en el flujo de la página. La
  sombra pertenece solo a overlays flotantes.
- **Don't** usar el oro como fondo de sección, color de texto de cuerpo o borde
  decorativo. Máximo dos apariciones por viewport.
- **Don't** usar `rounded-full` en botones o chips. Ningún radio del sistema
  supera los 8px.
- **Don't** poner más de una diagonal por pantalla.
- **Don't** poner un nombre de producto, un precio o una etiqueta en Newsreader.
  La serif es voz; el dato es sans.
- **Don't** dejar al comprador en la ficha después de agregar. Agregar desde la
  ficha devuelve al catálogo completo (`/search`): la ficha responde una sola
  pregunta —«¿es esta la pieza?»— y contestada ya no queda nada que hacer en
  ella. La tarjeta del catálogo aparece con la cantidad recién elegida, que es
  mejor acuse que una palomita de dos segundos.
- **Don't** esconder información de compra detrás de un hover — ni el dato ni el
  control. Un botón que solo aparece al pasar el cursor no existe en un teléfono.
- **Don't** anidar un `<button>` dentro de un `<a>`. Si un contenedor necesita un
  destino y una acción, usa el enlace estirado con `::after`; si un botón navega,
  usa `ButtonLink`.
- **Don't** agregar al carrito desde la rejilla un producto con más de una
  presentación. El comprador todavía no ha elegido, y elegir por él es como
  alguien termina con el corte equivocado: la tarjeta degrada a «Elegir
  presentación» y lo manda a la ficha.
- **Don't** usar fotografía de stock ni ilustración de mariscos. Solo fotografía
  propia; si no existe, degradar con elegancia a Arena.
- **Don't** comunicar estado activo o disponibilidad únicamente con color.
- **Don't** introducir un tercer tipo de letra.
- **Don't** escribir una etiqueta en mayúsculas a mano con su propio `tracking-[…]`.
  Usa `Eyebrow`. Siete trackings distintos para el mismo patrón fue exactamente la
  deriva que este componente cerró.
- **Don't** escribir `py-… md:py-…` en una banda de sección. Usa `Section`.
- **Don't** resolver un conflicto entre dos utilidades del mismo grupo con el
  orden del `className`. La cascada no lo respeta — eso fue exactamente lo que
  dejó los dos CTA sobre verde pintados crema sobre crema. Se resuelve con una
  variante.
- **Don't** añadir una segunda animación de entrada. El sitio ya gastó la suya en
  el hero.
- **Don't** dejar un `<input type="number">` a solas como control de cantidad.
  Usa `Stepper`.
- **Don't** repetir un dato de la `SpecList` en el acordeón de abajo. Un mismo
  hecho en dos lugares de una página envejece mal en uno de los dos.
- **Don't** poner una etiqueta pequeña encima de un encabezado. Si la etiqueta no
  nombra un valor concreto, bórrala — el encabezado se sostiene solo.
- **Don't** usar `border` en el contorno de algo interactivo. Ese es
  `border-strong`, y la diferencia es un requisito de accesibilidad, no un gusto.
- **Don't** dejar una banda de sección sin `aria-labelledby`. `Section` acepta la
  prop; una región anónima es una región que un lector de pantalla no puede
  ofrecer.
- **Don't** escribir copia que afirme certificaciones, premios, superlativos o
  cifras que el negocio no haya establecido. Ante la duda entre un dato
  inventado y un hueco honesto, gana el hueco.
