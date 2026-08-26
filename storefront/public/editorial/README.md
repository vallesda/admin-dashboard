# Fotografía editorial

Imágenes de composición, no de catálogo. Las fotos de producto viven en Vercel
Blob y las sube el admin; estas son del sitio y se versionan con el código.

## Archivos que el código espera

`components/merchandising/occasion-grid.tsx` busca una imagen por cada ocasión,
con el nombre exacto de su `handle`:

| Archivo | Ocasión | Qué debe mostrar |
|---|---|---|
| `sashimi.jpg` | Sashimi | Cortes crudos de atún y salmón |
| `ceviche.jpg` | Ceviche | Ceviche de pescado y camarón |
| `parrilla.jpg` | Parrilla | Pescado y marisco a la parrilla |
| `cena-para-dos.jpg` | Cena para dos | Mesa montada para dos |

`hero-barco.jpg` es el hero de la home.

`nosotros.jpg` es la fotografía de la sección **About** (`components/merchandising/about.tsx`).
Debe mostrar el oficio, no el producto: barco, muelle, pescadores, manos
trabajando. Vertical 4:5, igual que las ocasiones.

**Esta sí se comprueba antes de renderizar** (`existsSync`): sin el archivo, la
sección muestra solo el texto sobre verde de marca, sin romperse.

## Cómo funciona

`OccasionGrid` es un Server Component: comprueba si el archivo existe y solo
entonces lo pasa a `next/image`. Apuntar a un archivo ausente es un error de
runtime, no un hueco elegante, así que la comprobación es lo que mantiene el
fallback siendo un fallback.

**Añadir una foto no requiere tocar código.** Basta con dejar el archivo aquí
con el nombre correcto.

Sin foto, la tarjeta cae a una superficie verde de marca con el título grande.

## Formato

- **JPEG**, no PNG: son fotografías, y el PNG multiplica el peso por diez.
- Vertical, alrededor de 4:5 — es la proporción de la tarjeta.
- Ancho máximo 1600 px; por encima de eso `next/image` no gana nada.
- Menos de ~300 KB cada una.

Para convertir y comprimir:

```bash
sips -s format jpeg origen.png --out sashimi.jpg   # macOS
```
