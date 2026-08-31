# Fotos de producto

**Las fotos del catálogo ya no viven aquí.** Están en Vercel Blob, y
`products.image_url` guarda su URL absoluta.

## Por qué

Esta carpeta existió durante una tarde y fue un error. `image_url` lo leen dos
aplicaciones —el admin y la tienda— y una ruta como
`/images/products/almeja-chione.png` sólo la resuelve quien tenga el archivo en
su propio `public/`. Estaba en el de la tienda, así que en el admin las trece
fotos daban 404 y la lista de productos salía rota.

Copiarlas también al admin habría duplicado 21 MB para tapar el síntoma. El
problema de fondo es que la ruta relativa no es direccionable:

- El selector de imágenes del admin sube a Blob y guarda URL absoluta. Con
  rutas locales, cambiar una foto desde la interfaz la volvía absoluta y el
  catálogo acababa con dos convenciones conviviendo.
- La tienda va a ser un sistema aparte que consume la API. Una ruta relativa la
  obliga a hospedar copias; una URL absoluta la sirve cualquiera.

## Cómo se sube una foto ahora

Dos caminos, los dos acaban en Blob:

- **Una suelta** — desde el admin, editando el producto. Es lo normal.
- **El lote inicial** — `pnpm catalogo:fotos`, que lee los nombres de
  `scripts/catalogo-2026.data.ts`. Salta las que ya están; `--forzar` vuelve a
  subirlas y borra la anterior.

Ese script lee los archivos de esta carpeta, así que si vuelves a necesitarlo,
déjalos aquí temporalmente y bórralos después — no deben acabar en el
repositorio.

## Requisitos de la foto

- Cuadradas o casi. La rejilla recorta a cuadrado (`object-cover`), así que la
  pieza tiene que estar centrada.
- ≥ 1000 px de lado; se sirven hasta a 2x en pantallas densas.
- **JPG antes que PNG.** Las trece actuales son PNG de ~1.6 MB, y a esa escala
  el optimizador de Next se atraganta: pidiendo trece a la vez, algunas superan
  su tiempo de espera de 7 s y salen rotas en el primer render. Un JPG de
  calidad 88 se ve igual y pesa la décima parte.

## Qué pasa si falta una

Nada roto. `lib/commerce/index.ts` comprueba las rutas locales antes de
entregarlas a la página; un producto sin foto sale como los que nunca la
tuvieron, en vez de con el hueco de una imagen rota.
