import type { Product } from '@/lib/commerce/types';

/**
 * Presentation and origin.
 *
 * "Where is it from" is one of the questions the PDP has to answer above the
 * fold, and for seafood it is often the deciding one between two cuts of the
 * same fish.
 */
export default function OriginLabel({ product }: { product: Product }) {
  const parts = [product.presentation, product.origin].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <p className="text-sm text-muted">
      {parts.map((part, i) => (
        <span key={part}>
          {i > 0 ? <span aria-hidden="true"> · </span> : null}
          {part}
        </span>
      ))}
    </p>
  );
}
