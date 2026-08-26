/**
 * Commerce configuration.
 *
 * Business thresholds live here, never inline in a component: the shipping
 * banner and the cart both need the same number, and two copies of it will
 * disagree eventually.
 */

/**
 * Free-shipping threshold in centavos, or null when the rule is not configured.
 *
 * Null is meaningful: the ShippingProgress component hides itself rather than
 * inventing a target. Delivery pricing is not modelled in the backend yet.
 */
export const FREE_SHIPPING_THRESHOLD_CENTS: number | null = null;

export const CURRENCY = 'MXN' as const;
export const LOCALE = 'es-MX' as const;
