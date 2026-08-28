'use client';

import type { ProductVariant } from '@/lib/commerce/types';
import { formatMoney } from '@/lib/format';

/**
 * Variant selector.
 *
 * Visible buttons, not a dropdown: with a handful of options a shopper should
 * be able to compare them at a glance instead of opening a menu.
 *
 * Availability is shown with a word and a strikethrough, never colour alone —
 * a disabled option that only looks grey is invisible to a colour-blind
 * shopper and to anyone in bright sunlight.
 *
 * Renders nothing when there is one option: a selector with a single choice is
 * a decision the shopper does not have to make. Today the catalogue always
 * returns one, because a Product *is* the SKU — see the note in the admin's
 * DTO. When real variants land, this starts rendering on its own.
 */
export default function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (variants.length <= 1) return null;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Presentación</legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const selected = variant.id === selectedId;
          const disabled = !variant.availableForSale;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              disabled={disabled}
              aria-pressed={selected}
              className={[
                'rounded border px-4 py-2.5 text-sm transition-colors duration-150',
                selected
                  ? 'border-brand bg-brand text-background'
                  : 'border-border-strong bg-surface hover:border-brand',
                disabled ? 'cursor-not-allowed line-through opacity-50' : '',
              ].join(' ')}
            >
              {variant.title}
              <span className="ml-2 text-xs opacity-80">
                {formatMoney(variant.price)}
              </span>
              {disabled ? <span className="sr-only"> — agotado</span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
