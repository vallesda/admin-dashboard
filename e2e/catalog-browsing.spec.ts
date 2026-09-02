import { test, expect } from '@playwright/test';

import { adminApi, buyableProduct } from './helpers';

/**
 * Navegar y armar el carrito.
 *
 * Rápido y sin Stripe. Lo que se protege es lo que el sistema de diseño llama
 * información de primera clase: el estado del inventario. Un producto agotado
 * que se deja agregar es un pedido que la pescadería no puede cumplir, y el
 * catálogo de esta tienda cambia todos los días por diseño.
 */

type Item = {
  id: string;
  handle: string;
  name: string;
  available: number;
  availableForSale: boolean;
  collections: string[];
};

async function catalog(): Promise<Item[]> {
  const page = await adminApi<{ items: Item[] }>('/api/v1/catalog/products?limit=100');
  return page.items;
}

test('las colecciones filtran de verdad (P21)', async ({ page }) => {
  const items = await catalog();
  const congelado = items.filter((p) => p.collections.includes('producto-congelado'));

  test.skip(congelado.length === 0, 'No hay producto congelado en la base de desarrollo.');

  await page.goto('/search/producto-congelado');
  await expect(page.getByText(congelado[0].name).first()).toBeVisible();

  // Y algo de otra colección no se cuela.
  const fuera = items.find((p) => !p.collections.includes('producto-congelado'));
  if (fuera) {
    expect(await page.getByText(fuera.name).count()).toBe(0);
  }
});

test('un producto agotado no se puede agregar (P22)', async ({ page }) => {
  const agotado = (await catalog()).find((p) => !p.availableForSale || p.available === 0);

  test.skip(!agotado, 'No hay ningún producto agotado ahora mismo.');

  await page.goto(`/product/${agotado!.handle}`);

  /*
   * Deshabilitado y visible, no escondido. El sistema de diseño lo pide así a
   * propósito: una tarjeta sin botón rompe la altura de la fila y deja el
   * estado dependiendo sólo del chip.
   */
  const boton = page.getByRole('button', { name: /Agotado|Agregar al carrito/ }).first();
  await expect(boton).toBeVisible();
  await expect(boton).toBeDisabled();
});

test('el carrito sobrevive a una recarga (P23)', async ({ page }) => {
  const product = await buyableProduct();

  await page.goto(`/product/${product.handle}`);
  await page.getByRole('button', { name: 'Agregar al carrito' }).first().click();
  await expect(page.getByRole('button', { name: /artículo/i })).toBeVisible();

  await page.reload();

  // Vive en `localStorage`, así que una recarga no puede vaciarlo: quien vuelve
  // al día siguiente encuentra su pedido a medio armar.
  await expect(page.getByRole('button', { name: /artículo/i })).toBeVisible();
});

test('la cantidad es la misma en la rejilla y en la ficha (P24)', async ({ page }) => {
  /*
   * La regla del carrito como fuente de verdad: la cantidad se lee del carrito
   * en cada render, nunca se copia a estado local. El mismo producto puede
   * verse en dos sitios a la vez y una copia desactualizada sería un pedido
   * equivocado.
   */
  const product = await buyableProduct(2);

  await page.goto(`/product/${product.handle}`);
  await page.getByRole('button', { name: 'Agregar al carrito' }).first().click();
  // Por su nombre accesible, no por el glifo: el «+» es decorativo y el
  // `aria-label` es lo que un lector de pantalla —y esta prueba— usan.
  await page
    .getByRole('button', { name: new RegExp(`Agregar uno de ${product.name}`, 'i') })
    .first()
    .click();

  await page.goto('/search');

  /*
   * La cifra por su rótulo accesible, no por la forma de la tarjeta.
   *
   * Buscarla dentro de un `article`/`li` ataba la prueba al marcado de la
   * rejilla, que es justo lo que un rediseño cambia sin romper nada. El
   * `aria-label` es contrato con el lector de pantalla y sobrevive.
   */
  const cifra = page.locator(`[aria-label="Cantidad de ${product.name}"]`).first();

  // Es un `<input type=number>`: la cantidad está en su `value`, no en el texto.
  await expect(cifra).toBeVisible();
  await expect(cifra).toHaveValue('2');
});
