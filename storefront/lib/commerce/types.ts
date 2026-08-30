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

/**
 * One tile on the home shelf.
 *
 * A featured category or a curated package — the shopper is asking the same
 * question of both ("what am I making?"), so they share a shelf. `kind` is what
 * tells the storefront which route to build.
 */
export type ShelfItem = {
  kind: 'category' | 'package';
  handle: string;
  title: string;
  tagline: string | null;
  image: ProductImage | null;
  /** Packages only. */
  itemCount: number | null;
};

export type PackageLine = {
  product: Product;
  quantity: number;
};

export type Bundle = {
  handle: string;
  title: string;
  tagline: string | null;
  description: string | null;
  image: ProductImage | null;
  lines: PackageLine[];
  /** The sum of the lines. A package has no price of its own. */
  total: Money;
  availableForSale: boolean;
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

export type OrderLine = {
  name: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
};

/**
 * A placed order, as the person who placed it may see it.
 *
 * Addressed by an opaque token, never by `orderNumber`: the number is
 * sequential, so a URL built on it would be an enumeration of every customer's
 * name and delivery address. The number is still here — it is what a customer
 * quotes on the phone — but it is not the key.
 *
 * Carries no phone and no email: the confirmation page is reachable by anyone
 * holding the link, and the link travels through browser history and referrers.
 */
export type Order = {
  orderNumber: number;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  customerName: string;
  deliveryAddress: string | null;
  lines: OrderLine[];
  subtotal: Money;
  deliveryFee: Money;
  total: Money;
  createdAt: string;
};

export type CheckoutInput = {
  customer: { name: string; phone: string; email: string | null };
  fulfillmentType: 'pickup' | 'delivery';
  deliveryAddress?: string;
  notes?: string;
  lines: { productId: string; quantity: number }[];
};

export type CheckoutResult = {
  orderNumber: number;
  token: string;
};
