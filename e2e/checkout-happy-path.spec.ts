import { test, expect } from '@playwright/test';

import {
  CARDS,
  buyableProduct,
  payWithCard,
  stockOf,
  waitForPaymentStatus,
} from './helpers';

/**
 * El camino completo, como lo recorre un cliente.
 *
 * Catálogo → producto → carrito → checkout → Stripe → página del pedido. Es la
 * única prueba que ejercita la cadena entera; todo lo demás la corta por algún
 * sitio para poder ser rápido o determinista.
 */
test('comprar un producto y verlo pagado', async ({ page }) => {
  const product = await buyableProduct();
  const stockBefore = await stockOf(product.id);

  await test.step('el catálogo muestra el producto', async () => {
    await page.goto('/search');
    await expect(page.getByText(product.name).first()).toBeVisible();
  });

  await test.step('se agrega al carrito', async () => {
    /*
     * Se navega por `handle` en vez de hacer clic en la rejilla.
     *
     * Hacer clic en el nombre y luego en «Agregar» encadena dos navegaciones y
     * una hidratación: la primera versión de esta prueba pasaba y fallaba
     * alternándose porque el botón se pulsaba antes de que el carrito estuviera
     * vivo. Ir directo a la ficha quita la carrera sin quitar cobertura — la
     * rejilla ya la cubre `product-grid.component.test.tsx`.
     */
    await page.goto(`/product/${product.handle}`);
    await page.getByRole('button', { name: 'Agregar al carrito' }).first().click();

    // El carrito vive en localStorage y el formulario del checkout no existe
    // si está vacío. Esperar a que lo diga la cabecera es lo que hace que el
    // paso siguiente no dependa de la suerte.
    await expect(page.getByRole('button', { name: /artículo/i })).toBeVisible();
  });

  await test.step('paso 1 · tus datos', async () => {
    await page.goto('/checkout');
    await page.locator('input[name="name"]').fill('Prueba Automatizada');
    await page.locator('input[name="phone"]').fill('6121234567');
    // Obligatorio: es donde llega el comprobante y lo que Stripe usa como
    // `customer_email`.
    await page.locator('input[name="email"]').fill('e2e@example.com');
    await page.getByRole('button', { name: 'Continuar' }).click();
  });

  await test.step('paso 2 · entrega', async () => {
    // Recoger en tienda: evita depender de que el código postal caiga dentro de
    // una zona de reparto, que es una regla de `DEL` y tiene sus propias
    // pruebas.
    await page
      .locator('input[name="fulfillmentType"][value="pickup"]')
      .first()
      .check();
    await page.getByRole('button', { name: 'Continuar' }).click();
  });

  await test.step('paso 3 · revisar', async () => {
    // El paso existe para que el comprador relea lo que escribió; si no lo
    // muestra, no está cumpliendo su única función.
    await expect(page.getByText('Revisa antes de pagar')).toBeVisible();
    await expect(page.getByText('e2e@example.com')).toBeVisible();

    await page.getByRole('button', { name: 'Ir a pagar' }).click();
  });

  await test.step('Stripe cobra la tarjeta', async () => {
    await page.waitForURL(/checkout\.stripe\.com/, {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    });
    await payWithCard(page, CARDS.ok);
  });

  const token = await test.step('vuelve a la página del pedido', async () => {
    await page.waitForURL(/\/pedido\//, { timeout: 60_000 });
    const match = /\/pedido\/([0-9a-f-]{36})/.exec(page.url());
    expect(match, 'La vuelta de Stripe no trajo el token del pedido').toBeTruthy();
    return match![1];
  });

  await test.step('el pedido queda pagado y confirmado', async () => {
    const order = await waitForPaymentStatus(token, 'paid');

    expect(order.status).toBe('confirmed');
    // Lo que hace imposible una conciliación mentirosa: lo cobrado es
    // exactamente lo que el servidor calculó, no lo que el navegador dijo.
    expect(order.payment.amountPaid.amountCents).toBe(order.total.amountCents);
    expect(order.payment.methodLabel).toBe('Tarjeta');
  });

  await test.step('el stock bajó una sola vez', async () => {
    // Se apartó al crear el pedido; cobrar no debe volver a descontarlo.
    expect(await stockOf(product.id)).toBe(stockBefore - 1);
  });
});
