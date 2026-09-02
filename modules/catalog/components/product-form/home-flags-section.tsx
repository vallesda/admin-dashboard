'use client';

import { FormSection } from '@/app/ui/kit/form';
import type { SectionProps } from './section';

/**
 * Dónde aparece este producto en la portada de la tienda.
 *
 * Las tres banderas no son reglas de negocio —no cambian precio, existencia ni
 * entrega—, sólo colocación. Por eso viven juntas y aparte de todo lo demás.
 */
export default function HomeFlagsSection({ product }: SectionProps) {

  return (
    <FormSection
      title="En la portada"
      description="Dónde aparece este producto en la página principal de la tienda. No cambia precio, existencia ni entrega."
    >
      <div className="flex flex-col gap-3">
        <Flag
          name="isFeaturedItem"
          label="La pesca de la semana"
          hint="Encabeza la portada con foto grande, ficha y precio. Sólo puede haber uno: al marcar éste se desmarca el anterior."
          defaultChecked={product?.isFeaturedItem ?? false}
        />
        <Flag
          name="isFeatured"
          label="Destacado"
          hint="Entra en la banda «Más vendidos». Pueden ser varios."
          defaultChecked={product?.isFeatured ?? false}
        />
        <Flag
          name="isSeasonal"
          label="De temporada"
          hint="Añade la etiqueta amarilla «De temporada» en la tarjeta: no siempre lo vamos a tener."
          defaultChecked={product?.isSeasonal ?? false}
        />
      </div>
    </FormSection>
  );
}

/**
 * Una casilla con su etiqueta y la línea que dice qué hace.
 *
 * Vive aquí y no en el kit compartido porque es la única sección con casillas:
 * subirla a `app/ui/kit` la convertiría en una pieza de sistema que sólo tiene
 * un consumidor, y esas son las que se quedan sin mantener.
 */
function Flag({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-brand-600 focus:ring-brand-600"
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}
