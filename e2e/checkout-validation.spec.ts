import { test, expect, type Page } from '@playwright/test';

import { buyableProduct, priceOf, sessionIdOf, stripeSession } from './helpers';

/**
 * El formulario, antes de que haya dinero de por medio.
 *
 * Casi todo esto es rápido y no toca Stripe. La excepción es la última prueba,
 * que es de seguridad y no de interfaz: el carrito vive en `localStorage` y
 * viaja como JSON en un campo oculto, así que **tiene** que comprobarse contra
 * el importe real que se le pide a Stripe, no contra lo que la pantalla diga.
 */

/** Deja un producto en el carrito y abre el checkout. */
async function withCart(page: Page, quantity = 1) {
  const product = await buyableProduct(quantity);
  await page.goto(`/product/${product.handle}`);

  for (let i = 0; i < quantity; i++) {
    await page.getByRole('button', { name: /Agregar al carrito|^\+$/ }).first().click();
  }

  await page.goto('/checkout');
  return product;
}

async function fillCustomer(page: Page) {
  await page.locator('input[name="name"]').fill('Ana Torres');
  await page.locator('input[name="phone"]').fill('8112345678');
  await page.locator('input[name="email"]').fill('ana@example.com');
  await page.getByRole('button', { name: 'Continuar' }).click();
}

test('carrito vacío: no hay nada que pedir (P15)', async ({ page }) => {
  await page.goto('/checkout');

  await expect(page.getByText(/carrito está vacío/i)).toBeVisible();
  // Sin formulario no hay forma de crear un pedido sin líneas.
  expect(await page.locator('input[name="name"]').count()).toBe(0);
});

test('domicilio sin dirección: lo dice junto al campo (P16)', async ({ page }) => {
  await withCart(page);
  await fillCustomer(page);

  await page.locator('input[name="fulfillmentType"][value="delivery"]').first().check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Sin viaje al servidor: el error aparece donde está el problema.
  await expect(page.getByText('Escribe la calle.')).toBeVisible();
  await expect(page.getByText('Escribe la colonia.')).toBeVisible();
  await expect(page.getByText('El código postal son 5 dígitos.')).toBeVisible();
});

test('código postal fuera de zona: bloquea y explica (P17)', async ({ page }) => {
  await withCart(page);
  await fillCustomer(page);

  await page.locator('input[name="fulfillmentType"][value="delivery"]').first().check();
  await page.locator('input[name="postalCode"]').fill('99999');

  const continuar = page.getByRole('button', { name: 'Continuar' });
  await expect(continuar).toBeDisabled({ timeout: 15_000 });
  await expect(
    page.getByText(/Todavía no entregamos en ese código postal/i),
  ).toBeVisible();
});

test('dentro de zona: el envío aparece y entra en el total (P18)', async ({ page }) => {
  const product = await withCart(page);
  const price = await priceOf(product.id);

  await fillCustomer(page);
  await page.locator('input[name="fulfillmentType"][value="delivery"]').first().check();
  // 66220 es Del Valle, San Pedro: la zona de $50 que sembró
  // `scripts/seed-delivery-zones.ts`. Antes esta prueba usaba 06500 —Roma, en
  // Ciudad de México—, que venía de datos de demo de otra ciudad.
  await page.locator('input[name="postalCode"]').fill('66220');

  await expect(page.getByText(/Valle y Campestre/i)).toBeVisible({ timeout: 15_000 });

  const total = ((price + 5_000) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
  });
  await expect(page.getByText(`$${total}`)).toBeVisible();
});

test('el importe lo decide el servidor, no el navegador (P20)', async ({ page }) => {
  /*
   * Prueba de seguridad, no de interfaz.
   *
   * El carrito viaja como JSON en un campo oculto porque vive en
   * `localStorage` y el servidor no puede leerlo. Eso es seguro **sólo** si lo
   * único que viaja son identificadores y cantidades: manipularlo tiene que
   * cambiar *qué* se pide, nunca *cuánto* cuesta (RN-008).
   *
   * Se comprueba contra el importe que Stripe va a cobrar de verdad, que es el
   * único número que importa — lo que la pantalla enseñe es una vista previa.
   */
  const product = await withCart(page);
  const price = await priceOf(product.id);

  await fillCustomer(page);
  await page.locator('input[name="fulfillmentType"][value="pickup"]').first().check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Se edita el campo oculto justo antes de enviar, como lo haría alguien con
  // las herramientas del navegador abiertas.
  await page.evaluate((productId) => {
    const input = document.querySelector<HTMLInputElement>('[name="lines"]')!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(input, JSON.stringify([{ productId, quantity: 3 }]));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, product.id);

  await page.getByRole('button', { name: 'Ir a pagar' }).click();
  await page.waitForURL(/checkout\.stripe\.com/, {
    timeout: 60_000,
    waitUntil: 'domcontentloaded',
  });

  const session = await stripeSession(sessionIdOf(page.url()));

  // Tres piezas al precio del catálogo. Ni más caro ni —lo que importa— más
  // barato de lo que la tienda cobra.
  expect(session.amount_total).toBe(price * 3);
});
