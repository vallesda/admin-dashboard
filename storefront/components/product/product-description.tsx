'use client';

import { useState } from 'react';

import type { Product } from '@/lib/commerce/types';
import Price from '@/components/ui/price';
import SpecList, { type Spec } from '@/components/ui/spec-list';
import Stepper from '@/components/ui/stepper';
import AddToCart from '@/components/cart/add-to-cart';
import VariantSelector from './variant-selector';
import DeliveryMessage from './delivery-message';

/**
 * The purchase panel.
 *
 * A Client Component because variant and quantity are a single piece of state
 * shared by three controls; splitting them would mean lifting that state
 * somewhere worse. Everything static on the page — gallery, details, related —
 * stays on the server.
 *
 * Answers, in order and above the fold: what is it, what does it cost, what
 * exactly am I buying, how much of it, is it available, when does it arrive,
 * how do I buy it.
 *
 * The change that matters is the spec list. Cut, origin, net weight and
 * category were spread across three places — a middot line under the title, a
 * whisper beside the price, and a closed `<details>` at the very bottom of the
 * page — so the facts that decide a seafood purchase were the ones a shopper
 * had to hunt for. For a fishmonger they are the product. They now sit
 * immediately under the price, ruled, in the same component the week's-catch
 * band uses.
 *
 * The price is set at the display size and in the sans face. It is data a
 * shopper compares, not voice, so the system's split-voice rule keeps it out of
 * Newsreader however tempting a serif number is at that size.
 */
export default function ProductDescription({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? product.id);
  const [quantity, setQuantity] = useState(1);

  const variant =
    product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  const price = variant?.price ?? product.price;
  const available = variant?.available ?? product.available;

  // The literal is annotated, not the filtered result: inferred, each entry
  // keeps its own narrow object shape and the type guard has nothing
  // assignable to narrow from. Rows the admin has not filled in are dropped
  // rather than rendered empty.
  const rows: (Spec | null)[] = [
    product.presentation
      ? { label: 'Presentación', value: product.presentation }
      : null,
    product.origin ? { label: 'Origen', value: product.origin } : null,
    product.netWeightGrams
      ? {
          label: 'Peso neto',
          value: `${product.netWeightGrams} g`,
          numeric: true,
        }
      : null,
    product.category ? { label: 'Categoría', value: product.category } : null,
  ];
  const specs = rows.filter((s): s is Spec => s !== null);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] md:text-5xl">
          {product.name}
        </h1>

        {product.shortDescription ? (
          <p className="mt-4 max-w-[44ch] text-lg leading-relaxed text-muted">
            {product.shortDescription}
          </p>
        ) : null}
      </div>

      <p className="font-sans text-3xl">
        <Price value={price} unit={product.unit} />
      </p>

      <SpecList specs={specs} />

      <VariantSelector
        variants={product.variants}
        selectedId={variantId}
        onSelect={(id) => {
          setVariantId(id);
          // A variant with less stock than the current quantity would otherwise
          // leave the shopper with a quantity the checkout will reject.
          const next = product.variants.find((v) => v.id === id);
          if (next && quantity > next.available) {
            setQuantity(Math.max(1, next.available));
          }
        }}
      />

      {product.availableForSale ? (
        <div>
          <label
            htmlFor="quantity"
            className="mb-2 block text-sm font-medium"
          >
            Cantidad
          </label>
          <div className="flex items-center gap-3">
            <Stepper
              id="quantity"
              value={quantity}
              max={available}
              onChange={setQuantity}
            />
            {/* Only said when it is nearly true. A running stock number on every
                product would be scarcity theatre; five or fewer is a fact the
                shopper needs before choosing a quantity. */}
            {available > 0 && available <= 5 ? (
              <span className="text-sm tabular-nums text-muted">
                Quedan {available}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <DeliveryMessage product={product} />

      {/*
        Adding from here returns the shopper to the full catalogue. The product
        page answers one question — "is this the piece I want?" — and once it is
        answered there is nothing left to do on it; the catalogue is where the
        next decision lives, and the card there already shows this product
        holding the quantity just chosen.
      */}
      <AddToCart product={product} quantity={quantity} redirectTo="/search" />
    </div>
  );
}
