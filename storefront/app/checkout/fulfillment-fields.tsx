'use client';

import Field from './field';
import type { CheckoutState } from './form-state';

/**
 * El único estado al que la tienda entrega hoy.
 *
 * Escrito como lo escribe INEGI, que es contra lo que valida el servidor: el
 * acento no es decorativo.
 */
const FIXED_STATE = 'Nuevo León';

/**
 * Cómo quiere recibir el pedido, y a dónde.
 *
 * Es la zona más larga del checkout y la única con partes que aparecen y
 * desaparecen: elegir «domicilio» destapa la dirección completa. Por eso es la
 * única que necesita saber la elección, y por eso la elección vive arriba —en
 * el formulario, que también la usa para cotizar el envío— y baja como props.
 *
 * El código postal sube al formulario en lugar de quedarse aquí porque el panel
 * lateral lo necesita para cotizar. Es el único dato de esta zona que sale de
 * ella.
 */
export default function FulfillmentFields({
  fulfillment,
  onFulfillmentChange,
  postalCode,
  onPostalCodeChange,
  errors,
}: {
  fulfillment: 'pickup' | 'delivery';
  onFulfillmentChange: (next: 'pickup' | 'delivery') => void;
  postalCode: string;
  onPostalCodeChange: (next: string) => void;
  errors: CheckoutState['fieldErrors'];
}) {
  return (
      <fieldset className="flex flex-col gap-4">
        {/*
          Accesible pero no visible: el indicador de pasos ya pone este
          título arriba, y repetirlo dos veces seguidas gastaba la
          jerarquía sin añadir nada. El `fieldset` sigue necesitando su
          `legend` para que un lector de pantalla sepa qué agrupa.
        */}
        <legend className="sr-only">Cómo lo quieres recibir</legend>

        <div className="flex flex-col gap-3 sm:flex-row">
          {(
            [
              { value: 'pickup', label: 'Recoger en tienda' },
              { value: 'delivery', label: 'Entrega a domicilio' },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={`flex flex-1 cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm transition-colors ${
                fulfillment === option.value
                  ? 'border-brand bg-brand-soft'
                  : 'border-border-strong hover:border-muted'
              }`}
            >
              <input
                type="radio"
                name="fulfillmentType"
                value={option.value}
                checked={fulfillment === option.value}
                onChange={() => onFulfillmentChange(option.value)}
                className="accent-brand"
              />
              {option.label}
            </label>
          ))}
        </div>

        {errors.fulfillmentType ? (
          <p className="text-sm text-brand">
            {errors.fulfillmentType}
          </p>
        ) : null}

        {/*
          The address in fields rather than one box.
      
          A sentence cannot be sorted into a route, checked against a delivery
          zone, or handed to a courier. The layout follows how the address is
          said out loud in Mexico — street and number, then colonia, then
          municipio and state — so filling it feels like dictating it.
        */}
        {fulfillment === 'delivery' ? (
          <div className="flex flex-col gap-4 border-t border-border pt-5">
            <p className="text-sm text-muted">
              Necesitamos la dirección completa para poder llegar.
            </p>

            {/*
              Tres campos en una fila, y el tercero más estrecho.

              «Interior» llevaba su «Opcional» como pista bajo la etiqueta, y
              esa línea de más empujaba su campo un renglón por debajo de los
              otros dos: la fila se veía rota sin que ninguno de los tres
              estuviera mal. La palabra se movió al propio rótulo, donde no
              ocupa altura, y la columna se estrechó porque un número interior
              son dos o tres caracteres —«3», «B», «PH2»— y un campo ancho
              promete un dato largo que nadie va a escribir.
            */}
            <div className="grid gap-4 sm:grid-cols-[2.2fr_1fr_0.8fr]">
              <Field
                name="street"
                label="Calle"
                autoComplete="address-line1"
                required
                error={errors.street}
              />
              <Field
                name="extNumber"
                label="Núm. exterior"
                required
                error={errors.extNumber}
              />
              <Field
                name="intNumber"
                label="Interior (opcional)"
                error={errors.intNumber}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="neighborhood"
                label="Colonia"
                autoComplete="address-level3"
                required
                error={errors.neighborhood}
              />
              <Field
                name="postalCode"
                label="Código postal"
                inputMode="numeric"
                maxLength={5}
                autoComplete="postal-code"
                required
                value={postalCode}
                onChange={(e) => onPostalCodeChange(e.target.value.trim())}
                error={errors.postalCode}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="city"
                label="Municipio o alcaldía"
                autoComplete="address-level2"
                required
                error={errors.city}
              />
              <StateField error={errors.state} />
            </div>

            {/*
              Optional in the database, asked for prominently here: in much of
              Mexico the reference is what actually gets the delivery to the
              door.
            */}
            <Field
              name="references"
              label="Referencias"
              hint="Entre qué calles, color de la fachada, algún negocio cerca."
              multiline
              error={errors.references}
            />
          </div>
        ) : null}

        <Field
          name="notes"
          label="Notas para tu pedido (opcional)"
          hint="Cómo quieres el corte, limpieza, o cualquier indicación."
          multiline
        />
      </fieldset>
  );
}

function StateField({ error }: { error?: string }) {
  const errorId = error ? 'state-error' : undefined;

  /*
   * Nuevo León, fijo, mientras la tienda esté en alfa.
   *
   * El reparto sale de una sola zona y el selector de 32 estados invitaba a
   * elegir uno al que no llegamos: el cliente descubría el problema al final,
   * que es el peor momento. Fijarlo aquí lo dice desde el principio.
   *
   * Dos controles y no uno, porque un `<select>` deshabilitado **no viaja en el
   * formulario**: el navegador omite los campos deshabilitados al enviar, así
   * que el estado llegaría vacío a la validación y el pedido se caería con un
   * error que nadie escribió. El campo visible está deshabilitado y el `hidden`
   * es el que manda el valor.
   *
   * La ortografía tiene que ser exactamente la de INEGI —`modules/sales/address.ts`
   * valida contra esa lista— así que el acento no es decorativo.
   */
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="state" className="text-sm font-medium">
        Estado
      </label>

      <input type="hidden" name="state" value={FIXED_STATE} />

      <input
        id="state"
        type="text"
        value={FIXED_STATE}
        disabled
        readOnly
        aria-describedby={errorId}
        className="w-full cursor-not-allowed rounded-sm border border-border-strong bg-sand px-3 py-2.5 text-sm text-muted"
      />

      <p className="text-xs text-muted">
        Por ahora sólo entregamos en Nuevo León.
      </p>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
