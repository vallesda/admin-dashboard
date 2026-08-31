/**
 * Los datos del catálogo, separados de quien los usa.
 *
 * Dos consumidores los leen: `catalogo-2026.ts`, que los escribe en la base, y
 * `catalogo-xlsx.ts`, que genera la hoja que se comparte con el mostrador.
 * Teniéndolos en un módulo, la hoja **no puede** decir un precio distinto del
 * que cobra la tienda; con dos copias, el día que alguien corrija una y no la
 * otra nadie se entera hasta que un cliente lo nota.
 */
/**
 * Las seis estanterías.
 *
 * `orden` es el de la navegación de la tienda, y describe cómo se compra: lo
 * de hoy primero, después la forma de la pieza, y al final lo que acompaña.
 *
 * Dos ya existían con otro `slug` (`producto-fresco`, `producto-congelado`) y
 * se conserva: el slug es la URL, y cambiarlo rompería cualquier enlace que ya
 * apunte ahí a cambio de nada que el cliente vea.
 *
 * ## `enNav` — tres de las seis no salen en el menú
 *
 * El menú contesta cómo elige el cliente: **fresco o congelado**, y aparte lo
 * que no es pescado de mostrador. «Filetes» no es esa pregunta —casi todo
 * filete es una de las dos, así que en la barra el menú diría tres veces lo
 * mismo—, y «Entero» y «Complementos» todavía no tienen producto.
 *
 * Ocultas del menú, **no desactivadas**: `/search/filetes` abre, sigue
 * clasificando sus ocho productos y sigue en el sitemap. Desactivarlas era la
 * otra forma de sacarlas de la barra, y se habría llevado por delante la
 * página y la clasificación.
 *
 * `orden` es el de la barra, y ahora dice fresco antes que congelado antes que
 * especiales, que es como se decide.
 */
export const CATEGORIAS = [
  { nombre: 'Fresco', slug: 'producto-fresco', orden: 1, enNav: true },
  { nombre: 'Congelado', slug: 'producto-congelado', orden: 2, enNav: true },
  { nombre: 'Especiales', slug: 'especiales', orden: 3, enNav: true },
  { nombre: 'Filetes', slug: 'filetes', orden: 4, enNav: false },
  { nombre: 'Entero', slug: 'entero', orden: 5, enNav: false },
  { nombre: 'Complementos', slug: 'complementos', orden: 6, enNav: false },
];

/**
 * `Fresco` y `Congelado` son a la vez estantería y regla de inventario.
 *
 * `supply_type` es lo que decide el comportamiento: un `fresh` desaparece del
 * catálogo al agotarse porque hoy ya no hubo, y un `stocked` dice «se acabó,
 * pedimos más». Que la etiqueta y la regla puedan discrepar sería un producto
 * listado en «Congelado» y tratado como captura del día, así que la regla se
 * **deriva** de la etiqueta aquí y no se escribe a mano en ninguna fila.
 */
export const ABASTO: Record<string, 'fresh' | 'stocked'> = {
  Fresco: 'fresh',
  Congelado: 'stocked',
};

export type Fila = {
  sku: string;
  nombre: string;
  /** Pesos, no centavos: es como viene la lista y como se revisa a ojo. */
  precio: number;
  cantidad: number;
  unidad: 'kg' | 'gr' | 'docena';
  categorias: string[];
  nombreEnTienda: string;
  clave: string;
  imagen: string;
};

