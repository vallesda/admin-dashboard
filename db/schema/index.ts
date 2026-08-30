/**
 * Barrel for the Drizzle schema.
 *
 * One file per bounded context. The tutorial's tables (`users`, `invoices`,
 * `revenue`) were dropped in F4; `customers` survived and moved to its own
 * context.
 */
export * from './identity';
export * from './customers';
export * from './sales';
export * from './catalog';
export * from './inventory';
export * from './payments';
export * from './delivery';
