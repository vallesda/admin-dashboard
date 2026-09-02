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
        {/*
          Accesible pero no visible: el indicador de pasos ya pone este
          título arriba, y repetirlo dos veces seguidas gastaba la
          jerarquía sin añadir nada. El `fieldset` sigue necesitando su
          `legend` para que un lector de pantalla sepa qué agrupa.
        */}
        <legend className="sr-only">Tus datos</legend>

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
          label="Correo"
          type="email"
          autoComplete="email"
          required
          hint="Aquí te mandamos el comprobante de tu pago."
          error={errors.email}
        />
      </fieldset>
  );
}
