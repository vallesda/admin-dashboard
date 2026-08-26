/**
 * TDA — public shapes.
 *
 * This file is the contract. Everything the storefront can see is declared
 * here, and nothing reaches it that is not built by one of these mappers.
 *
 * The point is subtraction. The domain rows carry `costCents` (your margin),
 * `onHand` and `reserved` (how much you buy and how fast you sell). None of
 * that is the storefront's business, and spreading a domain row into a response
 * is exactly how it would leak.
 *
 * Field names follow the storefront's vocabulary (`handle`, `availableForSale`)
 * rather than the database's, so the public contract can stay stable while the
 * schema underneath keeps moving.
 */
import type { ProductRow, CategoryRow } from '@/db/schema/catalog';

export type Money = {
  /** Integer centavos — the storefront formats, never computes. */
  amountCents: number;
  currency: 'MXN';
};

export type PublicImage = {
  url: string;
  altText: string;
};

/**
 * A purchasable option.
 *
 * The MVP has exactly one per product: `RN-001` says a Product *is* the SKU,
 * so "Salmón 500 g" and "Salmón 1 kg" are two Products, not two variants of
 * one. The array exists so the storefront can render its variant selector
 * without a special case, and so introducing real variants later does not
 * change the response shape.
 */
export type PublicVariant = {
  id: string;
  title: string;
  price: Money;
  availableForSale: boolean;
  /** Units left. Never `onHand`/`reserved` separately — that is stock intel. */
  available: number;
};

export type PublicProduct = {
  id: string;
  handle: string;
  name: string;
  shortDescription: string | null;
  description: string | null;

  category: string | null;
  collections: string[];

  featuredImage: PublicImage | null;
  images: PublicImage[];

  price: Money;
  unit: 'piece' | 'pack' | 'kg';
  netWeightGrams: number | null;

  origin: string | null;
  presentation: string | null;
  availableForSale: boolean;
  available: number;

  featured: boolean;
  seasonal: boolean;

  preparationSuggestions: string[];
  storageInstructions: string | null;

  variants: PublicVariant[];

  seo: { title: string; description: string | null };
};

export type PublicCollection = {
  handle: string;
  title: string;
};

type ProductSource = ProductRow & {
  categoryName: string | null;
  categorySlug: string | null;
  available: number;
};

export function toPublicProduct(row: ProductSource): PublicProduct {
  // Only `active` products are ever queried, but availability is what decides
  // whether the button says "Agregar" or "Agotado".
  const availableForSale = row.status === 'active' && row.available > 0;

  const image: PublicImage | null = row.imageUrl
    ? { url: row.imageUrl, altText: row.name }
    : null;

  const price: Money = { amountCents: row.priceCents, currency: 'MXN' };

  return {
    id: row.id,
    handle: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    description: row.description,

    category: row.categoryName,
    // One category today. The storefront wants taxonomy *and* intent
    // ("Sashimi", "Parrilla"), which needs a many-to-many — see the gap note in
    // DOCS. Returning an array now keeps that change invisible to the client.
    collections: row.categorySlug ? [row.categorySlug] : [],

    featuredImage: image,
    images: image ? [image] : [],

    price,
    unit: row.unitType,
    netWeightGrams: row.netWeightGrams,

    origin: row.origin,
    presentation: row.presentation,
    availableForSale,
    available: row.available,

    featured: row.isFeatured,
    seasonal: row.isSeasonal,

    preparationSuggestions: row.preparationSuggestions ?? [],
    storageInstructions: row.storageInstructions,

    variants: [
      {
        id: row.id,
        title: row.presentation ?? row.name,
        price,
        availableForSale,
        available: row.available,
      },
    ],

    seo: {
      title: row.name,
      description: row.shortDescription ?? row.description,
    },
  };
}

export function toPublicCollection(row: CategoryRow): PublicCollection {
  return { handle: row.slug, title: row.name };
}

export type PublicOrderLine = {
  name: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
};

/**
 * Order confirmation.
 *
 * Addressed by `publicToken`, never by `orderNumber`: the number is sequential,
 * so a URL built on it would be an enumeration of every customer's contact
 * details. The number is still returned — it is what the customer quotes on the
 * phone — but it is not the key.
 */
export type PublicOrder = {
  orderNumber: number;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  customerName: string;
  deliveryAddress: string | null;
  lines: PublicOrderLine[];
  subtotal: Money;
  deliveryFee: Money;
  total: Money;
  createdAt: string;
};
