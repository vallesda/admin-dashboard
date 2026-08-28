---
name: Amor a Mar
description: Pescadería en línea donde el catálogo cambia con lo que el mar dio ese día.
colors:
  brand: "#024F55"
  brand-dark: "#012A2E"
  brand-soft: "#DAEFF1"
  gold: "#D6A808"
  gold-soft: "#FAF0D1"
  background: "#FAF6EF"
  surface: "#FFFDF9"
  foreground: "#0C1C1D"
  muted: "#596765"
  sand: "#EAE1D2"
  border: "#D2C8B7"
  border-strong: "#958E84"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(3.25rem, 8vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.25rem, 2vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
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
    backgroundColor: "{colors.gold}"
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
    backgroundColor: "{colors.gold}"
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
  eyebrow-gold:
    textColor: "{colors.gold}"
    typography: "{typography.label}"
---

# Design System: Amor a Mar

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

Una paleta de dos temperaturas: el verde frío y profundo de la marca contra una
crema cálida de papel, con el oro del logo como única chispa. Todos los colores
se declaran una sola vez en `app/globals.css` como tripletas RGB — para que
Tailwind pueda aplicar opacidad (`bg-brand/10`) — y ningún componente sostiene
un hex propio.

### Primary

- **Verde Marino Profundo** (`#024F55`): el color de la marca, tomado del logo.
  Se usa en **bloques completos**, no en acentos: la barra de anuncios, el panel
  del hero, superficies de sección enteras. También es el color del texto de
  error y del anillo de foco. Su trabajo es declarar territorio.
- **Verde Casco** (`#012A2E`): exclusivamente el estado hover del verde de
  marca. No es una superficie por derecho propio.
- **Verde Espuma** (`#DAEFF1`): fondo de avisos informativos sobre crema, donde
  un bloque de verde sólido sería demasiado peso para un mensaje de una línea.

### Secondary

- **Oro de Logo** (`#D6A808`): la segunda mitad de la identidad, muestreada del
  mismo logo. Marca lo excepcional y lo efímero — el chip «De temporada», el
  hover de un botón claro sobre verde. Nunca es una superficie de sección.
- **Oro Pálido** (`#FAF0D1`): la versión de fondo del oro, para cuando algo debe
  destacarse sin gritar. Usarlo es raro y debe justificarse.

### Neutral

- **Crema de Papel** (`#FAF6EF`): el fondo de todo el sitio. Cálido a propósito:
  la fotografía de producto se apoya en él y el blanco puro la enfría.
- **Crema Elevada** (`#FFFDF9`): superficies que se separan del fondo — tarjetas
  de resumen, campos, controles. Apenas más clara; la diferencia se siente antes
  de verse.
- **Tinta de Mar** (`#0C1C1D`): el color del texto. Un casi-negro con verde
  dentro, nunca `#000`.
- **Gris Marea** (`#596765`): texto secundario — origen, presentación, unidad de
  precio, ayudas de formulario. Es el valor más claro que despeja 4.5:1 sobre la
  superficie más oscura en la que aterriza (Arena), así que es seguro en las
  tres: crema 5.49 · arena 4.56 · superficie 5.82.
- **Arena** (`#EAE1D2`): el marcador de posición de toda imagen y el hover de
  todo control fantasma. Es el color que el comprador ve mientras la foto carga.
- **Borde de Concha** (`#D2C8B7`): la línea de 1px divisoria — reglas entre
  filas, cantos de tarjeta. Hace el trabajo que en otro sistema harían las
  sombras. WCAG no le exige nada, así que se mantiene fina y el sistema callado.
- **Borde de Control** (`#958E84`): el contorno de todo elemento interactivo.
  Existe aparte porque en un sistema sin sombras, con un fondo de campo apenas
  distinto del de la página, esa línea es lo **único** que identifica un input
  como input — lo que la mete bajo WCAG 1.4.11 y su piso de 3:1. Mide 3.01:1
  sobre crema. Separar los dos tokens es lo que permite que los campos se lean
  sin convertir cada divisor del sitio en una regla dura.

### Named Rules

**La Regla del Oro Escaso.** El oro señala una sola cosa: que algo es
excepcional o no va a durar. Techo duro de **dos apariciones por viewport**.
Permitido en el chip «De temporada» y en el hover de un botón claro sobre verde.
Prohibido como fondo de sección, como color de texto de cuerpo, y como borde
decorativo. Su rareza *es* su función — un oro que aparece en todas partes deja
de significar «de temporada» y pasa a significar nada.

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

**Hero:** rejilla asimétrica `5fr 7fr` desde `md` — la fotografía se lleva la
parte mayor. En móvil colapsa a pila con la foto primero (`order-1` / `order-2`),
porque forzar la diagonal del escritorio en un viewport estrecho convierte una
composición en una cuña de nada.

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

**La diagonal.** La única geometría expresiva del sistema: `.edge-top` y
`.edge-bottom` en `globals.css` recortan una superficie de marca con
`clip-path: polygon(...)` a `4vw` de inclinación. Se eligió `clip-path` sobre un
pseudo-elemento rotado porque nunca desborda, no exige `overflow-hidden` en el
padre, y el ángulo puede encogerse a `24px` bajo `768px` sin que la composición
se rompa.

### Named Rules

**La Regla de la Esquina Casi Recta.** Ningún radio del sistema supera los 8px, y
en la práctica ninguno supera los 4px. Una pastilla (`rounded-full` en un botón o
un chip) es ajena a este sistema: convierte una pescadería en una app.

**La Regla de la Diagonal Única.** La diagonal es una firma, no un patrón. Como
máximo una transición angular por pantalla. Dos diagonales compitiendo dejan de
ser un gesto de marca y pasan a ser ruido.

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
- **Sobre verde:** cuando un botón vive dentro de un bloque de marca, invierte —
  fondo crema, texto verde — y su hover es el **único** lugar donde el oro toca
  un control (`hover:bg-gold hover:text-foreground`).
- **Deshabilitado:** `opacity-45` y `cursor-not-allowed`. Nunca se oculta.

### Icon Buttons

- **Forma:** cuadrado de `44×44px`, radio de 2px, sin fondo en reposo.
- **Hover:** fondo Arena.
- **Accesibilidad:** la prop `label` es **obligatoria por tipo**, no opcional. Un
  botón de icono sin nombre accesible es un botón que un lector de pantalla
  anuncia como «button», y hacer la prop obligatoria sale más barato que
  acordarse.

### Chips

- **De temporada:** fondo Oro de Logo, texto Tinta de Mar, `4px 8px`, radio 2px,
  `text-xs font-medium`. Posicionado arriba-izquierda sobre la fotografía.
- **Agotado:** fondo Tinta de Mar al 85% de opacidad, texto crema. Misma posición
  y misma talla — los dos estados nunca coexisten.

### Cards / Containers

- **Tarjeta de producto:** sin marco y sin fondo propio. La imagen es el objeto:
  `aspect-[4/5]`, radio 2px, `object-cover`, marcador de posición en Arena. Bajo
  ella, el nombre en sans medium, la línea `presentación · origen` en Gris Marea,
  y el precio.
- **Hover:** `scale-[1.02]` sobre la imagen en `200ms`. Nada importante se
  esconde detrás del hover — la fotografía vende y la tarjeta se aparta.
- **Contenedor de resumen** (checkout, carrito): Crema Elevada, borde de 1px,
  radio 2px, padding `20px`, sin sombra.

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
  navegación entera pasa a un drawer.
- **Contenido:** las colecciones se leen del catálogo real en un Server
  Component, no de una lista hardcodeada que se desincroniza.

### Eyebrow

**Solo para etiqueta-que-es-dato, nunca para adorno.** Una etiqueta pequeña
encima de un encabezado es decoración: el encabezado carga su propio peso. Los
eyebrows decorativos («Amor a Mar» sobre «El mar no se apura», «Pesca de la
semana» sobre el nombre del producto) se **borraron**, no se rediseñaron. El
componente sobrevive solo donde la etiqueta nombra un valor: los `<dt>` de las
listas de definición del pedido, los títulos de columna del footer, el
encabezado de grupo de la navegación de colecciones.

- **Estilo:** sans en mayúsculas, `0.75rem`, `letter-spacing: 0.1em`, en Gris
  Marea.
- **Tonos:** `muted` (por defecto), `gold` (solo la etiqueta «Pesca de la
  semana»), `on-brand` (`text-background/60`, para superficies verdes),
  `inherit`.
- **Variante `sm`:** `0.875rem` con peso 500 — el título de una tarjeta de valor,
  no una etiqueta que precede.
- **Regla:** el tono `on-brand` resuelve desde el token crema, nunca desde blanco
  puro. Dos blancos en la misma página se leen como un error.

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
- **Don't** esconder información de compra detrás de un hover.
- **Don't** usar fotografía de stock ni ilustración de mariscos. Solo fotografía
  propia; si no existe, degradar con elegancia a Arena.
- **Don't** comunicar estado activo o disponibilidad únicamente con color.
- **Don't** introducir un tercer tipo de letra.
- **Don't** escribir una etiqueta en mayúsculas a mano con su propio `tracking-[…]`.
  Usa `Eyebrow`. Siete trackings distintos para el mismo patrón fue exactamente la
  deriva que este componente cerró.
- **Don't** escribir `py-… md:py-…` en una banda de sección. Usa `Section`.
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
