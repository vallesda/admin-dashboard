/**
 * Stands in for the `server-only` package under Vitest.
 *
 * That package exists to make a build fail when a server module is pulled into
 * a client bundle, and it does so by throwing on import. A test runner is
 * neither a server nor a client bundle, so importing the real one turns every
 * `server-only` module into an untestable one. Aliased in `vitest.config.mts`.
 */
export {};
