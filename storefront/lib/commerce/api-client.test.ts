import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * La única puerta entre la tienda y el panel.
 *
 * Todo lo que el cliente ve pasa por aquí, y son dos despliegues distintos que
 * se sueltan por separado: lo que se protege es que un fallo del panel llegue
 * como un error que la tienda pueda contar, y no como un `undefined` que
 * reviente tres componentes más abajo.
 *
 * También se protege una regla de seguridad: el token sólo viaja cuando se pide
 * explícitamente. Mandarlo en toda petición sería filtrarlo a cualquier ruta
 * pública que un día apunte a otro sitio.
 */
/*
 * `connection()` corta el prerenderizado y exige una petición real; fuera de
 * una, lanza. Es una frontera del framework, no lógica de este módulo, así que
 * se sustituye por un no-op. Lo que sí se prueba —que la llamada nunca ocurra
 * durante el build— lo garantiza su presencia, no su comportamiento aquí.
 */
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  connection: async () => {},
}));

const ORIGINAL = { ...process.env };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  process.env.ADMIN_API_URL = 'https://panel.test';
  process.env.STOREFRONT_API_TOKEN = 'secreto';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.unstubAllGlobals();
});

/** Recarga el módulo para que lea las variables de entorno del caso actual. */
async function client() {
  return (await import('./api-client')).api;
}

const respond = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue({
    status,
    json: async () => body,
  });

describe('lo que devuelve', () => {
  it('desenvuelve `data` y entrega sólo el contenido', async () => {
    respond({ data: [{ handle: 'filetes' }] });

    await expect((await client()).get('/api/v1/catalog/collections')).resolves.toEqual([
      { handle: 'filetes' },
    ]);
  });

  it('un sobre de error se convierte en excepción, no en `undefined`', async () => {
    // Sin esto, un fallo del panel llega como `undefined` y explota más abajo,
    // en un componente que no tiene ni idea de por qué.
    respond({ error: { code: 'not_found', message: 'Producto no encontrado.' } }, 404);

    await expect((await client()).get('/api/v1/catalog/products/x')).rejects.toThrow(
      'Producto no encontrado.',
    );
  });

  it('el error conserva su código y su estado', async () => {
    respond({ error: { code: 'database_unavailable', message: 'Servicio no disponible.' } }, 503);

    await expect(
      (await client()).get('/api/v1/catalog/collections'),
    ).rejects.toMatchObject({ code: 'database_unavailable', status: 503 });
  });
});

describe('el token de servicio', () => {
  it('no viaja en una lectura pública', async () => {
    respond({ data: [] });

    await (await client()).get('/api/v1/catalog/collections');

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('viaja sólo cuando se pide', async () => {
    respond({ data: {} });

    await (await client()).post('/api/v1/checkout', {}, { authenticated: true });

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secreto');
  });

  it('falla con un mensaje propio si no está configurado', async () => {
    delete process.env.STOREFRONT_API_TOKEN;
    respond({ data: {} });

    await expect(
      (await client()).post('/api/v1/checkout', {}, { authenticated: true }),
    ).rejects.toThrow(/STOREFRONT_API_TOKEN/);
  });

  it('falla claro cuando no se sabe a qué panel llamar', async () => {
    delete process.env.ADMIN_API_URL;

    await expect((await client()).get('/api/v1/catalog/collections')).rejects.toThrow(
      /ADMIN_API_URL/,
    );
    // Y ni siquiera lo intenta: una URL a medias no se manda a ningún sitio.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('el cacheo', () => {
  it('una lectura de catálogo se puede cachear', async () => {
    respond({ data: [] });

    await (await client()).get('/api/v1/catalog/collections');

    expect(fetchMock.mock.calls[0][1].next).toEqual({ revalidate: 60 });
  });

  it('una escritura nunca', async () => {
    // Cachear un pedido significaría devolver el pedido de otra persona.
    respond({ data: {} });

    await (await client()).post('/api/v1/checkout', { lines: [] });

    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
    expect(fetchMock.mock.calls[0][1].next).toBeUndefined();
  });
});
