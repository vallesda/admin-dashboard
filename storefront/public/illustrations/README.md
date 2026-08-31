# Ilustraciones

Dibujo a línea sobre dos pescados colgados, en dos versiones. Son el mismo
motivo: la diferencia es el disco amarillo de fondo y las tintas.

| Archivo | Versión | Dónde se usa |
|---|---|---|
| `semanal-fishes.svg` | **con** disco amarillo, línea menta | «La pesca de la semana», en la portada |
| `checkout-fishes.svg` | sin fondo, tintas originales | Confirmación de pedido (`/pedido/[token]`) |

## Por qué cada una donde está

La banda de la pesca de la semana es **verde plena**. La versión con disco se
sostiene sobre ese fondo; la de línea suelta se perdería.

La confirmación de pedido es **crema y sobria** — alguien acaba de comprar y lo
que necesita es leer su pedido. Ahí la versión sin fondo acompaña sin celebrar.

## Por qué SVG

Antes eran PNG. El dibujo es línea plana de tres o cuatro tintas, que es
justamente lo que un vector describe mejor que un mapa de bits: escala sin
pixelarse a cualquier densidad de pantalla, el fondo es transparente de
nacimiento en vez de recortado a mano, y las tintas son valores editables en vez
de píxeles.

Pesan además menos que el WebP que sustituyen (~13 KB comprimidos cada uno) tras
pasar por el paso de simplificación que se describe abajo.

Se sirven con `unoptimized`: el optimizador de Next rechaza SVG salvo que se
active `dangerouslyAllowSVG`, y activarlo para todo el sitio por un adorno sería
abrir la puerta a servir SVG de terceros —que pueden traer scripts— desde
nuestro dominio. Un archivo propio y estático no gana nada pasando por ahí.

## El paso de simplificación

Los archivos originales eran calcos automáticos: el vectorizador siguió la
retícula de píxeles, así que cada contorno era una escalera de segmentos de un
píxel —25 000 puntos por archivo, 66 KB comprimidos— y el dentado se veía a
tamaño de sello como suciedad en el trazo.

Se pasaron por Douglas–Peucker con epsilon de 0.7 unidades del `viewBox`,
descartando las motas de menos de 2.5 px² que deja el calco. Quedan ~8 700
puntos, un tercio del peso, y la escalera se convierte en la diagonal que el
dibujo quería. A la escala en que se muestran (~0.3x) el error es invisible.

Dos detalles que costaron un intento fallido, por si hay que rehacerlo: un
contorno cerrado no tiene principio, así que hay que rotarlo hasta un vértice
real antes de simplificar —si no, Douglas–Peucker ancla los dos extremos y deja
un pico falso donde cayó el corte—; y tras `z` el punto actual vuelve al inicio
del subtrazado, no se queda en el último vértice.

## Las tintas

El calco trajo cuatro colores propios. En `checkout-fishes.svg` se dejan como
están: sobre el crema de la página funcionan.

En `semanal-fishes.svg` **no podían quedarse**. La tinta oscura del calco era
`#1F463F` y la banda es `#0C473F`: alrededor de 1.3:1, invisible. El pez de la
derecha desaparecía y el disco quedaba como una media luna rota.

| Original | En la banda | Por qué |
|---|---|---|
| `#1F463F` línea | `#D1F9E2` (`--brand-soft`) | Reversa sobre fondo oscuro. Se eligió la menta y no el crema porque el crema es el color del texto de la banda: el sello competiría con la copia en vez de acompañarla |
| `#E4C352` disco | `#F4E23F` (`--sun`) | El amarillo de marca. Dos amarillos a unos grados de distancia en la misma pantalla —el disco y la palabra «semana»— leen como error, no como decisión |
| `#486966`, `#748B8E` cuerpos | sin cambio | Son tonos medios; sobre el verde siguen leyendo |

Si algún día se cambia `--brand` o `--sun`, estas dos constantes hay que
moverlas a mano: van dentro del SVG, no en la hoja de estilos.

## Requisitos si se sustituyen

- SVG con trazados de verdad, no un PNG incrustado en `<image>`.
- Vertical. `semanal` ronda 2:3 y `checkout` 1:2; los componentes declaran
  `width`/`height` con las medidas exactas del `viewBox` para reservar el hueco
  y no mover el layout mientras cargan. **Si cambia la proporción, hay que
  actualizar esos números**, no sólo el archivo.
- Recortado al dibujo, sin márgenes transparentes: el tamaño en pantalla se
  ajusta con CSS y un margen incrustado lo descuadra.
