import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import { hit, resetRateLimits } from './rate-limit';

/**
 * El freno que impide que un anónimo aparte el catálogo entero.
 *
 * Lo que se protege aquí no es un contador bonito: es que `createOrder` reserva
 * inventario **antes** de cobrar, y `placeOrder` es un Server Action público.
 * Si esto deja de frenar, una ráfaga aparta el pescado del día hasta el barrido
 * de la mañana siguiente.
 */

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const LIMIT = { limit: 3, windowMs: 60_000 };

describe('dentro de la ventana', () => {
  it('deja pasar hasta el límite y para en el siguiente', () => {
    expect(hit('a', LIMIT).ok).toBe(true);
    expect(hit('a', LIMIT).ok).toBe(true);
    expect(hit('a', LIMIT).ok).toBe(true);

    // El cuarto es el que sobra.
    expect(hit('a', LIMIT).ok).toBe(false);
  });

  it('va diciendo cuántas quedan', () => {
    expect(hit('a', LIMIT).remaining).toBe(2);
    expect(hit('a', LIMIT).remaining).toBe(1);
    expect(hit('a', LIMIT).remaining).toBe(0);
  });

  it('cuenta cada clave por separado', () => {
    // Dos visitantes distintos no se estorban: si esto falla, el primer cliente
    // del día bloquea a todos los demás.
    hit('a', LIMIT);
    hit('a', LIMIT);
    hit('a', LIMIT);

    expect(hit('a', LIMIT).ok).toBe(false);
    expect(hit('b', LIMIT).ok).toBe(true);
  });
});

describe('cuando la ventana pasa', () => {
  it('vuelve a dejar pasar', () => {
    hit('a', LIMIT);
    hit('a', LIMIT);
    hit('a', LIMIT);
    expect(hit('a', LIMIT).ok).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(hit('a', LIMIT).ok).toBe(true);
  });

  it('no libera antes de tiempo', () => {
    hit('a', LIMIT);
    hit('a', LIMIT);
    hit('a', LIMIT);

    // Un segundo antes del reinicio sigue bloqueado. Sin esta prueba, un error
    // de signo en el cálculo de la ventana pasaría desapercibido.
    vi.advanceTimersByTime(59_000);
    expect(hit('a', LIMIT).ok).toBe(false);
  });

  it('dice cuántos segundos faltan, para poder decírselo al cliente', () => {
    hit('a', LIMIT);
    hit('a', LIMIT);
    hit('a', LIMIT);

    vi.advanceTimersByTime(20_000);
    const result = hit('a', LIMIT);

    expect(result.ok).toBe(false);
    expect(result.retryAfter).toBe(40);
  });
});

describe('el mapa no crece sin fin', () => {
  it('purga las claves vencidas cuando se hace grande', () => {
    // Una ráfaga de claves distintas —lo que haría un bot rotando IPs— no puede
    // hacer que el proceso se quede sin memoria.
    for (let i = 0; i < 10_050; i++) hit(`ip-${i}`, LIMIT);

    vi.advanceTimersByTime(60_001);

    // Tras vencer la ventana, la siguiente consulta limpia y la clave más vieja
    // vuelve a estar disponible.
    expect(hit('ip-0', LIMIT).ok).toBe(true);
    expect(hit('ip-0', LIMIT).remaining).toBe(1);
  });
});
