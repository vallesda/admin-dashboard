/**
 * Convierte un nombre en el identificador que va en una URL.
 *
 * Vive aquí y no dentro de la página que lo usaba porque no era el único sitio:
 * los iconos de categoría normalizaban igual por su cuenta, y dos copias de una
 * regla de texto acaban discrepando en el acento de alguna categoría — que es
 * exactamente el caso que este código existe para resolver.
 *
 * ## Qué hace y por qué en ese orden
 *
 * `normalize('NFD')` separa cada letra acentuada en letra + acento, y el
 * segundo `replace` borra los acentos sueltos. Es lo que hace que «Atún» y
 * «Atun» lleguen al mismo sitio, y lo que alinea este resultado con el que el
 * panel usó al guardar el producto.
 *
 * El recorte final quita los guiones de los extremos: sin él, «¡Ofertas!»
 * produciría `-ofertas-`, que es una URL distinta de `ofertas`.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Quita acentos y baja a minúsculas, **sin** convertir a URL.
 *
 * Para comparar textos, no para enlazarlos: los iconos de categoría buscan
 * «congel» dentro de «Producto Congelado» y unos guiones en medio sólo
 * estorbarían.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
