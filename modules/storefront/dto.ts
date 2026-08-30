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

// ---------------------------------------------------------------------------
// Home shelf
// ---------------------------------------------------------------------------

/**
 * One tile on the storefront's home shelf.
 *
 * The shelf mixes two different things — a category, which filters the
 * catalogue, and a package, which is a fixed curated bundle — because from the
 * shopper's side they answer the same question: "what am I making?" `kind` is
 * what lets the storefront build the right link without knowing either table.
 *
 * The four entries this replaces were hardcoded in the storefront with no data
 * behind them, so their pages showed the entire catalogue under an apology.
 */
export type PublicShelfItem = {
  kind: 'category' | 'package';
  handle: string;
  title: string;
  tagline: string | null;
  image: PublicImage | null;
  /** Packages only: how many pieces the bundle holds. */
  itemCount: number | null;
};

export type PublicPackageLine = {
  product: PublicProduct;
  quantity: number;
};

/**
 * A package and everything in it.
 *
 * `total` is the sum of its lines and nothing else — a package has no stored
 * price. Checkout recomputes every peso from the catalogue inside the same
 * transaction that reserves the stock (RN-008), so this figure is display data
 * exactly like a product's price is.
 *
 * `availableForSale` is true only when every line can be filled. A bundle sold
 * as "everything for this dish" that arrives missing a piece is worse than one
 * that says up front it is incomplete today.
 */
export type PublicPackage = {
  handle: string;
  title: string;
  tagline: string | null;
  description: string | null;
  image: PublicImage | null;
  lines: PublicPackageLine[];
  total: Money;
  availableForSale: boolean;
};

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
