'use client';

import Field from './field';
import type { CheckoutState } from './form-state';

/**
 * Quién hace el pedido y por dónde se le confirma.
 *
 * La zona más simple del checkout: tres campos y ninguna condición. Existe como
 * archivo aparte no porque sea grande, sino para que las cuatro zonas se lean
 * igual desde el índice — una que siguiera dentro obligaría a preguntarse por
 * qué esa sí y las otras no.
 */
export default function CustomerFields({
  errors,
}: {
  errors: CheckoutState['fieldErrors'];
}) {
  return (
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-3 font-display text-2xl font-light">Tus datos</legend>

        <Field
          name="name"
          label="Nombre completo"
          autoComplete="name"
          required
          error={errors.name}
        />
        <Field
          name="phone"
          label="Teléfono"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required
          hint="Por aquí te confirmamos el horario de entrega."
          error={errors.phone}
        />
        <Field
          name="email"
          label="Correo (opcional)"
          type="email"
          autoComplete="email"
          error={errors.email}
        />
      </fieldset>
  );
}
