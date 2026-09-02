'use client';

import Field from '@/app/ui/kit/field';
import { FormSection } from '@/app/ui/kit/form';
import ImagePicker from '../image-picker';
import type { SectionProps } from './section';

/**
 * La imagen y todo el texto que el cliente lee en la ficha.
 *
 * Cinco campos que la tienda ya sabía pintar y el panel no capturaba: durante
 * un tiempo los trece productos activos salieron sin origen y sin presentación,
 * no porque nadie los escribiera sino porque no había dónde.
 */
export default function PresentationSection({ product, errors }: SectionProps) {
  const isEdit = Boolean(product);

  return (
    <FormSection
      title="Presentación"
      description={
        isEdit
          ? 'El estado del producto no se cambia desde aquí: usa los botones de la lista para activarlo o archivarlo.'
          : 'El producto se crea como borrador. Actívalo desde la lista cuando esté listo para venderse.'
      }
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">
          Imagen (opcional)
        </span>
        <ImagePicker name="imageUrl" defaultValue={product?.imageUrl} />
        {errors?.imageUrl ? (
          <p role="alert" className="text-xs text-danger">
            {errors.imageUrl.join(' ')}
          </p>
        ) : null}
      </div>

      {/*
        Los cuatro campos que la ficha de la tienda ya sabía mostrar y
        nadie podía escribir. El orden sigue al de la página de producto,
        de arriba abajo: la frase bajo el nombre, el texto largo, y después
        los dos datos duros que van en la tabla junto al peso.
      */}
      <Field
        name="shortDescription"
        label="Descripción corta (opcional)"
        hint="La frase que va bajo el nombre, y también en las tarjetas del catálogo."
        error={errors?.shortDescription}
      >
        {(props) => (
          <textarea
            {...props}
            rows={2}
            maxLength={280}
            defaultValue={product?.shortDescription ?? ''}
            placeholder="Seleccionado pieza por pieza, con cadena de frío desde la lonja."
          />
        )}
      </Field>

      <Field
        name="description"
        label="Descripción (opcional)"
        error={errors?.description}
      >
        {(props) => (
          <textarea
            {...props}
            rows={3}
            maxLength={2000}
            defaultValue={product?.description ?? ''}
            placeholder="Corte del lomo, sin espinas, empacado al vacío."
          />
        )}
      </Field>

      {/*
        «Presentación», no «Corte»: es lo que dice la ficha de la tienda, y
        cubre tanto el corte como el empaque. El nombre de la sección de
        arriba es el mismo por casualidad, así que la pista lo desambigua.
      */}
      <Field
        name="presentation"
        label="Presentación (opcional)"
        hint="Cómo llega la pieza: corte y empaque."
        error={errors?.presentation}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            maxLength={160}
            defaultValue={product?.presentation ?? ''}
            placeholder="Lomo en bloque, corte sashimi"
          />
        )}
      </Field>

      <Field
        name="origin"
        label="Origen (opcional)"
        hint="De dónde viene la pieza. Sale en la ficha y en los datos estructurados que lee Google."
        error={errors?.origin}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            maxLength={120}
            defaultValue={product?.origin ?? ''}
            placeholder="Ensenada, Baja California"
          />
        )}
      </Field>

      <Field
        name="storageInstructions"
        label="Conservación (opcional)"
        hint="Aparece como desplegable en la ficha, no en la tabla."
        error={errors?.storageInstructions}
      >
        {(props) => (
          <textarea
            {...props}
            rows={2}
            maxLength={500}
            defaultValue={product?.storageInstructions ?? ''}
            placeholder="Refrigerado de 0 a 4 °C. Consumir dentro de 48 horas."
          />
        )}
      </Field>
    </FormSection>
  );
}
