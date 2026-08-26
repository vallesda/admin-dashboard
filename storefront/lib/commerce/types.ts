/**
 * Commerce types.
 *
 * These mirror the admin API's public contract (`modules/storefront/dto.ts`).
 * They are declared here rather than imported so the storefront stays a real
 * client: when the two repos separate, this file does not change.
 */
export type Money = {
  amountCents: number;
  currency: 'MXN';
};

export type ProductImage = {
  url: string;
  altText: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  price: Money;
  availableForSale: boolean;
  available: number;
};

export type Product = {
  id: string;
  handle: string;
  name: string;
  shortDescription: string | null;
  description: string | null;

  category: string | null;
  collections: string[];

  featuredImage: ProductImage | null;
  images: ProductImage[];

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

  variants: ProductVariant[];

  seo: { title: string; description: string | null };
};

export type Collection = {
  handle: string;
  title: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  totalPages: number;
};

/** A line in the browser-held cart. Never sent as a price — only ids. */
export type CartLine = {
  productId: string;
  handle: string;
  name: string;
  unitPrice: Money;
  quantity: number;
  image: ProductImage | null;
};
