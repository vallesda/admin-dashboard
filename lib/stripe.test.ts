import { afterEach, describe, expect, it } from 'vitest';

import { isAllowedReturnUrl, allowedReturnOrigins } from './stripe';

/**
 * The allow-list that keeps a storefront-supplied return URL from becoming an
 * open redirect wearing the shop's branding (DOCS/PAGOS.md §13).
 *
 * The storefront sends its own return URLs because it is about to live in
 * another repository and the admin cannot carry its domain. This is what makes
 * that safe.
 */
const original = process.env.STOREFRONT_ALLOWED_ORIGINS;

afterEach(() => {
  process.env.STOREFRONT_ALLOWED_ORIGINS = original;
});

const withOrigins = (value: string) => {
  process.env.STOREFRONT_ALLOWED_ORIGINS = value;
};

describe('isAllowedReturnUrl', () => {
  it('acepta una ruta cualquiera de un origen permitido', () => {
    withOrigins('https://amoramar.mx');

    expect(isAllowedReturnUrl('https://amoramar.mx/pedido/abc')).toBe(true);
    expect(isAllowedReturnUrl('https://amoramar.mx/checkout?cancelado=1')).toBe(true);
  });

  it('rechaza un origen desconocido', () => {
    withOrigins('https://amoramar.mx');

    expect(isAllowedReturnUrl('https://evil.example/pedido/abc')).toBe(false);
  });

  it('rechaza un dominio que sólo empieza igual', () => {
    // The reason this compares origins and not prefixes.
    withOrigins('https://amoramar.mx');

    expect(isAllowedReturnUrl('https://amoramar.mx.evil.com/pedido')).toBe(false);
  });

  it('distingue el esquema y el puerto', () => {
    withOrigins('https://amoramar.mx');

    expect(isAllowedReturnUrl('http://amoramar.mx/pedido')).toBe(false);
    expect(isAllowedReturnUrl('https://amoramar.mx:8443/pedido')).toBe(false);
  });

  it('admite varios orígenes separados por coma, con espacios', () => {
    withOrigins(' https://amoramar.mx , https://staging.amoramar.mx ');

    expect(isAllowedReturnUrl('https://staging.amoramar.mx/pedido')).toBe(true);
    expect(allowedReturnOrigins()).toHaveLength(2);
  });

  it('falla cerrado cuando la lista no está configurada', () => {
    // An unset allow-list must mean "nobody", never "everybody".
    withOrigins('');

    expect(isAllowedReturnUrl('https://amoramar.mx/pedido')).toBe(false);
  });

  it('rechaza lo que no es una URL', () => {
    withOrigins('https://amoramar.mx');

    expect(isAllowedReturnUrl('/pedido/abc')).toBe(false);
    expect(isAllowedReturnUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedReturnUrl('')).toBe(false);
  });
});
