'use client';

import { useState } from 'react';

import type { Product } from '@/lib/commerce/types';
import Price from '@/components/ui/price';
import AddToCart from '@/components/cart/add-to-cart';
import VariantSelector from './variant-selector';
import QuantitySelector from './quantity-selector';
import DeliveryMessage from './delivery-message';
import OriginLabel from './origin-label';

/**
 * The purchase panel.
 *
 * A Client Component because variant and quantity are a single piece of state
 * shared by three controls; splitting them would mean lifting that state
 * somewhere worse. Everything static on the page — gallery, details, related —
 * stays on the server.
 *
 * Answers, in order and above the fold: what is it, what does it cost, what am
 * I buying, how much, where from, is it available, when does it arrive, how do
 * I buy it.
 */
export default function ProductDescription({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? product.id);
  const [quantity, setQuantity] = useState(1);

  const variant =
    product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  const price = variant?.price ?? product.price;
  const available = variant?.available ?? product.available;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-4xl leading-tight md:text-5xl">{product.name}</h1>
        <div className="mt-2">
          <OriginLabel product={product} />
        </div>
      </div>

      {product.shortDescription ? (
        <p className="text-lg text-foreground">{product.shortDescription}</p>
      ) : null}

      <p className="text-2xl">
        <Price value={price} unit={product.unit} />
        {product.netWeightGrams ? (
          <span className="ml-2 text-sm text-muted">
            {product.netWeightGrams} g
          </span>
        ) : null}
      </p>

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
        <QuantitySelector
          value={quantity}
          max={available}
          onChange={setQuantity}
        />
      ) : null}

      <DeliveryMessage product={product} />

      <AddToCart product={product} quantity={quantity} />
    </div>
  );
}
