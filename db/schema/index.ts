/**
 * Barrel for the Drizzle schema.
 *
 * Each domain owns a file. Phase 0 only models what already exists in the
 * database (the tutorial tables); the ecommerce domains land in later phases as
 * separate files re-exported from here.
 */
export * from './legacy';
export * from './catalog';
