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
import {
  describePreorder,
  nextPreorderWindow,
  shortPreorderLabel,
} from '@/modules/catalog/preorder';

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
  unit: 'piece' | 'pack' | 'kg' | 'dozen';
  netWeightGrams: number | null;

  origin: string | null;
  presentation: string | null;
  availableForSale: boolean;
  available: number;

  featured: boolean;
  seasonal: boolean;

  /**
   * De dónde sale el producto, y qué implica para quien lo compra.
   *
   * Todo lo que necesita la tienda para explicárselo a una persona va aquí ya
   * resuelto: el tipo, la etiqueta que se pinta, la frase completa y la fecha
   * de llegada. La tienda **no** recalcula el ciclo semanal — es aritmética de
   * husos horarios y tendría dos implementaciones que se desincronizarían.
   */
  supply: {
    type: 'fresh' | 'stocked' | 'preorder';
    /** «Fresco del día», «Congelado», «Por encargo». */
    label: string;
    /** Frase completa, sólo en los de encargo. */
    notice: string | null;
    /** «Llega el viernes», para la tarjeta del catálogo. */
    shortNotice: string | null;
    /** Cuándo llegaría si se pide ahora. ISO, o null. */
    arrivesOn: string | null;
    /** Hasta cuándo alcanza el ciclo vigente. ISO, o null. */
    orderBy: string | null;
  };

  preparationSuggestions: string[];
  storageInstructions: string | null;

  variants: PublicVariant[];

  seo: { title: string; description: string | null };
};

export type PublicCollection = {
  handle: string;
  title: string;
  /**
   * Si va en la barra y en las pastillas de navegación.
   *
   * Se expone en vez de filtrarse en la consulta porque los consumidores no
   * quieren lo mismo: el menú quiere el subconjunto, pero la página
   * `/search/[collection]` usa esta lista para decidir si un handle existe, y
   * el sitemap para saber qué URLs publicar. Filtrar en origen habría
   * convertido «no sale en el menú» en un 404 y en una página fuera del mapa.
   */
  showInNav: boolean;
};

type ProductSource = ProductRow & {
  /** La primera de sus categorías por orden de estantería, para mostrar. */
  categoryName: string | null;
  /** Todas a las que pertenece. Vacío si no está en ninguna. */
  categorySlugs: string[];
  available: number;
};

export function toPublicProduct(row: ProductSource): PublicProduct {
  // Only `active` products are ever queried, but availability is what decides
  // whether the button says "Agregar" or "Agotado".
  /*
   * Un producto por encargo **siempre se puede pedir**, aunque su existencia sea
   * cero — precisamente porque no hay existencia: la tienda lo compra después
   * de que alguien lo pida. Aplicarle la regla del stock lo dejaría agotado para
   * siempre, que es justo el producto que este cambio existe para poder vender.
   */
  const availableForSale =
    row.status === 'active' &&
    (row.supplyType === 'preorder' || row.available > 0);

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
    /*
     * Todas sus categorías, no una.
     *
     * Este campo ya era un array cuando detrás sólo había una columna,
     * apostando a que la relación acabaría siendo de muchas a muchas. Lo es
     * desde `product_categories`, y el cambio no tocó a ningún cliente: el
     * contrato público no se enteró.
     */
    collections: row.categorySlugs,

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
    supply: describeSupply(row),

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
  return { handle: row.slug, title: row.name, showInNav: row.showInNav };
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
/**
 * What the money looks like to a customer.
 *
 * Every field is either a number or a sentence already written for a person to
 * read. No provider names, no method codes, no enum the storefront would have
 * to translate — see DOCS/PAGOS.md §8.2 on why that matters once the storefront
 * is its own deployment.
 */
export type PublicPayment = {
  status: string;
  /** "Tarjeta", "OXXO", "Al recibir". Null when there is nothing to name yet. */
  methodLabel: string | null;
  amountPaid: Money;
  amountRefunded: Money;
  /** The OXXO voucher, if one is live. */
  actionUrl: string | null;
  expiresAt: string | null;
};

export type PublicOrder = {
  orderNumber: number;
  status: string;
  paymentStatus: string;
  paymentMode: string;
  payment: PublicPayment;
  /** One sentence about what to do next, or null when nothing is owed. */
  instructions: string | null;
  /**
   * Cuándo se le prometió al cliente. ISO, o `null` si sale sin espera.
   *
   * Con fecha sólo cuando el pedido lleva algo por encargo, y entonces es la
   * llegada más lejana de sus líneas: se entrega junto.
   */
  promisedFor: string | null;
  fulfillmentType: string;
  customerName: string;
  /** The composed one-line snapshot, for printing. */
  deliveryAddress: string | null;
  /**
   * The same address in parts, for anything that has to act on it — a route, a
   * delivery zone, a courier's form. Null on a pickup order, and null on orders
   * placed before addresses were structured.
   */
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
  lines: PublicOrderLine[];
  subtotal: Money;
  deliveryFee: Money;
  total: Money;
  createdAt: string;
};

const SUPPLY_LABEL: Record<string, string> = {
  fresh: 'Fresco del día',
  stocked: 'Siempre disponible',
  preorder: 'Por encargo',
};

/**
 * Traduce el abastecimiento a algo que una persona pueda leer.
 *
 * Se resuelve aquí, del lado del dominio, y no en la tienda. La tienda va a ser
 * un despliegue aparte y no puede llevarse la aritmética de días de la semana y
 * husos horarios: dos implementaciones de «¿cuándo llega?» acabarían diciendo
 * cosas distintas, y la que se equivoque le habrá prometido una fecha a alguien.
 */
function describeSupply(row: ProductSource): PublicProduct['supply'] {
  const label = SUPPLY_LABEL[row.supplyType] ?? SUPPLY_LABEL.fresh;

  if (
    row.supplyType !== 'preorder' ||
    row.preorderCutoffWeekday === null ||
    row.preorderCutoffHour === null ||
    row.preorderArrivalWeekday === null
  ) {
    return {
      type: row.supplyType,
      label,
      notice: null,
      shortNotice: null,
      arrivesOn: null,
      orderBy: null,
    };
  }

  const window = nextPreorderWindow({
    cutoffWeekday: row.preorderCutoffWeekday,
    cutoffHour: row.preorderCutoffHour,
    arrivalWeekday: row.preorderArrivalWeekday,
  });

  const notice = describePreorder(window);

  return {
    type: 'preorder',
    label,
    // La nota del propio negocio va detrás de la promesa, no en su lugar:
    // primero la fecha, que es lo que decide la compra.
    notice: row.preorderNote ? `${notice} ${row.preorderNote}` : notice,
    shortNotice: shortPreorderLabel(window),
    arrivesOn: window.arrivesOn.toISOString(),
    orderBy: window.orderBy.toISOString(),
  };
}