export const PRODUCTOS: Fila[] = [
  { sku: 'AAM-0014', nombre: 'Almeja Chione', precio: 145, cantidad: 1, unidad: 'kg', categorias: ['Especiales'], nombreEnTienda: 'Almeja Chione kg', clave: 'AMC008', imagen: 'almeja-chione.png' },
  { sku: 'AAM-0015', nombre: 'Almeja Chocolata', precio: 370, cantidad: 1, unidad: 'docena', categorias: ['Especiales'], nombreEnTienda: 'Almeja Chocolata Doc', clave: 'AMC79', imagen: 'almeja-chocolata.png' },
  { sku: 'AAM-0038', nombre: 'Callo Media Luna', precio: 900, cantidad: 500, unidad: 'gr', categorias: ['Especiales'], nombreEnTienda: 'Callo Media Luna 500 gr', clave: '01111', imagen: 'callo-media-luna.png' },
  { sku: 'AAM-0040', nombre: 'Camaron con Cabeza 10/20', precio: 800, cantidad: 1, unidad: 'kg', categorias: ['Especiales'], nombreEnTienda: 'Camaron con Cabeza 10/20 Kg', clave: '01114', imagen: 'camaron-con-cabeza-10-20.png' },
  { sku: 'AAM-0050', nombre: 'Filete de Jurel', precio: 750, cantidad: 1, unidad: 'kg', categorias: ['Filetes', 'Congelado'], nombreEnTienda: 'Cong Filete de Jurel Kg', clave: 'AMC121', imagen: 'congelado-filete-jurel.png' },
  { sku: 'AAM-0053', nombre: 'Filete de Salmon', precio: 800, cantidad: 1, unidad: 'kg', categorias: ['Filetes', 'Congelado'], nombreEnTienda: 'Cong Filete de Salmon Kg', clave: 'AMC119', imagen: 'congelado-filete-salmon.png' },
  { sku: 'AAM-0065', nombre: 'Filete Aleta Azul', precio: 1500, cantidad: 1, unidad: 'kg', categorias: ['Filetes', 'Fresco'], nombreEnTienda: 'Fresh Filete Aleta Azul Kg', clave: 'AMC009', imagen: 'fresco-filete-atun-aleta-azul.png' },
  { sku: 'AAM-0066', nombre: 'Filete Baqueta', precio: 950, cantidad: 1, unidad: 'kg', categorias: ['Filetes', 'Fresco'], nombreEnTienda: 'Fresh Filete Baqueta Kg', clave: 'AMC124', imagen: 'fresco-filete-baqueta.png' },
  { sku: 'AAM-0068', nombre: 'Filete Cabicucho', precio: 1050, cantidad: 1, unidad: 'kg', categorias: ['Filetes', 'Fresco'], nombreEnTienda: 'Fresh Filete Cabicucho Kg', clave: '01203', imagen: 'fresco-filete-cabicucho.png' },
  { sku: 'AAM-0070', nombre: 'Filete Huachinango', precio: 1050, cantidad: 1, unidad: 'kg', categorias: ['Filetes', 'Fresco'], nombreEnTienda: 'Fresh Filete Huachinango kg', clave: '01193', imagen: 'fresco-filete-huachinango.png' },
  { sku: 'AAM-0071', nombre: 'Filete Lenguado', precio: 650, cantidad: 1, unidad: 'kg', categorias: ['Filetes', 'Fresco'], nombreEnTienda: 'Fresh Filete Lenguado Kg', clave: 'AMC068', imagen: 'fresco-filete-lenguado.png' },
  { sku: 'AAM-0077', nombre: 'Filete Salmon', precio: 800, cantidad: 1, unidad: 'kg', categorias: ['Filetes', 'Fresco'], nombreEnTienda: 'Fresh Filete Salmon Kg', clave: 'AMC031', imagen: 'fresco-filete-salmon.png' },
  { sku: 'AAM-0090', nombre: 'Ostion Chingon', precio: 430, cantidad: 1, unidad: 'docena', categorias: ['Especiales'], nombreEnTienda: 'Ostion Chingon Docena', clave: '01136', imagen: 'ostion-chingon.png' },
];

/** Los ocho productos de prueba con los que se construyó el sistema. */
export const DE_PRUEBA = [
  'ALM-CHIONE',
  'ALM-CHOCO',
  'ATU-1K',
  'ATU-500',
  'HUA-800',
  'MEJ-1K',
  'PUL-500',
  'SAL-500',
];
