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

export type ProductSupply = {
  type: 'fresh' | 'stocked' | 'preorder';
  label: string;
  notice: string | null;
  shortNotice: string | null;
  arrivesOn: string | null;
  orderBy: string | null;
};

/**
 * Lo que se supone cuando la API no manda `supply`.
 *
 * **Opcional a propósito.** Esta tienda va a ser un despliegue aparte y va a
 * consumir versiones de la API distintas de la que se escribió con ella: una
 * respuesta en caché de ayer, un despliegue del admin que va por delante o por
 * detrás. La primera vez que ocurrió, la tienda entera devolvió 500 porque una
 * etiqueta decorativa leía `product.supply.type` sobre `undefined`.
 *
 * Un campo de presentación que falta debe degradar, no tumbar el catálogo. El
 * valor por omisión es `fresh` porque es lo que era todo el catálogo antes de
 * que este campo existiera.
 */
export const DEFAULT_SUPPLY: ProductSupply = {
  type: 'fresh',
  label: 'Fresco del día',
  notice: null,
  shortNotice: null,
  arrivesOn: null,
  orderBy: null,
};

export function supplyOf(product: { supply?: ProductSupply }): ProductSupply {
  return product.supply ?? DEFAULT_SUPPLY;
}

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
  unit: 'piece' | 'pack' | 'kg' | 'dozen';
  netWeightGrams: number | null;

  origin: string | null;
  presentation: string | null;
  availableForSale: boolean;
  available: number;

  featured: boolean;
  seasonal: boolean;
  /**
   * La pieza de «La pesca de la semana».
   *
   * Separada de `featured`: aquélla marca varios productos y alimenta «Más
   * vendidos»; ésta marca **uno** y encabeza la portada con tratamiento
   * editorial. La base garantiza que no haya dos.
   */
  featuredItem: boolean;

  /**
   * De dónde sale el producto, y qué implica para quien lo compra.
   *
   * Todo llega resuelto desde la API: la etiqueta, la frase y la fecha. Esta
   * tienda **no** calcula el ciclo semanal — es aritmética de husos horarios, y
   * dos implementaciones acabarían prometiendo fechas distintas a la misma
   * persona.
   */
  supply?: ProductSupply;

  preparationSuggestions: string[];
  storageInstructions: string | null;

  variants: ProductVariant[];

  seo: { title: string; description: string | null };
};

export type Collection = {
  handle: string;
  title: string;
  /**
   * Si va en la barra, en las pastillas y en el pie.
   *
   * La lista llega entera y cada consumidor decide: los menús filtran por esto,
   * pero `/search/[collection]` la usa para validar el handle y el sitemap para
   * publicar la URL, y ésos tienen que seguir viendo las ocultas.
   */
  showInNav: boolean;
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
  /**
   * Cuándo llega esta línea, si es un encargo. ISO, o `null`.
   *
   * Se copia al carrito en lugar de consultarse al pintarlo: el carrito vive en
   * `localStorage` y sobrevive días, y volver a preguntar por cada línea en
   * cada render sería una petición por producto para pintar una frase.
   *
   * La contrapartida es que puede envejecer —alguien que abandonó el carrito el
   * lunes vuelve el jueves con una fecha vieja— y por eso **no** decide nada: la
   * fecha que vale es la que calcula `createOrder` al confirmar. Ésta sólo
   * avisa.
   */
  arrivesOn: string | null;
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
export type OrderPayment = {
  status: string;
  methodLabel: string | null;
  amountPaid: Money;
  amountRefunded: Money;
  /** A live payment voucher the customer may need to reopen. */
  actionUrl: string | null;
  expiresAt: string | null;
};

export type Order = {
  orderNumber: number;
  status: string;
  paymentStatus: string;
  paymentMode: string;
  payment: OrderPayment;
  /** One sentence about what to do next, already written for a person. */
  instructions: string | null;
  /** Cuándo llega, si el pedido lleva algo por encargo. ISO, o null. */
  promisedFor: string | null;
  fulfillmentType: string;
  customerName: string;
  /** The composed one-line snapshot, for printing. */
  deliveryAddress: string | null;
  /** The same address in parts, for anything that has to act on it. */
  delivery: {
    street: string;
    extNumber: string;
    intNumber: string | null;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    references: string | null;
  } | null;
  lines: OrderLine[];
  subtotal: Money;
  deliveryFee: Money;
  total: Money;
  createdAt: string;
};

export type CheckoutInput = {
  customer: { name: string; phone: string; email: string | null };
  fulfillmentType: 'pickup' | 'delivery';
  /** Whether the shopper pays now or when the order is handed over. */
  paymentMode: 'online' | 'on_site';
  /**
   * The address in parts. Required for a delivery, absent for a pickup.
   *
   * `state` must be one of the 32 federal entities as INEGI names them; the API
   * rejects anything else. A closed list is what keeps "CDMX" and "Ciudad de
   * México" from being two places.
   */
  deliveryAddress?: {
    street: string;
    extNumber: string;
    intNumber: string | null;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    references: string | null;
  };
  notes?: string;
  lines: { productId: string; quantity: number }[];
  /**
   * Where to come back to after paying. Only meaningful for `online`.
   *
   * `success` may contain `{TOKEN}`, replaced with the order's public token by
   * the API — this side cannot know it before the order exists. The API also
   * checks both URLs against an allow-list of origins, so a rogue value is
   * rejected rather than turned into a redirect wearing the shop's branding.
   */
  returnUrls?: { success: string; cancel: string };
};

/**
 * Discriminated by `paymentMode`, so this code cannot read an at-the-counter
 * result as if it carried a payment URL.
 *
 * Note what is absent: any mention of the payment provider. `checkoutUrl` is a
 * string to redirect to, and which company serves that page is the admin's
 * business — which is what lets this storefront move to its own repository
 * without carrying a payment integration with it.
 */
export type CheckoutResult = {
  orderNumber: number;
  token: string;
} & (
  | {
      paymentMode: 'online';
      payment: {
        status: 'pending';
        /**
         * Where to pay, or null when no payment page could be opened.
         *
         * Null is not an error: the order exists and its stock is reserved, and
         * the shop will send a payment link. Redirect when there is a URL,
         * otherwise show the confirmation.
         */
        checkoutUrl: string | null;
        expiresAt: string | null;
      };
    }
  | {
      paymentMode: 'on_site';
      payment: { status: 'on_delivery'; instructions: string };
    }
);

/**
 * Cuánto cuesta llevar el carrito a un código postal.
 *
 * `covered: false` no es un error ni «cuesta cero»: es un sitio a donde la
 * tienda no llega. La diferencia importa porque el checkout tiene que decirlo
 * antes de aceptar el pedido, no después.
 */
export type DeliveryQuote =
  | {
      covered: true;
      zoneId: string;
      zoneName: string;
      feeCents: number;
      reason: 'zone' | 'free_over_threshold';
      /** Cuánto falta de mercancía para que salga gratis. `null` si no aplica. */
      missingForFreeCents: number | null;
    }
  | { covered: false; reason: 'out_of_range' };
