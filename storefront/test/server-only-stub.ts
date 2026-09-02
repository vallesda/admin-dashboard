/**
 * Sustituye al paquete `server-only` bajo Vitest.
 *
 * Ese paquete existe para que el build falle cuando un módulo de servidor entra
 * en un bundle de cliente, y lo consigue lanzando al importarse. Un corredor de
 * pruebas no es ni una cosa ni la otra, así que importar el real convierte en
 * imposible de probar todo módulo que lo use — incluida cualquier pantalla que
 * toque `lib/commerce`. Aliasado en `vitest.config.mts`.
 */
export {};
