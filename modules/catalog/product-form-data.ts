/**
 * Lectura del formulario de producto.
 *
 * Vive fuera de `actions.ts` por una razón concreta: aquél es un módulo
 * `'use server'`, y ahí sólo se pueden exportar funciones asíncronas. Mientras
 * esta función estuvo dentro no se podía probar, y su desajuste con el esquema
 * —cuatro campos que el formulario enviaba y esta lectura no recogía— pasó
 * inadvertido precisamente por eso: no rompe nada, sólo guarda vacío.
 */
/**
 * Reads the product form.
 *
 * Empty strings become `undefined` for the optional fields so the schema can
 * tell "not provided" from "provided as blank" — the difference between leaving
 * cost unrecorded and recording a cost of zero.
 */
export function readProductForm(formData: FormData) {
  const text = (key: string) => {
    const value = String(formData.get(key) ?? '').trim();
    return value === '' ? undefined : value;
  };

  return {
    sku: formData.get('sku'),
    name: formData.get('name'),
    slug: text('slug'),

    /*
     * Los cuatro campos que el cliente lee en la ficha.
     *
     * Van aquí, uno por uno, porque esta función **no** vuelca el formulario
     * entero: cada campo se nombra a mano. Cuando se añadieron al esquema y al
     * formulario sin tocar esta lista, el efecto fue el peor posible — nada
     * falló. `optionalText` acepta `undefined` y lo convierte en `null`, así
     * que el formulario aceptaba el texto, el guardado respondía que sí, y el
     * producto se quedaba con los campos vacíos. Ni un error en pantalla ni una
     * línea en el log.
     *
     * Añadir un campo a un producto son cuatro sitios, no tres: esquema,
     * servicio, formulario y esta lectura.
     */
    shortDescription: text('shortDescription'),
    description: text('description'),
    origin: text('origin'),
    presentation: text('presentation'),
    storageInstructions: text('storageInstructions'),
    // `getAll`, no `get`: las categorías son casillas y llegan varias con el
    // mismo nombre. Con `get` sólo entraría la primera, y el producto se
    // guardaría en una sola de las estanterías que el operador marcó.
    categoryIds: formData.getAll('categoryIds'),
    // Una casilla sin marcar no viaja en el formulario: `get` devuelve null y
    // el `.default(false)` del esquema la apaga, que es justo lo que hace falta.
    isFeatured: formData.get('isFeatured') === 'on',
    isSeasonal: formData.get('isSeasonal') === 'on',
    isFeaturedItem: formData.get('isFeaturedItem') === 'on',
    priceCents: formData.get('priceCents'),
    costCents: text('costCents'),
    imageUrl: text('imageUrl'),
    unitType: formData.get('unitType'),
    netWeightGrams: text('netWeightGrams'),
    supplyType: formData.get('supplyType') ?? 'fresh',
    preorderCutoffWeekday: text('preorderCutoffWeekday') ?? null,
    preorderCutoffHour: text('preorderCutoffHour') ?? null,
    preorderArrivalWeekday: text('preorderArrivalWeekday') ?? null,
    preorderNote: text('preorderNote') ?? null,
  };
}
